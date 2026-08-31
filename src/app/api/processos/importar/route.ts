import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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

async function validarAdministrador(request: Request): Promise<NextResponse | null> {
  const authorization = request.headers.get('authorization')
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null

  if (!token) {
    return NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 })
  }

  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)

  if (authError || !user?.email) {
    return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 })
  }

  const adminEmails = (process.env.ALMANI_ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)

  if (adminEmails.length === 0) {
    return NextResponse.json({ error: 'Administradores não configurados.' }, { status: 503 })
  }

  if (!adminEmails.includes(user.email.toLowerCase())) {
    return NextResponse.json({ error: 'Sem permissão para importar processos.' }, { status: 403 })
  }

  return null
}

export async function GET(request: Request) {
  const erroAutorizacao = await validarAdministrador(request)
  return erroAutorizacao || new Response(null, { status: 204 })
}

export async function POST(request: Request) {
  const erroAutorizacao = await validarAdministrador(request)
  if (erroAutorizacao) return erroAutorizacao

  let processos: ProcessoImportado[]
  try {
    const body = await request.json()
    processos = body.processos
  } catch {
    return NextResponse.json({ error: 'Dados de importação inválidos.' }, { status: 400 })
  }

  if (!Array.isArray(processos) || processos.length === 0) {
    return NextResponse.json({ error: 'Nenhum processo para importar.' }, { status: 400 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { error } = await supabaseAdmin
    .from('processos')
    .upsert(processos, { onConflict: 'placa,cliente_id' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}