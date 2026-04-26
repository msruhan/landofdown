import axios from 'axios'
import type {
  AuthUser,
  MabarMyStats,
  MabarMessageDTO,
  MabarMessagesPoll,
  MabarRoomResponse,
  MabarSessionDTO,
  MabarSessionPayload,
  MabarSignalDTO,
  MabarSignalPayload,
  RegisterPayload,
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
  SynergyEntry,
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
      const path = window.location.pathname
      if ((path.startsWith('/admin') && path !== '/admin/login') || path.startsWith('/mabar')) {
        window.location.href = '/login?redirect=' + encodeURIComponent(path + window.location.search)
      }
    }
    return Promise.reject(error)
  },
)

// Auth
export const authApi = {
  login: (credentials: LoginCredentials) => api.post<{ token: string; user: AuthUser }>('/auth/login', credentials),
  register: (payload: RegisterPayload) => api.post<{ token: string; user: AuthUser }>('/auth/register', payload),
  logout: () => api.post('/auth/logout'),
  me: () => api.get<AuthUser>('/auth/me'),
}

// Mabar Lounge
export const mabarApi = {
  listSessions: (params?: Record<string, unknown>) =>
    api.get<{ data: MabarSessionDTO[] }>('/mabar/sessions', { params }),
  getSession: (id: number) => api.get<MabarSessionDTO>(`/mabar/sessions/${id}`),
  createSession: (payload: MabarSessionPayload) => api.post<MabarSessionDTO>('/mabar/sessions', payload),
  updateSession: (id: number, payload: Partial<MabarSessionPayload>) =>
    api.patch<MabarSessionDTO>(`/mabar/sessions/${id}`, payload),
  deleteSession: (id: number) => api.delete(`/mabar/sessions/${id}`),
  joinSession: (id: number, data?: { slot_id?: number; role_preference?: string }) =>
    api.post<{ message: string; slot_id: number }>(`/mabar/sessions/${id}/join`, data ?? {}),
  leaveSession: (id: number) => api.post(`/mabar/sessions/${id}/leave`),
  approveSlot: (id: number, slotId: number) =>
    api.post(`/mabar/sessions/${id}/slots/${slotId}/approve`),
  kickSlot: (id: number, slotId: number) =>
    api.post(`/mabar/sessions/${id}/slots/${slotId}/kick`),
  transition: (id: number, status: string) =>
    api.post(`/mabar/sessions/${id}/transition`, { status }),
  toggleFeature: (id: number) => api.post<{ is_featured: boolean }>(`/mabar/sessions/${id}/feature`),
  rate: (id: number, data: { to_user_id: number; stars: number; tags?: string[]; comment?: string }) =>
    api.post(`/mabar/sessions/${id}/rate`, data),
  listReadyNow: () => api.get<{ data: MabarSignalDTO[] }>('/mabar/ready-now'),
  setReadyNow: (payload: MabarSignalPayload) => api.post<MabarSignalDTO>('/mabar/ready-now', payload),
  clearReadyNow: () => api.delete('/mabar/ready-now'),
  myStats: () => api.get<MabarMyStats>('/mabar/me'),

  // ---- Private Room (chat) ----
  room: (id: number) => api.get<MabarRoomResponse>(`/mabar/sessions/${id}/room`),
  listMessages: (id: number, since?: number) =>
    api.get<MabarMessagesPoll>(`/mabar/sessions/${id}/messages`, { params: since ? { since } : {} }),
  sendMessage: (id: number, body: string, opts?: { reply_to_id?: number; kind?: 'text' | 'quick' | 'gif' }) =>
    api.post<MabarMessageDTO>(`/mabar/sessions/${id}/messages`, { body, ...(opts ?? {}) }),
  reactMessage: (id: number, msgId: number, emoji: string) =>
    api.post<MabarMessageDTO>(`/mabar/sessions/${id}/messages/${msgId}/react`, { emoji }),
  togglePinMessage: (id: number, msgId: number) =>
    api.post<{ pinned: boolean }>(`/mabar/sessions/${id}/messages/${msgId}/pin`),
  deleteMessage: (id: number, msgId: number) =>
    api.delete(`/mabar/sessions/${id}/messages/${msgId}`),
  heartbeat: (id: number) => api.post(`/mabar/sessions/${id}/heartbeat`),
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
  getDashboard: (params?: Record<string, unknown>) => api.get<DashboardStats>('/statistics/dashboard', { params }),
  getPlayerStats: (playerId: number, params?: Record<string, unknown>) => api.get<PlayerStats>(`/statistics/players/${playerId}`, { params }),
  getHeroStats: (params?: Record<string, unknown>) => api.get<HeroStats[]>('/statistics/heroes', { params }),
  getRoleStats: (params?: Record<string, unknown>) => api.get<RoleStats[]>('/statistics/roles', { params }),
  getTrends: (params?: Record<string, unknown>) => api.get<TrendPoint[]>('/statistics/trends', { params }),
  getSynergy: (params?: Record<string, unknown>) => api.get<{ top_duos: SynergyEntry[]; top_trios: SynergyEntry[] }>('/statistics/synergy', { params }),
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
