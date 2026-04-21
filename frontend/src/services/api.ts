import axios from 'axios'
import type {
  AuthUser,
  DashboardStats,
  DraftOverview,
  DraftRecommendation,
  FilterOptions,
  GameMatch,
  HeadToHeadPlayers,
  Hero,
  HeroCounterStat,
  HeroPairStat,
  HeroStats,
  LoginCredentials,
  MatchCreatePayload,
  MetaOverview,
  PaginatedResponse,
  Patch,
  Player,
  PlayerStats,
  PredictionReasoningRequestTeam,
  PredictionReasoningResponse,
  PredictionResponse,
  PredictionSlot,
  RankingEntry,
  Role,
  RoleStats,
  TeamComparison,
  TrendPoint,
  BattleAiRequest,
  BattleAiResponse,
} from '@/types'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || '/api'

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login'
      }
    }
    return Promise.reject(error)
  },
)

// Auth
export const authApi = {
  login: (credentials: LoginCredentials) => api.post<{ token: string; user: AuthUser }>('/admin/login', credentials),
  logout: () => api.post('/admin/logout'),
  me: () => api.get<AuthUser>('/admin/me'),
}

// Players
export const playersApi = {
  getPlayers: (params?: Record<string, unknown>) => api.get<PaginatedResponse<Player>>('/players', { params }),
  getPlayer: (id: number) => api.get<{ data: Player }>(`/players/${id}`),
  createPlayer: (data: Partial<Player>) => api.post<{ data: Player }>('/admin/players', data),
  updatePlayer: (id: number, data: Partial<Player>) => api.put<{ data: Player }>(`/admin/players/${id}`, data),
  deletePlayer: (id: number) => api.delete(`/admin/players/${id}`),
}

// Heroes
export const heroesApi = {
  getHeroes: (params?: Record<string, unknown>) => api.get<PaginatedResponse<Hero>>('/heroes', { params }),
  getHero: (id: number) => api.get<{ data: Hero }>(`/heroes/${id}`),
  createHero: (data: Partial<Hero>) => api.post<{ data: Hero }>('/admin/heroes', data),
  updateHero: (id: number, data: Partial<Hero>) => api.put<{ data: Hero }>(`/admin/heroes/${id}`, data),
  deleteHero: (id: number) => api.delete(`/admin/heroes/${id}`),
}

// Roles
export const rolesApi = {
  getRoles: (params?: Record<string, unknown>) => api.get<PaginatedResponse<Role>>('/roles', { params }),
  createRole: (data: Partial<Role>) => api.post<{ data: Role }>('/admin/roles', data),
  updateRole: (id: number, data: Partial<Role>) => api.put<{ data: Role }>(`/admin/roles/${id}`, data),
  deleteRole: (id: number) => api.delete(`/admin/roles/${id}`),
}

// Matches
export const matchesApi = {
  getMatches: (params?: Record<string, unknown>) => api.get<PaginatedResponse<GameMatch>>('/matches', { params }),
  getMatch: (id: number) => api.get<{ data: GameMatch }>(`/matches/${id}`),
  createMatch: (data: MatchCreatePayload) => api.post<{ data: GameMatch }>('/admin/matches', data),
  updateMatch: (id: number, data: MatchCreatePayload) => api.put<{ data: GameMatch }>(`/admin/matches/${id}`, data),
  deleteMatch: (id: number) => api.delete(`/admin/matches/${id}`),
}

// Statistics
export const statisticsApi = {
  getDashboard: () => api.get<DashboardStats>('/statistics/dashboard'),
  getPlayerStats: (playerId: number) => api.get<PlayerStats>(`/statistics/players/${playerId}`),
  getHeroStats: (params?: Record<string, unknown>) => api.get<HeroStats[]>('/statistics/heroes', { params }),
  getRoleStats: (params?: Record<string, unknown>) => api.get<RoleStats[]>('/statistics/roles', { params }),
  getTrends: (params?: Record<string, unknown>) => api.get<TrendPoint[]>('/statistics/trends', { params }),
}

// Rankings
export const rankingsApi = {
  getRankings: (params?: FilterOptions) => api.get<{ data: RankingEntry[] }>('/rankings', { params: params as Record<string, unknown> }),
}

// Battle AI
export const battleApi = {
  aiRandomize: (data: BattleAiRequest) => api.post<BattleAiResponse>('/battle/ai-randomize', data),
}

// Draft Analysis (Pick/Ban)
export const draftApi = {
  getOverview: (patchId?: number) =>
    api.get<DraftOverview>('/drafts/overview', { params: patchId ? { patch_id: patchId } : {} }),
  getSynergy: (patchId?: number, limit = 20) =>
    api.get<{ data: HeroPairStat[] }>('/drafts/synergy', { params: { patch_id: patchId, limit } }),
  getCounters: (patchId?: number, limit = 20) =>
    api.get<{ data: HeroCounterStat[] }>('/drafts/counters', { params: { patch_id: patchId, limit } }),
  recommend: (allyHeroIds: number[], enemyHeroIds: number[], limit = 10) =>
    api.post<{ data: DraftRecommendation[] }>('/drafts/recommend', {
      ally_hero_ids: allyHeroIds,
      enemy_hero_ids: enemyHeroIds,
      limit,
    }),
  getMatchDraft: (matchId: number) => api.get(`/drafts/match/${matchId}`),
}

// Patches / Meta Tracker
export const patchesApi = {
  list: () => api.get<{ data: Patch[] }>('/patches'),
  get: (id: number) => api.get<{ data: Patch }>(`/patches/${id}`),
  meta: (patchId?: number) => api.get<MetaOverview>('/patches/meta', { params: patchId ? { patch_id: patchId } : {} }),
  create: (data: Partial<Patch>) => api.post<{ data: Patch }>('/admin/patches', data),
  update: (id: number, data: Partial<Patch>) => api.put<{ data: Patch }>(`/admin/patches/${id}`, data),
  remove: (id: number) => api.delete(`/admin/patches/${id}`),
}

// Head-to-Head
export const headToHeadApi = {
  players: (playerAId: number, playerBId: number) =>
    api.get<HeadToHeadPlayers>('/head-to-head/players', {
      params: { player_a_id: playerAId, player_b_id: playerBId },
    }),
  teams: (teamA: number[], teamB: number[]) =>
    api.post<TeamComparison>('/head-to-head/teams', { team_a: teamA, team_b: teamB }),
}

// Win Prediction
export const predictionApi = {
  predict: (teamA: PredictionSlot[], teamB: PredictionSlot[]) =>
    api.post<PredictionResponse>('/prediction/predict', { team_a: teamA, team_b: teamB }),
  reasoning: (
    teamA: PredictionReasoningRequestTeam,
    teamB: PredictionReasoningRequestTeam,
    prediction?: PredictionResponse | null,
  ) =>
    api.post<PredictionReasoningResponse>('/prediction/reasoning', {
      team_a: teamA,
      team_b: teamB,
      prediction: prediction ?? null,
    }),
}

// Screenshots
export const screenshotsApi = {
  upload: (file: File) => {
    const formData = new FormData()
    formData.append('screenshot', file)
    return api.post<{
      data: Partial<MatchCreatePayload>
      screenshot_id: number
      file_path: string
      ocr_message: string
      ocr_success: boolean
    }>('/admin/screenshots/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  confirmParsed: (id: number, data: MatchCreatePayload) => api.post<{ data: GameMatch }>(`/admin/screenshots/${id}/confirm`, data),
}

export default api
