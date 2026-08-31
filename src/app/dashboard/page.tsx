'use client'
import { Fragment, useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import AnexosProcesso from '../../components/AnexosProcesso'
import PanoramaExecutivo from '../../components/PanoramaExecutivo'
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
}

type Cliente = {
  id: string
  nome: string
  logo_url: string | null
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
  if (m) {
    return `${m[3]}/${m[2]}/${m[1]}`
  }
  const d = new Date(data)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('pt-BR')
}
function verificarVencimento(data: string | null, status: string | null): boolean {
  if (!data) return false
  const statusLower = (status || '').toLowerCase().trim()
  if (statusLower === 'concluido' || statusLower === 'concluído') return false
  const dataSla = data.substring(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataSla)) return false
  const hoje = new Date()
  const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
  return dataSla < hojeStr
}
export default function DashboardPage() {
  const [processos, setProcessos] = useState<Processo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [usuario, setUsuario] = useState('')
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [processoExpandido, setProcessoExpandido] = useState<string | null>(null)
  const router = useRouter()
  useEffect(() => {
    async function carregarDados() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const autorizacaoAdmin = await fetch('/api/processos/importar', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (autorizacaoAdmin.ok) {
        router.replace('/admin')
        return
      }

      const userEmail = session.user.email || ''
      setUsuario(userEmail)
      const { data: clienteData, error: clienteError } = await supabase
        .from('clientes')
        .select('id, nome')
        .eq('email', userEmail)
        .single()
      if (clienteError || !clienteData) {
        console.error('Cliente não encontrado para o e-mail:', userEmail)
        setProcessos([])
        setCarregando(false)
        return
      }
      const { data: logoData } = await supabase
        .from('clientes')
        .select('logo_url')
        .eq('id', clienteData.id)
        .maybeSingle()
      setCliente({
        ...clienteData,
        logo_url: logoData?.logo_url || null,
      })
      const { data: processosData, error } = await supabase
        .from('processos')
        .select('*')
        .eq('cliente_id', clienteData.id)
        .order('created_at', { ascending: false })
      if (error) {
        console.error('Erro ao carregar processos:', error)
        setCarregando(false)
        return
      }
      const ordenados = [...(processosData || [])].sort((a, b) => {
        const statusA = (a.status || '').toLowerCase()
        const statusB = (b.status || '').toLowerCase()
        if (statusA < statusB) return -1
        if (statusA > statusB) return 1
        return 0
      })
      setProcessos(ordenados)
      setCarregando(false)
    }
    carregarDados()
  }, [router])
  async function sair() {
    await supabase.auth.signOut()
    router.push('/login')
  }
  async function solicitarAlteracaoSenha() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })
    if (error) {
      alert('Não foi possível enviar o link de alteração de senha.')
      return
    }
    alert('Enviamos um link para alterar sua senha ao seu e-mail.')
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
        <div
          className="max-w-7xl mx-auto px-4"
          style={{
            height: '112px',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          {/* Esquerda: Logo da empresa */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifySelf: 'start',
              minWidth: 0,
            }}
          >
            {cliente?.logo_url ? (
              <img
                src={cliente.logo_url}
                alt={`Logo da ${cliente.nome}`}
                style={{
                  height: '64px',
                  width: '200px',
                  display: 'block',
                  objectFit: 'contain',
                  objectPosition: 'left center',
                }}
              />
            ) : (
              <span className="text-lg font-semibold text-gray-700">
                {cliente?.nome || 'Empresa'}
              </span>
            )}
          </div>

          {/* Centro: Logo da Almani */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 0,
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            <Image
              src="/almani-logo.png"
              alt="Almani - Simple Process"
              width={96}
              height={96}
              style={{
                display: 'block',
                width: '96px',
                height: '96px',
                objectFit: 'contain',
                flexShrink: 0,
              }}
            />
          </div>

          {/* Direita: Usuário + Sair */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '16px',
              minWidth: 0,
              marginLeft: 'auto',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                fontSize: '14px',
                color: '#4b5563',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'inline-block',
                maxWidth: '100%',
              }}
            >
              {usuario}
            </span>
            <button
              onClick={solicitarAlteracaoSenha}
              style={{
                fontSize: '14px',
                color: '#2563eb',
                fontWeight: 500,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Alterar senha
            </button>
            <button
              onClick={sair}
              style={{
                fontSize: '14px',
                color: '#dc2626',
                fontWeight: 500,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Meus Processos</h2>
          <PanoramaExecutivo processos={processos} />
        </div>
        {processos.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            Você ainda não possui processos cadastrados.
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="px-4 py-3 text-center font-semibold border-r border-gray-600 whitespace-nowrap">Tipo de Serviço</th>
                    <th className="px-4 py-3 text-center font-semibold border-r border-gray-600 whitespace-nowrap">Placa</th>
                    <th className="px-4 py-3 text-center font-semibold border-r border-gray-600 whitespace-nowrap">UF</th>
                    <th className="px-4 py-3 text-center font-semibold border-r border-gray-600 whitespace-nowrap">Documento</th>
                    <th className="px-4 py-3 text-center font-semibold border-r border-gray-600 whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-center font-semibold border-r border-gray-600 whitespace-nowrap">Data Abertura</th>
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
                        <td className="px-4 py-3 text-center text-gray-800 font-medium border-r border-gray-200 whitespace-nowrap">
                          {processo.tipo_servico || '-'}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-900 font-bold border-r border-gray-200 whitespace-nowrap">
                          {processo.placa || '-'}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700 border-r border-gray-200 whitespace-nowrap">
                          {processo.uf || '-'}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600 border-r border-gray-200 whitespace-nowrap">
                          {processo.cpf_cnpj || '-'}
                        </td>
                        <td className="px-4 py-3 text-center border-r border-gray-200 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded border ${STATUS_CORES[processo.status] || 'bg-gray-100 text-gray-700 border-gray-300'}`}
                          >
                            {processo.status || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600 border-r border-gray-200 whitespace-nowrap">
                          {formatarData(processo.data_abertura)}
                        </td>
                        <td className="px-4 py-3 text-center border-r border-gray-200 whitespace-nowrap">
                          <span className={`font-medium ${verificarVencimento(processo.sla_meta, processo.status) ? 'text-red-600 font-bold' : 'text-blue-700'}`}>
                            {formatarData(processo.sla_meta)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600 max-w-[200px] truncate" title={processo.observacoes || ''}>
                          {processo.observacoes || '-'}
                        </td>
                      </tr>
                      {processoExpandido === processo.id && (
                        <tr className="bg-blue-50 border-b border-gray-200">
                          <td colSpan={8} className="px-6 py-4">
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
                            </div>

                            <AnexosProcesso
                              processoId={processo.id}
                              clienteId={processo.cliente_id}
                              usuarioEmail={usuario}
                              isAdmin={false}
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
        <footer className="mt-8 text-center">
          <img
            src="/almani-logo.png"
            alt="Almani - Simple Process"
            className="h-12 w-auto inline-block opacity-40"
          />
        </footer>
      </main>
    </div>
  )
}