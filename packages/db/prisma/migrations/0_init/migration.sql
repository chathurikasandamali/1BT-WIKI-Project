-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "neon_auth";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "article_status" AS ENUM ('Draft', 'Pending', 'Published', 'Unpublished');

-- CreateEnum
CREATE TYPE "notification_reference_type" AS ENUM ('article', 'tech_talk', 'comment', 'like', 'review');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('success', 'failure', 'info');

-- CreateEnum
CREATE TYPE "review_status" AS ENUM ('Pending', 'Approved', 'Rejected');

-- CreateEnum
CREATE TYPE "tech_talk_status" AS ENUM ('draft', 'published', 'unpublished');

-- CreateTable
CREATE TABLE "neon_auth"."account" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ(6),
    "refreshTokenExpiresAt" TIMESTAMPTZ(6),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "neon_auth"."invitation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inviterId" UUID NOT NULL,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "neon_auth"."jwks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "publicKey" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "expiresAt" TIMESTAMPTZ(6),

    CONSTRAINT "jwks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "neon_auth"."member" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "neon_auth"."organization" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "metadata" TEXT,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "neon_auth"."project_config" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "endpoint_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trusted_origins" JSONB NOT NULL,
    "social_providers" JSONB NOT NULL,
    "email_provider" JSONB,
    "email_and_password" JSONB,
    "allow_localhost" BOOLEAN NOT NULL,
    "plugin_configs" JSONB,
    "webhook_config" JSONB,

    CONSTRAINT "project_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "neon_auth"."session" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" UUID NOT NULL,
    "impersonatedBy" TEXT,
    "activeOrganizationId" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "neon_auth"."user" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT,
    "banned" BOOLEAN,
    "banReason" TEXT,
    "banExpires" TIMESTAMPTZ(6),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "neon_auth"."verification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "article_id" UUID NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "b2_file_key" TEXT NOT NULL,
    "b2_file_id" TEXT NOT NULL,
    "b2_bucket_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "article_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "article_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_likes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "article_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "article_id" UUID NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "review_feedback" TEXT,
    "review_status" "review_status" NOT NULL,
    "created_by" UUID NOT NULL,
    "deleted_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(500) NOT NULL,
    "body" JSONB NOT NULL DEFAULT '{}',
    "status" "article_status" NOT NULL,
    "author_id" UUID NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "article_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipient_id" UUID NOT NULL,
    "notification_title" VARCHAR(255) NOT NULL,
    "notification_reference_type" "notification_reference_type" NOT NULL,
    "reference_id" UUID NOT NULL,
    "notification_type" "notification_type" NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(6),
    "deleted_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tech_talks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "presenters" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "event_date" TIMESTAMP(6) NOT NULL,
    "slides_url" TEXT,
    "youtube_iframe_url" TEXT,
    "tech_talks_status" "tech_talk_status" NOT NULL DEFAULT 'draft',
    "created_by" UUID NOT NULL,
    "deleted_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tech_talks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "neon_auth"."account"("userId");

-- CreateIndex
CREATE INDEX "invitation_email_idx" ON "neon_auth"."invitation"("email");

-- CreateIndex
CREATE INDEX "invitation_organizationId_idx" ON "neon_auth"."invitation"("organizationId");

-- CreateIndex
CREATE INDEX "member_organizationId_idx" ON "neon_auth"."member"("organizationId");

-- CreateIndex
CREATE INDEX "member_userId_idx" ON "neon_auth"."member"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_slug_key" ON "neon_auth"."organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "project_config_endpoint_id_key" ON "neon_auth"."project_config"("endpoint_id");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "neon_auth"."session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "neon_auth"."session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "neon_auth"."user"("email");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "neon_auth"."verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "article_attachments_b2_file_key_key" ON "article_attachments"("b2_file_key");

-- CreateIndex
CREATE INDEX "idx_article_attachments_article_id" ON "article_attachments"("article_id");

-- CreateIndex
CREATE INDEX "idx_article_attachments_uploaded_by" ON "article_attachments"("uploaded_by");

-- CreateIndex
CREATE INDEX "idx_article_comments_active" ON "article_comments"("article_id", "created_at") WHERE (deleted_at IS NULL);

-- CreateIndex
CREATE INDEX "idx_article_comments_article_id" ON "article_comments"("article_id");

-- CreateIndex
CREATE INDEX "idx_article_comments_created_by" ON "article_comments"("created_by");

-- CreateIndex
CREATE INDEX "idx_article_likes_article_id" ON "article_likes"("article_id");

-- CreateIndex
CREATE INDEX "idx_article_likes_user_id" ON "article_likes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_article_likes" ON "article_likes"("article_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_article_reviews_article_id" ON "article_reviews"("article_id");

-- CreateIndex
CREATE INDEX "idx_article_reviews_reviewer_id" ON "article_reviews"("reviewer_id");

-- CreateIndex
CREATE INDEX "idx_articles_author_id" ON "articles"("author_id");

-- CreateIndex
CREATE INDEX "idx_articles_deleted_at" ON "articles"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_articles_status" ON "articles"("status");

-- CreateIndex
CREATE INDEX "idx_notifications_is_read" ON "notifications"("recipient_id", "is_read") WHERE (is_read = false);

-- CreateIndex
CREATE INDEX "idx_notifications_recipient_id" ON "notifications"("recipient_id");

-- CreateIndex
CREATE INDEX "idx_notifications_reference" ON "notifications"("notification_reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "idx_tech_talks_created_by" ON "tech_talks"("created_by");

-- CreateIndex
CREATE INDEX "idx_tech_talks_deleted_at" ON "tech_talks"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_tech_talks_event_date" ON "tech_talks"("event_date" DESC);

-- CreateIndex
CREATE INDEX "idx_tech_talks_published" ON "tech_talks"("event_date" DESC) WHERE ((tech_talks_status = 'published'::tech_talk_status) AND (deleted_at IS NULL));

-- CreateIndex
CREATE INDEX "idx_tech_talks_status" ON "tech_talks"("tech_talks_status");

-- AddForeignKey
ALTER TABLE "neon_auth"."account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "neon_auth"."invitation" ADD CONSTRAINT "invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "neon_auth"."invitation" ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "neon_auth"."organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "neon_auth"."member" ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "neon_auth"."organization"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "neon_auth"."member" ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "neon_auth"."session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "article_attachments" ADD CONSTRAINT "article_attachments_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "article_attachments" ADD CONSTRAINT "article_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "neon_auth"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "article_comments" ADD CONSTRAINT "article_comments_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "article_comments" ADD CONSTRAINT "article_comments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "neon_auth"."user"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "article_likes" ADD CONSTRAINT "article_likes_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "article_likes" ADD CONSTRAINT "article_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "article_reviews" ADD CONSTRAINT "article_reviews_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "article_reviews" ADD CONSTRAINT "article_reviews_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "neon_auth"."user"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "article_reviews" ADD CONSTRAINT "article_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "neon_auth"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "neon_auth"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tech_talks" ADD CONSTRAINT "tech_talks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "neon_auth"."user"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

