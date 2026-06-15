import { boolean, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core"

// ---- Better Auth tables (do not rename columns) ----
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
})

// ---- App tables ----

export const team = pgTable("team", {
  id: text("id").primaryKey(),
  nameEn: text("nameEn").notNull(),
  flag: text("flag").notNull().default(""),
  fifaCode: text("fifaCode").notNull().default(""),
  groupLetter: text("groupLetter").notNull().default(""),
})

export const match = pgTable("match", {
  id: text("id").primaryKey(),
  groupLetter: text("groupLetter").notNull().default(""),
  matchday: text("matchday").notNull().default(""),
  type: text("type").notNull().default("group"),
  homeTeamId: text("homeTeamId").notNull().default(""),
  awayTeamId: text("awayTeamId").notNull().default(""),
  homeScore: integer("homeScore"),
  awayScore: integer("awayScore"),
  finished: boolean("finished").notNull().default(false),
  kickoff: text("kickoff").notNull().default(""),
  kickoffRaw: text("kickoffRaw").notNull().default(""),
  stadiumId: text("stadiumId"),
  homeTeamLabel: text("homeTeamLabel"),
  awayTeamLabel: text("awayTeamLabel"),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const prediction = pgTable(
  "prediction",
  {
    id: serial("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    matchId: text("matchId").notNull(),
    homeScore: integer("homeScore").notNull(),
    awayScore: integer("awayScore").notNull(),
    points: integer("points"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (t) => ({
    userMatchIdx: uniqueIndex("prediction_user_match_idx").on(t.userId, t.matchId),
  }),
)

export const userGroup = pgTable(
  "user_group",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    inviteCode: text("inviteCode").notNull().unique(),
    creatorId: text("creatorId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  }
)

export const groupMember = pgTable(
  "group_member",
  {
    id: serial("id").primaryKey(),
    groupId: text("groupId")
      .notNull()
      .references(() => userGroup.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joinedAt").notNull().defaultNow(),
  },
  (t) => ({
    groupUserIdx: uniqueIndex("group_member_group_user_idx").on(t.groupId, t.userId),
  })
)

export const groupComment = pgTable(
  "group_comment",
  {
    id: serial("id").primaryKey(),
    groupId: text("groupId")
      .notNull()
      .references(() => userGroup.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  }
)

