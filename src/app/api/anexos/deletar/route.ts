import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { anexoId } = await request.json()

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Buscar o anexo para pegar o caminho do arquivo
    const { data: anexo } = await supabaseAdmin
      .from('anexos')
      .select('url_arquivo')
      .eq('id', anexoId)
      .single()

    if (anexo) {
      // Extrair o caminho do arquivo da URL
      const url = new URL(anexo.url_arquivo)
      const caminho = url.pathname.split('/anexos-processos/')[1]

      if (caminho) {
        await supabaseAdmin.storage.from('anexos-processos').remove([caminho])
      }
    }

    // Deletar o registro
    const { error } = await supabaseAdmin
      .from('anexos')
      .delete()
      .eq('id', anexoId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}