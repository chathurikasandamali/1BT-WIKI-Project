import { prisma } from '@repo/db';
import type {
  ArticleAttachment,
  CreateAttachmentInput,
} from '@models/article.types.js';

const ARTICLE_ATTACHMENT_SELECT = {
  id: true,
  articleId: true,
  uploadedBy: true,
  fileName: true,
  b2FileKey: true,
  b2FileId: true,
  b2BucketName: true,
  fileUrl: true,
  mimeType: true,
  sizeBytes: true,
  createdAt: true,
  deletedAt: true,
} as const;

export class ArticleAttachmentRepository {
  async create(data: CreateAttachmentInput): Promise<ArticleAttachment> {
    const result = await prisma.articleAttachment.create({
      data: {
        articleId: data.articleId,
        uploadedBy: data.uploadedBy,
        fileName: data.fileName,
        b2FileKey: data.b2FileKey,
        b2FileId: data.b2FileId,
        b2BucketName: data.b2BucketName,
        fileUrl: data.fileUrl,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
      },
      select: ARTICLE_ATTACHMENT_SELECT,
    });

    return result as ArticleAttachment;
  }

  async findByArticleId(articleId: string): Promise<ArticleAttachment[]> {
    const result = await prisma.articleAttachment.findMany({
      where: { articleId, deletedAt: null },
      select: ARTICLE_ATTACHMENT_SELECT,
    });

    return result as ArticleAttachment[];
  }

  async softDelete(id: string): Promise<void> {
    await prisma.articleAttachment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export default new ArticleAttachmentRepository();
