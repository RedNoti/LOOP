// home.tsx
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import YouTubeMusicPlayer from "./music";


interface Post {
  id: string;
  nickname: string;
  post: string;
  photoUrls: string[];
  photoUrl: string;
  createdAt: number;
  likeCount: number;
  commentCount: number;
  likedBy: string[];
}

const Container = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

const ContentArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  > div {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }
`;

const MusicPlayerWrapper = styled.div`
  width: 50%;
  min-width: 320px;
  height: 100%;
  padding: 1rem;
  box-sizing: border-box;
  overflow: hidden;
  background-color: rgb(13, 15, 18);
  border-radius: 15px;
  display: flex;
  flex-direction: column;

  > div {
    overflow-y: auto;
    flex: 1;
    min-height: 0;

    /* ✅ 스크롤바 투명 처리 */
    &::-webkit-scrollbar {
      width: 6px;
    }
    &::-webkit-scrollbar-thumb {
      background-color: transparent;
    }
    &:hover::-webkit-scrollbar-thumb {
      background-color: rgba(255, 255, 255, 0.2);
    }
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
  }

  @media (max-width: 768px) {
    width: 100%;
    height: auto;
    position: fixed;
    bottom: 0;
    left: 0;
    z-index: 100;
    border-radius: 0;
  }
`;

const TimelineContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 20px;
`;

const PostCard = styled.div`
  background-color: #1e1e1e;
  border-radius: 15px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ProfileImage = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
`;

const PostText = styled.p`
  color: white;
  margin: 0;
`;

const PostImageContainer = styled.div`
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 10px;
`;

const PostImage = styled.img`
  width: 200px;
  height: 200px;
  object-fit: cover;
  border-radius: 10px;
`;



const Timeline: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    const postQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(postQuery, (snapshot) => {
      const newPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Post));
      setPosts(newPosts);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return (
    <TimelineContainer>
      {posts.map((post) => (
        <PostCard key={post.id}>
          <UserInfo>
            <ProfileImage 
              src={post.photoUrl || '/default-profile.png'} 
              alt={`${post.nickname}'s profile`} 
            />
            <span>{post.nickname}</span>
          </UserInfo>
          {post.post && <PostText>{post.post}</PostText>}
          {post.photoUrls && post.photoUrls.length > 0 && (
            <PostImageContainer>
              {post.photoUrls.map((url, index) => (
                <PostImage 
                  key={index} 
                  src={url} 
                  alt={`Post image ${index + 1}`} 
                />
              ))}
            </PostImageContainer>
          )}
        </PostCard>
      ))}
    </TimelineContainer>
  );
};

export default Timeline;