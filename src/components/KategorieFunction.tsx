import { useNavigate } from "react-router-dom";
import { useState } from "react";

import styled from "styled-components";

// 장르 선택 버튼 스타일
const GenreButton = styled.button`
  padding: 10px 20px;
  margin: 5px;
  border-radius: 30px;
  border: 1px solid #19315d;
  background-color: #19315d;
  color: white;
  font-weight: bold;
  cursor: pointer;
  &:hover {
    background-color: #118bf0;
  }
`;

// 선택된 장르 텍스트 스타일
const SelectedGenre = styled.div`
  margin-top: 20px;
  font-size: 18px;
  font-weight: bold;
  color: #19315d;
`;

const KategorieFunction = () => {
  const [selectedGenre, setSelectedGenre] = useState<string>("");

  // 장르 선택 함수
  const handleGenreSelect = (genre: string) => {
    setSelectedGenre(genre);
  };

  return (
    <div>
      <h1>장르를 선택하세요</h1>
      <div>
        <GenreButton onClick={() => handleGenreSelect("K-POP")}>
          K-POP
        </GenreButton>
        <GenreButton onClick={() => handleGenreSelect("J-POP")}>
          J-POP
        </GenreButton>
        <GenreButton onClick={() => handleGenreSelect("인디")}>
          인디
        </GenreButton>
        <GenreButton onClick={() => handleGenreSelect("발라드")}>
          발라드
        </GenreButton>
        <GenreButton onClick={() => handleGenreSelect("OST")}>OST</GenreButton>
      </div>
      {selectedGenre && (
        <SelectedGenre>선택된 장르: {selectedGenre}</SelectedGenre>
      )}
    </div>
  );
};

export default KategorieFunction;
