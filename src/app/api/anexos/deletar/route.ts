import { NextResponse } from 'next/server'
import { authenticateRequest, registrarAuditoria, requireAdmin } from '../../../../lib/server-auth'

export async function POST(request: Request) {
  try {
    const result = await authenticateRequest(request)
    if ('response' in result) return result.response
    const adminError = requireAdmin(result.context)
    if (adminError) return adminError
    const { anexoId } = await request.json()
    if (typeof anexoId !== 'string' || !/^[0-9a-f-]{36}$/i.test(anexoId)) {
      return NextResponse.json({ error: 'Anexo inválido.' }, { status: 400 })
    }

    // Buscar o anexo para pegar o caminho do arquivo no bucket privado.
    const { data: anexo } = await result.context.supabase
      .from('anexos')
      .select('url_arquivo')
      .eq('id', anexoId)
      .single()

    if (anexo) {
      await result.context.supabase.storage.from('anexos-processos').remove([anexo.url_arquivo])
    }

    // Deletar o registro
    const { error } = await result.context.supabase
      .from('anexos')
      .delete()
      .eq('id', anexoId)

    if (error) {
      return NextResponse.json({ error: 'Não foi possível excluir o anexo.' }, { status: 500 })
    }

    await registrarAuditoria(result.context.supabase, result.context.user, 'excluir_anexo', 'anexos', anexoId)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}