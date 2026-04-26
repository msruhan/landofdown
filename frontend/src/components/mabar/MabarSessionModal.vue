<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { MabarRole, MabarSessionDTO, MabarSessionPayload } from '@/types'

const props = defineProps<{
  open: boolean
  editing?: MabarSessionDTO | null
  submitting?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'submit', payload: MabarSessionPayload): void
}>()

const form = ref<MabarSessionPayload>({
  title: '',
  type: 'classic',
  vibe: 'chill',
  rank_requirement: 'any',
  starts_at: '',
  ends_at: null,
  recurrence: 'none',
  recurrence_days: null,
  max_slots: 5,
  voice_platform: null,
  discord_link: null,
  room_id: null,
  notes: null,
  slot_roles: ['any', 'any', 'any', 'any', 'any'],
})

const types = [
  { value: 'push_rank', label: 'Push Rank', desc: 'Serius push, wajib kompak' },
  { value: 'classic', label: 'Classic', desc: 'Santai dulu, penting fun' },
  { value: 'brawl', label: 'Brawl', desc: 'Quick match mode brawl' },
  { value: 'tournament', label: 'Tournament Prep', desc: 'Scrim internal squad' },
  { value: 'coaching', label: 'Coaching', desc: 'Senior bantu junior' },
]

const vibes: { value: MabarSessionPayload['vibe']; label: string; emoji: string }[] = [
  { value: 'chill', label: 'Chill', emoji: '😎' },
  { value: 'sweaty', label: 'Sweaty', emoji: '🔥' },
  { value: 'tryhard', label: 'Tryhard', emoji: '⚡' },
  { value: 'learning', label: 'Learning', emoji: '🧠' },
  { value: 'event', label: 'Event', emoji: '🎉' },
]

const ranks = [
  { value: 'any', label: 'Any Rank' },
  { value: 'epic', label: 'Epic+' },
  { value: 'legend', label: 'Legend+' },
  { value: 'mythic', label: 'Mythic+' },
  { value: 'mythic_honor', label: 'Mythic Honor+' },
  { value: 'mythic_glory', label: 'Mythic Glory+' },
  { value: 'mythic_immortal', label: 'Mythic Immortal' },
]

const voicePlatforms = [
  { value: null, label: 'None' },
  { value: 'discord', label: 'Discord' },
  { value: 'in_game', label: 'In-Game Voice' },
  { value: 'chat', label: 'Chat Only' },
]

const slotRoles: { value: MabarRole; label: string; color: string }[] = [
  { value: 'any', label: 'Any', color: '#8ca39a' },
  { value: 'tank', label: 'Tank', color: '#6ab8ff' },
  { value: 'jungle', label: 'Jungle', color: '#00ff87' },
  { value: 'exp', label: 'EXP', color: '#ffb347' },
  { value: 'mid', label: 'Mid', color: '#ba68ff' },
  { value: 'gold', label: 'Gold', color: '#ffd86b' },
  { value: 'roam', label: 'Roam', color: '#ff8aa0' },
]

function toInputDateTime(isoString: string | null | undefined): string {
  if (!isoString) return ''
  const d = new Date(isoString)
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tz).toISOString().slice(0, 16)
}

function resetForm() {
  if (props.editing) {
    form.value = {
      title: props.editing.title,
      type: props.editing.type,
      vibe: props.editing.vibe,
      rank_requirement: props.editing.rank_requirement,
      starts_at: toInputDateTime(props.editing.starts_at),
      ends_at: toInputDateTime(props.editing.ends_at),
      recurrence: props.editing.recurrence,
      recurrence_days: props.editing.recurrence_days,
      max_slots: props.editing.max_slots,
      voice_platform: props.editing.voice_platform,
      discord_link: props.editing.discord_link,
      room_id: props.editing.room_id,
      notes: props.editing.notes,
      slot_roles: props.editing.slots.map((s) => s.role_preference) as MabarRole[],
    }
  } else {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 30)
    now.setSeconds(0, 0)
    form.value = {
      title: '',
      type: 'classic',
      vibe: 'chill',
      rank_requirement: 'any',
      starts_at: toInputDateTime(now.toISOString()),
      ends_at: null,
      recurrence: 'none',
      recurrence_days: null,
      max_slots: 5,
      voice_platform: 'discord',
      discord_link: null,
      room_id: null,
      notes: null,
      slot_roles: ['any', 'any', 'any', 'any', 'any'],
    }
  }
}

watch(
  () => props.open,
  (val) => {
    if (val) resetForm()
  },
)

const currentSlotRoles = computed(() => {
  const max = form.value.max_slots ?? 5
  const base = form.value.slot_roles ?? []
  const arr: MabarRole[] = []
  for (let i = 0; i < max; i++) arr.push((base[i] as MabarRole) ?? 'any')
  return arr
})

function setSlotRole(idx: number, role: MabarRole) {
  const arr = [...currentSlotRoles.value]
  arr[idx] = role
  form.value.slot_roles = arr
}

function submit() {
  if (!form.value.title || !form.value.starts_at) return
  const payload: MabarSessionPayload = {
    ...form.value,
    starts_at: new Date(form.value.starts_at).toISOString(),
    ends_at: form.value.ends_at ? new Date(form.value.ends_at).toISOString() : null,
    slot_roles: currentSlotRoles.value,
  }
  emit('submit', payload)
}
</script>

<template>
  <Teleport to="body">
    <transition name="modal">
      <div v-if="open" class="mabar-modal-overlay" @click.self="emit('close')">
        <div class="mabar-modal">
          <header class="mabar-modal__header">
            <div>
              <span class="mabar-modal__eyebrow">{{ editing ? 'Edit Session' : 'Create Mabar' }}</span>
              <h2 class="mabar-modal__title">{{ editing ? 'Update your squad' : 'Start a new squad' }}</h2>
            </div>
            <button class="mabar-modal__close" @click="emit('close')" aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M18 6L6 18 M6 6l12 12" />
              </svg>
            </button>
          </header>

          <form class="mabar-modal__form" @submit.prevent="submit">
            <div class="form-group">
              <label class="form-label">Judul session</label>
              <input v-model="form.title" class="form-input" maxlength="120" placeholder="e.g. Push Mythic Glory tonight" />
            </div>

            <div class="form-group">
              <label class="form-label">Tipe mabar</label>
              <div class="option-grid option-grid--types">
                <button
                  v-for="t in types"
                  :key="t.value"
                  type="button"
                  class="opt-card"
                  :class="{ active: form.type === t.value }"
                  @click="form.type = t.value as MabarSessionPayload['type']"
                >
                  <span class="opt-card__label">{{ t.label }}</span>
                  <span class="opt-card__desc">{{ t.desc }}</span>
                </button>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Vibe</label>
                <div class="vibe-pills">
                  <button
                    v-for="v in vibes"
                    :key="v.value || 'none'"
                    type="button"
                    class="vibe-pill"
                    :class="{ active: form.vibe === v.value }"
                    @click="form.vibe = v.value"
                  >
                    <span>{{ v.emoji }}</span> {{ v.label }}
                  </button>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Rank requirement</label>
                <select v-model="form.rank_requirement" class="form-select">
                  <option v-for="r in ranks" :key="r.value" :value="r.value">{{ r.label }}</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Mulai</label>
                <input v-model="form.starts_at" type="datetime-local" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">Sampai (opsional)</label>
                <input v-model="form.ends_at" type="datetime-local" class="form-input" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Voice platform</label>
                <select v-model="form.voice_platform" class="form-select">
                  <option v-for="v in voicePlatforms" :key="v.label" :value="v.value">{{ v.label }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Jumlah slot total</label>
                <select v-model.number="form.max_slots" class="form-select">
                  <option v-for="n in [2, 3, 4, 5]" :key="n" :value="n">{{ n }} players</option>
                </select>
              </div>
            </div>

            <div v-if="form.voice_platform === 'discord'" class="form-group">
              <label class="form-label">Discord invite link</label>
              <input v-model="form.discord_link" class="form-input" placeholder="https://discord.gg/..." />
            </div>

            <div class="form-group">
              <label class="form-label">MLBB Room ID (opsional)</label>
              <input v-model="form.room_id" class="form-input" placeholder="e.g. 123456" />
            </div>

            <div class="form-group">
              <label class="form-label">Role yang dibutuhkan tiap slot</label>
              <div class="slot-role-grid">
                <div v-for="(role, idx) in currentSlotRoles" :key="idx" class="slot-role">
                  <span class="slot-role__idx">{{ idx + 1 }}</span>
                  <select
                    class="form-select slot-role__select"
                    :value="role"
                    :disabled="idx === 0"
                    @change="setSlotRole(idx, ($event.target as HTMLSelectElement).value as MabarRole)"
                  >
                    <option v-for="r in slotRoles" :key="r.value" :value="r.value">{{ r.label }}</option>
                  </select>
                  <span v-if="idx === 0" class="slot-role__hint">host</span>
                </div>
              </div>
              <span class="form-hint">Slot 1 selalu kamu sebagai host.</span>
            </div>

            <div class="form-group">
              <label class="form-label">Catatan / vibe tambahan</label>
              <textarea v-model="form.notes" class="form-input" rows="3" maxlength="500" placeholder="e.g. mohon no toxic, pakai mic wajib"></textarea>
            </div>

            <div class="mabar-modal__actions">
              <button type="button" class="btn-soft" @click="emit('close')">Batal</button>
              <button type="submit" class="btn-primary-glow" :disabled="submitting || !form.title || !form.starts_at">
                {{ submitting ? 'Menyimpan...' : editing ? 'Update Session' : 'Publish Session' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.mabar-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  z-index: 100;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 4vh 20px;
  overflow-y: auto;
}

.mabar-modal {
  background: linear-gradient(180deg, rgba(20, 24, 28, 0.98), rgba(12, 14, 16, 0.98));
  border: 1px solid rgba(0, 255, 135, 0.22);
  border-radius: 20px;
  width: 100%;
  max-width: 640px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(0, 255, 135, 0.06);
  position: relative;
  overflow: hidden;
}

.mabar-modal__header {
  padding: 22px 26px 16px;
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: radial-gradient(circle at top right, rgba(0, 255, 135, 0.08), transparent 60%);
}

.mabar-modal__eyebrow {
  font-size: 0.72rem;
  letter-spacing: 2.5px;
  font-weight: 700;
  color: var(--green-neon);
  text-transform: uppercase;
}

.mabar-modal__title {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.8rem;
  margin: 2px 0 0;
  letter-spacing: 0.5px;
  color: #fff;
}

.mabar-modal__close {
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

.mabar-modal__close svg { width: 18px; height: 18px; }
.mabar-modal__close:hover { border-color: #ff5050; color: #ff8a8a; }

.mabar-modal__form {
  padding: 20px 26px 26px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.option-grid--types {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 8px;
}

.opt-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-white);
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.opt-card__label {
  font-family: 'Teko', var(--font-heading);
  font-size: 1.05rem;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  font-weight: 700;
}

.opt-card__desc {
  font-size: 0.7rem;
  color: var(--text-muted);
  letter-spacing: 0.3px;
}

.opt-card:hover { border-color: rgba(0, 255, 135, 0.5); }

.opt-card.active {
  border-color: var(--green-neon);
  background: rgba(0, 255, 135, 0.12);
  box-shadow: 0 0 14px rgba(0, 255, 135, 0.18);
}

.vibe-pills {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.vibe-pill {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 7px 12px;
  border-radius: 999px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.82rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.vibe-pill:hover { border-color: rgba(0, 255, 135, 0.4); color: var(--text-white); }

.vibe-pill.active {
  border-color: var(--green-neon);
  background: rgba(0, 255, 135, 0.12);
  color: var(--green-neon);
  box-shadow: 0 0 10px rgba(0, 255, 135, 0.25);
}

.slot-role-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 8px;
}

.slot-role {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 6px 10px;
}

.slot-role__idx {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(0, 255, 135, 0.15);
  color: var(--green-neon);
  font-size: 0.75rem;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.slot-role__select {
  flex: 1;
  padding: 6px 8px;
  font-size: 0.82rem;
}

.slot-role__hint {
  font-size: 0.65rem;
  color: var(--green-neon);
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.form-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 4px;
  display: block;
}

.mabar-modal__actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
  justify-content: flex-end;
}

.mabar-modal__actions .btn-soft,
.mabar-modal__actions .btn-primary-glow {
  padding: 11px 22px;
  border-radius: 10px;
  font-family: 'Teko', var(--font-heading);
  font-size: 1rem;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
}

.mabar-modal__actions .btn-soft {
  background: rgba(255, 255, 255, 0.04);
  border-color: var(--border-color);
  color: var(--text-white);
}

.mabar-modal__actions .btn-primary-glow {
  background: linear-gradient(135deg, #00ff87, #00c870);
  color: #04120c;
  border-color: #00ff87;
  box-shadow: 0 0 18px rgba(0, 255, 135, 0.35);
}

.mabar-modal__actions .btn-primary-glow:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.22s ease;
}

.modal-enter-active .mabar-modal,
.modal-leave-active .mabar-modal {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .mabar-modal,
.modal-leave-to .mabar-modal {
  opacity: 0;
  transform: translateY(20px) scale(0.98);
}

@media (max-width: 560px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
