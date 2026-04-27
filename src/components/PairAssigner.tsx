import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Zone { id: string; name: string; order_num: number }
interface Pair { id: string; display_name: string }

interface Props {
  tournamentId: string
  zones: Zone[]
  pairs: Pair[]
  onDone: () => void
}

interface Assignment {
  zone_id: string   // '' si sin zona
  order_num: number // 0 si no asignado
}

const MAX_PAIRS_PER_ZONE = 8   // límite superior del selector de # pareja

export default function PairAssigner({ tournamentId, zones, pairs, onDone }: Props) {
  // Map: pair_id → { zone_id, order_num }
  const [assignments, setAssignments] = useState<Record<string, Assignment>>(() => {
    const init: Record<string, Assignment> = {}
    pairs.forEach(p => { init[p.id] = { zone_id: '', order_num: 0 } })
    return init
  })
  const [fb, setFb] = useState('')
  const [saving, setSaving] = useState(false)

  // Cantidad de parejas asignadas a una zona
  function zoneCount(zoneId: string): number {
    return Object.values(assignments).filter(a => a.zone_id === zoneId).length
  }

  // Devuelve el siguiente número libre dentro de la zona
  function nextOrderNum(zoneId: string, ignorePairId?: string): number {
    const used = new Set<number>()
    Object.entries(assignments).forEach(([pid, a]) => {
      if (pid === ignorePairId) return
      if (a.zone_id === zoneId && a.order_num > 0) used.add(a.order_num)
    })
    for (let i = 1; i <= MAX_PAIRS_PER_ZONE; i++) {
      if (!used.has(i)) return i
    }
    return 0
  }

  function assignZone(pairId: string, zoneId: string) {
    setAssignments(prev => {
      const next = { ...prev }
      if (!zoneId) {
        next[pairId] = { zone_id: '', order_num: 0 }
      } else {
        next[pairId] = { zone_id: zoneId, order_num: nextOrderNum(zoneId, pairId) }
      }
      return next
    })
  }

  function assignOrder(pairId: string, orderNum: number) {
    setAssignments(prev => {
      const next = { ...prev }
      const cur = next[pairId]
      if (!cur.zone_id) return prev
      // Si otro pair tenía ese order_num en la misma zona, swap
      const conflict = Object.entries(prev).find(([pid, a]) =>
        pid !== pairId && a.zone_id === cur.zone_id && a.order_num === orderNum
      )
      if (conflict) {
        next[conflict[0]] = { ...conflict[1], order_num: cur.order_num || nextOrderNum(cur.zone_id, conflict[0]) }
      }
      next[pairId] = { ...cur, order_num: orderNum }
      return next
    })
  }

  function assignAll(zoneId: string) {
    setAssignments(prev => {
      const next = { ...prev }
      pairs.forEach(p => {
        if (!next[p.id].zone_id) {
          next[p.id] = { zone_id: zoneId, order_num: 0 }
        }
      })
      Object.entries(next).forEach(([pid, a]) => {
        if (a.zone_id === zoneId && a.order_num === 0) {
          next[pid] = { ...a, order_num: nextOrderNum(zoneId, pid) }
        }
      })
      return next
    })
  }

  const unassigned = pairs.filter(p => !assignments[p.id].zone_id)
  const assigned = pairs.filter(p => !!assignments[p.id].zone_id)

  // Validar: cada zona debe tener posiciones consecutivas 1..N (sin huecos ni duplicados)
  const errors: string[] = []
  zones.forEach(z => {
    const zPairs = pairs.filter(p => assignments[p.id].zone_id === z.id)
    if (zPairs.length === 0) return
    const orders = zPairs.map(p => assignments[p.id].order_num).sort((a, b) => a - b)
    if (orders.some(o => o === 0)) {
      errors.push(`Zona ${z.name}: hay parejas sin número`)
      return
    }
    for (let i = 0; i < orders.length; i++) {
      if (orders[i] !== i + 1) {
        errors.push(`Zona ${z.name}: las posiciones deben ser 1..${orders.length} sin huecos (faltan o sobran números)`)
        return
      }
    }
  })

  async function handleSave() {
    if (unassigned.length > 0) {
      setFb(`⚠ Faltan asignar ${unassigned.length} pareja${unassigned.length > 1 ? 's' : ''}.`)
      return
    }
    if (errors.length) {
      setFb(`⚠ ${errors[0]}`)
      return
    }
    setSaving(true)

    const zonePairRows = Object.entries(assignments).map(([pair_id, a]) => ({
      zone_id: a.zone_id,
      pair_id,
      order_num: a.order_num,
    }))
    const { error: zpError } = await supabase.from('zone_pairs').insert(zonePairRows)
    if (zpError) { setFb('❌ ' + zpError.message); setSaving(false); return }

    const standingRows = zonePairRows.map(({ zone_id, pair_id }) => ({
      zone_id, pair_id,
      played: 0, won: 0, sets_won: 0, sets_lost: 0,
      games_won: 0, games_lost: 0, points: 0, position: null,
    }))
    const { error: sError } = await supabase.from('standings').insert(standingRows)
    if (sError) { setFb('❌ ' + sError.message); setSaving(false); return }

    setFb('✓ Asignación guardada.')
    setSaving(false)
    setTimeout(onDone, 1000)
  }

  // Preview ordenado por order_num
  const byZone = zones.map(z => ({
    zone: z,
    pairs: pairs
      .filter(p => assignments[p.id].zone_id === z.id)
      .sort((a, b) => assignments[a.id].order_num - assignments[b.id].order_num),
  }))

  return (
    <div>
      {/* Progress */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-sm text-gray-600">
          <span className="text-white font-bold">{assigned.length}</span> / {pairs.length} asignadas
        </span>
        {unassigned.length === 0 && errors.length === 0 && (
          <span className="text-green-600 text-sm font-bold">✓ Todas asignadas</span>
        )}
      </div>

      <div className="h-1.5 bg-white/[0.06] rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-green-600 rounded-full transition-all duration-300"
          style={{ width: `${(assigned.length / Math.max(pairs.length, 1)) * 100}%` }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Lista de parejas con selector de zona + número */}
        <div>
          <div className="text-xs font-bold tracking-widest text-gray-600 uppercase mb-3">
            Parejas ({pairs.length})
          </div>
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {pairs.map(p => {
              const a = assignments[p.id]
              const hasZone = !!a.zone_id
              const zoneSize = hasZone ? zoneCount(a.zone_id) : 0
              // Mostrar 1..(zoneSize) — la pareja actual cuenta, así que el rango incluye su lugar
              const positionMax = Math.max(zoneSize, 1)
              return (
                <div key={p.id} className={`flex items-center gap-2 rounded-xl px-3 py-3 border transition-all ${
                  hasZone ? 'bg-white border-gray-200' : 'bg-gray-50 border-amber-400/20'
                }`}>
                  {/* Indicador zona + número */}
                  <div className={`flex items-center gap-1 flex-shrink-0`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-['Barlow_Condensed'] text-base font-extrabold transition-all ${
                      hasZone ? 'bg-green-600 text-black' : 'bg-white/[0.06] text-gray-600'
                    }`}>
                      {hasZone ? zones.find(z => z.id === a.zone_id)?.name ?? '?' : '?'}
                    </div>
                    {hasZone && a.order_num > 0 && (
                      <div className="w-6 h-7 rounded-lg bg-green-600/15 border border-green-600/30 flex items-center justify-center font-bold text-xs text-green-600">
                        #{a.order_num}
                      </div>
                    )}
                  </div>

                  {/* Nombre */}
                  <span className="flex-1 text-sm font-semibold truncate">{p.display_name}</span>

                  {/* Selector zona */}
                  <select
                    value={a.zone_id}
                    onChange={e => assignZone(p.id, e.target.value)}
                    className="bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 text-xs outline-none focus:border-green-600 transition-colors cursor-pointer"
                    title="Zona"
                  >
                    <option value="">Sin zona</option>
                    {zones.map(z => (
                      <option key={z.id} value={z.id}>Zona {z.name}</option>
                    ))}
                  </select>

                  {/* Selector número de pareja */}
                  <select
                    value={a.order_num || ''}
                    onChange={e => assignOrder(p.id, +e.target.value)}
                    disabled={!hasZone}
                    className="bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 text-xs outline-none focus:border-green-600 transition-colors cursor-pointer disabled:opacity-40 w-14"
                    title="Número de pareja en la zona"
                  >
                    <option value="">—</option>
                    {Array.from({ length: positionMax }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>#{n}</option>
                    ))}
                  </select>
                </div>
              )
            })}
          </div>
        </div>

        {/* Preview por zona — muestra solo los slots que están ocupados */}
        <div>
          <div className="text-xs font-bold tracking-widest text-gray-600 uppercase mb-3">
            Preview por zona
          </div>
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {byZone.map(({ zone, pairs: zPairs }) => (
              <div key={zone.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
                  <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center font-['Barlow_Condensed'] text-lg font-extrabold text-black">
                    {zone.name}
                  </div>
                  <span className="font-bold text-sm">Zona {zone.name}</span>
                  <span className="ml-auto text-xs text-gray-600">
                    {zPairs.length} pareja{zPairs.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {zPairs.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-gray-600 italic">Sin parejas asignadas</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {zPairs.map(p => (
                      <div key={p.id} className="px-4 py-2.5 text-sm flex items-center gap-2">
                        <span className="w-6 h-6 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0">
                          #{assignments[p.id].order_num}
                        </span>
                        <span className="text-gray-700 font-medium">{p.display_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Acciones rápidas */}
      {unassigned.length > 0 && zones.length > 0 && (
        <div className="mt-4 p-4 bg-amber-400/[0.06] border border-amber-400/20 rounded-xl">
          <div className="text-xs font-bold text-amber-400 mb-2">
            {unassigned.length} pareja{unassigned.length > 1 ? 's' : ''} sin zona:
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {unassigned.map(p => (
              <span key={p.id} className="text-xs bg-white/[0.06] px-2 py-1 rounded-lg text-gray-600">
                {p.display_name}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-600 self-center">Asignar todas a:</span>
            {zones.map(z => (
              <button
                key={z.id}
                onClick={() => assignAll(z.id)}
                className="text-xs bg-green-600/10 border border-green-600/30 text-green-600 px-3 py-1.5 rounded-lg hover:bg-green-600/20 transition-colors font-semibold"
              >
                Zona {z.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Errores */}
      {errors.length > 0 && (
        <div className="mt-4 p-3 bg-red-500/[0.06] border border-red-500/20 rounded-xl">
          {errors.map((e, i) => (
            <div key={i} className="text-xs text-red-400 font-semibold">⚠ {e}</div>
          ))}
        </div>
      )}

      {/* Guardar */}
      <div className="mt-5 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving || unassigned.length > 0 || errors.length > 0}
          className="flex-1 bg-green-600 text-white font-['Bebas_Neue', sans-serif] text-lg font-bold py-3 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Guardando...' : `Confirmar asignación →`}
        </button>
      </div>
      {fb && (
        <p className={`text-sm font-semibold mt-3 ${fb.startsWith('❌') || fb.startsWith('⚠') ? 'text-red-400' : 'text-green-600'}`}>
          {fb}
        </p>
      )}
    </div>
  )
}
