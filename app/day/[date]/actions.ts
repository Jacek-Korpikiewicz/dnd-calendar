'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { type TimeSlot } from '@/lib/types'

export async function toggleAvailability(date: string, slot: TimeSlot) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: existing } = await supabase
    .from('availability')
    .select('id')
    .eq('player_id', user.id)
    .eq('date', date)
    .eq('slot', slot)
    .single()

  if (existing) {
    await supabase.from('availability').delete().eq('id', existing.id)
  } else {
    await supabase.from('availability').insert({ player_id: user.id, date, slot })
  }

  revalidatePath(`/day/${date}`)
  revalidatePath('/')
}

export async function proposeSession(date: string, slot: TimeSlot) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('sessions').insert({
    proposed_by: user.id,
    date,
    slot,
    status: 'proposed',
  })

  revalidatePath(`/day/${date}`)
  revalidatePath('/')
}

export async function confirmSession(sessionId: string, date: string) {
  const supabase = await createClient()

  await supabase
    .from('sessions')
    .update({ status: 'confirmed' })
    .eq('id', sessionId)

  revalidatePath(`/day/${date}`)
  revalidatePath('/')
}

export async function deleteSession(sessionId: string, date: string) {
  const supabase = await createClient()

  await supabase.from('sessions').delete().eq('id', sessionId)

  revalidatePath(`/day/${date}`)
  revalidatePath('/')
}
