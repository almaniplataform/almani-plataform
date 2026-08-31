import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const processoId = searchParams.get('processoId')

  if (!processoId) {
    return NextResponse.json({ error: 'processoId obrigatório' }, { status: 400 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabaseAdmin
    .from('anexos')
    .select('*')
    .eq('processo_id', processoId)
    .order('criado_em', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const anexos = await Promise.all((data || []).map(async (anexo) => {
    const { data: urlData, error: urlError } = await supabaseAdmin
      .storage
      .from('anexos-processos')
      .createSignedUrl(anexo.url_arquivo, 60 * 60)

    if (urlError || !urlData?.signedUrl) {
      return { ...anexo, url_arquivo: '' }
    }

    return { ...anexo, url_arquivo: urlData.signedUrl }
  }))

  return NextResponse.json(anexos)
}