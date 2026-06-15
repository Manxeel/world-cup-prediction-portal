CREATE TABLE "group_member" (
	"id" serial PRIMARY KEY NOT NULL,
	"groupId" text NOT NULL,
	"userId" text NOT NULL,
	"joinedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_group" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"inviteCode" text NOT NULL,
	"creatorId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_group_inviteCode_unique" UNIQUE("inviteCode")
);
--> statement-breakpoint
ALTER TABLE "group_member" ADD CONSTRAINT "group_member_groupId_user_group_id_fk" FOREIGN KEY ("groupId") REFERENCES "public"."user_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_member" ADD CONSTRAINT "group_member_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_group" ADD CONSTRAINT "user_group_creatorId_user_id_fk" FOREIGN KEY ("creatorId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "group_member_group_user_idx" ON "group_member" USING btree ("groupId","userId");