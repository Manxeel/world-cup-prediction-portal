// Types and constants shared between server and client code.
// ponytail: extracted so client components don't pull in the DB module.

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

export type Team = {
  id: string
  name: string
  flag: string
  fifaCode: string
  group: string
}

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
