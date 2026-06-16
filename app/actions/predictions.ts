"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { prediction, user } from "@/lib/db/schema"
import { syncPoints as runSyncPoints } from "@/lib/sync-points"
import { getMatches, getMatchesById } from "@/lib/worldcup"
import { and, eq, sql } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("No autorizado")
  return session.user.id
}

export async function getMyPredictions() {
  const userId = await getUserId()
  const rows = await db.select().from(prediction).where(eq(prediction.userId, userId))
  const map: Record<string, { homeScore: number; awayScore: number; points: number | null }> = {}
  for (const r of rows) {
    map[r.matchId] = { homeScore: r.homeScore, awayScore: r.awayScore, points: r.points }
  }
  return map
}

export async function savePrediction(input: {
  matchId: string
  homeScore: number
  awayScore: number
}) {
  const userId = await getUserId()

  // Guard: cannot predict a match that already kicked off / finished.
  const matches = await getMatchesById()
  const match = matches.get(input.matchId)
  if (!match) throw new Error("Partido no encontrado")
  if (match.finished || new Date(match.kickoff).getTime() <= Date.now()) {
    throw new Error("Este partido ya comenzó, no puedes predecirlo")
  }

  const home = Math.max(0, Math.min(99, Math.trunc(input.homeScore)))
  const away = Math.max(0, Math.min(99, Math.trunc(input.awayScore)))

  await db
    .insert(prediction)
    .values({ userId, matchId: input.matchId, homeScore: home, awayScore: away })
    .onConflictDoUpdate({
      target: [prediction.userId, prediction.matchId],
      set: { homeScore: home, awayScore: away, updatedAt: new Date() },
    })

  revalidatePath("/")
  revalidatePath("/perfil")
  return { ok: true }
}

export async function syncPoints() {
  return runSyncPoints()
}

export type LeaderboardRow = {
  userId: string
  name: string
  totalPoints: number
  predictions: number
  exact: number
}

export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const rows = await db
    .select({
      userId: user.id,
      name: user.name,
      totalPoints: sql<number>`coalesce(sum(${prediction.points}), 0)`.mapWith(Number),
      predictions: sql<number>`count(${prediction.id})`.mapWith(Number),
      exact: sql<number>`coalesce(sum(case when ${prediction.points} = 3 then 1 else 0 end), 0)`.mapWith(Number),
    })
    .from(user)
    .leftJoin(prediction, eq(prediction.userId, user.id))
    .groupBy(user.id, user.name)
    .orderBy(sql`coalesce(sum(${prediction.points}), 0) desc`)

  return rows
}

export type ProfileStats = {
  totalPoints: number
  predictions: number
  scored: number
  exact: number
  correctResult: number
  rank: number
  totalPlayers: number
  currentStreak: number
  bestStreak: number
}

export async function getProfileStats(): Promise<ProfileStats> {
  const userId = await getUserId()
  const board = await getLeaderboard()
  const idx = board.findIndex((r) => r.userId === userId)
  const me = board[idx]

  const myRows = await db
    .select()
    .from(prediction)
    .where(and(eq(prediction.userId, userId)))

  const scored = myRows.filter((r) => r.points !== null).length
  const exact = myRows.filter((r) => r.points === 3).length
  const correctResult = myRows.filter((r) => r.points === 1).length

  // Compute streaks from scored predictions sorted by kickoff
  const matchMap = await getMatchesById()
  const scoredRows = myRows
    .filter((r) => r.points !== null)
    .sort((a, b) => {
      const ka = matchMap.get(a.matchId)?.kickoff ?? ""
      const kb = matchMap.get(b.matchId)?.kickoff ?? ""
      return ka.localeCompare(kb)
    })

  let currentStreak = 0
  let bestStreak = 0
  let streak = 0
  for (const r of scoredRows) {
    if (r.points! > 0) {
      streak++
      if (streak > bestStreak) bestStreak = streak
    } else {
      streak = 0
    }
  }
  currentStreak = streak

  return {
    totalPoints: me?.totalPoints ?? 0,
    predictions: myRows.length,
    scored,
    exact,
    correctResult,
    rank: idx >= 0 ? idx + 1 : board.length + 1,
    totalPlayers: board.length,
    currentStreak,
    bestStreak,
  }
}

export async function getMatchPredictions(matchId: string) {
  const matches = await getMatchesById()
  const match = matches.get(matchId)
  if (!match) throw new Error("Partido no encontrado")
  const locked = match.finished || new Date(match.kickoff).getTime() <= Date.now()
  if (!locked) {
    throw new Error("No puedes ver las predicciones de otros jugadores hasta que el partido comience o finalice")
  }

  const rows = await db
    .select({
      userName: user.name,
      homeScore: prediction.homeScore,
      awayScore: prediction.awayScore,
      points: prediction.points,
    })
    .from(prediction)
    .innerJoin(user, eq(prediction.userId, user.id))
    .where(eq(prediction.matchId, matchId))
    .orderBy(sql`coalesce(${prediction.points}, 0) desc, ${user.name} asc`)

  return rows
}

export type PredictionHistoryRow = {
  matchId: string
  homeName: string
  awayName: string
  homeFlag: string
  awayFlag: string
  kickoff: string
  finished: boolean
  predHome: number
  predAway: number
  actualHome: number | null
  actualAway: number | null
  points: number | null
}

export async function getMyPredictionHistory(): Promise<PredictionHistoryRow[]> {
  const userId = await getUserId()
  const rows = await db.select().from(prediction).where(eq(prediction.userId, userId))
  const matches = await getMatches()
  const matchMap = new Map(matches.map((m) => [m.id, m]))

  return rows
    .map((r): PredictionHistoryRow | null => {
      const m = matchMap.get(r.matchId)
      if (!m || !m.finished) return null
      return {
        matchId: r.matchId,
        homeName: m.homeName,
        awayName: m.awayName,
        homeFlag: m.homeFlag,
        awayFlag: m.awayFlag,
        kickoff: m.kickoff,
        finished: m.finished,
        predHome: r.homeScore,
        predAway: r.awayScore,
        actualHome: m.homeScore,
        actualAway: m.awayScore,
        points: r.points,
      }
    })
    .filter((r): r is PredictionHistoryRow => r !== null)
    .sort((a, b) => b.kickoff.localeCompare(a.kickoff))
}
