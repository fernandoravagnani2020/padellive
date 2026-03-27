// ─── ScheduleTab ─────────────────────────────────────────
import { useTournamentStore } from '../store/tournament'

export function ScheduleTab() {
  const { matches, zones, getPairName } = useTournamentStore()
  const days = [...new Set(matches.map(m => m.day).filter(Boolean))]

  if (!matches.length) return (
    <div style={{ textAlign:'center', padding:'60px 0', color:'#ccc', fontSize:14 }}>Sin horarios programados.</div>
  )

  function displayDate(d: string | null) {
    if (!d) return ''
    try {
      const [y, m, day] = d.split('-').map(Number)
      return new Date(y, m-1, day).toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long' })
    } catch { return d }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      {days.map(day => (
        <div key={day}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.12em', color:'#bbb', textTransform:'uppercase', marginBottom:10 }}>
            {displayDate(day)}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {matches
              .filter(m => m.day === day)
              .sort((a,b) => (a.scheduled_time??'').localeCompare(b.scheduled_time??''))
              .map(m => {
                const zone = zones.find(z => z.id === m.zone_id)
                const isLive = m.status === 'live'
                const isDone = m.status === 'done'
                return (
                  <div key={m.id} style={{
                    display:'grid', gridTemplateColumns:'48px 52px 1fr auto',
                    alignItems:'center', gap:10, padding:'12px 14px', borderRadius:10,
                    background: isLive ? 'rgba(22,163,74,0.04)' : isDone ? 'rgba(0,0,0,0.02)' : '#fff',
                    border: isLive ? '1px solid rgba(22,163,74,0.25)' : isDone ? '1px solid rgba(0,0,0,0.05)' : '1px solid rgba(0,0,0,0.08)',
                    opacity: isDone ? 0.7 : 1,
                  }}>
                    <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:17, color:'#111', letterSpacing:'0.03em' }}>
                      {m.scheduled_time?.slice(0,5)}
                    </span>
                    <span style={{ fontSize:11, color:'#bbb' }}>{m.court}</span>
                    <div>
                      <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', color:'#bbb', textTransform:'uppercase', marginBottom:2 }}>
                        {zone ? `Zona ${zone.name}` : m.round?.toUpperCase()}
                      </div>
                      <div style={{ fontSize:13, fontWeight:500, color:'#111' }}>
                        {getPairName(m.pair1_id)} <span style={{ color:'#ccc' }}>vs</span> {getPairName(m.pair2_id)}
                      </div>
                    </div>
                    <div>
                      {isLive && (
                        <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:10, fontWeight:700, letterSpacing:'0.07em', padding:'3px 9px', borderRadius:99, background:'rgba(22,163,74,0.1)', color:'#15803d', border:'1px solid rgba(22,163,74,0.25)', textTransform:'uppercase' }}>
                          <span style={{ width:5, height:5, borderRadius:'50%', background:'#16a34a', display:'inline-block', animation:'pulse-dot 1.5s infinite' }} />
                          En juego
                        </span>
                      )}
                      {isDone && (
                        <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.07em', padding:'3px 9px', borderRadius:99, background:'rgba(0,0,0,0.05)', color:'#bbb', border:'1px solid rgba(0,0,0,0.08)', textTransform:'uppercase' }}>
                          Finalizado
                        </span>
                      )}
                      {!isLive && !isDone && (
                        <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.07em', padding:'3px 9px', borderRadius:99, background:'rgba(0,0,0,0.04)', color:'#999', border:'1px solid rgba(0,0,0,0.07)', textTransform:'uppercase' }}>
                          Próximo
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── ResultsTab ──────────────────────────────────────────
export function ResultsTab() {
  const { matches, zones, getPairName } = useTournamentStore()
  const done = matches.filter(m => m.status === 'done')

  if (!done.length) return (
    <div style={{ textAlign:'center', padding:'60px 0', color:'#ccc', fontSize:14 }}>Sin resultados cargados aún.</div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {done.map(m => {
        const score  = (m.score ?? []) as { set:number; p1:number; p2:number }[]
        const p1Sets = score.filter(s => s.p1 > s.p2).length
        const p2Sets = score.filter(s => s.p2 > s.p1).length
        const p1Wins = p1Sets > p2Sets
        const zone   = zones.find(z => z.id === m.zone_id)

        function displayDate(d: string | null) {
          if (!d) return ''
          try {
            const [y, mo, day] = d.split('-').map(Number)
            return new Date(y, mo-1, day).toLocaleDateString('es-AR', { day:'numeric', month:'short' })
          } catch { return d }
        }

        return (
          <div key={m.id} style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:12, padding:'14px 16px', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#bbb', marginBottom:10 }}>
              <span>{zone ? `Zona ${zone.name}` : m.round} · {displayDate(m.day)} {m.scheduled_time?.slice(0,5)}</span>
              <span>{m.court}</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:10, alignItems:'center' }}>
              <div style={{ color: p1Wins ? '#15803d' : '#111' }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{getPairName(m.pair1_id)}</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ display:'flex', gap:5, justifyContent:'center', marginBottom:4 }}>
                  {score.map((s, i) => (
                    <span key={i} style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:16, letterSpacing:'0.02em', padding:'2px 8px', borderRadius:6, fontWeight:400, background: s.p1 > s.p2 ? 'rgba(22,163,74,0.1)' : 'rgba(0,0,0,0.05)', color: s.p1 > s.p2 ? '#15803d' : '#888' }}>
                      {s.p1}/{s.p2}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize:10, color:'#ccc', fontWeight:600 }}>{p1Sets}—{p2Sets} sets</div>
              </div>
              <div style={{ textAlign:'right', color: !p1Wins ? '#15803d' : '#111' }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{getPairName(m.pair2_id)}</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── BracketTab ──────────────────────────────────────────

const ROUND_ORDER = ['roundof16', 'quarters', 'semis', 'final']
const ROUND_LABELS: Record<string, string> = {
  roundof16: 'Octavos de final',
  quarters:  'Cuartos de final',
  semis:     'Semifinales',
  final:     'Final',
}

// Altura fija por match card en px — debe coincidir con el CSS
const MATCH_H = 100   // altura base para cálculos de posición y conectores
const MATCH_GAP = 20  // gap entre cards
const COL_W = 210
const CONN_W = 40

function formatDate(d: string | null) {
  if (!d) return ''
  try {
    const [y, mo, day] = d.split('-').map(Number)
    return new Date(y, mo - 1, day).toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' })
  } catch { return d }
}

interface BracketMatchCardProps {
  m: {
    id: string
    pair1_id: string | null
    pair2_id: string | null
    winner_pair_id: string | null
    status: string
    score: any
    day: string | null
    scheduled_time: string | null
    court: string | null
  }
  getPairName: (id: string) => string
}

function BracketMatchCard({ m, getPairName }: BracketMatchCardProps) {
  const score  = m.score as { set: number; p1: number; p2: number }[] | null
  const p1Sets = score?.filter(s => s.p1 > s.p2).length ?? 0
  const p2Sets = score?.filter(s => s.p2 > s.p1).length ?? 0
  const isLive = m.status === 'live'
  const isDone = m.status === 'done'
  const rows   = [{ pairId: m.pair1_id, sets: p1Sets }, { pairId: m.pair2_id, sets: p2Sets }]
  const cardH  = isDone && score?.length ? MATCH_H + 18 : MATCH_H

  return (
    <div style={{
      height: `${cardH}px`, borderRadius: 10, overflow: 'hidden',
      border: isLive ? '1.5px solid rgba(22,163,74,0.4)' : isDone ? '1px solid rgba(0,0,0,0.09)' : '1px solid rgba(0,0,0,0.08)',
      background: isLive ? 'rgba(22,163,74,0.03)' : isDone ? '#fafafa' : '#fff',
      boxShadow: isLive ? '0 2px 10px rgba(22,163,74,0.08)' : '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      {/* Strip: score o horario */}
      <div style={{
        padding: '3px 10px', borderBottom: '1px solid rgba(0,0,0,0.06)',
        fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
        background: isLive ? 'rgba(22,163,74,0.07)' : 'rgba(0,0,0,0.02)',
        color: isLive ? '#15803d' : '#bbb',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {isLive ? (
          <>
            <span style={{ width:5, height:5, borderRadius:'50%', background:'#16a34a', animation:'pulse-dot 1.5s infinite', display:'inline-block' }} />
            EN JUEGO
          </>
        ) : isDone && score?.length ? (
          <>
            <span style={{ color:'#ccc', marginRight:2 }}>Sets:</span>
            {score.map((s, i) => (
              <span key={i} style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:11, padding:'1px 6px', borderRadius:4, background: s.p1>s.p2 ? 'rgba(22,163,74,0.12)' : 'rgba(0,0,0,0.06)', color: s.p1>s.p2 ? '#15803d' : '#999' }}>
                {s.p1}/{s.p2}
              </span>
            ))}
          </>
        ) : m.day ? (
          <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {formatDate(m.day)} {m.scheduled_time?.slice(0,5) ?? ''} · {m.court ?? ''}
          </span>
        ) : (
          <span>Sin programar</span>
        )}
      </div>

      {/* Parejas */}
      {rows.map((row, i) => {
        const isWinner = isDone && m.winner_pair_id === row.pairId
        const isLoser  = isDone && m.winner_pair_id && m.winner_pair_id !== row.pairId
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px',
            height: 38,
            borderBottom: i === 0 ? '1px solid rgba(0,0,0,0.05)' : 'none',
            background: isWinner ? 'rgba(22,163,74,0.05)' : 'transparent',
          }}>
            <div style={{ width:3, height:16, borderRadius:2, flexShrink:0, background: isWinner ? '#16a34a' : 'transparent' }} />
            <span style={{ flex:1, fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color: isWinner ? '#15803d' : isLoser ? '#ccc' : row.pairId ? '#111' : '#ccc', fontStyle: row.pairId ? 'normal' : 'italic' }}>
              {row.pairId ? getPairName(row.pairId) : 'Por definir'}
            </span>
            {isDone && row.pairId && (
              <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:20, flexShrink:0, color: isWinner ? '#16a34a' : '#ccc' }}>
                {row.sets}
              </span>
            )}
            {isLive && row.pairId && (
              <span style={{ fontSize:10, color:'#16a34a', animation:'pulse-dot 1.5s infinite', flexShrink:0 }}>●</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
// ConnectorCol — dibuja líneas SVG respetando el ruteo winner_goes_to_match/slot
function ConnectorCol({
  matchesInRound, matchesInNext, routing = [], nextCount,
}: {
  matchesInRound: number
  matchesInNext: number
  routing?: { toMatch: number | null; toSlot: number | null }[]
  nextCount: number
}) {
  function colHeight(n: number) { return n * MATCH_H + (n - 1) * MATCH_GAP }
  function matchCenterCurrent(idx: number) { return idx * (MATCH_H + MATCH_GAP) + MATCH_H / 2 }
  function matchCenterNext(order: number) { return (order - 1) * (MATCH_H + MATCH_GAP) + MATCH_H / 2 }

  const totalH = Math.max(colHeight(matchesInRound), colHeight(matchesInNext), 1)
  const stroke = 'rgba(0,0,0,0.12)'
  const sw = 1.5
  const xMid = CONN_W / 2

  // Fallback: si no hay ruteo configurado, conectar en pares simples (clásico)
  const safeRouting = Array.from({ length: matchesInRound }, (_, i) => {
    const r = routing[i]
    if (r?.toMatch) return r
    // Fallback clásico: 1→1, 2→1, 3→2, 4→2...
    return { toMatch: Math.ceil((i + 1) / 2), toSlot: (i % 2 === 0 ? 1 : 2) as 1|2 }
  })

  return (
    <svg
      width={CONN_W}
      height={totalH}
      viewBox={`0 0 ${CONN_W} ${totalH}`}
      className="flex-shrink-0 overflow-visible"
      style={{ alignSelf: 'flex-start', marginTop: '34px' }}
    >
      {safeRouting.map((r, i) => {
        const y1 = matchCenterCurrent(i)
        if (!r.toMatch) {
          return <line key={i} x1={0} y1={y1} x2={CONN_W} y2={y1} stroke={stroke} strokeWidth={sw} strokeDasharray="3 3" />
        }
        const y2 = matchCenterNext(r.toMatch)
        return (
          <g key={i}>
            <line x1={0} y1={y1} x2={xMid} y2={y1} stroke={stroke} strokeWidth={sw} />
            {y1 !== y2 && (
              <line x1={xMid} y1={y1} x2={xMid} y2={y2} stroke={stroke} strokeWidth={sw} />
            )}
            <line x1={xMid} y1={y2} x2={CONN_W} y2={y2} stroke={stroke} strokeWidth={sw} />
            <circle cx={CONN_W} cy={y2} r={2} fill={stroke} />
          </g>
        )
      })}
    </svg>
  )
}

// ── BracketCanvas — posicionamiento por slots fijos ──────
// Cada ronda tiene un "slot height" que es el doble del de la ronda anterior.
// Esto garantiza que los partidos se centren correctamente sin importar la estructura.

function BracketCanvas({
  presentRounds, elimMatches, getPairName, champion,
}: {
  presentRounds: string[]
  elimMatches: any[]
  getPairName: (id: string) => string
  champion: string | null
}) {
  if (!presentRounds.length) return null

  const SLOT_H = MATCH_H + MATCH_GAP   // altura de un slot en la primera ronda
  const HEADER_H = 36

  // Para cada ronda, calcular cuántos slots del round 0 ocupa cada partido
  // Esto depende del índice de la ronda DENTRO de las presentRounds
  // Round 0: 1 slot por partido
  // Round 1: 2 slots por partido
  // Round 2: 4 slots por partido
  // etc.

  // Pero para cuadros mixtos (4 octavos + 4 cuartos) necesitamos saber
  // cuántos partidos tiene la ronda más numerosa para definir el slot base
  const maxMatches = Math.max(...presentRounds.map(r => elimMatches.filter(m => m.round === r).length))

  // La altura total en slots = maxMatches
  const totalBodyH = maxMatches * SLOT_H - MATCH_GAP

  // Para cada ronda, calcular el "slot size" — cuántos slots ocupa cada partido
  // Se calcula en base a cuántos partidos hay en esa ronda vs la máxima
  function getSlotSize(roundMatchCount: number): number {
    return maxMatches / roundMatchCount
  }

  // Centro vertical de un partido en una ronda dada
  function getMatchTop(matchIdx: number, slotSize: number): number {
    return matchIdx * slotSize * SLOT_H + (slotSize * SLOT_H - MATCH_H) / 2
  }

  const totalW = presentRounds.length * COL_W + (presentRounds.length - 1) * CONN_W + 130

  return (
    <div style={{ position: 'relative', width: `${totalW}px`, height: `${totalBodyH + HEADER_H + 20}px` }}>

      {/* SVG conectores */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
        {presentRounds.map((round, colIdx) => {
          if (colIdx === presentRounds.length - 1) return null

          const rMatches = elimMatches.filter(m => m.round === round).sort((a,b) => (a.match_order??0)-(b.match_order??0))
          const nextRoundMatches = elimMatches.filter(m => m.round === presentRounds[colIdx+1]).sort((a,b) => (a.match_order??0)-(b.match_order??0))

          const slotSize    = getSlotSize(rMatches.length)
          const nextSlotSize = getSlotSize(nextRoundMatches.length)

          const colX = colIdx * (COL_W + CONN_W)
          const stroke = 'rgba(0,0,0,0.15)'
          const strokeDone = 'rgba(22,163,74,0.5)'
          const sw = 1.5

          return rMatches.map((m, i) => {
            const cardTop = HEADER_H + getMatchTop(i, slotSize)
            const y1 = cardTop + MATCH_H / 2
            const xStart = colX + COL_W

            // Destino
            const toMatchOrder = (m.winner_goes_to_match as number | null) ?? Math.ceil((i + 1) / 2)
            const destIdx = toMatchOrder - 1
            const destCardTop = HEADER_H + getMatchTop(destIdx, nextSlotSize)
            const y2 = destCardTop + MATCH_H / 2
            const xEnd = colX + COL_W + CONN_W
            const xMid = xStart + CONN_W / 2

            const lineColor = m.winner_pair_id ? strokeDone : stroke

            return (
              <g key={m.id}>
                <line x1={xStart} y1={y1} x2={xMid}  y2={y1} stroke={lineColor} strokeWidth={sw} />
                {Math.abs(y1 - y2) > 1 && (
                  <line x1={xMid} y1={y1} x2={xMid}  y2={y2} stroke={lineColor} strokeWidth={sw} />
                )}
                <line x1={xMid}  y1={y2} x2={xEnd}  y2={y2} stroke={lineColor} strokeWidth={sw} />
                <circle cx={xEnd} cy={y2} r={3} fill={lineColor} />
              </g>
            )
          })
        })}
      </svg>

      {/* Columnas */}
      {presentRounds.map((round, colIdx) => {
        const rMatches = elimMatches.filter(m => m.round === round).sort((a,b) => (a.match_order??0)-(b.match_order??0))
        const slotSize = getSlotSize(rMatches.length)
        const colX = colIdx * (COL_W + CONN_W)

        return (
          <div key={round} style={{ position: 'absolute', left: `${colX}px`, top: 0, width: `${COL_W}px` }}>
            {/* Header */}
            <div
              className={`text-center border-b ${round === 'final' ? 'border-green-200' : 'border-gray-200'}`}
              style={{ height: `${HEADER_H}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <span className={`text-[11px] font-extrabold tracking-widest uppercase ${round === 'final' ? 'text-green-700' : 'text-gray-400'}`}>
                {ROUND_LABELS[round]}
              </span>
            </div>

            {/* Cards */}
            {rMatches.map((m, i) => (
              <div
                key={m.id}
                style={{
                  position: 'absolute',
                  top: `${HEADER_H + getMatchTop(i, slotSize)}px`,
                  left: 0,
                  width: `${COL_W}px`,
                }}
              >
                <BracketMatchCard m={m as any} getPairName={getPairName} />
              </div>
            ))}
          </div>
        )
      })}

      {/* Trofeo */}
      <div style={{
        position: 'absolute',
        left: `${presentRounds.length * (COL_W + CONN_W)}px`,
        top: `${HEADER_H + (totalBodyH - 90) / 2}px`,
        width: '110px',
      }}>
        <div style={{ borderRadius:12, border: champion ? '1px solid rgba(22,163,74,0.3)' : '1px solid rgba(0,0,0,0.08)', padding:'14px 12px', textAlign:'center', background: champion ? 'rgba(22,163,74,0.05)' : '#fafafa' }}>
          <div style={{ fontSize:32, marginBottom:6, opacity: champion ? 1 : 0.3 }}>🏆</div>
          {champion ? (
            <div style={{ fontSize:11, fontWeight:700, color:'#15803d', lineHeight:1.3 }}>
              {champion.split(' / ').map((n, i) => <div key={i}>{n}</div>)}
            </div>
          ) : (
            <div style={{ fontSize:10, color:'#ccc', fontWeight:600 }}>Por definir</div>
          )}
        </div>
      </div>

    </div>
  )
}

export function BracketTab() {
  const { matches, getPairName } = useTournamentStore()

  const elimMatches  = matches.filter(m => ROUND_ORDER.includes(m.round as string))
  const presentRounds = ROUND_ORDER.filter(r => elimMatches.some(m => m.round === r))

  if (!elimMatches.length) {
    return (
      <div style={{ textAlign:'center', padding:'60px 0', color:'#ccc' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>🏆</div>
        <p style={{ fontSize:14, color:'#aaa', fontWeight:600 }}>El cuadro eliminatorio aún no fue generado.</p>
        <p style={{ fontSize:12, color:'#bbb', marginTop:6 }}>El organizador lo publica al finalizar la fase de grupos.</p>
      </div>
    )
  }

  const finalMatch = elimMatches.find(m => m.round === 'final')
  const champion   = finalMatch?.winner_pair_id ? getPairName(finalMatch.winner_pair_id) : null

  return (
    <div>
      {/* Banner campeón */}
      {champion && (
        <div style={{ display:'flex', alignItems:'center', gap:12, background:'rgba(22,163,74,0.07)', border:'1px solid rgba(22,163,74,0.2)', borderRadius:14, padding:'14px 18px', marginBottom:20 }}>
          <span style={{ fontSize:32 }}>🏆</span>
          <div>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'#15803d', textTransform:'uppercase', marginBottom:2 }}>Campeón</div>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:24, letterSpacing:'0.03em', color:'#15803d' }}>{champion}</div>
          </div>
        </div>
      )}

      {/* Bracket scrollable */}
      <div style={{ overflowX:'auto', margin:'0 -16px', padding:'0 16px 24px' }}>
        <BracketCanvas presentRounds={presentRounds} elimMatches={elimMatches} getPairName={getPairName} champion={champion} />
      </div>

      {/* Leyenda */}
      <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap', marginTop:8 }}>
        {[
          { color:'#16a34a', label:'Ganador / Clasificado' },
          { color:'#16a34a', label:'En juego', pulse:true },
          { color:'rgba(0,0,0,0.15)', label:'Programado' },
          { color:'rgba(0,0,0,0.07)', label:'Por definir' },
        ].map(item => (
          <div key={item.label} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:item.color, flexShrink:0, ...(item.pulse ? { animation:'pulse-dot 1.5s infinite' } : {}) }} />
            <span style={{ fontSize:11, color:'#bbb' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function InfoTab() {
  const { currentTournament } = useTournamentStore()
  const t = currentTournament

  if (!t) return null

  const prize = t.prize_pool as any

  function displayDate(d: string | null) {
    if (!d) return '—'
    try { return new Date(d + 'T00:00:00').toLocaleDateString('es-AR', { day:'numeric', month:'short', year:'numeric' }) }
    catch { return d }
  }

  return (
    <div>
      {/* Stats grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:10, marginBottom:20 }}>
        {[
          { label:'Categoría', value: t.category },
          { label:'Parejas',   value: t.pairs_count },
          { label:'Canchas',   value: t.courts_count },
          { label:'Inicio',    value: displayDate(t.start_date) },
          { label:'Final',     value: displayDate(t.end_date) },
          { label:'Estado',    value: t.status === 'live' ? '🟢 En vivo' : t.status === 'finished' ? 'Finalizado' : 'Próximo' },
        ].map(item => (
          <div key={item.label} style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:10, padding:'12px 14px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.09em', color:'#bbb', textTransform:'uppercase', marginBottom:5 }}>{item.label}</div>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:20, letterSpacing:'0.03em', color:'#111' }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Premios */}
      {prize && (prize.first || prize.second || prize.third) && (
        <div style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:12, overflow:'hidden', marginBottom:16, boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
          {[
            { pos:'🥇', label:'Campeones',    sub:'Trofeo + indumentaria',    amount: prize.first  },
            { pos:'🥈', label:'Finalistas',   sub:'Trofeo + voucher tienda',  amount: prize.second },
            { pos:'🥉', label:'Semifinalistas',sub:'Medallas',                amount: prize.third  },
          ].filter(r => r.amount > 0).map((row, i, arr) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderBottom: i < arr.length-1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
              <span style={{ fontSize:28 }}>{row.pos}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:15 }}>{row.label}</div>
                <div style={{ fontSize:12, color:'#bbb', marginTop:1 }}>{row.sub}</div>
              </div>
              <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:28, letterSpacing:'0.02em', color:'#16a34a' }}>
                ${(row.amount / 1000).toFixed(0)}k
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reglamento */}
      {t.rules && (
        <div style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:12, padding:'16px 18px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'#bbb', textTransform:'uppercase', marginBottom:10 }}>Reglamento</div>
          <p style={{ fontSize:14, color:'#555', lineHeight:1.7 }}>{t.rules}</p>
        </div>
      )}
    </div>
  )
}
