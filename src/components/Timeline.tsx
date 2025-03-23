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

  * {
    max-width: 100%; // ✅ 하위 요소도 강제로 제한
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
