import { useEffect, useState } from "react";
import styled from "styled-components";
import { IPost } from "../types/post-type";
import {
  Unsubscribe,
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import Post from "./Post";

// ✅ 유동적 레이아웃을 위한 스타일 적용
const Container = styled.div`
  /* 기존 스타일 유지 */
  flex: 1;
  width: 100%;
  height: 100%;
  max-width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-height: 0;

  /* ✅ 스크롤바 투명하게 만들기 */
  &::-webkit-scrollbar {
    width: 6px; /* 너비 설정 */
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: transparent; /* 완전 투명 */
    border-radius: 6px;
    transition: background-color 0.2s;
  }

  &:hover::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.2); /* 살짝 보이게 */
  }

  * {
    max-width: 100%;
    word-break: break-word;
  }
`;

export default () => {
  const [posts, setPosts] = useState<IPost[]>([]);

  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;

    const fetchPostsRealtime = async () => {
      const path = collection(db, "posts");
      const condition = orderBy("createdAt", "desc");
      const postsQuery = query(path, condition);

      unsubscribe = onSnapshot(postsQuery, (snapshot) => {
        const timelinePosts = snapshot.docs.map((doc) => {
          const { createdAt, nickname, post, userId } = doc.data() as IPost;
          return {
            createdAt,
            nickname,
            post,
            userId,
            id: doc.id,
          };
        });
        setPosts(timelinePosts);
      });
    };

    fetchPostsRealtime();

    return () => {
      unsubscribe && unsubscribe();
    };
  }, []);

  return (
    <Container>
      {posts.map((post) => (
        <Post key={post.id} {...post} />
      ))}
    </Container>
  );
};
