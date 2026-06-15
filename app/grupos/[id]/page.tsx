import { redirect } from "next/navigation"
import { headers } from "next/headers"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { getGroupDetails, getGroupLeaderboard } from "@/app/actions/groups"
import { SiteNav } from "@/components/site-nav"
import { GroupActionsSidebar } from "@/components/group-actions"
import { GroupComments } from "@/components/group-comments"
import { cn } from "@/lib/utils"
import { Trophy, Medal, ChevronLeft, Calendar } from "lucide-react"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function GroupDetailPage({ params }: PageProps) {
  const { id } = await params
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  const group = await getGroupDetails(id)
  if (!group) {
    // Group does not exist or user is not authorized to see it
    redirect("/grupos")
  }

  const board = await getGroupLeaderboard(id)
  const myId = session.user.id

  return (
    <div className="min-h-svh bg-background">
      <SiteNav userName={session.user.name} />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6">
          <Link
            href="/grupos"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground mb-3"
          >
            <ChevronLeft className="h-4 w-4" />
            Volver a Mis Grupos
          </Link>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="font-heading text-3xl font-bold uppercase tracking-tight text-foreground">
                {group.name}
              </h1>
              <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span>Creado por <span className="font-semibold text-foreground">{group.creatorName}</span></span>
                <span className="text-border hidden sm:inline">•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-primary" />
                  Creado el {new Date(group.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_320px]">
          {/* Private Leaderboard */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary">
                <Trophy className="h-4 w-4" />
              </span>
              <h2 className="font-heading text-xl font-bold uppercase tracking-wide text-foreground">
                Tabla del Grupo
              </h2>
            </div>

            {board.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card py-12 text-center text-sm text-muted-foreground">
                No hay jugadores en la tabla todavía.
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
              <br />
              <span className="mt-1 inline-block text-[11px] font-medium text-primary/80">
                * Solo se computan predicciones de partidos iniciados después de la creación del grupo.
              </span>
            </p>

            <div className="mt-8">
              <GroupComments
                groupId={group.id}
                comments={group.comments || []}
                currentUserId={myId}
                creatorId={group.creatorId}
              />
            </div>
          </div>

          {/* Management Sidebar */}
          <div>
            <GroupActionsSidebar
              groupId={group.id}
              inviteCode={group.inviteCode}
              creatorId={group.creatorId}
              currentUserId={myId}
              members={group.members}
            />
          </div>
        </div>
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
