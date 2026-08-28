'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'

function converterDataExcel(valor: any): string | null {
  if (!valor || valor === '') return null

  if (typeof valor === 'number') {
    const data = new Date(Math.round((valor - 25569) * 86400 * 1000))
    return data.toISOString().split('T')[0]
  }

  const str = String(valor).trim()

  if (/[a-zA-Z]/.test(str)) return null

  const match = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (match) {
    const [, dia, mes, ano] = match
    return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.split('T')[0]
  }

  return null
}

export default function ImportarPlanilha() {
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  async function importar() {
    if (!arquivo) {
      setMensagem('Selecione um arquivo primeiro.')
      return
    }

    setCarregando(true)
    setMensagem('')

    try {
      // 1. Buscar o cliente_id do usuário logado
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setMensagem('Você precisa estar logado para importar.')
        return
      }

      const emailUsuario = session.user.email

      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .select('id')
        .eq('email', emailUsuario)
        .single()

      if (clienteError || !clienteData) {
        setMensagem('Erro: seu usuário não está cadastrado na tabela clientes.')
        return
      }

      const clienteId = clienteData.id

      // 2. Ler o arquivo
      const dados = await arquivo.arrayBuffer()
      const planilha = XLSX.read(dados, { type: 'array' })
      const primeiraAba = planilha.Sheets[planilha.SheetNames[0]]
      const linhasBrutas = XLSX.utils.sheet_to_json<Record<string, any>>(primeiraAba)

      // 3. Mapear colunas (ignora id, cliente_id, created_at do CSV)
      const linhasFormatadas = linhasBrutas.map((linha) => ({
        placa: String(linha['placa'] || linha['Placa'] || '').toUpperCase().trim(),
        status: String(linha['status'] || linha['Status'] || '').trim(),
        uf: String(linha['uf'] || linha['UF'] || '').trim(),
        tipo_servico: String(linha['tipo_servico'] || linha['Tipo Servico'] || '').trim(),
        cpf_cnpj: linha['cpf_cnpj'] ? String(linha['cpf_cnpj']).trim() : null,
        sla_meta: converterDataExcel(linha['sla_meta'] ?? linha['SLA Meta'] ?? null),
        observacoes: linha['observacoes'] ? String(linha['observacoes']).trim() : null,
        acao_necessaria: linha['acao_necessaria'] ? String(linha['acao_necessaria']).trim() : null,
        data_abertura: converterDataExcel(linha['data_abertura'] ?? linha['Data Abertura'] ?? null),
        cliente_id: clienteId,
      }))

      // 4. Remover linhas sem placa
      const comPlaca = linhasFormatadas.filter((l) => l.placa !== '')

      // 5. Remover duplicatas (mantém a última ocorrência de cada placa)
      const placasVistas = new Map<string, typeof comPlaca[0]>()
      for (const linha of comPlaca) {
        placasVistas.set(linha.placa, linha)
      }
      const linhasValidas = Array.from(placasVistas.values())

      if (linhasValidas.length === 0) {
        setMensagem('Nenhuma linha válida encontrada. Verifique se a coluna "placa" existe na planilha.')
        return
      }

      // 6. Upsert no Supabase
      const { data, error } = await supabase
        .from('processos')
        .upsert(linhasValidas, {
          onConflict: 'placa',
        })

      if (error) {
        setMensagem(`Erro ao importar: ${error.message}`)
      } else {
        const duplicadasRemovidas = comPlaca.length - linhasValidas.length
        const msg = duplicadasRemovidas > 0
          ? `Sucesso! ${linhasValidas.length} processos importados (${duplicadasRemovidas} duplicata(s) removida(s)).`
          : `Sucesso! ${linhasValidas.length} processos importados/atualizados.`
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
    <div className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold">Importar Planilha de Processos</h2>

      <input
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={(e) => setArquivo(e.target.files?.[0] || null)}
        className="border border-gray-300 rounded p-2"
      />

      <button
        onClick={importar}
        disabled={!arquivo || carregando}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {carregando ? 'Importando...' : 'Importar Planilha'}
      </button>

      {mensagem && (
        <p className={`text-sm ${mensagem.includes('Erro') ? 'text-red-600' : 'text-green-600'}`}>
          {mensagem}
        </p>
      )}
    </div>
  )
}