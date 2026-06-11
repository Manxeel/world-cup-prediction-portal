"use client"

import { useMemo, useState } from "react"
import { PHASE_FILTERS, type Match, type MatchPhase } from "@/lib/worldcup"
import { MatchCard } from "@/components/match-card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type PredMap = Record<string, { homeScore: number; awayScore: number; points: number | null }>

function filterMatches(matches: Match[], phase: MatchPhase | "all", group: string) {
  let list = matches

  if (phase !== "all") {
    list = list.filter((m) => m.phase === phase)
  }

  if (group !== "all" && (phase === "all" || phase === "group")) {
    list = list.filter((m) => m.phase === "group" && m.group === group)
  }

  return list
}

export function PredictionsList({ matches, predictions }: { matches: Match[]; predictions: PredMap }) {
  const { upcoming, finished } = useMemo(() => {
    const up: Match[] = []
    const fin: Match[] = []
    for (const m of matches) {
      if (m.finished) fin.push(m)
      else up.push(m)
    }
    up.sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
    fin.sort((a, b) => new Date(b.kickoff).getTime() - new Date(a.kickoff).getTime())
    return { upcoming: up, finished: fin }
  }, [matches])

  const [phase, setPhase] = useState<MatchPhase | "all">("all")
  const [group, setGroup] = useState<string>("all")

  const groups = useMemo(() => {
    const set = new Set(
      matches.filter((m) => m.phase === "group").map((m) => m.group).filter((g) => /^[A-L]$/i.test(g)),
    )
    return ["all", ...[...set].sort()]
  }, [matches])

  const showGroupFilter = phase === "all" || phase === "group"

  const applyFilters = (list: Match[]) => filterMatches(list, phase, group)

  return (
    <Tabs defaultValue="upcoming" className="w-full">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="upcoming">Por jugar ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="finished">Finalizados ({finished.length})</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex flex-wrap gap-1">
          {PHASE_FILTERS.map((p) => (
            <FilterButton
              key={p.value}
              active={phase === p.value}
              onClick={() => {
                setPhase(p.value)
                if (p.value !== "all" && p.value !== "group") setGroup("all")
              }}
            >
              {p.label}
            </FilterButton>
          ))}
        </div>

        {showGroupFilter && groups.length > 1 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-xs font-medium text-muted-foreground">Grupo:</span>
            {groups.map((g) => (
              <FilterButton key={g} active={group === g} onClick={() => setGroup(g)} small>
                {g === "all" ? "Todos" : g}
              </FilterButton>
            ))}
          </div>
        )}
      </div>

      <TabsContent value="upcoming" className="mt-4">
        <MatchGrid
          matches={applyFilters(upcoming)}
          predictions={predictions}
          empty="No hay partidos próximos para este filtro."
        />
      </TabsContent>
      <TabsContent value="finished" className="mt-4">
        <MatchGrid
          matches={applyFilters(finished)}
          predictions={predictions}
          empty="Aún no hay partidos finalizados para este filtro."
        />
      </TabsContent>
    </Tabs>
  )
}

function FilterButton({
  active,
  onClick,
  children,
  small,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  small?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md font-medium transition-colors",
        small ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-secondary-foreground hover:bg-secondary/70",
      )}
    >
      {children}
    </button>
  )
}

function MatchGrid({
  matches,
  predictions,
  empty,
}: {
  matches: Match[]
  predictions: PredMap
  empty: string
}) {
  if (matches.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 py-12 text-center text-sm text-muted-foreground">
        {empty}
      </div>
    )
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {matches.map((m) => (
        <MatchCard key={m.id} match={m} initial={predictions[m.id]} />
      ))}
    </div>
  )
}
