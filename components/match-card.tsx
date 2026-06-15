"use client"

import { useState, useTransition, useMemo, useEffect } from "react"
import Image from "next/image"
import { toast } from "sonner"
import type { Match } from "@/lib/worldcup-types"
import { savePrediction, getMatchPredictions } from "@/app/actions/predictions"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Check, Lock, Users, ChevronDown, ChevronUp, Loader2 } from "lucide-react"

type PredValue = { homeScore: number; awayScore: number; points: number | null }

function Flag({ src, alt }: { src: string; alt: string }) {
  if (!src) {
    return <span className="flex h-7 w-10 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">?</span>
  }
  return (
    <Image
      src={src || "/placeholder.svg"}
      alt={alt}
      width={40}
      height={28}
      className="h-7 w-10 rounded object-cover ring-1 ring-border"
      crossOrigin="anonymous"
      unoptimized
    />
  )
}

function PointsBadge({ points }: { points: number | null }) {
  if (points === null || points === undefined) return null
  if (points === 3)
    return <Badge className="bg-primary text-primary-foreground">+3 exacto</Badge>
  if (points === 1)
    return <Badge className="bg-accent text-accent-foreground">+1 resultado</Badge>
  return (
    <Badge variant="outline" className="text-muted-foreground">
      +0
    </Badge>
  )
}

export function MatchCard({ match, initial }: { match: Match; initial?: PredValue }) {
  const locked = match.finished || new Date(match.kickoff).getTime() <= Date.now()
  const [home, setHome] = useState<string>(initial ? String(initial.homeScore) : "")
  const [away, setAway] = useState<string>(initial ? String(initial.awayScore) : "")
  const [saved, setSaved] = useState<boolean>(!!initial)
  const [pending, startTransition] = useTransition()

  const [lastSaved, setLastSaved] = useState<{ home: string; away: string } | null>(
    initial ? { home: String(initial.homeScore), away: String(initial.awayScore) } : null
  )

  useEffect(() => {
    if (home === "" || away === "") return
    if (lastSaved && lastSaved.home === home && lastSaved.away === away) return

    setSaved(false)

    // ponytail: 800ms debounce avoids spamming savePrediction on every keystroke.
    // Ceiling: user exits page before timer fires. Upgrade: save on blur or beforeunload.
    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          await savePrediction({
            matchId: match.id,
            homeScore: Number(home),
            awayScore: Number(away),
          })
          setSaved(true)
          setLastSaved({ home, away })
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "No se pudo guardar")
        }
      })
    }, 800)

    return () => clearTimeout(timer)
  }, [home, away, match.id, lastSaved])

  const [showOthers, setShowOthers] = useState<boolean>(false)
  const [others, setOthers] = useState<{ userName: string; homeScore: number; awayScore: number; points: number | null }[]>([])
  const [loadingOthers, setLoadingOthers] = useState<boolean>(false)

  const toggleOthers = async () => {
    if (showOthers) {
      setShowOthers(false)
      return
    }
    if (others.length === 0) {
      setLoadingOthers(true)
      try {
        const res = await getMatchPredictions(match.id)
        setOthers(res)
        setShowOthers(true)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Error al cargar predicciones")
      } finally {
        setLoadingOthers(false)
      }
    } else {
      setShowOthers(true)
    }
  }

  const distribution = useMemo(() => {
    if (others.length === 0) return null
    let homeWins = 0
    let draws = 0
    let awayWins = 0
    for (const p of others) {
      if (p.homeScore > p.awayScore) homeWins++
      else if (p.homeScore === p.awayScore) draws++
      else awayWins++
    }
    const total = others.length
    return {
      homePct: total > 0 ? Math.round((homeWins / total) * 100) : 0,
      drawPct: total > 0 ? Math.round((draws / total) * 100) : 0,
      awayPct: total > 0 ? Math.round((awayWins / total) * 100) : 0,
      total,
    }
  }, [others])

  const kickoff = new Date(match.kickoff)
  const dateLabel = kickoff.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santiago",
  })

  const metaLabel =
    match.phase === "group"
      ? `${match.stage} · Grupo ${match.group} · ${dateLabel}`
      : `${match.stage} · ${dateLabel}`

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground">{metaLabel}</span>
        {locked ? (
          match.finished ? (
            <PointsBadge points={initial?.points ?? null} />
          ) : (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" /> Cerrado
            </span>
          )
        ) : pending ? (
          <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground animate-pulse">
            <Loader2 className="h-3 w-3 animate-spin text-primary" /> Guardando...
          </span>
        ) : saved ? (
          <span className="flex items-center gap-1 text-xs font-medium text-primary">
            <Check className="h-3 w-3" /> Guardada
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {/* Home */}
        <div className="flex items-center gap-2 min-w-0">
          <Flag src={match.homeFlag} alt={match.homeName} />
          <span className="truncate font-medium text-card-foreground">{match.homeName}</span>
        </div>

        {/* Score inputs */}
        <div className="flex items-center gap-2">
          <ScoreInput value={home} onChange={setHome} disabled={locked} ariaLabel={`Goles de ${match.homeName}`} />
          <span className="text-muted-foreground">-</span>
          <ScoreInput value={away} onChange={setAway} disabled={locked} ariaLabel={`Goles de ${match.awayName}`} />
        </div>

        {/* Away */}
        <div className="flex items-center justify-end gap-2 min-w-0">
          <span className="truncate text-right font-medium text-card-foreground">{match.awayName}</span>
          <Flag src={match.awayFlag} alt={match.awayName} />
        </div>
      </div>

      {locked && match.finished && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Resultado final: {match.homeScore} - {match.awayScore}
        </p>
      )}

      {locked && (
        <div className="mt-3 border-t border-border/60 pt-3">
          <button
            onClick={toggleOthers}
            disabled={loadingOthers}
            className="flex w-full items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {loadingOthers ? "Cargando predicciones..." : "Predicciones de la comunidad"}
            </span>
            {loadingOthers ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : showOthers ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {showOthers && others.length > 0 && (
            <div className="mt-3 space-y-3">
              {/* Distribution Progress Bar */}
              {distribution && distribution.total > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <span>Local ({distribution.homePct}%)</span>
                    <span>Empate ({distribution.drawPct}%)</span>
                    <span>Visita ({distribution.awayPct}%)</span>
                  </div>
                  <div className="flex h-2 overflow-hidden rounded-full bg-muted/60">
                    <div
                      style={{ width: `${distribution.homePct}%` }}
                      className="bg-emerald-500 transition-all"
                      title={`Local: ${distribution.homePct}%`}
                    />
                    <div
                      style={{ width: `${distribution.drawPct}%` }}
                      className="bg-amber-500 transition-all"
                      title={`Empate: ${distribution.drawPct}%`}
                    />
                    <div
                      style={{ width: `${distribution.awayPct}%` }}
                      className="bg-blue-500 transition-all"
                      title={`Visita: ${distribution.awayPct}%`}
                    />
                  </div>
                </div>
              )}

              {/* Individual predictions list */}
              <div className="max-h-36 overflow-y-auto rounded-lg border border-border/50 bg-secondary/15 divide-y divide-border/30 pr-1">
                {others.map((pred, idx) => (
                  <div key={idx} className="flex items-center justify-between px-2.5 py-1.5 text-xs">
                    <span className="font-medium text-muted-foreground truncate max-w-[120px]">
                      {pred.userName}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold tabular-nums text-foreground">
                        {pred.homeScore} - {pred.awayScore}
                      </span>
                      {pred.points !== null && (
                        <span
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider tabular-nums",
                            pred.points === 3
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : pred.points === 1
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          +{pred.points}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showOthers && others.length === 0 && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Nadie ha predicho este partido todavía.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function ScoreInput({
  value,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  ariaLabel: string
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={99}
      aria-label={ariaLabel}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
      className="h-11 w-11 rounded-lg border border-input bg-background text-center text-lg font-bold text-foreground tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
    />
  )
}
