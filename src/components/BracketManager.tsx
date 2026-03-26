import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────

interface Zone    { id: string; name: string; order_num: number }
interface Pair    { id: string; display_name: string }
interface Standing { zone_id: string; pair_id: string; position: number; points: number }

interface BMatch {
  id: string
  round: string
  match_order: number
  pair1_id: string | null
  pair2_id: string | null
  winner_pair_id: string | null
  status: string
  score: any
  day: string | null
  scheduled_time: string | null
  court: string | null
  winner_goes_to_match?: number | null   // match_order destino en ronda siguiente
  winner_goes_to_slot?: number | null    // 1 = pair1, 2 = pair2 del destino
}

interface Props {
  tournamentId: string
  zones: Zone[]
  pairs: Pair[]
  courtsCount: number
  onRefresh: () => void
}

// ─── Constants ───────────────────────────────────────────

const ROUND_ORDER  = ['roundof16', 'quarters', 'semis', 'final']
const ROUND_LABELS: Record<string, string> = {
  roundof16: 'Octavos',
  quarters:  'Cuartos',
  semis:     'Semifinales',
  final:     'Final',
}
const ROUND_LABELS_FULL: Record<string, string> = {
  roundof16: 'Octavos de final',
  quarters:  'Cuartos de final',
  semis:     'Semifinales',
  final:     'Final',
}

function displayDate(d: string | null) {
  if (!d) return ''
  try {
    const [y, m, day] = d.split('-').map(Number)
    return new Date(y, m - 1, day).toLocaleDateString('es-AR', {
      weekday: 'short', day: '2-digit', month: 'short',
    })
  } catch { return d }
}

// ─── EditPanel ───────────────────────────────────────────

function EditPanel({
  match: m, pairs, courtsCount, tournamentId, onSaved,
}: {
  match: BMatch; pairs: Pair[]; courtsCount: number
  tournamentId: string; onSaved: () => void
}) {
  const [date,   setDate]   = useState(m.day ?? '')
  const [time,   setTime]   = useState(m.scheduled_time?.slice(0,5) ?? '20:00')
  const [court,  setCourt]  = useState(m.court ?? 'Cancha 1')
  const [score,  setScore]  = useState(() => {
    const s = m.score as any[]
    return s?.length ? s.map((x: any) => `${x.p1}/${x.p2}`).join(' ') : ''
  })
  const [winner, setWinner] = useState<'1'|'2'>(() =>
    m.winner_pair_id === m.pair2_id ? '2' : '1'
  )
  const [saving, setSaving] = useState(false)
  const [fb,     setFb]     = useState('')

  function getPairName(id: string | null) {
    if (!id) return 'Por definir'
    return pairs.find(p => p.id === id)?.display_name ?? '—'
  }
  function showFb(msg: string) { setFb(msg); setTimeout(() => setFb(''), 3000) }

  async function saveSchedule() {
    if (!date || !time || !court) { showFb('⚠ Completá fecha, hora y cancha.'); return }
    setSaving(true)
    const { error } = await supabase.from('matches')
      .update({ day: date, scheduled_time: time + ':00', court })
      .eq('id', m.id)
    setSaving(false)
    if (error) { showFb('❌ ' + error.message); return }
    showFb('✓ Horario guardado.')
    onSaved()
  }

  async function saveResult() {
    if (!score)                      { showFb('⚠ Ingresá el score.'); return }
    if (!m.pair1_id || !m.pair2_id)  { showFb('⚠ Faltan parejas en este partido.'); return }

    const sets = score.trim().split(/\s+/).map((s: string, i: number) => {
      const [p1, p2] = s.split('/').map(Number)
      return { set: i + 1, p1, p2 }
    })
    const winnerId = winner === '1' ? m.pair1_id : m.pair2_id

    setSaving(true)
    const { error } = await supabase.from('matches')
      .update({ score: sets, winner_pair_id: winnerId, status: 'done' })
      .eq('id', m.id)

    if (error) { setSaving(false); showFb('❌ ' + error.message); return }

    // Avanzar al slot configurado en winner_goes_to_match / winner_goes_to_slot
    if (m.winner_goes_to_match && m.winner_goes_to_slot) {
      const nextRound = ROUND_ORDER[ROUND_ORDER.indexOf(m.round) + 1]
      if (nextRound) {
        const slot = m.winner_goes_to_slot === 1 ? 'pair1_id' : 'pair2_id'
        const { data: dest } = await supabase.from('matches')
          .select('id')
          .eq('tournament_id', tournamentId)
          .eq('round', nextRound)
          .eq('match_order', m.winner_goes_to_match)
          .maybeSingle()
        if (dest?.id) {
          await supabase.from('matches').update({ [slot]: winnerId }).eq('id', dest.id)
        }
      }
    }

    setSaving(false)
    showFb('✓ Resultado guardado.')
    onSaved()
  }

  return (
    <div className="border-t border-gray-200 px-4 py-4 bg-gray-50 space-y-4">
      {/* Horario */}
      <div>
        <div className="text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-2">Programar partido</div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="text-[9px] text-gray-600 uppercase font-bold tracking-widest mb-1">Fecha</div>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-gray-900 text-xs outline-none focus:border-green-600" />
            {date && <div className="text-[9px] text-gray-600 mt-1">{displayDate(date)}</div>}
          </div>
          <div>
            <div className="text-[9px] text-gray-600 uppercase font-bold tracking-widest mb-1">Hora</div>
            <input type="time" value={time} onChange={e => setTime(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-gray-900 text-xs outline-none focus:border-green-600" />
          </div>
          <div>
            <div className="text-[9px] text-gray-600 uppercase font-bold tracking-widest mb-1">Cancha</div>
            <select value={court} onChange={e => setCourt(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-gray-900 text-xs outline-none focus:border-green-600 cursor-pointer">
              {Array.from({ length: courtsCount }, (_, i) => (
                <option key={i+1}>Cancha {i+1}</option>
              ))}
            </select>
          </div>
        </div>
        <button onClick={saveSchedule} disabled={saving}
          className="w-full mt-2 bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40">
          {saving ? 'Guardando...' : 'Guardar horario'}
        </button>
      </div>

      {/* Resultado */}
      <div className="border-t border-gray-200 pt-4">
        <div className="text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-2">
          {m.status === 'done' ? 'Editar resultado' : 'Cargar resultado'}
        </div>
        {!m.pair1_id || !m.pair2_id ? (
          <p className="text-xs text-gray-600 italic">Esperando que ambas parejas estén definidas.</p>
        ) : (
          <>
            <input value={score} onChange={e => setScore(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 text-sm outline-none focus:border-green-600 mb-1"
              placeholder="6/3 6/4  o  6/3 4/6 7/5" />
            <p className="text-[9px] text-gray-600 mb-3">Separar sets con espacio · p1/p2</p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {(['1','2'] as const).map(n => (
                <button key={n} onClick={() => setWinner(n)}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold text-left transition-all ${
                    winner === n
                      ? 'bg-green-600/10 border-green-600/50 text-green-600'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:text-white'
                  }`}>
                  <div className="text-[9px] text-gray-600 mb-0.5">Ganador</div>
                  <div className="truncate">{getPairName(n === '1' ? m.pair1_id : m.pair2_id)}</div>
                </button>
              ))}
            </div>
            <button onClick={saveResult} disabled={saving}
              className="w-full bg-amber-400 text-white font-['Bebas_Neue', sans-serif] text-base font-bold py-2.5 rounded-xl hover:bg-amber-500 transition-colors disabled:opacity-40">
              {saving ? 'Guardando...' : m.status === 'done' ? 'Actualizar resultado' : 'Guardar y avanzar ganador →'}
            </button>
          </>
        )}
      </div>

      {fb && (
        <p className={`text-xs font-semibold ${fb.startsWith('❌')||fb.startsWith('⚠') ? 'text-red-400' : 'text-green-600'}`}>{fb}</p>
      )}
    </div>
  )
}

// ─── BracketSetup ─────────────────────────────────────────
// Arma el cuadro completo manualmente, configurando:
// 1) Cuántos partidos por ronda
// 2) Qué pareja va en cada slot
// 3) A qué slot exacto va el ganador de cada partido

interface MatchConfig {
  pair1: string | null
  pair2: string | null
  // dónde va el ganador
  winnerToMatch: number | null  // match_order destino en ronda siguiente
  winnerToSlot: 1 | 2 | null   // slot del destino
}

function BracketSetup({
  classified, zones, pairs, tournamentId, onSaved,
}: {
  classified: { pair_id: string; zone: string; position: number }[]
  zones: Zone[]
  pairs: Pair[]
  tournamentId: string
  onSaved: () => void
}) {
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({
    roundof16: 4, quarters: 4, semis: 2, final: 1,
  })
  // configs[round][matchIndex] = MatchConfig
  const [configs, setConfigs] = useState<Record<string, MatchConfig[]>>({})
  const [saving, setSaving] = useState(false)
  const [fb, setFb] = useState('')

  // Inicializar configs cuando cambian los matchCounts
  useEffect(() => {
    setConfigs(prev => {
      const next: Record<string, MatchConfig[]> = {}
      ROUND_ORDER.forEach(r => {
        const n = matchCounts[r]
        const existing = prev[r] ?? []
        next[r] = Array.from({ length: n }, (_, i) => existing[i] ?? {
          pair1: null, pair2: null,
          winnerToMatch: null, winnerToSlot: null,
        })
      })
      return next
    })
  }, [matchCounts])

  function getPairName(id: string | null) {
    if (!id) return ''
    return pairs.find(p => p.id === id)?.display_name ?? id.slice(0,8)
  }
  function showFb(msg: string) { setFb(msg); setTimeout(() => setFb(''), 4000) }

  function updateConfig(round: string, idx: number, patch: Partial<MatchConfig>) {
    setConfigs(prev => {
      const arr = [...(prev[round] ?? [])]
      arr[idx] = { ...arr[idx], ...patch }
      return { ...prev, [round]: arr }
    })
  }

  // Todas las parejas ya asignadas como pair1 o pair2
  const assignedPairs = new Set<string>()
  ROUND_ORDER.forEach(r => {
    (configs[r] ?? []).forEach(c => {
      if (c.pair1) assignedPairs.add(c.pair1)
      if (c.pair2) assignedPairs.add(c.pair2)
    })
  })

  const activeRounds = ROUND_ORDER.filter(r => matchCounts[r] > 0)
  const totalMatches = activeRounds.reduce((a, r) => a + matchCounts[r], 0)

  async function handleSave() {
    setSaving(true)

    // Borrar cuadro anterior
    await supabase.from('matches')
      .delete()
      .eq('tournament_id', tournamentId)
      .in('round', ROUND_ORDER)

    const toInsert: any[] = []
    for (const round of activeRounds) {
      const arr = configs[round] ?? []
      for (let i = 0; i < matchCounts[round]; i++) {
        const c = arr[i] ?? { pair1: null, pair2: null, winnerToMatch: null, winnerToSlot: null }
        toInsert.push({
          tournament_id: tournamentId,
          zone_id: null,
          round,
          match_order: i + 1,
          pair1_id: c.pair1 ?? null,
          pair2_id: c.pair2 ?? null,
          winner_goes_to_match: c.winnerToMatch ?? null,
          winner_goes_to_slot: c.winnerToSlot ?? null,
          status: 'upcoming',
        })
      }
    }

    const { error } = await supabase.from('matches').insert(toInsert)
    setSaving(false)
    if (error) { showFb('❌ ' + error.message); return }
    showFb(`✓ Cuadro publicado: ${toInsert.length} partidos.`)
    onSaved()
  }

  return (
    <div>
      {/* Configurar cantidad */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5">
        <div className="text-xs font-bold tracking-widest text-gray-600 uppercase mb-3">Estructura del cuadro</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ROUND_ORDER.map(r => (
            <div key={r}>
              <div className="text-[10px] text-gray-600 font-bold tracking-widest uppercase mb-1.5">{ROUND_LABELS[r]}</div>
              <select value={matchCounts[r]}
                onChange={e => setMatchCounts(prev => ({ ...prev, [r]: +e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-gray-900 text-xs outline-none focus:border-green-600 cursor-pointer">
                {[0,1,2,3,4,5,6,7,8].map(n => (
                  <option key={n} value={n}>{n === 0 ? 'No incluir' : `${n} partido${n>1?'s':''}`}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-3">
          {activeRounds.map(r => `${matchCounts[r]} ${ROUND_LABELS[r]}`).join(' + ')} = <span className="text-gray-600 font-bold">{totalMatches} partidos</span>
        </p>
      </div>

      {/* Configurar cada partido */}
      {activeRounds.map((round, roundIdx) => {
        const nextRound = activeRounds[roundIdx + 1]
        const nextCount = nextRound ? matchCounts[nextRound] : 0
        const arr = configs[round] ?? []

        return (
          <div key={round} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-gray-600">{ROUND_LABELS_FULL[round]}</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            <div className="space-y-3">
              {Array.from({ length: matchCounts[round] }, (_, i) => {
                const c = arr[i] ?? { pair1: null, pair2: null, winnerToMatch: null, winnerToSlot: null }

                return (
                  <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] border-b border-gray-200">
                      <span className="text-[10px] font-bold text-gray-600">Partido #{i+1}</span>
                      {c.winnerToMatch && c.winnerToSlot && nextRound && (
                        <span className="ml-auto text-[10px] text-green-600/60">
                          Ganador → {ROUND_LABELS[nextRound]} #{c.winnerToMatch} · Slot {c.winnerToSlot === 1 ? 'Pareja 1' : 'Pareja 2'}
                        </span>
                      )}
                    </div>

                    <div className="p-3 space-y-2">
                      {/* Pareja 1 */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-600 w-16 flex-shrink-0">Pareja 1</span>
                        <select value={c.pair1 ?? ''}
                          onChange={e => updateConfig(round, i, { pair1: e.target.value || null })}
                          className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 text-xs outline-none focus:border-green-600 cursor-pointer">
                          <option value="">— vacío (se define con ganador anterior) —</option>
                          <optgroup label="Clasificados de zonas">
                            {classified.map(cl => (
                              <option key={cl.pair_id} value={cl.pair_id}
                                disabled={assignedPairs.has(cl.pair_id) && c.pair1 !== cl.pair_id}>
                                {cl.position}° Zona {cl.zone} — {getPairName(cl.pair_id)}
                                {assignedPairs.has(cl.pair_id) && c.pair1 !== cl.pair_id ? ' (ya asignada)' : ''}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Todas las parejas del torneo">
                            {pairs.map(p => (
                              <option key={p.id} value={p.id}
                                disabled={assignedPairs.has(p.id) && c.pair1 !== p.id}>
                                {p.display_name}
                                {assignedPairs.has(p.id) && c.pair1 !== p.id ? ' (ya asignada)' : ''}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                        {c.pair1 && (
                          <button onClick={() => updateConfig(round, i, { pair1: null })}
                            className="text-gray-600 hover:text-red-400 text-xs px-1 flex-shrink-0">✕</button>
                        )}
                      </div>

                      {/* Pareja 2 */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-600 w-16 flex-shrink-0">Pareja 2</span>
                        <select value={c.pair2 ?? ''}
                          onChange={e => updateConfig(round, i, { pair2: e.target.value || null })}
                          className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 text-xs outline-none focus:border-green-600 cursor-pointer">
                          <option value="">— vacío (se define con ganador anterior) —</option>
                          <optgroup label="Clasificados de zonas">
                            {classified.map(cl => (
                              <option key={cl.pair_id} value={cl.pair_id}
                                disabled={assignedPairs.has(cl.pair_id) && c.pair2 !== cl.pair_id}>
                                {cl.position}° Zona {cl.zone} — {getPairName(cl.pair_id)}
                                {assignedPairs.has(cl.pair_id) && c.pair2 !== cl.pair_id ? ' (ya asignada)' : ''}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Todas las parejas del torneo">
                            {pairs.map(p => (
                              <option key={p.id} value={p.id}
                                disabled={assignedPairs.has(p.id) && c.pair2 !== p.id}>
                                {p.display_name}
                                {assignedPairs.has(p.id) && c.pair2 !== p.id ? ' (ya asignada)' : ''}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                        {c.pair2 && (
                          <button onClick={() => updateConfig(round, i, { pair2: null })}
                            className="text-gray-600 hover:text-red-400 text-xs px-1 flex-shrink-0">✕</button>
                        )}
                      </div>

                      {/* Destino del ganador */}
                      {nextRound && nextCount > 0 && (
                        <div className="flex items-center gap-2 pt-1 border-t border-gray-200">
                          <span className="text-[10px] font-bold text-gray-600 w-16 flex-shrink-0">Ganador →</span>
                          <div className="flex gap-2 flex-1">
                            <select value={c.winnerToMatch ?? ''}
                              onChange={e => updateConfig(round, i, { winnerToMatch: e.target.value ? +e.target.value : null })}
                              className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 text-xs outline-none focus:border-green-600 cursor-pointer">
                              <option value="">Partido destino</option>
                              {Array.from({ length: nextCount }, (_, j) => (
                                <option key={j+1} value={j+1}>{ROUND_LABELS[nextRound]} #{j+1}</option>
                              ))}
                            </select>
                            <select value={c.winnerToSlot ?? ''}
                              onChange={e => updateConfig(round, i, { winnerToSlot: e.target.value ? +e.target.value as 1|2 : null })}
                              className="w-28 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 text-xs outline-none focus:border-green-600 cursor-pointer">
                              <option value="">Slot</option>
                              <option value={1}>Pareja 1</option>
                              <option value={2}>Pareja 2</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {totalMatches > 0 && (
        <button onClick={handleSave} disabled={saving}
          className="w-full bg-green-600 text-white font-['Bebas_Neue', sans-serif] text-lg font-bold py-3 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-40">
          {saving ? 'Guardando...' : `Publicar cuadro (${totalMatches} partidos) →`}
        </button>
      )}
      {fb && (
        <p className={`text-sm font-semibold mt-3 ${fb.startsWith('❌')||fb.startsWith('⚠') ? 'text-red-400' : 'text-green-600'}`}>{fb}</p>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────

export default function BracketManager({ tournamentId, zones, pairs, courtsCount, onRefresh }: Props) {
  const [standings,      setStandings]      = useState<Standing[]>([])
  const [bracketMatches, setBracketMatches] = useState<BMatch[]>([])
  const [loading,        setLoading]        = useState(true)
  const [activeRound,    setActiveRound]    = useState('roundof16')
  const [expandedId,     setExpandedId]     = useState<string | null>(null)
  const [view,           setView]           = useState<'setup' | 'manage'>('setup')
  const [confirmDelete,  setConfirmDelete]  = useState(false)
  const [fb,             setFb]             = useState('')

  function getPairName(id: string | null) {
    if (!id) return 'Por definir'
    return pairs.find(p => p.id === id)?.display_name ?? '—'
  }
  function showFb(msg: string) { setFb(msg); setTimeout(() => setFb(''), 4000) }

  useEffect(() => { load() }, [tournamentId])

  async function load() {
    setLoading(true)
    const [{ data: st }, { data: bm }] = await Promise.all([
      supabase.from('standings')
        .select('zone_id,pair_id,position,points')
        .in('zone_id', zones.map(z => z.id))
        .order('position'),
      supabase.from('matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .in('round', ROUND_ORDER)
        .order('match_order'),
    ])
    if (st) setStandings(st)
    if (bm) {
      setBracketMatches(bm)
      const rounds = [...new Set(bm.map(m => m.round))]
        .sort((a,b) => ROUND_ORDER.indexOf(a) - ROUND_ORDER.indexOf(b))
      if (rounds.length) setActiveRound(rounds[0])
      setView(bm.length > 0 ? 'manage' : 'setup')
    } else {
      setView('setup')
    }
    setLoading(false)
  }

  const existingRounds = [...new Set(bracketMatches.map(m => m.round))]
    .sort((a,b) => ROUND_ORDER.indexOf(a) - ROUND_ORDER.indexOf(b))

  const classified = zones.flatMap(z => {
    const zst = standings.filter(s => s.zone_id === z.id).sort((a,b) => a.position - b.position)
    const zone = zones.find(x => x.id === z.id)
    return zst.slice(0,2).map(s => ({
      pair_id: s.pair_id,
      zone: zone?.name ?? '?',
      position: s.position,
    }))
  })

  async function deleteAllBracket() {
    await supabase.from('matches')
      .delete().eq('tournament_id', tournamentId).in('round', ROUND_ORDER)
    setBracketMatches([])
    setConfirmDelete(false)
    setView('setup')
    showFb('✓ Cuadro eliminado.')
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-5 flex-wrap items-center">
        <button onClick={() => setView('setup')}
          className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
            view === 'setup' ? 'bg-green-600 text-black' : 'bg-gray-50 border border-gray-200 text-gray-600 hover:text-white'
          }`}>
          {bracketMatches.length > 0 ? '✏ Editar estructura' : '+ Armar cuadro'}
        </button>
        {bracketMatches.length > 0 && (
          <button onClick={() => setView('manage')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              view === 'manage' ? 'bg-green-600 text-black' : 'bg-gray-50 border border-gray-200 text-gray-600 hover:text-white'
            }`}>
            Gestionar partidos
          </button>
        )}
        {bracketMatches.length > 0 && (
          !confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="ml-auto px-3 py-1.5 rounded-lg text-sm font-semibold border border-red-500/25 text-red-400/60 bg-red-500/[0.05] hover:bg-red-500/10 transition-all">
              Borrar cuadro
            </button>
          ) : (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-red-400 font-bold">¿Borrar todo?</span>
              <button onClick={deleteAllBracket} className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600">Sí</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-600 px-2 hover:text-white">No</button>
            </div>
          )
        )}
      </div>

      {fb && <p className={`text-sm font-semibold mb-4 ${fb.startsWith('❌')||fb.startsWith('⚠') ? 'text-red-400' : 'text-green-600'}`}>{fb}</p>}

      {/* ── Armar cuadro ── */}
      {view === 'setup' && (
        <BracketSetup
          classified={classified}
          zones={zones}
          pairs={pairs}
          tournamentId={tournamentId}
          onSaved={() => { load(); onRefresh() }}
        />
      )}

      {/* ── Gestionar partidos ── */}
      {view === 'manage' && bracketMatches.length > 0 && (
        <>
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4">
            {existingRounds.map(r => {
              const rM = bracketMatches.filter(m => m.round === r)
              const done = rM.filter(m => m.status === 'done').length
              return (
                <button key={r} onClick={() => setActiveRound(r)}
                  className={`whitespace-nowrap px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${
                    activeRound === r ? 'bg-green-600 text-black'
                    : done === rM.length && rM.length > 0 ? 'bg-green-600/10 border border-green-600/30 text-green-600'
                    : 'bg-gray-50 border border-gray-200 text-gray-600 hover:text-white'
                  }`}>
                  {ROUND_LABELS_FULL[r]}
                  <span className="text-[10px] opacity-60">({done}/{rM.length})</span>
                </button>
              )
            })}
          </div>

          <div className="space-y-2">
            {bracketMatches
              .filter(m => m.round === activeRound)
              .sort((a,b) => (a.match_order ?? 0) - (b.match_order ?? 0))
              .map((m, idx) => {
                const isOpen   = expandedId === m.id
                const isDone   = m.status === 'done'
                const isLive   = m.status === 'live'
                const hasSched = !!m.day
                const score    = m.score as any[]

                return (
                  <div key={m.id} className={`rounded-xl border overflow-hidden transition-all ${
                    isDone  ? 'border-green-600/25 bg-green-600/[0.02]'
                    : isLive ? 'border-green-600/50'
                    : isOpen ? 'border-amber-400/35 bg-amber-400/[0.02]'
                    : 'border-gray-200 bg-white'
                  }`}>
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-left"
                      onClick={() => setExpandedId(isOpen ? null : m.id)}>
                      <span className="text-xs font-bold text-gray-600 w-5 flex-shrink-0">#{idx+1}</span>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-semibold truncate ${m.winner_pair_id === m.pair1_id ? 'text-green-600' : m.winner_pair_id ? 'text-gray-600' : ''}`}>
                          {getPairName(m.pair1_id)}
                        </div>
                        <div className="text-[10px] text-gray-600 my-0.5">vs</div>
                        <div className={`text-sm font-semibold truncate ${m.winner_pair_id === m.pair2_id ? 'text-green-600' : m.winner_pair_id ? 'text-gray-600' : ''}`}>
                          {getPairName(m.pair2_id)}
                        </div>
                        {/* Destino del ganador */}
                        {(m as any).winner_goes_to_match && (m as any).winner_goes_to_slot && (
                          <div className="text-[9px] text-gray-600 mt-0.5">
                            Ganador → {ROUND_LABELS[ROUND_ORDER[ROUND_ORDER.indexOf(m.round)+1]]} #{(m as any).winner_goes_to_match} · {(m as any).winner_goes_to_slot === 1 ? 'P1' : 'P2'}
                          </div>
                        )}
                      </div>
                      {isDone && score?.length > 0 && (
                        <div className="flex flex-col gap-0.5 flex-shrink-0 items-end">
                          {score.map((s:any, i:number) => (
                            <span key={i} className={`font-['Barlow_Condensed'] text-sm font-bold ${s.p1 > s.p2 ? 'text-green-600' : 'text-gray-600'}`}>
                              {s.p1}/{s.p2}
                            </span>
                          ))}
                        </div>
                      )}
                      {!isDone && hasSched && (
                        <div className="text-[9px] text-gray-600 flex-shrink-0 text-right">
                          <div>{displayDate(m.day)}</div>
                          <div>{m.scheduled_time?.slice(0,5)} · {m.court}</div>
                        </div>
                      )}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-1">
                        {isDone && <span className="text-[9px] font-bold text-green-600">✓</span>}
                        {isLive && <span className="text-[9px] font-bold text-green-600 animate-pulse">●</span>}
                        {!hasSched && !isDone && <span className="text-[9px] text-gray-600">Sin hora</span>}
                        <span className={`text-[10px] ${isOpen ? 'text-amber-400' : 'text-gray-600'}`}>
                          {isOpen ? '▲' : '▼'}
                        </span>
                      </div>
                    </button>
                    {isOpen && (
                      <EditPanel
                        match={m}
                        pairs={pairs}
                        courtsCount={courtsCount}
                        tournamentId={tournamentId}
                        onSaved={() => { load(); onRefresh() }}
                      />
                    )}
                  </div>
                )
              })}
          </div>
        </>
      )}
    </div>
  )
}
