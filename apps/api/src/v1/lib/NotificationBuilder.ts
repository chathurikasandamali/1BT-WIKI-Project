import type { CreateNotificationInput } from '@models/notificationTypes.js';

export class NotificationBuilder {
  private payload: Partial<CreateNotificationInput> = {};

  forUser(userId: string): this {
    this.payload.recipientId = userId;
    return this;
  }

  regardingArticle(articleId: string): this {
    this.payload.notificationReferenceType = 'article';
    this.payload.referenceId = articleId;
    return this;
  }

  regardingComment(commentId: string): this {
    this.payload.notificationReferenceType = 'comment';
    this.payload.referenceId = commentId;
    return this;
  }

  regardingLike(likeId: string): this {
    this.payload.notificationReferenceType = 'like';
    this.payload.referenceId = likeId;
    return this;
  }
  
  regardingTechTalk(techTalkId: string): this {
    this.payload.notificationReferenceType = 'tech_talk';
    this.payload.referenceId = techTalkId;
    return this;
  }

  withSuccess(title: string, message: string): this {
    this.payload.notificationType = 'success';
    this.payload.notificationTitle = title;
    this.payload.message = message;
    return this;
  }

  withFailure(title: string, message: string): this {
    this.payload.notificationType = 'failure';
    this.payload.notificationTitle = title;
    this.payload.message = message;
    return this;
  }

  withInfo(title: string, message: string): this {
    this.payload.notificationType = 'info';
    this.payload.notificationTitle = title;
    this.payload.message = message;
    return this;
  }

  testNotification(message: string): this {
    this.payload.notificationType = 'info';
    this.payload.notificationTitle = 'Test Notification';
    this.payload.message = message;
    this.payload.notificationReferenceType = 'article';
    this.payload.referenceId = '00000000-0000-0000-0000-000000000000';
    return this;
  }

  build(): CreateNotificationInput {
    // Basic runtime validation to ensure all required fields are populated
    const missingFields: string[] = [];
    const required: Array<keyof CreateNotificationInput> = [
      'recipientId',
      'notificationTitle',
      'notificationReferenceType',
      'referenceId',
      'notificationType',
      'message',
    ];

    for (const field of required) {
      if (this.payload[field] === undefined) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      throw new Error(
        `NotificationBuilder is missing required fields: ${missingFields.join(', ')}`
      );
    }

    return this.payload as CreateNotificationInput;
  }
}
