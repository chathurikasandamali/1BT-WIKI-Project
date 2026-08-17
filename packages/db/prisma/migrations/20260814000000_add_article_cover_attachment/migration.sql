ALTER TABLE "articles" ADD COLUMN "cover_attachment_id" UUID;

CREATE UNIQUE INDEX "articles_cover_attachment_id_key" ON "articles"("cover_attachment_id");

ALTER TABLE "articles" ADD CONSTRAINT "articles_cover_attachment_id_fkey" FOREIGN KEY ("cover_attachment_id") REFERENCES "article_attachments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
