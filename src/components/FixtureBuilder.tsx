import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Zone { id: string; name: string; order_num: number }
interface Pair { id: string; display_name: string }

interface MatchRow {
  dbId: string | null
  tempId: string
  zone_id: string
  pair1_id: string
  pair2_id: string
  day: string       // ahora es fecha ISO "YYYY-MM-DD"
  time: string
  court: string
  dirty: boolean
}

interface Props {
  tournamentId: string
  zones: Zone[]
  pairs: Pair[]
  zonePairs: Record<string, string[]>
  courtsCount: number
  onDone: () => void
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}
function minutesToTime(mins: number) {
  const h = Math.floor(mins / 60) % 24
  const m = mins % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}
function cleanTime(t: string | null) {
  if (!t) return ''
  return t.slice(0,5)
}
// Muestra "Vie 04 Abr" a partir de "2025-04-04"
function displayDate(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' })
}
function roundRobinPairs(pairIds: string[]): [string,string][] {
  const result: [string,string][] = []
  for (let i = 0; i < pairIds.length; i++)
    for (let j = i + 1; j < pairIds.length; j++)
      result.push([pairIds[i], pairIds[j]])
  return result
}

function DeleteButton({ onConfirm, isDeleting }: { onConfirm: () => void; isDeleting: boolean }) {
  const [confirm, setConfirm] = useState(false)
  if (isDeleting) return <span className="text-[10px] text-gray-600">Borrando...</span>
  if (confirm) return (
    <div className="flex items-center gap-1.5">
      <button onClick={() => { setConfirm(false); onConfirm() }}
        className="text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded-lg hover:bg-red-500/30 transition-colors">
        Confirmar
      </button>
      <button onClick={() => setConfirm(false)} className="text-[10px] text-gray-600 px-1.5 py-1 hover:text-white">✕</button>
    </div>
  )
  return (
    <button onClick={() => setConfirm(true)}
      className="text-gray-600 hover:text-red-400 transition-colors text-sm p-1 rounded-lg hover:bg-red-500/10" title="Eliminar">
      🗑
    </button>
  )
}

function ZoneQuickFill({ courtsCount, onApply }: {
  courtsCount: number
  onApply: (date: string, time: string, interval: number, courts: number) => void
}) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('20:00')
  const [interval, setIntervalVal] = useState(90)
  const [courts, setCourts] = useState(Math.min(courtsCount, 2))

  return (
    <div className="flex flex-wrap gap-2 items-end">
      <div>
        <div className="text-[10px] text-gray-600 uppercase font-bold tracking-widest mb-1">Fecha</div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-2 py-2 text-gray-900 text-xs outline-none focus:border-green-600 w-36" />
      </div>
      <div>
        <div className="text-[10px] text-gray-600 uppercase font-bold tracking-widest mb-1">Desde</div>
        <input type="time" value={time} onChange={e => setTime(e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-2 py-2 text-gray-900 text-xs outline-none focus:border-green-600 w-28" />
      </div>
      <div>
        <div className="text-[10px] text-gray-600 uppercase font-bold tracking-widest mb-1">Intervalo</div>
        <select value={interval} onChange={e => setIntervalVal(+e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-2 py-2 text-gray-900 text-xs outline-none focus:border-green-600 cursor-pointer">
          {[60,75,90,105,120].map(n => <option key={n} value={n}>{n} min</option>)}
        </select>
      </div>
      <div>
        <div className="text-[10px] text-gray-600 uppercase font-bold tracking-widest mb-1">Canchas simult.</div>
        <select value={courts} onChange={e => setCourts(+e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-2 py-2 text-gray-900 text-xs outline-none focus:border-green-600 cursor-pointer">
          {Array.from({ length: courtsCount }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n} cancha{n > 1 ? 's':''}</option>)}
        </select>
      </div>
      <button onClick={() => { if(!date){ alert('Seleccioná una fecha primero'); return }; onApply(date, time, interval, courts) }}
        className="bg-gray-100 border border-gray-200 text-gray-700 text-xs font-bold px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
        Aplicar →
      </button>
    </div>
  )
}

export default function FixtureBuilder({ tournamentId, zones, pairs, zonePairs, courtsCount, onDone }: Props) {
  const [rows, setRows] = useState<MatchRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [fb, setFb] = useState('')
  const [activeZone, setActiveZone] = useState(zones[0]?.id ?? '')

  function getPairName(id: string) { return pairs.find(p => p.id === id)?.display_name ?? '—' }
  function showFb(msg: string) { setFb(msg); setTimeout(() => setFb(''), 3000) }

  useEffect(() => { if (tournamentId) loadMatches() }, [tournamentId, JSON.stringify(zonePairs)])

  async function loadMatches() {
    setLoading(true)
    const { data: saved } = await supabase
      .from('matches').select('id,zone_id,pair1_id,pair2_id,day,scheduled_time,court,status')
      .eq('tournament_id', tournamentId).eq('round', 'groups')

    const existingPairs = new Set((saved ?? []).map(m => `${m.zone_id}-${m.pair1_id}-${m.pair2_id}`))

    const dbRows: MatchRow[] = (saved ?? []).map(m => ({
      dbId: m.id, tempId: m.id, zone_id: m.zone_id,
      pair1_id: m.pair1_id, pair2_id: m.pair2_id,
      day: m.day ?? '', time: cleanTime(m.scheduled_time), court: m.court ?? '', dirty: false,
    }))

    const newRows: MatchRow[] = []
    let counter = 0
    zones.forEach(zone => {
      const pIds = zonePairs[zone.id] ?? []
      roundRobinPairs(pIds).forEach(([p1, p2]) => {
        const k1 = `${zone.id}-${p1}-${p2}`
        const k2 = `${zone.id}-${p2}-${p1}`
        if (!existingPairs.has(k1) && !existingPairs.has(k2)) {
          newRows.push({ dbId: null, tempId: `new-${zone.id}-${counter++}`, zone_id: zone.id, pair1_id: p1, pair2_id: p2, day: '', time: '', court: '', dirty: false })
        }
      })
    })

    setRows([...dbRows, ...newRows])
    setLoading(false)
  }

  function updateRow(tempId: string, field: 'day'|'time'|'court', value: string) {
    setRows(prev => prev.map(r => r.tempId === tempId ? { ...r, [field]: value, dirty: true } : r))
  }

  function applyToZone(zoneId: string, date: string, startTime: string, intervalMin: number, courts: number) {
    setRows(prev => {
      const zRows = prev.filter(r => r.zone_id === zoneId)
      return prev.map(r => {
        if (r.zone_id !== zoneId) return r
        const idx = zRows.findIndex(zr => zr.tempId === r.tempId)
        return {
          ...r,
          day: date,
          time: minutesToTime(timeToMinutes(startTime) + Math.floor(idx / courts) * intervalMin),
          court: `Cancha ${(idx % courts) + 1}`,
          dirty: true,
        }
      })
    })
  }

  async function saveRow(tempId: string) {
    const row = rows.find(r => r.tempId === tempId)
    if (!row || (!row.dirty && row.dbId)) return
    if (!row.day || !row.time || !row.court) { showFb('⚠ Completá fecha, hora y cancha.'); return }
    setSaving(tempId)
    if (row.dbId) {
      const { error } = await supabase.from('matches').update({
        day: row.day, scheduled_time: row.time + ':00', court: row.court,
      }).eq('id', row.dbId)
      if (error) { showFb('❌ ' + error.message); setSaving(null); return }
      setRows(prev => prev.map(r => r.tempId === tempId ? { ...r, dirty: false } : r))
    } else {
      const { data, error } = await supabase.from('matches').insert({
        tournament_id: tournamentId, zone_id: row.zone_id, round: 'groups',
        pair1_id: row.pair1_id, pair2_id: row.pair2_id,
        day: row.day, scheduled_time: row.time + ':00', court: row.court, status: 'upcoming',
      }).select('id').single()
      if (error || !data) { showFb('❌ ' + error?.message); setSaving(null); return }
      setRows(prev => prev.map(r => r.tempId === tempId ? { ...r, dbId: data.id, tempId: data.id, dirty: false } : r))
    }
    setSaving(null)
  }

  async function saveZone(zoneId: string) {
    const pending = rows.filter(r => r.zone_id === zoneId && (!r.dbId || r.dirty))
    for (const row of pending) await saveRow(row.tempId)
    showFb(`✓ Zona ${zones.find(z => z.id === zoneId)?.name} guardada.`)
  }

  async function deleteRow(tempId: string) {
    const row = rows.find(r => r.tempId === tempId)
    if (!row) return
    setDeleting(tempId)
    if (row.dbId) {
      const { error } = await supabase.from('matches').delete().eq('id', row.dbId)
      if (error) { showFb('❌ ' + error.message); setDeleting(null); return }
    }
    setRows(prev => prev.filter(r => r.tempId !== tempId))
    setDeleting(null)
  }

  const savedCount = rows.filter(r => r.dbId && !r.dirty).length
  const totalCount = rows.length
  const allSaved = totalCount > 0 && rows.every(r => r.dbId && !r.dirty)

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600"><span className="text-white font-bold">{savedCount}</span> / {totalCount} guardados</span>
        {allSaved && <span className="text-green-600 text-sm font-bold">✓ Fixture completo</span>}
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full mb-5 overflow-hidden">
        <div className="h-full bg-green-600 rounded-full transition-all duration-300" style={{ width: `${(savedCount / Math.max(totalCount,1)) * 100}%` }} />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-5">
        {zones.map(z => {
          const zRows = rows.filter(r => r.zone_id === z.id)
          const allDone = zRows.length > 0 && zRows.every(r => r.dbId && !r.dirty)
          const hasDirty = zRows.some(r => r.dirty || !r.dbId)
          return (
            <button key={z.id} onClick={() => setActiveZone(z.id)}
              className={`whitespace-nowrap px-3 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1 ${
                activeZone === z.id ? 'bg-green-600 text-black'
                : allDone ? 'bg-green-600/10 border border-green-600/30 text-green-600'
                : hasDirty ? 'bg-amber-400/10 border border-amber-400/30 text-amber-400'
                : 'bg-gray-50 border border-gray-200 text-gray-600 hover:text-white'
              }`}>
              Zona {z.name}
              {allDone && activeZone !== z.id && <span className="text-[10px]">✓</span>}
              {hasDirty && !allDone && activeZone !== z.id && <span className="text-[10px]">●</span>}
            </button>
          )
        })}
      </div>

      {zones.filter(z => z.id === activeZone).map(zone => {
        const zRows = rows.filter(r => r.zone_id === zone.id)
        const allZDone = zRows.length > 0 && zRows.every(r => r.dbId && !r.dirty)
        const hasPending = zRows.some(r => !r.dbId || r.dirty)
        return (
          <div key={zone.id}>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
              <div className="text-xs font-bold tracking-widest text-gray-600 uppercase mb-3">Aplicar a toda la Zona {zone.name}</div>
              <ZoneQuickFill courtsCount={courtsCount} onApply={(d,t,i,c) => applyToZone(zone.id,d,t,i,c)} />
            </div>

            {zRows.length === 0 ? (
              <div className="text-center py-8 text-gray-600 text-sm">No hay parejas asignadas a esta zona.</div>
            ) : (
              <div className="space-y-2 mb-4">
                {zRows.map((row, idx) => {
                  const isSaved = !!row.dbId && !row.dirty
                  const isDirty = row.dirty && !!row.dbId
                  const isNew = !row.dbId
                  return (
                    <div key={row.tempId} className={`rounded-xl border overflow-hidden transition-all ${
                      isSaved ? 'border-green-600/25 bg-green-600/[0.02]'
                      : isDirty ? 'border-amber-400/30 bg-amber-400/[0.02]'
                      : 'border-gray-200 bg-white'
                    }`}>
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
                        <span className="text-xs font-bold text-gray-600 w-5 flex-shrink-0">#{idx+1}</span>
                        <span className="flex-1 text-sm font-semibold truncate">
                          {getPairName(row.pair1_id)}<span className="text-gray-600 font-normal mx-2">vs</span>{getPairName(row.pair2_id)}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isSaved && <span className="text-[10px] font-bold text-green-600">✓ GUARDADO</span>}
                          {isDirty && <span className="text-[10px] font-bold text-amber-400">● CAMBIOS</span>}
                          {isNew && <span className="text-[10px] font-bold text-gray-600">NUEVO</span>}
                          <DeleteButton onConfirm={() => deleteRow(row.tempId)} isDeleting={deleting === row.tempId} />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 px-4 py-3">
                        <div>
                          <div className="text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-1.5">Fecha</div>
                          <input type="date" value={row.day} onChange={e => updateRow(row.tempId,'day',e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-gray-900 text-xs outline-none focus:border-green-600" />
                          {row.day && (
                            <div className="text-[10px] text-gray-600 mt-1">{displayDate(row.day)}</div>
                          )}
                        </div>
                        <div>
                          <div className="text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-1.5">Hora</div>
                          <input type="time" value={row.time} onChange={e => updateRow(row.tempId,'time',e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-gray-900 text-xs outline-none focus:border-green-600" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-1.5">Cancha</div>
                          <select value={row.court} onChange={e => updateRow(row.tempId,'court',e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-gray-900 text-xs outline-none focus:border-green-600 cursor-pointer">
                            <option value="">—</option>
                            {Array.from({ length: courtsCount }, (_, i) => <option key={i+1}>Cancha {i+1}</option>)}
                          </select>
                        </div>
                      </div>
                      {(!isSaved || isDirty) && (
                        <div className="px-4 pb-3">
                          <button onClick={() => saveRow(row.tempId)} disabled={saving === row.tempId}
                            className="w-full bg-green-600/10 border border-green-600/30 text-green-600 text-xs font-bold py-2 rounded-lg hover:bg-green-600/20 transition-colors disabled:opacity-40">
                            {saving === row.tempId ? 'Guardando...' : isDirty ? 'Guardar cambios' : 'Guardar'}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {hasPending && zRows.length > 0 && (
              <button onClick={() => saveZone(zone.id)} disabled={!!saving}
                className="w-full bg-green-600 text-white font-['Bebas_Neue', sans-serif] text-lg font-bold py-3 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-40">
                Guardar toda la Zona {zone.name} ({zRows.filter(r => !r.dbId || r.dirty).length} pendientes) →
              </button>
            )}
            {allZDone && (
              <div className="w-full bg-green-600/10 border border-green-600/30 text-green-600 font-['Barlow_Condensed'] text-lg font-bold py-3 rounded-xl text-center">
                ✓ Zona {zone.name} completa
              </div>
            )}
          </div>
        )
      })}

      {fb && <p className={`text-sm font-semibold mt-4 ${fb.startsWith('❌')||fb.startsWith('⚠') ? 'text-red-400' : 'text-green-600'}`}>{fb}</p>}

      {allSaved && (
        <button onClick={onDone} className="w-full mt-5 bg-green-600 text-white font-['Bebas_Neue', sans-serif] text-lg font-bold py-3 rounded-xl hover:bg-green-700 transition-colors">
          Fixture completo → Ir a resultados
        </button>
      )}
    </div>
  )
}
