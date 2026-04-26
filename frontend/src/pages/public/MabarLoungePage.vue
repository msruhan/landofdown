<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { mabarApi } from '@/services/api'
import type {
  MabarMyStats,
  MabarSessionDTO,
  MabarSessionPayload,
  MabarSignalDTO,
  MabarVibe,
} from '@/types'
import MabarSessionCard from '@/components/mabar/MabarSessionCard.vue'
import MabarSessionModal from '@/components/mabar/MabarSessionModal.vue'
import MabarSessionDetail from '@/components/mabar/MabarSessionDetail.vue'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const sessions = ref<MabarSessionDTO[]>([])
const readyNow = ref<MabarSignalDTO[]>([])
const myStats = ref<MabarMyStats | null>(null)

const loading = ref(false)
const refreshing = ref(false)
const busy = ref(false)
const err = ref<string | null>(null)
const toast = ref<{ kind: 'ok' | 'err'; msg: string } | null>(null)

const filters = ref<{ when: string | null; type: string | null; vibe: string | null; mine: boolean }>({
  when: null,
  type: null,
  vibe: null,
  mine: false,
})

// Ready-now toggle state
const mySignal = ref<MabarSignalDTO | null>(null)
const signalBusy = ref(false)

// Modals
const createModalOpen = ref(false)
const editing = ref<MabarSessionDTO | null>(null)
const detailOpen = ref(false)
const detailSession = ref<MabarSessionDTO | null>(null)

const quickWhenOptions = [
  { value: null, label: 'All' },
  { value: 'starting_soon', label: 'Starting soon' },
  { value: 'today', label: 'Today' },
  { value: 'tonight', label: 'Tonight' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'weekend', label: 'Weekend' },
]

const quickTypeOptions = [
  { value: null, label: 'All types' },
  { value: 'push_rank', label: 'Push Rank' },
  { value: 'classic', label: 'Classic' },
  { value: 'brawl', label: 'Brawl' },
  { value: 'tournament', label: 'Tournament' },
  { value: 'coaching', label: 'Coaching' },
]

const quickVibeOptions = [
  { value: null, label: 'Any vibe' },
  { value: 'chill', label: 'Chill' },
  { value: 'sweaty', label: 'Sweaty' },
  { value: 'tryhard', label: 'Tryhard' },
  { value: 'learning', label: 'Learning' },
  { value: 'event', label: 'Event' },
]

const readySignalDurations = [
  { value: 15, label: '15m' },
  { value: 30, label: '30m' },
  { value: 60, label: '1h' },
  { value: 120, label: '2h' },
]

const liveCountdown = ref(Date.now())
let liveTimer: number | undefined
let refreshTimer: number | undefined
const lastPendingMap = ref<Record<number, number>>({})

const totalReady = computed(() => readyNow.value.length)
const totalOpenSessions = computed(() => sessions.value.filter((s) => s.status === 'open').length)
const totalStartingSoon = computed(() => {
  const now = Date.now()
  return sessions.value.filter((s) => {
    const t = new Date(s.starts_at).getTime()
    return t > now && t - now < 2 * 3600 * 1000
  }).length
})

function flash(kind: 'ok' | 'err', msg: string) {
  toast.value = { kind, msg }
  setTimeout(() => (toast.value = null), 3500)
}

async function loadSessions() {
  const params: Record<string, unknown> = {}
  if (filters.value.when) params.when = filters.value.when
  if (filters.value.type) params.type = filters.value.type
  if (filters.value.vibe) params.vibe = filters.value.vibe
  if (filters.value.mine) params.mine = 1

  try {
    const { data } = await mabarApi.listSessions(params)
    sessions.value = data.data
  } catch (e) {
    err.value = 'Gagal memuat sessions'
    console.error(e)
  }
}

async function loadReadyNow() {
  try {
    const { data } = await mabarApi.listReadyNow()
    readyNow.value = data.data
    const mine = readyNow.value.find((s) => s.user.id === auth.user?.id) ?? null
    mySignal.value = mine
  } catch {
    // ignore
  }
}

async function loadMyStats() {
  try {
    const { data } = await mabarApi.myStats()
    myStats.value = data
  } catch {
    // ignore
  }
}

async function refreshAll() {
  refreshing.value = true
  await Promise.all([loadSessions(), loadReadyNow(), loadMyStats()])
  notifyHostForNewRequests()
  refreshing.value = false
}

function notifyHostForNewRequests() {
  if (!auth.user?.id) return
  const mine = sessions.value.filter((s) => s.host?.id === auth.user?.id)
  for (const s of mine) {
    const current = s.pending_requests ?? 0
    const prev = lastPendingMap.value[s.id] ?? 0
    if (current > prev) {
      const delta = current - prev
      flash('ok', `${delta} new join request for "${s.title}"`)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New mabar join request', {
          body: `${delta} player requested to join: ${s.title}`,
        })
      }
    }
    lastPendingMap.value[s.id] = current
  }
}

watch(
  () => ({ ...filters.value }),
  () => loadSessions(),
)

onMounted(async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {})
  }

  loading.value = true
  await refreshAll()
  loading.value = false

  const invite = route.query.invite
  if (typeof invite === 'string' && /^\d+$/.test(invite)) {
    await openDetail(Number(invite))
  }

  liveTimer = window.setInterval(() => (liveCountdown.value = Date.now()), 1000)
  refreshTimer = window.setInterval(refreshAll, 30000)
})

onBeforeUnmount(() => {
  if (liveTimer) clearInterval(liveTimer)
  if (refreshTimer) clearInterval(refreshTimer)
})

function openCreate() {
  editing.value = null
  createModalOpen.value = true
}

function openEdit(session: MabarSessionDTO) {
  editing.value = session
  detailOpen.value = false
  createModalOpen.value = true
}

async function submitSession(payload: MabarSessionPayload) {
  busy.value = true
  try {
    if (editing.value) {
      await mabarApi.updateSession(editing.value.id, payload)
      flash('ok', 'Session updated')
    } else {
      await mabarApi.createSession(payload)
      flash('ok', 'Session published — squad is live')
    }
    createModalOpen.value = false
    editing.value = null
    await refreshAll()
  } catch (e) {
    console.error(e)
    flash('err', 'Gagal menyimpan session')
  } finally {
    busy.value = false
  }
}

async function openDetail(id: number) {
  try {
    const { data } = await mabarApi.getSession(id)
    detailSession.value = data
    detailOpen.value = true
  } catch (e) {
    console.error(e)
    flash('err', 'Gagal memuat detail')
  }
}

function shareSession(session: MabarSessionDTO) {
  const url = `${window.location.origin}/mabar?invite=${session.invite_code || session.id}`
  navigator.clipboard?.writeText(url).then(
    () => flash('ok', 'Invite link copied'),
    () => flash('err', 'Failed to copy invite link'),
  )
}

async function quickJoin(id: number) {
  busy.value = true
  try {
    await mabarApi.joinSession(id)
    flash('ok', 'Joined — entering private room...')
    router.push({ name: 'mabar-room', params: { id: String(id) } })
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    flash('err', msg || 'Gagal join')
  } finally {
    busy.value = false
  }
}

async function joinSlot(slotId: number) {
  if (!detailSession.value) return
  const sid = detailSession.value.id
  busy.value = true
  try {
    await mabarApi.joinSession(sid, { slot_id: slotId })
    flash('ok', 'Joined — entering private room...')
    router.push({ name: 'mabar-room', params: { id: String(sid) } })
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    flash('err', msg || 'Gagal join slot')
  } finally {
    busy.value = false
  }
}

function enterRoom(id: number) {
  router.push({ name: 'mabar-room', params: { id: String(id) } })
}

async function leaveSession(id?: number) {
  const targetId = id ?? detailSession.value?.id
  if (!targetId) return
  busy.value = true
  try {
    await mabarApi.leaveSession(targetId)
    flash('ok', 'Left the session')
    await refreshAll()
    if (detailSession.value?.id === targetId) await reloadDetail()
  } catch (e) {
    console.error(e)
    flash('err', 'Gagal leave')
  } finally {
    busy.value = false
  }
}

async function approveSlot(slotId: number) {
  if (!detailSession.value) return
  busy.value = true
  try {
    await mabarApi.approveSlot(detailSession.value.id, slotId)
    await reloadDetail()
    await loadSessions()
    flash('ok', 'Approved')
  } catch (e) {
    console.error(e)
    flash('err', 'Gagal approve')
  } finally {
    busy.value = false
  }
}

async function kickSlot(slotId: number) {
  if (!detailSession.value) return
  busy.value = true
  try {
    await mabarApi.kickSlot(detailSession.value.id, slotId)
    await reloadDetail()
    await loadSessions()
    flash('ok', 'Player removed')
  } catch (e) {
    console.error(e)
    flash('err', 'Gagal kick')
  } finally {
    busy.value = false
  }
}

async function transitionStatus(status: string) {
  if (!detailSession.value) return
  busy.value = true
  try {
    await mabarApi.transition(detailSession.value.id, status)
    await reloadDetail()
    await loadSessions()
    flash('ok', `Status ${status}`)
  } catch (e) {
    console.error(e)
    flash('err', 'Gagal update status')
  } finally {
    busy.value = false
  }
}

async function deleteSession(id?: number) {
  const targetId = id ?? detailSession.value?.id
  if (!targetId) return
  if (!confirm('Yakin hapus session ini? Tindakan tidak bisa di-undo.')) return
  busy.value = true
  try {
    await mabarApi.deleteSession(targetId)
    detailOpen.value = false
    await refreshAll()
    flash('ok', 'Session dihapus')
  } catch (e) {
    console.error(e)
    flash('err', 'Gagal hapus')
  } finally {
    busy.value = false
  }
}

async function toggleFeature(id: number) {
  busy.value = true
  try {
    await mabarApi.toggleFeature(id)
    await refreshAll()
    flash('ok', 'Updated featured')
  } catch {
    flash('err', 'Gagal feature')
  } finally {
    busy.value = false
  }
}

async function submitRate(payload: { to_user_id: number; stars: number; tags: string[]; comment?: string }) {
  if (!detailSession.value) return
  busy.value = true
  try {
    await mabarApi.rate(detailSession.value.id, payload)
    flash('ok', 'Rating terkirim')
    await reloadDetail()
  } catch {
    flash('err', 'Gagal rating')
  } finally {
    busy.value = false
  }
}

async function reloadDetail() {
  if (!detailSession.value) return
  try {
    const { data } = await mabarApi.getSession(detailSession.value.id)
    detailSession.value = data
  } catch {
    // ignore
  }
}

async function setReady(minutes: number, mood: MabarVibe | null = null) {
  signalBusy.value = true
  try {
    await mabarApi.setReadyNow({ duration_minutes: minutes, mood_tag: mood })
    flash('ok', `You're ready for ${minutes}m`)
    await loadReadyNow()
  } catch {
    flash('err', 'Gagal set ready')
  } finally {
    signalBusy.value = false
  }
}

async function clearReady() {
  signalBusy.value = true
  try {
    await mabarApi.clearReadyNow()
    await loadReadyNow()
    flash('ok', 'You are now offline')
  } catch {
    flash('err', 'Gagal clear ready')
  } finally {
    signalBusy.value = false
  }
}

const readyLabel = computed(() => {
  if (!mySignal.value) return null
  return `Ready · ${mySignal.value.minutes_left}m left`
})
</script>

<template>
  <div class="mabar-page">
    <!-- HERO BANNER -->
    <section class="mabar-hero">
      <div class="mabar-hero__bg"></div>
      <div class="mabar-hero__inner">
        <div class="mabar-hero__copy">
          <span class="mabar-hero__eyebrow">
            <span class="mabar-hero__pulse"></span>
            MABAR LOUNGE
          </span>
          <h1 class="mabar-hero__title">
            Find your <span class="gradient-text">squad</span><br />
            for tonight's push
          </h1>
          <p class="mabar-hero__sub">
            Buat room, ajak teman, atau gabung squad yang lagi ready.
            Semua jadwal mabar & push rank di satu tempat.
          </p>

          <div class="mabar-hero__ticker">
            <span>
              <span class="dot dot--green"></span>
              {{ totalReady }} player ready now
            </span>
            <span class="sep">·</span>
            <span>
              <span class="dot dot--pink"></span>
              {{ totalOpenSessions }} session open
            </span>
            <span class="sep">·</span>
            <span>
              <span class="dot dot--yellow"></span>
              {{ totalStartingSoon }} starting soon
            </span>
          </div>

          <div class="mabar-hero__cta-row">
            <button class="btn-primary-glow mabar-hero__cta" @click="openCreate">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M12 5v14 M5 12h14" />
              </svg>
              CREATE MABAR
            </button>

            <button
              class="ready-toggle"
              :class="{ 'ready-toggle--on': !!mySignal }"
              :disabled="signalBusy"
              @click="mySignal ? clearReady() : setReady(30, 'chill')"
            >
              <span class="ready-toggle__dot"></span>
              <span>{{ readyLabel || 'Mark me Ready' }}</span>
            </button>

            <div v-if="!mySignal" class="ready-durations">
              <span class="ready-durations__label">or for:</span>
              <button
                v-for="d in readySignalDurations"
                :key="d.value"
                class="ready-durations__btn"
                :disabled="signalBusy"
                @click="setReady(d.value, 'chill')"
              >
                {{ d.label }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="myStats" class="mabar-hero__stats">
          <div class="hero-stat">
            <span class="hero-stat__num">{{ myStats.hosted }}</span>
            <span class="hero-stat__label">Hosted</span>
          </div>
          <div class="hero-stat">
            <span class="hero-stat__num">{{ myStats.joined }}</span>
            <span class="hero-stat__label">Joined</span>
          </div>
          <div class="hero-stat">
            <span class="hero-stat__num">
              {{ myStats.avg_stars ?? '—' }}
              <span v-if="myStats.avg_stars" class="hero-stat__star">★</span>
            </span>
            <span class="hero-stat__label">Rating ({{ myStats.rating_count }})</span>
          </div>
        </div>
      </div>
    </section>

    <!-- READY NOW STRIP -->
    <section v-if="readyNow.length" class="ready-strip">
      <div class="ready-strip__head">
        <h2 class="ready-strip__title">
          <span class="ready-strip__pulse"></span>
          Ready Now
        </h2>
        <span class="ready-strip__count">{{ readyNow.length }} players available</span>
      </div>
      <div class="ready-strip__list">
        <div v-for="signal in readyNow" :key="signal.user.id" class="ready-card">
          <div class="ready-card__avatar">
            <img v-if="signal.user.avatar_url" :src="signal.user.avatar_url" :alt="signal.user.name" />
            <span v-else>{{ signal.user.name.charAt(0).toUpperCase() }}</span>
            <span class="ready-card__status-dot"></span>
          </div>
          <span class="ready-card__name">{{ signal.user.name }}</span>
          <span v-if="signal.mood_tag" class="ready-card__mood">{{ signal.mood_tag }}</span>
          <span class="ready-card__time">{{ signal.minutes_left }}m</span>
        </div>
      </div>
    </section>

    <!-- MY UPCOMING -->
    <section v-if="myStats?.upcoming?.length" class="my-upcoming">
      <h2 class="section-heading">
        <span class="section-heading__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v4l3 3 M3 12a9 9 0 1 0 18 0a9 9 0 0 0-18 0z" /></svg>
        </span>
        My Upcoming Sessions
      </h2>
      <div class="session-grid session-grid--my">
        <MabarSessionCard
          v-for="s in myStats.upcoming"
          :key="s.id"
          :session="s"
          :current-user-id="auth.user?.id"
          :is-admin="auth.isAdmin"
          @open="openDetail"
          @join="quickJoin"
          @leave="leaveSession"
          @delete="deleteSession"
          @feature="toggleFeature"
          @enter-room="enterRoom"
        />
      </div>
    </section>

    <!-- BADGES -->
    <section v-if="myStats?.badges?.length" class="mabar-badges">
      <h2 class="section-heading">
        <span class="section-heading__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22L12 18.56L5.82 22L7 14.14L2 9.27l6.91-1.01z" /></svg>
        </span>
        Your Mabar Badges
      </h2>
      <div class="badge-grid">
        <div v-for="b in myStats.badges" :key="b.key" class="mabar-badge" :data-tier="b.tier">
          <div class="mabar-badge__crest">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22L12 18.56L5.82 22L7 14.14L2 9.27l6.91-1.01z" />
            </svg>
          </div>
          <div class="mabar-badge__info">
            <span class="mabar-badge__label">{{ b.label }}</span>
            <span class="mabar-badge__desc">{{ b.description }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- FILTERS -->
    <section class="filters-bar">
      <div class="filter-group">
        <span class="filter-label">When</span>
        <div class="chip-row">
          <button
            v-for="opt in quickWhenOptions"
            :key="opt.label"
            class="chip-btn"
            :class="{ active: filters.when === opt.value }"
            @click="filters.when = opt.value"
          >{{ opt.label }}</button>
        </div>
      </div>

      <div class="filter-group">
        <span class="filter-label">Type</span>
        <div class="chip-row">
          <button
            v-for="opt in quickTypeOptions"
            :key="opt.label"
            class="chip-btn"
            :class="{ active: filters.type === opt.value }"
            @click="filters.type = opt.value"
          >{{ opt.label }}</button>
        </div>
      </div>

      <div class="filter-group">
        <span class="filter-label">Vibe</span>
        <div class="chip-row">
          <button
            v-for="opt in quickVibeOptions"
            :key="opt.label"
            class="chip-btn"
            :class="{ active: filters.vibe === opt.value }"
            @click="filters.vibe = opt.value"
          >{{ opt.label }}</button>
        </div>
      </div>

      <div class="filter-group filter-group--toggle">
        <label class="switch">
          <input v-model="filters.mine" type="checkbox" />
          <span class="switch__track"><span class="switch__knob"></span></span>
          <span class="switch__label">Only mine</span>
        </label>
      </div>
    </section>

    <!-- SESSION GRID -->
    <section class="sessions">
      <div v-if="loading" class="loading-state">Loading sessions...</div>

      <div v-else-if="!sessions.length" class="empty-state">
        <div class="empty-state__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12h4 M8 10v4 M15 12h.01 M17 14h.01 M7 16h10a5 5 0 0 0 5-5a5 5 0 0 0-5-5H7a5 5 0 0 0-5 5a5 5 0 0 0 5 5z" /></svg>
        </div>
        <h3>No sessions match your filter</h3>
        <p>Be the first to start the party — create a mabar session.</p>
        <button class="btn-primary-glow" @click="openCreate">CREATE SESSION</button>
      </div>

      <div v-else class="session-grid">
        <MabarSessionCard
          v-for="s in sessions"
          :key="s.id"
          :session="s"
          :current-user-id="auth.user?.id"
          :is-admin="auth.isAdmin"
          @open="openDetail"
          @join="quickJoin"
          @leave="leaveSession"
          @delete="deleteSession"
          @feature="toggleFeature"
          @enter-room="enterRoom"
        />
      </div>
    </section>

    <section v-if="detailSession?.synergy_with_viewer && detailOpen" class="synergy-hint">
      <div class="synergy-hint__title">Synergy Insight</div>
      <div class="synergy-hint__body">
        Kamu & host pernah mabar <strong>{{ detailSession.synergy_with_viewer.matches }}x</strong>,
        dengan performa positif <strong>{{ detailSession.synergy_with_viewer.wins_hint }}</strong> sesi
        dan rating kolaborasi <strong>{{ detailSession.synergy_with_viewer.avg_rating_hint ?? '-' }}</strong>.
      </div>
    </section>

    <!-- Floating refresh -->
    <div class="refresh-fab" :class="{ spinning: refreshing }" @click="refreshAll" title="Refresh">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    </div>

    <!-- Toast -->
    <transition name="toast">
      <div v-if="toast" class="toast" :class="`toast--${toast.kind}`">{{ toast.msg }}</div>
    </transition>

    <!-- Modals -->
    <MabarSessionModal
      :open="createModalOpen"
      :editing="editing"
      :submitting="busy"
      @close="createModalOpen = false"
      @submit="submitSession"
    />

    <MabarSessionDetail
      :open="detailOpen"
      :session="detailSession"
      :current-user-id="auth.user?.id"
      :is-admin="auth.isAdmin"
      :busy="busy"
      @close="detailOpen = false"
      @join="joinSlot"
      @leave="leaveSession()"
      @approve="approveSlot"
      @kick="kickSlot"
      @transition="transitionStatus"
      @edit="detailSession && openEdit(detailSession)"
      @delete="deleteSession()"
      @rate="submitRate"
      @enter-room="enterRoom"
    />

    <div v-if="detailOpen && detailSession" class="invite-floating">
      <button class="invite-floating__btn" @click="shareSession(detailSession)">Copy Invite Link</button>
      <button
        class="invite-floating__btn invite-floating__btn--ghost"
        @click="router.replace({ query: { ...route.query, invite: String(detailSession.id) } })"
      >
        Set as Share URL
      </button>
    </div>

    <div v-if="err" class="error-banner">{{ err }}</div>
  </div>
</template>

<style scoped>
.mabar-page {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding-bottom: 80px;
}

/* HERO */
.mabar-hero {
  position: relative;
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid rgba(0, 255, 135, 0.22);
  padding: 48px 44px;
  background: linear-gradient(135deg, #0b1914 0%, #0a0f15 60%, #0a0a0a 100%);
  min-height: 320px;
}

.mabar-hero__bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 85% 15%, rgba(0, 255, 135, 0.25), transparent 40%),
    radial-gradient(circle at 15% 85%, rgba(255, 61, 127, 0.2), transparent 45%),
    repeating-linear-gradient(0deg, transparent, transparent 60px, rgba(0, 255, 135, 0.03) 60px, rgba(0, 255, 135, 0.03) 61px),
    repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(0, 255, 135, 0.03) 60px, rgba(0, 255, 135, 0.03) 61px);
  pointer-events: none;
}

.mabar-hero__bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(2px 2px at 20% 30%, rgba(0, 255, 135, 0.8), transparent),
              radial-gradient(2px 2px at 60% 70%, rgba(255, 61, 127, 0.6), transparent),
              radial-gradient(1.5px 1.5px at 80% 40%, rgba(0, 180, 255, 0.6), transparent),
              radial-gradient(1.5px 1.5px at 40% 80%, rgba(255, 216, 107, 0.5), transparent),
              radial-gradient(2px 2px at 90% 10%, rgba(0, 255, 135, 0.7), transparent);
  background-repeat: no-repeat;
}

.mabar-hero__inner {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 40px;
  align-items: center;
}

.mabar-hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Teko', var(--font-heading);
  font-size: 0.9rem;
  letter-spacing: 3px;
  font-weight: 700;
  color: var(--green-neon);
  text-transform: uppercase;
  background: rgba(0, 255, 135, 0.08);
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(0, 255, 135, 0.35);
  margin-bottom: 18px;
}

.mabar-hero__pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--green-neon);
  box-shadow: 0 0 12px rgba(0, 255, 135, 0.8);
  animation: pulse-scale 1.5s ease-in-out infinite;
}

.mabar-hero__title {
  font-family: 'Teko', var(--font-heading);
  font-size: 4rem;
  line-height: 0.95;
  letter-spacing: 1.2px;
  margin: 0;
  color: #fff;
}

.mabar-hero__sub {
  color: var(--text-secondary);
  font-size: 1.02rem;
  margin: 16px 0 22px;
  max-width: 500px;
  line-height: 1.5;
}

.mabar-hero__ticker {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 0.88rem;
  color: var(--text-white);
  background: rgba(0, 0, 0, 0.35);
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--border-subtle);
  margin-bottom: 22px;
  flex-wrap: wrap;
}

.mabar-hero__ticker .sep { color: var(--text-muted); }

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 5px;
}

.dot--green { background: #00ff87; box-shadow: 0 0 8px rgba(0, 255, 135, 0.8); }
.dot--pink { background: #ff3d7f; box-shadow: 0 0 8px rgba(255, 61, 127, 0.7); }
.dot--yellow { background: #ffd86b; box-shadow: 0 0 8px rgba(255, 216, 107, 0.7); }

.mabar-hero__cta-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.mabar-hero__cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  border-radius: 12px;
  font-family: 'Teko', var(--font-heading);
  font-size: 1.1rem;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  font-weight: 800;
  cursor: pointer;
  background: linear-gradient(135deg, #00ff87, #00c870);
  color: #04120c;
  border: 1px solid #00ff87;
  box-shadow: 0 0 28px rgba(0, 255, 135, 0.35);
  transition: all 0.2s ease;
}

.mabar-hero__cta:hover { box-shadow: 0 0 36px rgba(0, 255, 135, 0.55); transform: translateY(-1px); }
.mabar-hero__cta svg { width: 18px; height: 18px; }

.ready-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 18px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-white);
  font-family: 'Teko', var(--font-heading);
  font-size: 0.98rem;
  letter-spacing: 1.3px;
  text-transform: uppercase;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ready-toggle__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #444;
  transition: all 0.2s ease;
}

.ready-toggle:hover { border-color: rgba(0, 255, 135, 0.4); }

.ready-toggle--on {
  background: rgba(0, 255, 135, 0.12);
  border-color: var(--green-neon);
  color: var(--green-neon);
  box-shadow: 0 0 14px rgba(0, 255, 135, 0.25);
}

.ready-toggle--on .ready-toggle__dot {
  background: var(--green-neon);
  box-shadow: 0 0 10px rgba(0, 255, 135, 0.9);
  animation: pulse-scale 1.2s ease-in-out infinite;
}

.ready-durations {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  font-size: 0.8rem;
}

.ready-durations__btn {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-subtle);
  color: var(--text-white);
  padding: 6px 11px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 700;
  transition: all 0.2s ease;
}

.ready-durations__btn:hover {
  border-color: var(--green-neon);
  color: var(--green-neon);
}

.mabar-hero__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(90px, 1fr));
  gap: 12px;
  min-width: 260px;
}

.hero-stat {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  padding: 16px 14px;
  text-align: center;
  backdrop-filter: blur(10px);
}

.hero-stat__num {
  font-family: 'Teko', var(--font-heading);
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: 1px;
  color: #fff;
  display: block;
}

.hero-stat__star { color: #ffd86b; font-size: 1.2rem; }

.hero-stat__label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 1.4px;
  color: var(--text-muted);
  font-weight: 700;
}

/* READY STRIP */
.ready-strip {
  background: rgba(15, 18, 20, 0.6);
  border: 1px solid rgba(0, 255, 135, 0.18);
  border-radius: 18px;
  padding: 20px 22px;
}

.ready-strip__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.ready-strip__title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: 'Teko', var(--font-heading);
  font-size: 1.4rem;
  letter-spacing: 1.3px;
  text-transform: uppercase;
  margin: 0;
  color: #fff;
}

.ready-strip__pulse {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--green-neon);
  box-shadow: 0 0 12px rgba(0, 255, 135, 0.8);
  animation: pulse-scale 1.2s ease-in-out infinite;
}

.ready-strip__count {
  font-size: 0.8rem;
  color: var(--text-muted);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.ready-strip__list {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  padding: 4px 0 8px;
}

.ready-strip__list::-webkit-scrollbar { height: 6px; }
.ready-strip__list::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.03); border-radius: 999px; }
.ready-strip__list::-webkit-scrollbar-thumb { background: rgba(0, 255, 135, 0.4); border-radius: 999px; }

.ready-card {
  flex-shrink: 0;
  width: 110px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  padding: 14px 10px 10px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;
}

.ready-card:hover {
  border-color: rgba(0, 255, 135, 0.5);
  transform: translateY(-2px);
}

.ready-card__avatar {
  position: relative;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #00ff87, #0077ff);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
  font-weight: 800;
  font-size: 1.2rem;
  border: 2px solid rgba(0, 255, 135, 0.6);
  box-shadow: 0 0 16px rgba(0, 255, 135, 0.25);
}

.ready-card__avatar img { width: 100%; height: 100%; object-fit: cover; }

.ready-card__status-dot {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--green-neon);
  border: 2px solid #0b0d0f;
  box-shadow: 0 0 8px rgba(0, 255, 135, 0.9);
  animation: pulse-scale 1.4s ease-in-out infinite;
}

.ready-card__name {
  font-size: 0.82rem;
  color: var(--text-white);
  font-weight: 600;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ready-card__mood {
  font-size: 0.65rem;
  letter-spacing: 1.2px;
  color: var(--green-neon);
  text-transform: uppercase;
  font-weight: 700;
}

.ready-card__time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.72rem;
  color: var(--text-muted);
}

/* SECTION HEADING */
.section-heading {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.5rem;
  letter-spacing: 1.3px;
  text-transform: uppercase;
  margin: 0 0 14px;
  color: #fff;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.section-heading__icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(0, 255, 135, 0.1);
  border: 1px solid rgba(0, 255, 135, 0.3);
  color: var(--green-neon);
  display: flex;
  align-items: center;
  justify-content: center;
}

.section-heading__icon svg { width: 15px; height: 15px; }

/* BADGES */
.badge-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 12px;
}

.mabar-badge {
  display: flex;
  gap: 12px;
  align-items: center;
  background: rgba(15, 18, 20, 0.7);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 14px;
  transition: all 0.2s ease;
}

.mabar-badge[data-tier="legendary"] { border-color: rgba(255, 216, 107, 0.5); background: linear-gradient(135deg, rgba(255, 216, 107, 0.08), rgba(0, 0, 0, 0.3)); }
.mabar-badge[data-tier="epic"] { border-color: rgba(186, 104, 255, 0.5); background: linear-gradient(135deg, rgba(186, 104, 255, 0.08), rgba(0, 0, 0, 0.3)); }
.mabar-badge[data-tier="rare"] { border-color: rgba(109, 181, 255, 0.45); background: linear-gradient(135deg, rgba(109, 181, 255, 0.06), rgba(0, 0, 0, 0.3)); }

.mabar-badge__crest {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffd86b;
  background: rgba(255, 216, 107, 0.12);
  border: 1px solid rgba(255, 216, 107, 0.3);
  flex-shrink: 0;
}

.mabar-badge[data-tier="epic"] .mabar-badge__crest { color: #c895ff; background: rgba(186, 104, 255, 0.12); border-color: rgba(186, 104, 255, 0.3); }
.mabar-badge[data-tier="rare"] .mabar-badge__crest { color: #8fcaff; background: rgba(109, 181, 255, 0.12); border-color: rgba(109, 181, 255, 0.3); }

.mabar-badge__crest svg { width: 24px; height: 24px; }

.mabar-badge__info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }

.mabar-badge__label {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.15rem;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: #fff;
  font-weight: 700;
}

.mabar-badge__desc {
  font-size: 0.78rem;
  color: var(--text-muted);
  line-height: 1.3;
}

/* FILTERS */
.filters-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: flex-end;
  background: rgba(15, 18, 20, 0.6);
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  padding: 14px 18px;
}

.filter-group { display: flex; flex-direction: column; gap: 6px; }

.filter-label {
  font-size: 0.68rem;
  letter-spacing: 1.8px;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--text-muted);
}

.chip-row { display: flex; gap: 6px; flex-wrap: wrap; }

.chip-btn {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chip-btn:hover { border-color: rgba(0, 255, 135, 0.5); color: var(--text-white); }

.chip-btn.active {
  background: rgba(0, 255, 135, 0.14);
  border-color: var(--green-neon);
  color: var(--green-neon);
  box-shadow: 0 0 10px rgba(0, 255, 135, 0.2);
}

.filter-group--toggle { margin-left: auto; }

.switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.switch input { display: none; }

.switch__track {
  position: relative;
  width: 38px;
  height: 22px;
  background: rgba(255, 255, 255, 0.07);
  border-radius: 999px;
  border: 1px solid var(--border-subtle);
  transition: all 0.2s ease;
}

.switch__knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: #8aa39a;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.switch input:checked + .switch__track {
  background: rgba(0, 255, 135, 0.2);
  border-color: var(--green-neon);
}

.switch input:checked + .switch__track .switch__knob {
  transform: translateX(16px);
  background: var(--green-neon);
  box-shadow: 0 0 10px rgba(0, 255, 135, 0.8);
}

.switch__label {
  font-size: 0.82rem;
  color: var(--text-white);
  letter-spacing: 0.5px;
}

/* SESSION GRID */
.session-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
  gap: 16px;
}

.session-grid--my { grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); }

.empty-state {
  text-align: center;
  padding: 60px 20px;
  border: 1px dashed var(--border-color);
  border-radius: 18px;
  background: rgba(15, 18, 20, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.empty-state__icon {
  width: 70px;
  height: 70px;
  border-radius: 20px;
  background: rgba(0, 255, 135, 0.08);
  border: 1px solid rgba(0, 255, 135, 0.25);
  color: var(--green-neon);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
}

.empty-state__icon svg { width: 36px; height: 36px; }

.empty-state h3 {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.6rem;
  letter-spacing: 1px;
  text-transform: uppercase;
  margin: 0;
}

.empty-state p { color: var(--text-muted); margin: 0 0 10px; }

.empty-state .btn-primary-glow {
  padding: 12px 24px;
  border-radius: 10px;
  font-family: 'Teko', var(--font-heading);
  font-size: 1rem;
  letter-spacing: 1.4px;
  font-weight: 800;
  text-transform: uppercase;
  background: linear-gradient(135deg, #00ff87, #00c870);
  color: #04120c;
  border: 1px solid #00ff87;
  cursor: pointer;
}

.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
  letter-spacing: 1px;
}

/* REFRESH FAB */
.refresh-fab {
  position: fixed;
  bottom: 28px;
  right: 28px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(15, 18, 20, 0.95);
  border: 1px solid rgba(0, 255, 135, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--green-neon);
  cursor: pointer;
  z-index: 30;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  transition: all 0.25s ease;
}

.refresh-fab:hover {
  transform: scale(1.08);
  box-shadow: 0 8px 30px rgba(0, 255, 135, 0.3);
}

.refresh-fab svg { width: 20px; height: 20px; }

.refresh-fab.spinning svg { animation: spin 1s linear infinite; }

@keyframes spin { to { transform: rotate(360deg); } }

/* TOAST */
.toast {
  position: fixed;
  top: 80px;
  right: 24px;
  background: rgba(15, 18, 20, 0.97);
  border: 1px solid rgba(0, 255, 135, 0.4);
  color: var(--text-white);
  padding: 12px 18px;
  border-radius: 10px;
  z-index: 200;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
  font-size: 0.88rem;
}

.toast--ok { border-color: rgba(0, 255, 135, 0.5); color: var(--green-neon); }
.toast--err { border-color: rgba(255, 80, 100, 0.5); color: #ff8a8a; }

.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(20px); }

.error-banner {
  background: rgba(255, 80, 100, 0.1);
  border: 1px solid rgba(255, 80, 100, 0.3);
  color: #ff8a8a;
  padding: 10px 16px;
  border-radius: 10px;
  text-align: center;
}

.synergy-hint {
  background: linear-gradient(135deg, rgba(0, 255, 135, 0.12), rgba(0, 140, 255, 0.1));
  border: 1px solid rgba(0, 255, 135, 0.35);
  border-radius: 14px;
  padding: 14px 16px;
}

.synergy-hint__title {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.1rem;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--green-neon);
  margin-bottom: 4px;
}

.synergy-hint__body {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.invite-floating {
  position: fixed;
  left: 24px;
  bottom: 24px;
  z-index: 31;
  display: flex;
  gap: 8px;
}

.invite-floating__btn {
  background: linear-gradient(135deg, #00ff87, #00c870);
  color: #04120c;
  border: 1px solid #00ff87;
  border-radius: 10px;
  padding: 10px 14px;
  font-family: 'Teko', var(--font-heading);
  letter-spacing: 1px;
  font-size: 0.95rem;
  text-transform: uppercase;
  font-weight: 700;
  cursor: pointer;
}

.invite-floating__btn--ghost {
  background: rgba(15, 18, 20, 0.96);
  color: var(--text-white);
  border-color: var(--border-color);
}

@media (max-width: 860px) {
  .mabar-hero { padding: 36px 28px; }
  .mabar-hero__inner { grid-template-columns: 1fr; }
  .mabar-hero__title { font-size: 3rem; }
  .mabar-hero__stats { min-width: 0; }
  .filter-group--toggle { margin-left: 0; }
}

@media (max-width: 560px) {
  .mabar-hero { padding: 28px 20px; border-radius: 18px; }
  .mabar-hero__title { font-size: 2.4rem; }
  .mabar-hero__cta-row { flex-direction: column; align-items: stretch; }
  .ready-durations { justify-content: center; }
}
</style>
