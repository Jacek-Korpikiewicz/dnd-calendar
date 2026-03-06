export type TimeSlot = 'morning' | 'afternoon' | 'evening'
export type SessionStatus = 'proposed' | 'confirmed'

export interface Player {
  id: string
  email: string
  display_name: string | null
  is_dm: boolean
  created_at: string
}

export interface Availability {
  id: string
  player_id: string
  date: string
  slot: TimeSlot
  created_at: string
}

export interface Session {
  id: string
  proposed_by: string
  date: string
  slot: TimeSlot
  status: SessionStatus
  created_at: string
}

export interface AvailabilityWithPlayer extends Availability {
  players: Pick<Player, 'display_name'>
}

export const SLOT_LABELS: Record<TimeSlot, string> = {
  morning: 'Morning (8-12)',
  afternoon: 'Afternoon (12-18)',
  evening: 'Evening (18-23)',
}

export const SLOT_ORDER: TimeSlot[] = ['morning', 'afternoon', 'evening']
