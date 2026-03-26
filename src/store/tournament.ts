import { create } from 'zustand'

// ─── Types ────────────────────────────────────────────────

export interface Tournament {
  id: string
  name: string
  category: string
  gender: string
  status: 'upcoming' | 'live' | 'finished'
  pairs_count: number
  courts_count: number
  start_date: string
  end_date: string | null
  prize_pool: { first: number; second: number; third: number } | null
  rules: string | null
  club_id: string
}

export interface Pair {
  id: string
  display_name: string
  tournament_id: string
  player1_id: string | null
  player2_id: string | null
}

export interface Zone {
  id: string
  name: string
  order_num: number
  tournament_id: string
}

export interface SetScore {
  set: number
  p1: number
  p2: number
}

export interface Match {
  id: string
  tournament_id: string
  zone_id: string | null
  round: 'groups' | 'quarters' | 'semis' | 'final'
  match_order: number | null
  pair1_id: string
  pair2_id: string
  winner_pair_id: string | null
  court: string | null
  day: string | null
  scheduled_time: string | null
  status: 'upcoming' | 'live' | 'done'
  score: SetScore[] | null
}

export interface Standing {
  id: string
  zone_id: string
  pair_id: string
  played: number
  won: number
  sets_won: number
  sets_lost: number
  games_won: number
  games_lost: number
  points: number
  position: number | null
}

// ─── Store ────────────────────────────────────────────────

interface TournamentStore {
  // Data
  tournaments: Tournament[]
  currentTournament: Tournament | null
  zones: Zone[]
  pairs: Map<string, Pair>
  matches: Match[]
  standings: Standing[]

  // UI
  activeTab: string

  // Actions
  setTournaments: (t: Tournament[]) => void
  setCurrentTournament: (t: Tournament) => void
  setZones: (z: Zone[]) => void
  setPairs: (p: Pair[]) => void
  setMatches: (m: Match[]) => void
  setStandings: (s: Standing[]) => void
  updateMatch: (updated: Match) => void
  updateStanding: (updated: Standing) => void
  setActiveTab: (tab: string) => void

  // Computed helpers
  getPairName: (id: string) => string
  getZoneMatches: (zoneId: string) => Match[]
  getZoneStandings: (zoneId: string) => Standing[]
}

export const useTournamentStore = create<TournamentStore>((set, get) => ({
  tournaments: [],
  currentTournament: null,
  zones: [],
  pairs: new Map(),
  matches: [],
  standings: [],
  activeTab: 'zonas',

  setTournaments: (tournaments) => set({ tournaments }),
  setCurrentTournament: (currentTournament) => set({ currentTournament }),
  setZones: (zones) => set({ zones }),
  setPairs: (pairsArr) => {
    const pairs = new Map<string, Pair>()
    pairsArr.forEach(p => pairs.set(p.id, p))
    set({ pairs })
  },
  setMatches: (matches) => set({ matches }),
  setStandings: (standings) => set({ standings }),

  updateMatch: (updated) =>
    set(state => ({
      matches: state.matches.map(m => m.id === updated.id ? updated : m)
    })),

  updateStanding: (updated) =>
    set(state => ({
      standings: state.standings.map(s =>
        s.zone_id === updated.zone_id && s.pair_id === updated.pair_id ? updated : s
      )
    })),

  setActiveTab: (activeTab) => set({ activeTab }),

  getPairName: (id) => get().pairs.get(id)?.display_name ?? 'Por definir',

  getZoneMatches: (zoneId) =>
    get().matches.filter(m => m.zone_id === zoneId),

  getZoneStandings: (zoneId) =>
    get().standings
      .filter(s => s.zone_id === zoneId)
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points
        const diffA = a.sets_won - a.sets_lost
        const diffB = b.sets_won - b.sets_lost
        if (diffB !== diffA) return diffB - diffA
        return (b.games_won - b.games_lost) - (a.games_won - a.games_lost)
      }),
}))
