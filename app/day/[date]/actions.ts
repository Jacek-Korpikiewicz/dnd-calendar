'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { type TimeSlot } from '@/lib/types'

async function getUserId() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return { supabase, userId: session?.user?.id ?? null }
}

export async function toggleAvailability(date: string, slot: TimeSlot) {
  const { supabase, userId } = await getUserId()
  if (!userId) return

  // Try delete first — if it deletes 0 rows, insert instead
  const { count } = await supabase
    .from('availability')
    .delete({ count: 'exact' })
    .eq('player_id', userId)
    .eq('date', date)
    .eq('slot', slot)

  if (count === 0) {
    await supabase.from('availability').insert({ player_id: userId, date, slot })
  }

  revalidatePath(`/day/${date}`)
}

export async function proposeSession(date: string, slot: TimeSlot) {
  const { supabase, userId } = await getUserId()
  if (!userId) return

  await supabase.from('sessions').insert({
    proposed_by: userId,
    date,
    slot,
    status: 'proposed',
  })

  revalidatePath(`/day/${date}`)
}

export async function confirmSession(sessionId: string, date: string) {
  const { supabase, userId } = await getUserId()
  if (!userId) return

  await supabase
    .from('sessions')
    .update({ status: 'confirmed' })
    .eq('id', sessionId)

  revalidatePath(`/day/${date}`)
}

export async function deleteSession(sessionId: string, date: string) {
  const { supabase, userId } = await getUserId()
  if (!userId) return

  await supabase.from('sessions').delete().eq('id', sessionId)

  revalidatePath(`/day/${date}`)
}
