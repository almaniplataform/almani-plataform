'use client'

import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

function converterDataExcel(valor: any): string | null {
  if (valor === null || valor === undefined || valor === '') return null

  // Objeto Date (a biblioteca XLSX cria datas com base em UTC)
  if (valor instanceof Date) {
    if (isNaN(valor.getTime())) return null
    const ano = valor.getUTCFullYear()
    if (ano < 1900 || ano > 2200) return null
    const mes = String(valor.getUTCMonth() + 1).padStart(2, '0')
    const dia = String(valor.getUTCDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
  }

  // Número (serial do Excel)
  if (typeof valor === 'number') {
    if (valor < 1 || valor > 109584) return null
    const data = new Date(Math.round((valor - 25569) * 86400 * 1000))
    const ano = data.getUTCFullYear()
    if (ano < 1900 || ano > 2200) return null
    return data.toISOString().split('T')[0]
  }

  const str = String(valor).trim()
  if (!str || str === '-' || str.toLowerCase() === 'null') return null

  // DD/MM/YYYY
  const matchBR = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (matchBR) {
    const [, dia, mes, ano] = matchBR
    if (parseInt(ano) < 1900 || parseInt(ano) > 2200) return null
    return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
  }

  // YYYY-MM-DD (com ou sem hora, com T ou com espaço)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const ano = parseInt(str.substring(0, 4))
    if (ano < 1900 || ano > 2200) return null
    return str.substring(0, 10)
  }

  // DD-MM-YYYY ou DD.MM.YYYY
  const matchSep = str.match(/(\d{1,2})[-.](\d{1,2})[-.](\d{4})/)
  if (matchSep) {
    const [, dia, mes, ano] = matchSep
    return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
  }

  // DD/MM/YY (2 dígitos)
  const match2 = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{2})$/)
  if (match2) {
    const [, dia, mes, ano] = match2
    return `20${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
  }

  // Serial numérico em formato de texto
  const num = Number(str)
  if (!isNaN(num) && num > 1 && num < 109584) {
    const data = new Date(Math.round((num - 25569) * 86400 * 1000))
    if (data.getUTCFullYear() >= 1900 && data.getUTCFullYear() <= 2200) {
      return data.toISOString().split('T')[0]
    }
  }

  // Última tentativa: new Date()
  const dataFallback = new Date(str)
  if (!isNaN(dataFallback.getTime())) {
    const ano = dataFallback.getUTCFullYear()
    if (ano < 1900 || ano > 2200) return null
    const mes = String(dataFallback.getUTCMonth() + 1).padStart(2, '0')
    const dia = String(dataFallback.getUTCDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
  }

  return null
}

function descreverBruto(valor: any): string {
  if (valor === null || valor === undefined) return '(vazio)'
  if (valor instanceof Date) return valor.toISOString().split('T')[0] + ' (data)'
  return `"${String(valor)}"`
}

type Cliente = {
  id: string
  nome: string
  email: string
}

type LinhaParseada = {
  placa: string
  status: string
  uf: string
  tipo_servico: string
  cpf_cnpj: string | null
  sla_meta: string | null
  sla_meta_bruta: any
  observacoes: string | null
  acao_necessaria: string | null
  data_abertura: string | null
  data_abertura_bruta: any
}

export default function AdminImportarPage() {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [linhasParseadas, setLinhasParseadas] = useState<LinhaParseada[]>([])
  const [carregando, setCarregando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteSelecionado, setClienteSelecionado] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    async function carregarClientes() {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, email')
        .order('nome', { ascending: true })

      if (error) {
        setMensagem('Erro ao carregar clientes: ' + error.message)
        return
      }

      setClientes(data || [])
    }

    carregarClientes()
  }, [])

  async function aoSelecionarArquivo(file: File | null) {
    setArquivo(file)
    setLinhasParseadas([])
    setMensagem('')
    if (!file) return

    try {
      const dados = await file.arrayBuffer()
      const planilha = XLSX.read(dados, { type: 'array', cellDates: false })
      const primeiraAba = planilha.Sheets[planilha.SheetNames[0]]
      const linhasBrutas = XLSX.utils.sheet_to_json<Record<string, any>>(primeiraAba, { raw: false, dateNF: 'dd/mm/yyyy' })

      const linhasNormalizadas = linhasBrutas.map((linha) => {
        const novaLinha: Record<string, any> = {}
        for (const chave in linha) {
          const chaveNormalizada = chave.trim().replace(/_+$/, '').toLowerCase()
          novaLinha[chaveNormalizada] = linha[chave]
        }
        return novaLinha
      })

      const parseadas: LinhaParseada[] = linhasNormalizadas.map((linha) => ({
        placa: String(linha['placa'] || '').toUpperCase().trim(),
        status: String(linha['status'] || '').trim(),
        uf: String(linha['uf'] || '').trim(),
        tipo_servico: String(linha['tipo_servico'] || '').trim(),
        cpf_cnpj: linha['cpf_cnpj'] ? String(linha['cpf_cnpj']).trim() : null,
        sla_meta: converterDataExcel(linha['sla_meta'] ?? null),
        sla_meta_bruta: linha['sla_meta'] ?? null,
        observacoes: linha['observacoes'] ? String(linha['observacoes']).trim() : null,
        acao_necessaria: linha['acao_necessaria'] ? String(linha['acao_necessaria']).trim() : null,
        data_abertura: converterDataExcel(linha['data_abertura'] ?? null),
        data_abertura_bruta: linha['data_abertura'] ?? null,
      }))

      setLinhasParseadas(parseadas)
    } catch (erro) {
      setMensagem(`Erro ao ler o arquivo: ${erro instanceof Error ? erro.message : 'erro desconhecido'}`)
    }
  }

  async function importar() {
    if (!arquivo) {
      setMensagem('Selecione um arquivo primeiro.')
      return
    }

    if (!clienteSelecionado) {
      setMensagem('Selecione um cliente antes de importar.')
      return
    }

    setCarregando(true)
    setMensagem('')

    try {
      const comPlaca = linhasParseadas.filter((l) => l.placa !== '')

      const placasVistas = new Map<string, Record<string, any>>()
      for (const linha of comPlaca) {
        placasVistas.set(linha.placa, {
          placa: linha.placa,
          status: linha.status,
          uf: linha.uf,
          tipo_servico: linha.tipo_servico,
          cpf_cnpj: linha.cpf_cnpj,
          sla_meta: linha.sla_meta,
          observacoes: linha.observacoes,
          acao_necessaria: linha.acao_necessaria,
          data_abertura: linha.data_abertura,
          cliente_id: clienteSelecionado,
        })
      }
      const linhasValidas = Array.from(placasVistas.values())

      if (linhasValidas.length === 0) {
        setMensagem('Nenhuma linha válida encontrada.')
        return
      }

      const { error } = await supabase
        .from('processos')
        .upsert(linhasValidas, {
          onConflict: 'placa',
          ignoreDuplicates: false,
        })

      if (error) {
        setMensagem(`Erro ao importar: ${error.message}`)
      } else {
        const duplicadasRemovidas = comPlaca.length - linhasValidas.length
        const nomeCliente = clientes.find(c => c.id === clienteSelecionado)?.nome
        const msg = duplicadasRemovidas > 0
          ? `Sucesso! ${linhasValidas.length} processos importados para ${nomeCliente} (${duplicadasRemovidas} duplicata(s) removida(s)).`
          : `Sucesso! ${linhasValidas.length} processos importados para ${nomeCliente}.`
        setMensagem(msg)
        setArquivo(null)
        setLinhasParseadas([])
      }
    } catch (erro) {
      setMensagem(`Erro: ${erro instanceof Error ? erro.message : 'erro desconhecido'}`)
    } finally {
      setCarregando(false)
    }
  }

  const previewLinhas = linhasParseadas.slice(0, 10)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">Painel Admin — Importar Processos</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Voltar
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-800">Importar Planilha</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecionar Cliente
            </label>
            <select
              value={clienteSelecionado}
              onChange={(e) => setClienteSelecionado(e.target.value)}
              className="w-full border border-gray-300 rounded p-2"
            >
              <option value="">— Escolha um cliente —</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome} ({cliente.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Arquivo da Planilha
            </label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => aoSelecionarArquivo(e.target.files?.[0] || null)}
              className="border border-gray-300 rounded p-2 w-full"
            />
          </div>

          {previewLinhas.length > 0 && (
            <div className="border border-gray-300 rounded p-4">
              <h3 className="text-sm font-bold text-gray-800 mb-2">
                Pré-visualização — o que será importado (primeiras {previewLinhas.length} linhas)
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-2 py-1 border border-gray-300 text-left">Placa</th>
                      <th className="px-2 py-1 border border-gray-300 text-left">Data Abertura (bruta)</th>
                      <th className="px-2 py-1 border border-gray-300 text-left">Data Abertura (final)</th>
                      <th className="px-2 py-1 border border-gray-300 text-left">SLA Meta (bruta)</th>
                      <th className="px-2 py-1 border border-gray-300 text-left">SLA Meta (final)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewLinhas.map((linha, i) => {
                      const brutaTemValor = (v: any) =>
                        v !== null && v !== undefined && v !== ''
                      const aberturaFalhou = linha.data_abertura === null && brutaTemValor(linha.data_abertura_bruta)
                      const slaFalhou = linha.sla_meta === null && brutaTemValor(linha.sla_meta_bruta)
                      return (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-2 py-1 border border-gray-300 font-mono">{linha.placa || '-'}</td>
                          <td className="px-2 py-1 border border-gray-300 font-mono text-gray-500">{descreverBruto(linha.data_abertura_bruta)}</td>
                          <td className={`px-2 py-1 border border-gray-300 font-mono ${aberturaFalhou ? 'bg-red-100 text-red-700 font-bold' : ''}`}>
                            {linha.data_abertura || '(vazio)'}
                          </td>
                          <td className="px-2 py-1 border border-gray-300 font-mono text-gray-500">{descreverBruto(linha.sla_meta_bruta)}</td>
                          <td className={`px-2 py-1 border border-gray-300 font-mono ${slaFalhou ? 'bg-red-100 text-red-700 font-bold' : ''}`}>
                            {linha.sla_meta || '(vazio)'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Célula em <span className="text-red-700 font-bold">vermelho</span> = a planilha tem valor, mas o sistema não conseguiu converter. Se aparecer, mande um print desta tabela.
              </p>
            </div>
          )}

          <button
            onClick={importar}
            disabled={!arquivo || !clienteSelecionado || carregando || linhasParseadas.length === 0}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {carregando ? 'Importando...' : 'Importar Planilha'}
          </button>

          {mensagem && (
            <p className={`text-sm ${mensagem.includes('Erro') ? 'text-red-600' : 'text-green-600'}`}>
              {mensagem}
            </p>
          )}

          <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
            <p className="font-medium mb-2">Como funciona:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Selecione o cliente no dropdown acima</li>
              <li>Escolha o arquivo — a pré-visualização aparece automaticamente</li>
              <li>Confira as datas na pré-visualização</li>
              <li>Clique em "Importar Planilha"</li>
            </ol>
            <p className="mt-2 text-blue-600 font-medium">
              ℹ️ Se a placa já existir, os dados serão atualizados em vez de duplicados.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}