import { NextResponse } from 'next/server'
import { authenticateRequest, requireAdmin } from '../../../lib/server-auth'

export async function GET(request: Request) {
  const result = await authenticateRequest(request)
  if ('response' in result) return result.response
  const adminError = requireAdmin(result.context)
  if (adminError) return adminError

  const { data, error } = await result.context.supabase
    .from('clientes')
    .select('id, nome, email')
    .order('nome')

  if (error) {
    return NextResponse.json({ error: 'Não foi possível carregar os clientes.' }, { status: 500 })
  }

  return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } })
}