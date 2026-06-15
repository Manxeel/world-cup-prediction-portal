CREATE TABLE "group_comment" (
	"id" serial PRIMARY KEY NOT NULL,
	"groupId" text NOT NULL,
	"userId" text NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match" (
	"id" text PRIMARY KEY NOT NULL,
	"groupLetter" text DEFAULT '' NOT NULL,
	"matchday" text DEFAULT '' NOT NULL,
	"type" text DEFAULT 'group' NOT NULL,
	"homeTeamId" text DEFAULT '' NOT NULL,
	"awayTeamId" text DEFAULT '' NOT NULL,
	"homeScore" integer,
	"awayScore" integer,
	"finished" boolean DEFAULT false NOT NULL,
	"kickoff" text DEFAULT '' NOT NULL,
	"kickoffRaw" text DEFAULT '' NOT NULL,
	"stadiumId" text,
	"homeTeamLabel" text,
	"awayTeamLabel" text,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team" (
	"id" text PRIMARY KEY NOT NULL,
	"nameEn" text NOT NULL,
	"flag" text DEFAULT '' NOT NULL,
	"fifaCode" text DEFAULT '' NOT NULL,
	"groupLetter" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "group_comment" ADD CONSTRAINT "group_comment_groupId_user_group_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."user_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_comment" ADD CONSTRAINT "group_comment_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;