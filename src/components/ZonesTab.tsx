import { useTournamentStore } from '../store/tournament'

function scoreStr(score: any) {
  return (score as { set:number; p1:number; p2:number }[])?.map(s => `${s.p1}/${s.p2}`).join('  ') ?? ''
}

export default function ZonesTab() {
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
                <div style={{ fontSize:11, color:'#bbb' }}>{standings.length} parejas</div>
              </div>
              {hasLive && (
                <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5, fontSize:10, fontWeight:700, letterSpacing:'0.08em', color:'#15803d', textTransform:'uppercase' }}>
                  <span style={{ width:6, height:6, borderRadius:'50%', background:'#16a34a', display:'inline-block', animation:'pulse-dot 1.5s infinite' }} />
                  En juego
                </div>
              )}
            </div>

            {/* Tabla */}
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
                  {standings.map((s, i) => (
                    <tr key={s.pair_id} style={{ borderBottom:'1px solid rgba(0,0,0,0.04)' }}>
                      <td style={{ padding:'11px 10px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{
                            width:20, height:20, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:11, fontWeight:700, flexShrink:0,
                            background: i===0 ? 'rgba(22,163,74,0.12)' : 'rgba(0,0,0,0.05)',
                            color: i===0 ? '#15803d' : '#999',
                          }}>{i+1}</span>
                          <span style={{ fontWeight:600, color:'#111', fontSize:13 }}>{getPairName(s.pair_id)}</span>
                        </div>
                      </td>
                      {[s.played, s.won, `${s.sets_won}-${s.sets_lost}`, `${s.games_won}-${s.games_lost}`].map((v, j) => (
                        <td key={j} style={{ textAlign:'center', padding:'11px 8px', color:'#888', fontWeight:500 }}>{v}</td>
                      ))}
                      <td style={{ textAlign:'center', padding:'11px 10px' }}>
                        <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:20, color:'#16a34a', letterSpacing:'0.03em' }}>{s.points}</span>
                      </td>
                    </tr>
                  ))}
                  {!standings.length && (
                    <tr><td colSpan={6} style={{ textAlign:'center', padding:'16px', color:'#ccc', fontSize:13 }}>Sin resultados aún</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Fixture */}
            {matches.length > 0 && (
              <div style={{ padding:'12px 14px 14px', borderTop:'1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'#bbb', textTransform:'uppercase', marginBottom:8 }}>Fixture</div>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {matches.map(m => {
                    const isLive = m.status === 'live'
                    const isDone = m.status === 'done'
                    const dateStr = m.day ? new Date(m.day + 'T00:00:00').toLocaleDateString('es-AR', { weekday:'short', day:'numeric', month:'short' }) : null
                    return (
                      <div key={m.id} style={{
                        display:'grid', gridTemplateColumns:'72px 58px 1fr auto auto',
                        alignItems:'center', gap:8,
                        background: isLive ? 'rgba(22,163,74,0.05)' : 'rgba(0,0,0,0.02)',
                        border: isLive ? '1px solid rgba(22,163,74,0.2)' : '1px solid rgba(0,0,0,0.06)',
                        borderRadius:8, padding:'8px 11px',
                      }}>
                        <div style={{ display:'flex', flexDirection:'column', gap:1 }}>
                          {dateStr && <span style={{ fontSize:9, color:'#bbb', fontWeight:600, letterSpacing:'0.04em', textTransform:'uppercase', lineHeight:1 }}>{dateStr}</span>}
                          <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:15, color:'#999', letterSpacing:'0.03em', lineHeight:1 }}>
                            {m.scheduled_time?.slice(0,5) ?? '--:--'}
                          </span>
                        </div>
                        <span style={{ fontSize:11, color:'#bbb' }}>{m.court ?? ''}</span>
                        <span style={{ fontSize:13, fontWeight:500, color:'#111' }}>
                          {getPairName(m.pair1_id)} <span style={{ color:'#ccc', fontSize:11 }}>vs</span> {getPairName(m.pair2_id)}
                        </span>
                        <span style={{ width:7, height:7, borderRadius:'50%', flexShrink:0, background: isLive ? '#16a34a' : isDone ? '#ccc' : '#e5e5e5', ...(isLive ? { animation:'pulse-dot 1.5s infinite' } : {}) }} />
                        <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:14, letterSpacing:'0.03em', flexShrink:0, color: isLive ? '#16a34a' : isDone ? '#111' : '#bbb' }}>
                          {m.status === 'upcoming' ? 'Próximo' : scoreStr(m.score)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
