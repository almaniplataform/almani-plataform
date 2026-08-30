'use client'

import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

function converterData(valor: any): string | null {
  if (!valor && valor !== 0) return null

  if (valor instanceof Date) {
    if (isNaN(valor.getTime())) return null
    const ano = valor.getUTCFullYear()
    if (ano < 1900 || ano > 2200) return null
    const mes = String(valor.getUTCMonth() + 1).padStart(2, '0')
    const dia = String(valor.getUTCDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
  }

  if (typeof valor === 'number') {
    if (valor < 1 || valor > 109584) return null
    const data = new Date(Math.round((valor - 25569) * 86400 * 1000))
    const ano = data.getUTCFullYear()
    if (ano < 1900 || ano > 2200) return null
    return data.toISOString().split('T')[0]
  }

  const str = String(valor).trim()
  if (!str || str === '-' || str.toLowerCase() === 'null') return null

  const m1 = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m1) {
    const ano = parseInt(m1[3])
    if (ano < 1900 || ano > 2200) return null
    return `${m1[3]}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}`
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const ano = parseInt(str.substring(0, 4))
    if (ano < 1900 || ano > 2200) return null
    return str.substring(0, 10)
  }

  const m2 = str.match(/(\d{1,2})[-.](\d{1,2})[-.](\d{4})/)
  if (m2) {
    return `${m2[3]}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`
  }

  const num = Number(str)
  if (!isNaN(num) && num > 1 && num < 109584) {
    const data = new Date(Math.round((num - 25569) * 86400 * 1000))
    if (data.getUTCFullYear() >= 1900 && data.getUTCFullYear() <= 2200) {
      return data.toISOString().split('T')[0]
    }
  }

  const fallback = new Date(str)
  if (!isNaN(fallback.getTime())) {
    const ano = fallback.getUTCFullYear()
    if (ano < 1900 || ano > 2200) return null
    const mes = String(fallback.getUTCMonth() + 1).padStart(2, '0')
    const dia = String(fallback.getUTCDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
  }

  return null
}

type Cliente = { id: string; nome: string; email: string }

export default function AdminImportarPage() {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteSelecionado, setClienteSelecionado] = useState('')
  const [preview, setPreview] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    async function carregarClientes() {
      const { data, error } = await supabase.from('clientes').select('id, nome, email').order('nome')
      if (error) { setMensagem('Erro: ' + error.message); return }
      setClientes(data || [])
    }
    carregarClientes()
  }, [])

  function processarLinhas(linhasBrutas: Record<string, any>[]) {
    const normalizadas = linhasBrutas.map((linha) => {
      const nova: Record<string, any> = {}
      for (const chave in linha) {
        nova[chave.trim().replace(/_+$/, '').toLowerCase()] = linha[chave]
      }
      return nova
    })

    return normalizadas.map((l) => ({
      placa: String(l['placa'] || '').toUpperCase().trim(),
      status: String(l['status'] || '').trim(),
      uf: String(l['uf'] || '').trim(),
      tipo_servico: String(l['tipo_servico'] || '').trim(),
      cpf_cnpj: l['cpf_cnpj'] ? String(l['cpf_cnpj']).trim() : null,
      sla_meta: converterData(l['sla_meta'] ?? null),
      observacoes: l['observacoes'] ? String(l['observacoes']).trim() : null,
      acao_necessaria: l['acao_necessaria'] ? String(l['acao_necessaria']).trim() : null,
      data_abertura: converterData(l['data_abertura'] ?? null),
    }))
  }

  async function aoSelecionar(file: File | null) {
    setArquivo(file)
    setPreview([])
    setMensagem('')
    if (!file) return
    try {
      const dados = await file.arrayBuffer()
      const planilha = XLSX.read(dados, { type: 'array', cellDates: false })
      const aba = planilha.Sheets[planilha.SheetNames[0]]
      const linhas = XLSX.utils.sheet_to_json<Record<string, any>>(aba, { raw: false })
      const resultado = processarLinhas(linhas)
      setPreview(resultado.slice(0, 10))
    } catch (e) {
      setMensagem('Erro ao ler arquivo: ' + (e instanceof Error ? e.message : 'erro'))
    }
  }

  async function importar() {
    if (!arquivo) { setMensagem('Selecione um arquivo.'); return }
    if (!clienteSelecionado) { setMensagem('Selecione um cliente.'); return }

    setCarregando(true)
    setMensagem('')

    try {
      const dados = await arquivo.arrayBuffer()
      const planilha = XLSX.read(dados, { type: 'array', cellDates: false })
      const aba = planilha.Sheets[planilha.SheetNames[0]]
      const linhas = XLSX.utils.sheet_to_json<Record<string, any>>(aba, { raw: false })

      const formatadas = processarLinhas(linhas).map((l) => ({
        ...l,
        cliente_id: clienteSelecionado,
      }))

      const comPlaca = formatadas.filter((l) => l.placa !== '')
      const unicas = new Map<string, any>()
      for (const l of comPlaca) unicas.set(l.placa, l)
      const validas = Array.from(unicas.values())

      if (validas.length === 0) { setMensagem('Nenhuma linha válida.'); return }

    const { error } = await supabase.from('processos').upsert(validas, { onConflict: 'placa,cliente_id' })

      if (error) {
        setMensagem('Erro: ' + error.message)
      } else {
        const nome = clientes.find(c => c.id === clienteSelecionado)?.nome
        setMensagem(`Sucesso! ${validas.length} processos importados para ${nome}.`)
        setArquivo(null)
        setPreview([])
      }
    } catch (e) {
      setMensagem('Erro: ' + (e instanceof Error ? e.message : 'erro'))
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">Painel Admin — Importar Processos</h1>
          <button onClick={() => router.push('/dashboard')} className="text-sm text-gray-600 hover:text-gray-800">Voltar</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-800">Importar Planilha</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Selecionar Cliente</label>
            <select value={clienteSelecionado} onChange={(e) => setClienteSelecionado(e.target.value)} className="w-full border border-gray-300 rounded p-2">
              <option value="">— Escolha um cliente —</option>
              {clientes.map((c) => (<option key={c.id} value={c.id}>{c.nome} ({c.email})</option>))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Arquivo da Planilha</label>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => aoSelecionar(e.target.files?.[0] || null)} className="border border-gray-300 rounded p-2 w-full" />
          </div>

          {preview.length > 0 && (
            <div className="border border-gray-300 rounded p-4">
              <h3 className="text-sm font-bold text-gray-800 mb-2">Pré-visualização (primeiras {preview.length} linhas)</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-2 py-1 border border-gray-300 text-left">Placa</th>
                      <th className="px-2 py-1 border border-gray-300 text-left">Status</th>
                      <th className="px-2 py-1 border border-gray-300 text-left">Data Abertura</th>
                      <th className="px-2 py-1 border border-gray-300 text-left">SLA Meta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((l, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-2 py-1 border border-gray-300 font-mono">{l.placa || '-'}</td>
                        <td className="px-2 py-1 border border-gray-300">{l.status || '-'}</td>
                        <td className="px-2 py-1 border border-gray-300 font-mono">{l.data_abertura || '(vazio)'}</td>
                        <td className="px-2 py-1 border border-gray-300 font-mono">{l.sla_meta || '(vazio)'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <button onClick={importar} disabled={!arquivo || !clienteSelecionado || carregando} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50">
            {carregando ? 'Importando...' : 'Importar Planilha'}
          </button>

          {mensagem && (
            <p className={`text-sm ${mensagem.includes('Erro') ? 'text-red-600' : 'text-green-600'}`}>{mensagem}</p>
          )}
        </div>
      </main>
    </div>
  )
}