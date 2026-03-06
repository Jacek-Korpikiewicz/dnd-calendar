'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function setDisplayName(formData: FormData) {
  const displayName = formData.get('displayName') as string
  if (!displayName?.trim()) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase
    .from('players')
    .update({ display_name: displayName.trim() })
    .eq('id', user.id)

  redirect('/')
}
