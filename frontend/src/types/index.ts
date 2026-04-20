export interface Player {
  id: number
  username: string
  avatar_url?: string | null
  created_at?: string
  updated_at?: string
}

export interface Hero {
  id: number
  name: string
  role_id?: number | null
  role?: Role
  hero_role?: string | null
  lane?: 'jungle' | 'exp' | 'gold' | 'mid' | 'roam' | null
  created_at?: string
  updated_at?: string
}

export interface Role {
  id: number
  name: string
  heroes_count?: number
  created_at?: string
  updated_at?: string
}

export interface MatchPlayer {
  id: number
  match_id: number
  player_id: number
  hero_id: number
  role_id: number
  team: 'team_a' | 'team_b'
  kills: number
  deaths: number
  assists: number
  rating: number
  medal: 'mvp_win' | 'mvp_lose' | 'gold' | 'silver' | 'bronze' | null
  result: 'win' | 'lose'
  player?: Player
  hero?: Hero
  role?: Role
}

export interface GameMatch {
  id: number
  match_date: string
  duration?: string
  team_a_name: string
  team_b_name: string
  winner: 'team_a' | 'team_b'
  notes?: string
  screenshot_path?: string | null
  match_players?: MatchPlayer[]
  created_at?: string
  updated_at?: string
}

export interface DashboardStats {
  total_matches: number
  total_players: number
  total_heroes: number
  total_mvps: number
  global_win_rate: number
  top_winners: LeaderboardEntry[]
  top_mvps: LeaderboardEntry[]
  recent_matches: GameMatch[]
  win_trend: TrendPoint[]
  most_used_heroes: HeroUsage[]
  most_played_roles: RoleUsage[]
}

export interface LeaderboardEntry {
  player_id: number
  username: string
  matches_played: number
  wins: number
  losses: number
  win_rate: number
  mvp_count: number
  avg_rating: number
  avg_kills: number
  avg_deaths: number
  avg_assists: number
}

export interface KDA {
  kills: number
  deaths: number
  assists: number
}

export interface RankingEntry {
  rank?: number
  player_id: number
  username: string
  matches_played: number
  wins: number
  losses: number
  win_rate: number
  mvp_count: number
  avg_rating: number
  total_kda: KDA
  avg_kda: KDA
  top_hero?: string
  top_role?: string
}

export interface PlayerStats {
  player: Player
  total_matches: number
  total_wins: number
  total_losses: number
  win_rate: number
  medals: { mvp: number; mvp_win?: number; mvp_lose?: number; gold: number; silver: number; bronze: number }
  avg_rating: number | null
  total_kda: KDA
  avg_kda: KDA
  roles_played: RolePlayed[]
  heroes_used: HeroUsed[]
  recent_performance: RecentPerformance[]
  rating_trend: { match_id: number; rating: number }[]
  current_streak: { type: 'win' | 'lose' | null; count: number }
  mvp_rate: number
  hero_pool_diversity: number
  first_match_date: string | null
  latest_match_date: string | null
}

export interface RolePlayed {
  role: Role
  times_played: number
  wins: number
  win_rate: number
}

export interface HeroUsed {
  hero: Hero
  times_played: number
  wins: number
  win_rate: number
  avg_rating: number
}

export interface RecentPerformance {
  match_id: number
  match_date: string
  hero: string
  role: string
  kills: number
  deaths: number
  assists: number
  rating: number
  medal: string | null
  result: 'win' | 'lose'
}

export interface HeroStats {
  id: number
  name: string
  icon_url: string | null
  role_id: number | null
  usage_count: number
  wins: number
  win_rate: number
  avg_rating: number | null
  mvp_count: number
  best_player: { id: number; username: string; avg_rating: number } | null
  top_players?: { id: number; username: string; matches: number; avg_rating: number }[]
}

export interface RoleStats {
  id: number
  name: string
  usage_count: number
  wins: number
  win_rate: number
  avg_rating: number | null
  most_used_player?: { id: number; username: string; matches: number } | null
  most_winning_player?: { id: number; username: string; wins: number; matches: number; win_rate: number } | null
  top_used_players?: { id: number; username: string; matches: number; wins: number; win_rate: number }[]
  top_winning_players?: { id: number; username: string; wins: number; matches: number; win_rate: number }[]
  best_player: { id: number; username: string; avg_rating: number } | null
}

export interface TrendPoint {
  label: string
  value: number
  result?: 'win' | 'loss'
}

export interface HeroUsage {
  hero_name: string
  count: number
  win_rate?: number
}

export interface RoleUsage {
  role_name: string
  count: number
  win_rate?: number
}

export interface RoleDistribution {
  role_name: string
  count: number
  percentage: number
}

export interface WinRateByCategory {
  name: string
  matches: number
  wins: number
  win_rate: number
}

export interface PaginatedResponse<T> {
  data: T[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthUser {
  id: number
  name: string
  email: string
}

export interface MatchCreatePayload {
  match_date: string
  duration?: string
  team_a_name: string
  team_b_name: string
  winner: 'team_a' | 'team_b'
  notes?: string
  screenshot_path?: string
  players: MatchPlayerPayload[]
}

export interface MatchPlayerPayload {
  player_id: number
  hero_id: number
  role_id: number
  team: 'team_a' | 'team_b'
  kills: number
  deaths: number
  assists: number
  rating: number
  medal: 'mvp_win' | 'mvp_lose' | 'gold' | 'silver' | 'bronze' | null
}

export interface BattleAiPlayer {
  id: number
  username: string
}

export interface BattleAiRequest {
  prompt: string
  team_a_name?: string
  team_b_name?: string
  players: BattleAiPlayer[]
  current_slots?: BattleAiSlot[]
  instruction_history?: string[]
}

export interface BattleAiSlot {
  lane: 'jungle' | 'exp' | 'mid' | 'gold' | 'roam'
  team_a_player_id: number
  team_b_player_id: number
}

export interface BattleAiResponse {
  team_a_name: string
  team_b_name: string
  slots: BattleAiSlot[]
}

export interface Column {
  key: string
  label: string
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
}

export interface Pagination {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface FilterOptions {
  role_id?: number
  hero_id?: number
  period?: string
  min_matches?: number
  sort_by?: string
  sort_dir?: 'asc' | 'desc'
}
