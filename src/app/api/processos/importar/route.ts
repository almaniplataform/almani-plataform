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

export async function POST(request: Request) {
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