import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Zone { id: string; name: string; order_num: number }
interface Pair { id: string; display_name: string }
interface ZonePair { zone_id: string; pair_id: string }

interface Props {
  tournamentId: string
  zones: Zone[]
  pairs: Pair[]
  zonePairs: Record<string, string[]>  // zone_id → pair_ids[]
  onRefresh: () => void
}

export default function PairsManager({ tournamentId, zones, pairs, zonePairs, onRefresh }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [fb, setFb] = useState<Record<string, string>>({})
  const [deleting, setDeleting] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  // Invertir el mapa: pair_id → zone_id
  const pairZone: Record<string, string> = {}
  Object.entries(zonePairs).forEach(([zoneId, pairIds]) => {
    pairIds.forEach(pid => { pairZone[pid] = zoneId })
  })

  function showFb(pairId: string, msg: string) {
    setFb(prev => ({ ...prev, [pairId]: msg }))
    setTimeout(() => setFb(prev => { const n = { ...prev }; delete n[pairId]; return n }), 3000)
  }

  // Editar nombre
  function startEdit(pair: Pair) {
    setEditingId(pair.id)
    setEditName(pair.display_name)
  }

  async function saveName(pairId: string) {
    const trimmed = editName.trim()
    if (!trimmed) { showFb(pairId, '⚠ El nombre no puede estar vacío.'); return }

    const { error } = await supabase
      .from('pairs')
      .update({ display_name: trimmed })
      .eq('id', pairId)

    if (error) showFb(pairId, '❌ ' + error.message)
    else { showFb(pairId, '✓ Nombre actualizado.'); setEditingId(null); onRefresh() }
  }

  // Cambiar zona
  async function changeZone(pairId: string, newZoneId: string) {
    if (!newZoneId) return
    const oldZoneId = pairZone[pairId]

    if (oldZoneId === newZoneId) return

    if (oldZoneId) {
      // Actualizar zone_pairs
      const { error } = await supabase
        .from('zone_pairs')
        .update({ zone_id: newZoneId })
        .eq('pair_id', pairId)
        .eq('zone_id', oldZoneId)

      if (error) { showFb(pairId, '❌ ' + error.message); return }

      // Actualizar standings — mover a nueva zona, resetear stats
      await supabase.from('standings').delete().eq('pair_id', pairId).eq('zone_id', oldZoneId)
      await supabase.from('standings').insert({
        zone_id: newZoneId, pair_id: pairId,
        played: 0, won: 0, sets_won: 0, sets_lost: 0,
        games_won: 0, games_lost: 0, points: 0, position: null,
      })
    } else {
      // No tenía zona, insertar
      await supabase.from('zone_pairs').insert({ zone_id: newZoneId, pair_id: pairId })
      await supabase.from('standings').insert({
        zone_id: newZoneId, pair_id: pairId,
        played: 0, won: 0, sets_won: 0, sets_lost: 0,
        games_won: 0, games_lost: 0, points: 0, position: null,
      })
    }

    showFb(pairId, `✓ Zona actualizada.`)
    onRefresh()
  }

  // Eliminar pareja
  async function deletePair(pairId: string) {
    setDeleting(pairId)
    // Eliminar en cascada: zone_pairs, standings, matches que la incluyan
    await supabase.from('standings').delete().eq('pair_id', pairId)
    await supabase.from('zone_pairs').delete().eq('pair_id', pairId)
    await supabase.from('matches').delete().or(`pair1_id.eq.${pairId},pair2_id.eq.${pairId}`)
    const { error } = await supabase.from('pairs').delete().eq('id', pairId)

    if (error) showFb(pairId, '❌ ' + error.message)
    setDeleting(null)
    onRefresh()
  }

  const filteredPairs = pairs.filter(p =>
    p.display_name.toLowerCase().includes(search.toLowerCase())
  )

  // Agrupar por zona para mostrar
  const byZone: { zoneId: string | null; zoneName: string; pairs: Pair[] }[] = [
    ...zones.map(z => ({
      zoneId: z.id,
      zoneName: `Zona ${z.name}`,
      pairs: pairs.filter(p => pairZone[p.id] === z.id),
    })),
    {
      zoneId: null,
      zoneName: 'Sin zona',
      pairs: pairs.filter(p => !pairZone[p.id]),
    },
  ].filter(g => g.pairs.length > 0)

  const [groupByZone, setGroupByZone] = useState(true)

  return (
    <div>
      {/* Controles */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Buscar pareja..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm outline-none focus:border-green-600 transition-colors"
        />
        <button
          onClick={() => setGroupByZone(v => !v)}
          className="whitespace-nowrap text-xs font-bold px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:text-white transition-colors"
        >
          {groupByZone ? 'Vista lista' : 'Vista por zona'}
        </button>
        <span className="text-xs text-gray-600">{pairs.length} parejas</span>
      </div>

      {/* Vista por zona */}
      {groupByZone && !search && (
        <div className="space-y-4">
          {byZone.map(group => (
            <div key={group.zoneId ?? 'none'} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-['Barlow_Condensed'] text-base font-extrabold ${
                  group.zoneId ? 'bg-green-600 text-black' : 'bg-white/[0.06] text-gray-600'
                }`}>
                  {group.zoneId ? zones.find(z => z.id === group.zoneId)?.name : '?'}
                </div>
                <span className="font-bold text-sm">{group.zoneName}</span>
                <span className="ml-auto text-xs text-gray-600">{group.pairs.length} pareja{group.pairs.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {group.pairs.map(p => (
                  <PairRow
                    key={p.id}
                    pair={p}
                    currentZoneId={pairZone[p.id] ?? ''}
                    zones={zones}
                    editingId={editingId}
                    editName={editName}
                    deleting={deleting}
                    fb={fb[p.id]}
                    onStartEdit={startEdit}
                    onEditName={setEditName}
                    onSaveName={saveName}
                    onCancelEdit={() => setEditingId(null)}
                    onChangeZone={changeZone}
                    onDelete={deletePair}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vista lista plana (o con búsqueda activa) */}
      {(!groupByZone || search) && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {filteredPairs.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-600 text-sm">Sin resultados.</div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {filteredPairs.map(p => (
                <PairRow
                  key={p.id}
                  pair={p}
                  currentZoneId={pairZone[p.id] ?? ''}
                  zones={zones}
                  editingId={editingId}
                  editName={editName}
                  deleting={deleting}
                  fb={fb[p.id]}
                  onStartEdit={startEdit}
                  onEditName={setEditName}
                  onSaveName={saveName}
                  onCancelEdit={() => setEditingId(null)}
                  onChangeZone={changeZone}
                  onDelete={deletePair}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Fila de pareja ──────────────────────────────────────

interface PairRowProps {
  pair: { id: string; display_name: string }
  currentZoneId: string
  zones: Zone[]
  editingId: string | null
  editName: string
  deleting: string | null
  fb?: string
  onStartEdit: (p: { id: string; display_name: string }) => void
  onEditName: (v: string) => void
  onSaveName: (id: string) => void
  onCancelEdit: () => void
  onChangeZone: (pairId: string, zoneId: string) => void
  onDelete: (id: string) => void
}

function PairRow({
  pair, currentZoneId, zones, editingId, editName,
  deleting, fb, onStartEdit, onEditName, onSaveName, onCancelEdit, onChangeZone, onDelete,
}: PairRowProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isEditing = editingId === pair.id
  const isDeleting = deleting === pair.id

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Zona badge */}
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-['Barlow_Condensed'] text-sm font-extrabold flex-shrink-0 ${
          currentZoneId ? 'bg-green-600/15 text-green-600' : 'bg-white/[0.05] text-gray-600'
        }`}>
          {currentZoneId ? zones.find(z => z.id === currentZoneId)?.name ?? '?' : '?'}
        </div>

        {/* Nombre (editable o estático) */}
        {isEditing ? (
          <input
            autoFocus
            value={editName}
            onChange={e => onEditName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onSaveName(pair.id); if (e.key === 'Escape') onCancelEdit() }}
            className="flex-1 bg-white border border-green-600/50 rounded-lg px-3 py-1.5 text-gray-900 text-sm outline-none font-semibold"
          />
        ) : (
          <span className="flex-1 text-sm font-semibold">{pair.display_name}</span>
        )}

        {/* Acciones */}
        {!isEditing && !confirmDelete && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Cambiar zona */}
            <select
              value={currentZoneId}
              onChange={e => onChangeZone(pair.id, e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-gray-900 text-xs outline-none focus:border-green-600 cursor-pointer"
            >
              <option value="">Sin zona</option>
              {zones.map(z => (
                <option key={z.id} value={z.id}>Zona {z.name}</option>
              ))}
            </select>

            {/* Editar nombre */}
            <button
              onClick={() => onStartEdit(pair)}
              className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-gray-600 hover:text-white transition-all text-xs"
              title="Editar nombre"
            >
              ✏️
            </button>

            {/* Eliminar */}
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-red-500/20 text-gray-600 hover:text-red-400 transition-all text-xs"
              title="Eliminar pareja"
            >
              🗑
            </button>
          </div>
        )}

        {/* Guardar / cancelar edición */}
        {isEditing && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => onSaveName(pair.id)}
              className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors">
              Guardar
            </button>
            <button onClick={onCancelEdit}
              className="text-gray-600 text-xs px-2 py-1.5 rounded-lg hover:text-white transition-colors">
              Cancelar
            </button>
          </div>
        )}

        {/* Confirmar eliminación */}
        {confirmDelete && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-red-400 font-semibold">¿Eliminar?</span>
            <button
              onClick={() => { setConfirmDelete(false); onDelete(pair.id) }}
              disabled={isDeleting}
              className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-40"
            >
              {isDeleting ? '...' : 'Sí, eliminar'}
            </button>
            <button onClick={() => setConfirmDelete(false)}
              className="text-gray-600 text-xs px-2 py-1.5 rounded-lg hover:text-white transition-colors">
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Feedback inline */}
      {fb && (
        <p className={`text-xs font-semibold mt-1.5 ml-10 ${
          fb.startsWith('❌') || fb.startsWith('⚠') ? 'text-red-400' : 'text-green-600'
        }`}>
          {fb}
        </p>
      )}
    </div>
  )
}
