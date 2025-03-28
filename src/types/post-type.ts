/** 작성 게시글 타입 */
export type IPost = {
  post: string;
  nickname: string;
  userId: string;
  createdAt: number;
  photoUrl?: string;
  id: string;
  photoUrls?: string[];
  email: string;
};
