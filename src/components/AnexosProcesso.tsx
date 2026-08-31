'use client'

import { useState, useEffect } from 'react'

type Anexo = {
  id: string
  nome_arquivo: string
  url_arquivo: string
  tamanho_bytes: number
  enviado_por: string
  criado_em: string
}

export default function AnexosProcesso({
  processoId,
  clienteId,
  usuarioEmail,
  isAdmin,
}: {
  processoId: string
  clienteId: string
  usuarioEmail: string
  isAdmin: boolean
}) {
  const [anexos, setAnexos] = useState<Anexo[]>([])
  const [uploading, setUploading] = useState(false)

  async function carregarAnexos() {
    const res = await fetch(`/api/anexos/listar?processoId=${processoId}`)
    if (res.ok) {
      const data = await res.json()
      setAnexos(data)
    }
  }

  useEffect(() => {
    let ativo = true

    fetch(`/api/anexos/listar?processoId=${processoId}`)
      .then(async (res) => {
        if (!res.ok) return null
        return res.json() as Promise<Anexo[]>
      })
      .then((data) => {
        if (ativo && data) setAnexos(data)
      })

    return () => {
      ativo = false
    }
  }, [processoId])

  async function aoSelecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('processoId', processoId)
    formData.append('clienteId', clienteId)
    formData.append('enviadoPor', isAdmin ? 'Almani (Admin)' : usuarioEmail)

    try {
      const res = await fetch('/api/anexos/upload', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        await carregarAnexos()
      } else {
        const data = await res.json()
        alert('Erro: ' + data.error)
      }
    } catch {
      alert('Erro ao enviar arquivo')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function deletarAnexo(anexoId: string) {
    if (!confirm('Excluir este anexo?')) return

    try {
      const res = await fetch('/api/anexos/deletar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anexoId }),
      })

      if (res.ok) {
        await carregarAnexos()
      }
    } catch {
      alert('Erro ao excluir')
    }
  }

  function formatarTamanho(bytes: number) {
    if (!bytes) return ''
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  function formatarData(data: string) {
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-gray-700">Anexos</h4>
        <label className="cursor-pointer bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700">
          {uploading ? 'Enviando...' : '+ Adicionar arquivo'}
          <input
            type="file"
            className="hidden"
            onChange={aoSelecionarArquivo}
            disabled={uploading}
          />
        </label>
      </div>

      {anexos.length === 0 ? (
        <p className="text-xs text-gray-400 italic">Nenhum anexo neste processo.</p>
      ) : (
        <div className="space-y-2">
          {anexos.map((anexo) => (
            <div
              key={anexo.id}
              className="flex items-center justify-between bg-gray-50 rounded p-2 text-xs"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-gray-400">📎</span>
                <div className="min-w-0">
                  <a
                    href={anexo.url_arquivo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline truncate block"
                  >
                    {anexo.nome_arquivo}
                  </a>
                  <span className="text-gray-400">
                    {formatarTamanho(anexo.tamanho_bytes)} • {anexo.enviado_por} • {formatarData(anexo.criado_em)}
                  </span>
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={() => deletarAnexo(anexo.id)}
                  className="text-red-500 hover:text-red-700 ml-2"
                  title="Excluir anexo"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}