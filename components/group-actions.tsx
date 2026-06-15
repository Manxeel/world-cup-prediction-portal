"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { toast } from "sonner"
import { inviteUserByEmail, leaveGroup, removeMember } from "@/app/actions/groups"
import { Loader2, Copy, Send, Trash2, LogOut, Check, UserMinus } from "lucide-react"

export function GroupActionsSidebar({
  groupId,
  inviteCode,
  creatorId,
  currentUserId,
  members,
}: {
  groupId: string
  inviteCode: string
  creatorId: string
  currentUserId: string
  members: { id: string; name: string; email: string; joinedAt: any }[]
}) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [isInvitePending, startInviteTransition] = useTransition()
  const [isLeavePending, startLeaveTransition] = useTransition()
  const [kickingId, setKickingId] = useState<string | null>(null)

  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null)

  const isCreator = creatorId === currentUserId

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode)
      setCopiedCode(true)
      toast.success("Código copiado al portapapeles")
      setTimeout(() => setCopiedCode(false), 2000)
    } catch {
      toast.error("No se pudo copiar el código")
    }
  }

  const handleCopyLink = async () => {
    try {
      const link = `${window.location.origin}/grupos/join?code=${inviteCode}`
      await navigator.clipboard.writeText(link)
      setCopiedLink(true)
      toast.success("Enlace de invitación copiado")
      setTimeout(() => setCopiedLink(false), 2000)
    } catch {
      toast.error("No se pudo copiar el enlace")
    }
  }

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    startInviteTransition(async () => {
      try {
        const res = await inviteUserByEmail(groupId, email)
        if (res.ok) {
          toast.success("Usuario agregado exitosamente")
          setEmail("")
          router.refresh()
        }
      } catch (err: any) {
        toast.error(err.message || "Error al invitar al usuario")
      }
    })
  }

  const handleLeaveGroup = () => {
    const confirmMsg = isCreator
      ? "¿Estás seguro de que deseas eliminar este grupo? Se perderán todas las estadísticas privadas de la liga."
      : "¿Estás seguro de que deseas salir de este grupo?"

    setConfirmModal({
      title: isCreator ? "Eliminar Grupo" : "Salir del Grupo",
      message: confirmMsg,
      onConfirm: () => {
        startLeaveTransition(async () => {
          try {
            const res = await leaveGroup(groupId)
            if (res.ok) {
              toast.success(isCreator ? "Grupo eliminado con éxito" : "Has salido del grupo")
              router.push("/grupos")
              router.refresh()
            }
          } catch (err: any) {
            toast.error(err.message || "Error al procesar la solicitud")
          }
        })
      }
    })
  }

  const handleKickMember = (targetUserId: string, targetName: string) => {
    setConfirmModal({
      title: "Expulsar Miembro",
      message: `¿Estás seguro de que deseas expulsar a ${targetName} del grupo?`,
      onConfirm: async () => {
        setKickingId(targetUserId)
        try {
          const res = await removeMember(groupId, targetUserId)
          if (res.ok) {
            toast.success(`${targetName} ha sido expulsado del grupo`)
            router.refresh()
          }
        } catch (err: any) {
          toast.error(err.message || "Error al expulsar al miembro")
        } finally {
          setKickingId(null)
        }
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Invite Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base font-bold uppercase tracking-wider">Invitar Amigos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Código de invitación</Label>
            <div className="flex gap-2">
              <span className="flex-1 select-all rounded-md border border-border bg-secondary/30 px-3 py-2 font-mono text-sm font-bold tracking-wider text-foreground flex items-center justify-center">
                {inviteCode}
              </span>
              <Button size="icon" variant="outline" onClick={handleCopyCode} title="Copiar código">
                {copiedCode ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Button className="w-full" variant="outline" size="sm" onClick={handleCopyLink}>
              {copiedLink ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
              Copiar enlace de invitación
            </Button>
          </div>

          <div className="border-t border-border/60 my-4" />

          {/* Invite by Email form */}
          <form onSubmit={handleInvite} className="space-y-2.5">
            <div className="space-y-1">
              <Label htmlFor="invite-email" className="text-xs text-muted-foreground">Agregar por correo electrónico</Label>
              <div className="flex gap-2">
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="usuario@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isInvitePending}
                  required
                  className="h-9 text-sm"
                />
                <Button size="icon" type="submit" disabled={isInvitePending || !email.trim()}>
                  {isInvitePending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Members List Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base font-bold uppercase tracking-wider">
            Miembros ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border/60 max-h-[280px] overflow-y-auto">
            {members.map((m) => {
              const isSelf = m.id === currentUserId
              const isTargetCreator = m.id === creatorId
              return (
                <li key={m.id} className="flex items-center justify-between px-4 py-2 text-sm">
                  <div className="min-w-0 pr-2">
                    <p className="font-medium text-foreground truncate">
                      {m.name} {isSelf && <span className="text-xs font-normal text-primary">(tú)</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    {isTargetCreator ? (
                      <span className="rounded bg-primary/10 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                        Admin
                      </span>
                    ) : (
                      isCreator && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleKickMember(m.id, m.name)}
                          disabled={kickingId === m.id}
                          title="Expulsar del grupo"
                        >
                          {kickingId === m.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <UserMinus className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      {/* Leave Group Action Button */}
      <Button
        className="w-full"
        variant={isCreator ? "destructive" : "outline"}
        onClick={handleLeaveGroup}
        disabled={isLeavePending}
      >
        {isLeavePending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : isCreator ? (
          <Trash2 className="mr-2 h-4 w-4" />
        ) : (
          <LogOut className="mr-2 h-4 w-4" />
        )}
        {isCreator ? "Eliminar Grupo" : "Salir del Grupo"}
      </Button>

      {/* Custom Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md transition-all animate-in fade-in duration-200">
          <Card className="w-full max-w-sm border border-border bg-card/95 shadow-xl animate-in zoom-in-95 duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-lg font-bold uppercase tracking-wider text-foreground">
                {confirmModal.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground pb-6">
              {confirmModal.message}
            </CardContent>
            <CardFooter className="flex justify-end gap-2.5 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmModal(null)}>
                Cancelar
              </Button>
              <Button variant="destructive" size="sm" onClick={() => {
                confirmModal.onConfirm();
                setConfirmModal(null);
              }}>
                Confirmar
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  )
}
