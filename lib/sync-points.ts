import { db } from "@/lib/db"
import { sql } from "drizzle-orm"

/** Recalculate points for all finished matches. Idempotent — safe to call often. */
export async function syncPoints(): Promise<{ updated: number }> {
  try {
    // ponytail: Perform single SQL update to calculate scores on the DB engine
    // instead of looping and making N roundtrips.
    const result = await db.execute(sql`
      UPDATE prediction
      SET points = CASE
        -- Exact score match
        WHEN prediction."homeScore" = match."homeScore" AND prediction."awayScore" = match."awayScore" THEN 3
        -- Same outcome (win/lose/draw)
        WHEN sign(prediction."homeScore" - prediction."awayScore") = sign(match."homeScore" - match."awayScore") THEN 1
        -- Wrong prediction
        ELSE 0
      END
      FROM match
      WHERE prediction."matchId" = match.id
        AND match.finished = true
        AND match."homeScore" IS NOT NULL
        AND match."awayScore" IS NOT NULL
        AND (
          prediction.points IS NULL 
          OR prediction.points != CASE
            WHEN prediction."homeScore" = match."homeScore" AND prediction."awayScore" = match."awayScore" THEN 3
            WHEN sign(prediction."homeScore" - prediction."awayScore") = sign(match."homeScore" - match."awayScore") THEN 1
            ELSE 0
          END
        )
    `)

    const updated = result.rowCount ?? 0
    return { updated }
  } catch (err) {
    console.error("Failed to sync points:", err)
    return { updated: 0 }
  }
}
