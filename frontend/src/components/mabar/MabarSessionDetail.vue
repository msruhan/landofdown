<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { MabarSessionDTO } from '@/types'

const props = defineProps<{
  open: boolean
  session: MabarSessionDTO | null
  currentUserId?: number
  isAdmin?: boolean
  busy?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'join', slotId: number): void
  (e: 'leave'): void
  (e: 'approve', slotId: number): void
  (e: 'kick', slotId: number): void
  (e: 'transition', status: string): void
  (e: 'edit'): void
  (e: 'delete'): void
  (e: 'rate', payload: { to_user_id: number; stars: number; tags: string[]; comment?: string }): void
  (e: 'enter-room', id: number): void
}>()

const isMember = computed(() => {
  if (!props.session) return false
  if (props.session.host?.id === props.currentUserId) return true
  return props.session.slots.some(
    (s) => s.user?.id === props.currentUserId && (s.status === 'pending' || s.status === 'confirmed'),
  )
})

const now = ref(Date.now())
let timer: number | undefined

onMounted(() => {
  timer = window.setInterval(() => (now.value = Date.now()), 1000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

const isHost = computed(() => props.session?.host?.id === props.currentUserId)
const canManage = computed(() => isHost.value || props.isAdmin)

const mySlot = computed(() =>
  props.session?.slots.find((s) => s.user?.id === props.currentUserId),
)

const countdown = computed(() => {
  if (!props.session) return null
  const t = new Date(props.session.starts_at).getTime()
  const diff = t - now.value
  if (diff <= 0) return 'STARTED'
  const s = Math.floor(diff / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
})

const startDate = computed(() => {
  if (!props.session) return ''
  return new Date(props.session.starts_at).toLocaleString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
})

const roleLabel = (r: string) => {
  const map: Record<string, string> = {
    any: 'Any Role',
    tank: 'Tank',
    jungle: 'Jungle',
    roam: 'Roam',
    mid: 'Mid Lane',
    exp: 'EXP Lane',
    gold: 'Gold Lane',
    support: 'Support',
  }
  return map[r] || r
}

// Rating form
const rateOpen = ref<number | null>(null)
const rateStars = ref(5)
const rateTags = ref<string[]>([])
const rateComment = ref('')

function toggleRateTag(tag: string) {
  const idx = rateTags.value.indexOf(tag)
  if (idx >= 0) rateTags.value.splice(idx, 1)
  else rateTags.value.push(tag)
}

function submitRate() {
  if (!rateOpen.value) return
  emit('rate', {
    to_user_id: rateOpen.value,
    stars: rateStars.value,
    tags: rateTags.value,
    comment: rateComment.value || undefined,
  })
  rateOpen.value = null
  rateStars.value = 5
  rateTags.value = []
  rateComment.value = ''
}

function copyLink(value: string) {
  navigator.clipboard?.writeText(value).catch(() => {})
}
</script>

<template>
  <Teleport to="body">
    <transition name="modal">
      <div v-if="open && session" class="mabar-detail-overlay" @click.self="emit('close')">
        <div class="mabar-detail">
          <header class="mabar-detail__head">
            <button class="mabar-detail__close" @click="emit('close')" aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M18 6L6 18 M6 6l12 12" />
              </svg>
            </button>

            <div class="mabar-detail__title-row">
              <span class="mabar-detail__type" :data-type="session.type">{{ session.type.replace('_', ' ').toUpperCase() }}</span>
              <span v-if="session.is_featured" class="mabar-detail__featured">★ FEATURED</span>
            </div>

            <h2 class="mabar-detail__title">{{ session.title }}</h2>
            <div class="mabar-detail__sub">
              <span>{{ startDate }}</span>
              <span class="sep">·</span>
              <span>Host: <strong>{{ session.host?.name }}</strong></span>
            </div>

            <div class="mabar-detail__countdown-bar">
              <span class="cd-label">{{ countdown === 'STARTED' ? 'IN PROGRESS' : 'STARTS IN' }}</span>
              <span class="cd-value" :class="{ 'cd-value--live': countdown === 'STARTED' }">{{ countdown }}</span>
            </div>
          </header>

          <section class="mabar-detail__section">
            <h3 class="section-title">Squad Roster</h3>
            <div class="slot-list">
              <div
                v-for="slot in session.slots"
                :key="slot.id"
                class="slot-row"
                :class="{ 'slot-row--filled': slot.user, 'slot-row--pending': slot.status === 'pending' }"
              >
                <div class="slot-row__idx">{{ slot.slot_index }}</div>
                <div class="slot-row__avatar">
                  <template v-if="slot.user">
                    <img v-if="slot.user.avatar_url" :src="slot.user.avatar_url" :alt="slot.user.name" />
                    <span v-else>{{ slot.user.name.charAt(0).toUpperCase() }}</span>
                  </template>
                  <span v-else class="slot-row__avatar--empty">?</span>
                </div>
                <div class="slot-row__info">
                  <div v-if="slot.user" class="slot-row__name">
                    {{ slot.user.name }}
                    <span v-if="slot.slot_index === 1" class="mini-tag">HOST</span>
                    <span v-if="slot.status === 'pending'" class="mini-tag mini-tag--warn">PENDING</span>
                  </div>
                  <div v-else class="slot-row__name slot-row__name--empty">Open slot</div>
                  <div class="slot-row__role">{{ roleLabel(slot.role_preference) }}</div>
                </div>
                <div class="slot-row__actions">
                  <template v-if="!slot.user && !mySlot && session.status === 'open'">
                    <button class="btn-primary-glow btn-sm" :disabled="busy" @click="emit('join', slot.id)">Take slot</button>
                  </template>
                  <template v-if="canManage && slot.status === 'pending'">
                    <button class="btn-soft btn-sm" :disabled="busy" @click="emit('approve', slot.id)">Approve</button>
                  </template>
                  <template v-if="canManage && slot.user && slot.slot_index !== 1">
                    <button class="btn-outline-danger btn-sm" :disabled="busy" @click="emit('kick', slot.id)">Kick</button>
                  </template>
                  <template v-if="session.status === 'closed' && slot.user && slot.user.id !== currentUserId && mySlot">
                    <button class="btn-soft btn-sm" @click="rateOpen = slot.user!.id">Rate</button>
                  </template>
                </div>
              </div>
            </div>
          </section>

          <section v-if="session.notes" class="mabar-detail__section">
            <h3 class="section-title">Notes from host</h3>
            <p class="mabar-detail__notes">{{ session.notes }}</p>
          </section>

          <section v-if="session.voice_platform || session.discord_link || session.room_id" class="mabar-detail__section">
            <h3 class="section-title">Connect</h3>
            <div class="connect-row">
              <div v-if="session.voice_platform" class="connect-chip">
                Voice: <strong>{{ session.voice_platform }}</strong>
              </div>
              <div v-if="session.discord_link" class="connect-chip connect-chip--link">
                <a :href="session.discord_link" target="_blank" rel="noopener">{{ session.discord_link }}</a>
                <button class="copy-btn" @click="copyLink(session.discord_link!)">Copy</button>
              </div>
              <div v-if="session.room_id" class="connect-chip">
                Room ID: <strong>{{ session.room_id }}</strong>
                <button class="copy-btn" @click="copyLink(session.room_id!)">Copy</button>
              </div>
            </div>
          </section>

          <section class="mabar-detail__section mabar-detail__actions-bar">
            <button
              v-if="isMember && session"
              class="btn-primary-glow enter-room-btn"
              :disabled="busy"
              @click="emit('enter-room', session.id)"
            >
              <span class="enter-room-btn__icon">💬</span>
              Enter Private Room
              <span class="enter-room-btn__badge">LIVE CHAT</span>
            </button>
            <template v-if="isHost || isAdmin">
              <button v-if="session.status === 'open' || session.status === 'full'" class="btn-primary-glow" :disabled="busy" @click="emit('transition', 'live')">Start Live</button>
              <button v-if="session.status === 'live'" class="btn-soft" :disabled="busy" @click="emit('transition', 'closed')">Mark Done</button>
              <button v-if="session.status !== 'cancelled'" class="btn-soft" :disabled="busy" @click="emit('edit')">Edit</button>
              <button class="btn-outline-danger" :disabled="busy" @click="emit('transition', 'cancelled')">Cancel Session</button>
              <button class="btn-outline-danger" :disabled="busy" @click="emit('delete')">Delete</button>
            </template>
            <template v-else-if="mySlot">
              <button class="btn-outline-danger" :disabled="busy" @click="emit('leave')">Leave Squad</button>
            </template>
          </section>

          <!-- Rate dialog (inline) -->
          <transition name="fade">
            <div v-if="rateOpen" class="rate-dialog" @click.self="rateOpen = null">
              <div class="rate-dialog__card">
                <h4>Rate this squadmate</h4>
                <div class="stars">
                  <button v-for="n in 5" :key="n" class="star" :class="{ active: rateStars >= n }" @click="rateStars = n">★</button>
                </div>
                <div class="rate-tags">
                  <button
                    v-for="t in ['fun', 'clutch', 'chill', 'skilled', 'mvp', 'toxic']"
                    :key="t"
                    class="rate-tag"
                    :class="{ active: rateTags.includes(t), danger: t === 'toxic' }"
                    @click="toggleRateTag(t)"
                  >
                    {{ t }}
                  </button>
                </div>
                <textarea v-model="rateComment" class="form-input" rows="2" maxlength="240" placeholder="Komentar opsional"></textarea>
                <div class="rate-dialog__actions">
                  <button class="btn-soft btn-sm" @click="rateOpen = null">Batal</button>
                  <button class="btn-primary-glow btn-sm" @click="submitRate">Kirim</button>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.mabar-detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.78);
  backdrop-filter: blur(10px);
  z-index: 100;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 4vh 20px;
  overflow-y: auto;
}

.mabar-detail {
  width: 100%;
  max-width: 720px;
  background: linear-gradient(180deg, rgba(22, 26, 30, 0.98), rgba(12, 14, 16, 0.98));
  border: 1px solid rgba(0, 255, 135, 0.22);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.7);
  position: relative;
}

.mabar-detail__head {
  padding: 24px 26px 20px;
  background: radial-gradient(circle at top right, rgba(0, 255, 135, 0.1), transparent 55%),
    radial-gradient(circle at bottom left, rgba(255, 61, 127, 0.06), transparent 60%);
  border-bottom: 1px solid var(--border-subtle);
  position: relative;
}

.mabar-detail__close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-white);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mabar-detail__close svg { width: 18px; height: 18px; }

.mabar-detail__title-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.mabar-detail__type {
  font-family: 'Teko', var(--font-heading);
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 2px;
  background: rgba(0, 255, 135, 0.12);
  color: var(--green-neon);
  padding: 3px 10px;
  border-radius: 4px;
  border: 1px solid rgba(0, 255, 135, 0.35);
}

.mabar-detail__type[data-type="push_rank"] { color: #ff8aa0; background: rgba(255, 61, 127, 0.12); border-color: rgba(255, 61, 127, 0.35); }

.mabar-detail__featured {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 1.5px;
  background: linear-gradient(90deg, #ffb347, #ffd86b);
  color: #1a1a1a;
  padding: 3px 8px;
  border-radius: 4px;
}

.mabar-detail__title {
  font-family: 'Teko', var(--font-heading);
  font-size: 2.2rem;
  letter-spacing: 0.8px;
  margin: 8px 0 6px;
  color: #fff;
}

.mabar-detail__sub {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.mabar-detail__sub .sep { margin: 0 8px; color: var(--text-muted); }

.mabar-detail__countdown-bar {
  margin-top: 16px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(0, 255, 135, 0.2);
  border-radius: 12px;
  padding: 10px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cd-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 1.8px;
  color: var(--text-secondary);
  text-transform: uppercase;
}

.cd-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--green-neon);
  text-shadow: 0 0 14px rgba(0, 255, 135, 0.45);
  letter-spacing: 2px;
}

.cd-value--live { color: #ff3d7f; text-shadow: 0 0 14px rgba(255, 61, 127, 0.55); }

.mabar-detail__section {
  padding: 18px 26px;
  border-bottom: 1px solid var(--border-subtle);
}

.section-title {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.1rem;
  letter-spacing: 1.3px;
  text-transform: uppercase;
  margin: 0 0 10px;
  color: var(--text-white);
}

.slot-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slot-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 10px 14px;
}

.slot-row--filled {
  border-color: rgba(0, 255, 135, 0.4);
  background: linear-gradient(90deg, rgba(0, 255, 135, 0.05), rgba(0, 255, 135, 0.01));
}

.slot-row--pending {
  border-color: rgba(255, 216, 107, 0.4);
  background: rgba(255, 216, 107, 0.05);
}

.slot-row__idx {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(0, 255, 135, 0.12);
  color: var(--green-neon);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.8rem;
}

.slot-row__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #00ff87, #0077ff);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
  font-weight: 800;
  font-size: 1rem;
}

.slot-row__avatar img { width: 100%; height: 100%; object-fit: cover; }
.slot-row__avatar--empty {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-muted);
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slot-row__info { flex: 1; min-width: 0; }

.slot-row__name {
  font-weight: 700;
  color: var(--text-white);
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.95rem;
}

.slot-row__name--empty { color: var(--text-muted); font-style: italic; font-weight: 500; }

.mini-tag {
  font-size: 0.6rem;
  font-weight: 800;
  letter-spacing: 1.4px;
  background: rgba(0, 255, 135, 0.15);
  color: var(--green-neon);
  padding: 2px 6px;
  border-radius: 4px;
}

.mini-tag--warn { background: rgba(255, 216, 107, 0.15); color: #ffe089; }

.slot-row__role { font-size: 0.75rem; color: var(--text-muted); }

.slot-row__actions { display: flex; gap: 6px; }

.btn-sm {
  padding: 7px 11px !important;
  font-size: 0.72rem !important;
  letter-spacing: 0.8px !important;
  border-radius: 8px !important;
}

.mabar-detail__notes {
  background: rgba(255, 255, 255, 0.02);
  border-left: 3px solid rgba(0, 255, 135, 0.4);
  padding: 10px 14px;
  border-radius: 8px;
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.92rem;
  white-space: pre-wrap;
}

.connect-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.connect-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  padding: 8px 12px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.connect-chip strong { color: var(--text-white); }
.connect-chip--link a {
  color: var(--green-neon);
  text-decoration: none;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.copy-btn {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 0.68rem;
  cursor: pointer;
}

.copy-btn:hover { color: var(--green-neon); border-color: var(--green-neon); }

.mabar-detail__actions-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 0;
}

.enter-room-btn {
  margin-right: auto;
  display: inline-flex !important;
  align-items: center;
  gap: 0.55rem;
  padding: 12px 18px !important;
  position: relative;
  box-shadow: 0 6px 22px rgba(0, 255, 170, 0.35), inset 0 0 18px rgba(255,255,255,0.12);
  animation: roomCtaPulse 2.4s ease-in-out infinite;
}
.enter-room-btn__icon { font-size: 1.1rem; filter: drop-shadow(0 0 6px rgba(0, 255, 170, 0.5)); }
.enter-room-btn__badge {
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.25);
  color: #ffffff;
  font-size: 0.6rem;
  letter-spacing: 1.4px;
  font-weight: 800;
  margin-left: 0.2rem;
}
@keyframes roomCtaPulse {
  0%, 100% { box-shadow: 0 6px 22px rgba(0, 255, 170, 0.35), inset 0 0 18px rgba(255,255,255,0.12); }
  50%      { box-shadow: 0 8px 28px rgba(0, 255, 170, 0.55), inset 0 0 22px rgba(255,255,255,0.18); }
}

.mabar-detail__actions-bar button {
  padding: 10px 16px;
  border-radius: 10px;
  font-family: 'Teko', var(--font-heading);
  font-size: 0.95rem;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
}

.btn-soft {
  background: rgba(255, 255, 255, 0.04);
  border-color: var(--border-color);
  color: var(--text-white);
}

.btn-primary-glow {
  background: linear-gradient(135deg, #00ff87, #00c870);
  color: #04120c;
  border-color: #00ff87;
  box-shadow: 0 0 16px rgba(0, 255, 135, 0.35);
}

.btn-outline-danger {
  background: transparent;
  border-color: rgba(255, 80, 100, 0.5);
  color: #ff8a8a;
}

.btn-outline-danger:hover { background: rgba(255, 80, 100, 0.1); }

.rate-dialog {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.rate-dialog__card {
  background: #15181b;
  border: 1px solid rgba(0, 255, 135, 0.3);
  border-radius: 16px;
  padding: 20px;
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rate-dialog__card h4 { margin: 0; font-family: 'Teko', var(--font-heading); font-size: 1.3rem; letter-spacing: 1px; }

.stars {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.star {
  background: none;
  border: none;
  font-size: 2rem;
  color: #3a3a3a;
  cursor: pointer;
  transition: color 0.15s ease;
}

.star.active { color: #ffd86b; text-shadow: 0 0 10px rgba(255, 216, 107, 0.5); }

.rate-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.rate-tag {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 5px 11px;
  border-radius: 999px;
  font-size: 0.78rem;
  cursor: pointer;
}

.rate-tag.active {
  background: rgba(0, 255, 135, 0.15);
  border-color: var(--green-neon);
  color: var(--green-neon);
}

.rate-tag.danger.active {
  background: rgba(255, 80, 100, 0.15);
  border-color: #ff5050;
  color: #ff8a8a;
}

.rate-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to { opacity: 0; }

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.22s ease;
}

.modal-enter-from,
.modal-leave-to { opacity: 0; }

@media (max-width: 520px) {
  .mabar-detail__title { font-size: 1.7rem; }
  .slot-row { flex-wrap: wrap; }
  .slot-row__actions { width: 100%; justify-content: flex-end; }
}
</style>
