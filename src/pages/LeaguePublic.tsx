import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { League, Team, Standing, Round, LeagueMatch } from '../store/league-types'

// ── Helpers ──────────────────────────────────────────────
function displayDate(d: string | null) {
  if (!d) return ''
  try {
    const [y, m, day] = d.split('-').map(Number)
    return new Date(y, m-1, day).toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long' })
  } catch { return d }
}

// ── Tabla de posiciones ───────────────────────────────────
function StandingsTable({ standings, teams }: { standings: Standing[]; teams: Team[] }) {
  const getTeam = (id: string) => teams.find(t => t.id === id)

  const sorted = [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    const diffA = a.sets_won - a.sets_lost
    const diffB = b.sets_won - b.sets_lost
    if (diffB !== diffA) return diffB - diffA
    const gdA = a.games_won - a.games_lost
    const gdB = b.games_won - b.games_lost
    return gdB - gdA
  })

  return (
    <div style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:'#0a0a0a', color:'#fff' }}>
              {['#','Equipo','Pts','PJ','PG','PP','Sets','Games','GF'].map((h, i) => (
                <th key={h} style={{ padding:'10px 12px', textAlign: i <= 1 ? 'left' : 'center', fontSize:10, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => {
              const team = getTeam(s.team_id)
              const setDiff = s.sets_won - s.sets_lost
              const gameDiff = s.games_won - s.games_lost
              const isTop3 = i < 3
              return (
                <tr key={s.team_id} style={{ borderBottom:'1px solid rgba(0,0,0,0.05)', background: i === 0 ? 'rgba(22,163,74,0.03)' : 'transparent' }}>
                  <td style={{ padding:'12px 12px', textAlign:'center' }}>
                    <span style={{
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                      width:22, height:22, borderRadius:'50%', fontSize:11, fontWeight:700,
                      background: i===0 ? 'rgba(22,163,74,0.15)' : i===1 ? 'rgba(0,0,0,0.07)' : i===2 ? 'rgba(0,0,0,0.05)' : 'transparent',
                      color: i===0 ? '#15803d' : '#888',
                    }}>{i+1}</span>
                  </td>
                  <td style={{ padding:'12px 12px', fontWeight:600, color:'#111' }}>
                    {team?.name ?? '—'}
                  </td>
                  <td style={{ padding:'12px 12px', textAlign:'center' }}>
                    <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:20, color: i===0 ? '#15803d' : '#111', letterSpacing:'0.02em', fontWeight:700 }}>{s.points}</span>
                  </td>
                  <td style={{ padding:'12px 8px', textAlign:'center', color:'#666' }}>{s.played}</td>
                  <td style={{ padding:'12px 8px', textAlign:'center', color:'#15803d', fontWeight:600 }}>{s.won}</td>
                  <td style={{ padding:'12px 8px', textAlign:'center', color:'#888' }}>{s.lost}</td>
                  <td style={{ padding:'12px 8px', textAlign:'center', color: setDiff > 0 ? '#15803d' : setDiff < 0 ? '#dc2626' : '#888' }}>
                    {setDiff > 0 ? '+' : ''}{setDiff}
                  </td>
                  <td style={{ padding:'12px 8px', textAlign:'center', color: gameDiff > 0 ? '#15803d' : gameDiff < 0 ? '#dc2626' : '#888' }}>
                    {gameDiff > 0 ? '+' : ''}{gameDiff}
                  </td>
                  <td style={{ padding:'12px 8px', textAlign:'center', color:'#888' }}>{s.games_won}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Fixture ───────────────────────────────────────────────
function FixtureView({ rounds, matches, teams }: { rounds: Round[]; matches: LeagueMatch[]; teams: Team[] }) {
  const [openRound, setOpenRound] = useState<string | null>(rounds[0]?.id ?? null)
  const getTeam = (id: string) => teams.find(t => t.id === id)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {rounds.map(round => {
        const rMatches = matches.filter(m => m.round_id === round.id)
        const isOpen = openRound === round.id
        const done = rMatches.filter(m => m.status === 'done').length

        return (
          <div key={round.id} style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
            {/* Header ronda */}
            <button
              onClick={() => setOpenRound(isOpen ? null : round.id)}
              style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}
            >
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:18, letterSpacing:'0.03em', color:'#111' }}>
                  {round.label ?? `Fecha ${round.number}`}
                </div>
                {round.date && <div style={{ fontSize:12, color:'#bbb' }}>{displayDate(round.date)}</div>}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:11, color:'#bbb', fontWeight:500 }}>{done}/{rMatches.length} jugados</span>
                <span style={{ color:'#bbb', fontSize:12 }}>{isOpen ? '▲' : '▼'}</span>
              </div>
            </button>

            {/* Partidos */}
            {isOpen && (
              <div style={{ borderTop:'1px solid rgba(0,0,0,0.06)' }}>
                {rMatches.map((m, i) => {
                  const home = getTeam(m.home_team_id)
                  const away = getTeam(m.away_team_id)
                  const isDone = m.status === 'done'
                  const isLive = m.status === 'live'
                  const homeWin = m.winner_id === m.home_team_id
                  const awayWin = m.winner_id === m.away_team_id

                  return (
                    <div key={m.id} style={{
                      padding:'14px 18px',
                      borderBottom: i < rMatches.length-1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                      background: isLive ? 'rgba(22,163,74,0.03)' : 'transparent',
                    }}>
                      {/* Fecha, hora y estado */}
                      <div style={{ display:'flex', gap:10, marginBottom:8, alignItems:'center', flexWrap:'wrap' }}>
                        {isLive && <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, fontWeight:700, color:'#15803d', letterSpacing:'0.08em', textTransform:'uppercase' }}>
                          <span style={{ width:6, height:6, borderRadius:'50%', background:'#16a34a', display:'inline-block', animation:'pulse-dot 1.5s infinite' }} />
                          En juego
                        </span>}
                        {!isLive && (m as any).match_date && <span style={{ fontSize:12, color:'#bbb' }}>{displayDate((m as any).match_date)}</span>}
                        {!isLive && m.scheduled_time && <span style={{ fontSize:12, color:'#bbb', fontFamily:"'Bebas Neue', sans-serif", letterSpacing:'0.03em' }}>{m.scheduled_time.slice(0,5)}</span>}
                        {m.court && <span style={{ fontSize:11, color:'#ccc' }}>{m.court}</span>}
                        {isDone && <span style={{ fontSize:10, fontWeight:700, color:'#bbb', letterSpacing:'0.06em', textTransform:'uppercase', marginLeft:'auto' }}>Finalizado</span>}
                      </div>

                      {/* Equipos y score */}
                      <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:12, alignItems:'center' }}>
                        {/* Local */}
                        <div style={{ color: isDone ? (homeWin ? '#15803d' : '#aaa') : '#111', fontWeight: homeWin ? 700 : 500, fontSize:14 }}>
                          {home?.name ?? '—'}
                          {isDone && <div style={{ fontSize:11, color: homeWin ? '#15803d' : '#bbb', marginTop:2 }}>
                            {m.home_points + m.home_bonus} pts {m.home_bonus > 0 ? `(+${m.home_bonus} extra)` : ''}
                          </div>}
                        </div>

                        {/* Score */}
                        <div style={{ textAlign:'center' }}>
                          {isDone && m.score ? (
                            <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                              <div style={{ display:'flex', gap:6, justifyContent:'center' }}>
                                {m.score.map((s, si) => (
                                  <span key={si} style={{
                                    fontFamily:"'Bebas Neue', sans-serif", fontSize:15, letterSpacing:'0.02em',
                                    padding:'2px 8px', borderRadius:6,
                                    background: s.home > s.away ? 'rgba(22,163,74,0.1)' : 'rgba(0,0,0,0.05)',
                                    color: s.home > s.away ? '#15803d' : '#888',
                                  }}>{s.home}/{s.away}</span>
                                ))}
                              </div>
                              <div style={{ fontSize:10, color:'#ccc' }}>{m.home_sets}—{m.away_sets} sets</div>
                            </div>
                          ) : (
                            <span style={{ fontSize:18, color:'#ccc', fontWeight:300 }}>vs</span>
                          )}
                        </div>

                        {/* Visitante */}
                        <div style={{ textAlign:'right', color: isDone ? (awayWin ? '#15803d' : '#aaa') : '#111', fontWeight: awayWin ? 700 : 500, fontSize:14 }}>
                          {away?.name ?? '—'}
                          {isDone && <div style={{ fontSize:11, color: awayWin ? '#15803d' : '#bbb', marginTop:2 }}>
                            {m.away_points + m.away_bonus} pts {m.away_bonus > 0 ? `(+${m.away_bonus} extra)` : ''}
                          </div>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Página pública principal ──────────────────────────────
export default function LeaguePublic() {
  const [leagues,   setLeagues]   = useState<League[]>([])
  const [selected,  setSelected]  = useState<string | null>(null)
  const [teams,     setTeams]     = useState<Team[]>([])
  const [rounds,    setRounds]    = useState<Round[]>([])
  const [matches,   setMatches]   = useState<LeagueMatch[]>([])
  const [standings, setStandings] = useState<Standing[]>([])
  const [tab,       setTab]       = useState<'tabla'|'fixture'>('tabla')
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('leagues').select('*').order('created_at', { ascending: false })
      if (data?.length) {
        setLeagues(data)
        setSelected(data[0].id)
      }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (!selected) return
    async function loadLeague() {
      const [{ data: t }, { data: r }, { data: m }, { data: s }] = await Promise.all([
        supabase.from('teams').select('*').eq('league_id', selected).order('order_num'),
        supabase.from('rounds').select('*').eq('league_id', selected).order('number'),
        supabase.from('league_matches').select('*').eq('league_id', selected),
        supabase.from('league_standings').select('*').eq('league_id', selected),
      ])
      if (t) setTeams(t)
      if (r) setRounds(r)
      if (m) setMatches(m)
      if (s) setStandings(s)
    }
    loadLeague()

    // Realtime
    const ch = supabase.channel('liga-public')
      .on('postgres_changes', { event:'*', schema:'public', table:'league_matches', filter:`league_id=eq.${selected}` }, loadLeague)
      .on('postgres_changes', { event:'*', schema:'public', table:'standings', filter:`league_id=eq.${selected}` }, loadLeague)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [selected])

  const league = leagues.find(l => l.id === selected)

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:200 }}>
      <div style={{ width:22, height:22, border:'2px solid #16a34a', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
    </div>
  )

  if (!leagues.length) return (
    <div style={{ textAlign:'center', padding:'60px 0', color:'#bbb' }}>
      <div style={{ fontSize:40, marginBottom:12 }}>🏅</div>
      <p style={{ fontSize:14 }}>No hay ligas activas.</p>
    </div>
  )

  return (
    <div>
      {/* Selector de liga si hay más de una */}
      {leagues.length > 1 && (
        <div style={{ display:'flex', gap:8, overflowX:'auto', marginBottom:20, paddingBottom:4 }}>
          {leagues.map(l => (
            <button key={l.id} onClick={() => setSelected(l.id)} style={{
              padding:'6px 14px', borderRadius:8, border:'1px solid rgba(0,0,0,0.1)',
              background: selected===l.id ? '#111' : '#fff',
              color: selected===l.id ? '#fff' : '#666',
              fontWeight:600, fontSize:13, cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap',
            }}>{l.name}</button>
          ))}
        </div>
      )}

      {/* Header de la liga */}
      <div style={{ marginBottom:24, paddingTop:24 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
          <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.12em', color:'#bbb', textTransform:'uppercase' }}>
            Liga · {league?.season ?? '2025'}
          </span>
          <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background: league?.status==='active' ? 'rgba(22,163,74,0.1)' : 'rgba(0,0,0,0.05)', color: league?.status==='active' ? '#15803d' : '#888', textTransform:'uppercase' }}>
            {league?.status === 'active' ? '● En curso' : 'Finalizada'}
          </span>
        </div>
        <h1 style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:'clamp(32px,6vw,52px)', letterSpacing:'0.02em', lineHeight:1, color:'#111' }}>
          {league?.name}
        </h1>
        {league?.description && <p style={{ fontSize:13, color:'#888', marginTop:6 }}>{league.description}</p>}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:2, background:'#f5f5f5', border:'1px solid rgba(0,0,0,0.07)', borderRadius:10, padding:4, marginBottom:20 }}>
        {([['tabla','🏅 Tabla'],['fixture','📅 Fixture']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex:1, padding:'8px 16px', borderRadius:7, border:'none', cursor:'pointer', fontFamily:"'Bebas Neue', sans-serif",
            fontSize:15, letterSpacing:'0.05em',
            background: tab===id ? '#fff' : 'transparent',
            color: tab===id ? '#111' : '#999',
            boxShadow: tab===id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}>{label}</button>
        ))}
      </div>

      {/* Contenido */}
      <div key={tab}>
        {tab === 'tabla' && <StandingsTable standings={standings} teams={teams} />}
        {tab === 'fixture' && <FixtureView rounds={rounds} matches={matches} teams={teams} />}
      </div>
    </div>
  )
}
