// src/screens/KategorieScreen.tsx
import React, { useCallback, useMemo, useState } from "react";
import styled, { ThemeProvider, createGlobalStyle } from "styled-components";
import { fetchOptimizedVideos, KItem } from "../components/KategorieFunction";
import { playFromKategorieSearch } from "../components/MusicFunction";
import { useTheme } from "../components/ThemeContext";
import AISearchBar from "../components/AISearchBar";
import { useAISearch } from "../hook/useAISearch";

// styled-components 타입 확장
declare module "styled-components" {
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

// ====== 테마 정의 (네온-글래스 팔레트) ======
const lightTheme: CustomTheme = {
  background: "#0b0b10",
  cardBackground: "rgba(18, 20, 28, 0.65)",
  textColor: "#F4F6FB",
  secondaryText: "#A9B1C3",
  borderColor: "rgba(255,255,255,0.12)",
  inputBackground: "rgba(8, 10, 16, 0.55)",
  inputFocusBackground: "rgba(8, 10, 16, 0.75)",
};

const darkTheme: CustomTheme = {
  background: "#0b0b10",
  cardBackground: "rgba(18, 20, 28, 0.65)",
  textColor: "#F4F6FB",
  secondaryText: "#A9B1C3",
  borderColor: "rgba(255,255,255,0.12)",
  inputBackground: "rgba(8, 10, 16, 0.55)",
  inputFocusBackground: "rgba(8, 10, 16, 0.75)",
};

const GlobalStyle = createGlobalStyle`
  html, body, #root {
    height: 100%;
    background:
      radial-gradient(1200px 800px at 10% 10%, rgba(64,141,255,0.20), transparent 40%),
      radial-gradient(900px 700px at 90% 20%, rgba(255,99,171,0.20), transparent 45%),
      radial-gradient(1200px 900px at 30% 80%, rgba(115,255,182,0.16), transparent 50%),
      ${({ theme }) => theme.background};
  }
  body {
    margin: 0;
    color: ${({ theme }) => theme.textColor};
    font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  * { box-sizing: border-box; }
  ::selection { background: rgba(98, 158, 255, .35); color: #fff; }
  :focus-visible {
    outline: 2px solid transparent;
    box-shadow: 0 0 0 4px rgba(122, 146, 255, .35);
    border-radius: 12px;
  }
`;

// ====== 스타일드 컴포넌트 (디자인만 변경) ======
const PageWrapper = styled.div<{ theme: CustomTheme }>`
  min-height: 100vh;
  @supports (backdrop-filter: blur(6px)) {
    backdrop-filter: blur(2px);
  }
  transition: backdrop-filter 0.3s ease;
`;

const Wrapper = styled.div<{ theme: CustomTheme }>`
  padding: 32px clamp(16px, 4vw, 44px) 44px;
  color: ${({ theme }) => theme.textColor};
  min-height: 100vh;
`;

const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 18px;
`;

const SectionTitle = styled.h2<{ $clickable?: boolean; theme: CustomTheme }>`
  color: ${({ theme }) => theme.textColor};
  font-size: clamp(22px, 2.4vw, 30px);
  font-weight: 900;
  letter-spacing: -0.01em;
  margin: 0 0 6px 0;
  flex-grow: 1;
  cursor: ${(p) => (p.$clickable ? "pointer" : "default")};
  transition: transform 0.12s ease, opacity 0.12s ease, text-shadow 0.2s ease;

  &:hover {
    opacity: ${(p) => (p.$clickable ? 0.92 : 1)};
    text-shadow: 0 0 24px rgba(120, 160, 255, 0.25);
  }
  &:active {
    transform: ${(p) => (p.$clickable ? "scale(0.985)" : "none")};
  }
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 18px 0 20px;
`;

const SearchInput = styled.input<{ theme: CustomTheme }>`
  padding: 14px 16px;
  border: 1px solid ${({ theme }) => theme.borderColor};
  border-radius: 14px;
  font-size: 14px;
  flex-grow: 1;
  color: ${({ theme }) => theme.textColor};
  background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.06),
      rgba(255, 255, 255, 0.02)
    ),
    ${({ theme }) => theme.inputBackground};
  backdrop-filter: blur(6px);
  transition: border-color 0.18s ease, box-shadow 0.18s ease,
    background 0.18s ease;

  &:focus {
    outline: none;
    border-color: rgba(124, 154, 255, 0.45);
    background: linear-gradient(
        180deg,
        rgba(124, 154, 255, 0.08),
        rgba(255, 255, 255, 0.02)
      ),
      ${({ theme }) => theme.inputFocusBackground};
    box-shadow: inset 0 0 0 1px rgba(124, 154, 255, 0.25),
      0 8px 28px rgba(124, 154, 255, 0.18);
  }
  &::placeholder {
    color: ${({ theme }) => theme.secondaryText};
  }
`;

const SearchButton = styled.button<{ theme: CustomTheme }>`
  padding: 12px 14px;
  border: 1px solid ${({ theme }) => theme.borderColor};
  border-radius: 12px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 900;
  color: #0b0b12;
  background: linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.2),
        rgba(255, 255, 255, 0)
      )
      border-box,
    radial-gradient(120% 200% at 0% 0%, #8bc6ff 0%, #6db2ff 40%, #ff8dc0 100%)
      padding-box;
  box-shadow: 0 10px 24px rgba(124, 154, 255, 0.25);
  transition: transform 0.08s ease, filter 0.18s ease, box-shadow 0.2s ease;

  &::before {
    content: "🚀";
    margin-right: 6px;
  }
  &:hover {
    filter: brightness(1.05);
    box-shadow: 0 14px 34px rgba(124, 154, 255, 0.32);
  }
  &:active {
    transform: translateY(1px) scale(0.99);
  }
`;

const AlbumCard = styled.div<{ theme: CustomTheme }>`
  padding: 12px;
  border-radius: 18px;
  text-align: left;
  background: radial-gradient(
      120% 120% at 80% -10%,
      rgba(120, 180, 255, 0.1),
      transparent 40%
    ),
    radial-gradient(
      120% 120% at -10% 110%,
      rgba(255, 125, 190, 0.1),
      transparent 45%
    ),
    ${({ theme }) => theme.cardBackground};
  border: 1px solid transparent;
  background-clip: padding-box;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.25s ease,
    border-color 0.2s ease;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 18px;
    padding: 1px;
    background: linear-gradient(
      135deg,
      rgba(124, 154, 255, 0.55),
      rgba(255, 130, 190, 0.45)
    );
    -webkit-mask: linear-gradient(#000 0 0) content-box,
      linear-gradient(#000 0 0);
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
    opacity: 0.35;
    transition: opacity 0.25s ease;
  }

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35),
      0 6px 18px rgba(124, 154, 255, 0.18);
  }
  &:hover::before {
    opacity: 0.75;
  }
`;

const ImageWrapper = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 10px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.06),
    rgba(0, 0, 0, 0.2)
  );
`;

const AlbumImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.01);
  transition: transform 0.28s ease, filter 0.28s ease;

  ${AlbumCard}:hover & {
    transform: scale(1.05);
    filter: saturate(1.05) contrast(1.02);
  }
`;

const DurationOverlay = styled.div`
  position: absolute;
  right: 10px;
  bottom: 10px;
  background: rgba(6, 8, 12, 0.7);
  color: #eaf0ff;
  font-size: 12px;
  font-weight: 900;
  padding: 4px 8px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(6px);
  z-index: 2;
`;

const AlbumTitle = styled.div<{ theme: CustomTheme }>`
  font-size: 15px;
  font-weight: 900;
  color: ${({ theme }) => theme.textColor};
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
  text-shadow: 0 0 12px rgba(124, 154, 255, 0.12);
`;

const AlbumDescription = styled.div<{ theme: CustomTheme }>`
  font-size: 12px;
  color: ${({ theme }) => theme.secondaryText};
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 32px;
`;

const CardGrid = styled.div<{ $expanded: boolean }>`
  display: grid;
  grid-template-columns: repeat(${CONSTANTS.GRID_COLUMNS}, 1fr);
  gap: 18px;
  margin-bottom: 26px;
  transition: gap 0.2s ease;

  @media (max-width: 1280px) {
    grid-template-columns: repeat(3, 1fr);
  }
  @media (max-width: 920px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }

  & > ${AlbumCard} {
    display: ${(p) => (p.$expanded ? "block" : "none")};
  }
  & > ${AlbumCard}:nth-child(-n + ${CONSTANTS.ITEMS_PER_PAGE}) {
    display: block;
  }
`;

const ToggleButton = styled.button<{ theme: CustomTheme }>`
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.06),
    rgba(255, 255, 255, 0.02)
  );
  border: 1px solid ${({ theme }) => theme.borderColor};
  color: ${({ theme }) => theme.secondaryText};
  font-size: 14px;
  cursor: pointer;
  padding: 10px 16px;
  border-radius: 12px;
  display: block;
  margin: 16px auto 48px;
  transition: filter 0.18s ease, transform 0.08s ease, border-color 0.2s ease;

  &:hover {
    filter: brightness(1.06);
    border-color: rgba(124, 154, 255, 0.42);
  }
  &:active {
    transform: translateY(1px) scale(0.99);
  }
`;

const StatusMessage = styled.p<{ theme: CustomTheme }>`
  color: ${({ theme }) => theme.secondaryText};
  text-align: center;
  padding: 26px 20px;
  font-size: 14px;
`;

const ErrorMessage = styled.div`
  background: rgba(255, 64, 64, 0.08);
  border: 1px solid rgba(255, 64, 64, 0.35);
  color: #ff9595;
  padding: 14px 16px;
  border-radius: 14px;
  margin-bottom: 18px;
  text-align: center;
`;

const ButtonContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
`;

const ActionButton = styled.button`
  border: 1px solid rgba(124, 154, 255, 0.55);
  background: linear-gradient(
    180deg,
    rgba(124, 154, 255, 0.1),
    rgba(124, 154, 255, 0.04)
  );
  color: #cfe0ff;
  border-radius: 12px;
  padding: 10px 12px;
  font-weight: 900;
  cursor: pointer;
  font-size: 12px;
  letter-spacing: 0.02em;
  transition: transform 0.08s ease, filter 0.18s ease, border-color 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    filter: brightness(1.05);
    border-color: rgba(255, 130, 190, 0.65);
    box-shadow: 0 8px 24px rgba(124, 154, 255, 0.22);
  }
  &:active {
    transform: translateY(1px) scale(0.99);
  }
`;

/* ====== LOOP AI 섹션 + 검색 바 전용 스타일 ====== */
const AIBlock = styled.div<{ theme: CustomTheme }>`
  position: relative;
  background: radial-gradient(
      110% 120% at 100% -20%,
      rgba(120, 180, 255, 0.1),
      transparent 40%
    ),
    radial-gradient(
      110% 120% at -20% 120%,
      rgba(255, 125, 190, 0.1),
      transparent 45%
    ),
    ${({ theme }) => theme.cardBackground};
  border-radius: 16px;
  padding: 18px;
  border: 1px solid transparent;
  background-clip: padding-box;
  box-shadow: 0 10px 28px rgba(16, 24, 40, 0.14);
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    padding: 1px;
    border-radius: 16px;
    background: linear-gradient(
      135deg,
      rgba(124, 154, 255, 0.55),
      rgba(255, 130, 190, 0.45)
    );
    -webkit-mask: linear-gradient(#000 0 0) content-box,
      linear-gradient(#000 0 0);
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
    opacity: 0.5;
  }
`;

const AITitle = styled.h3<{ theme: CustomTheme }>`
  margin: 0 0 10px 0;
  font-size: 16px;
  font-weight: 900;
  letter-spacing: -0.01em;
  color: #cdefd8;
`;

const AIText = styled.div<{ theme: CustomTheme }>`
  white-space: pre-line;
  line-height: 1.75;
  font-size: 14px;
  color: ${({ theme }) => theme.textColor};
`;

const AIParsed = styled.div<{ theme: CustomTheme }>`
  margin-top: 12px;
  padding: 10px;
  border-radius: 12px;
  border: 1px dashed ${({ theme }) => theme.borderColor};
  background: rgba(255, 255, 255, 0.03);
`;

const AIParsedHeader = styled.div<{ theme: CustomTheme }>`
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 900;
  color: ${({ theme }) => theme.secondaryText};
`;

const AITrackRow = styled.div<{ theme: CustomTheme }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid ${({ theme }) => theme.borderColor};
  &:last-child {
    border-bottom: 0;
  }
  font-size: 13px;
`;

const AITrackInfo = styled.div<{ theme: CustomTheme }>`
  flex: 1;
  min-width: 0;
  strong {
    color: ${({ theme }) => theme.textColor};
  }
  span {
    color: ${({ theme }) => theme.secondaryText};
  }
`;

const AITrackMeta = styled.div`
  font-size: 11px;
  opacity: 0.9;
  margin-top: 2px;
`;

const AIButtons = styled.div`
  display: flex;
  gap: 6px;
  flex-shrink: 0;
`;

const AIButton = styled.button<{ theme: CustomTheme }>`
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.01em;
  background: transparent;
  cursor: pointer;
  color: ${({ theme }) => theme.textColor};
  border: 1px solid ${({ theme }) => theme.borderColor};
  border-radius: 10px;
  transition: transform 0.08s ease, filter 0.18s ease, border-color 0.2s ease,
    box-shadow 0.2s ease;

  &:hover {
    filter: brightness(1.05);
    border-color: rgba(124, 154, 255, 0.55);
    box-shadow: 0 6px 18px rgba(124, 154, 255, 0.18);
  }
  &:active {
    transform: translateY(1px) scale(0.99);
  }
`;

/* ====== LOOP AI 검색 바(입력+버튼) 리스킨 ====== */
const AIBarCard = styled.div<{ theme: CustomTheme }>`
  position: relative;
  margin: 10px 0 18px;
  padding: 16px;
  border-radius: 16px;
  background: radial-gradient(
      110% 120% at 100% -20%,
      rgba(120, 180, 255, 0.1),
      transparent 40%
    ),
    radial-gradient(
      110% 120% at -20% 120%,
      rgba(255, 125, 190, 0.1),
      transparent 45%
    ),
    ${({ theme }) => theme.cardBackground};
  border: 1px solid transparent;
  background-clip: padding-box;
  box-shadow: 0 10px 28px rgba(16, 24, 40, 0.14);
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    padding: 1px;
    border-radius: 16px;
    background: linear-gradient(
      135deg,
      rgba(124, 154, 255, 0.55),
      rgba(255, 130, 190, 0.45)
    );
    -webkit-mask: linear-gradient(#000 0 0) content-box,
      linear-gradient(#000 0 0);
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
    opacity: 0.5;
  }
`;

const AIBarHeader = styled.div<{ theme: CustomTheme }>`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 900;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.textColor};
  margin: 2px 0 12px;
  font-size: 15px;
  &::before {
    content: "";
  }
`;

/* AISearchBar를 className으로 래핑 */
const StyledAISearchBar = styled(AISearchBar)<{ theme: CustomTheme }>`
  display: flex;
  gap: 10px;
  align-items: center;

  & input[type="text"],
  & input:not([type]) {
    flex: 1;
    padding: 14px 16px;
    border-radius: 14px;
    border: 1px solid ${({ theme }) => theme.borderColor};
    color: ${({ theme }) => theme.textColor};
    background: linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.06),
        rgba(255, 255, 255, 0.02)
      ),
      ${({ theme }) => theme.inputBackground};
    backdrop-filter: blur(6px);
    font-size: 14px;
    transition: border-color 0.18s ease, box-shadow 0.18s ease,
      background 0.18s ease;

    &::placeholder {
      color: ${({ theme }) => theme.secondaryText};
    }

    &:focus {
      outline: none;
      border-color: rgba(124, 154, 255, 0.45);
      background: linear-gradient(
          180deg,
          rgba(124, 154, 255, 0.08),
          rgba(255, 255, 255, 0.02)
        ),
        ${({ theme }) => theme.inputFocusBackground};
      box-shadow: inset 0 0 0 1px rgba(124, 154, 255, 0.25),
        0 8px 28px rgba(124, 154, 255, 0.18);
    }
  }

  & button {
    padding: 12px 16px;
    border-radius: 12px;
    border: 1px solid rgba(124, 154, 255, 0.42);
    color: #0b0b12;
    font-weight: 900;
    font-size: 13px;
    cursor: pointer;
    background: linear-gradient(
          180deg,
          rgba(255, 255, 255, 0.2),
          rgba(255, 255, 255, 0)
        )
        border-box,
      radial-gradient(120% 200% at 0% 0%, #8bc6ff 0%, #6db2ff 40%, #ff8dc0 100%)
        padding-box;
    box-shadow: 0 10px 24px rgba(124, 154, 255, 0.25);
    transition: transform 0.08s ease, filter 0.18s ease, box-shadow 0.2s ease;

    &::before {
      content: "";
      margin-right: 6px;
    }
    &:hover {
      filter: brightness(1.05);
      box-shadow: 0 14px 34px rgba(124, 154, 255, 0.32);
    }
    &:active {
      transform: translateY(1px) scale(0.99);
    }
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
    `${minutes < 10 && hours > 0 ? "0" : ""}${minutes}:${
      seconds < 10 ? "0" : ""
    }${seconds}`
  );
}

// ====== 컴포넌트 분리 ======
const VideoCard: React.FC<{
  video: any;
  onPlay: (video: any) => void;
  onAddToNewPlaylist: (video: any) => void;
  onAddToCurrentPlaylist: (video: any) => void;
}> = React.memo(
  ({ video, onPlay, onAddToNewPlaylist, onAddToCurrentPlaylist }) => {
    const handlePlayClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onPlay(video);
      },
      [video, onPlay]
    );

    const handleAddToNewClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onAddToNewPlaylist(video);
      },
      [video, onAddToNewPlaylist]
    );

    const handleAddToCurrentClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onAddToCurrentPlaylist(video);
      },
      [video, onAddToCurrentPlaylist]
    );

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
          {video.channelTitle} •{" "}
          {video.durationMs ? formatDuration(video.durationMs) : "정보 없음"}
        </AlbumDescription>

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
  }
);

VideoCard.displayName = "VideoCard";

// ====== Screen (UI only, 로직은 훅에서) ======
const GENRES = ["J-POP", "BALLAD", "HIPHOP", "LOFI", "POP 2024"];

function InnerKategorieScreen() {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<string | null>(null);
  const [items, setItems] = useState<KItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { isDarkMode } = useTheme();
  const {
    recommendations,
    tracks,
    loading: aiLoading,
    error: aiError,
    searchWithAI,
    playTrack,
  } = useAISearch();

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
      sessionStorage.setItem(
        `kategorieSearch:${term}`,
        JSON.stringify(results)
      );
      console.log(`검색 결과 저장: "${term}" - ${results.length}개 비디오`);
    } finally {
      setLoading(false);
    }
  }, []);

  // 재생 함수
  const playFromIndex = useCallback(
    (index: number) => {
      playFromKategorieSearch(query, index);
    },
    [query]
  );

  // 장르 선택 함수
  const onSelectGenre = (g: string) => {
    setGenre(g);
    search(g);
  };

  const handlePlaylistTitleClick = useCallback(() => {
    setQuery("");
    setGenre(null);
    console.log("장르 목록으로 돌아가기");
  }, []);

  // 새로 추가할 함수들 (Station.tsx 스타일)
  const handleAddToNewPlaylist = useCallback((video: any) => {
    const playlistName = prompt("새 재생목록 이름을 입력하세요:");
    if (playlistName) {
      const playlistData = {
        id: `custom:${playlistName}:${Date.now()}`,
        title: playlistName,
        thumbnail: video?.thumbnails?.medium?.url ?? "",
        tracks: [
          {
            videoId: video.id,
            title: video.title,
            thumbnail: video?.thumbnails?.medium?.url ?? "",
          },
        ],
        startIndex: 0,
      };
      import("../components/MusicFunction").then(({ playPlaylistFromFile }) => {
        playPlaylistFromFile(playlistData);
      });
    }
  }, []);

  const handleAddToCurrentPlaylist = useCallback((videoOrTrack: any) => {
    const currentPlaylistId = sessionStorage.getItem("currentPlaylistId");
    const playlists = JSON.parse(sessionStorage.getItem("playlists") || "[]");

    if (!currentPlaylistId) {
      alert("현재 재생 중인 재생목록이 없습니다.");
      return;
    }
    const currentPlaylist = playlists.find(
      (p: any) => p.id === currentPlaylistId
    );

    if (!currentPlaylist) {
      alert("현재 재생목록을 찾을 수 없습니다.");
      return;
    }

    const playlistName =
      currentPlaylist.snippet?.title || "알 수 없는 재생목록";

    // eslint-disable-next-line no-restricted-globals
    if (confirm(`이 노래를 "${playlistName}" 재생목록에 넣으시겠습니까?`)) {
      let videoData: {
        id: string;
        title: string;
        thumbnails: {
          medium: { url: string };
          default: { url: string };
        };
      };
      if (videoOrTrack.youtube) {
        videoData = {
          id: videoOrTrack.youtube.id,
          title: videoOrTrack.youtube.title,
          thumbnails: {
            medium: { url: videoOrTrack.youtube.thumbnail },
            default: { url: videoOrTrack.youtube.thumbnail },
          },
        };
      } else {
        videoData = videoOrTrack;
      }
      import("../components/MusicFunction").then(({ addTrackToPlaylist }) => {
        addTrackToPlaylist(currentPlaylistId, videoData, playlistName).then(
          (result) => {
            alert(result.message);
          }
        );
      });
    }
  }, []);

  const styledTheme = useMemo(
    () => (isDarkMode ? darkTheme : lightTheme),
    [isDarkMode]
  );

  return (
    <PageWrapper>
      <Wrapper>
        <HeaderContainer>
          <SectionTitle $clickable onClick={handlePlaylistTitleClick}>
            Playlist 
          </SectionTitle>
        </HeaderContainer>

        {/* AI 검색 바 - 새 카드형 UI */}
        <AIBarCard>
          <AIBarHeader>LOOP AI로 노래 찾기</AIBarHeader>
          <StyledAISearchBar
            onAISearch={searchWithAI}
            loading={aiLoading}
            isDarkMode={isDarkMode}
          />
        </AIBarCard>

        {/* LOOP AI 추천 결과 (디자인 교체) */}
        {recommendations && (
          <AIBlock>
            <AITitle>LOOP AI 추천 결과</AITitle>
            <AIText>{recommendations}</AIText>

            {tracks && tracks.length > 0 && (
              <AIParsed>
                <AIParsedHeader>
                  파싱된 트랙 ({tracks.length}곡)
                </AIParsedHeader>
                {tracks.map((track, index) => (
                  <AITrackRow key={index}>
                    <AITrackInfo>
                      <div
                        style={{
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        <strong>{track.title}</strong> —{" "}
                        <span>{track.artist}</span>
                        {track.note && <span> ({track.note})</span>}
                      </div>
                      {track.youtube && (
                        <AITrackMeta>
                          {track.youtube.channelTitle} • {" "}
                          {track.youtube.duration}
                        </AITrackMeta>
                      )}
                    </AITrackInfo>

                    {track.youtube && (
                      <AIButtons>
                        <AIButton onClick={() => playTrack(track)}>
                          ▶ 재생
                        </AIButton>
                        <AIButton
                          onClick={() => handleAddToCurrentPlaylist(track)}
                        >
                          + 추가
                        </AIButton>
                      </AIButtons>
                    )}
                  </AITrackRow>
                ))}
              </AIParsed>
            )}
          </AIBlock>
        )}

        {/* AI 에러 표시 */}
        {aiError && (
          <ErrorMessage>
            <strong>❌ AI 검색 오류:</strong> {aiError}
          </ErrorMessage>
        )}

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
          <SearchButton onClick={() => search(query)}>AI 검색</SearchButton>
        </SearchContainer>

        <div
          style={{
            marginBottom: "18px",
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          {GENRES.map((g) => (
            <button
              key={g}
              onClick={() => onSelectGenre(g)}
              style={{
                padding: "8px 12px",
                borderRadius: "999px",
                border: `1px solid ${
                  genre === g
                    ? "rgba(124,154,255,.55)"
                    : styledTheme.borderColor
                }`,
                background:
                  genre === g ? "rgba(124,154,255,.10)" : "transparent",
                color: genre === g ? "#CFE0FF" : styledTheme.textColor,
                cursor: "pointer",
                fontWeight: 800,
                fontSize: "12px",
              }}
            >
              {g}
            </button>
          ))}
        </div>

        {loading && <StatusMessage>검색 중입니다...</StatusMessage>}
        {!loading && items.length === 0 && (
          <StatusMessage>검색 결과가 없습니다.</StatusMessage>
        )}

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
    () => (isDarkMode ? darkTheme : lightTheme),
    [isDarkMode]
  );

  return (
    <ThemeProvider theme={styledTheme}>
      <GlobalStyle />
      <InnerKategorieScreen />
    </ThemeProvider>
  );
}
