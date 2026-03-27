import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import PairAssigner from '../components/PairAssigner'
import PairsManager from '../components/PairsManager'
import FixtureBuilder from '../components/FixtureBuilder'
import BracketManager from '../components/BracketManager'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-2">{label}</label>
      {children}
    </div>
  )
}

const inp = "w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-gray-900 text-sm outline-none focus:border-green-600 transition-colors shadow-sm"
const sel = inp + " cursor-pointer bg-white"

function Feedback({ msg }: { msg: string }) {
  if (!msg) return null
  const isError = msg.startsWith('❌') || msg.startsWith('⚠')
  return <p className={`text-sm font-semibold mt-3 ${isError ? 'text-red-400' : 'text-green-600'}`}>{msg}</p>
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <h3 className="font-['Bebas_Neue', sans-serif] text-xl font-bold mb-5 text-gray-900 tracking-wide">{title}</h3>
      {children}
    </div>
  )
}

interface Tournament { id: string; name: string; status: string; pairs_count: number }
interface Zone { id: string; name: string; order_num: number }
interface Pair { id: string; display_name: string }
interface Match {
  id: string
  pair1_id: string | null
  pair2_id: string | null
  zone_id: string | null
  round: string
  match_order: number | null
  scheduled_time: string | null
  court: string | null
  status: string
  day: string | null
  score: any
  winner_pair_id: string | null
  winner_goes_to_match?: number | null
  winner_goes_to_slot?: number | null
}

export default function Admin() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedTId, setSelectedTId] = useState('')
  const [zones, setZones] = useState<Zone[]>([])
  const [pairs, setPairs] = useState<Pair[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [zonePairs, setZonePairs] = useState<Record<string, string[]>>({}) // zone_id → pair_ids
  const [standings, setStandings] = useState<any[]>([])
  const [step, setStep] = useState<'create' | 'pairs' | 'matches' | 'results' | 'bracket' | 'status'>('create')

  useEffect(() => { loadTournaments() }, [])

  async function loadTournaments() {
    const { data } = await supabase.from('tournaments').select('id,name,status,pairs_count').order('created_at', { ascending: false })
    if (data) setTournaments(data)
  }

  async function loadTournamentData(tId: string) {
    setSelectedTId(tId)
    const [{ data: z }, { data: p }, { data: m }, { data: zp }] = await Promise.all([
      supabase.from('zones').select('*').eq('tournament_id', tId).order('order_num'),
      supabase.from('pairs').select('id,display_name').eq('tournament_id', tId),
      supabase.from('matches').select('*').eq('tournament_id', tId).order('scheduled_time'),
      supabase.from('zone_pairs').select('zone_id,pair_id'),
    ])
    if (z) {
      setZones(z)
      // Cargar standings de todas las zonas
      const zoneIds = z.map((zone: any) => zone.id)
      if (zoneIds.length > 0) {
        const { data: st } = await supabase.from('standings').select('*').in('zone_id', zoneIds)
        if (st) setStandings(st)
      }
    }
    if (p) setPairs(p)
    if (m) setMatches(m)
    if (zp) {
      const map: Record<string, string[]> = {}
      zp.forEach(({ zone_id, pair_id }) => {
        if (!map[zone_id]) map[zone_id] = []
        map[zone_id].push(pair_id)
      })
      setZonePairs(map)
    }
  }


  function getPairName(id: string) {
    return pairs.find(p => p.id === id)?.display_name ?? '—'
  }

  function timeToMinutes(t: string) {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  function minutesToTime(mins: number) {
    const h = Math.floor(mins / 60) % 24
    const m = mins % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  // ── PASO 1: Crear torneo ──────────────────────────────
  const [cf, setCf] = useState({
    name: '', category: 'Quinta', gender: 'male',
    pairs_count: 12, pairs_per_zone: 3, courts_count: 4,
    start_date: '', prize_first: '', prize_second: '', prize_third: '', prize_first_desc: '', prize_second_desc: '', prize_third_desc: '', rules: '',
  })
  const [fb1, setFb1] = useState('')

  async function handleCreate() {
    if (!cf.name || !cf.start_date) { setFb1('⚠ Completá nombre y fecha.'); return }
    const { data: clubs } = await supabase.from('clubs').select('id').limit(1)
    if (!clubs?.length) { setFb1('⚠ No hay clubs cargados.'); return }

    const zonesCount = Math.ceil(cf.pairs_count / cf.pairs_per_zone)
    const zoneNames = Array.from({ length: zonesCount }, (_, i) => String.fromCharCode(65 + i))

    const { data: t, error } = await supabase.from('tournaments').insert({
      club_id: clubs[0].id, name: cf.name, category: cf.category, gender: cf.gender,
      pairs_count: cf.pairs_count, courts_count: cf.courts_count,
      start_date: cf.start_date, status: 'upcoming',
      prize_pool: { first: +cf.prize_first || 0, second: +cf.prize_second || 0, third: +cf.prize_third || 0, first_desc: cf.prize_first_desc, second_desc: cf.prize_second_desc, third_desc: cf.prize_third_desc },
      rules: cf.rules || null,
    }).select().single()

    if (error || !t) { setFb1('❌ ' + error?.message); return }

    await supabase.from('zones').insert(
      zoneNames.map((name, i) => ({ tournament_id: t.id, name, order_num: i + 1 }))
    )

    setFb1(`✓ Torneo creado con ${zonesCount} zonas (${zoneNames.join(', ')})`)
    loadTournaments()
    loadTournamentData(t.id)
    setTimeout(() => setStep('pairs'), 1200)
  }

  // ── PASO 1: sub-vista ────────────────────────────────
  const [createView, setCreateView] = useState<'new' | 'edit'>('new')

  // Formulario de edición (se llena al seleccionar torneo existente)
  const [ef, setEf] = useState({
    name: '', category: 'Quinta', gender: 'male',
    pairs_count: 12, courts_count: 4,
    start_date: '', end_date: '',
    prize_first: '', prize_second: '', prize_third: '', prize_first_desc: '', prize_second_desc: '', prize_third_desc: '', rules: '',
  })
  const [fb1e, setFb1e] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Cargar datos del torneo en el formulario de edición
  function loadEditForm(tId: string) {
    const t = tournaments.find(x => x.id === tId)
    if (!t) return
    const prize = (t as any).prize_pool ?? {}
    setEf({
      name: (t as any).name ?? '',
      category: (t as any).category ?? 'Quinta',
      gender: (t as any).gender ?? 'male',
      pairs_count: (t as any).pairs_count ?? 12,
      courts_count: (t as any).courts_count ?? 4,
      start_date: (t as any).start_date ?? '',
      end_date: (t as any).end_date ?? '',
      prize_first: prize.first ? String(prize.first) : '',
      prize_second: prize.second ? String(prize.second) : '',
      prize_third: prize.third ? String(prize.third) : '',
      prize_first_desc: prize.first_desc ?? '',
      prize_second_desc: prize.second_desc ?? '',
      prize_third_desc: prize.third_desc ?? '',
      rules: (t as any).rules ?? '',
    })
    setFb1e('')
    setConfirmDelete(false)
  }

  async function handleUpdateTournament() {
    if (!selectedTId) { setFb1e('⚠ Seleccioná un torneo.'); return }
    if (!ef.name) { setFb1e('⚠ El nombre no puede estar vacío.'); return }
    const { error } = await supabase.from('tournaments').update({
      name: ef.name,
      category: ef.category,
      gender: ef.gender,
      pairs_count: +ef.pairs_count,
      courts_count: +ef.courts_count,
      start_date: ef.start_date || null,
      end_date: ef.end_date || null,
      prize_pool: {
        first: +ef.prize_first || 0,
        second: +ef.prize_second || 0,
        third: +ef.prize_third || 0,
        first_desc: ef.prize_first_desc,
        second_desc: ef.prize_second_desc,
        third_desc: ef.prize_third_desc,
      },
      rules: ef.rules || null,
    }).eq('id', selectedTId)
    if (error) setFb1e('❌ ' + error.message)
    else { setFb1e('✓ Torneo actualizado correctamente.'); loadTournaments() }
  }

  async function handleDeleteTournament() {
    if (!selectedTId) return
    setDeleting(true)
    // Borrar en cascada: standings → zone_pairs → matches → pairs → zones → tournament
    await supabase.from('standings').delete().in(
      'zone_id', zones.map(z => z.id)
    )
    await supabase.from('zone_pairs').delete().in(
      'zone_id', zones.map(z => z.id)
    )
    await supabase.from('matches').delete().eq('tournament_id', selectedTId)
    await supabase.from('pairs').delete().eq('tournament_id', selectedTId)
    await supabase.from('zones').delete().eq('tournament_id', selectedTId)
    const { error } = await supabase.from('tournaments').delete().eq('id', selectedTId)
    if (error) { setFb1e('❌ ' + error.message); setDeleting(false); return }
    setSelectedTId('')
    setZones([])
    setPairs([])
    setMatches([])
    setZonePairs({})
    setConfirmDelete(false)
    setDeleting(false)
    loadTournaments()
    setFb1e('✓ Torneo eliminado.')
  }
  const [pairLines, setPairLines] = useState('')
  const [fb2, setFb2] = useState('')
  const [pairsLoaded, setPairsLoaded] = useState(false)
  // 'load' | 'assign' | 'manage'
  const [pairsView, setPairsView] = useState<'load' | 'assign' | 'manage'>('load')

  async function handleLoadPairs() {
    if (!selectedTId) { setFb2('⚠ Seleccioná un torneo.'); return }
    const names = pairLines.split('\n').map(l => l.trim()).filter(Boolean)
    if (!names.length) { setFb2('⚠ Ingresá al menos una pareja.'); return }

    const { data: newPairs, error } = await supabase
      .from('pairs')
      .insert(names.map(n => ({ tournament_id: selectedTId, display_name: n })))
      .select('id, display_name')

    if (error || !newPairs) { setFb2('❌ ' + error?.message); return }

    setFb2(`✓ ${newPairs.length} parejas cargadas. Ahora asignales la zona.`)
    loadTournamentData(selectedTId)
    setTimeout(() => setPairsView('assign'), 800)
  }

  // ── PASO 3: Generar fixture ───────────────────────────
  const [fixtureDay, setFixtureDay] = useState('Viernes')
  const [fixtureStart, setFixtureStart] = useState('20:00')
  const [fixtureInterval, setFixtureInterval] = useState(90)
  const [fb3, setFb3] = useState('')

  async function handleGenerateFixture() {
    if (!selectedTId) { setFb3('⚠ Seleccioná un torneo.'); return }

    const { data: zns } = await supabase.from('zones').select('id').eq('tournament_id', selectedTId).order('order_num')
    if (!zns?.length) { setFb3('⚠ Sin zonas.'); return }

    const { data: tData } = await supabase.from('tournaments').select('courts_count').eq('id', selectedTId).single()
    const courts = tData?.courts_count ?? 4

    const allMatches: any[] = []
    let timeMinutes = timeToMinutes(fixtureStart)
    let courtIdx = 0

    for (const zone of zns) {
      const { data: zp } = await supabase.from('zone_pairs').select('pair_id').eq('zone_id', zone.id)
      if (!zp?.length) continue
      const pairIds = zp.map(z => z.pair_id)

      for (let i = 0; i < pairIds.length; i++) {
        for (let j = i + 1; j < pairIds.length; j++) {
          allMatches.push({
            tournament_id: selectedTId, zone_id: zone.id, round: 'groups',
            pair1_id: pairIds[i], pair2_id: pairIds[j],
            court: `Cancha ${(courtIdx % courts) + 1}`,
            day: fixtureDay,
            scheduled_time: minutesToTime(timeMinutes),
            status: 'upcoming',
          })
          courtIdx++
          if (courtIdx % courts === 0) timeMinutes += fixtureInterval
        }
      }
    }

    const { error } = await supabase.from('matches').insert(allMatches)
    if (error) { setFb3('❌ ' + error.message); return }

    setFb3(`✓ ${allMatches.length} partidos generados.`)
    loadTournamentData(selectedTId)
    setTimeout(() => setStep('results'), 1500)
  }

  // ── PASO 4: Resultados ───────────────────────────────
  const [selMatch, setSelMatch] = useState('')
  const [scoreInput, setScoreInput] = useState('6/3 6/4')
  const [winnerNum, setWinnerNum] = useState<'1' | '2'>('1')
  const [fb4, setFb4] = useState('')
  const [resultsZone, setResultsZone] = useState('all')
  const [editingMatch, setEditingMatch] = useState('')  // id del partido done que se está editando

  function openEditMatch(m: Match) {
    // Precarga el score y ganador actuales
    const scoreStr = (m.score as any[])?.map((s: any) => `${s.p1}/${s.p2}`).join(' ') ?? ''
    setEditingMatch(m.id)
    setSelMatch(m.id)
    setScoreInput(scoreStr)
    // Detectar ganador actual
    if (m.winner_pair_id === m.pair1_id) setWinnerNum('1')
    else if (m.winner_pair_id === m.pair2_id) setWinnerNum('2')
    else setWinnerNum('1')
  }

  function closeEditMatch() {
    setEditingMatch('')
    setSelMatch('')
    setScoreInput('6/3 6/4')
    setWinnerNum('1')
  }

  async function handleSaveResult() {
    if (!selMatch) { setFb4('⚠ Seleccioná un partido.'); return }
    const sets = scoreInput.trim().split(/\s+/).map((s, i) => {
      const [p1, p2] = s.split('/').map(Number)
      return { set: i + 1, p1, p2 }
    })
    const match = matches.find(m => m.id === selMatch)
    if (!match) { setFb4('⚠ Partido no encontrado.'); return }

    const winnerId = winnerNum === '1' ? match.pair1_id : match.pair2_id

    // Si es edición de un partido ya jugado, primero revertir standings
    if (editingMatch) {
      // Revertir el efecto anterior del partido en standings antes de re-guardar
      const prev = match.score as any[]
      if (prev?.length) {
        const prevP1Sets = prev.filter((s: any) => s.p1 > s.p2).length
        const prevP2Sets = prev.filter((s: any) => s.p2 > s.p1).length
        const prevP1Games = prev.reduce((a: number, s: any) => a + s.p1, 0)
        const prevP2Games = prev.reduce((a: number, s: any) => a + s.p2, 0)
        const prevWinnerId = match.winner_pair_id

        // Restar de standings pareja 1
        await supabase.rpc('revert_match_standings', {
          p_zone_id: match.zone_id,
          p_pair_id: match.pair1_id,
          p_sets_won: prevP1Sets,
          p_sets_lost: prevP2Sets,
          p_games_won: prevP1Games,
          p_games_lost: prevP2Games,
          p_won: prevWinnerId === match.pair1_id ? 1 : 0,
        })
        // Restar de standings pareja 2
        await supabase.rpc('revert_match_standings', {
          p_zone_id: match.zone_id,
          p_pair_id: match.pair2_id,
          p_sets_won: prevP2Sets,
          p_sets_lost: prevP1Sets,
          p_games_won: prevP2Games,
          p_games_lost: prevP1Games,
          p_won: prevWinnerId === match.pair2_id ? 1 : 0,
        })
      }
    }

    const { error } = await supabase.rpc('save_match_result', {
      p_match_id: selMatch, p_score: sets, p_winner_id: winnerId,
    })

    if (error) setFb4('❌ ' + error.message)
    else {
      setFb4(editingMatch ? '✓ Resultado actualizado.' : '✓ Resultado guardado.')
      setEditingMatch('')
      setSelMatch('')
      setScoreInput('6/3 6/4')
      setWinnerNum('1')
      loadTournamentData(selectedTId)
    }
  }

  // ── PASO 5: Estados + Cuadro ─────────────────────────
  const [liveMatchId, setLiveMatchId] = useState('')
  const [liveStatus, setLiveStatus] = useState('live')
  const [tourneyStatus, setTourneyStatus] = useState('live')
  const [fb5a, setFb5a] = useState('')
  const [fb5b, setFb5b] = useState('')
  const [fb5c, setFb5c] = useState('')
  const [statusView, setStatusView] = useState<'matches' | 'bracket' | 'tourney'>('matches')
  const [advancingPairs, setAdvancingPairs] = useState<Record<string, string>>({}) // zone_id → pair_id
  const [bracketDate, setBracketDate] = useState('')
  const [bracketStartTime, setBracketStartTime] = useState('16:00')
  const [bracketInterval, setBracketInterval] = useState(90)
  const [bracketCourt, setBracketCourt] = useState('Cancha 1')

  // Calcular clasificados por zona (top N según standings)
  const classifiedPerZone = 2  // primeros 2 de cada zona pasan
  const classified = zones.flatMap(zone => {
    return standings
      .filter(s => s.zone_id === zone.id)
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points
        if ((b.sets_won - b.sets_lost) !== (a.sets_won - a.sets_lost))
          return (b.sets_won - b.sets_lost) - (a.sets_won - a.sets_lost)
        return (b.games_won - b.games_lost) - (a.games_won - a.games_lost)
      })
      .slice(0, classifiedPerZone)
      .map((s, pos) => ({ zoneId: zone.id, zoneName: zone.name, pairId: s.pair_id, position: pos + 1 }))
  })

  async function handleGenerateBracket() {
    if (!selectedTId) { setFb5c('⚠ Seleccioná un torneo.'); return }
    if (classified.length < 2) { setFb5c('⚠ No hay suficientes clasificados. Completá los resultados de grupos primero.'); return }
    if (!bracketDate) { setFb5c('⚠ Seleccioná una fecha para el cuadro.'); return }

    // Determinar ronda según cantidad de clasificados
    const n = classified.length
    const round = n <= 2 ? 'final' : n <= 4 ? 'semis' : n <= 8 ? 'quarters' : 'quarters'

    // Armar cruces: 1°ZonaA vs 2°ZonaB, 1°ZonaB vs 2°ZonaA, etc.
    const firstPlace = classified.filter(c => c.position === 1)
    const secondPlace = classified.filter(c => c.position === 2)

    const matchups: { p1: string; p2: string }[] = []
    firstPlace.forEach((fp, i) => {
      // Cruzar con segundo de otra zona (siguiente en el array circular)
      const sp = secondPlace[(i + 1) % secondPlace.length]
      if (sp) matchups.push({ p1: fp.pairId, p2: sp.pairId })
    })

    if (!matchups.length) { setFb5c('⚠ No se pudieron armar los cruces.'); return }

    let timeMin = timeToMinutes(bracketStartTime)
    const toInsert = matchups.map((m, i) => ({
      tournament_id: selectedTId,
      zone_id: null,
      round,
      match_order: i + 1,
      pair1_id: m.p1,
      pair2_id: m.p2,
      day: bracketDate,
      scheduled_time: minutesToTime(timeMin + i * bracketInterval) + ':00',
      court: bracketCourt,
      status: 'upcoming',
    }))

    const { error } = await supabase.from('matches').insert(toInsert)
    if (error) setFb5c('❌ ' + error.message)
    else {
      setFb5c(`✓ Cuadro generado: ${toInsert.length} partido${toInsert.length > 1 ? 's' : ''} (${round}).`)
      loadTournamentData(selectedTId)
    }
  }


  async function handleSetMatchStatus() {
    if (!liveMatchId) { setFb5a('⚠ Seleccioná un partido.'); return }
    const { error } = await supabase.from('matches').update({ status: liveStatus }).eq('id', liveMatchId)
    if (error) setFb5a('❌ ' + error.message)
    else { setFb5a('✓ Estado actualizado.'); loadTournamentData(selectedTId) }
  }

  async function handleSetTourneyStatus() {
    if (!selectedTId) { setFb5b('⚠ Seleccioná un torneo.'); return }
    const { error } = await supabase.from('tournaments').update({ status: tourneyStatus }).eq('id', selectedTId)
    if (error) setFb5b('❌ ' + error.message)
    else { setFb5b('✓ Estado del torneo actualizado.'); loadTournaments() }
  }

  // ── Render ───────────────────────────────────────────
  const STEPS = [
    { id: 'create',  label: '1. Torneo' },
    { id: 'pairs',   label: '2. Parejas' },
    { id: 'matches', label: '3. Fixture' },
    { id: 'results', label: '4. Resultados' },
    { id: 'bracket', label: '5. Cuadro' },
    { id: 'status',  label: '6. Estados' },
  ] as const

  const pendingMatches = matches.filter(m => m.status !== 'done')
  const doneMatches = matches.filter(m => m.status === 'done')
  const zonesCount = Math.ceil(cf.pairs_count / cf.pairs_per_zone)
  const zonePreview = Array.from({ length: zonesCount }, (_, i) => String.fromCharCode(65 + i))

  return (
    <div>
      <div className="py-7 border-b border-gray-100 mb-6 flex items-center gap-3">
        <div>
          <h2 className="font-['Barlow_Condensed'] text-4xl font-extrabold tracking-tight">Panel Admin</h2>
          <p className="text-gray-500 text-sm mt-1">Gestión de torneos en tiempo real</p>
        </div>
        <span className="text-[11px] font-bold bg-amber-400/15 text-amber-400 border border-amber-400/30 px-2.5 py-1 rounded-full tracking-wider">
          ORGANIZADOR
        </span>
      </div>

      {/* Stepper */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-6">
        {STEPS.map(s => (
          <button key={s.id} onClick={() => setStep(s.id)}
            className={`whitespace-nowrap px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
              step === s.id ? 'bg-green-600 text-white' : 'bg-gray-50 border border-gray-100 text-gray-400 hover:text-gray-900'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Selector torneo (pasos 2-5) */}
      {step !== 'create' && (
        <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 mb-5 flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold tracking-widest text-gray-400 uppercase whitespace-nowrap">Torneo</span>
          <select className={sel + ' flex-1 min-w-0'} value={selectedTId} onChange={e => loadTournamentData(e.target.value)}>
            <option value="">— Seleccioná —</option>
            {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {selectedTId && (
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {zones.length} zonas · {pairs.length} parejas · {matches.length} partidos
            </span>
          )}
        </div>
      )}

      {/* ── 1. Crear / editar torneo ── */}
      {step === 'create' && (
        <Card title="🏆 Torneos">

          {/* Sub-navegación */}
          <div className="flex gap-1.5 mb-5">
            {[
              { id: 'new',  label: 'Nuevo torneo' },
              { id: 'edit', label: `Editar existente${selectedTId ? ' ✓' : ''}` },
            ].map(v => (
              <button key={v.id}
                onClick={() => {
                  setCreateView(v.id as any)
                  if (v.id === 'edit' && selectedTId) loadEditForm(selectedTId)
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  createView === v.id
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-50 border border-gray-100 text-gray-400 hover:text-gray-900'
                }`}>
                {v.label}
              </button>
            ))}
          </div>

          {/* ── Sub-vista: Nuevo torneo ── */}
          {createView === 'new' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <Field label="Nombre">
                  <input className={inp} value={cf.name} onChange={e => setCf(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Quinta Caballeros" />
                </Field>
                <Field label="Categoría">
                  <select className={sel} value={cf.category} onChange={e => setCf(f => ({ ...f, category: e.target.value }))}>
                    {['Primera','Segunda','Tercera','Cuarta','Quinta','Sexta','Séptima','Octava','Mixto'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Género">
                  <select className={sel} value={cf.gender} onChange={e => setCf(f => ({ ...f, gender: e.target.value }))}>
                    <option value="male">Caballeros</option>
                    <option value="female">Damas</option>
                    <option value="mixed">Mixto</option>
                  </select>
                </Field>
                <Field label="Fecha inicio">
                  <input className={inp} type="date" value={cf.start_date} onChange={e => setCf(f => ({ ...f, start_date: e.target.value }))} />
                </Field>
                <Field label="Total de parejas">
                  <input className={inp} type="number" min={2} value={cf.pairs_count} onChange={e => setCf(f => ({ ...f, pairs_count: +e.target.value }))} />
                </Field>
                <Field label="Parejas por zona">
                  <select className={sel} value={cf.pairs_per_zone} onChange={e => setCf(f => ({ ...f, pairs_per_zone: +e.target.value }))}>
                    {[2,3,4,5,6].map(n => <option key={n} value={n}>{n} por zona</option>)}
                  </select>
                </Field>
                <Field label="Canchas disponibles">
                  <input className={inp} type="number" min={1} value={cf.courts_count} onChange={e => setCf(f => ({ ...f, courts_count: +e.target.value }))} />
                </Field>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 mb-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">Zonas a crear:</span>
                {zonePreview.map(z => (
                  <span key={z} className="bg-green-600/10 border border-green-500/20 text-green-600 text-xs font-bold px-2 py-0.5 rounded-full">
                    Zona {z}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <Field label="Premio 1° ($)">
                  <input className={inp} type="number" placeholder="200000" value={cf.prize_first} onChange={e => setCf(f => ({ ...f, prize_first: e.target.value }))} />
                </Field>
                <Field label="Descripción 1° (opcional)">
                  <input className={inp} placeholder="Trofeo + indumentaria" value={cf.prize_first_desc} onChange={e => setCf(f => ({ ...f, prize_first_desc: e.target.value }))} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <Field label="Premio 2° ($)">
                  <input className={inp} type="number" placeholder="120000" value={cf.prize_second} onChange={e => setCf(f => ({ ...f, prize_second: e.target.value }))} />
                </Field>
                <Field label="Descripción 2° (opcional)">
                  <input className={inp} placeholder="Trofeo + voucher" value={cf.prize_second_desc} onChange={e => setCf(f => ({ ...f, prize_second_desc: e.target.value }))} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Field label="Premio 3° ($)">
                  <input className={inp} type="number" placeholder="60000" value={cf.prize_third} onChange={e => setCf(f => ({ ...f, prize_third: e.target.value }))} />
                </Field>
                <Field label="Descripción 3° (opcional)">
                  <input className={inp} placeholder="Medallas" value={cf.prize_third_desc} onChange={e => setCf(f => ({ ...f, prize_third_desc: e.target.value }))} />
                </Field>
              </div>
              <Field label="Reglamento (opcional)">
                <textarea className={inp + ' resize-none h-20'} placeholder="Fase de grupos: todos contra todos..." value={cf.rules} onChange={e => setCf(f => ({ ...f, rules: e.target.value }))} />
              </Field>
              <button onClick={handleCreate} className="w-full bg-green-600 text-white font-['Barlow_Condensed'] text-lg font-bold py-3 rounded-xl hover:bg-green-700 transition-colors">
                Crear torneo y generar zonas →
              </button>
              <Feedback msg={fb1} />
            </>
          )}

          {/* ── Sub-vista: Editar existente ── */}
          {createView === 'edit' && (
            <>
              {/* Selector de torneo */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 mb-5 flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold tracking-widest text-gray-400 uppercase whitespace-nowrap">Torneo</span>
                <select
                  className={sel + ' flex-1 min-w-0'}
                  value={selectedTId}
                  onChange={e => { loadTournamentData(e.target.value); loadEditForm(e.target.value) }}
                >
                  <option value="">— Seleccioná un torneo —</option>
                  {tournaments.map(t => <option key={t.id} value={t.id}>{(t as any).name}</option>)}
                </select>
              </div>

              {!selectedTId ? (
                <p className="text-gray-400 text-sm py-4">Seleccioná un torneo para editarlo.</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                    <Field label="Nombre">
                      <input className={inp} value={ef.name} onChange={e => setEf(f => ({ ...f, name: e.target.value }))} />
                    </Field>
                    <Field label="Categoría">
                      <select className={sel} value={ef.category} onChange={e => setEf(f => ({ ...f, category: e.target.value }))}>
                        {['Primera','Segunda','Tercera','Cuarta','Quinta','Sexta','Séptima','Octava','Mixto'].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </Field>
                    <Field label="Género">
                      <select className={sel} value={ef.gender} onChange={e => setEf(f => ({ ...f, gender: e.target.value }))}>
                        <option value="male">Caballeros</option>
                        <option value="female">Damas</option>
                        <option value="mixed">Mixto</option>
                      </select>
                    </Field>
                    <Field label="Canchas disponibles">
                      <input className={inp} type="number" min={1} value={ef.courts_count} onChange={e => setEf(f => ({ ...f, courts_count: +e.target.value }))} />
                    </Field>
                    <Field label="Fecha inicio">
                      <input className={inp} type="date" value={ef.start_date} onChange={e => setEf(f => ({ ...f, start_date: e.target.value }))} />
                    </Field>
                    <Field label="Fecha fin">
                      <input className={inp} type="date" value={ef.end_date} onChange={e => setEf(f => ({ ...f, end_date: e.target.value }))} />
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <Field label="Premio 1° ($)">
                      <input className={inp} type="number" value={ef.prize_first} onChange={e => setEf(f => ({ ...f, prize_first: e.target.value }))} />
                    </Field>
                    <Field label="Descripción 1° (opcional)">
                      <input className={inp} placeholder="Trofeo + indumentaria" value={ef.prize_first_desc} onChange={e => setEf(f => ({ ...f, prize_first_desc: e.target.value }))} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <Field label="Premio 2° ($)">
                      <input className={inp} type="number" value={ef.prize_second} onChange={e => setEf(f => ({ ...f, prize_second: e.target.value }))} />
                    </Field>
                    <Field label="Descripción 2° (opcional)">
                      <input className={inp} placeholder="Trofeo + voucher" value={ef.prize_second_desc} onChange={e => setEf(f => ({ ...f, prize_second_desc: e.target.value }))} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <Field label="Premio 3° ($)">
                      <input className={inp} type="number" value={ef.prize_third} onChange={e => setEf(f => ({ ...f, prize_third: e.target.value }))} />
                    </Field>
                    <Field label="Descripción 3° (opcional)">
                      <input className={inp} placeholder="Medallas" value={ef.prize_third_desc} onChange={e => setEf(f => ({ ...f, prize_third_desc: e.target.value }))} />
                    </Field>
                  </div>

                  <Field label="Reglamento">
                    <textarea className={inp + ' resize-none h-20'} value={ef.rules} onChange={e => setEf(f => ({ ...f, rules: e.target.value }))} />
                  </Field>

                  <button onClick={handleUpdateTournament}
                    className="w-full bg-green-600 text-white font-['Barlow_Condensed'] text-lg font-bold py-3 rounded-xl hover:bg-green-700 transition-colors mb-4">
                    Guardar cambios
                  </button>
                  <Feedback msg={fb1e} />

                  {/* Zona peligrosa — eliminar torneo */}
                  <div className="mt-6 border border-red-500/20 rounded-xl p-4">
                    <div className="text-xs font-bold tracking-widest text-red-400/70 uppercase mb-3">Zona peligrosa</div>
                    {!confirmDelete ? (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="w-full bg-red-500/10 border border-red-500/30 text-red-400 font-['Barlow_Condensed'] text-lg font-bold py-3 rounded-xl hover:bg-red-500/20 transition-colors"
                      >
                        Eliminar torneo
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm">
                          <p className="font-bold text-red-400 mb-1">⚠ Esta acción no se puede deshacer.</p>
                          <p className="text-gray-500">Se eliminarán todas las zonas, parejas, partidos y posiciones de este torneo.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setConfirmDelete(false)}
                            className="py-3 rounded-xl border border-gray-200 text-gray-500 font-semibold hover:text-gray-900 transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleDeleteTournament}
                            disabled={deleting}
                            className="py-3 rounded-xl bg-red-500 text-white font-['Barlow_Condensed'] text-lg font-bold hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            {deleting ? 'Eliminando...' : 'Sí, eliminar todo'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

        </Card>
      )}

      {/* ── 2. Cargar parejas ── */}
      {step === 'pairs' && (
        <Card title="👥 Parejas">

          {/* Sub-navegación */}
          <div className="flex gap-1.5 mb-5">
            {[
              { id: 'load',   label: 'Cargar nuevas' },
              { id: 'assign', label: 'Asignar zonas' },
              { id: 'manage', label: `Gestionar (${pairs.length})` },
            ].map(v => (
              <button key={v.id} onClick={() => setPairsView(v.id as any)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  pairsView === v.id
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-50 border border-gray-100 text-gray-400 hover:text-gray-900'
                }`}>
                {v.label}
              </button>
            ))}
          </div>

          {/* Cargar nuevas */}
          {pairsView === 'load' && (
            <>
              <p className="text-gray-400 text-sm mb-4">
                Una pareja por línea. Después las asignás a cada zona manualmente.
              </p>
              {zones.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-4">
                  {zones.map(z => (
                    <span key={z.id} className="bg-green-600/10 border border-green-500/20 text-green-600 text-xs font-bold px-2.5 py-1 rounded-full">
                      Zona {z.name}
                    </span>
                  ))}
                </div>
              )}
              <Field label="Parejas (una por línea)">
                <textarea
                  className={inp + ' resize-none h-72 font-mono text-sm leading-loose'}
                  placeholder={"García / Pérez\nRodríguez / López\nHerrera / Silva\nMartínez / Gómez\n..."}
                  value={pairLines}
                  onChange={e => setPairLines(e.target.value)}
                />
              </Field>
              <div className="flex justify-between text-xs text-gray-400 -mt-2 mb-4">
                <span>{pairLines.split('\n').filter(l => l.trim()).length} parejas</span>
              </div>
              <button onClick={handleLoadPairs} className="w-full bg-green-600 text-white font-['Barlow_Condensed'] text-lg font-bold py-3 rounded-xl hover:bg-green-700 transition-colors">
                Cargar parejas →
              </button>
              <Feedback msg={fb2} />
            </>
          )}

          {/* Asignar zonas */}
          {pairsView === 'assign' && (
            <>
              {!selectedTId || zones.length === 0 ? (
                <p className="text-gray-400 text-sm">Seleccioná un torneo con zonas cargadas.</p>
              ) : pairs.length === 0 ? (
                <p className="text-gray-400 text-sm">No hay parejas aún. Cargalas primero.</p>
              ) : (
                <>
                  <p className="text-gray-400 text-sm mb-5">
                    Asigná cada pareja a su zona según disponibilidad horaria.
                  </p>
                  <PairAssigner
                    tournamentId={selectedTId}
                    zones={zones}
                    pairs={pairs}
                    onDone={() => { loadTournamentData(selectedTId); setStep('matches') }}
                  />
                </>
              )}
            </>
          )}

          {/* Gestionar parejas existentes */}
          {pairsView === 'manage' && (
            <>
              {pairs.length === 0 ? (
                <p className="text-gray-400 text-sm">No hay parejas cargadas en este torneo.</p>
              ) : (
                <PairsManager
                  tournamentId={selectedTId}
                  zones={zones}
                  pairs={pairs}
                  zonePairs={zonePairs}
                  onRefresh={() => loadTournamentData(selectedTId)}
                />
              )}
            </>
          )}

        </Card>
      )}

      {/* ── 3. Fixture ── */}
      {step === 'matches' && (
        <Card title="📅 Programar fixture">
          {!selectedTId ? (
            <p className="text-gray-400 text-sm">Seleccioná un torneo arriba.</p>
          ) : zones.length === 0 ? (
            <p className="text-gray-400 text-sm">El torneo no tiene zonas cargadas.</p>
          ) : Object.keys(zonePairs).length === 0 ? (
            <p className="text-gray-400 text-sm">Primero asigná las parejas a las zonas (paso 2).</p>
          ) : (
            <FixtureBuilder
              tournamentId={selectedTId}
              zones={zones}
              pairs={pairs}
              zonePairs={zonePairs}
              courtsCount={tournaments.find(t => t.id === selectedTId)?.pairs_count ?? 4}
              onDone={() => { loadTournamentData(selectedTId); setStep('results') }}
            />
          )}
        </Card>
      )}

      {/* ── 4. Resultados ── */}
      {step === 'results' && (() => {
        // Tabs de zona
        const zoneTabs = [{ id: 'all', label: 'Todos' }, ...zones.map(z => ({ id: z.id, label: `Zona ${z.name}` }))]

        // Partidos filtrados por zona activa
        const visiblePending = pendingMatches.filter(m =>
          resultsZone === 'all' || m.zone_id === resultsZone
        )
        const visibleDone = doneMatches.filter(m =>
          resultsZone === 'all' || m.zone_id === resultsZone
        )

        // Cuando cambia zona, limpiar selección si el partido seleccionado no está en la zona
        const selectedMatch = matches.find(m => m.id === selMatch)
        const selMatchInZone = !selMatch || resultsZone === 'all' || selectedMatch?.zone_id === resultsZone

        return (
          <Card title="📝 Cargar resultados">
            {/* Tabs de zona */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5">
              {zoneTabs.map(tab => {
                const tabPending = tab.id === 'all'
                  ? pendingMatches.length
                  : pendingMatches.filter(m => m.zone_id === tab.id).length
                const tabDone = tab.id === 'all'
                  ? doneMatches.length
                  : doneMatches.filter(m => m.zone_id === tab.id).length
                const allDone = tabPending === 0 && tabDone > 0
                return (
                  <button key={tab.id}
                    onClick={() => { setResultsZone(tab.id); setSelMatch('') }}
                    className={`whitespace-nowrap px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${
                      resultsZone === tab.id
                        ? 'bg-green-600 text-white'
                        : allDone
                        ? 'bg-green-600/10 border border-green-500/30 text-green-600'
                        : 'bg-gray-50 border border-gray-100 text-gray-400 hover:text-gray-900'
                    }`}>
                    {tab.label}
                    {tab.id !== 'all' && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        allDone ? 'bg-green-600/20 text-green-600' : 'bg-white/[0.08] text-gray-400'
                      }`}>
                        {allDone ? '✓' : `${tabDone}/${tabDone + tabPending}`}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Lista de partidos pendientes de la zona */}
            {visiblePending.length === 0 && visibleDone.length === 0 ? (
              <p className="text-gray-400 text-sm py-4">No hay partidos en esta zona.</p>
            ) : (
              <>
                {visiblePending.length > 0 && (
                  <div className="mb-5">
                    <div className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-3">
                      Pendientes ({visiblePending.length})
                    </div>
                    <div className="space-y-2">
                      {visiblePending
                        .sort((a, b) => (a.scheduled_time ?? '').localeCompare(b.scheduled_time ?? ''))
                        .map(m => {
                          const isSelected = selMatch === m.id
                          const zone = zones.find(z => z.id === m.zone_id)
                          return (
                            <div key={m.id}
                              className={`rounded-xl border transition-all overflow-hidden ${
                                isSelected
                                  ? 'border-amber-400/50 bg-amber-400/[0.04]'
                                  : 'border-gray-100 bg-gray-50 hover:border-gray-300 cursor-pointer'
                              }`}>
                              {/* Fila del partido */}
                              <button
                                className="w-full flex items-center gap-3 px-4 py-3 text-left"
                                onClick={() => {
                                  setSelMatch(isSelected ? '' : m.id)
                                  setScoreInput('6/3 6/4')
                                  setWinnerNum('1')
                                }}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs text-gray-400 mb-0.5">
                                    {zone ? `Zona ${zone.name}` : ''} · {m.day} {m.scheduled_time?.slice(0,5)} · {m.court}
                                  </div>
                                  <div className="text-sm font-semibold truncate">
                                    {getPairName(m.pair1_id)}
                                    <span className="text-gray-400 font-normal mx-2">vs</span>
                                    {getPairName(m.pair2_id)}
                                  </div>
                                </div>
                                <span className={`text-xs font-bold transition-colors flex-shrink-0 ${isSelected ? 'text-amber-400' : 'text-gray-300'}`}>
                                  {isSelected ? '▲ ocultar' : '▼ cargar'}
                                </span>
                              </button>

                              {/* Panel de carga expandible */}
                              {isSelected && (
                                <div className="border-t border-gray-100 px-4 py-4">
                                  <div className="mb-3">
                                    <div className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-2">Score</div>
                                    <input
                                      className={inp}
                                      value={scoreInput}
                                      onChange={e => setScoreInput(e.target.value)}
                                      placeholder="6/3 6/4"
                                      autoFocus
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Separar sets con espacio · Formato: p1/p2</p>
                                  </div>
                                  <div className="mb-4">
                                    <div className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-2">Ganador</div>
                                    <div className="grid grid-cols-2 gap-2">
                                      {(['1','2'] as const).map(n => (
                                        <button key={n} onClick={() => setWinnerNum(n)}
                                          className={`px-3 py-2.5 rounded-xl border text-sm font-semibold text-left transition-all ${
                                            winnerNum === n
                                              ? 'bg-green-600/10 border-green-500/50 text-green-600'
                                              : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-900'
                                          }`}>
                                          <div className="text-xs text-gray-400 mb-0.5">Pareja {n}</div>
                                          <div className="truncate">{n === '1' ? getPairName(m.pair1_id) : getPairName(m.pair2_id)}</div>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <button onClick={handleSaveResult}
                                    className="w-full bg-amber-400 text-white font-['Barlow_Condensed'] text-lg font-bold py-2.5 rounded-xl hover:bg-amber-500 transition-colors">
                                    Guardar resultado
                                  </button>
                                  <Feedback msg={fb4} />
                                </div>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}

                {/* Ya jugados */}
                {visibleDone.length > 0 && (
                  <div>
                    <div className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-3">
                      Ya jugados ({visibleDone.length})
                    </div>
                    <div className="space-y-2">
                      {visibleDone.map(m => {
                        const zone = zones.find(z => z.id === m.zone_id)
                        const score = m.score as any[]
                        const isEditing = editingMatch === m.id
                        return (
                          <div key={m.id} className={`rounded-xl border overflow-hidden transition-all ${
                            isEditing ? 'border-amber-400/50 bg-amber-400/[0.03]' : 'border-green-500/15 bg-green-600/[0.02]'
                          }`}>
                            {/* Fila resumen */}
                            <div className="flex items-center gap-3 px-4 py-3">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-gray-400 mb-0.5">
                                  {zone ? `Zona ${zone.name}` : ''} · {m.scheduled_time?.slice(0,5)} · {m.court}
                                </div>
                                <div className="text-sm font-semibold truncate text-gray-700">
                                  {getPairName(m.pair1_id)}
                                  <span className="text-gray-300 font-normal mx-2">vs</span>
                                  {getPairName(m.pair2_id)}
                                </div>
                              </div>
                              {/* Score chips */}
                              <div className="flex gap-1 flex-shrink-0">
                                {score?.map((s: any, i: number) => (
                                  <span key={i} className={`font-['Barlow_Condensed'] text-base font-bold px-2 py-0.5 rounded-md ${
                                    s.p1 > s.p2 ? 'bg-green-600/10 text-green-600' : 'bg-white/[0.06] text-gray-400'
                                  }`}>
                                    {s.p1}/{s.p2}
                                  </span>
                                ))}
                              </div>
                              {/* Botón editar / cerrar */}
                              <button
                                onClick={() => isEditing ? closeEditMatch() : openEditMatch(m)}
                                className={`flex-shrink-0 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                                  isEditing
                                    ? 'bg-white/[0.06] border-gray-200 text-gray-400 hover:text-gray-900'
                                    : 'bg-amber-400/10 border-amber-400/30 text-amber-400 hover:bg-amber-400/20'
                                }`}
                              >
                                {isEditing ? '✕ cancelar' : '✏ editar'}
                              </button>
                            </div>

                            {/* Panel edición expandible */}
                            {isEditing && (
                              <div className="border-t border-gray-100 px-4 py-4">
                                <div className="mb-3">
                                  <div className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-2">Nuevo score</div>
                                  <input
                                    className={inp}
                                    value={scoreInput}
                                    onChange={e => setScoreInput(e.target.value)}
                                    placeholder="6/3 6/4"
                                    autoFocus
                                  />
                                  <p className="text-xs text-gray-400 mt-1">Separar sets con espacio · Formato: p1/p2</p>
                                </div>
                                <div className="mb-4">
                                  <div className="text-[11px] font-bold tracking-widest text-gray-400 uppercase mb-2">Ganador</div>
                                  <div className="grid grid-cols-2 gap-2">
                                    {(['1','2'] as const).map(n => (
                                      <button key={n} onClick={() => setWinnerNum(n)}
                                        className={`px-3 py-2.5 rounded-xl border text-sm font-semibold text-left transition-all ${
                                          winnerNum === n
                                            ? 'bg-green-600/10 border-green-500/50 text-green-600'
                                            : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-900'
                                        }`}>
                                        <div className="text-xs text-gray-400 mb-0.5">Pareja {n}</div>
                                        <div className="truncate">{n === '1' ? getPairName(m.pair1_id) : getPairName(m.pair2_id)}</div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <button onClick={handleSaveResult}
                                  className="w-full bg-amber-400 text-white font-['Barlow_Condensed'] text-lg font-bold py-2.5 rounded-xl hover:bg-amber-500 transition-colors">
                                  Actualizar resultado
                                </button>
                                <Feedback msg={fb4} />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        )
      })()}

      {/* ── 5. Cuadro eliminatorio ── */}
      {step === 'bracket' && (
        <Card title="🏆 Cuadro eliminatorio">
          {!selectedTId ? (
            <p className="text-gray-400 text-sm">Seleccioná un torneo arriba.</p>
          ) : zones.length === 0 ? (
            <p className="text-gray-400 text-sm">El torneo no tiene zonas cargadas.</p>
          ) : (
            <BracketManager
              tournamentId={selectedTId}
              zones={zones}
              pairs={pairs}
              courtsCount={tournaments.find(t => t.id === selectedTId)?.pairs_count ?? 4}
              onRefresh={() => loadTournamentData(selectedTId)}
            />
          )}
        </Card>
      )}

      {/* ── 6. Estados ── */}
      {step === 'status' && (
        <div>
          {/* Sub-nav */}
          <div className="flex gap-1.5 mb-5">
            {[
              { id: 'matches', label: '📡 Partidos' },
              { id: 'bracket', label: '🏆 Cuadro eliminatorio' },
              { id: 'tourney', label: '🏟 Torneo' },
            ].map(v => (
              <button key={v.id} onClick={() => setStatusView(v.id as any)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                  statusView === v.id ? 'bg-green-600 text-white' : 'bg-gray-50 border border-gray-100 text-gray-400 hover:text-gray-900'
                }`}>
                {v.label}
              </button>
            ))}
          </div>

          {/* Estado de partidos */}
          {statusView === 'matches' && (
            <Card title="📡 Estado del partido">
              <Field label="Partido">
                <select className={sel} value={liveMatchId} onChange={e => setLiveMatchId(e.target.value)}>
                  <option value="">— Elegí un partido —</option>
                  {matches.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.scheduled_time?.slice(0,5)} · {getPairName(m.pair1_id)} vs {getPairName(m.pair2_id)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Estado">
                <div className="flex gap-2">
                  {[
                    { v: 'upcoming', label: 'Próximo', cls: 'border-amber-400/40 text-amber-400 bg-amber-400/10' },
                    { v: 'live', label: '● En juego', cls: 'border-green-500/40 text-green-600 bg-green-600/10' },
                    { v: 'done', label: 'Finalizado', cls: 'border-gray-200 text-gray-500 bg-gray-50' },
                  ].map(opt => (
                    <button key={opt.v} onClick={() => setLiveStatus(opt.v)}
                      className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                        liveStatus === opt.v ? opt.cls : 'border-gray-100 text-gray-400 hover:text-gray-500'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </Field>
              <button onClick={handleSetMatchStatus} className="w-full bg-green-600 text-white font-['Barlow_Condensed'] text-lg font-bold py-3 rounded-xl hover:bg-green-700 transition-colors">
                Actualizar partido
              </button>
              <Feedback msg={fb5a} />
            </Card>
          )}

          {/* Cuadro eliminatorio */}
          {statusView === 'bracket' && (
            <Card title="🏆 Generar cuadro eliminatorio">
              <p className="text-gray-400 text-sm mb-5">
                Se generan los cruces automáticamente con los clasificados de cada zona según posiciones. Los primeros de cada zona cruzan con los segundos de otra.
              </p>

              {/* Preview clasificados */}
              {classified.length > 0 ? (
                <div className="mb-5">
                  <div className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-3">
                    Clasificados ({classified.length}) — {classifiedPerZone} por zona
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    {zones.map(zone => {
                      const zClass = classified.filter(c => c.zoneId === zone.id)
                      return (
                        <div key={zone.id} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                          <div className="text-xs font-bold text-gray-400 mb-2">Zona {zone.name}</div>
                          {zClass.length === 0 ? (
                            <div className="text-xs text-gray-300 italic">Sin resultados completos</div>
                          ) : zClass.map(c => (
                            <div key={c.pairId} className="flex items-center gap-2 py-1">
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                c.position === 1 ? 'bg-yellow-400/15 text-yellow-400' : 'bg-white/[0.08] text-gray-400'
                              }`}>{c.position}</span>
                              <span className="text-sm font-semibold">{getPairName(c.pairId)}</span>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>

                  {/* Preview de cruces */}
                  <div className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-2">Cruces a generar</div>
                  <div className="space-y-1.5 mb-5">
                    {(() => {
                      const fp = classified.filter(c => c.position === 1)
                      const sp = classified.filter(c => c.position === 2)
                      return fp.map((f, i) => {
                        const s = sp[(i + 1) % sp.length]
                        if (!s) return null
                        return (
                          <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 text-sm">
                            <span className="text-[10px] font-bold text-gray-400 w-4">{i+1}</span>
                            <span className="flex-1 font-semibold">{getPairName(f.pairId)}</span>
                            <span className="text-gray-400 text-xs">vs</span>
                            <span className="flex-1 font-semibold text-right">{getPairName(s.pairId)}</span>
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
              ) : (
                <div className="bg-amber-400/[0.07] border border-amber-400/20 rounded-xl px-4 py-3 mb-5 text-sm text-amber-400">
                  ⚠ No hay clasificados aún. Completá todos los resultados de grupos primero.
                </div>
              )}

              {/* Fecha y hora del cuadro */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Field label="Fecha del cuadro">
                  <input type="date" className={inp} value={bracketDate} onChange={e => setBracketDate(e.target.value)} />
                </Field>
                <Field label="Hora de inicio">
                  <input type="time" className={inp} value={bracketStartTime} onChange={e => setBracketStartTime(e.target.value)} />
                </Field>
                <Field label="Intervalo entre partidos">
                  <select className={sel} value={bracketInterval} onChange={e => setBracketInterval(+e.target.value)}>
                    {[60,75,90,105,120].map(n => <option key={n} value={n}>{n} min</option>)}
                  </select>
                </Field>
                <Field label="Cancha">
                  <select className={sel} value={bracketCourt} onChange={e => setBracketCourt(e.target.value)}>
                    {Array.from({ length: tournaments.find(t => t.id === selectedTId)?.pairs_count ?? 4 }, (_, i) => (
                      <option key={i+1}>Cancha {i+1}</option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Partidos del cuadro ya generados */}
              {matches.filter(m => m.zone_id === null).length > 0 && (
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 mb-4">
                  <div className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-2">Ya generados</div>
                  {matches.filter(m => m.zone_id === null).map(m => (
                    <div key={m.id} className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0 text-sm">
                      <span className="text-xs text-gray-400 font-bold uppercase w-16 flex-shrink-0">{m.round}</span>
                      <span className="flex-1 truncate">{getPairName(m.pair1_id)} vs {getPairName(m.pair2_id)}</span>
                      <span className={`text-[10px] font-bold ${m.status === 'live' ? 'text-green-600' : m.status === 'done' ? 'text-gray-400' : 'text-amber-400'}`}>
                        {m.status === 'live' ? '●LIVE' : m.status === 'done' ? 'FIN' : 'PRÓX'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleGenerateBracket}
                disabled={classified.length < 2}
                className="w-full bg-green-600 text-white font-['Barlow_Condensed'] text-lg font-bold py-3 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-40"
              >
                Generar cuadro →
              </button>
              <Feedback msg={fb5c} />
            </Card>
          )}

          {/* Estado del torneo */}
          {statusView === 'tourney' && (
            <Card title="🏟 Estado del torneo">
              <div className="flex flex-col gap-2 mb-4">
                {[
                  { v: 'upcoming', label: 'Próximo', sub: 'Visible pero sin resultados' },
                  { v: 'live', label: '🟢 En vivo', sub: 'Destacado en la home' },
                  { v: 'finished', label: 'Finalizado', sub: 'Pasa al historial' },
                ].map(opt => (
                  <button key={opt.v} onClick={() => setTourneyStatus(opt.v)}
                    className={`w-full px-4 py-3 rounded-xl border text-left transition-all ${
                      tourneyStatus === opt.v
                        ? 'bg-green-600/10 border-green-500/40 text-white'
                        : 'bg-gray-50 border-gray-100 text-gray-500 hover:text-gray-900'
                    }`}>
                    <div className="font-semibold text-sm">{opt.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{opt.sub}</div>
                  </button>
                ))}
              </div>
              <button onClick={handleSetTourneyStatus} className="w-full bg-amber-400 text-white font-['Barlow_Condensed'] text-lg font-bold py-3 rounded-xl hover:bg-amber-500 transition-colors">
                Actualizar torneo
              </button>
              <Feedback msg={fb5b} />
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
