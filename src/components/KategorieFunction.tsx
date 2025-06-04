// 📄 KategorieFunction.tsx - 음악 클릭 시 music.tsx UI에서 재생되도록 처리
// + 검색 기능 및 캐싱 로직 추가
// + API 호출 최적화 (2024-12-30)
// + 테마 시스템 적용 (2025-01-01)
// + 성능 최적화 및 코드 구조 개선 (2025-01-01)
import React, { useEffect, useState, useRef, useCallback, useMemo, useReducer } from "react";
import { useNavigate } from "react-router-dom";
import styled, { ThemeProvider } from "styled-components";
import { useMusicPlayer, playerRef, playerReadyRef } from "./MusicFunction";
import { useTheme } from "../components/ThemeContext";

// ===== 타입 정의 =====
interface CustomTheme {
  background: string;
  cardBackground: string;
  textColor: string;
  secondaryText: string;
  borderColor: string;
  inputBackground: string;
  inputFocusBackground: string;
}

interface YouTubeVideo {
  id: {
    videoId: string;
  } | string;
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      high?: { url: string };
      medium?: { url: string };
      default?: { url: string };
    };
  };
  contentDetails?: {
    duration: string;
  };
  statistics?: {
    viewCount: string;
  };
}

interface Genre {
  id: string;
  name: string;
  searchQuery: string;
  categoryId: string;
}

interface CacheData {
  data: YouTubeVideo[];
  timestamp: number;
}

// ===== 상수 정의 =====
const CONSTANTS = {
  CACHE_DURATION: 15 * 60 * 1000, // 15분
  DEBOUNCE_DELAY: 500, // 0.5초
  DEFAULT_MAX_RESULTS: 8,
  SEARCH_MAX_RESULTS: 20,
  GRID_COLUMNS: 4,
  ITEMS_PER_PAGE: 4,
} as const;

const API_CONFIG = {
  BASE_URL: 'https://www.googleapis.com/youtube/v3',
  CATEGORY_ID: '10',
  SAFE_SEARCH: 'moderate',
} as const;

// ===== 2025.05.22 수정: 장르 데이터 구조 변경 =====
const GENRES: Genre[] = [
  { id: "kpop", name: "K-POP", searchQuery: "kpop mv", categoryId: "10" },
  { id: "jpop", name: "J-POP", searchQuery: "jpop mv", categoryId: "10" },
  { id: "ost", name: "OST", searchQuery: "movie soundtrack mv", categoryId: "10" },
  { id: "rnb", name: "R&B", searchQuery: "rnb music video", categoryId: "10" },
  { id: "indie", name: "인디", searchQuery: "indie music video", categoryId: "10" },
  { id: "rock", name: "록", searchQuery: "rock music video", categoryId: "10" },
];

// ===== State 관리를 위한 Reducer =====
interface AppState {
  genreData: { [key: string]: YouTubeVideo[] };
  loadingGenres: { [key: string]: boolean };
  searchQuery: string;
  searchResults: YouTubeVideo[];
  isSearching: boolean;
  hasSearched: boolean;
  expandedSections: { [key: string]: boolean };
  error: string | null;
}

type AppAction =
  | { type: 'SET_GENRE_LOADING'; genreId: string; loading: boolean }
  | { type: 'SET_GENRE_DATA'; genreId: string; data: YouTubeVideo[] }
  | { type: 'SET_SEARCH_QUERY'; query: string }
  | { type: 'SET_SEARCH_RESULTS'; results: YouTubeVideo[] }
  | { type: 'SET_SEARCHING'; searching: boolean }
  | { type: 'SET_HAS_SEARCHED'; hasSearched: boolean }
  | { type: 'TOGGLE_SECTION'; genreId: string }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'RESET_SEARCH' };

const initialState: AppState = {
  genreData: {},
  loadingGenres: {},
  searchQuery: "",
  searchResults: [],
  isSearching: false,
  hasSearched: false,
  expandedSections: {},
  error: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_GENRE_LOADING':
      return {
        ...state,
        loadingGenres: {
          ...state.loadingGenres,
          [action.genreId]: action.loading,
        },
      };
    case 'SET_GENRE_DATA':
      return {
        ...state,
        genreData: {
          ...state.genreData,
          [action.genreId]: action.data,
        },
      };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.query };
    case 'SET_SEARCH_RESULTS':
      return { ...state, searchResults: action.results };
    case 'SET_SEARCHING':
      return { ...state, isSearching: action.searching };
    case 'SET_HAS_SEARCHED':
      return { ...state, hasSearched: action.hasSearched };
    case 'TOGGLE_SECTION':
      return {
        ...state,
        expandedSections: {
          ...state.expandedSections,
          [action.genreId]: !state.expandedSections[action.genreId],
        },
      };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'RESET_SEARCH':
      return {
        ...state,
        searchQuery: "",
        searchResults: [],
        hasSearched: false,
        isSearching: false,
        error: null,
      };
    default:
      return state;
  }
}

// ===== 유틸리티 함수들 =====
// HTML 엔티티를 일반 텍스트로 변환 (&amp; → &)
function decodeHtmlEntities(str: string): string {
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
}

// ISO 8601 시간 형식을 분:초 형태로 변환 (PT3M45S → 3:45)
function formatDuration(isoDuration: string): string {
  if (!isoDuration) return "";
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "";
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return (
    (hours > 0 ? `${hours}:` : "") +
    `${m < 10 && hours > 0 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`
  );
}

// ===== 전역 캐시 시스템 =====
class VideoCache {
  private genres = new Map<string, CacheData>();
  private searches = new Map<string, CacheData>();

  // 캐시에서 데이터 조회 (15분 유효기간)
  get(key: string, isGenre: boolean): YouTubeVideo[] | null {
    const cache = isGenre ? this.genres : this.searches;
    const cached = cache.get(key);
    const now = Date.now();
    
    if (cached && now - cached.timestamp < CONSTANTS.CACHE_DURATION) {
      console.log(`📖 캐시 사용: ${key}`);
      return cached.data;
    }
    
    if (cached) {
      cache.delete(key); // 만료된 캐시 삭제
    }
    
    return null;
  }

  // 캐시에 데이터 저장 (타임스탬프와 함께)
  set(key: string, data: YouTubeVideo[], isGenre: boolean): void {
    const cache = isGenre ? this.genres : this.searches;
    cache.set(key, { data, timestamp: Date.now() });
  }

  // 모든 캐시 데이터 삭제
  clear(): void {
    this.genres.clear();
    this.searches.clear();
  }
}

const videoCache = new VideoCache();
const ongoingRequests = new Map<string, AbortController>();

// ===== 스타일드 컴포넌트 (테마 기반) =====
const PageWrapper = styled.div<{ theme: CustomTheme }>`
  background-color: ${({ theme }) => theme.background};
  min-height: 100vh;
  transition: background-color 0.3s ease;
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

const CardGrid = styled.div<{ expanded: boolean }>`
  display: grid;
  grid-template-columns: repeat(${CONSTANTS.GRID_COLUMNS}, 1fr);
  gap: 12px;
  transition: all 0.3s ease;
  margin-bottom: 20px;

  & > ${AlbumCard} {
    display: ${(props) => (props.expanded ? "block" : "none")};
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

// ===== API 호출 함수 최적화 =====
// YouTube API를 통한 비디오 검색 (캐싱, 중복 방지, 에러 처리 포함)
// 2단계 API 호출: search API + videos API로 완전한 정보 수집
async function fetchOptimizedVideos(
  maxResults: number = CONSTANTS.DEFAULT_MAX_RESULTS,
  searchQuery: string = "",
  isGenre: boolean = false
): Promise<YouTubeVideo[]> {
  const requestKey = `${isGenre ? "genre" : "search"}_${searchQuery}`;
  
  // 캐시 확인
  const cached = videoCache.get(searchQuery, isGenre);
  if (cached) {
    return cached;
  }

  // 진행 중인 동일한 요청이 있다면 취소
  if (ongoingRequests.has(requestKey)) {
    ongoingRequests.get(requestKey)?.abort();
    ongoingRequests.delete(requestKey);
  }

  // 새로운 AbortController 생성
  const abortController = new AbortController();
  ongoingRequests.set(requestKey, abortController);

  try {
    const token = localStorage.getItem("ytAccessToken");
    if (!token) {
      throw new Error("YouTube 액세스 토큰이 없습니다");
    }

    console.log(`🎵 API 호출 시작: ${searchQuery} (${isGenre ? '장르' : '검색'})`);

    // 1단계: Search API로 기본 비디오 정보 가져오기 (제목, 썸네일, 채널명)
    const searchRes = await fetch(
      `${API_CONFIG.BASE_URL}/search?part=snippet&type=video&videoCategoryId=${API_CONFIG.CATEGORY_ID}&q=${encodeURIComponent(
        searchQuery
      )}&maxResults=${maxResults}&safeSearch=${API_CONFIG.SAFE_SEARCH}`,
      { 
        headers: { Authorization: `Bearer ${token}` },
        signal: abortController.signal
      }
    );

    if (!searchRes.ok) {
      throw new Error(`Search API 요청 실패: ${searchRes.status}`);
    }

    const searchData = await searchRes.json();
    const searchItems: any[] = searchData.items || [];

    if (!searchItems.length) {
      console.log(`✅ ${searchQuery} 검색 완료: 결과 없음`);
      return [];
    }

    // 2단계: Videos API로 상세 정보 가져오기 (조회수, 영상 시간)
    console.log(`📊 상세 정보 요청 중: ${searchItems.length}개 영상`);
    
    // videoId 목록을 콤마로 구분된 문자열로 변환
    const videoIds = searchItems.map(item => item.id.videoId).join(',');
    
    const videosRes = await fetch(
      `${API_CONFIG.BASE_URL}/videos?part=statistics,contentDetails&id=${videoIds}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: abortController.signal
      }
    );

    if (!videosRes.ok) {
      throw new Error(`Videos API 요청 실패: ${videosRes.status}`);
    }

    const videosData = await videosRes.json();
    const videoDetails: any[] = videosData.items || [];

    // 3단계: Search 결과와 Videos 결과 병합
    console.log(`🔗 데이터 병합 중: search(${searchItems.length}) + videos(${videoDetails.length})`);
    
    const enrichedVideos: YouTubeVideo[] = searchItems.map(searchItem => {
      // 동일한 videoId를 가진 상세 정보 찾기
      const detailItem = videoDetails.find(detail => detail.id === searchItem.id.videoId);
      
      return {
        // 기본 search 정보 유지
        id: searchItem.id,
        snippet: searchItem.snippet,
        // 상세 정보 추가 (조회수, 영상 시간)
        statistics: detailItem?.statistics || { viewCount: "0" },
        contentDetails: detailItem?.contentDetails || { duration: "PT0S" }
      };
    });

    // 캐시에 저장 (완전한 정보를 가진 데이터)
    videoCache.set(searchQuery, enrichedVideos, isGenre);
    console.log(`✅ ${searchQuery} 검색 완료: ${enrichedVideos.length}개 영상 (조회수+시간 포함, 캐시됨)`);

    return enrichedVideos;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.log(`🚫 요청 취소됨: ${searchQuery}`);
        return [];
      }
      console.error(`❌ ${searchQuery} 검색 실패:`, error.message);
      throw error;
    }
    throw new Error('알 수 없는 오류가 발생했습니다');
  } finally {
    ongoingRequests.delete(requestKey);
  }
}

// ===== 컴포넌트 분리 =====
// 개별 비디오 카드 컴포넌트 (썸네일, 제목, 조회수 표시)
const VideoCard: React.FC<{
  video: YouTubeVideo;
  onPlay: (video: YouTubeVideo) => void;
}> = React.memo(({ video, onPlay }) => {
  // 비디오 클릭 시 재생 처리
  const handleClick = useCallback(() => {
    onPlay(video);
  }, [video, onPlay]);

  return (
    <AlbumCard onClick={handleClick}>
      <ImageWrapper>
        <AlbumImage
          src={
            video.snippet.thumbnails.medium?.url ||
            video.snippet.thumbnails.high?.url
          }
          alt={video.snippet.title}
          loading="lazy"
        />
        {video.contentDetails?.duration && (
          <DurationOverlay>
            {formatDuration(video.contentDetails.duration)}
          </DurationOverlay>
        )}
      </ImageWrapper>
      <AlbumTitle>{decodeHtmlEntities(video.snippet.title)}</AlbumTitle>
      <AlbumDescription>
        {video.snippet.channelTitle} • 조회수{" "}
        {video.statistics?.viewCount
          ? Number(video.statistics.viewCount).toLocaleString()
          : "N/A"}
      </AlbumDescription>
    </AlbumCard>
  );
});

VideoCard.displayName = 'VideoCard';

// 장르별 섹션 컴포넌트 (로딩, 더보기/간략히, 재시도 기능 포함)
const GenreSection: React.FC<{
  genre: Genre;
  videos: YouTubeVideo[];
  isLoading: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onRetry: () => void;
  onPlay: (video: YouTubeVideo) => void;
}> = React.memo(({ genre, videos, isLoading, isExpanded, onToggle, onRetry, onPlay }) => {
  const hasData = videos.length > 0;

  return (
    <div>
      <SectionTitle>{genre.name} 모음</SectionTitle>
      {isLoading ? (
        <StatusMessage>{genre.name} 음악을 불러오는 중입니다...</StatusMessage>
      ) : hasData ? (
        <>
          <CardGrid expanded={isExpanded}>
            {videos.map((video) => (
              <VideoCard
                key={typeof video.id === 'object' ? video.id.videoId : video.id}
                video={video}
                onPlay={onPlay}
              />
            ))}
          </CardGrid>
          {videos.length > CONSTANTS.ITEMS_PER_PAGE && (
            <ToggleButton onClick={onToggle}>
              {isExpanded ? '간략히' : '더보기'}
            </ToggleButton>
          )}
        </>
      ) : (
        <>
          <StatusMessage>{genre.name} 영상이 없습니다.</StatusMessage>
          <ToggleButton onClick={onRetry}>다시 시도</ToggleButton>
        </>
      )}
    </div>
  );
});

GenreSection.displayName = 'GenreSection';

// ===== 메인 컴포넌트 =====
const KategorieFunction: React.FC = () => {
  const { isDarkMode, theme } = useTheme();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Refs
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Music Player 훅
  const {
    playPlaylist,
    setVideos,
    currentVideoId,
    currentVideoTitle,
    currentVideoThumbnail,
  } = useMusicPlayer();

  // ===== 메모이제이션된 함수들 =====
  // 특정 장르의 음악 데이터 로드 (중복 방지)
  const loadGenreData = useCallback(async (genreId: string, searchQuery: string) => {
    if (state.genreData[genreId] || state.loadingGenres[genreId]) {
      return;
    }

    dispatch({ type: 'SET_GENRE_LOADING', genreId, loading: true });
    dispatch({ type: 'SET_ERROR', error: null });
    
    try {
      const videos = await fetchOptimizedVideos(CONSTANTS.DEFAULT_MAX_RESULTS, searchQuery, true);
      dispatch({ type: 'SET_GENRE_DATA', genreId, data: videos });
    } catch (error) {
      console.error(`❌ 장르 데이터 로드 실패: ${genreId}`, error);
      dispatch({ type: 'SET_GENRE_DATA', genreId, data: [] });
    } finally {
      dispatch({ type: 'SET_GENRE_LOADING', genreId, loading: false });
    }
  }, [state.genreData, state.loadingGenres]);

  // 사용자 입력에 따른 음악 검색 실행
  const performSearch = useCallback(async (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      dispatch({ type: 'RESET_SEARCH' });
      return;
    }

    try {
      dispatch({ type: 'SET_SEARCHING', searching: true });
      dispatch({ type: 'SET_HAS_SEARCHED', hasSearched: true });
      dispatch({ type: 'SET_ERROR', error: null });

      // 스크롤 상단으로 이동
      const wrapperElement = document.getElementById("wrapper-scroll");
      if (wrapperElement) {
        wrapperElement.scrollTo({ top: 0, behavior: "smooth" });
      }

      const videos = await fetchOptimizedVideos(CONSTANTS.SEARCH_MAX_RESULTS, trimmedQuery, false);
      dispatch({ type: 'SET_SEARCH_RESULTS', results: videos });
    } catch (error) {
      console.error("검색 실패:", error);
      dispatch({ type: 'SET_SEARCH_RESULTS', results: [] });
      dispatch({ 
        type: 'SET_ERROR', 
        error: error instanceof Error ? error.message : '검색 중 오류가 발생했습니다.' 
      });
    } finally {
      dispatch({ type: 'SET_SEARCHING', searching: false });
    }
  }, []);

  // 검색 입력 디바운싱 (0.5초 지연으로 과도한 API 호출 방지)
  const debouncedPerformSearch = useCallback((query: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      performSearch(query);
    }, CONSTANTS.DEBOUNCE_DELAY);
  }, [performSearch]);

  // 검색 입력 필드 변경 처리
  const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    dispatch({ type: 'SET_SEARCH_QUERY', query });

    if (!query.trim()) {
      dispatch({ type: 'RESET_SEARCH' });
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      return;
    }

    debouncedPerformSearch(query);
  }, [debouncedPerformSearch]);

  // Enter 키 눌렀을 때 즉시 검색 실행
  const handleKeyPress = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      performSearch(state.searchQuery);
    }
  }, [performSearch, state.searchQuery]);

  // 선택된 비디오를 음악 플레이어에서 재생 (임시 플레이리스트 생성)
  const playSelectedVideo = useCallback((video: YouTubeVideo) => {
    const videoId = typeof video.id === "object" ? video.id.videoId : video.id;
    const videoTitle = decodeHtmlEntities(video.snippet.title);
    const videoThumbnail =
      video.snippet.thumbnails.high?.url ||
      video.snippet.thumbnails.medium?.url;

    console.log(`🎵 단일 영상 재생: ${videoTitle} (ID: ${videoId})`);

    // 임시 플레이리스트 생성
    const tempPlaylistId = `single_${videoId}_${Date.now()}`;
    const singleVideoData = [
      {
        id: { videoId },
        snippet: {
          title: videoTitle,
          thumbnails: {
            high: { url: videoThumbnail },
            medium: { url: videoThumbnail },
            default: { url: videoThumbnail },
          },
          playlistId: tempPlaylistId,
          resourceId: { videoId },
          channelTitle: video.snippet.channelTitle,
        },
        contentDetails: {
          duration: video.contentDetails?.duration,
        },
        statistics: {
          viewCount: video.statistics?.viewCount,
        },
      },
    ];

    // 상태 업데이트
    setVideos(singleVideoData);

    // sessionStorage 업데이트
    const updates = {
      musicPlayerVideos: JSON.stringify(singleVideoData),
      currentVideoId: videoId,
      currentPlaylistId: tempPlaylistId,
      currentVideoIndex: "0",
      isPlaying: "true",
    };

    Object.entries(updates).forEach(([key, value]) => {
      sessionStorage.setItem(key, value);
    });

    // 전역 이벤트 발송
    window.dispatchEvent(
      new CustomEvent("updateCurrentVideo", {
        detail: {
          videoId,
          title: videoTitle,
          thumbnail: videoThumbnail,
          index: 0,
        },
      })
    );

    // 플레이어 제어
    if (
      playerRef.current &&
      playerReadyRef.current &&
      typeof playerRef.current.loadVideoById === "function"
    ) {
      try {
        playerRef.current.loadVideoById(videoId);
        setTimeout(() => {
          if (
            playerRef.current &&
            typeof playerRef.current.playVideo === "function"
          ) {
            playerRef.current.playVideo();
          }
        }, 100);
      } catch (error) {
        console.error(`❌ 플레이어 로드 실패:`, error);
      }
    }

    console.log(`✅ 단일 영상 재생 설정 완료: ${videoTitle}`);
  }, [setVideos]);

  // 제목 클릭 시 검색 초기화, 메인 화면으로 복귀
  const handlePlaylistTitleClick = useCallback(() => {
    dispatch({ type: 'RESET_SEARCH' });
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    console.log("🏠 장르 목록으로 돌아가기");
  }, []);

  // 장르 섹션의 더보기/간략히 토글
  const handleToggleSection = useCallback((genreId: string) => {
    dispatch({ type: 'TOGGLE_SECTION', genreId });
  }, []);

  // ===== Effects =====
  // 컴포넌트 마운트 시 모든 장르 데이터 로드
  useEffect(() => {
    if (!state.hasSearched && Object.keys(state.genreData).length === 0) {
      GENRES.forEach(genre => {
        loadGenreData(genre.id, genre.searchQuery);
      });
    }
  }, [state.hasSearched, state.genreData, loadGenreData]);

  // 컴포넌트 언마운트 시 리소스 정리 (타이머, API 요청, 캐시)
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      Array.from(ongoingRequests.values()).forEach(controller => controller.abort());
      ongoingRequests.clear();
    };
  }, []);

  // ===== 메모이제이션된 컴포넌트들 =====
  // 검색 섹션 UI 메모이제이션 (리렌더링 최적화)
  const searchSection = useMemo(() => (
    <HeaderContainer>
      <SectionTitle clickable onClick={handlePlaylistTitleClick}>
        Playlist 🎧
      </SectionTitle>
      <SearchContainer>
        <SearchInput
          type="text"
          placeholder="음악 검색..."
          value={state.searchQuery}
          onChange={handleSearchInputChange}
          onKeyPress={handleKeyPress}
        />
        <SearchButton onClick={() => performSearch(state.searchQuery)}>
          🔍
        </SearchButton>
      </SearchContainer>
    </HeaderContainer>
  ), [state.searchQuery, handlePlaylistTitleClick, handleSearchInputChange, handleKeyPress, performSearch]);

  // 테마 색상 객체 메모이제이션 (다크/라이트 모드)
  const styledTheme = useMemo(() => ({
    background: isDarkMode ? "#000000" : "#ffffff",
    cardBackground: isDarkMode ? "#202020" : "#ffffff", 
    textColor: isDarkMode ? "#ffffff" : "#1a1a1a",
    secondaryText: isDarkMode ? "#cccccc" : "#8e8e93",
    borderColor: isDarkMode ? "#404040" : "#f0f0f0",
    inputBackground: isDarkMode ? "#303030" : "#fafafa",
    inputFocusBackground: isDarkMode ? "#404040" : "#ffffff",
  }), [isDarkMode]);

  return (
    <ThemeProvider theme={styledTheme}>
      <PageWrapper>
          {searchSection}
          
          {state.error && (
            <ErrorMessage>{state.error}</ErrorMessage>
          )}

          {state.hasSearched ? (
            // 검색 결과 표시
            <>
              <SectionTitle>검색 결과</SectionTitle>
              {state.isSearching ? (
                <StatusMessage>검색 중입니다...</StatusMessage>
              ) : state.searchResults.length === 0 ? (
                <StatusMessage>검색 결과가 없습니다.</StatusMessage>
              ) : (
                <CardGrid expanded={true}>
                  {state.searchResults.map((video) => (
                    <VideoCard
                      key={typeof video.id === 'object' ? video.id.videoId : video.id}
                      video={video}
                      onPlay={playSelectedVideo}
                    />
                  ))}
                </CardGrid>
              )}
            </>
          ) : (
            // 장르별 목록 표시
            <>
              {GENRES.map((genre) => (
                <GenreSection
                  key={genre.id}
                  genre={genre}
                  videos={state.genreData[genre.id] || []}
                  isLoading={state.loadingGenres[genre.id] || false}
                  isExpanded={state.expandedSections[genre.id] || false}
                  onToggle={() => handleToggleSection(genre.id)}
                  onRetry={() => loadGenreData(genre.id, genre.searchQuery)}
                  onPlay={playSelectedVideo}
                />
              ))}
            </>
          )}
      </PageWrapper>
    </ThemeProvider>
  );
};

export default KategorieFunction;
