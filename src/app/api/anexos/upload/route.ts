import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const processoId = formData.get('processoId') as string
    const clienteId = formData.get('clienteId') as string
    const enviadoPor = formData.get('enviadoPor') as string

    if (!file || !processoId || !clienteId) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Passo 1: Upload para o Storage
    const extensao = file.name.split('.').pop()
    const nomeArquivoStorage = `${processoId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${extensao}`

    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('anexos-processos')
      .upload(nomeArquivoStorage, file)

    if (uploadError) {
      return NextResponse.json({ error: 'Erro no upload: ' + uploadError.message }, { status: 500 })
    }

    // Passo 2: Obter URL pública
    const { data: urlData } = supabaseAdmin
      .storage
      .from('anexos-processos')
      .getPublicUrl(nomeArquivoStorage)

    // Passo 3: Registrar na tabela anexos
    const { error: dbError } = await supabaseAdmin
      .from('anexos')
      .insert({
        processo_id: processoId,
        cliente_id: clienteId,
        nome_arquivo: file.name,
        url_arquivo: urlData.publicUrl,
        tamanho_bytes: file.size,
        enviado_por: enviadoPor,
      })

    if (dbError) {
      return NextResponse.json({ error: 'Erro ao registrar: ' + dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, url: urlData.publicUrl })
  } catch (e) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}