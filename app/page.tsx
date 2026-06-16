import { redirect } from "next/navigation"
import { headers, cookies } from "next/headers"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { getMatches, type Match } from "@/lib/worldcup"
import { getMyPredictions, getProfileStats } from "@/app/actions/predictions"
import { SiteNav } from "@/components/site-nav"
import { PredictionsList } from "@/components/predictions-list"
import { Trophy, Target, TrendingUp } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  // ponytail: Auto-redirect if there is a pending group invitation code stored in a cookie
  const cookieStore = await cookies()
  const pendingCode = cookieStore.get("pending_join_code")?.value
  if (pendingCode) {
    cookieStore.delete("pending_join_code")
    redirect(`/grupos/join?code=${pendingCode}`)
  }

  let matches: Match[] = []
  let loadError = false
  try {
    matches = await getMatches()
  } catch {
    loadError = true
  }

  const [predictions, stats] = await Promise.all([getMyPredictions(), getProfileStats()])

  const now = Date.now()
  const santiagoToday = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Santiago",
  }).format(new Date(now))

  const unpredictedCount = matches.filter((m) => {
    if (m.finished) return false
    const matchTime = new Date(m.kickoff)
    if (matchTime.getTime() <= now) return false
    if (predictions[m.id]) return false

    const matchDayStr = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "America/Santiago",
    }).format(matchTime)

    return matchDayStr === santiagoToday
  }).length

  return (
    <div className="min-h-svh bg-background">
      <SiteNav userName={session.user.name} />

      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">Mundial 2026</p>
          <h1 className="mt-1 font-heading text-4xl font-bold uppercase tracking-tight text-card-foreground text-balance md:text-5xl">
            Hola, {session.user.name.split(" ")[0]}. Predice y compite.
          </h1>
          <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">
            Acierta el marcador exacto para ganar <strong className="text-foreground">3 puntos</strong>, o
            solo el resultado para sumar <strong className="text-foreground">1 punto</strong>. Las
            predicciones se cierran al iniciar cada partido.
          </p>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <StatTile icon={Trophy} label="Puntos" value={stats.totalPoints} />
            <StatTile icon={TrendingUp} label="Posición" value={stats.totalPlayers ? `#${stats.rank}` : "-"} />
            <StatTile icon={Target} label="Aciertos exactos" value={stats.exact} />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {unpredictedCount > 0 && !loadError && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 flex items-center justify-between dark:border-amber-500/20 dark:bg-amber-500/10">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              ⚡ Tienes {unpredictedCount} partido{unpredictedCount === 1 ? "" : "s"} de hoy sin predicción
            </p>
            <a href="#partidos" className="text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors dark:text-amber-400 dark:hover:text-amber-300 underline underline-offset-4">
              Predice ahora ↓
            </a>
          </div>
        )}
        {loadError ? (
          <div className="rounded-xl border border-dashed border-destructive/40 bg-card py-12 text-center">
            <p className="font-medium text-foreground">No pudimos cargar los partidos</p>
            <p className="mt-1 text-sm text-muted-foreground">
              El servicio de datos del Mundial no está disponible en este momento. Inténtalo de nuevo más
              tarde.
            </p>
          </div>
        ) : (
          <>
            <div id="partidos" className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-2xl font-bold uppercase tracking-wide text-foreground">
                Partidos
              </h2>
              <Link href="/tabla" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                Ver tabla de posiciones
              </Link>
            </div>
            <PredictionsList matches={matches} predictions={predictions} />
          </>
        )}
      </main>
    </div>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-2 font-heading text-2xl font-bold tabular-nums text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
