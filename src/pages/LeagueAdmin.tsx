import React from 'react'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { League, Team, Round, LeagueMatch, Standing, SetScore } from '../store/league-types'

const inp: React.CSSProperties = { width:'100%', background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 12px', fontSize:13, color:'#111', outline:'none', fontFamily:'inherit' }
const btn = (color = '#111'): React.CSSProperties => ({ background:color, color:'#fff', border:'none', borderRadius:8, padding:'10px 18px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit' })

function showFb(set: (s:string)=>void, msg:string) { set(msg); setTimeout(()=>set(''),3000) }

// ── Sección: Ligas ────────────────────────────────────────
function LeaguesSection({ onSelect }: { onSelect: (id:string)=>void }) {
  const [leagues, setLeagues] = useState<League[]>([])
  const [name, setName] = useState('')
  const [season, setSeason] = useState('2025')
  const [desc, setDesc] = useState('')
  const [fb, setFb] = useState('')

  async function load() {
    const { data } = await supabase.from('leagues').select('*').order('created_at', { ascending: false })
    if (data) setLeagues(data)
  }
  useEffect(() => { load() }, [])

  async function create() {
    if (!name) { showFb(setFb, '⚠ Ingresá el nombre.'); return }
    const { data, error } = await supabase.from('leagues').insert({ name, season, description: desc || null }).select().single()
    if (error) { showFb(setFb, '❌ ' + error.message); return }
    // Crear standings vacíos si hay equipos
    showFb(setFb, '✓ Liga creada.')
    setName(''); setDesc('')
    load()
    if (data) onSelect(data.id)
  }

  return (
    <div>
      <h3 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, marginBottom:16, letterSpacing:'0.03em' }}>Ligas</h3>
      <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
        {leagues.map(l => (
          <div key={l.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:10, cursor:'pointer' }} onClick={() => onSelect(l.id)}>
            <div>
              <div style={{ fontWeight:600, fontSize:14 }}>{l.name}</div>
              <div style={{ fontSize:11, color:'#bbb' }}>{l.season} · {l.status === 'active' ? '🟢 Activa' : '⚪ Finalizada'}</div>
            </div>
            <span style={{ fontSize:12, color:'#16a34a', fontWeight:600 }}>Gestionar →</span>
          </div>
        ))}
      </div>

      <div style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:12, padding:16 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', color:'#999', textTransform:'uppercase', marginBottom:12 }}>Nueva liga</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 120px', gap:8, marginBottom:8 }}>
          <input style={inp} placeholder="Nombre de la liga" value={name} onChange={e=>setName(e.target.value)} />
          <input style={inp} placeholder="Temporada" value={season} onChange={e=>setSeason(e.target.value)} />
        </div>
        <textarea style={{ ...inp, resize:'none', height:60, marginBottom:8 }} placeholder="Descripción (opcional)" value={desc} onChange={e=>setDesc(e.target.value)} />
        <button style={btn()} onClick={create}>Crear liga</button>
        {fb && <p style={{ marginTop:8, fontSize:12, color: fb.startsWith('❌')||fb.startsWith('⚠') ? '#dc2626' : '#15803d' }}>{fb}</p>}
      </div>
    </div>
  )
}

// ── Sección: Equipos ──────────────────────────────────────
function TeamsSection({ leagueId }: { leagueId: string }) {
  const [teams, setTeams] = useState<Team[]>([])
  const [names, setNames] = useState('')
  const [fb, setFb] = useState('')

  async function load() {
    const { data } = await supabase.from('teams').select('*').eq('league_id', leagueId).order('order_num')
    if (data) setTeams(data)
  }
  useEffect(() => { load() }, [leagueId])

  async function addTeams() {
    const list = names.split('\n').map(s=>s.trim()).filter(Boolean)
    if (!list.length) { showFb(setFb,'⚠ Ingresá al menos un equipo.'); return }
    const maxOrder = teams.length ? Math.max(...teams.map(t=>t.order_num)) : 0
    const toInsert = list.map((name,i) => ({ league_id: leagueId, name, order_num: maxOrder+i+1 }))
    const { error } = await supabase.from('teams').insert(toInsert)
    if (error) { showFb(setFb,'❌ '+error.message); return }
    // Crear standings para los nuevos equipos
    const { data: newTeams } = await supabase.from('teams').select('id').eq('league_id', leagueId)
    if (newTeams) {
      const standingsToInsert = newTeams.map(t => ({ league_id: leagueId, team_id: t.id }))
      await supabase.from('league_standings').upsert(standingsToInsert, { onConflict: 'league_id,team_id' })
    }
    showFb(setFb,`✓ ${list.length} equipo${list.length>1?'s':''} agregado${list.length>1?'s':''}.`)
    setNames('')
    load()
  }

  async function deleteTeam(id: string) {
    await supabase.from('teams').delete().eq('id', id)
    load()
  }

  return (
    <div>
      <h3 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, marginBottom:16, letterSpacing:'0.03em' }}>Equipos</h3>
      <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:16 }}>
        {teams.map((t,i) => (
          <div key={t.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:8 }}>
            <span style={{ fontSize:11, color:'#bbb', width:20 }}>{i+1}</span>
            <span style={{ flex:1, fontWeight:500, fontSize:14 }}>{t.name}</span>
            <button onClick={() => deleteTeam(t.id)} style={{ background:'none', border:'none', color:'#dc2626', cursor:'pointer', fontSize:13, padding:'2px 6px' }}>✕</button>
          </div>
        ))}
        {!teams.length && <p style={{ fontSize:13, color:'#bbb', textAlign:'center', padding:'20px 0' }}>Sin equipos. Agregá abajo.</p>}
      </div>

      <div style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:12, padding:16 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', color:'#999', textTransform:'uppercase', marginBottom:8 }}>Agregar equipos</div>
        <textarea style={{ ...inp, resize:'none', height:120, marginBottom:8 }} placeholder="Un equipo por línea&#10;Ej:&#10;Equipo A&#10;Equipo B&#10;Equipo C" value={names} onChange={e=>setNames(e.target.value)} />
        <button style={btn()} onClick={addTeams}>Agregar equipos</button>
        {fb && <p style={{ marginTop:8, fontSize:12, color: fb.startsWith('❌')||fb.startsWith('⚠') ? '#dc2626' : '#15803d' }}>{fb}</p>}
      </div>
    </div>
  )
}

// ── Sección: Fixture ──────────────────────────────────────
function FixtureSection({ leagueId, teams }: { leagueId: string; teams: Team[] }) {
  const [rounds, setRounds]   = useState<Round[]>([])
  const [matches, setMatches] = useState<LeagueMatch[]>([])
  const [fb, setFb]           = useState('')
  const [generating, setGen]  = useState(false)
  const [openRound, setOpen]  = useState<string|null>(null)

  // Nuevo partido manual
  const [newRound, setNewRound]   = useState('')
  const [newDate, setNewDate]     = useState('')
  const [newHome, setNewHome]     = useState('')
  const [newAway, setNewAway]     = useState('')
  const [newTime, setNewTime]     = useState('')

  async function load() {
    const [{ data: r }, { data: m }] = await Promise.all([
      supabase.from('rounds').select('*').eq('league_id', leagueId).order('number'),
      supabase.from('league_matches').select('*').eq('league_id', leagueId),
    ])
    if (r) setRounds(r)
    if (m) setMatches(m)
  }
  useEffect(() => { load() }, [leagueId])

  async function generateFixture() {
    if (!confirm('¿Generar fixture automático? Esto borrará el fixture actual.')) return
    setGen(true)
    const { error } = await supabase.rpc('generate_fixture', { p_league_id: leagueId })
    if (error) { showFb(setFb,'❌ '+error.message) }
    else showFb(setFb,'✓ Fixture generado.')
    setGen(false)
    load()
  }

  async function updateMatch(matchId: string, field: string, value: any) {
    await supabase.from('league_matches').update({ [field]: value }).eq('id', matchId)
    load()
  }

  async function addRound() {
    const num = rounds.length + 1
    const { data, error } = await supabase.from('rounds').insert({
      league_id: leagueId, number: num, label: `Fecha ${num}`, date: newDate || null,
    }).select().single()
    if (error) { showFb(setFb,'❌ '+error.message); return }
    showFb(setFb,'✓ Fecha agregada.')
    setNewDate('')
    load()
    if (data) setOpen(data.id)
  }

  async function addMatch(roundId: string) {
    if (!newHome || !newAway) { showFb(setFb,'⚠ Seleccioná ambos equipos.'); return }
    const { error } = await supabase.from('league_matches').insert({
      league_id: leagueId, round_id: roundId,
      home_team_id: newHome, away_team_id: newAway,
      match_date: newDate || null,
      scheduled_time: newTime || null,
    })
    if (error) { showFb(setFb,'❌ '+error.message); return }
    showFb(setFb,'✓ Partido agregado.')
    setNewHome(''); setNewAway(''); setNewTime('')
    load()
  }

  const getTeam = (id:string) => teams.find(t=>t.id===id)

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <h3 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, letterSpacing:'0.03em' }}>Fixture</h3>
        <button onClick={generateFixture} disabled={generating || teams.length < 2} style={{ ...btn('#16a34a'), fontSize:12, padding:'7px 14px', opacity: teams.length < 2 ? 0.4 : 1 }}>
          {generating ? 'Generando...' : '⚡ Generar automático'}
        </button>
      </div>

      {fb && <p style={{ marginBottom:12, fontSize:12, color: fb.startsWith('❌')||fb.startsWith('⚠') ? '#dc2626' : '#15803d' }}>{fb}</p>}

      <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
        {rounds.map(round => {
          const rMatches = matches.filter(m=>m.round_id===round.id)
          const isOpen = openRound===round.id
          return (
            <div key={round.id} style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.08)', borderRadius:12, overflow:'hidden' }}>
              <button onClick={()=>setOpen(isOpen?null:round.id)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' as const }}>
                  <span style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:17, letterSpacing:'0.03em', color:'#111' }}>{round.label ?? `Fecha ${round.number}`}</span>
                  {rMatches.some(m => m.match_date) && (
                    <span style={{ fontSize:11, color:'#bbb' }}>
                      {[...new Set(rMatches.map(m=>m.match_date).filter(Boolean))].join(' · ')}
                    </span>
                  )}
                </div>
                <span style={{ fontSize:11, color:'#bbb' }}>{rMatches.length} partidos {isOpen?'▲':'▼'}</span>
              </button>

              {isOpen && (
                <div style={{ borderTop:'1px solid rgba(0,0,0,0.06)', padding:'12px 16px' }}>
                  {/* Partidos con fecha y hora individuales */}
                  {rMatches.map(m => (
                    <div key={m.id} style={{ padding:'12px 0', borderBottom:'1px solid rgba(0,0,0,0.05)' }}>
                      <div style={{ fontWeight:600, fontSize:13, marginBottom:8, color:'#111' }}>
                        {getTeam(m.home_team_id)?.name} <span style={{ color:'#bbb', fontWeight:400 }}>vs</span> {getTeam(m.away_team_id)?.name}
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                        <div>
                          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', color:'#bbb', textTransform:'uppercase', marginBottom:4 }}>Fecha</div>
                          <input type="date" defaultValue={m.match_date??''} onBlur={e=>updateMatch(m.id,'match_date',e.target.value||null)} style={inp} />
                        </div>
                        <div>
                          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', color:'#bbb', textTransform:'uppercase', marginBottom:4 }}>Hora</div>
                          <input type="time" defaultValue={m.scheduled_time?.slice(0,5)??''} onBlur={e=>updateMatch(m.id,'scheduled_time',e.target.value?e.target.value+':00':null)} style={inp} />
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Agregar partido */}
                  <div style={{ marginTop:12, background:'#f9fafb', borderRadius:8, padding:12 }}>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.1em', color:'#bbb', textTransform:'uppercase', marginBottom:8 }}>Agregar partido</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr 80px auto', gap:6, alignItems:'center' }}>
                      <select value={newHome} onChange={e=>setNewHome(e.target.value)} style={inp}>
                        <option value="">Local</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      <span style={{ color:'#bbb', fontSize:11 }}>vs</span>
                      <select value={newAway} onChange={e=>setNewAway(e.target.value)} style={inp}>
                        <option value="">Visitante</option>
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      <input type="time" value={newTime} onChange={e=>setNewTime(e.target.value)} style={{ ...inp, fontSize:12 }} />
                      <button onClick={()=>addMatch(round.id)} style={{ ...btn(), fontSize:12, padding:'8px 12px' }}>+</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Nueva fecha */}
      <div style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:12, padding:16 }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', color:'#999', textTransform:'uppercase', marginBottom:8 }}>Agregar fecha</div>
        <div style={{ display:'flex', gap:8 }}>
          <input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)} style={{ ...inp, flex:1 }} />
          <button onClick={addRound} style={btn()}>+ Agregar fecha</button>
        </div>
      </div>
    </div>
  )
}

// ── Sección: Resultados ───────────────────────────────────
function ResultsSection({ leagueId, teams }: { leagueId: string; teams: Team[] }) {
  const [rounds,  setRounds]  = useState<Round[]>([])
  const [matches, setMatches] = useState<LeagueMatch[]>([])
  const [fb, setFb]           = useState('')
  const [openMatch, setOpen]  = useState<string|null>(null)

  // Form por partido
  const [score, setScore]       = useState('')
  const [winner, setWinner]     = useState<'home'|'away'>('home')
  const [homeBonus, setHBonus]  = useState('0')
  const [awayBonus, setABonus]  = useState('0')

  async function load() {
    const [{ data: r }, { data: m }] = await Promise.all([
      supabase.from('rounds').select('*').eq('league_id', leagueId).order('number'),
      supabase.from('league_matches').select('*').eq('league_id', leagueId),
    ])
    if (r) setRounds(r)
    if (m) setMatches(m)
  }
  useEffect(() => { load() }, [leagueId] )

  function openResultForm(m: LeagueMatch) {
    setOpen(m.id)
    const sc = m.score as SetScore[] | null
    setScore(sc?.map(s=>`${s.home}/${s.away}`).join(' ') ?? '')
    setWinner(m.winner_id === m.home_team_id ? 'home' : 'away')
    setHBonus(String(m.home_bonus ?? 0))
    setABonus(String(m.away_bonus ?? 0))
  }

  async function saveResult(m: LeagueMatch) {
    if (!score) { showFb(setFb,'⚠ Ingresá el score.'); return }

    const sets: SetScore[] = score.trim().split(/\s+/).map((s,i) => {
      const [h,a] = s.split('/').map(Number)
      return { set:i+1, home:h||0, away:a||0 }
    })

    const homeSets = sets.filter(s=>s.home>s.away).length
    const awaySets = sets.filter(s=>s.away>s.home).length
    const homeGames = sets.reduce((a,s)=>a+s.home,0)
    const awayGames = sets.reduce((a,s)=>a+s.away,0)
    const winnerId = winner==='home' ? m.home_team_id : m.away_team_id
    const totalSets = homeSets + awaySets

    // Calcular puntos según regla:
    // Ganar 2-0: ganador +3, perdedor +0
    // Ganar 2-1: ganador +2, perdedor +1
    let homePoints = 0, awayPoints = 0
    if (winner === 'home') {
      homePoints = totalSets === 2 ? 3 : 2
      awayPoints = totalSets === 3 ? 1 : 0
    } else {
      awayPoints = totalSets === 2 ? 3 : 2
      homePoints = totalSets === 3 ? 1 : 0
    }

    const { error } = await supabase.from('league_matches').update({
      score: sets, home_sets: homeSets, away_sets: awaySets,
      home_games: homeGames, away_games: awayGames,
      winner_id: winnerId, home_points: homePoints, away_points: awayPoints,
      home_bonus: parseInt(homeBonus)||0, away_bonus: parseInt(awayBonus)||0,
      status: 'done',
    }).eq('id', m.id)

    if (error) { showFb(setFb,'❌ '+error.message); return }

    // Recalcular standings
    await supabase.rpc('recalc_standings', { p_league_id: leagueId })
    showFb(setFb,'✓ Resultado guardado.')
    setOpen(null)
    load()
  }

  const getTeam = (id:string) => teams.find(t=>t.id===id)

  return (
    <div>
      <h3 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:20, marginBottom:16, letterSpacing:'0.03em' }}>Cargar resultados</h3>
      {fb && <p style={{ marginBottom:12, fontSize:12, color: fb.startsWith('❌')||fb.startsWith('⚠') ? '#dc2626' : '#15803d' }}>{fb}</p>}

      {rounds.map(round => {
        const rMatches = matches.filter(m=>m.round_id===round.id)
        const pending = rMatches.filter(m=>m.status!=='done')
        const done    = rMatches.filter(m=>m.status==='done')
        return (
          <div key={round.id} style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.1em', color:'#bbb', textTransform:'uppercase', marginBottom:8 }}>
              {round.label ?? `Fecha ${round.number}`} · {done.length}/{rMatches.length} cargados
            </div>

            {rMatches.map(m => {
              const home = getTeam(m.home_team_id)
              const away = getTeam(m.away_team_id)
              const isDone = m.status === 'done'
              const isEditing = openMatch === m.id

              return (
                <div key={m.id} style={{ background:'#fff', border: isDone ? '1px solid rgba(22,163,74,0.2)' : '1px solid rgba(0,0,0,0.08)', borderRadius:10, overflow:'hidden', marginBottom:6 }}>
                  <button onClick={()=> isEditing ? setOpen(null) : openResultForm(m)}
                    style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:13, color:'#111' }}>{home?.name} vs {away?.name}</div>
                      {isDone && (
                        <div style={{ fontSize:11, color:'#888', marginTop:2 }}>
                          {(m.score as SetScore[])?.map(s=>`${s.home}/${s.away}`).join(' ')} · {m.home_points+m.home_bonus}pts - {m.away_points+m.away_bonus}pts
                        </div>
                      )}
                    </div>
                    <span style={{ fontSize:11, color: isDone?'#15803d':'#999', fontWeight:600 }}>
                      {isDone ? '✓ Editar' : 'Cargar resultado'}
                    </span>
                  </button>

                  {isEditing && (
                    <div style={{ padding:'14px 16px', borderTop:'1px solid rgba(0,0,0,0.06)', background:'#fafafa' }}>
                      <div style={{ marginBottom:10 }}>
                        <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', color:'#999', textTransform:'uppercase', marginBottom:6 }}>Score (sets separados por espacio)</div>
                        <input style={inp} value={score} onChange={e=>setScore(e.target.value)} placeholder="6/3 6/4  o  6/3 4/6 7/5" />
                        <div style={{ fontSize:10, color:'#bbb', marginTop:3 }}>Formato: games_local/games_visitante por set</div>
                      </div>

                      {/* Ganador */}
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                        {(['home','away'] as const).map(side => (
                          <button key={side} onClick={()=>setWinner(side)} style={{
                            padding:'10px', borderRadius:8, cursor:'pointer', fontFamily:'inherit', textAlign:'left' as const,
                            background: winner===side ? 'rgba(22,163,74,0.08)' : '#fff',
                            border: winner===side ? '1.5px solid rgba(22,163,74,0.4)' : '1px solid #e5e7eb',
                          }}>
                            <div style={{ fontSize:9, color:'#bbb', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:2 }}>Ganador</div>
                            <div style={{ fontWeight:600, fontSize:13, color: winner===side?'#15803d':'#111' }}>
                              {side==='home' ? home?.name : away?.name}
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* Bonus */}
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                        <div>
                          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', color:'#999', textTransform:'uppercase', marginBottom:4 }}>Pts extra {home?.name}</div>
                          <input type="number" min={0} style={inp} value={homeBonus} onChange={e=>setHBonus(e.target.value)} />
                        </div>
                        <div>
                          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', color:'#999', textTransform:'uppercase', marginBottom:4 }}>Pts extra {away?.name}</div>
                          <input type="number" min={0} style={inp} value={awayBonus} onChange={e=>setABonus(e.target.value)} />
                        </div>
                      </div>

                      <button onClick={()=>saveResult(m)} style={{ ...btn('#16a34a'), width:'100%', padding:'11px' }}>
                        Guardar resultado y recalcular tabla →
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ── Admin principal ───────────────────────────────────────
export default function LeagueAdmin() {
  const [leagueId, setLeagueId] = useState<string|null>(null)
  const [teams, setTeams]       = useState<Team[]>([])
  const [step, setStep]         = useState<'leagues'|'teams'|'fixture'|'results'>('leagues')

  useEffect(() => {
    if (!leagueId) return
    supabase.from('teams').select('*').eq('league_id', leagueId).order('order_num').then(({ data }) => {
      if (data) setTeams(data)
    })
  }, [leagueId, step])

  function selectLeague(id: string) {
    setLeagueId(id)
    setStep('teams')
  }

  const steps = [
    { id:'leagues',  label:'Liga'      },
    { id:'teams',    label:'Equipos'   },
    { id:'fixture',  label:'Fixture'   },
    { id:'results',  label:'Resultados'},
  ] as const

  return (
    <div style={{ paddingTop:24 }}>
      <h2 style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:'clamp(28px,5vw,44px)', letterSpacing:'0.02em', marginBottom:20, color:'#111' }}>
        Admin · Liga
      </h2>

      {/* Steps */}
      <div style={{ display:'flex', gap:4, marginBottom:24, overflowX:'auto' }}>
        {steps.map(s => (
          <button key={s.id} onClick={() => s.id!=='leagues' && leagueId ? setStep(s.id) : setStep('leagues')}
            style={{
              padding:'7px 14px', borderRadius:8, border:'none', cursor:'pointer', fontFamily:"'Bebas Neue',sans-serif",
              fontSize:15, letterSpacing:'0.04em', whiteSpace:'nowrap',
              background: step===s.id ? '#111' : '#f5f5f5',
              color: step===s.id ? '#fff' : '#999',
              opacity: s.id!=='leagues' && !leagueId ? 0.4 : 1,
            }}>{s.label}</button>
        ))}
      </div>

      {step==='leagues'  && <LeaguesSection onSelect={selectLeague} />}
      {step==='teams'    && leagueId && <TeamsSection leagueId={leagueId} />}
      {step==='fixture'  && leagueId && <FixtureSection leagueId={leagueId} teams={teams} />}
      {step==='results'  && leagueId && <ResultsSection leagueId={leagueId} teams={teams} />}
    </div>
  )
}
