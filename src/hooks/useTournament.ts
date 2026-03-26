import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useTournamentStore } from '../store/tournament'
import type { Match, Standing } from '../store/tournament'

export function useTournament(tournamentId: string) {
  const {
    setCurrentTournament,
    setZones,
    setPairs,
    setMatches,
    setStandings,
    updateMatch,
    updateStanding,
  } = useTournamentStore()

  useEffect(() => {
    if (!tournamentId) return

    // ─── Carga inicial ────────────────────────────────────
    async function load() {
      // Torneo
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single()
      if (tournament) setCurrentTournament(tournament)

      // Zonas
      const { data: zones } = await supabase
        .from('zones')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('order_num')
      if (zones) setZones(zones)

      // Parejas
      const { data: pairs } = await supabase
        .from('pairs')
        .select('*')
        .eq('tournament_id', tournamentId)
      if (pairs) setPairs(pairs)

      // Partidos
      const { data: matches } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('scheduled_time')
      if (matches) setMatches(matches)

      // Standings — obtenemos los de todas las zonas del torneo
      if (zones && zones.length > 0) {
        const zoneIds = zones.map(z => z.id)
        const { data: standings } = await supabase
          .from('standings')
          .select('*')
          .in('zone_id', zoneIds)
        if (standings) setStandings(standings)
      }
    }

    load()

    // ─── Realtime: matches ────────────────────────────────
    const matchChannel = supabase
      .channel(`matches-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          updateMatch(payload.new as Match)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'matches',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        (payload) => {
          useTournamentStore.getState().setMatches([
            ...useTournamentStore.getState().matches,
            payload.new as Match,
          ])
        }
      )
      .subscribe()

    // ─── Realtime: standings ──────────────────────────────
    const standingsChannel = supabase
      .channel(`standings-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'standings',
        },
        (payload) => {
          updateStanding(payload.new as Standing)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(matchChannel)
      supabase.removeChannel(standingsChannel)
    }
  }, [tournamentId])
}
