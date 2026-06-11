import { redirect } from "next/navigation"
import { headers } from "next/headers"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { getProfileStats, syncPoints } from "@/app/actions/predictions"
import { SiteNav } from "@/components/site-nav"
import { Trophy, Target, TrendingUp, ListChecks, CheckCircle2, BarChart3 } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  await syncPoints()
  const stats = await getProfileStats()

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

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard icon={Trophy} label="Puntos totales" value={stats.totalPoints} highlight />
          <StatCard
            icon={TrendingUp}
            label="Posición"
            value={stats.totalPlayers ? `#${stats.rank} de ${stats.totalPlayers}` : "-"}
            highlight
          />
          <StatCard icon={Target} label="Aciertos exactos" value={stats.exact} />
          <StatCard icon={ListChecks} label="Predicciones" value={stats.predictions} />
          <StatCard icon={CheckCircle2} label="Partidos puntuados" value={stats.scored} />
          <StatCard icon={BarChart3} label="Resultado correcto" value={stats.correctResult} />
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
