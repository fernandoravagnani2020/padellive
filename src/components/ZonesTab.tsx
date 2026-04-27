import { useEffect, useState } from 'react'
import { useTournamentStore } from '../store/tournament'

function scoreStr(score: any) {
  return (score as { set:number; p1:number; p2:number }[])?.map(s => `${s.p1}/${s.p2}`).join('  ') ?? ''
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 720)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 720)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return isMobile
}

// Badge de clasificación / eliminado
function PositionBadge({ position, isClassified, isEliminated }: {
  position: number; isClassified: boolean; isEliminated: boolean
}) {
  if (isClassified) {
    const tone = position === 1 ? { bg:'rgba(234,179,8,0.15)',  fg:'#a16207', br:'rgba(234,179,8,0.35)'  }
              : position === 2 ? { bg:'rgba(148,163,184,0.18)', fg:'#475569', br:'rgba(148,163,184,0.4)' }
              : { bg:'rgba(180,83,9,0.15)',     fg:'#b45309', br:'rgba(180,83,9,0.35)'     }
    return (
      <span style={{
        display:'inline-flex', alignItems:'center', gap:3,
        fontSize:9, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase',
        padding:'2px 6px', borderRadius:99,
        background: tone.bg, color: tone.fg, border: `1px solid ${tone.br}`,
      }}>
        ✓ Clasifica
      </span>
    )
  }
  if (isEliminated) {
    return (
      <span style={{
        display:'inline-flex', alignItems:'center', gap:3,
        fontSize:9, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase',
        padding:'2px 6px', borderRadius:99,
        background:'rgba(0,0,0,0.04)', color:'#999', border:'1px solid rgba(0,0,0,0.1)',
      }}>
        Eliminado
      </span>
    )
  }
  return null
}

export default function ZonesTab() {
  const isMobile = useIsMobile()
  const { zones, getZoneMatches, getZoneStandings, getPairName } = useTournamentStore()

  if (!zones.length) return (
    <div style={{ textAlign:'center', padding:'60px 0', color:'#ccc', fontSize:14 }}>Sin zonas cargadas.</div>
  )

  return (
    <div className="stagger" style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {zones.map(zone => {
        const standings = getZoneStandings(zone.id)
        const matches   = getZoneMatches(zone.id)
        const hasLive   = matches.some(m => m.status === 'live')

        // ¿Es zona-4? Tiene partidos R1 o R2
        const isZona4   = matches.some(m => m.round === 'group_r1' || m.round === 'group_r2')
        const classifiesCount = isZona4 ? 3 : Math.min(2, standings.length)

        // Separar fixture en R1 y R2 (si zona-4) o todos juntos (round-robin)
        const r1Matches = matches.filter(m => m.round === 'group_r1')
                                 .sort((a, b) => (a.match_order ?? 0) - (b.match_order ?? 0))
        const r2Matches = matches.filter(m => m.round === 'group_r2')
                                 .sort((a, b) => (a.match_order ?? 0) - (b.match_order ?? 0))
        const rrMatches = matches.filter(m => m.round === 'groups')

        return (
          <div key={zone.id} style={{
            background:'#fff',
            border: hasLive ? '1.5px solid rgba(22,163,74,0.35)' : '1px solid rgba(0,0,0,0.08)',
            borderRadius:14, overflow:'hidden',
            boxShadow: hasLive ? '0 2px 12px rgba(22,163,74,0.07)' : '0 1px 4px rgba(0,0,0,0.04)',
          }}>
            {/* Header zona */}
            <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderBottom:'1px solid rgba(0,0,0,0.06)', background: hasLive ? 'rgba(22,163,74,0.03)' : '#fafafa' }}>
              <div style={{ width:36, height:36, background: hasLive ? '#16a34a' : '#111', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Bebas Neue', sans-serif", fontSize:20, letterSpacing:'0.04em', color:'#fff', flexShrink:0 }}>
                {zone.name}
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:'#111' }}>Zona {zone.name}</div>
                <div style={{ fontSize:11, color:'#bbb' }}>
                  {standings.length} parejas{isZona4 ? ' · Formato R1/R2' : ''}
                </div>
              </div>
              {hasLive && (
                <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5, fontSize:10, fontWeight:700, letterSpacing:'0.08em', color:'#15803d', textTransform:'uppercase' }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:'#16a34a', display:'inline-block', animation:'pulse-dot 1.5s infinite' }} />
                  En juego
                </div>
              )}
            </div>

            {/* Tabla / cards de standings */}
            {isMobile ? (
              <div style={{ display:'grid', gap:8, padding:'12px 12px 0' }}>
                {standings.map((s, i) => {
                  const pos = s.position ?? (i + 1)
                  const classifies = pos <= classifiesCount
                  const eliminated = isZona4 && pos === 4
                  return (
                    <div key={s.pair_id} style={{
                      background: classifies ? '#f3faf5' : eliminated ? '#fafafa' : '#f9f9f9',
                      border: classifies ? '1px solid rgba(22,163,74,0.18)' : '1px solid rgba(0,0,0,0.06)',
                      borderRadius:10, padding:12,
                    }}>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'center' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, minWidth:0, flex:1 }}>
                          <span style={{
                            width:24, height:24, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:11, fontWeight:700, flexShrink:0,
                            background: classifies ? 'rgba(22,163,74,0.15)' : 'rgba(0,0,0,0.05)',
                            color: classifies ? '#15803d' : '#999',
                          }}>{pos}</span>
                          <div style={{ display:'flex', flexDirection:'column', gap:2, minWidth:0 }}>
                            <span style={{ fontWeight:700, color:'#111', fontSize:14, lineHeight:1.2 }}>{getPairName(s.pair_id)}</span>
                            <PositionBadge position={pos} isClassified={classifies} isEliminated={eliminated} />
                          </div>
                        </div>
                        <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:26, color:'#16a34a', letterSpacing:'0.03em', flexShrink:0 }}>{s.points}</span>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0, 1fr))', gap:6, marginTop:10 }}>
                        {[
                          ['PJ', s.played],
                          ['PG', s.won],
                          ['Sets', `${s.sets_won}-${s.sets_lost}`],
                          ['Games', `${s.games_won}-${s.games_lost}`],
                        ].map(([label, value]) => (
                          <div key={label as string} style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.06)', borderRadius:8, padding:'7px 6px', textAlign:'center' }}>
                            <div style={{ fontSize:9, color:'#999', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>{label}</div>
                            <div style={{ marginTop:3, fontSize:12, color:'#111', fontWeight:700 }}>{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
                {!standings.length && <div style={{ textAlign:'center', padding:'16px', color:'#ccc', fontSize:13 }}>Sin resultados aún</div>}
              </div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid rgba(0,0,0,0.06)' }}>
                      {['Pareja','PJ','PG','Sets','Games','Pts'].map((h, i) => (
                        <th key={h} style={{ padding:'8px 10px', textAlign: i===0 ? 'left' : 'center', fontSize:10, fontWeight:700, letterSpacing:'0.08em', color:'#bbb', textTransform:'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((s, i) => {
                      const pos = s.position ?? (i + 1)
                      const classifies = pos <= classifiesCount
                      const eliminated = isZona4 && pos === 4
                      return (
                        <tr key={s.pair_id} style={{
                          borderBottom:'1px solid rgba(0,0,0,0.04)',
                          background: classifies ? 'rgba(22,163,74,0.025)' : eliminated ? 'rgba(0,0,0,0.015)' : 'transparent',
                        }}>
                          <td style={{ padding:'11px 10px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <span style={{
                                width:20, height:20, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                                fontSize:11, fontWeight:700, flexShrink:0,
                                background: classifies ? 'rgba(22,163,74,0.15)' : 'rgba(0,0,0,0.05)',
                                color: classifies ? '#15803d' : '#999',
                              }}>{pos}</span>
                              <span style={{ fontWeight:600, color:'#111', fontSize:13 }}>{getPairName(s.pair_id)}</span>
                              <PositionBadge position={pos} isClassified={classifies} isEliminated={eliminated} />
                            </div>
                          </td>
                          {[s.played, s.won, `${s.sets_won}-${s.sets_lost}`, `${s.games_won}-${s.games_lost}`].map((v, j) => (
                            <td key={j} style={{ textAlign:'center', padding:'11px 8px', color:'#888', fontWeight:500 }}>{v}</td>
                          ))}
                          <td style={{ textAlign:'center', padding:'11px 10px' }}>
                            <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:20, color:'#16a34a', letterSpacing:'0.03em' }}>{s.points}</span>
                          </td>
                        </tr>
                      )
                    })}
                    {!standings.length && (
                      <tr><td colSpan={6} style={{ textAlign:'center', padding:'16px', color:'#ccc', fontSize:13 }}>Sin resultados aún</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Fixture */}
            {matches.length > 0 && (
              <div style={{ padding:'12px 14px 14px', borderTop:'1px solid rgba(0,0,0,0.05)' }}>
                {isZona4 ? (
                  <>
                    {/* R1 */}
                    {r1Matches.length > 0 && (
                      <>
                        <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'#3b82f6', textTransform:'uppercase', marginBottom:8 }}>
                          Ronda 1
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:14 }}>
                          {r1Matches.map(m => <MatchCard key={m.id} m={m} isMobile={isMobile} getPairName={getPairName} />)}
                        </div>
                      </>
                    )}
                    {/* R2 */}
                    {r2Matches.length > 0 && (
                      <>
                        <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'#9333ea', textTransform:'uppercase', marginBottom:8 }}>
                          Ronda 2 — Ganadores y Perdedores
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                          {r2Matches.map(m => (
                            <MatchCard key={m.id} m={m} isMobile={isMobile} getPairName={getPairName}
                              label={m.match_order === 3 ? 'Ganadores' : 'Perdedores'} />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'#bbb', textTransform:'uppercase', marginBottom:8 }}>Fixture</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                      {rrMatches.map(m => <MatchCard key={m.id} m={m} isMobile={isMobile} getPairName={getPairName} />)}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Card de partido ──────────────────────────────────────────
function MatchCard({ m, isMobile, getPairName, label }: {
  m: any
  isMobile: boolean
  getPairName: (id: string | null) => string
  label?: string
}) {
  const isLive = m.status === 'live'
  const isDone = m.status === 'done'
  const dateStr = m.day ? new Date(m.day + 'T00:00:00').toLocaleDateString('es-AR', { weekday:'short', day:'numeric', month:'short' }) : null
  const p1Name = m.pair1_id ? getPairName(m.pair1_id) : 'Por definir'
  const p2Name = m.pair2_id ? getPairName(m.pair2_id) : 'Por definir'
  const isTBD = !m.pair1_id || !m.pair2_id

  return (
    <div style={{
      display:'grid',
      gridTemplateColumns: isMobile ? '60px 1fr auto' : '72px 58px 1fr auto auto',
      alignItems:'center', gap:8,
      background: isLive ? 'rgba(22,163,74,0.05)' : isTBD ? 'rgba(147,51,234,0.03)' : 'rgba(0,0,0,0.02)',
      border: isLive ? '1px solid rgba(22,163,74,0.2)' : isTBD ? '1px dashed rgba(147,51,234,0.25)' : '1px solid rgba(0,0,0,0.06)',
      borderRadius:8, padding:'8px 11px',
    }}>
      <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
        {dateStr && <span style={{ fontSize:9, color:'#bbb', fontWeight:600, letterSpacing:'0.04em', textTransform:'uppercase', lineHeight:1 }}>{dateStr}</span>}
        <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:15, color:'#999', letterSpacing:'0.03em', lineHeight:1 }}>
          {m.scheduled_time?.slice(0,5) ?? '--:--'}
        </span>
      </div>
      {!isMobile && <span style={{ fontSize:11, color:'#bbb' }}>{m.court ?? ''}</span>}
      <span style={{ fontSize:13, fontWeight:500, color:'#111', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
        {label && (
          <span style={{ fontSize:9, fontWeight:700, color:'#9333ea', background:'rgba(147,51,234,0.08)', padding:'1px 5px', borderRadius:4, letterSpacing:'0.06em', textTransform:'uppercase' }}>
            {label}
          </span>
        )}
        <span>
          <span style={{ color: m.pair1_id ? '#111' : '#bbb', fontStyle: m.pair1_id ? 'normal' : 'italic' }}>{p1Name}</span>
          <span style={{ color:'#ccc', fontSize:11, margin:'0 6px' }}>vs</span>
          <span style={{ color: m.pair2_id ? '#111' : '#bbb', fontStyle: m.pair2_id ? 'normal' : 'italic' }}>{p2Name}</span>
        </span>
      </span>
      <div style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'flex-end' }}>
        <span style={{
          width:7, height:7, borderRadius:'50%', flexShrink:0,
          background: isLive ? '#16a34a' : isDone ? '#ccc' : '#e5e5e5',
          ...(isLive ? { animation:'pulse-dot 1.5s infinite' } : {}),
        }} />
        <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:14, letterSpacing:'0.03em', flexShrink:0, color: isLive ? '#16a34a' : isDone ? '#111' : '#bbb' }}>
          {m.status === 'upcoming' ? 'Próximo' : scoreStr(m.score)}
        </span>
      </div>
    </div>
  )
}
