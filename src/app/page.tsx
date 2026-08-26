'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

type Processo = {
  id: string
  numero_processo: string
  titulo: string
  descricao: string | null
  status: string
  data_abertura: string
  ultima_atualizacao: string
}

type Movimentacao = {
  id: string
  descricao: string
  data: string
}

const STATUS_CORES: Record<string, string> = {
  'Em andamento': 'bg-yellow-100 text-yellow-800',
  'Concluído': 'bg-green-100 text-green-800',
  'Aguardando documento': 'bg-orange-100 text-orange-800',
  'Pausado': 'bg-gray-100 text-gray-800',
}

export default function DashboardPage() {
  const [processos, setProcessos] = useState<Processo[]>([])
  const [movimentacoes, setMovimentacoes] = useState<Record<string, Movimentacao[]>>({})
  const [carregando, setCarregando] = useState(true)
  const [usuario, setUsuario] = useState<string>('')
  const [processoExpandido, setProcessoExpandido] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function carregarDados() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      setUsuario(session.user.email || '')

      // Buscar processos do cliente
      const { data: processosData, error } = await supabase
        .from('processos')
        .select('*')
        .order('ultima_atualizacao', { ascending: false })

      if (error) {
        console.error('Erro ao carregar processos:', error)
        setCarregando(false)
        return
      }

      setProcessos(processosData || [])

      // Buscar movimentações de cada processo
      const movs: Record<string, Movimentacao[]> = {}
      for (const p of processosData || []) {
        const { data: movData } = await supabase
          .from('movimentacoes')
          .select('*')
          .eq('processo_id', p.id)
          .order('data', { ascending: false })

        movs[p.id] = movData || []
      }
      setMovimentacoes(movs)
      setCarregando(false)
    }

    carregarDados()
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
      {/* Cabeçalho */}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">Portal do Cliente</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{usuario}</span>
            <button
              onClick={sair}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Meus Processos</h2>

        {processos.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            Você ainda não possui processos cadastrados.
          </div>
        ) : (
          <div className="space-y-4">
            {processos.map((processo) => (
              <div key={processo.id} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Card do processo */}
                <div
                  className="p-5 cursor-pointer hover:bg-gray-50 transition"
                  onClick={() =>
                    setProcessoExpandido(
                      processoExpandido === processo.id ? null : processo.id
                    )
                  }
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-800">{processo.titulo}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Processo nº {processo.numero_processo}
                      </p>
                      {processo.descricao && (
                        <p className="text-sm text-gray-600 mt-2">{processo.descricao}</p>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        STATUS_CORES[processo.status] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {processo.status}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-3 text-xs text-gray-400">
                    <span>Aberto em: {new Date(processo.data_abertura).toLocaleDateString('pt-BR')}</span>
                    <span>
                      Atualizado em: {new Date(processo.ultima_atualizacao).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>

                {/* Movimentações expansíveis */}
                {processoExpandido === processo.id && (
                  <div className="border-t border-gray-100 p-5 bg-gray-50">
                    <h4 className="font-medium text-gray-700 mb-3">Movimentações</h4>
                    {movimentacoes[processo.id]?.length === 0 ? (
                      <p className="text-sm text-gray-400">Nenhuma movimentação registrada.</p>
                    ) : (
                      <div className="space-y-3">
                        {movimentacoes[processo.id]?.map((mov) => (
                          <div key={mov.id} className="flex gap-3">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                            <div>
                              <p className="text-sm text-gray-700">{mov.descricao}</p>
                              <p className="text-xs text-gray-400">
                                {new Date(mov.data).toLocaleString('pt-BR')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}