"use server"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { userGroup, groupMember, user, prediction, groupComment } from "@/lib/db/schema"
import { and, eq, sql, inArray } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getMatches, type Match } from "@/lib/worldcup"

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("No autorizado")
  return session.user.id
}

export async function getMyGroups() {
  const userId = await getUserId()

  // ponytail: Simple inner join to retrieve the list of groups for a user
  const rows = await db
    .select({
      id: userGroup.id,
      name: userGroup.name,
      creatorId: userGroup.creatorId,
      createdAt: userGroup.createdAt,
      inviteCode: userGroup.inviteCode,
    })
    .from(groupMember)
    .innerJoin(userGroup, eq(userGroup.id, groupMember.groupId))
    .where(eq(groupMember.userId, userId))
    .orderBy(userGroup.createdAt)

  // Get member counts for each group
  const results = await Promise.all(
    rows.map(async (g) => {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(groupMember)
        .where(eq(groupMember.groupId, g.id))
      return {
        ...g,
        memberCount: Number(count),
      }
    })
  )

  return results
}

export async function createGroup(name: string) {
  const userId = await getUserId()
  const trimmedName = name.trim()
  if (!trimmedName) throw new Error("El nombre del grupo es requerido")

  const id = crypto.randomUUID()
  
  // ponytail: Simple random string for invite codes (known ceiling: collision probability, upgrade: check in DB before inserting)
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()

  await db.insert(userGroup).values({
    id,
    name: trimmedName,
    inviteCode,
    creatorId: userId,
  })

  await db.insert(groupMember).values({
    groupId: id,
    userId,
  })

  revalidatePath("/grupos")
  return { ok: true, groupId: id }
}

export async function joinGroup(inviteCode: string) {
  const userId = await getUserId()
  const code = inviteCode.trim().toUpperCase()
  if (!code) throw new Error("El código de invitación es requerido")

  const [group] = await db
    .select()
    .from(userGroup)
    .where(eq(userGroup.inviteCode, code))
    .limit(1)

  if (!group) throw new Error("Código de invitación inválido")

  // Check if already a member
  const [existing] = await db
    .select()
    .from(groupMember)
    .where(and(eq(groupMember.groupId, group.id), eq(groupMember.userId, userId)))
    .limit(1)

  if (!existing) {
    await db.insert(groupMember).values({
      groupId: group.id,
      userId,
    })
  }

  revalidatePath("/grupos")
  revalidatePath(`/grupos/${group.id}`)
  return { ok: true, groupId: group.id }
}

export async function leaveGroup(groupId: string) {
  const userId = await getUserId()

  const [group] = await db
    .select()
    .from(userGroup)
    .where(eq(userGroup.id, groupId))
    .limit(1)

  if (!group) throw new Error("Grupo no encontrado")

  if (group.creatorId === userId) {
    // Creator deleting the group deletes it in cascade
    await db.delete(userGroup).where(eq(userGroup.id, groupId))
  } else {
    // Normal member leaving
    await db
      .delete(groupMember)
      .where(and(eq(groupMember.groupId, groupId), eq(groupMember.userId, userId)))
  }

  revalidatePath("/grupos")
  return { ok: true }
}

export async function removeMember(groupId: string, userIdTarget: string) {
  const userId = await getUserId()

  const [group] = await db
    .select()
    .from(userGroup)
    .where(eq(userGroup.id, groupId))
    .limit(1)

  if (!group) throw new Error("Grupo no encontrado")
  if (group.creatorId !== userId) throw new Error("Solo el creador puede eliminar miembros")
  if (userIdTarget === userId) throw new Error("No puedes expulsarte a ti mismo (usa salir)")

  await db
    .delete(groupMember)
    .where(and(eq(groupMember.groupId, groupId), eq(groupMember.userId, userIdTarget)))

  revalidatePath(`/grupos/${groupId}`)
  return { ok: true }
}

export async function inviteUserByEmail(groupId: string, email: string) {
  const userId = await getUserId()
  const targetEmail = email.trim().toLowerCase()
  if (!targetEmail) throw new Error("El correo electrónico es requerido")

  // Check authorization (must be a member to invite)
  const [memberCheck] = await db
    .select()
    .from(groupMember)
    .where(and(eq(groupMember.groupId, groupId), eq(groupMember.userId, userId)))
    .limit(1)

  if (!memberCheck) throw new Error("No autorizado para invitar usuarios a este grupo")

  // ponytail: Lookup user by email directly (known ceiling: no pending invitations state, upgrade: add invitation model)
  const [targetUser] = await db
    .select()
    .from(user)
    .where(eq(user.email, targetEmail))
    .limit(1)

  if (!targetUser) {
    throw new Error("No existe ningún usuario registrado con ese correo electrónico")
  }

  // Check if already in the group
  const [alreadyMember] = await db
    .select()
    .from(groupMember)
    .where(and(eq(groupMember.groupId, groupId), eq(groupMember.userId, targetUser.id)))
    .limit(1)

  if (alreadyMember) {
    throw new Error("El usuario ya pertenece a este grupo")
  }

  await db.insert(groupMember).values({
    groupId,
    userId: targetUser.id,
  })

  revalidatePath(`/grupos/${groupId}`)
  return { ok: true }
}

export async function getGroupDetails(groupId: string) {
  const userId = await getUserId()

  const [group] = await db
    .select({
      id: userGroup.id,
      name: userGroup.name,
      inviteCode: userGroup.inviteCode,
      creatorId: userGroup.creatorId,
      creatorName: user.name,
      createdAt: userGroup.createdAt,
    })
    .from(userGroup)
    .innerJoin(user, eq(user.id, userGroup.creatorId))
    .where(eq(userGroup.id, groupId))
    .limit(1)

  if (!group) return null

  // Security check: must be a member
  const [member] = await db
    .select()
    .from(groupMember)
    .where(and(eq(groupMember.groupId, groupId), eq(groupMember.userId, userId)))
    .limit(1)

  if (!member) return null

  // Get members list
  const members = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      joinedAt: groupMember.joinedAt,
    })
    .from(groupMember)
    .innerJoin(user, eq(user.id, groupMember.userId))
    .where(eq(groupMember.groupId, groupId))
    .orderBy(groupMember.joinedAt)

  // Get comments list
  const comments = await db
    .select({
      id: groupComment.id,
      content: groupComment.content,
      createdAt: groupComment.createdAt,
      userId: groupComment.userId,
      userName: user.name,
    })
    .from(groupComment)
    .innerJoin(user, eq(user.id, groupComment.userId))
    .where(eq(groupComment.groupId, groupId))
    .orderBy(sql`${groupComment.createdAt} desc`)

  return {
    ...group,
    members,
    comments,
  }
}

export type GroupLeaderboardRow = {
  userId: string
  name: string
  totalPoints: number
  predictions: number
  exact: number
}

export async function getGroupLeaderboard(groupId: string): Promise<GroupLeaderboardRow[]> {
  const userId = await getUserId()

  // Security check: must be a member to view the leaderboard
  const [member] = await db
    .select()
    .from(groupMember)
    .where(and(eq(groupMember.groupId, groupId), eq(groupMember.userId, userId)))
    .limit(1)

  if (!member) throw new Error("No autorizado")

  const [group] = await db
    .select({ createdAt: userGroup.createdAt })
    .from(userGroup)
    .where(eq(userGroup.id, groupId))
    .limit(1)

  if (!group) throw new Error("Grupo no encontrado")

  // ponytail: Filter predictions to only count matches starting after group creation
  let matches: Match[] = []
  try {
    matches = await getMatches()
  } catch (err) {
    console.error("Failed to fetch matches for group leaderboard:", err)
  }
  const groupCreatedTime = new Date(group.createdAt).getTime()
  
  const eligibleMatchIds = matches
    .filter((m) => new Date(m.kickoff).getTime() >= groupCreatedTime)
    .map((m) => m.id)

  const matchCondition = eligibleMatchIds.length > 0
    ? inArray(prediction.matchId, eligibleMatchIds)
    : sql`FALSE`

  const rows = await db
    .select({
      userId: user.id,
      name: user.name,
      totalPoints: sql<number>`coalesce(sum(${prediction.points}), 0)`.mapWith(Number),
      predictions: sql<number>`count(${prediction.id})`.mapWith(Number),
      exact: sql<number>`coalesce(sum(case when ${prediction.points} = 3 then 1 else 0 end), 0)`.mapWith(Number),
    })
    .from(user)
    .innerJoin(groupMember, eq(groupMember.userId, user.id))
    .leftJoin(prediction, and(eq(prediction.userId, user.id), matchCondition))
    .where(eq(groupMember.groupId, groupId))
    .groupBy(user.id, user.name)
    .orderBy(sql`coalesce(sum(${prediction.points}), 0) desc, ${user.name} asc`)

  return rows
}

export async function postComment(groupId: string, content: string) {
  const userId = await getUserId()
  const text = content.trim()
  if (!text) throw new Error("El contenido del comentario no puede estar vacío")
  if (text.length > 500) throw new Error("El comentario no puede superar los 500 caracteres")

  // Verify membership
  const [member] = await db
    .select()
    .from(groupMember)
    .where(and(eq(groupMember.groupId, groupId), eq(groupMember.userId, userId)))
    .limit(1)

  if (!member) throw new Error("No tienes autorización para comentar en este grupo")

  await db.insert(groupComment).values({
    groupId,
    userId,
    content: text,
  })

  revalidatePath(`/grupos/${groupId}`)
  return { ok: true }
}

export async function deleteComment(commentId: number) {
  const userId = await getUserId()

  const [comment] = await db
    .select({
      id: groupComment.id,
      groupId: groupComment.groupId,
      userId: groupComment.userId,
      creatorId: userGroup.creatorId,
    })
    .from(groupComment)
    .innerJoin(userGroup, eq(userGroup.id, groupComment.groupId))
    .where(eq(groupComment.id, commentId))
    .limit(1)

  if (!comment) throw new Error("Comentario no encontrado")

  // Authorized: author of comment OR creator of the group
  if (comment.userId !== userId && comment.creatorId !== userId) {
    throw new Error("No tienes autorización para eliminar este comentario")
  }

  await db.delete(groupComment).where(eq(groupComment.id, commentId))

  revalidatePath(`/grupos/${comment.groupId}`)
  return { ok: true }
}
