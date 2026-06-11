import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getLeaderboard, syncPoints } from "@/app/actions/predictions"
import { SiteNav } from "@/components/site-nav"
import { cn } from "@/lib/utils"
import { Trophy, Medal } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function LeaderboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  await syncPoints()
  const board = await getLeaderboard()
  const myId = session.user.id

  return (
    <div className="min-h-svh bg-background">
      <SiteNav userName={session.user.name} />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Trophy className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-heading text-3xl font-bold uppercase tracking-tight text-foreground">
              Tabla de posiciones
            </h1>
            <p className="text-sm text-muted-foreground">
              {board.length} {board.length === 1 ? "jugador" : "jugadores"} compitiendo
            </p>
          </div>
        </div>

        {board.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card py-12 text-center text-sm text-muted-foreground">
            Aún no hay jugadores. ¡Sé el primero en predecir!
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="grid grid-cols-[3rem_1fr_4rem_4rem_4rem] gap-2 border-b border-border bg-secondary/50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>#</span>
              <span>Jugador</span>
              <span className="text-center">PJ</span>
              <span className="text-center">Exac.</span>
              <span className="text-right">Pts</span>
            </div>
            <ul>
              {board.map((row, i) => {
                const rank = i + 1
                const isMe = row.userId === myId
                return (
                  <li
                    key={row.userId}
                    className={cn(
                      "grid grid-cols-[3rem_1fr_4rem_4rem_4rem] items-center gap-2 border-b border-border px-4 py-3 last:border-0",
                      isMe && "bg-primary/5",
                    )}
                  >
                    <span className="flex items-center">
                      <RankBadge rank={rank} />
                    </span>
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold uppercase text-secondary-foreground">
                        {row.name.slice(0, 2)}
                      </span>
                      <span className="truncate font-medium text-card-foreground">
                        {row.name}
                        {isMe && <span className="ml-1 text-xs font-normal text-primary">(tú)</span>}
                      </span>
                    </span>
                    <span className="text-center text-sm tabular-nums text-muted-foreground">
                      {row.predictions}
                    </span>
                    <span className="text-center text-sm tabular-nums text-muted-foreground">{row.exact}</span>
                    <span className="text-right font-heading text-lg font-bold tabular-nums text-foreground">
                      {row.totalPoints}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <p className="mt-4 text-center text-xs text-muted-foreground">
          PJ = predicciones jugadas · Exac. = marcadores exactos · Pts = puntos totales
        </p>
      </main>
    </div>
  )
}

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    const colors = {
      1: "bg-accent text-accent-foreground",
      2: "bg-muted-foreground/20 text-foreground",
      3: "bg-[oklch(0.65_0.13_50)] text-white",
    } as const
    return (
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold tabular-nums",
          colors[rank as 1 | 2 | 3],
        )}
      >
        {rank === 1 ? <Medal className="h-4 w-4" /> : rank}
      </span>
    )
  }
  return <span className="pl-2 text-sm font-medium tabular-nums text-muted-foreground">{rank}</span>
}
