import { NextResponse } from 'next/server'
import { authenticateRequest, requireAdmin } from '../../../lib/server-auth'

export async function GET(request: Request) {
  const result = await authenticateRequest(request)
  if ('response' in result) return result.response
  const adminError = requireAdmin(result.context)
  if (adminError) return adminError

  const { data, error } = await result.context.supabase
    .from('processos')
    .select('*, clientes(nome)')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Não foi possível carregar os processos.' }, { status: 500 })
  }

  return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } })
}