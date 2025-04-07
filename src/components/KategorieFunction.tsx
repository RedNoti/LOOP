import styled from "styled-components";
import { useState } from "react";

const AlbumCard = styled.div`
  width: 200px;
  padding: 20px;
  border-radius: 20px;
  text-align: center;
  background-color: transparent;
  transition: background-color 0.3s ease;
  cursor: pointer;

  &:hover {
    background-color: #0b1f3a; /* hover 시 색상 */
  }
`;

const AlbumImage = styled.img`
  width: 100%;
  border-radius: 12px;
`;

const AlbumTitle = styled.div`
  margin-top: 10px;
  font-size: 18px;
  font-weight: bold;
  color: white;
`;

const AlbumListWrapper = styled.div`
  display: flex;
  justify-content: center;
  gap: 30px;
  background: linear-gradient(#776f80, #d7b8b8); /* 배경은 예시야 */
  padding: 40px 0;
`;

const albums = [
  {
    title: "김치나베",
    image: "/images/kimchi.png", // 이미지 경로는 네 프로젝트에 맞게!
  },
  {
    title: "제이팝",
    image: "/images/jpop.png",
  },
  {
    title: "왁타버스 오리지널 & 스피커",
    image: "/images/waktaverse.png",
  },
];

const AlbumList = () => {
  return (
    <AlbumListWrapper>
      {albums.map((album) => (
        <AlbumCard key={album.title}>
          <AlbumImage src={album.image} alt={album.title} />
          <AlbumTitle>{album.title}</AlbumTitle>
        </AlbumCard>
      ))}
    </AlbumListWrapper>
  );
};

export default AlbumList;
