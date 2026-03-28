export interface League {
  id: string
  name: string
  season: string | null
  status: 'active' | 'finished'
  description: string | null
}

export interface Team {
  id: string
  league_id: string
  name: string
  order_num: number
}

export interface Round {
  id: string
  league_id: string
  number: number
  label: string | null
  date: string | null
}

export interface SetScore {
  set: number
  home: number
  away: number
}

export interface LeagueMatch {
  id: string
  league_id: string
  round_id: string
  home_team_id: string
  away_team_id: string
  score: SetScore[] | null
  home_sets: number
  away_sets: number
  home_games: number
  away_games: number
  winner_id: string | null
  home_points: number
  away_points: number
  home_bonus: number
  away_bonus: number
  status: 'upcoming' | 'live' | 'done'
  match_date: string | null
  scheduled_time: string | null
  court: string | null
}

export interface Standing {
  id: string
  league_id: string
  team_id: string
  played: number
  won: number
  lost: number
  points: number
  sets_won: number
  sets_lost: number
  games_won: number
  games_lost: number
}
