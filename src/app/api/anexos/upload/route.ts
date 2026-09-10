import { NextResponse } from 'next/server'
import { authenticateRequest, canAccessProcess, checkRateLimit, registrarAuditoria } from '../../../../lib/server-auth'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'text/plain'])

export async function POST(request: Request) {
  try {
    if (!checkRateLimit(request, 'anexos-upload', 20, 60 * 60_000)) {
      return NextResponse.json({ error: 'Limite de uploads atingido. Tente novamente mais tarde.' }, { status: 429 })
    }
    const result = await authenticateRequest(request)
    if ('response' in result) return result.response
    const formData = await request.formData()
    const file = formData.get('file') as File
    const processoId = formData.get('processoId') as string
    const clienteId = formData.get('clienteId') as string

    if (!(file instanceof File) || !processoId || !clienteId) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }
    if (file.size === 0 || file.size > MAX_FILE_SIZE || !ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Arquivo inválido. Envie PDF, JPG, PNG ou TXT de até 10 MB.' }, { status: 400 })
    }

    const processo = await canAccessProcess(result.context.supabase, result.context.user, processoId, result.context.isAdmin)
    if (!processo || processo.cliente_id !== clienteId) {
      return NextResponse.json({ error: 'Sem permissão para este processo.' }, { status: 403 })
    }

    // Passo 1: Upload para o Storage
    const extensoes: Record<string, string> = {
      'application/pdf': 'pdf',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'text/plain': 'txt',
    }
    const nomeArquivoStorage = `${processoId}/${crypto.randomUUID()}.${extensoes[file.type]}`

    const { error: uploadError } = await result.context.supabase
      .storage
      .from('anexos-processos')
      .upload(nomeArquivoStorage, file)

    if (uploadError) {
      return NextResponse.json({ error: 'Não foi possível enviar o arquivo.' }, { status: 500 })
    }

    // Passo 2: Registrar o caminho no bucket privado.
    const { error: dbError } = await result.context.supabase
      .from('anexos')
      .insert({
        processo_id: processoId,
        cliente_id: clienteId,
        nome_arquivo: file.name,
        url_arquivo: nomeArquivoStorage,
        tamanho_bytes: file.size,
        enviado_por: result.context.isAdmin ? 'Almani (Admin)' : result.context.user.email,
      })

    if (dbError) {
      await result.context.supabase.storage.from('anexos-processos').remove([nomeArquivoStorage])
      return NextResponse.json({ error: 'Não foi possível registrar o anexo.' }, { status: 500 })
    }

    await registrarAuditoria(result.context.supabase, result.context.user, 'enviar_anexo', 'anexos', processoId)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}