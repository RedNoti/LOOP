// src/screens/KategorieScreen.tsx
import React, { useCallback, useMemo, useState } from "react";
import styled, { ThemeProvider, createGlobalStyle } from "styled-components";
import { fetchOptimizedVideos, KItem } from "../components/KategorieFunction";
import { playFromKategorieSearch } from "../components/MusicFunction";
import { useTheme } from "../components/ThemeContext";

// styled-components 타입 확장
declare module 'styled-components' {
  export interface DefaultTheme extends CustomTheme {}
}

// ====== 타입 정의 ======
interface CustomTheme {
  background: string;
  cardBackground: string;
  textColor: string;
  secondaryText: string;
  borderColor: string;
  inputBackground: string;
  inputFocusBackground: string;
}

// ====== 상수 정의 ======
const CONSTANTS = {
  GRID_COLUMNS: 4,
  ITEMS_PER_PAGE: 4,
} as const;

// ====== 테마 정의 ======
const lightTheme: CustomTheme = {
  background: "#ffffff",
  cardBackground: "#ffffff",
  textColor: "#1a1a1a",
  secondaryText: "#8e8e93",
  borderColor: "#f0f0f0",
  inputBackground: "#fafafa",
  inputFocusBackground: "#ffffff",
};

const darkTheme: CustomTheme = {
  background: "#000000",
  cardBackground: "#202020",
  textColor: "#ffffff",
  secondaryText: "#cccccc",
  borderColor: "#404040",
  inputBackground: "#303030",
  inputFocusBackground: "#404040",
};

const GlobalStyle = createGlobalStyle`
  html, body, #root { 
    height: 100%; 
    background: ${({ theme }) => theme.background}; 
  }
  body {
    margin: 0;
    color: ${({ theme }) => theme.textColor};
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  * { box-sizing: border-box; }
  ::selection {
    background: #007aff;
    color: white;
  }
`;

// ====== 스타일드 컴포넌트 (KategorieStyle 구조 적용) ======
const PageWrapper = styled.div<{ theme: CustomTheme }>`
  background-color: ${({ theme }) => theme.background};
  min-height: 100vh;
  transition: background-color 0.3s ease;
`;

const Wrapper = styled.div<{ theme: CustomTheme }>`
  padding: 25px 40px 40px 40px;
  background-color: ${({ theme }) => theme.background};
  color: ${({ theme }) => theme.textColor};
  min-height: 100vh;
  transition: all 0.3s ease;
`;

const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const SectionTitle = styled.h2<{ clickable?: boolean; theme: CustomTheme }>`
  color: ${({ theme }) => theme.textColor};
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 24px;
  flex-grow: 1;
  cursor: ${(props) => (props.clickable ? "pointer" : "default")};
  transition: all 0.15s ease-out;

  &:hover {
    opacity: ${(props) => (props.clickable ? "0.8" : "1")};
  }

  &:active {
    transform: ${(props) => (props.clickable ? "scale(0.95)" : "none")};
  }
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 24px;
`;

const SearchInput = styled.input<{ theme: CustomTheme }>`
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.borderColor};
  border-radius: 4px;
  font-size: 1rem;
  flex-grow: 1;
  color: ${({ theme }) => theme.textColor};
  background: ${({ theme }) => theme.inputBackground};
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #007aff;
    background: ${({ theme }) => theme.inputFocusBackground};
  }

  &::placeholder {
    color: ${({ theme }) => theme.secondaryText};
  }
`;

const SearchButton = styled.button<{ theme: CustomTheme }>`
  padding: 4px;
  color: ${({ theme }) => theme.textColor};
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1.5rem;
  background-color: transparent;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${({ theme }) => theme.borderColor};
  }

  &:active {
    background-color: transparent;
    transform: scale(0.9);
  }
`;

const AlbumCard = styled.div<{ theme: CustomTheme }>`
  padding: 12px;
  border-radius: 4px;
  text-align: left;
  background-color: ${({ theme }) => theme.cardBackground};
  border: 1px solid ${({ theme }) => theme.borderColor};
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

    img {
      transform: scale(1.05);
    }

    &::after {
      opacity: 1;
    }
  }

  &::after {
    content: "▶";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 24px;
    opacity: 0;
    transition: opacity 0.3s ease;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
    pointer-events: none;
  }
`;

const ImageWrapper = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 8px;
`;

const AlbumImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
`;

const DurationOverlay = styled.div`
  position: absolute;
  right: 8px;
  bottom: 8px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  font-size: 0.85rem;
  padding: 2px 6px;
  border-radius: 4px;
  z-index: 2;
`;

const AlbumTitle = styled.div<{ theme: CustomTheme }>`
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme }) => theme.textColor};
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const AlbumDescription = styled.div<{ theme: CustomTheme }>`
  font-size: 12px;
  color: ${({ theme }) => theme.secondaryText};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  height: 32px;
`;

const CardGrid = styled.div<{ $expanded: boolean }>`
  display: grid;
  grid-template-columns: repeat(${CONSTANTS.GRID_COLUMNS}, 1fr);
  gap: 12px;
  transition: all 0.3s ease;
  margin-bottom: 20px;

  & > ${AlbumCard} {
    display: ${(props) => (props.$expanded ? "block" : "none")};
    &:nth-child(-n + ${CONSTANTS.ITEMS_PER_PAGE}) {
      display: block;
    }
  }
`;

const ToggleButton = styled.button<{ theme: CustomTheme }>`
  background: none;
  border: none;
  color: ${({ theme }) => theme.secondaryText};
  font-size: 14px;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 10px;
  transition: all 0.2s ease;
  display: block;
  margin: 16px auto 48px;

  &:hover {
    background-color: ${({ theme }) => theme.borderColor};
  }

  &:active {
    transform: scale(0.95);
  }
`;

const StatusMessage = styled.p<{ theme: CustomTheme }>`
  color: ${({ theme }) => theme.secondaryText};
  text-align: center;
  padding: 20px;
  font-size: 16px;
`;

const ErrorMessage = styled.div`
  background-color: #fee;
  border: 1px solid #fcc;
  color: #c33;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  text-align: center;
`;

// Station.tsx 스타일의 버튼 컴포넌트들
const ButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
`;

const ActionButton = styled.button`
  /* Station.tsx의 PlayButton 스타일과 동일 */
  border: none;
  background: #3c3c3c;
  color: #f0f0f0;
  border-radius: 6px;
  padding: 8px 10px;
  font-weight: 600;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s ease;

  &:hover {
    background: #505050;
  }

  &:active {
    transform: scale(0.98);
  }
`;

// ====== 유틸리티 함수들 ======
function decodeHtmlEntities(str: string): string {
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
}

function formatDuration(durationMs: number): string {
  if (!durationMs) return "";
  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return (
    (hours > 0 ? `${hours}:` : "") +
    `${minutes < 10 && hours > 0 ? "0" : ""}${minutes}:${seconds < 10 ? "0" : ""}${seconds}`
  );
}

// ====== 컴포넌트 분리 ======
const VideoCard: React.FC<{
  video: any;
  onPlay: (video: any) => void;
  onAddToNewPlaylist: (video: any) => void;
  onAddToCurrentPlaylist: (video: any) => void;
}> = React.memo(({ video, onPlay, onAddToNewPlaylist, onAddToCurrentPlaylist }) => {
  const handlePlayClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onPlay(video);
  }, [video, onPlay]);

  const handleAddToNewClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToNewPlaylist(video);
  }, [video, onAddToNewPlaylist]);

  const handleAddToCurrentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCurrentPlaylist(video);
  }, [video, onAddToCurrentPlaylist]);

  return (
    <AlbumCard>
      <ImageWrapper onClick={handlePlayClick}>
        <AlbumImage
          src={
            video.thumbnails?.medium?.url ||
            video.thumbnails?.high?.url ||
            video.thumbnails?.default?.url
          }
          alt={video.title}
          loading="lazy"
        />
        {video.durationMs && (
          <DurationOverlay>
            {formatDuration(video.durationMs)}
          </DurationOverlay>
        )}
      </ImageWrapper>
      <AlbumTitle>{decodeHtmlEntities(video.title)}</AlbumTitle>
      <AlbumDescription>
        {video.channelTitle} • {video.durationMs ? formatDuration(video.durationMs) : "정보 없음"}
      </AlbumDescription>
      
      {/* Station.tsx 스타일의 버튼들 */}
      <ButtonContainer>
        <ActionButton onClick={handleAddToNewClick}>
          ▶ 새 재생목록에 저장
        </ActionButton>
        <ActionButton onClick={handleAddToCurrentClick}>
          ▶ 현재 재생목록에 저장
        </ActionButton>
      </ButtonContainer>
    </AlbumCard>
  );
});

VideoCard.displayName = "VideoCard";

// ====== Screen (UI only, 로직은 훅에서) ======
const GENRES = ["J-POP", "BALLAD", "HIPHOP", "LOFI", "POP 2024"];

function InnerKategorieScreen() {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<string | null>(null);
  const [items, setItems] = useState<KItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { isDarkMode } = useTheme();

  // 검색 함수
  const search = useCallback(async (term: string) => {
    if (!term?.trim()) {
      setItems([]);
      return;
    }
    
    setLoading(true);
    try {
      const results = await fetchOptimizedVideos(term);
      setItems(results);
    } finally {
      setLoading(false);
    }
  }, []);

  // 재생 함수
  const playFromIndex = useCallback((index: number) => {
    playFromKategorieSearch(query, index);
  }, [query]);

  // 장르 선택 함수
  const onSelectGenre = (g: string) => {
    setGenre(g);
    search(g);
  };

  const handlePlaylistTitleClick = useCallback(() => {
    setQuery("");
    setGenre(null);
    console.log("🏠 장르 목록으로 돌아가기");
  }, []);

  // 새로 추가할 함수들 (Station.tsx 스타일)
  const handleAddToNewPlaylist = useCallback((video: any) => {
    const playlistName = prompt("새 재생목록 이름을 입력하세요:");
    if (playlistName) {
      // 기존 playPlaylistFromFile 함수를 직접 사용
      const playlistData = {
        id: `custom:${playlistName}:${Date.now()}`,
        title: playlistName,
        thumbnail: video?.thumbnails?.medium?.url ?? "",
        tracks: [{
          videoId: video.id,
          title: video.title,
          thumbnail: video?.thumbnails?.medium?.url ?? "",
        }],
        startIndex: 0,
      };
      
      // MusicFunction에서 직접 import해서 사용
      import("../components/MusicFunction").then(({ playPlaylistFromFile }) => {
        playPlaylistFromFile(playlistData);
      });
    }
  }, []);

  const handleAddToCurrentPlaylist = useCallback((video: any) => {
    // 현재 재생목록에 추가하는 로직은 나중에 구현
    console.log("현재 재생목록에 추가:", video.title);
  }, []);

  const styledTheme = useMemo(
    () => isDarkMode ? darkTheme : lightTheme,
    [isDarkMode]
  );

  return (
    <PageWrapper>
      <Wrapper>
        <HeaderContainer>
          <SectionTitle clickable onClick={handlePlaylistTitleClick}>
            Playlist 🎧
          </SectionTitle>
        </HeaderContainer>

        <SearchContainer>
          <SearchInput
            type="text"
            placeholder="원하시는 음악을 검색해보세요!"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                search(query);
              }
            }}
          />
          <SearchButton onClick={() => search(query)}>
            🔍
          </SearchButton>
        </SearchContainer>

        <div style={{ marginBottom: '24px' }}>
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => onSelectGenre(g)}
              style={{
                padding: '8px 12px',
                margin: '0 8px 8px 0',
                borderRadius: '20px',
                border: `1px solid ${genre === g ? '#007aff' : styledTheme.borderColor}`,
                background: genre === g ? '#007aff' : 'transparent',
                color: genre === g ? 'white' : styledTheme.textColor,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {g}
            </button>
          ))}
        </div>

        {loading && <StatusMessage>검색 중입니다...</StatusMessage>}
        {!loading && items.length === 0 && <StatusMessage>검색 결과가 없습니다.</StatusMessage>}

        {items.length > 0 && (
          <CardGrid $expanded={true}>
            {items.map((video: any, index: any) => (
              <VideoCard
                key={video.id}
                video={video}
                onPlay={() => playFromIndex(index)}
                onAddToNewPlaylist={handleAddToNewPlaylist}
                onAddToCurrentPlaylist={handleAddToCurrentPlaylist}
              />
            ))}
          </CardGrid>
        )}
      </Wrapper>
    </PageWrapper>
  );
}

// ====== Export (이 파일 하나로 테마까지 적용) ======
export default function KategorieScreen() {
  const { isDarkMode } = useTheme();
  const styledTheme = useMemo(
    () => isDarkMode ? darkTheme : lightTheme,
    [isDarkMode]
  );

  return (
    <ThemeProvider theme={styledTheme}>
      <GlobalStyle />
      <InnerKategorieScreen />
    </ThemeProvider>
  );
}
