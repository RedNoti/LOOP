// src/components/StationEngine.ts
import axios from "axios";

export type Seed =
  | { type: "videoId"; value: string }
  | { type: "keyword"; value: string }
  | { type: "artist"; value: string }
  | { type: "genre"; value: string };

export interface StationItem {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string; // 반드시 string
}

export interface BuildOptions {
  maxSize?: number;           // 생성할 큐 길이
  shuffle?: boolean;          // 셔플 여부
  allowDuplicates?: boolean;  // 중복 허용 여부
}

const API_BASE = "https://www.googleapis.com/youtube/v3";

// ---------- 유틸 ----------
const pick = <T>(arr: T[], n: number) => arr.slice(0, Math.max(0, n));
const shuffleArray = <T>(arr: T[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const uniqBy = <T, K extends string | number>(arr: T[], key: (x: T) => K) => {
  const seen = new Set<K>();
  const out: T[] = [];
  for (const it of arr) {
    const k = key(it);
    if (!seen.has(k)) { seen.add(k); out.push(it); }
  }
  return out;
};

// CRA / Vite 모두 지원 (CRA 프로젝트라도 문제 없음)
function getApiKey(): string {
  const k1 = (process.env as any)?.REACT_APP_YT_API_KEY as string | undefined;
  let k2: string | undefined;
  try {
    // Vite 환경 대응 (CRA에선 import.meta가 없어도 catch로 안전)
    // @ts-ignore
    k2 = typeof import.meta !== "undefined" ? (import.meta as any)?.env?.VITE_YT_API_KEY : undefined;
  } catch {}
  return (k1 || k2 || "").trim();
}

function mapItem(it: any): StationItem | null {
  const videoId = it?.id?.videoId;
  if (!videoId) return null;
  const title = it?.snippet?.title ?? "";
  const channelTitle = it?.snippet?.channelTitle ?? "";
  const thumb =
    it?.snippet?.thumbnails?.medium?.url ??
    it?.snippet?.thumbnails?.default?.url ??
    "";
  if (!thumb) return null; // 썸네일 없는 항목 제외
  return { videoId, title, channelTitle, thumbnail: thumb };
}

// ---------- 검색 ----------
async function searchByKeyword(
  q: string,
  apiKey: string,
  limit = 25
): Promise<StationItem[]> {
  try {
    const { data } = await axios.get(`${API_BASE}/search`, {
      params: {
        part: "snippet",
        q,
        maxResults: limit,
        type: "video",
        videoEmbeddable: "true",   // 외부 임베드 가능
        videoSyndicated: "true",   // 제3자 재생 허용
        topicId: "/m/04rlf",       // 음악 토픽
        key: apiKey,
      },
    });
    const items = (data.items || [])
      .map(mapItem)
      .filter((x: StationItem | null): x is StationItem => !!x);
    return items;
  } catch (err: any) {
    console.error("[Station] searchByKeyword error:", err?.response?.status, err?.response?.data || err?.message);
    return [];
  }
}

async function relatedToVideo(
  videoId: string,
  apiKey: string,
  limit = 25
): Promise<StationItem[]> {
  try {
    const { data } = await axios.get(`${API_BASE}/search`, {
      params: {
        part: "snippet",
        relatedToVideoId: videoId,
        maxResults: limit,
        type: "video",
        videoEmbeddable: "true",
        videoSyndicated: "true",
        topicId: "/m/04rlf",
        key: apiKey,
      },
    });
    const items = (data.items || [])
      .map(mapItem)
      .filter((x: StationItem | null): x is StationItem => !!x);
    return items;
  } catch (err: any) {
    console.error("[Station] relatedToVideo error:", err?.response?.status, err?.response?.data || err?.message);
    return [];
  }
}

// ---------- 스테이션 빌드 ----------
export async function buildStation(
  seeds: Seed[],
  options: BuildOptions = {}
): Promise<StationItem[]> {
  const { maxSize = 50, shuffle = true, allowDuplicates = false } = options;

  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("[Station] API key is missing (REACT_APP_YT_API_KEY or VITE_YT_API_KEY)");
    return [];
  }

  // 1) 각 시드에서 후보 가져오기
  const buckets: StationItem[][] = [];
  for (const s of seeds) {
    if (s.type === "videoId") {
      buckets.push(await relatedToVideo(s.value, apiKey, 25));
    } else if (s.type === "keyword") {
      buckets.push(await searchByKeyword(s.value, apiKey, 25));
    } else if (s.type === "artist") {
      buckets.push(await searchByKeyword(`${s.value} official audio`, apiKey, 25));
    } else if (s.type === "genre") {
      buckets.push(await searchByKeyword(`${s.value} music mix`, apiKey, 25));
    }
  }

  // 2) 버킷을 교차 합치기(라디오 다양성)
  const merged: StationItem[] = [];
  let i = 0;
  while (merged.length < maxSize) {
    let added = false;
    for (const bucket of buckets) {
      if (i < bucket.length) {
        merged.push(bucket[i]);
        if (merged.length >= maxSize) break;
        added = true;
      }
    }
    if (!added) break;
    i++;
  }

  // 3) 중복 제거 / 셔플 / 길이 제한
  let out = allowDuplicates ? merged : uniqBy(merged, (x) => x.videoId);
  if (shuffle) out = shuffleArray(out);
  out = pick(out, maxSize);

  // 디버그 로그
  if (out.length === 0) {
    console.warn("[Station] buildStation produced empty queue. Seeds:", seeds);
  }
  return out;
}
