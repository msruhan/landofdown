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
  /** Featured card: highest wins, then best avg rating among those tied */
  season_mvp?: LeaderboardEntry | null
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
  mvp_win_count: number
  mvp_lose_count: number
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
  previous_rank?: number | null
  rank_change?: number
  player_id: number
  username: string
  avatar_url?: string | null
  matches_played: number
  wins: number
  losses: number
  win_rate: number
  mvp_count: number
  mvp_win_count?: number
  mvp_lose_count?: number
  avg_rating: number
  total_kda: KDA
  avg_kda: KDA
  recent_form?: string[]
  form_meter?: 'hot' | 'warm' | 'cold'
  top_hero?: string
  top_hero_icon?: string | null
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
  recent_form?: string[]
  form_meter?: 'hot' | 'warm' | 'cold'
  recommended_role?: { role: Role; times_played: number; win_rate: number } | null
  achievements?: {
    key: string
    label: string
    description?: string
    tier?: 'legendary' | 'epic' | 'rare' | 'common'
    icon?: string
  }[]
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
  hero: { id: number; name: string; icon_url?: string | null } | null
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
  username?: string | null
  avatar_url?: string | null
  is_admin?: boolean
}

export interface RegisterPayload {
  name: string
  username?: string | null
  email: string
  password: string
  password_confirmation: string
  avatar_url?: string | null
}

// -------------------- Mabar Lounge --------------------

export type MabarType = 'push_rank' | 'classic' | 'brawl' | 'tournament' | 'coaching'
export type MabarVibe = 'sweaty' | 'chill' | 'tryhard' | 'learning' | 'event'
export type MabarRank = 'any' | 'epic' | 'legend' | 'mythic' | 'mythic_honor' | 'mythic_glory' | 'mythic_immortal'
export type MabarRole = 'any' | 'tank' | 'jungle' | 'roam' | 'mid' | 'exp' | 'gold' | 'support'
export type MabarStatus = 'open' | 'full' | 'live' | 'closed' | 'expired' | 'cancelled'
export type MabarVoice = 'discord' | 'in_game' | 'chat'
export type MabarRecurrence = 'none' | 'weekly'

export interface MabarUser {
  id: number
  name: string
  username?: string | null
  avatar_url?: string | null
  is_admin?: boolean
}

export interface MabarSlotDTO {
  id: number
  slot_index: number
  role_preference: MabarRole
  status: 'open' | 'pending' | 'confirmed' | 'left'
  joined_at?: string | null
  user: MabarUser | null
}

export interface MabarRatingDTO {
  id: number
  stars: number
  tags: string[]
  comment?: string | null
  from_user: MabarUser | null
  to_user: MabarUser | null
  created_at?: string
}

export interface MabarSessionDTO {
  id: number
  title: string
  type: MabarType
  vibe?: MabarVibe | null
  rank_requirement: MabarRank
  starts_at: string
  ends_at?: string | null
  recurrence: MabarRecurrence
  recurrence_days?: string[] | null
  max_slots: number
  filled_slots: number
  pending_requests?: number
  status: MabarStatus
  voice_platform?: MabarVoice | null
  discord_link?: string | null
  room_id?: string | null
  notes?: string | null
  is_featured: boolean
  invite_code?: string
  synergy_with_viewer?: {
    matches: number
    wins_hint: number
    avg_rating_hint?: number | null
  } | null
  host: MabarUser | null
  slots: MabarSlotDTO[]
  ratings?: MabarRatingDTO[]
  created_at?: string
}

export interface MabarSessionPayload {
  title: string
  type: MabarType
  vibe?: MabarVibe | null
  rank_requirement?: MabarRank
  starts_at: string
  ends_at?: string | null
  recurrence?: MabarRecurrence
  recurrence_days?: string[] | null
  max_slots?: number
  voice_platform?: MabarVoice | null
  discord_link?: string | null
  room_id?: string | null
  notes?: string | null
  slot_roles?: MabarRole[]
}

export interface MabarSignalDTO {
  user: MabarUser
  active_until?: string | null
  mood_tag?: MabarVibe | null
  note?: string | null
  minutes_left: number
}

export interface MabarSignalPayload {
  duration_minutes?: number
  mood_tag?: MabarVibe | null
  note?: string | null
}

export interface MabarMyStats {
  hosted: number
  joined: number
  avg_stars?: number | null
  rating_count: number
  upcoming: MabarSessionDTO[]
  badges: { key: string; label: string; tier: string; description: string }[]
}

// ----- Mabar Room (chat) -----
export type MabarMessageKind = 'text' | 'system' | 'quick' | 'gif'

export interface MabarReaction {
  emoji: string
  count: number
  mine: boolean
}

export interface MabarMessageDTO {
  id: number
  kind: MabarMessageKind
  body: string
  is_pinned: boolean
  reactions: MabarReaction[]
  created_at: string
  user: MabarUser | null
  reply_to: {
    id: number
    body: string
    user: { id: number; name: string } | null
  } | null
}

export interface MabarRoomMember {
  slot_id: number
  slot_index: number
  role_preference: string
  status: string
  last_seen_at: string | null
  online: boolean
  user: MabarUser | null
}

export interface MabarRoomSession {
  id: number
  title: string
  type: MabarType
  vibe: MabarVibe | null
  rank_requirement: MabarRank
  starts_at: string | null
  ends_at: string | null
  status: MabarStatus
  voice_platform: MabarVoice | null
  discord_link: string | null
  room_id: string | null
  notes: string | null
  max_slots: number
  filled_slots: number
  host: MabarUser | null
  is_viewer_host: boolean
  members: MabarRoomMember[]
}

export interface MabarRoomResponse {
  session: MabarRoomSession
  pinned_message: MabarMessageDTO | null
  messages: MabarMessageDTO[]
  quick_templates: Record<string, string>
  your_role: 'host' | 'confirmed' | 'pending' | 'left' | 'none'
}

export interface MabarMessagesPoll {
  messages: MabarMessageDTO[]
  members: {
    user_id: number
    name: string
    username: string | null
    avatar_url: string | null
    status: string
    role_preference: string
    slot_index: number
    last_seen_at: string | null
    online: boolean
  }[]
  pinned_message_id: number | null
  session_status: MabarStatus
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
  patch_id?: number
  period?: string
  min_matches?: number
  per_page?: number
  sort_by?: string
  sort_dir?: 'asc' | 'desc'
}

export interface SynergyEntry {
  players: { id: number; username: string }[]
  matches: number
  wins: number
  win_rate: number
  avg_rating: number
}

export interface Patch {
  id: number
  version: string
  name?: string | null
  release_date: string
  notes?: string | null
  match_count?: number
}

export interface HeroPickStat {
  hero_id: number
  hero_name: string
  icon_url?: string | null
  picks: number
  wins: number
  win_rate: number
}

export interface HeroBanStat {
  hero_id: number
  hero_name: string
  icon_url?: string | null
  bans: number
}

export interface HeroPairStat {
  hero_a: { id: number; name: string; icon_url?: string | null }
  hero_b: { id: number; name: string; icon_url?: string | null }
  matches: number
  wins: number
  win_rate: number
}

export interface HeroCounterStat {
  hero: { id: number; name: string; icon_url?: string | null }
  enemy: { id: number; name: string; icon_url?: string | null }
  matches: number
  wins: number
  win_rate: number
}

export interface DraftOverview {
  top_picks: HeroPickStat[]
  top_bans: HeroBanStat[]
  hero_pair_synergy: HeroPairStat[]
  hero_counters: HeroCounterStat[]
}

export interface DraftRecommendation {
  hero: { id: number; name: string; icon_url?: string | null; role_id?: number | null }
  synergy_rate: number
  counter_rate: number
  score: number
  sample: number
}

export interface MetaComparisonHero extends HeroPickStat {
  previous_win_rate: number | null
  delta_win_rate: number | null
  previous_picks: number
  delta_picks: number
}

export interface MetaComparisonRole {
  role_id: number
  role_name: string
  usage: number
  win_rate: number
  previous_win_rate: number | null
  delta_win_rate: number | null
}

export interface MetaComparisonPlayer {
  player_id: number
  username: string
  avatar_url?: string | null
  matches_played: number
  wins: number
  win_rate: number
  avg_rating: number | null
  previous_win_rate: number | null
  delta_win_rate: number | null
  previous_avg_rating: number | null
  delta_avg_rating: number | null
}

export interface MetaOverview {
  current_patch: Patch | null
  previous_patch: Patch | null
  hero_performance: MetaComparisonHero[]
  role_performance: MetaComparisonRole[]
  player_performance: MetaComparisonPlayer[]
}

export interface PlayerFormCard {
  id: number
  username: string
  avatar_url?: string | null
  total_matches: number
  overall_win_rate: number
  recent_form: string[]
  recent_win_rate: number
}

export interface HeadToHeadEntry {
  match_id: number
  match_date: string
  a: {
    team: 'team_a' | 'team_b'
    hero_id?: number
    hero?: string
    hero_icon?: string | null
    role?: string
    kills?: number
    deaths?: number
    assists?: number
    kda: string
    rating: number | null
    result: 'win' | 'lose'
  }
  b: {
    team: 'team_a' | 'team_b'
    hero_id?: number
    hero?: string
    hero_icon?: string | null
    role?: string
    kills?: number
    deaths?: number
    assists?: number
    kda: string
    rating: number | null
    result: 'win' | 'lose'
  }
}

export interface HeadToHeadRivalryRow {
  wins: number
  win_rate: number
  avg_rating: number | null
  avg_kills: number
  avg_deaths: number
  avg_assists: number
  kda_ratio: number
}

export interface HeadToHeadRivalry {
  leader: 'a' | 'b' | 'tie'
  reason?: string
  leader_label: string
  games: number
  dominance_pct_a: number
  player_a: HeadToHeadRivalryRow | null
  player_b: HeadToHeadRivalryRow | null
  streak: { side: 'a' | 'b'; count: number; label: string } | null
}

export interface HeadToHeadPlayers {
  player_a: PlayerFormCard
  player_b: PlayerFormCard
  summary: {
    total_matches: number
    as_opponents: number
    as_teammates: number
    player_a_wins_vs_b: number
    player_b_wins_vs_a: number
  }
  rivalry?: HeadToHeadRivalry
  head_to_head: HeadToHeadEntry[]
  as_teammates: HeadToHeadEntry[]
  favorite_heroes: {
    a: { hero?: string; hero_icon?: string | null; matches: number; wins: number; win_rate: number }[]
    b: { hero?: string; hero_icon?: string | null; matches: number; wins: number; win_rate: number }[]
  }
  favorite_heroes_h2h?: {
    a: { hero?: string; hero_icon?: string | null; matches: number; wins: number; win_rate: number }[]
    b: { hero?: string; hero_icon?: string | null; matches: number; wins: number; win_rate: number }[]
  }
}

export interface TeamComparison {
  summary: {
    total_matches: number
    team_a_wins: number
    team_b_wins: number
    team_a_win_rate: number
  }
  matches: {
    match_id: number
    match_date: string
    winner: 'team_a' | 'team_b'
    roster_a: { player?: string; hero?: string; hero_icon?: string | null }[]
    roster_b: { player?: string; hero?: string; hero_icon?: string | null }[]
  }[]
}

export interface PredictionSlot {
  player_id: number
  hero_id?: number | null
  role_id?: number | null
}

export interface PredictionPlayerResult {
  player_id: number
  username: string | null
  avatar_url?: string | null
  hero_id: number | null
  role_id: number | null
  score: number
  recent_form: { matches: number; wins: number; rate: number; streak: string[] }
  overall: { matches: number; wins: number; rate: number }
  hero_mastery: { matches: number; wins: number; rate: number } | null
  role_mastery: { matches: number; wins: number; rate: number } | null
}

export interface PredictionResponse {
  team_a: {
    score: number
    win_probability: number
    players: PredictionPlayerResult[]
  }
  team_b: {
    score: number
    win_probability: number
    players: PredictionPlayerResult[]
  }
  confidence: number
  weights: Record<string, number>
}

export interface PredictionReasoningFactor {
  type: 'form' | 'hero_mastery' | 'role_mastery' | 'overall_winrate' | 'matchup' | 'synergy'
  team: 'team_a' | 'team_b' | 'neutral'
  title: string
  description: string
}

export interface PredictionReasoningResponse {
  favored_team: 'team_a' | 'team_b' | 'draw'
  summary: string
  key_factors: PredictionReasoningFactor[]
  model?: string
  warning?: string
  raw?: string
}

export interface PredictionReasoningRequestTeam {
  name?: string
  players: PredictionSlot[]
}
