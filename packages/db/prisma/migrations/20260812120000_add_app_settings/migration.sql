-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "value" JSONB NOT NULL DEFAULT '{}',
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "idx_app_settings_category" ON "app_settings"("category");

-- Seed the initial quiz_config row so quiz generation has a baseline before
-- any admin edit. Values mirror the historical code constants:
--   questionCount = 10, optionsPerQuestion = 4
INSERT INTO "app_settings" ("key", "category", "value")
VALUES ('quiz_config', 'quiz', '{"questionCount":10,"optionsPerQuestion":4}');
