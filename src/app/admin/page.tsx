'use client'

import { Fragment, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import AnexosProcesso from '../../components/AnexosProcesso'

type Processo = {
  id: string
  cliente_id: string
  status: string
  data_abertura: string
  placa: string | null
  uf: string | null
  cpf_cnpj: string | null
  tipo_servico: string | null
  sla_meta: string | null
  observacoes: string | null
  acao_necessaria: string | null
  created_at: string
  clientes: { nome: string } | null
}

const STATUS_CORES: Record<string, string> = {
  'Em andamento': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'Concluído': 'bg-green-100 text-green-800 border-green-300',
  'Concluido': 'bg-green-100 text-green-800 border-green-300',
  'Aguardando documento': 'bg-orange-100 text-orange-800 border-orange-300',
  'Pausado': 'bg-gray-100 text-gray-800 border-gray-300',
}

function formatarData(data: string | null): string {
  if (!data) return '-'
  const m = data.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  const d = new Date(data)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('pt-BR')
}

export default function AdminPage() {
  const [processos, setProcessos] = useState<Processo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [processoExpandido, setProcessoExpandido] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function carregar() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      const res = await fetch('/api/processos')
      if (!res.ok) {
        console.error('Erro ao carregar processos')
        setCarregando(false)
        return
      }
      const data = await res.json()
      setProcessos(data || [])
      setCarregando(false)
    }
    carregar()
  }, [router])

  async function sair() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">Painel Admin — Processos</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/importar')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Importar CSV
            </button>
            <button
              onClick={sair}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Todos os Processos</h2>
        {processos.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            Nenhum processo cadastrado.
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="px-4 py-3 text-center font-semibold border-r border-gray-600 whitespace-nowrap">Cliente</th>
                    <th className="px-4 py-3 text-center font-semibold border-r border-gray-600 whitespace-nowrap">Tipo de Serviço</th>
                    <th className="px-4 py-3 text-center font-semibold border-r border-gray-600 whitespace-nowrap">Placa</th>
                    <th className="px-4 py-3 text-center font-semibold border-r border-gray-600 whitespace-nowrap">UF</th>
                    <th className="px-4 py-3 text-center font-semibold border-r border-gray-600 whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-center font-semibold border-r border-gray-600 whitespace-nowrap">SLA Meta</th>
                    <th className="px-4 py-3 text-center font-semibold whitespace-nowrap">Observações</th>
                  </tr>
                </thead>
                <tbody>
                  {processos.map((processo, index) => (
                    <Fragment key={processo.id}>
                      <tr
                        className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 cursor-pointer border-b border-gray-200`}
                        onClick={() =>
                          setProcessoExpandido(
                            processoExpandido === processo.id ? null : processo.id
                          )
                        }
                      >
                        <td className="px-4 py-3 text-center text-gray-800 font-semibold border-r border-gray-200 whitespace-nowrap">
                          {processo.clientes?.nome || '—'}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-800 border-r border-gray-200 whitespace-nowrap">
                          {processo.tipo_servico || '-'}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-900 font-bold border-r border-gray-200 whitespace-nowrap">
                          {processo.placa || '-'}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {processo.uf || '-'}
                        </td>
                        <td className="px-4 py-3 text-center border-r border-gray-200 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded border ${STATUS_CORES[processo.status] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                            {processo.status || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-blue-700 font-medium border-r border-gray-200 whitespace-nowrap">
                          {formatarData(processo.sla_meta)}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600 max-w-[200px] truncate" title={processo.observacoes || ''}>
                          {processo.observacoes || '-'}
                        </td>
                      </tr>
                      {processoExpandido === processo.id && (
                        <tr className="bg-blue-50 border-b border-gray-200">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Observações Completas</span>
                                <span className="text-sm text-gray-700">{processo.observacoes || 'Nenhuma observação.'}</span>
                              </div>
                              <div>
                                <span className="text-xs font-bold text-orange-500 uppercase block mb-1">Ação Necessária</span>
                                <span className="text-sm text-orange-700">{processo.acao_necessaria || 'Nenhuma ação necessária.'}</span>
                              </div>
                              <div>
                                <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Atualizado em</span>
                                <span className="text-sm text-gray-600">{formatarData(processo.created_at)}</span>
                              </div>
                              <div>
                                <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Documento</span>
                                <span className="text-sm text-gray-600">{processo.cpf_cnpj || '-'}</span>
                              </div>
                            </div>

                            <AnexosProcesso
                              processoId={processo.id}
                              clienteId={processo.cliente_id}
                              usuarioEmail="allestavares@gmail.com"
                              isAdmin={true}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}