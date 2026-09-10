import { NextResponse } from 'next/server'
import { authenticateRequest, canAccessProcess } from '../../../../lib/server-auth'

export async function GET(request: Request) {
  const result = await authenticateRequest(request)
  if ('response' in result) return result.response
  const { searchParams } = new URL(request.url)
  const processoId = searchParams.get('processoId')

  if (!processoId) {
    return NextResponse.json({ error: 'processoId obrigatório' }, { status: 400 })
  }

  const processo = await canAccessProcess(result.context.supabase, result.context.user, processoId, result.context.isAdmin)
  if (!processo) return NextResponse.json({ error: 'Processo não encontrado.' }, { status: 404 })

  const { data, error } = await result.context.supabase
    .from('anexos')
    .select('*')
    .eq('processo_id', processoId)
    .order('criado_em', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Não foi possível carregar os anexos.' }, { status: 500 })
  }

  const anexos = await Promise.all((data || []).map(async (anexo) => {
    const { data: urlData, error: urlError } = await result.context.supabase
      .storage
      .from('anexos-processos')
      .createSignedUrl(anexo.url_arquivo, 60 * 60)

    if (urlError || !urlData?.signedUrl) {
      return { ...anexo, url_arquivo: '' }
    }

    return { ...anexo, url_arquivo: urlData.signedUrl }
  }))

  return NextResponse.json(anexos, { headers: { 'Cache-Control': 'private, no-store' } })
}