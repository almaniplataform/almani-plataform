import { NextResponse } from 'next/server'
import { authenticateRequest, checkRateLimit, registrarAuditoria, requireAdmin } from '../../../../lib/server-auth'

type ProcessoImportado = {
  placa: string
  status: string
  uf: string
  tipo_servico: string
  cpf_cnpj: string | null
  sla_meta: string | null
  observacoes: string | null
  acao_necessaria: string | null
  data_abertura: string | null
  cliente_id: string
}

export async function GET(request: Request) {
  const result = await authenticateRequest(request)
  if ('response' in result) return result.response
  return requireAdmin(result.context) || new Response(null, { status: 204 })
}

export async function POST(request: Request) {
  if (!checkRateLimit(request, 'processos-importar', 10, 60_000)) {
    return NextResponse.json({ error: 'Muitas tentativas. Aguarde um minuto.' }, { status: 429 })
  }
  const result = await authenticateRequest(request)
  if ('response' in result) return result.response
  const adminError = requireAdmin(result.context)
  if (adminError) return adminError

  let processos: ProcessoImportado[]
  try {
    const body = await request.json()
    processos = body.processos
  } catch {
    return NextResponse.json({ error: 'Dados de importação inválidos.' }, { status: 400 })
  }

  if (!Array.isArray(processos) || processos.length === 0 || processos.length > 500) {
    return NextResponse.json({ error: 'Nenhum processo para importar.' }, { status: 400 })
  }

  const invalid = processos.some((processo) =>
    !processo ||
    typeof processo.placa !== 'string' || processo.placa.length === 0 || processo.placa.length > 30 ||
    typeof processo.status !== 'string' || processo.status.length > 80 ||
    typeof processo.uf !== 'string' || processo.uf.length > 2 ||
    typeof processo.tipo_servico !== 'string' || processo.tipo_servico.length > 120 ||
    (processo.cpf_cnpj !== null && (typeof processo.cpf_cnpj !== 'string' || processo.cpf_cnpj.length > 30)) ||
    (processo.observacoes !== null && (typeof processo.observacoes !== 'string' || processo.observacoes.length > 5000)) ||
    (processo.acao_necessaria !== null && (typeof processo.acao_necessaria !== 'string' || processo.acao_necessaria.length > 5000)) ||
    typeof processo.cliente_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(processo.cliente_id)
  )
  if (invalid) return NextResponse.json({ error: 'Dados de processo inválidos.' }, { status: 400 })

  const { data: cliente } = await result.context.supabase
    .from('clientes')
    .select('id')
    .eq('id', processos[0].cliente_id)
    .maybeSingle()
  if (!cliente || processos.some((processo) => processo.cliente_id !== cliente.id)) {
    return NextResponse.json({ error: 'Cliente inválido.' }, { status: 400 })
  }

  const { error } = await result.context.supabase
    .from('processos')
    .upsert(processos, { onConflict: 'placa,cliente_id' })

  if (error) {
    return NextResponse.json({ error: 'Não foi possível importar os processos.' }, { status: 500 })
  }

  await registrarAuditoria(result.context.supabase, result.context.user, 'importar_processos', 'processos', processos[0].cliente_id)

  return NextResponse.json({ success: true })
}