/** 작성 게시글 타입 */
export type IPost = {
  id: string;
  userId: string;
  nickname: string;
  createdAt: number;
  post: string;
  photoUrls?: string[]; // 여러 이미지 URL 배열
  photoUrl?: string; // 프로필 이미지 URL 추가
}