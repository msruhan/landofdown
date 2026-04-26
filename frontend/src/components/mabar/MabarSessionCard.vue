<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { MabarSessionDTO } from '@/types'

const props = defineProps<{
  session: MabarSessionDTO
  currentUserId?: number
  isAdmin?: boolean
}>()

const emit = defineEmits<{
  (e: 'open', id: number): void
  (e: 'join', id: number): void
  (e: 'leave', id: number): void
  (e: 'delete', id: number): void
  (e: 'feature', id: number): void
  (e: 'enter-room', id: number): void
}>()

const now = ref(Date.now())
let timer: number | undefined

onMounted(() => {
  timer = window.setInterval(() => (now.value = Date.now()), 1000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

const isMyHosted = computed(() => props.currentUserId && props.session.host?.id === props.currentUserId)
const myJoinedSlot = computed(() =>
  props.session.slots.find(
    (s) => s.user?.id === props.currentUserId && ['pending', 'confirmed'].includes(s.status),
  ),
)
const hasJoined = computed(() => !!myJoinedSlot.value || !!isMyHosted.value)

const countdown = computed(() => {
  const target = new Date(props.session.starts_at).getTime()
  const diff = target - now.value
  if (diff <= 0) return null
  const totalSec = Math.floor(diff / 1000)
  const d = Math.floor(totalSec / 86400)
  const h = Math.floor((totalSec % 86400) / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (d > 0) return { big: `${d}d ${h}h`, small: `${m}m ${s}s` }
  if (h > 0) return { big: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`, small: 'starts in' }
  return { big: `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`, small: 'starting soon' }
})

const hasStarted = computed(() => new Date(props.session.starts_at).getTime() <= now.value)

const typeMeta = computed(() => {
  const map: Record<string, { label: string; color: string; icon: string }> = {
    push_rank: { label: 'Push Rank', color: '#ff3d7f', icon: 'M12 2L3 7v6c0 5 4 9 9 11c5-2 9-6 9-11V7z M8 12l3 3l5-6' },
    classic: { label: 'Classic', color: '#00ff87', icon: 'M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z M12 7a3 3 0 1 0 0 6' },
    brawl: { label: 'Brawl', color: '#ff9500', icon: 'M14.5 17.5L3 6V3h3l11.5 11.5 M13 19l6-6 M16 16l4 4' },
    tournament: { label: 'Tournament', color: '#ffd86b', icon: 'M8 21h8 M12 17v4 M7 4h10v3a5 5 0 0 1-5 5a5 5 0 0 1-5-5z' },
    coaching: { label: 'Coaching', color: '#6ab8ff', icon: 'M17 20h5v-2a4 4 0 0 0-3-3.87 M9 20H4v-2a4 4 0 0 1 3-3.87 M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8' },
  }
  return map[props.session.type] || map.classic
})

const vibeLabel = computed(() => {
  const map: Record<string, string> = {
    sweaty: 'Sweaty',
    chill: 'Chill',
    tryhard: 'Tryhard',
    learning: 'Learning',
    event: 'Event',
  }
  return props.session.vibe ? map[props.session.vibe] : null
})

const rankLabel = computed(() => {
  const map: Record<string, string> = {
    any: 'Any Rank',
    epic: 'Epic+',
    legend: 'Legend+',
    mythic: 'Mythic+',
    mythic_honor: 'Mythic Honor+',
    mythic_glory: 'Mythic Glory+',
    mythic_immortal: 'Mythic Immortal',
  }
  return map[props.session.rank_requirement] || props.session.rank_requirement
})

const dateLabel = computed(() => {
  const d = new Date(props.session.starts_at)
  return d.toLocaleString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
})
</script>

<template>
  <article class="mabar-card" :class="{ 'is-featured': session.is_featured, 'is-live': session.status === 'live' || hasStarted, 'is-full': session.status === 'full' }">
    <div v-if="session.is_featured" class="mabar-card__featured">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22L12 18.56L5.82 22L7 14.14L2 9.27l6.91-1.01z" />
      </svg>
      FEATURED
    </div>

    <div class="mabar-card__head">
      <span class="mabar-card__type" :style="{ '--type-color': typeMeta.color }">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path :d="typeMeta.icon" />
        </svg>
        {{ typeMeta.label }}
      </span>
      <span class="mabar-card__status" :data-status="session.status">
        <span class="mabar-card__status-dot"></span>
        {{ session.status === 'live' ? 'LIVE' : session.status.toUpperCase() }}
      </span>
    </div>

    <h3 class="mabar-card__title">{{ session.title }}</h3>

    <div class="mabar-card__chips">
      <span v-if="vibeLabel" class="chip chip--vibe" :data-vibe="session.vibe">{{ vibeLabel }}</span>
      <span class="chip chip--rank">{{ rankLabel }}</span>
      <span v-if="session.recurrence === 'weekly'" class="chip chip--recur">Weekly</span>
    </div>

    <div class="mabar-card__countdown">
      <template v-if="countdown">
        <span class="mabar-card__cd-big">{{ countdown.big }}</span>
        <span class="mabar-card__cd-small">{{ countdown.small }}</span>
      </template>
      <template v-else>
        <span class="mabar-card__cd-big mabar-card__cd-big--live">NOW!</span>
        <span class="mabar-card__cd-small">{{ dateLabel }}</span>
      </template>
    </div>

    <div class="mabar-card__slots">
      <div
        v-for="slot in session.slots"
        :key="slot.id"
        class="slot"
        :class="{
          'slot--filled': slot.user,
          'slot--pending': slot.status === 'pending',
          'slot--mine': slot.user?.id === currentUserId,
        }"
        :title="slot.user ? `${slot.user.name}${slot.status === 'pending' ? ' (pending)' : ''}` : `Slot ${slot.slot_index} · ${slot.role_preference}`"
      >
        <template v-if="slot.user">
          <img v-if="slot.user.avatar_url" :src="slot.user.avatar_url" :alt="slot.user.name" class="slot__avatar" />
          <span v-else class="slot__avatar slot__avatar--letter">{{ slot.user.name.charAt(0).toUpperCase() }}</span>
        </template>
        <template v-else>
          <span class="slot__empty">
            <span class="slot__role">{{ slot.role_preference === 'any' ? '?' : slot.role_preference.toUpperCase().slice(0, 3) }}</span>
          </span>
        </template>
      </div>
    </div>

    <div class="mabar-card__meta-line">
      <span class="mabar-card__host">
        <span class="mabar-card__host-avatar">
          <img v-if="session.host?.avatar_url" :src="session.host.avatar_url" :alt="session.host?.name" />
          <span v-else>{{ session.host?.name?.charAt(0).toUpperCase() }}</span>
        </span>
        <span class="mabar-card__host-name">{{ session.host?.name }}</span>
      </span>
      <span class="mabar-card__filled">{{ session.filled_slots }}/{{ session.max_slots }}</span>
    </div>

    <div class="mabar-card__actions">
      <button class="btn-soft" @click="emit('open', session.id)">Details</button>
      <template v-if="!hasJoined && session.status === 'open'">
        <button class="btn-primary-glow" @click="emit('join', session.id)">JOIN SQUAD</button>
      </template>
      <template v-else-if="hasJoined">
        <button class="btn-primary-glow mabar-card__room-btn" @click="emit('enter-room', session.id)">
          <span class="mabar-card__room-icon">💬</span> Enter Room
        </button>
        <button v-if="!isMyHosted" class="btn-outline-danger" @click="emit('leave', session.id)">Leave</button>
      </template>
    </div>

    <div v-if="isAdmin || isMyHosted" class="mabar-card__admin">
      <button v-if="isAdmin" class="mabar-card__admin-btn" @click.stop="emit('feature', session.id)" :title="session.is_featured ? 'Unfeature' : 'Feature'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22L12 18.56L5.82 22L7 14.14L2 9.27l6.91-1.01z" />
        </svg>
      </button>
      <button class="mabar-card__admin-btn mabar-card__admin-btn--danger" @click.stop="emit('delete', session.id)" title="Delete">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  </article>
</template>

<style scoped>
.mabar-card {
  position: relative;
  background: linear-gradient(180deg, rgba(22, 26, 30, 0.95), rgba(14, 16, 18, 0.95));
  border: 1px solid rgba(0, 255, 135, 0.18);
  border-radius: 16px;
  padding: 18px 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.mabar-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top right, rgba(0, 255, 135, 0.08), transparent 55%);
  pointer-events: none;
  opacity: 0.6;
}

.mabar-card:hover {
  border-color: rgba(0, 255, 135, 0.5);
  transform: translateY(-3px);
  box-shadow: 0 14px 30px rgba(0, 255, 135, 0.12), 0 0 0 1px rgba(0, 255, 135, 0.15);
}

.mabar-card.is-live {
  border-color: rgba(255, 61, 127, 0.55);
}

.mabar-card.is-live::before {
  background: radial-gradient(circle at top right, rgba(255, 61, 127, 0.14), transparent 55%);
}

.mabar-card.is-featured {
  border-color: rgba(255, 216, 107, 0.55);
  box-shadow: 0 0 0 1px rgba(255, 216, 107, 0.2), 0 10px 40px rgba(255, 216, 107, 0.08);
}

.mabar-card__featured {
  position: absolute;
  top: 14px;
  right: -30px;
  transform: rotate(35deg);
  background: linear-gradient(90deg, #ffb347, #ffd86b);
  color: #1a1a1a;
  font-weight: 900;
  font-size: 0.65rem;
  letter-spacing: 2px;
  padding: 3px 40px;
  display: flex;
  align-items: center;
  gap: 4px;
  z-index: 3;
}

.mabar-card__featured svg {
  width: 12px;
  height: 12px;
}

.mabar-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  z-index: 1;
}

.mabar-card__type {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: 'Teko', var(--font-heading);
  font-size: 0.92rem;
  letter-spacing: 1.3px;
  color: var(--type-color);
  background: color-mix(in srgb, var(--type-color) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--type-color) 40%, transparent);
  padding: 3px 10px;
  border-radius: 999px;
  text-transform: uppercase;
  font-weight: 700;
}

.mabar-card__type svg {
  width: 13px;
  height: 13px;
  stroke-width: 2;
}

.mabar-card__status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 1.4px;
  color: #8ca39a;
  text-transform: uppercase;
}

.mabar-card__status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #8ca39a;
}

.mabar-card__status[data-status="open"] {
  color: #5eead4;
}

.mabar-card__status[data-status="open"] .mabar-card__status-dot {
  background: #00ff87;
  box-shadow: 0 0 8px rgba(0, 255, 135, 0.8);
}

.mabar-card__status[data-status="full"] {
  color: #ffd86b;
}

.mabar-card__status[data-status="full"] .mabar-card__status-dot {
  background: #ffb347;
}

.mabar-card__status[data-status="live"] {
  color: #ff6b9d;
}

.mabar-card__status[data-status="live"] .mabar-card__status-dot {
  background: #ff3d7f;
  animation: pulse-scale 1.2s ease-in-out infinite;
}

.mabar-card__title {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.6rem;
  line-height: 1.05;
  letter-spacing: 0.7px;
  margin: 0;
  color: #fff;
  position: relative;
  z-index: 1;
}

.mabar-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  position: relative;
  z-index: 1;
}

.chip {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  letter-spacing: 0.7px;
  text-transform: uppercase;
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
}

.chip--vibe { background: rgba(0, 255, 135, 0.08); color: #5eead4; border-color: rgba(0, 255, 135, 0.25); }
.chip--vibe[data-vibe="sweaty"] { background: rgba(255, 99, 132, 0.1); color: #ff8aa0; border-color: rgba(255, 99, 132, 0.35); }
.chip--vibe[data-vibe="chill"] { background: rgba(109, 181, 255, 0.1); color: #8fcaff; border-color: rgba(109, 181, 255, 0.35); }
.chip--vibe[data-vibe="tryhard"] { background: rgba(255, 152, 0, 0.1); color: #ffc37d; border-color: rgba(255, 152, 0, 0.35); }
.chip--vibe[data-vibe="learning"] { background: rgba(186, 104, 255, 0.1); color: #c895ff; border-color: rgba(186, 104, 255, 0.35); }
.chip--vibe[data-vibe="event"] { background: rgba(255, 216, 107, 0.12); color: #ffe089; border-color: rgba(255, 216, 107, 0.35); }

.chip--rank { background: rgba(255, 216, 107, 0.06); color: #ffe089; border-color: rgba(255, 216, 107, 0.2); }
.chip--recur { background: rgba(109, 181, 255, 0.08); color: #8fcaff; border-color: rgba(109, 181, 255, 0.25); }

.mabar-card__countdown {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(0, 255, 135, 0.15);
  border-radius: 12px;
  padding: 10px 12px;
  position: relative;
  z-index: 1;
}

.mabar-card__cd-big {
  font-family: 'JetBrains Mono', 'Teko', monospace;
  font-size: 1.55rem;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: var(--green-neon);
  text-shadow: 0 0 14px rgba(0, 255, 135, 0.45);
  font-variant-numeric: tabular-nums;
}

.mabar-card__cd-big--live {
  color: #ff3d7f;
  text-shadow: 0 0 14px rgba(255, 61, 127, 0.55);
  animation: pulse-scale 1.2s ease-in-out infinite;
}

.mabar-card__cd-small {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 1.8px;
  color: var(--text-secondary);
  text-transform: uppercase;
  margin-top: 2px;
}

.mabar-card__slots {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  position: relative;
  z-index: 1;
}

.slot {
  aspect-ratio: 1;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1.5px dashed rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  transition: all 0.25s ease;
}

.slot--filled {
  background: linear-gradient(135deg, rgba(0, 255, 135, 0.15), rgba(0, 140, 255, 0.05));
  border: 1.5px solid rgba(0, 255, 135, 0.55);
  box-shadow: 0 0 10px rgba(0, 255, 135, 0.15);
}

.slot--pending {
  border-style: dashed;
  border-color: rgba(255, 216, 107, 0.55);
  background: rgba(255, 216, 107, 0.08);
}

.slot--mine {
  outline: 2px solid rgba(0, 255, 135, 0.8);
  outline-offset: -1px;
}

.slot__avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.slot__avatar--letter {
  background: linear-gradient(135deg, #00ff87, #0077ff);
  color: #000;
  font-weight: 800;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slot__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.slot__role {
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.9px;
  color: var(--text-muted);
}

.mabar-card__meta-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 2px;
  position: relative;
  z-index: 1;
}

.mabar-card__host {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 0.82rem;
  color: var(--text-white);
}

.mabar-card__host-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00ff87, #0077ff);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #000;
  font-weight: 800;
  font-size: 0.7rem;
  overflow: hidden;
}

.mabar-card__host-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mabar-card__host-name {
  font-weight: 600;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mabar-card__filled {
  font-family: 'JetBrains Mono', 'Teko', monospace;
  font-size: 0.85rem;
  color: var(--green-neon);
  font-weight: 700;
  letter-spacing: 1px;
}

.mabar-card__room-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  box-shadow: 0 4px 14px rgba(0, 255, 170, 0.3);
}
.mabar-card__room-icon { filter: drop-shadow(0 0 4px rgba(255,255,255,0.35)); }

.mabar-card__actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
  position: relative;
  z-index: 1;
}

.btn-soft, .btn-primary-glow, .btn-outline-danger {
  flex: 1;
  padding: 10px 14px;
  border-radius: 10px;
  font-family: 'Teko', var(--font-heading);
  font-size: 0.95rem;
  letter-spacing: 1px;
  text-transform: uppercase;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.btn-soft {
  background: rgba(255, 255, 255, 0.04);
  border-color: var(--border-color);
  color: var(--text-white);
}

.btn-soft:hover { background: rgba(255, 255, 255, 0.08); }

.btn-primary-glow {
  background: linear-gradient(135deg, #00ff87, #00c870);
  color: #04120c;
  border-color: #00ff87;
  box-shadow: 0 0 18px rgba(0, 255, 135, 0.35);
}

.btn-primary-glow:hover {
  box-shadow: 0 0 24px rgba(0, 255, 135, 0.55);
  transform: translateY(-1px);
}

.btn-outline-danger {
  background: transparent;
  border-color: rgba(255, 80, 100, 0.5);
  color: #ff8a8a;
}

.btn-outline-danger:hover {
  background: rgba(255, 80, 100, 0.1);
}

.mabar-card__admin {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 4px;
  z-index: 2;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.mabar-card:hover .mabar-card__admin { opacity: 1; }

.mabar-card.is-featured .mabar-card__admin { top: auto; bottom: 10px; }

.mabar-card__admin-btn {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid var(--border-color);
  color: #cfd8d4;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.mabar-card__admin-btn svg { width: 13px; height: 13px; }

.mabar-card__admin-btn:hover { border-color: var(--green-neon); color: var(--green-neon); }
.mabar-card__admin-btn--danger:hover { border-color: #ff5050; color: #ff8a8a; }
</style>
