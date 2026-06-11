import { db } from "@/lib/db"
import { prediction } from "@/lib/db/schema"
import { computePoints, getMatchesById } from "@/lib/worldcup"
import { eq } from "drizzle-orm"

/** Recalculate points for all finished matches. Idempotent — safe to call often. */
export async function syncPoints(): Promise<{ updated: number }> {
  const matches = await getMatchesById()
  const rows = await db.select().from(prediction)
  let updated = 0

  for (const r of rows) {
    const match = matches.get(r.matchId)
    if (!match || !match.finished || match.homeScore === null || match.awayScore === null) {
      continue
    }
    const pts = computePoints(
      { homeScore: r.homeScore, awayScore: r.awayScore },
      { homeScore: match.homeScore, awayScore: match.awayScore },
    )
    if (r.points !== pts) {
      await db.update(prediction).set({ points: pts }).where(eq(prediction.id, r.id))
      updated++
    }
  }

  return { updated }
}
