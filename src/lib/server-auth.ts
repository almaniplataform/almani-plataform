import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

type AuthenticatedUser = {
  user: User
  isAdmin: boolean
  supabase: SupabaseClient
}

function getAdminEmails() {
  return (process.env.ALMANI_ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export async function authenticateRequest(request: Request): Promise<
  { context: AuthenticatedUser } | { response: NextResponse }
> {
  const authorization = request.headers.get('authorization')
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : ''

  if (!token) {
    return { response: NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 }) }
  }

  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error } = await supabaseAuth.auth.getUser(token)

  if (error || !user?.email) {
    return { response: NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 }) }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  return { context: { user, isAdmin: getAdminEmails().includes(user.email.toLowerCase()), supabase } }
}

export function requireAdmin(context: AuthenticatedUser) {
  return context.isAdmin ? null : NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
}

export async function registrarAuditoria(
  supabase: AuthenticatedUser['supabase'],
  user: User,
  acao: string,
  entidade: string,
  entidadeId?: string,
) {
  await supabase.from('auditoria_acessos').insert({
    user_id: user.id,
    email: user.email,
    acao,
    entidade,
    entidade_id: entidadeId || null,
  })
}

export async function canAccessProcess(
  supabase: AuthenticatedUser['supabase'],
  user: User,
  processoId: string,
  isAdmin: boolean,
) {
  const { data: processo, error } = await supabase
    .from('processos')
    .select('id, cliente_id')
    .eq('id', processoId)
    .maybeSingle()

  if (error || !processo) return null
  if (isAdmin) return processo

  const { data: vinculo } = await supabase
    .from('usuarios_cliente')
    .select('cliente_id')
    .eq('user_id', user.id)
    .eq('cliente_id', processo.cliente_id)
    .maybeSingle()

  return vinculo ? processo : null
}

const requestBuckets = new Map<string, { startedAt: number; count: number }>()

export function checkRateLimit(request: Request, key: string, limit: number, windowMs: number) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const address = forwardedFor || request.headers.get('x-real-ip') || 'unknown'
  const bucketKey = `${key}:${address}`
  const now = Date.now()
  if (requestBuckets.size > 5000) {
    for (const [storedKey, storedBucket] of requestBuckets) {
      if (now - storedBucket.startedAt >= windowMs) requestBuckets.delete(storedKey)
    }
  }
  const bucket = requestBuckets.get(bucketKey)

  if (!bucket || now - bucket.startedAt >= windowMs) {
    requestBuckets.set(bucketKey, { startedAt: now, count: 1 })
    return true
  }

  bucket.count += 1
  return bucket.count <= limit
}