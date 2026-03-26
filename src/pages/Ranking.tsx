import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface RankingRow {
  player_id: string
  points: number
  tournaments_played: number
  players: { first_name: string; last_name: string }
}

export default function Ranking() {
  const [rows, setRows] = useState<RankingRow[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('rankings')
        .select('player_id, points, tournaments_played, players(first_name, last_name)')
        .order('points', { ascending: false })
      if (data) setRows(data as any)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = rows.filter(r => {
    const name = `${r.players?.first_name} ${r.players?.last_name}`.toLowerCase()
    return name.includes(search.toLowerCase())
  })

  return (
    <div>
      <div className="py-7 border-b border-white/[0.07] mb-6">
        <h2 className="font-['Barlow_Condensed'] text-4xl font-extrabold tracking-tight">Ranking</h2>
        <p className="text-white/50 text-sm mt-1">Puntos acumulados en todos los torneos del club.</p>
      </div>

      <input
        type="text"
        placeholder="Buscar jugador..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full bg-[#111518] border border-white/[0.07] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#00c853] transition-colors mb-5"
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-[#00c853] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          {rows.length === 0 ? 'Sin datos de ranking aún.' : 'Ningún jugador coincide.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r, i) => (
            <div key={r.player_id} className="flex items-center gap-4 bg-[#111518] border border-white/[0.07] rounded-xl px-4 py-3">
              <div className={`font-['Barlow_Condensed'] text-2xl font-extrabold w-8 ${i < 3 ? 'text-[#00c853]' : 'text-white/25'}`}>
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-base">
                  {r.players?.first_name} {r.players?.last_name}
                </div>
                <div className="text-xs text-white/40">
                  {r.tournaments_played} torneo{r.tournaments_played !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="font-['Barlow_Condensed'] text-3xl font-extrabold text-[#00c853]">
                {r.points}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
