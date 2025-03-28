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
    let unsubscribe: Unsubscribe | null = null;

    const fetchPostsRealtime = async () => {
      const path = collection(db, "posts");
      const condition = orderBy("createdAt", "desc");
      const postsQuery = query(path, condition);

      unsubscribe = onSnapshot(postsQuery, (snapshot) => {
        const timelinePosts = snapshot.docs.map((doc) => {
          const {
            createdAt,
            nickname,
            post,
            userId,
            email,
            photoUrls,
            photoUrl,
          } = doc.data();

          return {
            createdAt,
            nickname,
            post,
            userId,
            email, // ✅ 추가된 부분
            photoUrls: photoUrls ?? [],
            photoUrl: photoUrl ?? "",
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
