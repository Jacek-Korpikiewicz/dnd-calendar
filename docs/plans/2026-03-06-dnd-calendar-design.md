# D&D Group Calendar — Design

## Overview

A Vercel-hosted calendar app for a D&D group of ~7 players. Players authenticate via magic link, mark their availability using preset time slots, and the DM can propose/confirm sessions. All players can browse everyone's availability freely.

## Theme

"D&D on a Bus" (Jendrek's bullshit request). Fantasy UI elements mixed with public transit vibes — parchment textures with bus route aesthetics, "next stop: session" motifs, seat-style player indicators. Committed to the bit.

## Stack

- **Frontend:** Next.js (deployed on Vercel)
- **Backend/DB:** Supabase (Postgres + Auth)
- **Auth:** Supabase magic link (email-based, passwordless)

## Auth Flow

- Player enters email on /login
- Receives magic link, clicks to authenticate
- First login prompts for display name
- DM role assigned via database flag (configurable)

## Calendar Views

### Monthly Grid (default)
- Classic month calendar layout
- Each day cell shows colored dots/indicators per player who marked availability
- Click a day to open day detail

### Weekly View (toggle)
- Expanded 7-day view showing time slots directly
- Toggle button switches between monthly and weekly

## Availability System

- Click a day to open a modal/detail view
- Preset time blocks:
  - **Morning** (8:00 - 12:00)
  - **Afternoon** (12:00 - 18:00)
  - **Evening** (18:00 - 23:00)
- Players check/uncheck blocks for that day
- Any player can view everyone's availability on any day
- Visual overlap indicator highlights when 4+ players share a slot

## Session Scheduling

- DM can propose a session on a specific day + time slot
- Proposed sessions show as a distinct marker on the calendar
- DM can confirm a proposed session (proposed -> confirmed)
- No hard locking — calendar stays fully browsable
- Players can always check availability to suggest pivots (agile group)

## Data Model

### players
| Column       | Type      | Notes                |
|-------------|-----------|----------------------|
| id          | uuid (PK) | Supabase auth.users  |
| email       | text      | unique               |
| display_name| text      |                      |
| is_dm       | boolean   | default false        |
| created_at  | timestamp |                      |

### availability
| Column     | Type      | Notes                          |
|-----------|-----------|--------------------------------|
| id        | uuid (PK) |                                |
| player_id | uuid (FK) | references players.id          |
| date      | date      |                                |
| slot      | enum      | morning / afternoon / evening  |
| created_at| timestamp |                                |

Unique constraint on (player_id, date, slot).

### sessions
| Column      | Type      | Notes                          |
|------------|-----------|--------------------------------|
| id         | uuid (PK) |                                |
| proposed_by| uuid (FK) | references players.id          |
| date       | date      |                                |
| slot       | enum      | morning / afternoon / evening  |
| status     | enum      | proposed / confirmed           |
| created_at | timestamp |                                |

## Pages

1. **/** — Calendar view (monthly grid default, weekly toggle)
2. **/day/[date]** — Day detail: all player availability, propose/confirm session (DM)
3. **/login** — Magic link login

## Key Decisions

- Preset slots over free-form time ranges (simpler UX)
- No hard session locking (group prefers agility)
- DM role is a DB flag, not a separate auth tier
- Overlap threshold at 4+ players for visual highlighting
