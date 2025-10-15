// src/components/KategorieFunction.ts
// YouTube 검색 유틸리티 - 순수 함수만 제공 (StationEngine 패턴)

import { ytSearch, ytVideosDetails } from "./StationEngine";

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