// World Cup data layer — fetches from the free worldcup26.ir API (no key required)
// and normalizes the raw string-based payloads into typed objects.

import { teamNameEs, translateKnockoutLabel } from "@/lib/team-names-es"

const API_BASE = "https://worldcup26.ir/get"

export type Team = {
  id: string
  name: string
  flag: string
  fifaCode: string
  group: string
}

export type MatchPhase = "group" | "r32" | "r16" | "qf" | "sf" | "third" | "final"

export const PHASE_FILTERS: { value: MatchPhase | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "group", label: "Grupos" },
  { value: "r32", label: "Dieciseisavos" },
  { value: "r16", label: "Octavos" },
  { value: "qf", label: "Cuartos" },
  { value: "sf", label: "Semifinal" },
  { value: "third", label: "3.er puesto" },
  { value: "final", label: "Final" },
]

export type Match = {
  id: string
  group: string
  matchday: string
  type: string
  phase: MatchPhase
  stage: string
  homeTeamId: string
  awayTeamId: string
  homeName: string
  awayName: string
  homeFlag: string
  awayFlag: string
  homeScore: number | null
  awayScore: number | null
  finished: boolean
  kickoff: string // ISO string
  kickoffRaw: string
}

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
}

type RawTeam = {
  id: string
  name_en: string
  flag: string
  fifa_code: string
  groups: string
}

// Parse "06/11/2026 13:00" (MM/DD/YYYY HH:mm) into an ISO string.
function parseKickoff(raw: string): string {
  try {
    const [datePart, timePart = "00:00"] = raw.trim().split(" ")
    const [mm, dd, yyyy] = datePart.split("/").map(Number)
    const [hh, min] = timePart.split(":").map(Number)
    const d = new Date(Date.UTC(yyyy, mm - 1, dd, hh, min))
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

let teamsCache: Map<string, RawTeam> | null = null

async function getTeamsMap(): Promise<Map<string, RawTeam>> {
  if (teamsCache) return teamsCache
  const res = await fetch(`${API_BASE}/teams`, { next: { revalidate: 3600 } })
  if (!res.ok) throw new Error("No se pudieron cargar los equipos")
  const json = (await res.json()) as { teams: RawTeam[] }
  const map = new Map<string, RawTeam>()
  for (const t of json.teams) map.set(t.id, t)
  teamsCache = map
  return map
}

function resolveTeamName(
  team: RawTeam | undefined,
  nameEn?: string,
  label?: string,
): string {
  if (label) return translateKnockoutLabel(label)
  return teamNameEs(team?.fifa_code, nameEn ?? team?.name_en)
}

export async function getTeams(): Promise<Team[]> {
  const map = await getTeamsMap()
  return [...map.values()].map((t) => ({
    id: t.id,
    name: teamNameEs(t.fifa_code, t.name_en),
    flag: t.flag,
    fifaCode: t.fifa_code,
    group: t.groups,
  }))
}

export async function getMatches(): Promise<Match[]> {
  const [res, teams] = await Promise.all([
    fetch(`${API_BASE}/games`, { next: { revalidate: 120 } }),
    getTeamsMap(),
  ])
  if (!res.ok) throw new Error("No se pudieron cargar los partidos")
  const json = (await res.json()) as { games: RawGame[] }

  return json.games.map((g) => {
    const home = teams.get(g.home_team_id)
    const away = teams.get(g.away_team_id)
    const finished = String(g.finished).toUpperCase() === "TRUE"
    const phase = normalizePhase(g.type)
    return {
      id: g.id,
      group: g.group,
      matchday: g.matchday,
      type: g.type,
      phase,
      stage: stageLabel(g.type, g.matchday),
      homeTeamId: g.home_team_id,
      awayTeamId: g.away_team_id,
      homeName: resolveTeamName(home, g.home_team_name_en, g.home_team_label),
      awayName: resolveTeamName(away, g.away_team_name_en, g.away_team_label),
      homeFlag: home?.flag ?? "",
      awayFlag: away?.flag ?? "",
      homeScore: finished ? Number(g.home_score) : null,
      awayScore: finished ? Number(g.away_score) : null,
      finished,
      kickoff: parseKickoff(g.local_date),
      kickoffRaw: g.local_date,
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
