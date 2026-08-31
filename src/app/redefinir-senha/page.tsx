'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function RedefinirSenhaPage() {
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [linkValido, setLinkValido] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento, session) => {
      if (evento === 'PASSWORD_RECOVERY' && session) {
        setLinkValido(true)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setLinkValido(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function redefinirSenha(event: React.FormEvent) {
    event.preventDefault()
    setMensagem('')

    if (senha.length < 8) {
      setMensagem('A senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (senha !== confirmacao) {
      setMensagem('As senhas não coincidem.')
      return
    }

    setCarregando(true)
    const { error } = await supabase.auth.updateUser({ password: senha })
    setCarregando(false)

    if (error) {
      setMensagem('Não foi possível alterar a senha. Solicite um novo link.')
      return
    }

    router.replace('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2 text-gray-800">Definir nova senha</h1>
        <p className="text-sm text-center text-gray-600 mb-6">Escolha uma senha para acessar o portal.</p>

        {!linkValido ? (
          <p className="text-sm text-red-600 text-center">Este link é inválido ou expirou. Solicite um novo link de acesso.</p>
        ) : (
          <form onSubmit={redefinirSenha} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
              <input type="password" value={senha} onChange={(event) => setSenha(event.target.value)} required minLength={8} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nova senha</label>
              <input type="password" value={confirmacao} onChange={(event) => setConfirmacao(event.target.value)} required minLength={8} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {mensagem && <p className="text-sm text-red-600 text-center">{mensagem}</p>}
            <button type="submit" disabled={carregando} className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50">
              {carregando ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}