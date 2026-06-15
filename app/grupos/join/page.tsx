import { redirect } from "next/navigation"
import { headers, cookies } from "next/headers"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { joinGroup } from "@/app/actions/groups"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { AlertCircle, Trophy } from "lucide-react"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ code?: string }>
}

export default async function JoinPage({ searchParams }: PageProps) {
  const code = (await searchParams).code
  if (!code) redirect("/grupos")

  const session = await auth.api.getSession({ headers: await headers() })
  
  if (!session?.user) {
    // ponytail: Store pending code in a short-lived cookie to join automatically after authentication
    const cookieStore = await cookies()
    cookieStore.set("pending_join_code", code, { maxAge: 600, path: "/" }) // 10 minutes
    redirect("/sign-in")
  }

  let errorMsg = null

  try {
    const res = await joinGroup(code)
    if (res.ok) {
      redirect(`/grupos/${res.groupId}`)
    }
  } catch (err: any) {
    errorMsg = err.message || "No se pudo unir al grupo. Verifica el código de invitación."
  }

  return (
    <main className="min-h-svh bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Trophy className="h-5 w-5" />
          </span>
          <span className="font-heading text-2xl font-bold uppercase tracking-wide text-foreground">
            Quiniela <span className="text-primary">26</span>
          </span>
        </Link>

        <Card className="border border-destructive/20 bg-card/70 backdrop-blur shadow-[0_0_25px_rgba(239,68,68,0.08)]">
          <CardHeader className="pt-8">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 ring-8 ring-destructive/5 text-destructive mb-4">
              <AlertCircle className="h-7 w-7" />
            </div>
            <CardTitle className="text-center font-heading text-xl font-bold uppercase tracking-wider text-destructive">
              Error al unirse
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground/80 mt-1">
              Hubo un problema al procesar tu solicitud de invitación.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm font-medium text-foreground px-6 pb-6">
            <div className="rounded-lg bg-destructive/5 border border-destructive/10 p-3 text-pretty text-destructive/90">
              {errorMsg}
            </div>
          </CardContent>
          <CardFooter className="pb-8">
            <Link href="/grupos" className={buttonVariants({ variant: "outline", className: "w-full" })}>
              Ir a Mis Grupos
            </Link>
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
