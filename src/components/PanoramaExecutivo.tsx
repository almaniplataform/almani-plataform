'use client'

import { useMemo, useState } from 'react'

type Processo = {
  id: string
  status: string
  uf: string | null
  tipo_servico: string | null
  created_at: string
}

// Paleta institucional: navy profundo + dourado envelhecido, tons neutros de apoio
const NAVY = '#0B2545'
const NAVY_LIGHT = '#2C5282'
const GOLD = '#B08D2B'
const GRAPHITE = '#4A5568'
const BURGUNDY = '#7A2E2E'

const CORES_STATUS: Record<string, string> = {
  'Em andamento': GOLD,
  'Em Andamento': GOLD,
  'Concluído': NAVY,
  'Concluido': NAVY,
  'Aguardando documento': BURGUNDY,
  'Pausado': GRAPHITE,
}

// Escala monocromática (navy -> grafite) para rankings, com dourado só de acento
const CORES_PALETA = [NAVY, NAVY_LIGHT, '#5B7A99', GRAPHITE, '#8895A7', '#B3BAC5', GOLD, '#9C7A2E']

export default function PanoramaExecutivo({ processos }: { processos: Processo[] }) {
  const [aberto, setAberto] = useState(false)

  const dados = useMemo(() => {
    const total = processos.length

    const statusMap: Record<string, number> = {}
    processos.forEach((p) => {
      const s = p.status || 'Sem status'
      statusMap[s] = (statusMap[s] || 0) + 1
    })
    const statusList = Object.entries(statusMap)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor)

    const ufMap: Record<string, number> = {}
    processos.forEach((p) => {
      const u = p.uf || 'Sem UF'
      ufMap[u] = (ufMap[u] || 0) + 1
    })
    const ufList = Object.entries(ufMap)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor)

    const servMap: Record<string, number> = {}
    processos.forEach((p) => {
      const t = p.tipo_servico || 'Sem serviço'
      servMap[t] = (servMap[t] || 0) + 1
    })
    const servList = Object.entries(servMap)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor)

    let insight = 'Nenhum processo cadastrado ainda.'
    if (total > 0) {
      const topUf = ufList[0]
      const topServ = servList[0]
      const pctUf = Math.round((topUf.valor / total) * 100)
      const pctServ = Math.round((topServ.valor / total) * 100)
      insight = `${topUf.nome} concentra ${pctUf}% da carteira, enquanto ${topServ.nome} representa ${pctServ}% dos serviços.`
    }

    return { total, statusList, ufList, servList, insight }
  }, [processos])

  const statusPrincipal = dados.statusList[0]
  const pctPrincipal = statusPrincipal
    ? Math.round((statusPrincipal.valor / dados.total) * 100)
    : 0
  const circunferencia = 2 * Math.PI * 45 // raio 45
  const concluidos = dados.statusList.find(s => /conclu/i.test(s.nome))?.valor ?? 0

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-2 text-white font-semibold px-5 py-2.5 rounded-lg shadow-md transition-colors"
        style={{ background: NAVY }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#081A33')}
        onMouseLeave={(e) => (e.currentTarget.style.background = NAVY)}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Panorama Executivo
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setAberto(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold" style={{ color: NAVY }}>Panorama Executivo</h2>
                <p className="text-sm text-gray-500">Visão geral dos seus processos</p>
              </div>
              <button
                onClick={() => setAberto(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 text-center border border-gray-200 border-l-4" style={{ borderLeftColor: NAVY }}>
                <p className="text-3xl font-bold" style={{ color: NAVY }}>{dados.total}</p>
                <p className="text-sm text-gray-500 font-medium">Processos no total</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border border-gray-200 border-l-4" style={{ borderLeftColor: GOLD }}>
                <p className="text-3xl font-bold" style={{ color: GOLD }}>{dados.statusList[0]?.valor ?? 0}</p>
                <p className="text-sm text-gray-500 font-medium">{dados.statusList[0]?.nome ?? 'Em andamento'}</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center border border-gray-200 border-l-4" style={{ borderLeftColor: GRAPHITE }}>
                <p className="text-3xl font-bold" style={{ color: GRAPHITE }}>{concluidos}</p>
                <p className="text-sm text-gray-500 font-medium">Concluídos</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <h3 className="font-semibold mb-4" style={{ color: NAVY }}>Status dos Processos</h3>
                <div className="flex items-center gap-4">
                  <div className="relative w-32 h-32">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                      <circle
                        cx="50" cy="50" r="45" fill="none"
                        stroke={CORES_STATUS[dados.statusList[0]?.nome] || NAVY}
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={`${(pctPrincipal / 100) * circunferencia} ${circunferencia}`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold" style={{ color: NAVY }}>{pctPrincipal}%</span>
                      <span className="text-xs text-gray-500 text-center px-2">{dados.statusList[0]?.nome}</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    {dados.statusList.map((s, i) => (
                      <div key={s.nome} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ background: CORES_STATUS[s.nome] || CORES_PALETA[i % CORES_PALETA.length] }} />
                          {s.nome}
                        </span>
                        <span className="font-semibold text-gray-700">{s.valor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <h3 className="font-semibold mb-4" style={{ color: NAVY }}>Processos por UF</h3>
                {dados.ufList.length === 0 ? (
                  <p className="text-sm text-gray-400">Sem dados.</p>
                ) : (
                  <div className="space-y-3">
                    {dados.ufList.map((u, i) => {
                      const pct = Math.round((u.valor / dados.total) * 100)
                      return (
                        <div key={u.nome}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-medium text-gray-700">{u.nome}</span>
                            <span className="text-gray-500">{u.valor} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full"
                              style={{ width: `${pct}%`, background: CORES_PALETA[i % CORES_PALETA.length] }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <h3 className="font-semibold mb-4" style={{ color: NAVY }}>Tipo de Serviço</h3>
                {dados.servList.length === 0 ? (
                  <p className="text-sm text-gray-400">Sem dados.</p>
                ) : (
                  <div className="space-y-3">
                    {dados.servList.map((s, i) => {
                      const pct = Math.round((s.valor / dados.total) * 100)
                      return (
                        <div key={s.nome}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="font-medium text-gray-700">{s.nome}</span>
                            <span className="text-gray-500">{s.valor} ({pct}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full"
                              style={{ width: `${pct}%`, background: CORES_PALETA[i % CORES_PALETA.length] }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${NAVY}, #061A33)` }}>
                <h3 className="font-semibold mb-2 text-xs uppercase tracking-wider" style={{ color: GOLD }}>Insight</h3>
                <p className="text-sm leading-relaxed">{dados.insight}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
