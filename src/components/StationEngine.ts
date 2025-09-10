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
  thumbnail: string;
}

export interface BuildOptions {
  maxSize?: number;           // 생성할 큐 길이
  shuffle?: boolean;          // 셔플 여부
  allowDuplicates?: boolean;  // 중복 허용 여부
}

const API_BASE = "https://www.googleapis.com/youtube/v3";

const pick = <T>(arr: T[], n: number) => arr.slice(0, Math.max(0, n));
const shuffleArray = <T>(arr: T[]) => {
  // Fisher–Yates
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
    if (!seen.has(k)) {
      seen.add(k);
      out.push(it);
    }
  }
  return out;
};

async function searchByKeyword(
  q: string,
  apiKey: string,
  limit = 25
): Promise<StationItem[]> {
  const { data } = await axios.get(`${API_BASE}/search`, {
    params: {
      part: "snippet",
      q,
      maxResults: limit,
      type: "video",
      videoEmbeddable: "true",
      key: apiKey,
    },
  });
  return (data.items || []).map((it: any) => ({
    videoId: it.id.videoId,
    title: it.snippet.title,
    channelTitle: it.snippet.channelTitle,
    thumbnail: it.snippet.thumbnails?.medium?.url || "",
  }));
}

async function relatedToVideo(
  videoId: string,
  apiKey: string,
  limit = 25
): Promise<StationItem[]> {
  const { data } = await axios.get(`${API_BASE}/search`, {
    params: {
      part: "snippet",
      relatedToVideoId: videoId,
      maxResults: limit,
      type: "video",
      videoEmbeddable: "true",
      key: apiKey,
    },
  });
  return (data.items || []).map((it: any) => ({
    videoId: it.id.videoId,
    title: it.snippet.title,
    channelTitle: it.snippet.channelTitle,
    thumbnail: it.snippet.thumbnails?.medium?.url || "",
  }));
}

export async function buildStation(
  seeds: Seed[],
  options: BuildOptions = {}
): Promise<StationItem[]> {
  const {
    maxSize = 50,
    shuffle = true,
    allowDuplicates = false,
  } = options;

  const apiKey = process.env.REACT_APP_YT_API_KEY;
  if (!apiKey) {
    console.warn("[Station] REACT_APP_YT_API_KEY is missing");
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

  return out;
}
