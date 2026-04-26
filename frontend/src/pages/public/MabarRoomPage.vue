<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { mabarApi } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import type {
  MabarMessageDTO,
  MabarRoomResponse,
  MabarRoomMember,
  MabarRoomSession,
} from '@/types'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const sessionId = computed(() => Number(route.params.id))

const loading = ref(true)
const error = ref<string | null>(null)

const session = ref<MabarRoomSession | null>(null)
const members = ref<MabarRoomMember[]>([])
const messages = ref<MabarMessageDTO[]>([])
const pinnedMessage = ref<MabarMessageDTO | null>(null)
const quickTemplates = ref<Record<string, string>>({})
const yourRole = ref<string>('none')

const composeBody = ref('')
const replyTo = ref<MabarMessageDTO | null>(null)
const sending = ref(false)
const showEmojiPicker = ref(false)
const showQuickPicker = ref(false)
const sidebarOpen = ref(false)
const soundEnabled = ref<boolean>(localStorage.getItem('mabar_sound') !== 'off')

const scroller = ref<HTMLElement | null>(null)
const composeInput = ref<HTMLTextAreaElement | null>(null)
const autoScroll = ref(true)
let pollTimer: number | null = null
let heartbeatTimer: number | null = null
let tickTimer: number | null = null
const now = ref(Date.now())

const reactionEmojis = ['🔥', '👍', '😂', '💯', '🎮', '⚡', '❤️', '😮']

const typeLabel = computed(() => {
  const map: Record<string, string> = {
    push_rank: 'Push Rank',
    classic: 'Classic',
    brawl: 'Brawl',
    tournament: 'Tournament',
    coaching: 'Coaching',
  }
  return session.value ? map[session.value.type] ?? session.value.type : ''
})

const countdown = computed(() => {
  if (!session.value?.starts_at) return null
  const target = new Date(session.value.starts_at).getTime()
  const diff = target - now.value
  if (diff <= 0) {
    if (session.value.status === 'live') return { label: 'LIVE', classes: 'countdown--live' }
    return { label: 'Starting now', classes: 'countdown--now' }
  }
  const t = Math.floor(diff / 1000)
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  const label = h > 0
    ? `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return { label, classes: h > 0 ? '' : 'countdown--soon' }
})

const isHost = computed(() => !!session.value?.is_viewer_host)

const onlineMemberCount = computed(() => members.value.filter(m => m.online).length)

const hostUser = computed(() => session.value?.host ?? null)

// ------- Fetch room --------
async function loadRoom() {
  try {
    const { data } = await mabarApi.room(sessionId.value)
    applyRoom(data)
    loading.value = false
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? 'Kamu belum jadi bagian dari room ini.'
    loading.value = false
  }
}

function applyRoom(data: MabarRoomResponse) {
  session.value = data.session
  members.value = data.session.members
  messages.value = data.messages
  pinnedMessage.value = data.pinned_message
  quickTemplates.value = data.quick_templates
  yourRole.value = data.your_role
  nextTick(() => scrollToBottom(true))
}

async function pollMessages() {
  if (!session.value) return
  const lastMsg = messages.value[messages.value.length - 1]
  const lastId = lastMsg ? lastMsg.id : 0
  try {
    const { data } = await mabarApi.listMessages(sessionId.value, lastId)
    if (data.messages?.length) {
      const incomingFromOthers = data.messages.some(m => m.user?.id !== auth.user?.id && m.kind !== 'system')
      messages.value = [...messages.value, ...data.messages]
      if (soundEnabled.value && incomingFromOthers) playDing()
      if (autoScroll.value) nextTick(() => scrollToBottom())
    }
    // refresh members/status
    if (data.members?.length) {
      members.value = data.members.map(m => ({
        slot_id: 0,
        slot_index: m.slot_index,
        role_preference: m.role_preference,
        status: m.status,
        last_seen_at: m.last_seen_at,
        online: m.online,
        user: m.user_id
          ? { id: m.user_id, name: m.name, username: m.username, avatar_url: m.avatar_url }
          : null,
      }))
    }
    if (session.value && data.session_status !== session.value.status) {
      session.value.status = data.session_status
    }
    if (data.pinned_message_id && (!pinnedMessage.value || pinnedMessage.value.id !== data.pinned_message_id)) {
      // try to find in current messages
      pinnedMessage.value = messages.value.find(m => m.id === data.pinned_message_id) ?? pinnedMessage.value
    } else if (!data.pinned_message_id) {
      pinnedMessage.value = null
    }
  } catch {
    // ignore transient failures
  }
}

async function sendHeartbeat() {
  if (!session.value) return
  try {
    await mabarApi.heartbeat(sessionId.value)
  } catch {
    // ignore
  }
}

function scrollToBottom(immediate = false) {
  const el = scroller.value
  if (!el) return
  el.scrollTo({ top: el.scrollHeight, behavior: immediate ? 'auto' : 'smooth' })
}

function onScroll() {
  const el = scroller.value
  if (!el) return
  const nearBottom = el.scrollHeight - (el.scrollTop + el.clientHeight) < 80
  autoScroll.value = nearBottom
}

// ------- Send --------
async function sendMessage(opts?: { kind?: 'text' | 'quick' | 'gif'; body?: string }) {
  const body = (opts?.body ?? composeBody.value).trim()
  if (!body || sending.value) return
  sending.value = true
  try {
    const { data } = await mabarApi.sendMessage(sessionId.value, body, {
      kind: opts?.kind ?? 'text',
      reply_to_id: replyTo.value?.id,
    })
    messages.value.push(data)
    composeBody.value = ''
    replyTo.value = null
    autoScroll.value = true
    nextTick(() => {
      scrollToBottom()
      composeInput.value?.focus()
    })
  } finally {
    sending.value = false
  }
}

function insertEmoji(emoji: string) {
  composeBody.value += emoji
  showEmojiPicker.value = false
  composeInput.value?.focus()
}

function onComposeKey(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

function startReply(msg: MabarMessageDTO) {
  if (msg.kind === 'system') return
  replyTo.value = msg
  composeInput.value?.focus()
}

function cancelReply() {
  replyTo.value = null
}

// ------- React --------
async function toggleReaction(msg: MabarMessageDTO, emoji: string) {
  try {
    const { data } = await mabarApi.reactMessage(sessionId.value, msg.id, emoji)
    const idx = messages.value.findIndex(m => m.id === msg.id)
    if (idx !== -1) messages.value.splice(idx, 1, data)
    if (pinnedMessage.value && pinnedMessage.value.id === msg.id) pinnedMessage.value = data
  } catch {
    // ignore
  }
}

// ------- Pin --------
async function togglePin(msg: MabarMessageDTO) {
  if (!isHost.value && !auth.isAdmin) return
  try {
    await mabarApi.togglePinMessage(sessionId.value, msg.id)
    await pollMessages()
    if (pinnedMessage.value?.id === msg.id) {
      pinnedMessage.value = { ...msg, is_pinned: true }
    } else {
      const latest = messages.value.find(m => m.id === msg.id)
      pinnedMessage.value = latest ?? null
    }
  } catch {
    // ignore
  }
}

// ------- Delete --------
async function deleteMessage(msg: MabarMessageDTO) {
  if (!confirm('Hapus pesan ini?')) return
  try {
    await mabarApi.deleteMessage(sessionId.value, msg.id)
    messages.value = messages.value.filter(m => m.id !== msg.id)
    if (pinnedMessage.value?.id === msg.id) pinnedMessage.value = null
  } catch {
    // ignore
  }
}

// ------- Session actions --------
async function transitionSession(status: 'live' | 'closed' | 'cancelled' | 'open') {
  if (!isHost.value && !auth.isAdmin) return
  const labels: Record<string, string> = {
    live: 'Start session sebagai LIVE?',
    closed: 'Tandai session selesai?',
    cancelled: 'Cancel session ini?',
    open: 'Buka kembali session?',
  }
  if (!confirm(labels[status] ?? 'Lanjutkan?')) return
  try {
    await mabarApi.transition(sessionId.value, status)
    await pollMessages()
    if (session.value) session.value.status = status
  } catch {
    // ignore
  }
}

async function leaveRoom() {
  if (isHost.value) {
    if (!confirm('Host tidak bisa leave — batalkan session?')) return
    await mabarApi.transition(sessionId.value, 'cancelled')
    router.push('/mabar')
    return
  }
  if (!confirm('Leave squad room?')) return
  try {
    await mabarApi.leaveSession(sessionId.value)
    router.push('/mabar')
  } catch {
    // ignore
  }
}

async function approveMember(slotId: number) {
  if (!isHost.value && !auth.isAdmin) return
  try {
    await mabarApi.approveSlot(sessionId.value, slotId)
    await loadRoom()
  } catch {
    // ignore
  }
}

async function kickMember(slotId: number) {
  if (!isHost.value && !auth.isAdmin) return
  if (!confirm('Kick player ini dari squad?')) return
  try {
    await mabarApi.kickSlot(sessionId.value, slotId)
    await loadRoom()
  } catch {
    // ignore
  }
}

function copyRoomId() {
  if (!session.value?.room_id) return
  navigator.clipboard.writeText(session.value.room_id)
  flash('Room ID copied!')
}

function copyInvite() {
  const url = `${window.location.origin}/mabar?invite=${sessionId.value}`
  navigator.clipboard.writeText(url)
  flash('Invite link copied!')
}

// ------- UI helpers --------
const toastText = ref<string>('')
const toastVisible = ref(false)
let toastTimer: number | null = null
function flash(text: string) {
  toastText.value = text
  toastVisible.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => { toastVisible.value = false }, 2200)
}

// ------- Grouping / timestamp --------
function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const ystd = new Date(); ystd.setDate(today.getDate() - 1)
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (sameDay(d, today)) return 'Today'
  if (sameDay(d, ystd)) return 'Yesterday'
  return d.toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short' })
}

interface MessageGroup {
  key: string
  dayLabel: string
  items: { msg: MabarMessageDTO; showMeta: boolean }[]
}

const groupedMessages = computed<MessageGroup[]>(() => {
  const groups: MessageGroup[] = []
  let current: MessageGroup | null = null
  let prev: MabarMessageDTO | null = null
  for (const msg of messages.value) {
    const label = dayLabel(msg.created_at)
    if (!current || current.dayLabel !== label) {
      current = { key: label + '-' + msg.id, dayLabel: label, items: [] }
      groups.push(current)
      prev = null
    }
    const sameAuthor = prev && prev.user?.id === msg.user?.id && prev.kind === msg.kind && msg.kind !== 'system'
    const closeInTime = prev && (new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime()) < 4 * 60_000
    const showMeta = !(sameAuthor && closeInTime)
    current.items.push({ msg, showMeta })
    prev = msg
  }
  return groups
})

function roleEmoji(role: string): string {
  const map: Record<string, string> = {
    tank: '🛡', jungle: '🌿', roam: '🪖', mid: '🔮', exp: '⚔', gold: '💰', support: '✨', any: '🎮',
  }
  return map[role] ?? '🎮'
}

function canDelete(msg: MabarMessageDTO): boolean {
  if (msg.kind === 'system') return false
  const mine = msg.user?.id === auth.user?.id
  return mine || isHost.value || auth.isAdmin
}

function memberInitial(m: MabarRoomMember): string {
  return (m.user?.name ?? '?').charAt(0).toUpperCase()
}

// ------- Sound --------
let audioCtx: AudioContext | null = null
function playDing() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const ctx = audioCtx!
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(880, ctx.currentTime)
    o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08)
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25)
    o.connect(g).connect(ctx.destination)
    o.start()
    o.stop(ctx.currentTime + 0.26)
  } catch {
    // ignore audio errors
  }
}

function toggleSound() {
  soundEnabled.value = !soundEnabled.value
  localStorage.setItem('mabar_sound', soundEnabled.value ? 'on' : 'off')
}

// ------- Lifecycle --------
onMounted(async () => {
  await loadRoom()
  if (!error.value) {
    pollTimer = window.setInterval(pollMessages, 3000)
    heartbeatTimer = window.setInterval(sendHeartbeat, 25_000)
    tickTimer = window.setInterval(() => { now.value = Date.now() }, 1000)
  }
})

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
  if (heartbeatTimer) clearInterval(heartbeatTimer)
  if (tickTimer) clearInterval(tickTimer)
})

watch(sessionId, async (id, prev) => {
  if (id !== prev) await loadRoom()
})
</script>

<template>
  <div class="room-page">
    <!-- Loading / error -->
    <div v-if="loading" class="room-loader">
      <div class="spinner"></div>
      <div class="room-loader__text">Entering squad room...</div>
    </div>

    <div v-else-if="error" class="room-error">
      <div class="room-error__icon">🚫</div>
      <h2>Access denied</h2>
      <p>{{ error }}</p>
      <button class="btn-primary-glow" @click="router.push('/mabar')">Back to Lounge</button>
    </div>

    <template v-else-if="session">
      <!-- HEADER -->
      <header class="room-header">
        <button class="room-header__back" @click="router.push('/mabar')" aria-label="Back">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>

        <div class="room-header__title">
          <div class="room-header__eyebrow">
            <span class="chip chip--type">{{ typeLabel }}</span>
            <span v-if="session.vibe" class="chip chip--vibe">{{ session.vibe }}</span>
            <span class="chip chip--status" :class="`chip--status-${session.status}`">
              <span class="chip__dot"></span>{{ session.status }}
            </span>
          </div>
          <h1>{{ session.title }}</h1>
          <div class="room-header__meta">
            <span>Host: <strong>{{ hostUser?.name }}</strong></span>
            <span class="dot-sep">•</span>
            <span>{{ onlineMemberCount }} online / {{ session.filled_slots }}/{{ session.max_slots }}</span>
          </div>
        </div>

        <div class="room-header__actions">
          <div v-if="countdown" class="countdown" :class="countdown.classes">
            <span class="countdown__label">{{ session.status === 'live' ? 'LIVE' : 'Starts in' }}</span>
            <span class="countdown__value">{{ countdown.label }}</span>
          </div>

          <button class="icon-btn" :title="soundEnabled ? 'Mute' : 'Unmute'" @click="toggleSound">
            <svg v-if="soundEnabled" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5l-6 4H2v6h3l6 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>
            <svg v-else viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5l-6 4H2v6h3l6 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
          </button>

          <button class="icon-btn icon-btn--members" @click="sidebarOpen = !sidebarOpen" title="Squad roster">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span class="icon-btn__badge">{{ members.filter(m => m.user).length }}</span>
          </button>

          <div class="room-header__menu">
            <button class="icon-btn" @click="copyInvite" title="Copy invite link">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
            </button>
            <button v-if="isHost && session.status === 'open'" class="btn-primary-glow btn-sm" @click="transitionSession('live')">Start Live</button>
            <button v-if="isHost && session.status === 'live'" class="btn-soft btn-sm" @click="transitionSession('closed')">End Session</button>
            <button class="btn-ghost btn-sm btn-ghost--danger" @click="leaveRoom">{{ isHost ? 'Cancel' : 'Leave' }}</button>
          </div>
        </div>
      </header>

      <!-- BODY -->
      <div class="room-body">
        <!-- SIDEBAR -->
        <aside class="room-sidebar" :class="{ open: sidebarOpen }">
          <div class="room-sidebar__section">
            <div class="room-sidebar__title">
              <span>Squad Roster</span>
              <span class="badge-count">{{ members.filter(m => m.user).length }}/{{ session.max_slots }}</span>
            </div>

            <div
              v-for="m in members"
              :key="'m-' + m.slot_index"
              class="roster-card"
              :class="{
                'roster-card--online': m.online,
                'roster-card--pending': m.status === 'pending',
                'roster-card--empty': !m.user,
                'roster-card--host': hostUser && m.user?.id === hostUser.id,
              }"
            >
              <div class="roster-card__avatar">
                <img v-if="m.user?.avatar_url" :src="m.user.avatar_url" :alt="m.user?.name ?? ''" />
                <span v-else class="roster-card__initial">{{ memberInitial(m) }}</span>
                <span v-if="m.online" class="roster-card__dot"></span>
              </div>
              <div class="roster-card__info">
                <div class="roster-card__name">
                  {{ m.user?.name ?? 'Open slot' }}
                  <span v-if="hostUser && m.user?.id === hostUser.id" class="tag tag--host">HOST</span>
                  <span v-else-if="m.status === 'pending'" class="tag tag--pending">PENDING</span>
                </div>
                <div class="roster-card__role">
                  <span>{{ roleEmoji(m.role_preference) }} {{ m.role_preference }}</span>
                </div>
              </div>
              <div v-if="(isHost || auth.isAdmin) && m.user && m.status === 'pending'" class="roster-card__actions">
                <button class="mini-btn ok" @click="approveMember(m.slot_id)" title="Approve">✓</button>
                <button class="mini-btn danger" @click="kickMember(m.slot_id)" title="Kick">✕</button>
              </div>
              <div v-else-if="(isHost || auth.isAdmin) && m.user && hostUser && m.user.id !== hostUser.id" class="roster-card__actions">
                <button class="mini-btn danger" @click="kickMember(m.slot_id)" title="Kick">✕</button>
              </div>
            </div>
          </div>

          <div class="room-sidebar__section">
            <div class="room-sidebar__title">Connect</div>
            <div class="connect-grid">
              <div class="connect-tile">
                <div class="connect-tile__label">Voice</div>
                <div class="connect-tile__value">{{ session.voice_platform ?? '—' }}</div>
              </div>
              <div v-if="session.discord_link" class="connect-tile">
                <div class="connect-tile__label">Discord</div>
                <a :href="session.discord_link" target="_blank" class="connect-tile__value connect-tile__link">Open invite ↗</a>
              </div>
              <div v-if="session.room_id" class="connect-tile">
                <div class="connect-tile__label">Room ID</div>
                <button class="connect-tile__value connect-tile__link" @click="copyRoomId">{{ session.room_id }} <span class="copy-hint">copy</span></button>
              </div>
            </div>
          </div>

          <div v-if="session.notes" class="room-sidebar__section">
            <div class="room-sidebar__title">Host Notes</div>
            <div class="notes-box">{{ session.notes }}</div>
          </div>
        </aside>

        <!-- MAIN CHAT -->
        <section class="room-main">
          <!-- Pinned -->
          <div v-if="pinnedMessage" class="pinned">
            <div class="pinned__icon">📌</div>
            <div class="pinned__body">
              <div class="pinned__author">{{ pinnedMessage.user?.name ?? 'System' }} pinned</div>
              <div class="pinned__text">{{ pinnedMessage.body }}</div>
            </div>
            <button v-if="isHost || auth.isAdmin" class="pinned__unpin" @click="togglePin(pinnedMessage)">Unpin</button>
          </div>

          <!-- Messages -->
          <div ref="scroller" class="messages" @scroll="onScroll">
            <div v-for="group in groupedMessages" :key="group.key" class="msg-group">
              <div class="msg-day">
                <span>{{ group.dayLabel }}</span>
              </div>

              <template v-for="{ msg, showMeta } in group.items" :key="msg.id">
                <!-- System message -->
                <div v-if="msg.kind === 'system'" class="msg-system">
                  <div class="msg-system__pill">{{ msg.body }}</div>
                </div>

                <!-- User message -->
                <div
                  v-else
                  class="msg"
                  :class="{
                    'msg--own': msg.user?.id === auth.user?.id,
                    'msg--pinned': msg.is_pinned,
                    'msg--quick': msg.kind === 'quick',
                  }"
                >
                  <div v-if="showMeta" class="msg__avatar">
                    <img v-if="msg.user?.avatar_url" :src="msg.user.avatar_url" :alt="msg.user?.name ?? ''" />
                    <span v-else>{{ (msg.user?.name ?? '?').charAt(0).toUpperCase() }}</span>
                  </div>
                  <div v-else class="msg__avatar msg__avatar--spacer"></div>

                  <div class="msg__body">
                    <div v-if="showMeta" class="msg__meta">
                      <span class="msg__name">{{ msg.user?.name }}</span>
                      <span v-if="hostUser && msg.user?.id === hostUser.id" class="tag tag--host">HOST</span>
                      <span class="msg__time">{{ formatTime(msg.created_at) }}</span>
                    </div>

                    <div v-if="msg.reply_to" class="msg__reply">
                      <span class="msg__reply-label">↪ {{ msg.reply_to.user?.name ?? 'Unknown' }}</span>
                      <span class="msg__reply-text">{{ msg.reply_to.body }}</span>
                    </div>

                    <div class="msg__bubble">
                      <span>{{ msg.body }}</span>
                      <span v-if="msg.is_pinned" class="msg__pin">📌</span>
                    </div>

                    <div v-if="msg.reactions.length" class="msg__reactions">
                      <button
                        v-for="r in msg.reactions"
                        :key="r.emoji"
                        class="reaction"
                        :class="{ 'reaction--mine': r.mine }"
                        @click="toggleReaction(msg, r.emoji)"
                      >
                        <span>{{ r.emoji }}</span>
                        <span class="reaction__count">{{ r.count }}</span>
                      </button>
                    </div>

                    <!-- hover actions -->
                    <div class="msg__actions">
                      <div class="msg__react-picker">
                        <button
                          v-for="e in reactionEmojis"
                          :key="e"
                          class="msg__react-btn"
                          :title="'React ' + e"
                          @click="toggleReaction(msg, e)"
                        >{{ e }}</button>
                      </div>
                      <button class="msg__action-btn" @click="startReply(msg)" title="Reply">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
                      </button>
                      <button v-if="isHost || auth.isAdmin" class="msg__action-btn" @click="togglePin(msg)" :title="msg.is_pinned ? 'Unpin' : 'Pin'">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14l-2-9H7L5 17z"/><path d="M9 8V4h6v4"/></svg>
                      </button>
                      <button v-if="canDelete(msg)" class="msg__action-btn msg__action-btn--danger" @click="deleteMessage(msg)" title="Delete">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </template>
            </div>

            <div v-if="!messages.length" class="empty-chat">
              <div class="empty-chat__icon">💬</div>
              <h3>No messages yet</h3>
              <p>Say hi! Mulai diskusi squad kamu.</p>
            </div>
          </div>

          <!-- Reply banner -->
          <div v-if="replyTo" class="reply-banner">
            <div class="reply-banner__body">
              <span class="reply-banner__icon">↪</span>
              <div>
                <div class="reply-banner__author">Replying to {{ replyTo.user?.name }}</div>
                <div class="reply-banner__text">{{ replyTo.body }}</div>
              </div>
            </div>
            <button class="reply-banner__close" @click="cancelReply">✕</button>
          </div>

          <!-- Compose -->
          <div class="compose">
            <div class="compose__toolbar">
              <button class="tool-btn" :class="{ active: showEmojiPicker }" @click="showEmojiPicker = !showEmojiPicker; showQuickPicker = false" title="Emoji">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
              </button>
              <button class="tool-btn" :class="{ active: showQuickPicker }" @click="showQuickPicker = !showQuickPicker; showEmojiPicker = false" title="Quick message">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              </button>
            </div>

            <div class="compose__input-wrap">
              <div v-if="showEmojiPicker" class="picker picker--emoji">
                <button v-for="e in ['🔥','👍','😂','💯','🎮','⚡','❤️','😮','🎯','💀','🏆','🤝','😭','🤔','🫡','🙌']" :key="e" @click="insertEmoji(e)">{{ e }}</button>
              </div>
              <div v-if="showQuickPicker" class="picker picker--quick">
                <button v-for="(tpl, key) in quickTemplates" :key="key" @click="sendMessage({ kind: 'quick', body: tpl }); showQuickPicker = false">
                  {{ tpl }}
                </button>
              </div>
              <textarea
                ref="composeInput"
                v-model="composeBody"
                rows="1"
                class="compose__input"
                placeholder="Ketik pesan untuk squad... (Enter = kirim, Shift+Enter = baris baru)"
                @keydown="onComposeKey"
                maxlength="1000"
              ></textarea>
            </div>

            <button
              class="compose__send"
              :disabled="!composeBody.trim() || sending"
              @click="sendMessage()"
              title="Send"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </section>
      </div>

      <!-- Toast -->
      <div v-if="toastVisible" class="toast toast--ok">{{ toastText }}</div>
    </template>
  </div>
</template>

<style scoped>
/* ---------- Layout ---------- */
.room-page {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(1000px 600px at 10% 0%, rgba(0, 255, 170, 0.08), transparent 60%),
    radial-gradient(800px 500px at 100% 100%, rgba(88, 101, 242, 0.08), transparent 60%),
    linear-gradient(180deg, #04060c 0%, #080c16 100%);
  color: #e6ecf4;
  font-family: inherit;
  overflow: hidden;
}

.room-loader {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  color: #8fa3b8;
}
.spinner {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 3px solid rgba(0, 255, 170, 0.15);
  border-top-color: #00ffaa;
  animation: spin 0.9s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.room-error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  text-align: center;
  padding: 2rem;
}
.room-error__icon { font-size: 3rem; }

/* ---------- Header ---------- */
.room-header {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.85rem 1.25rem;
  background: linear-gradient(180deg, rgba(8, 12, 20, 0.9), rgba(8, 12, 20, 0.55));
  border-bottom: 1px solid rgba(0, 255, 170, 0.1);
  backdrop-filter: blur(12px);
  position: relative;
  z-index: 3;
}
.room-header::after {
  content: '';
  position: absolute;
  left: 0; right: 0; bottom: -1px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0, 255, 170, 0.4), transparent);
}

.room-header__back {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: #cfd8e3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
.room-header__back:hover { background: rgba(0, 255, 170, 0.1); border-color: rgba(0, 255, 170, 0.3); color: #00ffaa; }

.room-header__title { flex: 1; min-width: 0; }
.room-header__title h1 {
  margin: 0.2rem 0 0.15rem;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: 0.2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.room-header__eyebrow { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
.room-header__meta { font-size: 0.78rem; color: #8fa3b8; display: flex; align-items: center; gap: 0.4rem; }
.dot-sep { opacity: 0.4; }

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  border: 1px solid transparent;
}
.chip--type { background: rgba(138, 86, 255, 0.15); color: #b197ff; border-color: rgba(138, 86, 255, 0.3); }
.chip--vibe { background: rgba(255, 180, 76, 0.15); color: #ffb64c; border-color: rgba(255, 180, 76, 0.3); }
.chip--status { background: rgba(255, 255, 255, 0.05); color: #cfd8e3; }
.chip--status-open { color: #00ffaa; border-color: rgba(0, 255, 170, 0.3); background: rgba(0, 255, 170, 0.1); }
.chip--status-live { color: #ff6b6b; border-color: rgba(255, 107, 107, 0.4); background: rgba(255, 107, 107, 0.12); animation: pulse-live 2s ease-in-out infinite; }
.chip--status-full { color: #ffb64c; border-color: rgba(255, 180, 76, 0.35); background: rgba(255, 180, 76, 0.1); }
.chip--status-closed { color: #8fa3b8; }
.chip--status-cancelled { color: #ff6b6b; }
.chip__dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 10px currentColor; }
@keyframes pulse-live { 0%,100%{ box-shadow: 0 0 0 0 rgba(255,107,107,0.35); } 50%{ box-shadow: 0 0 0 6px rgba(255,107,107,0); } }

.room-header__actions { display: flex; align-items: center; gap: 0.5rem; }
.countdown {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.1rem;
  padding: 0.35rem 0.7rem;
  border-radius: 10px;
  background: rgba(0, 255, 170, 0.06);
  border: 1px solid rgba(0, 255, 170, 0.18);
}
.countdown__label { font-size: 0.62rem; letter-spacing: 1.4px; text-transform: uppercase; color: #8fa3b8; }
.countdown__value {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 1.05rem;
  font-weight: 700;
  color: #00ffaa;
  text-shadow: 0 0 10px rgba(0, 255, 170, 0.4);
  letter-spacing: 1px;
}
.countdown--soon .countdown__value { color: #ffb64c; text-shadow: 0 0 10px rgba(255, 180, 76, 0.4); }
.countdown--live .countdown__value { color: #ff6b6b; animation: blink 1s infinite; text-shadow: 0 0 10px rgba(255, 107, 107, 0.5); }
@keyframes blink { 50% { opacity: 0.5; } }

.icon-btn {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: #cfd8e3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
.icon-btn:hover { background: rgba(0, 255, 170, 0.1); border-color: rgba(0, 255, 170, 0.3); color: #00ffaa; }
.icon-btn__badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: #00ffaa;
  color: #001a0d;
  font-size: 0.65rem;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.room-header__menu { display: flex; gap: 0.5rem; align-items: center; }
.btn-primary-glow, .btn-soft, .btn-ghost {
  padding: 0.4rem 0.85rem;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.78rem;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.18s;
}
.btn-sm { padding: 0.4rem 0.8rem; font-size: 0.75rem; }
.btn-primary-glow {
  background: linear-gradient(135deg, #00ffaa 0%, #00d9ff 100%);
  color: #001a0d;
  border: none;
  box-shadow: 0 4px 16px rgba(0, 255, 170, 0.3);
}
.btn-primary-glow:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0, 255, 170, 0.4); }
.btn-soft {
  background: rgba(0, 255, 170, 0.08);
  color: #00ffaa;
  border: 1px solid rgba(0, 255, 170, 0.2);
}
.btn-soft:hover { background: rgba(0, 255, 170, 0.15); }
.btn-ghost {
  background: transparent;
  color: #cfd8e3;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.btn-ghost:hover { border-color: rgba(255, 255, 255, 0.25); }
.btn-ghost--danger { color: #ff8a8a; border-color: rgba(255, 107, 107, 0.3); }
.btn-ghost--danger:hover { background: rgba(255, 107, 107, 0.1); border-color: rgba(255, 107, 107, 0.5); }

/* ---------- Body ---------- */
.room-body {
  flex: 1;
  display: grid;
  grid-template-columns: 280px 1fr;
  min-height: 0;
}

/* ---------- Sidebar ---------- */
.room-sidebar {
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(5, 8, 14, 0.6);
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.room-sidebar__section { display: flex; flex-direction: column; gap: 0.5rem; }
.room-sidebar__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.7rem;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #8fa3b8;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
.badge-count {
  background: rgba(0, 255, 170, 0.1);
  color: #00ffaa;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.4px;
}

.roster-card {
  display: grid;
  grid-template-columns: 40px 1fr auto;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.65rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s;
}
.roster-card:hover { border-color: rgba(0, 255, 170, 0.2); background: rgba(0, 255, 170, 0.04); }
.roster-card--empty { opacity: 0.55; }
.roster-card--pending { border-color: rgba(255, 180, 76, 0.25); background: rgba(255, 180, 76, 0.04); }
.roster-card--host { border-color: rgba(138, 86, 255, 0.25); background: rgba(138, 86, 255, 0.04); }
.roster-card__avatar {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #00ffaa33, #00d9ff33);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00ffaa;
  font-weight: 700;
}
.roster-card__avatar img { width: 100%; height: 100%; object-fit: cover; }
.roster-card__dot {
  position: absolute;
  right: -1px;
  bottom: -1px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #00ffaa;
  border: 2px solid #050810;
  box-shadow: 0 0 6px #00ffaa;
}
.roster-card__info { min-width: 0; }
.roster-card__name {
  font-size: 0.88rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  gap: 0.4rem;
  align-items: center;
}
.roster-card__role { font-size: 0.72rem; color: #8fa3b8; }
.tag {
  font-size: 0.58rem;
  letter-spacing: 1px;
  font-weight: 800;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
}
.tag--host { background: rgba(138, 86, 255, 0.18); color: #b197ff; }
.tag--pending { background: rgba(255, 180, 76, 0.18); color: #ffb64c; }

.roster-card__actions { display: flex; gap: 0.25rem; }
.mini-btn {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: #cfd8e3;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}
.mini-btn.ok:hover { background: rgba(0, 255, 170, 0.15); border-color: rgba(0, 255, 170, 0.4); color: #00ffaa; }
.mini-btn.danger:hover { background: rgba(255, 107, 107, 0.12); border-color: rgba(255, 107, 107, 0.35); color: #ff8a8a; }

.connect-grid { display: flex; flex-direction: column; gap: 0.4rem; }
.connect-tile {
  padding: 0.55rem 0.7rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.connect-tile__label { font-size: 0.65rem; letter-spacing: 1.2px; text-transform: uppercase; color: #8fa3b8; }
.connect-tile__value { font-size: 0.86rem; color: #e6ecf4; margin-top: 0.2rem; word-break: break-all; background: transparent; border: none; padding: 0; text-align: left; cursor: pointer; font: inherit; }
.connect-tile__link { color: #00d9ff; text-decoration: none; }
.connect-tile__link:hover { text-shadow: 0 0 8px rgba(0, 217, 255, 0.35); }
.copy-hint { font-size: 0.65rem; color: #8fa3b8; margin-left: 0.3rem; }

.notes-box {
  padding: 0.7rem 0.85rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 0.82rem;
  line-height: 1.5;
  color: #cfd8e3;
  white-space: pre-wrap;
}

/* ---------- Main chat ---------- */
.room-main {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background:
    radial-gradient(800px 400px at 50% -10%, rgba(0, 255, 170, 0.03), transparent 60%);
}

.pinned {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.6rem 1rem;
  background: linear-gradient(90deg, rgba(255, 180, 76, 0.12), rgba(255, 180, 76, 0.03));
  border-bottom: 1px solid rgba(255, 180, 76, 0.2);
}
.pinned__icon { font-size: 1.05rem; }
.pinned__body { flex: 1; min-width: 0; }
.pinned__author { font-size: 0.7rem; color: #ffb64c; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
.pinned__text {
  font-size: 0.88rem;
  color: #f0e4cf;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pinned__unpin {
  padding: 0.3rem 0.6rem;
  border-radius: 7px;
  border: 1px solid rgba(255, 180, 76, 0.3);
  background: transparent;
  color: #ffb64c;
  font-size: 0.7rem;
  cursor: pointer;
  font-weight: 700;
}
.pinned__unpin:hover { background: rgba(255, 180, 76, 0.1); }

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.5rem 1rem;
  scroll-behavior: smooth;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}
.messages::-webkit-scrollbar { width: 8px; }
.messages::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }

.msg-day {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 1rem 0 0.5rem;
  position: relative;
}
.msg-day::before {
  content: '';
  position: absolute;
  left: 0; right: 0; top: 50%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
}
.msg-day span {
  position: relative;
  background: #080c16;
  padding: 0.2rem 0.75rem;
  border-radius: 999px;
  font-size: 0.68rem;
  color: #8fa3b8;
  letter-spacing: 1px;
  text-transform: uppercase;
  font-weight: 700;
  border: 1px solid rgba(255,255,255,0.06);
}

.msg-system {
  display: flex;
  justify-content: center;
  margin: 0.45rem 0;
}
.msg-system__pill {
  padding: 0.28rem 0.75rem;
  border-radius: 999px;
  background: rgba(0, 255, 170, 0.06);
  border: 1px solid rgba(0, 255, 170, 0.15);
  font-size: 0.75rem;
  color: #7ae2c0;
  letter-spacing: 0.4px;
}

.msg {
  display: grid;
  grid-template-columns: 40px 1fr;
  gap: 0.6rem;
  padding: 0.2rem 0 0.1rem;
  position: relative;
  animation: msgIn 0.22s ease;
}
@keyframes msgIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }

.msg__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #00ffaa33, #00d9ff33);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00ffaa;
  font-weight: 700;
  font-size: 0.95rem;
}
.msg__avatar img { width: 100%; height: 100%; object-fit: cover; }
.msg__avatar--spacer { background: transparent; }

.msg__body { min-width: 0; position: relative; }
.msg__meta { display: flex; gap: 0.4rem; align-items: center; margin-bottom: 0.15rem; }
.msg__name { font-weight: 700; font-size: 0.88rem; color: #e6ecf4; }
.msg__time { font-size: 0.7rem; color: #6f7f93; }

.msg__reply {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.3rem 0.55rem;
  margin-bottom: 0.25rem;
  border-left: 2px solid #00d9ff;
  background: rgba(0, 217, 255, 0.06);
  border-radius: 0 7px 7px 0;
  font-size: 0.78rem;
  max-width: 100%;
}
.msg__reply-label { color: #00d9ff; font-weight: 600; white-space: nowrap; }
.msg__reply-text {
  color: #a9bccf;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.msg__bubble {
  display: inline-flex;
  align-items: flex-end;
  gap: 0.3rem;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  border-top-left-radius: 4px;
  font-size: 0.92rem;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
  max-width: 100%;
  color: #e6ecf4;
}
.msg--own .msg__bubble {
  background: linear-gradient(135deg, rgba(0, 255, 170, 0.16), rgba(0, 217, 255, 0.14));
  border-color: rgba(0, 255, 170, 0.25);
  border-top-left-radius: 14px;
  border-top-right-radius: 4px;
}
.msg--quick .msg__bubble {
  background: rgba(138, 86, 255, 0.12);
  border-color: rgba(138, 86, 255, 0.3);
  font-style: italic;
}
.msg--pinned .msg__bubble {
  box-shadow: inset 0 0 0 1px rgba(255, 180, 76, 0.35);
}
.msg__pin { font-size: 0.85rem; opacity: 0.85; }

.msg__reactions { display: flex; flex-wrap: wrap; gap: 0.28rem; margin-top: 0.3rem; }
.reaction {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #cfd8e3;
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.15s;
}
.reaction:hover { background: rgba(0, 255, 170, 0.1); border-color: rgba(0, 255, 170, 0.3); }
.reaction--mine {
  background: rgba(0, 255, 170, 0.15);
  border-color: rgba(0, 255, 170, 0.4);
  color: #00ffaa;
}
.reaction__count { font-weight: 700; font-size: 0.72rem; }

.msg__actions {
  position: absolute;
  top: -12px;
  right: 6px;
  display: none;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem;
  background: rgba(8, 12, 20, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 2;
}
.msg:hover .msg__actions { display: flex; }
.msg__react-picker {
  display: flex;
  gap: 0.1rem;
  padding-right: 0.25rem;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  margin-right: 0.15rem;
}
.msg__react-btn {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  transition: transform 0.15s;
}
.msg__react-btn:hover { transform: scale(1.25); background: rgba(255, 255, 255, 0.05); }
.msg__action-btn {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: transparent;
  border: none;
  color: #a9bccf;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}
.msg__action-btn:hover { background: rgba(255, 255, 255, 0.06); color: #00ffaa; }
.msg__action-btn--danger:hover { color: #ff8a8a; background: rgba(255, 107, 107, 0.1); }

.empty-chat {
  padding: 3rem 1rem;
  text-align: center;
  color: #8fa3b8;
}
.empty-chat__icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
.empty-chat h3 { color: #e6ecf4; margin: 0.2rem 0; font-size: 1.05rem; }

/* ---------- Reply banner ---------- */
.reply-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 0.9rem;
  background: rgba(0, 217, 255, 0.06);
  border-top: 1px solid rgba(0, 217, 255, 0.18);
}
.reply-banner__body { display: flex; gap: 0.55rem; align-items: center; flex: 1; min-width: 0; }
.reply-banner__icon { color: #00d9ff; font-weight: 800; }
.reply-banner__author { font-size: 0.7rem; color: #00d9ff; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
.reply-banner__text { font-size: 0.82rem; color: #cfd8e3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.reply-banner__close {
  background: transparent; border: none; color: #8fa3b8; cursor: pointer;
  font-size: 0.9rem; padding: 0.25rem 0.45rem; border-radius: 6px;
}
.reply-banner__close:hover { background: rgba(255, 255, 255, 0.05); color: #e6ecf4; }

/* ---------- Compose ---------- */
.compose {
  display: flex;
  align-items: flex-end;
  gap: 0.6rem;
  padding: 0.85rem 1rem 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(5, 8, 14, 0.6);
  position: relative;
}
.compose__toolbar { display: flex; gap: 0.3rem; padding-bottom: 0.35rem; }
.tool-btn {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: #cfd8e3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}
.tool-btn:hover, .tool-btn.active {
  color: #00ffaa; background: rgba(0, 255, 170, 0.1); border-color: rgba(0, 255, 170, 0.3);
}

.compose__input-wrap { flex: 1; position: relative; }
.compose__input {
  width: 100%;
  min-height: 42px;
  max-height: 120px;
  padding: 0.65rem 0.9rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #e6ecf4;
  font: inherit;
  font-size: 0.92rem;
  resize: none;
  outline: none;
  transition: all 0.15s;
}
.compose__input:focus { border-color: rgba(0, 255, 170, 0.35); box-shadow: 0 0 0 3px rgba(0, 255, 170, 0.08); background: rgba(0, 255, 170, 0.03); }

.picker {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  right: 0;
  padding: 0.5rem;
  background: rgba(8, 12, 20, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  backdrop-filter: blur(12px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  z-index: 10;
  animation: popIn 0.15s ease;
}
@keyframes popIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
.picker--emoji button {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: transparent;
  font-size: 1.25rem;
  cursor: pointer;
  transition: transform 0.15s;
}
.picker--emoji button:hover { background: rgba(255, 255, 255, 0.06); transform: scale(1.2); }
.picker--quick {
  flex-direction: column;
  align-items: stretch;
}
.picker--quick button {
  text-align: left;
  padding: 0.5rem 0.65rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
  color: #cfd8e3;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.15s;
}
.picker--quick button:hover {
  background: rgba(0, 255, 170, 0.08);
  border-color: rgba(0, 255, 170, 0.25);
  color: #00ffaa;
}

.compose__send {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #00ffaa 0%, #00d9ff 100%);
  color: #001a0d;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 0 4px 16px rgba(0, 255, 170, 0.3);
}
.compose__send:hover:not(:disabled) { transform: translateY(-1px) scale(1.04); }
.compose__send:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }

/* ---------- Toast ---------- */
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.55rem 1rem;
  border-radius: 10px;
  background: rgba(0, 255, 170, 0.12);
  color: #00ffaa;
  border: 1px solid rgba(0, 255, 170, 0.3);
  font-size: 0.85rem;
  font-weight: 600;
  z-index: 9999;
  animation: toastIn 0.2s ease;
}
@keyframes toastIn { from { opacity: 0; transform: translate(-50%, 6px); } to { opacity: 1; transform: translate(-50%, 0); } }

/* ---------- Responsive ---------- */
@media (max-width: 900px) {
  .room-body { grid-template-columns: 1fr; }
  .room-sidebar {
    position: absolute;
    top: 0; bottom: 0; right: 0;
    width: min(320px, 90vw);
    transform: translateX(100%);
    transition: transform 0.25s;
    z-index: 5;
  }
  .room-sidebar.open { transform: translateX(0); box-shadow: -12px 0 30px rgba(0,0,0,0.5); }
  .room-header__menu .btn-sm { display: none; }
  .room-header__title h1 { font-size: 1rem; }
}
</style>
