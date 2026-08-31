export interface Like {
  id: string;
  articleId: string;
  userId: string;
  createdAt: Date;
}

export interface LikeWithUser extends Like {
  userName: string;
  userImage: string | null;
}
