import { useCallback, useRef, useState } from "react";
import { ytSearch, ytVideosDetails } from "./StationEngine";
import { playPlaylistFromFile, useMusicPlayer } from "./MusicFunction";

// ---------- 타입 ----------
export type KItem = {
  id: string;
  title: string;
  channelId?: string;
  channelTitle?: string;
  thumbnails?: any;
  durationMs?: number;
};

// Search API (search.list) 응답 최소 타입
interface YouTubeSearchResponse {
  items: Array<{
    id: { videoId?: string };
    snippet: {
      title: string;
      channelId?: string;
      channelTitle?: string;
      thumbnails?: any;
    };
  }>;
}

// Videos API (videos.list) 응답 최소 타입
interface YouTubeVideosResponse {
  items: Array<{
    id: string;
    snippet: {
      title: string;
      channelId?: string;
      channelTitle?: string;
      thumbnails?: any;
    };
    contentDetails?: { duration?: string }; // ISO8601
  }>;
}

// ---------- 간단 TTL 캐시(중복 호출 최소화) ----------
const CACHE = new Map<string, { at: number; items: KItem[] }>();
const TTL_MS = 15 * 60 * 1000; // 15분

function getCache(key: string) {
  const hit = CACHE.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) {
    CACHE.delete(key);
    return null;
  }
  return hit.items;
}
function setCache(key: string, items: KItem[]) {
  CACHE.set(key, { at: Date.now(), items });
}

// ---------- 도우미 ----------
function iso8601ToMs(iso?: string): number | undefined {
  if (!iso) return undefined;
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso);
  if (!m) return undefined;
  const h = Number(m[1] || 0), min = Number(m[2] || 0), s = Number(m[3] || 0);
  return (h * 3600 + min * 60 + s) * 1000;
}

// 응답 정규화: 배열/객체 어떤 형태여도 {items: [...] }로 맞춘다
function normalizeSearchResponse(s: unknown): YouTubeSearchResponse {
  // 일부 구현은 items 배열만 반환할 수 있음
  if (Array.isArray(s)) {
    // 배열 원소 최소 형태 보장 가정
    return { items: s as YouTubeSearchResponse["items"] };
  }
  const obj = s as Partial<YouTubeSearchResponse>;
  return { items: (obj?.items ?? []) as YouTubeSearchResponse["items"] };
}
function normalizeVideosResponse(d: unknown): YouTubeVideosResponse {
  if (Array.isArray(d)) {
    return { items: d as YouTubeVideosResponse["items"] };
  }
  const obj = d as Partial<YouTubeVideosResponse>;
  return { items: (obj?.items ?? []) as YouTubeVideosResponse["items"] };
}

// ---------- Search + Videos 병합(StationEngine 유틸 재사용) ----------
export async function fetchOptimizedVideos(term: string, max = 25): Promise<KItem[]> {
  const cacheKey = `q:${term}|max:${max}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  // StationEngine 시그니처: ytSearch(qParams, opts)
  const sRaw = await ytSearch({ q: term, type: "video" }, { maxResults: max });
  const s = normalizeSearchResponse(sRaw);

  const ids: string[] = (s.items || [])
    .map((it) => it?.id?.videoId)
    .filter(Boolean) as string[];

  if (!ids.length) {
    setCache(cacheKey, []);
    return [];
  }

  const dRaw = await ytVideosDetails(ids);
  const d = normalizeVideosResponse(dRaw);

  const items: KItem[] = (d.items || []).map((v) => ({
    id: v.id,
    title: v.snippet?.title,
    channelId: v.snippet?.channelId,
    channelTitle: v.snippet?.channelTitle,
    thumbnails: v.snippet?.thumbnails,
    durationMs: iso8601ToMs(v.contentDetails?.duration),
  }));

  setCache(cacheKey, items);
  return items;
}

// ---------- 커스텀 훅: 상태/이벤트(검색, 장르선택, 재생 트리거) ----------
export function useKategorieFunction() {
  // 훅은 최상위에서 1회 호출
  const music = useMusicPlayer();

  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<string | null>(null);
  const [items, setItems] = useState<KItem[]>([]);
  const [loading, setLoading] = useState(false);

  // (참고) AbortController는 현재 StationEngine에 signal 전달이 없다면 체감효과가 적음
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (term: string, max = 25) => {
    if (!term?.trim()) {
      setItems([]);
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    try {
      const list = await fetchOptimizedVideos(term, max);
      setItems(list);
    } finally {
      setLoading(false);
    }
  }, []);

  // "새 재생목록 생성 → 클릭한 곡부터 재생"
  const playFromIndex = useCallback(
    (index: number) => {
      if (!items.length) return;

      const playlistData = {
        id: `search:${query || 'unknown'}:${items[index].id}`,
        title: items[index].title,
        thumbnail: items[index]?.thumbnails?.medium?.url ?? "",
        tracks: [{
          videoId: items[index].id,
          title: items[index].title,
          thumbnail: items[index]?.thumbnails?.medium?.url ?? "",
        }],
        startIndex: index,
      };

        playPlaylistFromFile(playlistData);
        // Fallback: MusicFunction에서 커스텀 이벤트 수신 중이면 동작
      },
    [items, query, genre]
  );

  // 새 재생목록 생성 함수
  const createNewPlaylist = useCallback((video: any, playlistName: string) => {
    if (!video || !playlistName.trim()) return;
    
    const playlistData = {
      id: `custom:${playlistName}:${Date.now()}`, // 고유한 ID 생성
      title: playlistName.trim(), // 사용자가 입력한 이름
      thumbnail: video?.thumbnails?.medium?.url ?? "",
      tracks: [{
        videoId: video.id,
        title: video.title,
        thumbnail: video?.thumbnails?.medium?.url ?? "",
      }],
      startIndex: 0,
    };

    playPlaylistFromFile(playlistData);
  }, []);

  // 현재 재생목록에 추가 함수
  const addToCurrentPlaylist = useCallback((video: any) => {
    if (!video) return;
    
    // 현재 활성화된 재생목록 ID 가져오기
    const currentPlaylistId = sessionStorage.getItem("currentPlaylistId");
    
    if (!currentPlaylistId) {
      alert("현재 재생 중인 재생목록이 없습니다. 새 재생목록을 생성해주세요.");
      return;
    }
    
    // 현재 재생목록의 비디오들 가져오기
    const currentVideos = JSON.parse(sessionStorage.getItem("musicPlayerVideos") || "[]");
    
    // 새 비디오 데이터 생성
    const newVideo = {
      id: { videoId: video.id },
      snippet: {
        title: video.title,
        thumbnails: {
          default: { url: video?.thumbnails?.medium?.url ?? "" },
          medium: { url: video?.thumbnails?.medium?.url ?? "" },
          high: { url: video?.thumbnails?.medium?.url ?? "" },
        },
        playlistId: currentPlaylistId,
      },
    };
    
    // 비디오 목록에 추가
    const updatedVideos = [...currentVideos, newVideo];
    
    // sessionStorage 업데이트
    sessionStorage.setItem("musicPlayerVideos", JSON.stringify(updatedVideos));
    
    // 성공 메시지
    alert(`"${video.title}"이(가) 현재 재생목록에 추가되었습니다!`);
  }, []);

  return {
    state: { query, genre, items, loading },
    actions: { 
      setQuery, 
      setGenre, 
      search, 
      playFromIndex,
      createNewPlaylist,
      addToCurrentPlaylist
    },
  };
}
