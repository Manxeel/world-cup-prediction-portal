"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { prediction, user } from "@/lib/db/schema"
import { syncPoints as runSyncPoints } from "@/lib/sync-points"
import { getMatchesById } from "@/lib/worldcup"
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

  return {
    totalPoints: me?.totalPoints ?? 0,
    predictions: myRows.length,
    scored,
    exact,
    correctResult,
    rank: idx >= 0 ? idx + 1 : board.length + 1,
    totalPlayers: board.length,
  }
}
