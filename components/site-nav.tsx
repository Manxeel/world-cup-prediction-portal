"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Trophy, LogOut, ListChecks, BarChart3, User, Users } from "lucide-react"

const links = [
  { href: "/", label: "Predicciones", icon: ListChecks },
  { href: "/tabla", label: "Posiciones", icon: BarChart3 },
  { href: "/grupos", label: "Grupos", icon: Users },
  { href: "/perfil", label: "Mi perfil", icon: User },
]

export function SiteNav({ userName }: { userName: string }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    await authClient.signOut()
    router.push("/sign-in")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Trophy className="h-4 w-4" />
          </span>
          <span className="font-heading text-lg font-bold uppercase tracking-wide text-foreground hidden sm:inline">
            Quiniela <span className="text-primary">26</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((l) => {
            const active = pathname === l.href
            const Icon = l.icon
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{l.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden text-sm font-medium text-foreground md:inline">{userName}</span>
          <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Cerrar sesión">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
