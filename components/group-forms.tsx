"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { toast } from "sonner"
import { createGroup, joinGroup } from "@/app/actions/groups"
import { Loader2, Plus, LogIn } from "lucide-react"

export function CreateGroupForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [isPending, startTransition] = useTransition()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    startTransition(async () => {
      try {
        const res = await createGroup(name)
        if (res.ok) {
          toast.success("Grupo creado con éxito")
          setName("")
          router.push(`/grupos/${res.groupId}`)
          router.refresh()
        }
      } catch (err: any) {
        toast.error(err.message || "Error al crear el grupo")
      }
    })
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle className="font-heading text-lg font-bold uppercase tracking-wider">Crear Grupo</CardTitle>
          <CardDescription>
            Crea una liga privada e invita a tus amigos a competir.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="group-name">Nombre del grupo</Label>
            <Input
              id="group-name"
              placeholder="Ej. Los Reyes del Pronóstico"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              required
              maxLength={50}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isPending || !name.trim()}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Crear Grupo
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

export function JoinGroupForm() {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [isPending, startTransition] = useTransition()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return

    startTransition(async () => {
      try {
        const res = await joinGroup(code)
        if (res.ok) {
          toast.success("Te has unido al grupo")
          setCode("")
          router.push(`/grupos/${res.groupId}`)
          router.refresh()
        }
      } catch (err: any) {
        toast.error(err.message || "Error al unirse al grupo")
      }
    })
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle className="font-heading text-lg font-bold uppercase tracking-wider">Unirse a un Grupo</CardTitle>
          <CardDescription>
            Ingresa el código de invitación para unirte a una liga existente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="group-code">Código de invitación</Label>
            <Input
              id="group-code"
              placeholder="Ej. A1B2C3"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isPending}
              required
              maxLength={20}
              className="uppercase"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" variant="secondary" disabled={isPending || !code.trim()}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="mr-2 h-4 w-4" />
            )}
            Unirse al Grupo
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
