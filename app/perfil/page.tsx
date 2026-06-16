import { redirect } from "next/navigation"
import { headers } from "next/headers"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { getProfileStats, getMyPredictionHistory } from "@/app/actions/predictions"
import { SiteNav } from "@/components/site-nav"
import { Trophy, Target, TrendingUp, ListChecks, CheckCircle2, BarChart3, Percent, Sparkles, Flame, Award } from "lucide-react"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  const stats = await getProfileStats()
  const history = await getMyPredictionHistory()

  const radius = 40
  const circumference = 2 * Math.PI * radius // 251.327
  const totalScored = stats.scored
  const exactCount = stats.exact
  const correctCount = stats.correctResult
  const missedCount = Math.max(0, totalScored - exactCount - correctCount)

  const exactPct = totalScored > 0 ? exactCount / totalScored : 0
  const correctPct = totalScored > 0 ? correctCount / totalScored : 0
  const missedPct = totalScored > 0 ? missedCount / totalScored : 0

  const exactLength = exactPct * circumference
  const correctLength = correctPct * circumference
  const missedLength = missedPct * circumference

  const exactOffset = 0
  const correctOffset = -exactLength
  const missedOffset = -(exactLength + correctLength)

  const successRate = totalScored > 0 ? Math.round(((exactCount + correctCount) / totalScored) * 100) : 0
  const avgPoints = totalScored > 0 ? (stats.totalPoints / totalScored).toFixed(2) : "0.00"

  return (
    <div className="min-h-svh bg-background">
      <SiteNav userName={session.user.name} />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold uppercase text-primary-foreground">
            {session.user.name.slice(0, 2)}
          </span>
          <div>
            <h1 className="font-heading text-3xl font-bold uppercase tracking-tight text-foreground">
              {session.user.name}
            </h1>
            <p className="text-sm text-muted-foreground">{session.user.email}</p>
          </div>
        </div>

        {/* Visual Stats Section */}
        <div className="mb-6">
          <div className="flex flex-col gap-6 md:flex-row">
            {/* Donut Chart Card */}
            <div className="flex-1 rounded-xl border border-border bg-card p-6 flex flex-col items-center justify-center md:flex-row md:items-start md:justify-around gap-6">
              {/* Circular SVG Donut Chart */}
              <div className="relative flex h-40 w-40 shrink-0 items-center justify-center">
                <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
                  {/* Background track circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    className="stroke-muted/20"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  {totalScored === 0 ? (
                    // Empty state circle
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      className="stroke-muted"
                      strokeWidth="10"
                      fill="transparent"
                    />
                  ) : (
                    <>
                      {/* Missed Segment */}
                      <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        className="stroke-muted-foreground/30 transition-all duration-500 ease-out"
                        strokeWidth="10"
                        fill="transparent"
                        strokeDasharray={`${missedLength} ${circumference}`}
                        strokeDashoffset={missedOffset}
                      />
                      {/* Correct Result Segment */}
                      <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        className="stroke-blue-500 transition-all duration-500 ease-out"
                        strokeWidth="10"
                        fill="transparent"
                        strokeDasharray={`${correctLength} ${circumference}`}
                        strokeDashoffset={correctOffset}
                      />
                      {/* Exact Segment */}
                      <circle
                        cx="50"
                        cy="50"
                        r={radius}
                        className="stroke-primary transition-all duration-500 ease-out"
                        strokeWidth="10"
                        fill="transparent"
                        strokeDasharray={`${exactLength} ${circumference}`}
                        strokeDashoffset={exactOffset}
                      />
                    </>
                  )}
                </svg>
                {/* Centered Stats text */}
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-black tracking-tight text-foreground tabular-nums">
                    {successRate}%
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                    Efectividad
                  </span>
                </div>
              </div>

              {/* Donut Chart Legend / Info */}
              <div className="flex flex-col justify-center gap-2.5 w-full max-w-[240px]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Distribución de Aciertos
                </h3>
                <div className="space-y-2">
                  <LegendRow
                    color="bg-primary"
                    label="Marcador Exacto (+3)"
                    count={exactCount}
                    pct={Math.round(exactPct * 100)}
                  />
                  <LegendRow
                    color="bg-blue-500"
                    label="Resultado Correcto (+1)"
                    count={correctCount}
                    pct={Math.round(correctPct * 100)}
                  />
                  <LegendRow
                    color="bg-muted-foreground/30"
                    label="Pronóstico Fallido (+0)"
                    count={missedCount}
                    pct={Math.round(missedPct * 100)}
                  />
                </div>
                <div className="border-t border-border/60 pt-2 text-[10px] text-muted-foreground">
                  Calculado sobre <strong className="text-foreground">{totalScored}</strong> partidos con resultado finalizado.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grid cards of stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={Trophy} label="Puntos totales" value={stats.totalPoints} highlight />
          <StatCard
            icon={TrendingUp}
            label="Posición"
            value={stats.totalPlayers ? `#${stats.rank} de ${stats.totalPlayers}` : "-"}
            highlight
          />
          <StatCard icon={Percent} label="Tasa de efectividad" value={`${successRate}%`} />
          <StatCard icon={Sparkles} label="Promedio de puntos" value={`${avgPoints} pts`} />
          <StatCard icon={Target} label="Aciertos exactos" value={stats.exact} />
          <StatCard icon={BarChart3} label="Resultado correcto" value={stats.correctResult} />
          <StatCard icon={CheckCircle2} label="Partidos puntuados" value={stats.scored} />
          <StatCard icon={ListChecks} label="Predicciones hechas" value={stats.predictions} />
          <StatCard icon={Flame} label="Racha actual" value={stats.currentStreak} />
          <StatCard icon={Award} label="Mejor racha" value={stats.bestStreak} />
        </div>

        <div className="mt-8 rounded-xl border border-border bg-card p-5">
          <h2 className="font-heading text-lg font-bold uppercase tracking-wide text-card-foreground">
            Cómo se calculan los puntos
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <strong className="text-foreground">3 puntos</strong> — marcador exacto (goles local y visitante)
            </li>
            <li>
              <strong className="text-foreground">1 punto</strong> — resultado correcto (victoria, empate o derrota)
            </li>
            <li>
              <strong className="text-foreground">0 puntos</strong> — predicción incorrecta
            </li>
          </ul>
        </div>

        {history.length > 0 && (
          <div className="mt-6 rounded-xl border border-border bg-card p-5">
            <h2 className="font-heading text-lg font-bold uppercase tracking-wide text-card-foreground mb-4">
              Historial de predicciones
            </h2>
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.matchId} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{h.homeName}</span>
                    <span className="text-muted-foreground">vs</span>
                    <span className="truncate">{h.awayName}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <div className="text-xs text-muted-foreground">
                      <span>Tu: {h.predHome}-{h.predAway}</span>
                      <span className="mx-1">·</span>
                      <span>Real: {h.actualHome}-{h.actualAway}</span>
                    </div>
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
                      h.points === 3 ? "bg-primary/15 text-primary" :
                      h.points === 1 ? "bg-blue-500/15 text-blue-500" :
                      "bg-muted text-muted-foreground"
                    )}>
                      +{h.points ?? 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Hacer predicciones
          </Link>
          <Link
            href="/tabla"
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Ver tabla de posiciones
          </Link>
        </div>
      </main>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  highlight?: boolean
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-xl border border-primary/30 bg-primary/5 p-4"
          : "rounded-xl border border-border bg-card p-4"
      }
    >
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-2 font-heading text-2xl font-bold tabular-nums text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function LegendRow({
  color,
  label,
  count,
  pct,
}: {
  color: string
  label: string
  count: number
  pct: number
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-2">
        <span className={cn("h-3 w-3 rounded-full shrink-0", color)} />
        <span className="font-medium text-card-foreground">{label}</span>
      </div>
      <div className="flex gap-1.5 font-bold">
        <span className="text-foreground tabular-nums">{count}</span>
        <span className="text-muted-foreground/70">({pct}%)</span>
      </div>
    </div>
  )
}
