// src/components/StationEngine.ts
// YouTube Music Station(라디오) 트랙 빌더 - 순수 유틸 모듈
// - 훅/상태 직접 접근 없음 (컴포넌트에서 setVideos/setPlaylists 호출)
// - 인증: localStorage 'google_access_token' (Bearer) 우선, 실패 시 'YOUTUBE_API_KEY' 백업

const YT_BASE = "https://www.googleapis.com/youtube/v3" as const;
const MUSIC_CATEGORY_ID = "10"; // 음악 카테고리

export type StationSeed =
  | { type: "video"; videoId: string }
  | { type: "artist"; artist: string }
  | { type: "query"; query: string };

export type StationBuildOptions = {
  targetCount?: number; // 기본 30
  dedupe?: boolean;     // 기본 true
  safeSearch?: "none" | "moderate" | "strict";
};

export type StationPlaylist = {
  id: string;
  snippet: {
    title: string;
    thumbnails: { medium?: { url: string } };
  };
};

export type StationVideo = {
  id: { videoId: string };
  snippet: {
    title: string;
    playlistId: string;
    thumbnails: { default?: { url: string } };
  };
};

export type StationResult = {
  playlist: StationPlaylist;
  videos: StationVideo[];
};

// ----- 공통 fetch (Bearer → key 백업) -----
async function ytFetch(
  endpoint: string,
  params: Record<string, string | number | boolean | undefined>
) {
  const url = new URL(YT_BASE + endpoint);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  });

  const bearer =
    (typeof window !== "undefined"
      ? window.localStorage.getItem("google_access_token")
      : null) || null;

  const headers: Record<string, string> = {};
  if (bearer) headers["Authorization"] = `Bearer ${bearer}`;

  // Bearer 우선
  let res = await fetch(url.toString(), { method: "GET", headers });
  if (!res.ok) {
    // key 백업
    const key =
      (typeof window !== "undefined"
        ? window.localStorage.getItem("YOUTUBE_API_KEY")
        : null) || "";
    const url2 = new URL(url.toString());
    if (key) url2.searchParams.set("key", key);
    res = await fetch(url2.toString(), { method: "GET", headers: {} }); // 키 모드에선 헤더 비워도 무방
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`YouTube API Error ${res.status}: ${text}`);
    }
  }
  return res.json();
}

// ----- API helpers -----
async function ytSearch(
  qOrParams:
    | { relatedToVideoId: string; type?: string }
    | { q: string; type?: string },
  opts?: { maxResults?: number; safeSearch?: StationBuildOptions["safeSearch"] }
) {
  const base: Record<string, string | number> = {
    part: "snippet",
    type: "video",
    maxResults: opts?.maxResults ?? 25,
    videoEmbeddable: "true",
    videoSyndicated: "true",
    videoCategoryId: MUSIC_CATEGORY_ID,
  };

  if ("relatedToVideoId" in qOrParams) {
    Object.assign(base, { relatedToVideoId: qOrParams.relatedToVideoId });
  } else {
    Object.assign(base, { q: qOrParams.q });
  }

  if (opts?.safeSearch && opts.safeSearch !== "none")
    (base as any).safeSearch = opts.safeSearch;

  const data = await ytFetch("/search", base);
  return (data.items || []) as Array<{
    id: { videoId?: string };
    snippet: { title: string; thumbnails?: any };
  }>;
}

async function ytVideosDetails(videoIds: string[]) {
  if (videoIds.length === 0) return [] as any[];
  const chunks: string[][] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    chunks.push(videoIds.slice(i, i + 50));
  }

  const results: any[] = [];
  for (const ids of chunks) {
    const data = await ytFetch("/videos", {
      part: "snippet,contentDetails,statistics",
      id: ids.join(","),
      maxResults: 50,
    });
    results.push(...(data.items || []));
  }
  return results;
}

// ----- 핵심: 스테이션 빌드 -----
export async function buildStation(
  seed: StationSeed,
  options: StationBuildOptions = {}
): Promise<StationResult> {
  const target = options.targetCount ?? 30;
  const dedupe = options.dedupe ?? true;
  const safeSearch = options.safeSearch ?? "moderate";

  const stationId =
    seed.type === "video"
      ? `station:video:${seed.videoId}`
      : seed.type === "artist"
      ? `station:artist:${seed.artist}`
      : `station:query:${seed.query}`;

  const collected: string[] = [];
  const seen = new Set<string>();

  const pushFromList = (items: Array<{ id?: { videoId?: string } }>) => {
    for (const it of items) {
      const id = it?.id?.videoId;
      if (!id) continue;
      if (dedupe && seen.has(id)) continue;
      seen.add(id);
      collected.push(id);
      if (collected.length >= target) break;
    }
  };

  // 1) 시드로 1차 수집
  if (seed.type === "video") {
    const rel = await ytSearch(
      { relatedToVideoId: seed.videoId },
      { maxResults: 25, safeSearch }
    );
    pushFromList(rel);
  } else if (seed.type === "artist") {
    const s1 = await ytSearch(
      { q: `${seed.artist} official audio` },
      { maxResults: 25, safeSearch }
    );
    pushFromList(s1);
    if (collected.length < target) {
      const s2 = await ytSearch(
        { q: `${seed.artist} topic` },
        { maxResults: 25, safeSearch }
      );
      pushFromList(s2);
    }
  } else {
    const s = await ytSearch({ q: seed.query }, { maxResults: 25, safeSearch });
    pushFromList(s);
  }

  // 2) 부족하면 related 확장 (라디오 느낌)
  let cursor = 0;
  while (collected.length < target && cursor < Math.min(collected.length, 12)) {
    const v = collected[cursor++];
    try {
      const rel = await ytSearch(
        { relatedToVideoId: v },
        { maxResults: 25, safeSearch }
      );
      pushFromList(rel);
    } catch {
      // 개별 실패는 무시
    }
  }

  // 3) 디테일 조회
  const details = await ytVideosDetails(collected);

  // 4) 합성 playlist + videos (기존 플레이어 형식과 호환)
  const playlist: StationPlaylist = {
    id: stationId,
    snippet: {
      title:
        seed.type === "video"
          ? "스테이션: 관련 트랙"
          : seed.type === "artist"
          ? `스테이션: ${seed.artist}`
          : `스테이션: ${seed.query}`,
      thumbnails: {
        medium: { url: details?.[0]?.snippet?.thumbnails?.medium?.url || "" },
      },
    },
  };

  const videos: StationVideo[] = details.map((d: any) => ({
    id: { videoId: d.id },
    snippet: {
      title: d?.snippet?.title || "Untitled",
      playlistId: stationId,
      thumbnails: {
        default: { url: d?.snippet?.thumbnails?.default?.url || "" },
      },
    },
  }));

  return { playlist, videos };
}
