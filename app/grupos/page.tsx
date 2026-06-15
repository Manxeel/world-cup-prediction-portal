import { redirect } from "next/navigation"
import { headers } from "next/headers"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { getMyGroups } from "@/app/actions/groups"
import { SiteNav } from "@/components/site-nav"
import { CreateGroupForm, JoinGroupForm } from "@/components/group-forms"
import { Users, ChevronRight, Trophy, Sparkles } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function GroupsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")

  const groups = await getMyGroups()
  const myId = session.user.id

  return (
    <div className="min-h-svh bg-background">
      <SiteNav userName={session.user.name} />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Users className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-heading text-3xl font-bold uppercase tracking-tight text-foreground">
              Mis Grupos
            </h1>
            <p className="text-sm text-muted-foreground">
              Compite en ligas privadas con amigos y compañeros
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_320px]">
          {/* List of Groups */}
          <div className="space-y-4">
            <h2 className="font-heading text-xl font-bold uppercase tracking-wide text-foreground">
              Grupos en los que participas
            </h2>

            {groups.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card py-12 px-4 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                  <Sparkles className="h-6 w-6" />
                </span>
                <h3 className="font-medium text-foreground">No estás en ningún grupo</h3>
                <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                  Crea tu propio grupo para invitar a tus amigos o ingresa un código de invitación para unirte a una liga existente.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border">
                {groups.map((g) => {
                  const isCreator = g.creatorId === myId
                  return (
                    <Link
                      key={g.id}
                      href={`/grupos/${g.id}`}
                      className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
                    >
                      <div className="min-w-0 pr-4">
                        <h3 className="font-heading font-bold text-lg text-foreground truncate">
                          {g.name}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span>
                            {g.memberCount} {g.memberCount === 1 ? "miembro" : "miembros"}
                          </span>
                          <span className="text-border">•</span>
                          <span>Código: <strong className="font-mono text-foreground font-semibold">{g.inviteCode}</strong></span>
                          {isCreator && (
                            <>
                              <span className="text-border">•</span>
                              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                                Creador
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Sidebar Forms */}
          <div className="space-y-6">
            <CreateGroupForm />
            <JoinGroupForm />
          </div>
        </div>
      </main>
    </div>
  )
}
