// src/components/StationEngine.ts
// YouTube Data API v3 기반 스테이션 빌더 (403/에러 가드 + 키 보안 + 폴백 강화)

console.log("[ENV] REACT_APP_YT_API_KEY =", process.env.REACT_APP_YT_API_KEY);

export type Seed =
  | { type: "videoId"; value: string }
  | { type: "keyword"; value: string }
  | { type: "channelId"; value: string };

export type StationItem = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string; // 항상 string (빈 문자열 허용 안 함)
};

const API_KEY: string | undefined =
  (process.env as any)?.REACT_APP_YT_API_KEY;

const MUSIC_TOPIC_ID = "/m/04rlf"; // 음악 토픽 (필요 시 제거 재시도)

type YTSearchItem = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: {
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
};

type YTError = {
  error?: {
    errors?: Array<{ reason?: string; message?: string }>;
    code?: number;
    message?: string;
  };
};

function assertApiKey(): string {
  if (!API_KEY) {
    console.warn(
      "[StationEngine] No API key found. Set VITE_YT_API_KEY or REACT_APP_YT_API_KEY."
    );
    return "";
  }
  return API_KEY;
}

async function ytFetch(url: URL): Promise<
  | { ok: true; data: any }
  | { ok: false; status: number; reason: string; raw: string }
> {
  url.searchParams.set("key", assertApiKey());
  const res = await fetch(url.toString());
  const raw = await res.text();

  if (!res.ok) {
    let reason = "unknown";
    try {
      const j: YTError = JSON.parse(raw);
      reason = j?.error?.errors?.[0]?.reason || j?.error?.message || "unknown";
    } catch {
      // ignore
    }
    console.warn("[YT] request failed:", res.status, reason, raw.slice(0, 500));
    return { ok: false, status: res.status, reason, raw };
  }
  try {
    return { ok: true, data: JSON.parse(raw) };
  } catch (e) {
    console.warn("[YT] JSON parse error:", (e as Error).message);
    return { ok: false, status: 500, reason: "jsonParseError", raw };
  }
}

function normalize(items: YTSearchItem[]): StationItem[] {
  return items
    .map((it) => {
      const videoId = it?.id?.videoId || "";
      const title = it?.snippet?.title || "";
      const channelTitle = it?.snippet?.channelTitle || "";
      const thumb =
        it?.snippet?.thumbnails?.medium?.url ||
        it?.snippet?.thumbnails?.default?.url ||
        "";

      if (!videoId || !thumb) return null;
      return {
        videoId,
        title,
        channelTitle,
        thumbnail: thumb,
      } as StationItem;
    })
    .filter(Boolean) as StationItem[];
}

function uniqBy<T>(arr: T[], key: (x: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const x of arr) {
    const k = key(x);
    if (k && !seen.has(k)) {
      seen.add(k);
      out.push(x);
    }
  }
  return out;
}

function pickKeyword(seeds: Seed[]): string {
  const k = seeds.find((s) => s.type === "keyword")?.value;
  return k || "music mix";
}

async function searchRelated(videoId: string, max = 25, withTopic = true) {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", String(max));
  url.searchParams.set("relatedToVideoId", videoId);
  url.searchParams.set("videoEmbeddable", "true");
  url.searchParams.set("videoSyndicated", "true");
  if (withTopic) url.searchParams.set("topicId", MUSIC_TOPIC_ID);

  const r = await ytFetch(url);
  if (!r.ok) return { ok: false as const, items: [], reason: r.reason };
  const items = normalize(r.data?.items || []);
  return { ok: true as const, items };
}

async function searchByKeyword(q: string, max = 25, withTopic = true) {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", String(max));
  url.searchParams.set("q", q);
  url.searchParams.set("videoEmbeddable", "true");
  url.searchParams.set("videoSyndicated", "true");
  if (withTopic) url.searchParams.set("topicId", MUSIC_TOPIC_ID);

  const r = await ytFetch(url);
  if (!r.ok) return { ok: false as const, items: [], reason: r.reason };
  const items = normalize(r.data?.items || []);
  return { ok: true as const, items };
}

async function tryWithTopicThenWithout<T extends any[]>(
  fn: (withTopic: boolean) => Promise<{ ok: boolean; items: T; reason?: string }>
) {
  const a = await fn(true);
  if (a.ok && a.items.length > 0) return a.items;
  const b = await fn(false);
  return b.items;
}

/**
 * seeds를 바탕으로 스테이션 큐를 생성
 * - relatedToVideoId 우선 → 부족하면 keyword
 * - topicId 필터로 먼저 시도 → 결과 부족하면 topicId 제거 후 재시도
 * - 최종 중복 제거 후 최대 50개
 */
export async function buildStation(seeds: Seed[]): Promise<StationItem[]> {
  if (!assertApiKey()) return [];

  const seedVid = seeds.find((s) => s.type === "videoId")?.value;
  const keyword = pickKeyword(seeds);

  let list: StationItem[] = [];

  if (seedVid) {
    const rel = await tryWithTopicThenWithout<StationItem[]>(async (topic) => {
      const r = await searchRelated(seedVid, 30, topic);
      return {
        ok: true,
        items: r.items as StationItem[],
      };
    });
    list = list.concat(rel);
  }

  if (list.length < 10 && keyword) {
    const kw = await tryWithTopicThenWithout<StationItem[]>(async (topic) => {
      const r = await searchByKeyword(keyword, 30, topic);
      return { ok: true, items: r.items as StationItem[] };
    });
    list = list.concat(kw);
  }

  // 최종 필터링/슬라이싱
  const uniq = uniqBy(list, (x) => x.videoId).slice(0, 50);
  return uniq;
}
