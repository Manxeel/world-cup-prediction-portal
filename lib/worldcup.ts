// World Cup data layer — reads from the local DB with auto-refresh from
// the worldcup26.ir API when data is stale (>2 min). No API key required.

import { db } from "@/lib/db"
import { team as teamTable, match as matchTable } from "@/lib/db/schema"
import { teamNameEs, translateKnockoutLabel } from "@/lib/team-names-es"
import { desc, sql } from "drizzle-orm"

// Re-export client-safe types/constants so existing `from "@/lib/worldcup"` imports
// in server code keep working.
export { PHASE_FILTERS } from "@/lib/worldcup-types"
export type { Team, Match, MatchPhase } from "@/lib/worldcup-types"
import type { Team, Match, MatchPhase } from "@/lib/worldcup-types"

const API_BASE = "https://worldcup26.ir/get"

// ponytail: 2-min staleness window — first visitor after this refreshes from API
const SYNC_STALE_MS = 2 * 60 * 1000

type RawGame = {
  id: string
  home_team_id: string
  away_team_id: string
  home_score: string
  away_score: string
  group: string
  matchday: string
  local_date: string
  finished: string
  type: string
  home_team_name_en?: string
  away_team_name_en?: string
  home_team_label?: string
  away_team_label?: string
  stadium_id?: string
}

type RawTeam = {
  id: string
  name_en: string
  flag: string
  fifa_code: string
  groups: string
}

const STADIUM_TIMEZONES: Record<string, string> = {
  "1": "America/Mexico_City",   // Estadio Azteca
  "2": "America/Mexico_City",   // Estadio Akron (Guadalajara)
  "3": "America/Monterrey",     // Estadio BBVA
  "4": "America/Chicago",       // AT&T Stadium (Dallas)
  "5": "America/Chicago",       // NRG Stadium (Houston)
  "6": "America/Chicago",       // GEHA Field at Arrowhead Stadium (Kansas City)
  "7": "America/New_York",      // Mercedes-Benz Stadium (Atlanta)
  "8": "America/New_York",      // Hard Rock Stadium (Miami)
  "9": "America/New_York",      // Gillette Stadium (Boston)
  "10": "America/New_York",     // Lincoln Financial Field (Philadelphia)
  "11": "America/New_York",     // MetLife Stadium (New York)
  "12": "America/Toronto",      // BMO Field (Toronto)
  "13": "America/Vancouver",    // BC Place (Vancouver)
  "14": "America/Los_Angeles",  // Lumen Field (Seattle)
  "15": "America/Los_Angeles",  // Levi's Stadium (San Francisco)
  "16": "America/Los_Angeles",  // SoFi Stadium (Los Angeles)
}

function getOffsetAtTime(utcMs: number, timezone: string): number {
  const d = new Date(utcMs)
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(d)
  
  const partVal = (type: string) => Number(parts.find(p => p.type === type)?.value)
  
  const year = partVal("year")
  const month = partVal("month")
  const day = partVal("day")
  let hour = partVal("hour")
  if (hour === 24) hour = 0
  const minute = partVal("minute")
  const second = partVal("second")
  
  return Date.UTC(year, month - 1, day, hour, minute, second) - utcMs
}

// Parse "06/11/2026 13:00" (MM/DD/YYYY HH:mm) in stadium timezone into an ISO string.
function parseKickoff(raw: string, stadiumId?: string): string {
  try {
    const [datePart, timePart = "00:00"] = raw.trim().split(" ")
    const [mm, dd, yyyy] = datePart.split("/").map(Number)
    const [hh, min] = timePart.split(":").map(Number)
    
    const targetLocalMs = Date.UTC(yyyy, mm - 1, dd, hh, min)
    const timezone = (stadiumId && STADIUM_TIMEZONES[stadiumId]) || "UTC"
    
    let utcGuess = targetLocalMs
    for (let i = 0; i < 2; i++) {
      const offset = getOffsetAtTime(utcGuess, timezone)
      utcGuess = targetLocalMs - offset
    }
    
    const d = new Date(utcGuess)
    if (Number.isNaN(d.getTime())) return new Date().toISOString()
    return d.toISOString()
  } catch {
    return new Date().toISOString()
  }
}

export function normalizePhase(type: string): MatchPhase {
  switch (type) {
    case "group":
      return "group"
    case "r32":
    case "round_of_32":
      return "r32"
    case "r16":
    case "round_of_16":
      return "r16"
    case "qf":
    case "quarter":
    case "quarter_final":
      return "qf"
    case "sf":
    case "semi":
    case "semi_final":
      return "sf"
    case "third":
    case "third_place":
      return "third"
    case "final":
      return "final"
    default:
      return "group"
  }
}

function stageLabel(type: string, matchday: string): string {
  switch (normalizePhase(type)) {
    case "group":
      return `Fase de grupos · Jornada ${matchday}`
    case "r32":
      return "Dieciseisavos de final"
    case "r16":
      return "Octavos de final"
    case "qf":
      return "Cuartos de final"
    case "sf":
      return "Semifinal"
    case "third":
      return "Tercer puesto"
    case "final":
      return "Final"
  }
}

function resolveTeamName(
  teamRow: { fifaCode: string; nameEn: string } | undefined,
  label?: string | null,
): string {
  if (label) return translateKnockoutLabel(label)
  return teamNameEs(teamRow?.fifaCode, teamRow?.nameEn)
}

// ---- API fetch + DB sync ----

/** Fetch teams and matches from the external API and upsert into DB. */
export async function syncMatchesFromAPI(): Promise<{ teams: number; matches: number }> {
  const [teamsRes, gamesRes] = await Promise.all([
    fetch(`${API_BASE}/teams`, { cache: "no-store" }),
    fetch(`${API_BASE}/games`, { cache: "no-store" }),
  ])
  if (!teamsRes.ok || !gamesRes.ok) throw new Error("API fetch failed")

  const teamsJson = (await teamsRes.json()) as { teams: RawTeam[] }
  const gamesJson = (await gamesRes.json()) as { games: RawGame[] }

  // Upsert teams
  for (const t of teamsJson.teams) {
    await db
      .insert(teamTable)
      .values({
        id: t.id,
        nameEn: t.name_en,
        flag: t.flag,
        fifaCode: t.fifa_code,
        groupLetter: t.groups,
      })
      .onConflictDoUpdate({
        target: teamTable.id,
        set: {
          nameEn: t.name_en,
          flag: t.flag,
          fifaCode: t.fifa_code,
          groupLetter: t.groups,
        },
      })
  }

  // Upsert matches
  const now = new Date()
  for (const g of gamesJson.games) {
    const finished = String(g.finished).toUpperCase() === "TRUE"
    await db
      .insert(matchTable)
      .values({
        id: g.id,
        groupLetter: g.group,
        matchday: g.matchday,
        type: g.type,
        homeTeamId: g.home_team_id,
        awayTeamId: g.away_team_id,
        homeScore: finished ? Number(g.home_score) : null,
        awayScore: finished ? Number(g.away_score) : null,
        finished,
        kickoff: parseKickoff(g.local_date, g.stadium_id),
        kickoffRaw: g.local_date,
        stadiumId: g.stadium_id ?? null,
        homeTeamLabel: g.home_team_label ?? null,
        awayTeamLabel: g.away_team_label ?? null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: matchTable.id,
        set: {
          groupLetter: g.group,
          matchday: g.matchday,
          type: g.type,
          homeTeamId: g.home_team_id,
          awayTeamId: g.away_team_id,
          homeScore: finished ? Number(g.home_score) : null,
          awayScore: finished ? Number(g.away_score) : null,
          finished,
          kickoff: parseKickoff(g.local_date, g.stadium_id),
          kickoffRaw: g.local_date,
          stadiumId: g.stadium_id ?? null,
          homeTeamLabel: g.home_team_label ?? null,
          awayTeamLabel: g.away_team_label ?? null,
          updatedAt: now,
        },
      })
  }

  return { teams: teamsJson.teams.length, matches: gamesJson.games.length }
}

// ---- Throttled sync: only hits API if DB data is stale ----

async function syncIfStale(): Promise<void> {
  const [latest] = await db
    .select({ updatedAt: matchTable.updatedAt })
    .from(matchTable)
    .orderBy(desc(matchTable.updatedAt))
    .limit(1)

  const age = latest ? Date.now() - latest.updatedAt.getTime() : Infinity
  if (age > SYNC_STALE_MS) {
    try {
      await syncMatchesFromAPI()
    } catch (err) {
      // ponytail: if API is down but we have DB data, swallow the error
      if (latest) {
        console.warn("API sync failed, using existing DB data:", err)
      } else {
        throw err
      }
    }
  }
}

// ---- Public API (same signatures as before) ----

export async function getTeams(): Promise<Team[]> {
  await syncIfStale()
  const rows = await db.select().from(teamTable)
  return rows.map((t) => ({
    id: t.id,
    name: teamNameEs(t.fifaCode, t.nameEn),
    flag: t.flag,
    fifaCode: t.fifaCode,
    group: t.groupLetter,
  }))
}

export async function getMatches(): Promise<Match[]> {
  await syncIfStale()

  const [matchRows, teamRows] = await Promise.all([
    db.select().from(matchTable),
    db.select().from(teamTable),
  ])

  const teams = new Map(teamRows.map((t) => [t.id, t]))

  return matchRows.map((m) => {
    const home = teams.get(m.homeTeamId)
    const away = teams.get(m.awayTeamId)
    const phase = normalizePhase(m.type)
    return {
      id: m.id,
      group: m.groupLetter,
      matchday: m.matchday,
      type: m.type,
      phase,
      stage: stageLabel(m.type, m.matchday),
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      homeName: resolveTeamName(home, m.homeTeamLabel),
      awayName: resolveTeamName(away, m.awayTeamLabel),
      homeFlag: home?.flag ?? "",
      awayFlag: away?.flag ?? "",
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      finished: m.finished,
      kickoff: m.kickoff,
      kickoffRaw: m.kickoffRaw,
    }
  })
}

export async function getMatchesById(): Promise<Map<string, Match>> {
  const matches = await getMatches()
  const map = new Map<string, Match>()
  for (const m of matches) map.set(m.id, m)
  return map
}

// ---- Scoring: 3 points for exact score, 1 point for correct result (W/D/L) ----
export function computePoints(
  pred: { homeScore: number; awayScore: number },
  actual: { homeScore: number; awayScore: number },
): number {
  if (pred.homeScore === actual.homeScore && pred.awayScore === actual.awayScore) {
    return 3
  }
  const predOutcome = Math.sign(pred.homeScore - pred.awayScore)
  const actualOutcome = Math.sign(actual.homeScore - actual.awayScore)
  if (predOutcome === actualOutcome) return 1
  return 0
}
