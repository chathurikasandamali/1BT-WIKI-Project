-- CreateTable
CREATE TABLE "quiz_focus_aspects" (
    "article_id" UUID NOT NULL,
    "aspects" TEXT NOT NULL,
    "updated_by" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "quiz_focus_aspects_pkey" PRIMARY KEY ("article_id")
);

-- AddForeignKey
ALTER TABLE "quiz_focus_aspects" ADD CONSTRAINT "quiz_focus_aspects_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
