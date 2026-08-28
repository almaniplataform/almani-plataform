'use client'

import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

function converterDataExcel(valor: any): string | null {
  if (valor === null || valor === undefined || valor === '') return null

  // Se for objeto Date do JavaScript
  if (valor instanceof Date) {
    if (isNaN(valor.getTime())) return null
    const ano = valor.getFullYear()
    if (ano < 1900 || ano > 2200) return null
    const mes = String(valor.getMonth() + 1).padStart(2, '0')
    const dia = String(valor.getDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
  }

  // Se for número (serial do Excel)
  if (typeof valor === 'number') {
    if (valor < 1 || valor > 109584) return null
    const data = new Date(Math.round((valor - 25569) * 86400 * 1000))
    const ano = data.getUTCFullYear()
    if (ano < 1900 || ano > 2200) return null
    return data.toISOString().split('T')[0]
  }

  const str = String(valor).trim()
  if (!str || str === '-' || str.toLowerCase() === 'null') return null

  // Formato DD/MM/YYYY (com ou sem hora)
  const matchBR = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (matchBR) {
    const [, dia, mes, ano] = matchBR
    const anoNum = parseInt(ano)
    if (anoNum < 1900 || anoNum > 2200) return null
    return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
  }

  // Formato YYYY-MM-DD (com ou sem hora, com T ou com espaço)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const ano = parseInt(str.substring(0, 4))
    if (ano < 1900 || ano > 2200) return null
    return str.substring(0, 10)
  }

  // Formato DD/MM/YY (2 dígitos)
  const match2 = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{2})$/)
  if (match2) {
    const [, dia, mes, ano] = match2
    const anoNum = parseInt(ano) + 2000
    return `${anoNum}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
  }

  // Se for apenas números (sem barras), tentar como serial
  const num = Number(str)
  if (!isNaN(num) && num > 1 && num < 109584) {
    const data = new Date(Math.round((num - 25569) * 86400 * 1000))
    const ano = data.getUTCFullYear()
    if (ano < 1900 || ano > 2200) return null
    return data.toISOString().split('T')[0]
  }

  // Última tentativa: usar new Date()
  const dataFallback = new Date(str)
  if (!isNaN(dataFallback.getTime())) {
    const ano = dataFallback.getFullYear()
    if (ano < 1900 || ano > 2200) return null
    const mes = String(dataFallback.getMonth() + 1).padStart(2, '0')
    const dia = String(dataFallback.getDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
  }

  return null
}

type Cliente = {
  id: string
  nome: string
  email: string
}

export default function AdminImportarPage() {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [debugInfo, setDebugInfo] = useState('')
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
    setDebugInfo('')

    try {
      const dados = await arquivo.arrayBuffer()
      const planilha = XLSX.read(dados, { type: 'array', cellDates: true })
      const primeiraAba = planilha.Sheets[planilha.SheetNames[0]]
      const linhasBrutas = XLSX.utils.sheet_to_json<Record<string, any>>(primeiraAba, { raw: false })

      // Normalizar nomes das colunas
      const linhasNormalizadas = linhasBrutas.map((linha) => {
        const novaLinha: Record<string, any> = {}
        for (const chave in linha) {
          const chaveNormalizada = chave.trim().replace(/_+$/, '').toLowerCase()
          novaLinha[chaveNormalizada] = linha[chave]
        }
        return novaLinha
      })

      // Debug: mostrar valores brutos da primeira linha
      if (linhasNormalizadas.length > 0) {
        const primeira = linhasNormalizadas[0]
        const debug = `Primeira linha - data_abertura bruto: "${primeira['data_abertura']}" (tipo: ${typeof primeira['data_abertura']}) | sla_meta bruto: "${primeira['sla_meta']}" (tipo: ${typeof primeira['sla_meta']})`
        setDebugInfo(debug)
      }

      const linhasFormatadas = linhasNormalizadas.map((linha) => ({
        placa: String(linha['placa'] || '').toUpperCase().trim(),
        status: String(linha['status'] || '').trim(),
        uf: String(linha['uf'] || '').trim(),
        tipo_servico: String(linha['tipo_servico'] || '').trim(),
        cpf_cnpj: linha['cpf_cnpj'] ? String(linha['cpf_cnpj']).trim() : null,
        sla_meta: converterDataExcel(linha['sla_meta'] ?? null),
        observacoes: linha['observacoes'] ? String(linha['observacoes']).trim() : null,
        acao_necessaria: linha['acao_necessaria'] ? String(linha['acao_necessaria']).trim() : null,
        data_abertura: converterDataExcel(linha['data_abertura'] ?? null),
        cliente_id: clienteSelecionado,
      }))

      const comPlaca = linhasFormatadas.filter((l) => l.placa !== '')

      // Remover duplicatas dentro do próprio arquivo (mesma placa)
      const placasVistas = new Map<string, typeof comPlaca[0]>()
      for (const linha of comPlaca) {
        placasVistas.set(linha.placa, linha)
      }
      const linhasValidas = Array.from(placasVistas.values())

      if (linhasValidas.length === 0) {
        setMensagem('Nenhuma linha válida encontrada.')
        return
      }

      // UPSERT: se a placa já existe, ATUALIZA; se não existe, CRIA
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
        const msg = duplicadasRemovidas > 0
          ? `Sucesso! ${linhasValidas.length} processos importados para ${clientes.find(c => c.id === clienteSelecionado)?.nome} (${duplicadasRemovidas} duplicata(s) removida(s)).`
          : `Sucesso! ${linhasValidas.length} processos importados para ${clientes.find(c => c.id === clienteSelecionado)?.nome}.`
        setMensagem(msg)
        setArquivo(null)
      }
    } catch (erro) {
      setMensagem(`Erro ao ler o arquivo: ${erro instanceof Error ? erro.message : 'erro desconhecido'}`)
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">Painel Admin — Importar Processos</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Voltar
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
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
              onChange={(e) => setArquivo(e.target.files?.[0] || null)}
              className="border border-gray-300 rounded p-2 w-full"
            />
          </div>

          <button
            onClick={importar}
            disabled={!arquivo || !clienteSelecionado || carregando}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {carregando ? 'Importando...' : 'Importar Planilha'}
          </button>

          {mensagem && (
            <p className={`text-sm ${mensagem.includes('Erro') ? 'text-red-600' : 'text-green-600'}`}>
              {mensagem}
            </p>
          )}

          {debugInfo && (
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-300 rounded text-xs text-yellow-800 font-mono">
              <strong>Debug:</strong> {debugInfo}
            </div>
          )}

          <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
            <p className="font-medium mb-2">Como funciona:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Selecione o cliente no dropdown acima</li>
              <li>Escolha o arquivo da planilha (.xlsx ou .csv)</li>
              <li>Clique em "Importar Planilha"</li>
              <li>Os processos serão vinculados ao cliente selecionado</li>
            </ol>
            <p className="mt-2 text-blue-600">
              A planilha deve ter as colunas: placa, status, uf, tipo_servico, cpf_cnpj, sla_meta, observacoes, acao_necessaria, data_abertura
            </p>
            <p className="mt-2 text-blue-600 font-medium">
              ℹ️ Se uma placa já existir, os dados serão atualizados em vez de duplicados.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}