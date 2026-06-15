"use client"

import { useState, useTransition, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { toast } from "sonner"
import { postComment, deleteComment } from "@/app/actions/groups"
import { Loader2, MessageSquare, Trash2, Send } from "lucide-react"

type Comment = {
  id: number
  content: string
  createdAt: any
  userId: string
  userName: string
}

export function GroupComments({
  groupId,
  comments,
  currentUserId,
  creatorId,
}: {
  groupId: string
  comments: Comment[]
  currentUserId: string
  creatorId: string
}) {
  const router = useRouter()
  const [content, setContent] = useState("")
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = content.trim()
    if (!text) return

    startTransition(async () => {
      try {
        const res = await postComment(groupId, text)
        if (res.ok) {
          toast.success("Comentario publicado")
          setContent("")
          router.refresh()
        }
      } catch (err: any) {
        toast.error(err.message || "Error al publicar comentario")
      }
    })
  }

  const handleDelete = async (commentId: number) => {
    setDeletingId(commentId)
    try {
      const res = await deleteComment(commentId)
      if (res.ok) {
        toast.success("Comentario eliminado")
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar comentario")
    } finally {
      setDeletingId(null)
      setConfirmDelete(null)
    }
  }

  const isGroupCreator = creatorId === currentUserId

  return (
    <Card className="border border-border bg-card">
      <CardHeader className="pb-3 border-b border-border/60">
        <CardTitle className="font-heading text-lg font-bold uppercase tracking-wider flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Muro de Debate
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Post Form */}
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div className="relative">
            <textarea
              placeholder="¿Qué opinas de los pronósticos de esta jornada? Escribe aquí..."
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 500))}
              disabled={isPending}
              rows={3}
              maxLength={500}
              className="flex w-full min-h-20 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 resize-none pr-12 text-sm bg-background border-border/80 focus-visible:ring-primary/30 focus-visible:border-primary"
            />
            <div className="absolute right-3.5 bottom-2.5 text-[10px] font-bold text-muted-foreground select-none">
              {content.length}/500
            </div>
          </div>
          <div className="flex justify-end">
            <Button size="sm" type="submit" disabled={isPending || !content.trim()}>
              {isPending ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="mr-2 h-3.5 w-3.5" />
              )}
              Publicar
            </Button>
          </div>
        </form>

        {/* Comments List */}
        <div className="border-t border-border/60 pt-4" />

        {comments.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Aún no hay comentarios. ¡Sé el primero en iniciar el debate!
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                currentUserId={currentUserId}
                isGroupCreator={isGroupCreator}
                onDeleteClick={() => setConfirmDelete(c.id)}
                isDeleting={deletingId === c.id}
              />
            ))}
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Modal */}
      {confirmDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md transition-all animate-in fade-in duration-200">
          <Card className="w-full max-w-sm border border-border bg-card/95 shadow-xl animate-in zoom-in-95 duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-lg font-bold uppercase tracking-wider text-foreground">
                Eliminar Comentario
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground pb-6">
              ¿Estás seguro de que deseas eliminar este comentario? Esta acción no se puede deshacer.
            </CardContent>
            <CardFooter className="flex justify-end gap-2.5 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>
                Cancelar
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(confirmDelete)}>
                Confirmar
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </Card>
  )
}

function CommentItem({
  comment,
  currentUserId,
  isGroupCreator,
  onDeleteClick,
  isDeleting,
}: {
  comment: Comment
  currentUserId: string
  isGroupCreator: boolean
  onDeleteClick: () => void
  isDeleting: boolean
}) {
  const [formattedTime, setFormattedTime] = useState("")

  useEffect(() => {
    // ponytail: Safe relative time format to prevent Server-Client Hydration mismatches
    const formatTime = (dateVal: any) => {
      const now = new Date()
      const d = new Date(dateVal)
      const diffMs = now.getTime() - d.getTime()
      const diffSec = Math.floor(diffMs / 1000)
      const diffMin = Math.floor(diffSec / 60)
      const diffHr = Math.floor(diffMin / 60)
      const diffDays = Math.floor(diffHr / 24)

      if (diffSec < 10) return "ahora mismo"
      if (diffSec < 60) return `hace ${diffSec} seg`
      if (diffMin < 60) return `hace ${diffMin} min`
      if (diffHr < 24) return `hace ${diffHr} h`
      if (diffDays < 7) return `hace ${diffDays} d`
      return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    }

    setFormattedTime(formatTime(comment.createdAt))
  }, [comment.createdAt])

  const canDelete = comment.userId === currentUserId || isGroupCreator

  return (
    <div className="flex gap-3 text-sm group">
      {/* User avatar circle */}
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold uppercase text-secondary-foreground border border-border">
        {comment.userName.slice(0, 2)}
      </span>

      {/* Main Comment bubble */}
      <div className="flex-1 min-w-0 bg-secondary/20 border border-border/50 rounded-xl px-3.5 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-foreground truncate">
            {comment.userName}
            {comment.userId === currentUserId && (
              <span className="ml-1 text-[10px] font-normal text-primary">(tú)</span>
            )}
          </span>
          <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums" title={new Date(comment.createdAt).toLocaleString()}>
            {formattedTime || "..."}
          </span>
        </div>
        <p className="mt-1.5 text-card-foreground text-sm leading-relaxed whitespace-pre-wrap break-words text-pretty">
          {comment.content}
        </p>
      </div>

      {/* Action button */}
      {canDelete && (
        <div className="shrink-0 flex items-start self-center md:opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDeleteClick}
            disabled={isDeleting}
            title="Eliminar comentario"
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
