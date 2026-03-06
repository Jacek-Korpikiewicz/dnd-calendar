# D&D Calendar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Vercel-hosted D&D group calendar where players authenticate via magic link, mark availability with preset time slots, and the DM can propose/confirm sessions.

**Architecture:** Next.js App Router with Supabase for auth (magic link) and Postgres database. Server components fetch data, client components handle interactivity. Middleware protects routes and refreshes auth tokens.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Supabase (@supabase/ssr, @supabase/supabase-js), Vercel deployment.

**Design doc:** `docs/plans/2026-03-06-dnd-calendar-design.md`

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.env.local.example`, `.gitignore`

**Step 1: Create Next.js project**

Run:
```bash
cd /Users/jacekkorpikiewicz/claude/dnd-calendar
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --turbopack --yes
```

Expected: Project scaffolded with App Router structure.

**Step 2: Install Supabase dependencies**

Run:
```bash
npm install @supabase/supabase-js @supabase/ssr
```

**Step 3: Create .env.local.example**

Create `.env.local.example`:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**Step 4: Update .gitignore to exclude .env.local**

Verify `.gitignore` contains `.env.local` (create-next-app should include it).

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Supabase deps"
```

---

### Task 2: Supabase Client Setup

**Files:**
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/middleware.ts`
- Create: `middleware.ts`

**Step 1: Create server-side Supabase client**

Create `lib/supabase/server.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component — middleware handles refresh
          }
        },
      },
    }
  )
}
```

**Step 2: Create browser-side Supabase client**

Create `lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Step 3: Create middleware helper**

Create `lib/supabase/middleware.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

**Step 4: Create root middleware**

Create `middleware.ts`:
```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

**Step 5: Commit**

```bash
git add lib/supabase/ middleware.ts
git commit -m "feat: add Supabase client setup and auth middleware"
```

---

### Task 3: Supabase Database Schema

**Files:**
- Create: `supabase/schema.sql`

**Step 1: Write the SQL schema**

Create `supabase/schema.sql`:
```sql
-- Slot type enum
create type time_slot as enum ('morning', 'afternoon', 'evening');

-- Session status enum
create type session_status as enum ('proposed', 'confirmed');

-- Players table (linked to auth.users)
create table players (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  is_dm boolean default false,
  created_at timestamptz default now()
);

-- Availability table
create table availability (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  date date not null,
  slot time_slot not null,
  created_at timestamptz default now(),
  unique(player_id, date, slot)
);

-- Sessions table
create table sessions (
  id uuid primary key default gen_random_uuid(),
  proposed_by uuid not null references players(id) on delete cascade,
  date date not null,
  slot time_slot not null,
  status session_status default 'proposed',
  created_at timestamptz default now()
);

-- RLS policies
alter table players enable row level security;
alter table availability enable row level security;
alter table sessions enable row level security;

-- Players: anyone authenticated can read, users can update their own row
create policy "Players are viewable by authenticated users"
  on players for select to authenticated using (true);

create policy "Users can update their own player record"
  on players for update to authenticated using (auth.uid() = id);

-- Auto-create player row on signup via trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.players (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Availability: anyone authenticated can read, users manage their own
create policy "Availability is viewable by authenticated users"
  on availability for select to authenticated using (true);

create policy "Users can insert their own availability"
  on availability for insert to authenticated
  with check (auth.uid() = player_id);

create policy "Users can delete their own availability"
  on availability for delete to authenticated
  using (auth.uid() = player_id);

-- Sessions: anyone authenticated can read, DM can manage
create policy "Sessions are viewable by authenticated users"
  on sessions for select to authenticated using (true);

create policy "DM can insert sessions"
  on sessions for insert to authenticated
  with check (
    exists (select 1 from players where id = auth.uid() and is_dm = true)
  );

create policy "DM can update sessions"
  on sessions for update to authenticated
  using (
    exists (select 1 from players where id = auth.uid() and is_dm = true)
  );

create policy "DM can delete sessions"
  on sessions for delete to authenticated
  using (
    exists (select 1 from players where id = auth.uid() and is_dm = true)
  );
```

**Step 2: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add Supabase database schema with RLS policies"
```

> **Note:** The user must run this SQL in the Supabase dashboard SQL editor manually, or set up Supabase CLI migrations. We'll prompt them.

---

### Task 4: Auth — Login Page & Magic Link

**Files:**
- Create: `app/login/page.tsx`
- Create: `app/auth/confirm/route.ts`

**Step 1: Create login page**

Create `app/login/page.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-950">
      <div className="bg-amber-100 border-2 border-amber-800 rounded-lg p-8 max-w-md w-full shadow-lg">
        <h1 className="text-2xl font-bold text-amber-900 mb-2 text-center">
          D&D on a Bus
        </h1>
        <p className="text-amber-700 text-center mb-6 text-sm">
          Next stop: adventure
        </p>

        {sent ? (
          <div className="text-center">
            <p className="text-amber-900 font-medium">Check your email!</p>
            <p className="text-amber-700 text-sm mt-2">
              We sent a magic link to <strong>{email}</strong>
            </p>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-amber-900">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full rounded border-amber-300 bg-amber-50 px-3 py-2 text-amber-900 focus:border-amber-600 focus:ring-amber-600"
                placeholder="adventurer@example.com"
              />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              type="submit"
              className="w-full bg-amber-800 text-amber-100 py-2 rounded font-medium hover:bg-amber-700 transition-colors"
            >
              Send Magic Link
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
```

**Step 2: Create auth confirm route**

Create `app/auth/confirm/route.ts`:
```typescript
import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      redirect(next)
    }
  }

  redirect('/login')
}
```

**Step 3: Commit**

```bash
git add app/login/ app/auth/
git commit -m "feat: add magic link login page and auth confirm route"
```

---

### Task 5: Onboarding — Display Name Setup

**Files:**
- Create: `app/onboarding/page.tsx`
- Create: `app/onboarding/actions.ts`
- Modify: `lib/supabase/middleware.ts` — add onboarding redirect

**Step 1: Create onboarding server action**

Create `app/onboarding/actions.ts`:
```typescript
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
```

**Step 2: Create onboarding page**

Create `app/onboarding/page.tsx`:
```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { setDisplayName } from './actions'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: player } = await supabase
    .from('players')
    .select('display_name')
    .eq('id', user.id)
    .single()

  if (player?.display_name) redirect('/')

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-950">
      <div className="bg-amber-100 border-2 border-amber-800 rounded-lg p-8 max-w-md w-full shadow-lg">
        <h1 className="text-2xl font-bold text-amber-900 mb-2 text-center">
          Welcome Aboard!
        </h1>
        <p className="text-amber-700 text-center mb-6 text-sm">
          What should we call you, adventurer?
        </p>
        <form action={setDisplayName} className="space-y-4">
          <input
            name="displayName"
            type="text"
            required
            maxLength={30}
            className="block w-full rounded border-amber-300 bg-amber-50 px-3 py-2 text-amber-900 focus:border-amber-600 focus:ring-amber-600"
            placeholder="Your display name"
          />
          <button
            type="submit"
            className="w-full bg-amber-800 text-amber-100 py-2 rounded font-medium hover:bg-amber-700 transition-colors"
          >
            Board the Bus
          </button>
        </form>
      </div>
    </div>
  )
}
```

**Step 3: Update middleware to redirect users without display names**

Modify `lib/supabase/middleware.ts` — after the `getUser()` check and before returning `supabaseResponse`, add onboarding redirect logic:

```typescript
// After the !user redirect block, add:
if (
  user &&
  !request.nextUrl.pathname.startsWith('/onboarding') &&
  !request.nextUrl.pathname.startsWith('/auth')
) {
  const { data: player } = await supabase
    .from('players')
    .select('display_name')
    .eq('id', user.id)
    .single()

  if (!player?.display_name) {
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding'
    return NextResponse.redirect(url)
  }
}
```

**Step 4: Commit**

```bash
git add app/onboarding/ lib/supabase/middleware.ts
git commit -m "feat: add onboarding page for display name setup"
```

---

### Task 6: TypeScript Types

**Files:**
- Create: `lib/types.ts`

**Step 1: Create shared types**

Create `lib/types.ts`:
```typescript
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
```

**Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

### Task 7: Calendar — Monthly Grid View

**Files:**
- Create: `app/page.tsx` (replace scaffold)
- Create: `app/components/calendar-grid.tsx`
- Create: `app/components/calendar-header.tsx`
- Create: `app/components/day-cell.tsx`
- Create: `lib/calendar.ts`

**Step 1: Create calendar utility functions**

Create `lib/calendar.ts`:
```typescript
export function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const date = new Date(year, month, 1)
  while (date.getMonth() === month) {
    days.push(new Date(date))
    date.setDate(date.getDate() + 1)
  }
  return days
}

export function getWeekDays(): string[] {
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
}

export function getStartPadding(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay()
  // Convert Sunday=0 to Monday-start: Mon=0, Tue=1, ..., Sun=6
  return day === 0 ? 6 : day - 1
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function getWeekDates(baseDate: Date): Date[] {
  const dates: Date[] = []
  const day = baseDate.getDay()
  const monday = new Date(baseDate)
  monday.setDate(baseDate.getDate() - (day === 0 ? 6 : day - 1))
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    dates.push(d)
  }
  return dates
}
```

**Step 2: Create CalendarHeader component**

Create `app/components/calendar-header.tsx`:
```tsx
'use client'

interface CalendarHeaderProps {
  year: number
  month: number
  view: 'month' | 'week'
  onPrev: () => void
  onNext: () => void
  onToggleView: () => void
  onSignOut: () => void
  playerName: string
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function CalendarHeader({
  year, month, view, onPrev, onNext, onToggleView, onSignOut, playerName,
}: CalendarHeaderProps) {
  return (
    <header className="flex items-center justify-between mb-4 px-2">
      <div className="flex items-center gap-3">
        <button onClick={onPrev} className="text-amber-200 hover:text-white text-xl px-2">&larr;</button>
        <h2 className="text-xl font-bold text-amber-100">
          {MONTH_NAMES[month]} {year}
        </h2>
        <button onClick={onNext} className="text-amber-200 hover:text-white text-xl px-2">&rarr;</button>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-amber-300 text-sm">{playerName}</span>
        <button
          onClick={onToggleView}
          className="bg-amber-800 text-amber-100 px-3 py-1 rounded text-sm hover:bg-amber-700 transition-colors"
        >
          {view === 'month' ? 'Week' : 'Month'}
        </button>
        <button
          onClick={onSignOut}
          className="text-amber-400 hover:text-amber-200 text-sm"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
```

**Step 3: Create DayCell component**

Create `app/components/day-cell.tsx`:
```tsx
'use client'

import { type TimeSlot } from '@/lib/types'

interface DayCellProps {
  date: string
  dayNumber: number
  isToday: boolean
  availability: Record<TimeSlot, string[]> // slot -> player names
  hasSession: 'proposed' | 'confirmed' | null
  onClick: () => void
}

const SLOT_COLORS: Record<TimeSlot, string> = {
  morning: 'bg-yellow-400',
  afternoon: 'bg-orange-400',
  evening: 'bg-indigo-400',
}

export default function DayCell({ dayNumber, isToday, availability, hasSession, onClick }: DayCellProps) {
  const totalPlayers = new Set(
    Object.values(availability).flat()
  ).size

  return (
    <button
      onClick={onClick}
      className={`
        relative p-2 h-24 border border-amber-800/30 rounded text-left
        hover:bg-amber-800/40 transition-colors
        ${isToday ? 'ring-2 ring-amber-400' : ''}
        ${hasSession === 'confirmed' ? 'bg-green-900/30' : hasSession === 'proposed' ? 'bg-blue-900/30' : 'bg-amber-900/20'}
      `}
    >
      <span className={`text-sm font-medium ${isToday ? 'text-amber-300' : 'text-amber-200'}`}>
        {dayNumber}
      </span>
      <div className="flex gap-0.5 mt-1 flex-wrap">
        {(['morning', 'afternoon', 'evening'] as TimeSlot[]).map((slot) =>
          availability[slot].length > 0 ? (
            <div
              key={slot}
              className={`${SLOT_COLORS[slot]} rounded-full w-2 h-2`}
              title={`${slot}: ${availability[slot].join(', ')}`}
            />
          ) : null
        )}
      </div>
      {totalPlayers >= 4 && (
        <span className="absolute bottom-1 right-1 text-xs text-green-400 font-bold">
          {totalPlayers}
        </span>
      )}
      {hasSession && (
        <span className="absolute top-1 right-1 text-xs">
          {hasSession === 'confirmed' ? '⚔️' : '❓'}
        </span>
      )}
    </button>
  )
}
```

**Step 4: Create CalendarGrid component**

Create `app/components/calendar-grid.tsx`:
```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getDaysInMonth, getStartPadding, getWeekDays, getWeekDates, formatDate } from '@/lib/calendar'
import { type TimeSlot, type Player } from '@/lib/types'
import CalendarHeader from './calendar-header'
import DayCell from './day-cell'

interface CalendarGridProps {
  player: Player
}

interface DayData {
  availability: Record<TimeSlot, string[]>
  session: 'proposed' | 'confirmed' | null
}

export default function CalendarGrid({ player }: CalendarGridProps) {
  const router = useRouter()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [view, setView] = useState<'month' | 'week'>('month')
  const [weekBase, setWeekBase] = useState(now)
  const [dayData, setDayData] = useState<Record<string, DayData>>({})

  const fetchData = useCallback(async (dates: Date[]) => {
    const supabase = createClient()
    const dateStrs = dates.map(formatDate)
    const minDate = dateStrs[0]
    const maxDate = dateStrs[dateStrs.length - 1]

    const [availRes, sessionRes] = await Promise.all([
      supabase
        .from('availability')
        .select('date, slot, player_id, players(display_name)')
        .gte('date', minDate)
        .lte('date', maxDate),
      supabase
        .from('sessions')
        .select('date, status')
        .gte('date', minDate)
        .lte('date', maxDate),
    ])

    const data: Record<string, DayData> = {}
    for (const d of dateStrs) {
      data[d] = {
        availability: { morning: [], afternoon: [], evening: [] },
        session: null,
      }
    }

    for (const row of availRes.data || []) {
      const d = row.date as string
      const slot = row.slot as TimeSlot
      const name = (row.players as unknown as { display_name: string })?.display_name || 'Unknown'
      if (data[d]) {
        data[d].availability[slot].push(name)
      }
    }

    for (const row of sessionRes.data || []) {
      const d = row.date as string
      if (data[d]) {
        const status = row.status as 'proposed' | 'confirmed'
        if (data[d].session !== 'confirmed') {
          data[d].session = status
        }
      }
    }

    setDayData(data)
  }, [])

  useEffect(() => {
    if (view === 'month') {
      fetchData(getDaysInMonth(year, month))
    } else {
      fetchData(getWeekDates(weekBase))
    }
  }, [year, month, view, weekBase, fetchData])

  function handlePrev() {
    if (view === 'month') {
      if (month === 0) { setMonth(11); setYear(y => y - 1) }
      else setMonth(m => m - 1)
    } else {
      setWeekBase(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })
    }
  }

  function handleNext() {
    if (view === 'month') {
      if (month === 11) { setMonth(0); setYear(y => y + 1) }
      else setMonth(m => m + 1)
    } else {
      setWeekBase(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })
    }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const todayStr = formatDate(now)
  const days = view === 'month' ? getDaysInMonth(year, month) : getWeekDates(weekBase)
  const padding = view === 'month' ? getStartPadding(year, month) : 0

  return (
    <div className="max-w-4xl mx-auto p-4">
      <CalendarHeader
        year={year}
        month={month}
        view={view}
        onPrev={handlePrev}
        onNext={handleNext}
        onToggleView={() => setView(v => v === 'month' ? 'week' : 'month')}
        onSignOut={handleSignOut}
        playerName={player.display_name || 'Adventurer'}
      />
      <div className="grid grid-cols-7 gap-1 mb-1">
        {getWeekDays().map(d => (
          <div key={d} className="text-center text-amber-400 text-xs font-medium py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: padding }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map(date => {
          const dateStr = formatDate(date)
          const dd = dayData[dateStr] || { availability: { morning: [], afternoon: [], evening: [] }, session: null }
          return (
            <DayCell
              key={dateStr}
              date={dateStr}
              dayNumber={date.getDate()}
              isToday={dateStr === todayStr}
              availability={dd.availability}
              hasSession={dd.session}
              onClick={() => router.push(`/day/${dateStr}`)}
            />
          )
        })}
      </div>
      <div className="flex gap-4 mt-4 text-xs text-amber-400 justify-center">
        <span><span className="inline-block w-2 h-2 rounded-full bg-yellow-400 mr-1" />Morning</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-orange-400 mr-1" />Afternoon</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-indigo-400 mr-1" />Evening</span>
        <span>⚔️ Confirmed</span>
        <span>❓ Proposed</span>
      </div>
    </div>
  )
}
```

**Step 5: Update main page**

Replace `app/page.tsx`:
```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CalendarGrid from './components/calendar-grid'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!player?.display_name) redirect('/onboarding')

  return (
    <main className="min-h-screen bg-amber-950">
      <div className="text-center pt-6 pb-2">
        <h1 className="text-3xl font-bold text-amber-100">D&D on a Bus</h1>
        <p className="text-amber-500 text-sm">Next stop: adventure</p>
      </div>
      <CalendarGrid player={player} />
    </main>
  )
}
```

**Step 6: Commit**

```bash
git add app/page.tsx app/components/ lib/calendar.ts
git commit -m "feat: add monthly and weekly calendar grid views"
```

---

### Task 8: Day Detail Page — Availability & Sessions

**Files:**
- Create: `app/day/[date]/page.tsx`
- Create: `app/day/[date]/actions.ts`
- Create: `app/components/availability-panel.tsx`
- Create: `app/components/session-panel.tsx`

**Step 1: Create server actions for availability and sessions**

Create `app/day/[date]/actions.ts`:
```typescript
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
```

**Step 2: Create AvailabilityPanel component**

Create `app/components/availability-panel.tsx`:
```tsx
'use client'

import { useTransition } from 'react'
import { toggleAvailability } from '@/app/day/[date]/actions'
import { SLOT_LABELS, SLOT_ORDER, type TimeSlot } from '@/lib/types'

interface AvailabilityPanelProps {
  date: string
  currentUserId: string
  availability: { slot: TimeSlot; player_id: string; players: { display_name: string } }[]
}

export default function AvailabilityPanel({ date, currentUserId, availability }: AvailabilityPanelProps) {
  const [isPending, startTransition] = useTransition()

  function isChecked(slot: TimeSlot) {
    return availability.some(a => a.slot === slot && a.player_id === currentUserId)
  }

  function playersForSlot(slot: TimeSlot) {
    return availability.filter(a => a.slot === slot).map(a => a.players.display_name)
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-amber-100">Your Availability</h3>
      {SLOT_ORDER.map(slot => {
        const players = playersForSlot(slot)
        const checked = isChecked(slot)
        return (
          <div key={slot} className="bg-amber-900/30 rounded p-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={isPending}
                  onChange={() => startTransition(() => toggleAvailability(date, slot))}
                  className="rounded border-amber-600 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-amber-200 font-medium">{SLOT_LABELS[slot]}</span>
              </label>
              <span className={`text-sm ${players.length >= 4 ? 'text-green-400 font-bold' : 'text-amber-400'}`}>
                {players.length} player{players.length !== 1 ? 's' : ''}
              </span>
            </div>
            {players.length > 0 && (
              <p className="text-amber-400 text-sm mt-1 ml-6">
                {players.join(', ')}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

**Step 3: Create SessionPanel component**

Create `app/components/session-panel.tsx`:
```tsx
'use client'

import { useTransition } from 'react'
import { proposeSession, confirmSession, deleteSession } from '@/app/day/[date]/actions'
import { SLOT_LABELS, SLOT_ORDER, type TimeSlot, type Session } from '@/lib/types'

interface SessionPanelProps {
  date: string
  sessions: (Session & { players: { display_name: string } })[]
  isDm: boolean
}

export default function SessionPanel({ date, sessions, isDm }: SessionPanelProps) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-amber-100">Sessions</h3>

      {sessions.length === 0 && (
        <p className="text-amber-500 text-sm">No sessions proposed for this day.</p>
      )}

      {sessions.map(session => (
        <div
          key={session.id}
          className={`rounded p-3 ${session.status === 'confirmed' ? 'bg-green-900/30 border border-green-700' : 'bg-blue-900/30 border border-blue-700'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-amber-100 font-medium">{SLOT_LABELS[session.slot]}</span>
              <span className={`ml-2 text-xs px-2 py-0.5 rounded ${session.status === 'confirmed' ? 'bg-green-700 text-green-100' : 'bg-blue-700 text-blue-100'}`}>
                {session.status}
              </span>
            </div>
            {isDm && (
              <div className="flex gap-2">
                {session.status === 'proposed' && (
                  <button
                    disabled={isPending}
                    onClick={() => startTransition(() => confirmSession(session.id, date))}
                    className="text-xs bg-green-700 text-green-100 px-2 py-1 rounded hover:bg-green-600"
                  >
                    Confirm
                  </button>
                )}
                <button
                  disabled={isPending}
                  onClick={() => startTransition(() => deleteSession(session.id, date))}
                  className="text-xs bg-red-800 text-red-100 px-2 py-1 rounded hover:bg-red-700"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
          <p className="text-amber-500 text-xs mt-1">
            Proposed by {session.players.display_name}
          </p>
        </div>
      ))}

      {isDm && (
        <div className="pt-2 border-t border-amber-800/50">
          <p className="text-amber-400 text-sm mb-2">Propose a session:</p>
          <div className="flex gap-2">
            {SLOT_ORDER.map(slot => (
              <button
                key={slot}
                disabled={isPending}
                onClick={() => startTransition(() => proposeSession(date, slot))}
                className="text-xs bg-amber-800 text-amber-100 px-3 py-1.5 rounded hover:bg-amber-700 transition-colors"
              >
                {slot.charAt(0).toUpperCase() + slot.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 4: Create day detail page**

Create `app/day/[date]/page.tsx`:
```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AvailabilityPanel from '@/app/components/availability-panel'
import SessionPanel from '@/app/components/session-panel'

export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [playerRes, availRes, sessionRes] = await Promise.all([
    supabase.from('players').select('*').eq('id', user.id).single(),
    supabase
      .from('availability')
      .select('*, players(display_name)')
      .eq('date', date),
    supabase
      .from('sessions')
      .select('*, players:proposed_by(display_name)')
      .eq('date', date),
  ])

  const player = playerRes.data
  if (!player) redirect('/login')

  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <main className="min-h-screen bg-amber-950 p-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-amber-400 hover:text-amber-200 text-sm mb-4 inline-block">
          &larr; Back to calendar
        </Link>
        <h1 className="text-2xl font-bold text-amber-100 mb-1">{displayDate}</h1>
        <p className="text-amber-500 text-sm mb-6">Tap slots to toggle your availability</p>

        <div className="space-y-6">
          <AvailabilityPanel
            date={date}
            currentUserId={user.id}
            availability={(availRes.data || []) as any}
          />
          <SessionPanel
            date={date}
            sessions={(sessionRes.data || []) as any}
            isDm={player.is_dm}
          />
        </div>
      </div>
    </main>
  )
}
```

**Step 5: Commit**

```bash
git add app/day/ app/components/availability-panel.tsx app/components/session-panel.tsx
git commit -m "feat: add day detail page with availability and session management"
```

---

### Task 9: Layout & Global Styles (D&D on a Bus Theme)

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

**Step 1: Update global layout**

Replace `app/layout.tsx`:
```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'D&D on a Bus',
  description: 'Next stop: adventure. A scheduling calendar for your D&D group.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-amber-950 text-amber-100`}>
        {children}
      </body>
    </html>
  )
}
```

**Step 2: Update globals.css with theme styles**

Replace `app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-amber-950 text-amber-100 antialiased;
    background-image:
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 40px,
        rgba(180, 120, 60, 0.05) 40px,
        rgba(180, 120, 60, 0.05) 41px
      );
  }

  /* Parchment-style inputs */
  input[type="text"],
  input[type="email"] {
    @apply border border-amber-600 bg-amber-50 text-amber-900;
  }

  /* Checkbox styling */
  input[type="checkbox"] {
    @apply accent-amber-600;
  }
}
```

**Step 3: Commit**

```bash
git add app/layout.tsx app/globals.css
git commit -m "feat: add D&D on a Bus theme and global styles"
```

---

### Task 10: Vercel Deployment Setup

**Files:**
- Create: `vercel.json` (optional, only if needed)

**Step 1: Verify project builds**

Run:
```bash
npm run build
```

Expected: Successful build with no errors.

**Step 2: Fix any build errors**

Address TypeScript or build errors that come up.

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build issues for deployment"
```

**Step 4: Deploy to Vercel**

Run:
```bash
npx vercel --yes
```

Follow prompts. Then set environment variables:
```bash
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

**Step 5: Set up Supabase**

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Run the SQL from `supabase/schema.sql` in the SQL editor
3. Go to Authentication > URL Configuration and add the Vercel deployment URL to "Redirect URLs"
4. Copy the project URL and anon key to Vercel env vars

**Step 6: Redeploy with env vars**

```bash
npx vercel --prod
```

**Step 7: Commit vercel config if created**

```bash
git add -A
git commit -m "chore: finalize deployment configuration"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Project scaffolding | package.json, next.config.ts |
| 2 | Supabase client setup | lib/supabase/*, middleware.ts |
| 3 | Database schema | supabase/schema.sql |
| 4 | Login page + magic link | app/login/, app/auth/confirm/ |
| 5 | Onboarding (display name) | app/onboarding/ |
| 6 | TypeScript types | lib/types.ts |
| 7 | Calendar views (month/week) | app/components/calendar-*, app/page.tsx |
| 8 | Day detail page | app/day/[date]/, availability + session panels |
| 9 | Theme & global styles | app/layout.tsx, globals.css |
| 10 | Build & deploy | Vercel + Supabase setup |
