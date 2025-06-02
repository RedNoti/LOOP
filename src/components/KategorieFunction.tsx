// 📄 KategorieFunction.tsx - 음악 클릭 시 music.tsx UI에서 재생되도록 처리
// + 검색 기능 및 캐싱 로직 추가
// + API 호출 최적화 (2024-12-30)
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useMusicPlayer, playerRef, playerReadyRef } from "./MusicFunction";

// ===== 2025.05.22 수정: 장르 데이터 구조 변경 =====
const genres = [
  { id: "kpop", name: "K-POP", searchQuery: "kpop mv", categoryId: "10" },
  { id: "jpop", name: "J-POP", searchQuery: "jpop mv", categoryId: "10" },
  {
    id: "ost",
    name: "OST",
    searchQuery: "movie soundtrack mv",
    categoryId: "10",
  },
  { id: "rnb", name: "R&B", searchQuery: "rnb music video", categoryId: "10" },
  {
    id: "indie",
    name: "인디",
    searchQuery: "indie music video",
    categoryId: "10",
  },
  { id: "rock", name: "록", searchQuery: "rock music video", categoryId: "10" },
];

// ===== [2024-05-23] HTML 엔티티 디코딩 함수 추가 =====
function decodeHtmlEntities(str: string) {
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
}

// ===== [2024-05-23] ISO 8601 duration을 mm:ss로 변환하는 함수 추가 =====
function formatDuration(isoDuration: string) {
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

// ===== [2024-05-23] 영상 상세 모달 컴포넌트 추가 (사용되지 않지만 스타일 정의는 남아있음) =====
const VideoModalBackground = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
`;
const VideoModalContent = styled.div`
  background: #222;
  border-radius: 12px;
  padding: 24px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  align-items: center;
`;
const CloseButton = styled.button`
  align-self: flex-end;
  background: none;
  border: none;
  color: #fff;
  font-size: 2rem;
  cursor: pointer;
  margin-bottom: 8px;
`;

// ===== [2024-05-23] 영상 길이 오버레이 스타일 추가 =====
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
const SongThumbnailWrapper = styled.div`
  position: relative;
`;

// ===== CSS 스타일 업데이트 (기존 스타일 유지 및 검색 관련 스타일 추가) =====
const Section = styled.section`
  padding: 24px 32px;
  max-width: 1400px;
  margin: 0 auto;
`;

const SectionTitle = styled.h2<{ clickable?: boolean }>`
  color: #ffffff; /* 흰색 */
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 24px;
  flex-grow: 1; /* 남은 공간 차지 */
  cursor: ${(props) => (props.clickable ? "pointer" : "default")};
  transition: opacity 0.2s ease;

  &:hover {
    opacity: ${(props) => (props.clickable ? "0.8" : "1")};
  }
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px; /* 입력 필드와 버튼 사이 간격 */
  margin-bottom: 24px; /* 아래 여백 */
`;

const SearchInput = styled.input`
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
  flex-grow: 1; /* 남은 공간 차지 */
`;

const SearchButton = styled.button`
  padding: 4px; /* 패딩 최소화 */
  color: #000000; /* 이모지 색상 검정 */
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1.5rem; /* 이모지 크기 약간 키우기 */
  background-color: transparent; /* 배경색 투명 */

  &:hover {
    background-color: transparent; /* 호버 시 배경색 없음 */
  }

  &:active {
    background-color: transparent; /* 클릭 시 배경색 없음 */
  }
`;

const ToggleButton = styled.button`
  background: none;
  border: none;
  color: #aaaaaa;
  font-size: 14px;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 10px;
  transition: all 0.2s ease;
  display: block;
  margin: 16px auto 48px;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
`;

const AlbumCard = styled.div`
  padding: 12px;
  border-radius: 4px;
  text-align: left;
  background-color: rgba(255, 255, 255, 0.03);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);

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

const AlbumTitle = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const AlbumDescription = styled.div`
  font-size: 12px;
  color: #aaaaaa;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  height: 32px;
`;

const CardGrid = styled.div<{ expanded: boolean }>`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  transition: all 0.3s ease;
  margin-bottom: 20px;

  & > ${AlbumCard} {
    display: ${(props) => (props.expanded ? "block" : "none")};
    &:nth-child(-n + 4) {
      display: block;
    }
  }
`;

const PageWrapper = styled.div`
  background-color: #030303;
  min-height: 100vh;
`;

// 장르 선택을 위한 추가 스타일 (가로 스크롤 적용)
const GenreList = styled.ul`
  list-style: none;
  padding: 0;
  margin-bottom: 40px;
  display: flex; /* 가로 배치 */
  gap: 10px;
  /* flex-wrap: wrap; // 🎯 줄바꿈 해제 */
  overflow-x: auto; /* 🎯 가로 스크롤 */
  -webkit-overflow-scrolling: touch; /* 부드러운 스크롤링 (iOS) */

  /* 🎯 스크롤바 숨김 (선택 사항, YouTube는 스크롤바 보임) */
  /*
  &::-webkit-scrollbar {
      display: none;
  }
  -ms-overflow-style: none; // IE and Edge
  scrollbar-width: none; // Firefox
  */
`;

const GenreItem = styled.li<{ isSelected?: boolean }>`
  padding: 12px 20px;
  background-color: ${(props) => (props.isSelected ? "#1db954" : "#333")};
  margin-bottom: 0;
  border-radius: 20px;
  cursor: pointer;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  transition: background-color 0.2s ease;
  flex-shrink: 0; /* 🎯 컨테이너가 줄어들 때 아이템 크기 유지 */

  &:hover {
    background-color: ${(props) => (props.isSelected ? "#1ed760" : "#555")};
  }
`;

// 기존 컴포넌트와 호환성을 위한 추가 스타일
const Wrapper = styled.div`
  padding: 25px 40px 40px 40px;
  background-color: #030303; /* 어두운 배경 */
  color: white; /* 흰색 텍스트 */
  min-height: 100vh;
  max-height: 100vh;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #1e1e1e; /* 어두운 스크롤바 트랙 */
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3); /* 밝은 스크롤바 핸들 */
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.6); /* 호버 시 더 밝게 */
  }
`;

// 썸네일 이미지 스타일
const Thumbnail = styled.img`
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  display: block;
  border-radius: 4px;
  margin-bottom: 12px;
`;

// 영상 정보를 표시할 작은 글씨 스타일
const VideoInfoText = styled.p`
  color: #aaaaaa; /* 회색 */
  font-size: 0.8rem;
  padding: 0 8px;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 12px; /* 제목과의 간격 */
`;

// ===== [2024-12-30] API 호출 최적화: AbortController와 강화된 캐싱 =====
// 🎯 전역 캐시 객체 (장르별 + 검색 캐싱)
const globalCache = {
  genres: new Map<string, { data: any[]; timestamp: number }>(),
  searches: new Map<string, { data: any[]; timestamp: number }>(),
  cacheDuration: 15 * 60 * 1000, // 15분 캐시 유지
};

// 🎯 진행 중인 요청들을 관리하는 Map
const ongoingRequests = new Map<string, AbortController>();

// ===== [2024-12-30] 최적화된 영상 fetch 함수 =====
async function fetchOptimizedVideos(
  maxResults = 8,
  searchQuery = "",
  isGenre = false
) {
  const requestKey = `${isGenre ? "genre" : "search"}_${searchQuery}`;

  // 🎯 1. 캐시 확인
  const cache = isGenre ? globalCache.genres : globalCache.searches;
  const cached = cache.get(searchQuery);
  const now = Date.now();

  if (cached && now - cached.timestamp < globalCache.cacheDuration) {
    console.log(`📖 캐시 사용: ${searchQuery}`);
    return cached.data;
  }

  // 🎯 2. 진행 중인 동일한 요청이 있다면 취소
  if (ongoingRequests.has(requestKey)) {
    ongoingRequests.get(requestKey)?.abort();
    ongoingRequests.delete(requestKey);
  }

  // 🎯 3. 새로운 AbortController 생성
  const abortController = new AbortController();
  ongoingRequests.set(requestKey, abortController);

  try {
    const token = localStorage.getItem("ytAccessToken");
    if (!token) {
      console.warn("🔑 YouTube 액세스 토큰이 없습니다");
      return [];
    }

    console.log(
      `🎵 API 호출 시작: ${searchQuery} (${isGenre ? "장르" : "검색"})`
    );

    // 🎯 4. 최적화된 단일 API 호출 (search API만 사용, videos API 생략)
    // search API에서 snippet 정보가 충분하므로 duration이 꼭 필요하지 않다면 생략 가능
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&q=${encodeURIComponent(
        searchQuery
      )}&maxResults=${maxResults}&safeSearch=moderate`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: abortController.signal,
      }
    );

    if (!searchRes.ok) {
      console.error(`Search API 요청 실패: ${searchRes.status}`);
      return [];
    }

    const searchData = await searchRes.json();
    const items = searchData.items || [];

    if (!items.length) {
      console.log(`✅ ${searchQuery} 검색 완료: 결과 없음`);
      return [];
    }

    // 🎯 5. 캐시에 저장
    cache.set(searchQuery, { data: items, timestamp: now });
    console.log(`✅ ${searchQuery} 검색 완료: ${items.length}개 영상 (캐시됨)`);

    return items;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.log(`🚫 요청 취소됨: ${searchQuery}`);
      return [];
    }
    console.error(`❌ ${searchQuery} 검색 실패:`, error);
    return [];
  } finally {
    ongoingRequests.delete(requestKey);
  }
}

const KategorieFunction: React.FC = () => {
  const navigate = useNavigate();

  // ===== [2024-12-30] 상태 관리 최적화 =====
  const [genreData, setGenreData] = useState<{ [key: string]: any[] }>({});
  const [loadingGenres, setLoadingGenres] = useState<Set<string>>(new Set());

  // 검색 관련 상태
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // 🎯 [2024-12-30] 각 장르별 확장/축소 상태 관리
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({});

  // 🎯 디바운싱 타이머 ID를 저장할 Ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ===== 수정: MusicFunction.tsx와 연동되는 실제 존재하는 속성들만 사용 =====
  const {
    playPlaylist,
    setVideos,
    currentVideoId,
    currentVideoTitle,
    currentVideoThumbnail,
  } = useMusicPlayer();

  // ===== [2024-12-30] 단일 장르 데이터 로드 함수 =====
  const loadGenreData = async (genreId: string, searchQuery: string) => {
    if (genreData[genreId] || loadingGenres.has(genreId)) {
      return; // 이미 로드되었거나 로딩 중인 경우 스킵
    }

    setLoadingGenres((prev) => new Set([...Array.from(prev), genreId]));

    try {
      const videos = await fetchOptimizedVideos(8, searchQuery, true);
      setGenreData((prev) => ({
        ...prev,
        [genreId]: videos,
      }));
    } catch (error) {
      console.error(`❌ 장르 데이터 로드 실패: ${genreId}`, error);
      setGenreData((prev) => ({
        ...prev,
        [genreId]: [],
      }));
    } finally {
      setLoadingGenres((prev) => {
        const newSet = new Set(prev);
        newSet.delete(genreId);
        return newSet;
      });
    }
  };

  // ===== [2024-12-30] 초기 로딩 최적화: 모든 장르 로드 =====
  useEffect(() => {
    if (!hasSearched && Object.keys(genreData).length === 0) {
      // 모든 장르 데이터 로드
      genres.forEach((genre) => {
        loadGenreData(genre.id, genre.searchQuery);
      });
    }
  }, [hasSearched]);

  // ===== [2024-12-30] 검색 기능 최적화 =====
  const performSearch = async (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setSearchResults([]);
      setHasSearched(false);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      return;
    }

    try {
      setIsSearching(true);
      setHasSearched(true);

      // 🎯 스크롤 상단으로 이동
      const wrapperElement = document.getElementById("wrapper-scroll");
      if (wrapperElement) {
        wrapperElement.scrollTo({ top: 0, behavior: "smooth" });
      }

      const videos = await fetchOptimizedVideos(20, trimmedQuery, false);
      setSearchResults(videos);
    } catch (error) {
      console.error("검색 실패:", error);
      setSearchResults([]);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  };

  // 🎯 디바운싱된 검색 실행 함수
  const debouncedPerformSearch = useCallback((query: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      performSearch(query);
    }, 500);
  }, []);

  // 검색 입력 변경 핸들러
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      return;
    }

    debouncedPerformSearch(query);
  };

  // Enter 키 입력 핸들러
  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      performSearch(searchQuery);
    }
  };

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // 진행 중인 모든 요청 취소
      Array.from(ongoingRequests.values()).forEach((controller) =>
        controller.abort()
      );
      ongoingRequests.clear();
    };
  }, []);

  // ===== 🎯 단일 영상 재생 함수 (기존과 동일) =====
  const playSelectedVideo = (video: any) => {
    const videoId = typeof video.id === "object" ? video.id.videoId : video.id;
    const videoTitle = decodeHtmlEntities(video.snippet.title);
    const videoThumbnail =
      video.snippet.thumbnails.high?.url ||
      video.snippet.thumbnails.medium?.url;

    console.log(`🎵 단일 영상 재생: ${videoTitle} (ID: ${videoId})`);

    // 🎯 간단한 임시 플레이리스트 생성
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

    // 🎯 상태 업데이트
    setVideos(singleVideoData);

    // 🎯 sessionStorage 업데이트
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

    // 🎯 전역 이벤트 발송
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

    // 🎯 플레이어 제어
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
  };

  // ===== [2024-12-30] Playlist 제목 클릭 시 장르 목록으로 돌아가는 핸들러 =====
  const handlePlaylistTitleClick = () => {
    // 검색 상태 초기화
    setSearchQuery("");
    setSearchResults([]);
    setHasSearched(false);
    setIsSearching(false);

    // 디바운싱 타이머 정리
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    console.log("🏠 장르 목록으로 돌아가기");
  };

  // ===== [2024-12-30] 장르별 확장/축소 토글 함수 =====
  const toggleSection = (genreId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [genreId]: !prev[genreId],
    }));
  };

  return (
    <Wrapper id="wrapper-scroll">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <SectionTitle clickable onClick={handlePlaylistTitleClick}>
          Playlist 🎧
        </SectionTitle>
        <SearchContainer>
          <SearchInput
            type="text"
            placeholder="음악 검색..."
            value={searchQuery}
            onChange={handleSearchInputChange}
            onKeyPress={handleKeyPress}
          />
          <SearchButton onClick={() => performSearch(searchQuery)}>
            🔍
          </SearchButton>
        </SearchContainer>
      </div>

      {/* 🎯 검색 결과 또는 장르별 목록 조건부 렌더링 */}
      {hasSearched ? (
        // ===== 검색 결과 표시 =====
        <>
          <SectionTitle clickable>검색 결과</SectionTitle>
          {isSearching ? (
            <p>검색 중입니다...</p>
          ) : searchResults.length === 0 ? (
            <p>검색 결과가 없습니다.</p>
          ) : (
            <CardGrid expanded={true}>
              {searchResults.map((video) => (
                <AlbumCard
                  key={video.id.videoId || video.id}
                  onClick={() => playSelectedVideo(video)}
                >
                  <ImageWrapper>
                    <AlbumImage
                      src={
                        video.snippet.thumbnails.medium?.url ||
                        video.snippet.thumbnails.high?.url
                      }
                      alt={video.snippet.title}
                    />
                    {video.contentDetails?.duration && (
                      <DurationOverlay>
                        {formatDuration(video.contentDetails.duration)}
                      </DurationOverlay>
                    )}
                  </ImageWrapper>
                  <AlbumTitle>
                    {decodeHtmlEntities(video.snippet.title)}
                  </AlbumTitle>
                  <AlbumDescription>
                    {video.snippet.channelTitle} • 조회수{" "}
                    {video.statistics?.viewCount
                      ? Number(video.statistics.viewCount).toLocaleString()
                      : "N/A"}
                  </AlbumDescription>
                </AlbumCard>
              ))}
            </CardGrid>
          )}
        </>
      ) : (
        // ===== 모든 장르 목록 표시 =====
        <>
          {genres.map((genre) => {
            const videos = genreData[genre.id] || [];
            const isLoading = loadingGenres.has(genre.id);
            const isExpanded = expandedSections[genre.id] || false;
            const hasData = videos.length > 0;

            return (
              <div key={genre.id}>
                <SectionTitle>{genre.name} 모음</SectionTitle>
                {isLoading ? (
                  <p>{genre.name} 음악을 불러오는 중입니다...</p>
                ) : hasData ? (
                  <>
                    <CardGrid expanded={isExpanded}>
                      {videos.map((video) => (
                        <AlbumCard
                          key={video.id.videoId || video.id}
                          onClick={() => playSelectedVideo(video)}
                        >
                          <ImageWrapper>
                            <AlbumImage
                              src={
                                video.snippet.thumbnails.medium?.url ||
                                video.snippet.thumbnails.high?.url
                              }
                              alt={video.snippet.title}
                            />
                            {video.contentDetails?.duration && (
                              <DurationOverlay>
                                {formatDuration(video.contentDetails.duration)}
                              </DurationOverlay>
                            )}
                          </ImageWrapper>
                          <AlbumTitle>
                            {decodeHtmlEntities(video.snippet.title)}
                          </AlbumTitle>
                          <AlbumDescription>
                            {video.snippet.channelTitle} • 조회수{" "}
                            {video.statistics?.viewCount
                              ? Number(
                                  video.statistics.viewCount
                                ).toLocaleString()
                              : "N/A"}
                          </AlbumDescription>
                        </AlbumCard>
                      ))}
                    </CardGrid>
                    {videos.length > 4 && (
                      <ToggleButton onClick={() => toggleSection(genre.id)}>
                        {isExpanded ? "간략히" : "더보기"}
                      </ToggleButton>
                    )}
                  </>
                ) : (
                  <>
                    <p>{genre.name} 영상이 없습니다.</p>
                    <ToggleButton
                      onClick={() => loadGenreData(genre.id, genre.searchQuery)}
                    >
                      다시 시도
                    </ToggleButton>
                  </>
                )}
              </div>
            );
          })}
        </>
      )}
    </Wrapper>
  );
};

export default KategorieFunction;
