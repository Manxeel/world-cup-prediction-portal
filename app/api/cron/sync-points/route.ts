import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { syncPoints } from "@/lib/sync-points"

export const dynamic = "force-dynamic"
export const maxDuration = 60

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV === "development"

  const auth = request.headers.get("authorization")
  if (auth === `Bearer ${secret}`) return true

  // Vercel Cron also sends this header on scheduled invocations.
  return request.headers.get("x-vercel-cron") === "1"
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await syncPoints()

    revalidatePath("/")
    revalidatePath("/tabla")
    revalidatePath("/perfil")

    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
