"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import { toast } from "sonner"
import type { Match } from "@/lib/worldcup"
import { savePrediction } from "@/app/actions/predictions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Check, Lock } from "lucide-react"

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

  const kickoff = new Date(match.kickoff)
  const dateLabel = kickoff.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })

  const metaLabel =
    match.phase === "group"
      ? `${match.stage} · Grupo ${match.group} · ${dateLabel}`
      : `${match.stage} · ${dateLabel}`

  const handleSave = () => {
    if (home === "" || away === "") {
      toast.error("Ingresa ambos marcadores")
      return
    }
    startTransition(async () => {
      try {
        await savePrediction({
          matchId: match.id,
          homeScore: Number(home),
          awayScore: Number(away),
        })
        setSaved(true)
        toast.success("Predicción guardada")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo guardar")
      }
    })
  }

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

      {!locked && (
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={handleSave} disabled={pending} className={cn(saved && "bg-primary/90")}>
            {pending ? "Guardando..." : saved ? "Actualizar" : "Guardar"}
          </Button>
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
