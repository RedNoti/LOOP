// 📄 Timeline 컴포넌트 - 전체 게시글을 시간순으로 정렬하여 보여줍니다.
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
import Post from "../components/Post";

const Container = styled.div`
  // 🎨 styled-components 스타일 정의
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

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: transparent;
    border-radius: 6px;
    transition: background-color 0.2s;
  }

  &:hover::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.2);
  }

  * {
    max-width: 100%;
    word-break: break-word;
  }
`;

export default () => {
  const [posts, setPosts] = useState<IPost[]>([]);

  useEffect(() => {
    // 🔁 컴포넌트 마운트 시 실행되는 훅
    let unsubscribe: Unsubscribe | null = null;

    const fetchPostsRealtime = async () => {
      const path = collection(db, "posts"); // 📦 Firestore 컬렉션 참조
      const condition = orderBy("createdAt", "desc");
      const postsQuery = query(path, condition);

      unsubscribe = onSnapshot(postsQuery, (snapshot) => {
        // 📡 실시간 데이터 구독
        const timelinePosts = snapshot.docs.map((doc) => {
          const {
            createdAt,
            nickname,
            post,
            userId,
            email,
            photoUrls,
            photoUrl,
            playlist,
            playlistFileUrl, // ✅ 추가된 필드
          } = doc.data();

          return {
            createdAt,
            nickname,
            post,
            userId,
            email,
            photoUrls: photoUrls ?? [],
            photoUrl: photoUrl ?? "",
            playlist: playlist ?? null,
            playlistFileUrl: playlistFileUrl ?? null, // ✅ 누락 방지
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
