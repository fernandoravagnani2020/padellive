import { supabase } from './supabase'

const ROUND_ORDER = ['roundof16', 'quarters', 'semis', 'final']

// Pasa el ganador de cada partido del cuadro al slot configurado
// (winner_goes_to_match / winner_goes_to_slot). Idempotente: se puede llamar siempre.
// No pisa partidos destino que ya tienen resultado.
export async function propagateBracketWinners(tournamentId: string) {
  const { data } = await supabase.from('matches')
    .select('id, round, match_order, pair1_id, pair2_id, winner_pair_id, status, winner_goes_to_match, winner_goes_to_slot')
    .eq('tournament_id', tournamentId)
    .in('round', ROUND_ORDER)
  if (!data) return 0

  let updated = 0
  // Ronda por ronda, para que un avance encadenado use los datos ya actualizados
  for (const round of ROUND_ORDER) {
    const nextRound = ROUND_ORDER[ROUND_ORDER.indexOf(round) + 1]
    if (!nextRound) break
    for (const m of data.filter(x => x.round === round)) {
      if (!m.winner_pair_id || !m.winner_goes_to_match || !m.winner_goes_to_slot) continue
      const dest = data.find(x => x.round === nextRound && x.match_order === m.winner_goes_to_match)
      if (!dest || dest.status === 'done' || dest.winner_pair_id) continue
      const slot = m.winner_goes_to_slot === 1 ? 'pair1_id' : 'pair2_id'
      if (dest[slot] === m.winner_pair_id) continue
      const { error } = await supabase.from('matches').update({ [slot]: m.winner_pair_id }).eq('id', dest.id)
      if (!error) { dest[slot] = m.winner_pair_id; updated++ }
    }
  }
  return updated
}
