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

export default function PairAssigner({ tournamentId, zones, pairs, onDone }: Props) {
  // Map: pair_id → zone_id
  const [assignments, setAssignments] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    pairs.forEach(p => { init[p.id] = '' })
    return init
  })
  const [fb, setFb] = useState('')
  const [saving, setSaving] = useState(false)

  function assign(pairId: string, zoneId: string) {
    setAssignments(prev => ({ ...prev, [pairId]: zoneId }))
  }

  function assignAll(zoneId: string) {
    // Asigna todas las sin zona a esta zona
    setAssignments(prev => {
      const next = { ...prev }
      pairs.forEach(p => { if (!next[p.id]) next[p.id] = zoneId })
      return next
    })
  }

  const unassigned = pairs.filter(p => !assignments[p.id])
  const assigned = pairs.filter(p => !!assignments[p.id])

  async function handleSave() {
    if (unassigned.length > 0) {
      setFb(`⚠ Faltan asignar ${unassigned.length} pareja${unassigned.length > 1 ? 's' : ''}.`)
      return
    }
    setSaving(true)

    // Insertar zone_pairs
    const zonePairRows = Object.entries(assignments).map(([pair_id, zone_id]) => ({ zone_id, pair_id }))
    const { error: zpError } = await supabase.from('zone_pairs').insert(zonePairRows)
    if (zpError) { setFb('❌ ' + zpError.message); setSaving(false); return }

    // Inicializar standings en 0
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

  // Grupos por zona para preview
  const byZone = zones.map(z => ({
    zone: z,
    pairs: pairs.filter(p => assignments[p.id] === z.id),
  }))

  return (
    <div>
      {/* Progress */}
      <div className="flex items-center justify-between mb-5">
        <span className="text-sm text-gray-600">
          <span className="text-white font-bold">{assigned.length}</span> / {pairs.length} asignadas
        </span>
        {unassigned.length === 0 && (
          <span className="text-green-600 text-sm font-bold">✓ Todas asignadas</span>
        )}
      </div>

      {/* Barra de progreso */}
      <div className="h-1.5 bg-white/[0.06] rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-green-600 rounded-full transition-all duration-300"
          style={{ width: `${(assigned.length / Math.max(pairs.length, 1)) * 100}%` }}
        />
      </div>

      {/* Layout: lista de parejas + zonas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Columna izquierda: parejas con selector de zona */}
        <div>
          <div className="text-xs font-bold tracking-widest text-gray-600 uppercase mb-3">
            Parejas ({pairs.length})
          </div>
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {pairs.map(p => (
              <div key={p.id} className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-all ${
                assignments[p.id]
                  ? 'bg-white border-gray-200'
                  : 'bg-gray-50 border-amber-400/20'
              }`}>
                {/* Indicador de zona asignada */}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-['Barlow_Condensed'] text-base font-extrabold flex-shrink-0 transition-all ${
                  assignments[p.id]
                    ? 'bg-green-600 text-black'
                    : 'bg-white/[0.06] text-gray-600'
                }`}>
                  {assignments[p.id]
                    ? zones.find(z => z.id === assignments[p.id])?.name ?? '?'
                    : '?'
                  }
                </div>

                {/* Nombre */}
                <span className="flex-1 text-sm font-semibold">{p.display_name}</span>

                {/* Selector */}
                <select
                  value={assignments[p.id] || ''}
                  onChange={e => assign(p.id, e.target.value)}
                  className="bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 text-xs outline-none focus:border-green-600 transition-colors cursor-pointer"
                >
                  <option value="">Sin zona</option>
                  {zones.map(z => (
                    <option key={z.id} value={z.id}>Zona {z.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Columna derecha: preview por zona */}
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
                  <span className="ml-auto text-xs text-gray-600">{zPairs.length} pareja{zPairs.length !== 1 ? 's' : ''}</span>
                </div>
                {zPairs.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-gray-600 italic">Sin parejas asignadas</div>
                ) : (
                  <div className="divide-y divide-white/[0.04]">
                    {zPairs.map(p => (
                      <div key={p.id} className="px-4 py-2.5 text-sm text-gray-600 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-600/60 flex-shrink-0" />
                        {p.display_name}
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

      {/* Guardar */}
      <div className="mt-5 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving || unassigned.length > 0}
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
