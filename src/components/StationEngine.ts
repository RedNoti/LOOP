// src/components/StationEngine.ts
// YouTube Music Station(라디오) 트랙 빌더 - 순수 유틸 모듈
// - 훅/상태 직접 접근 없음 (컴포넌트에서 setVideos/setPlaylists 호출)
// - 인증: localStorage 'ytAccessToken' (Bearer) 우선, 실패 시 'process.env.REACT_APP_YOUTUBE_API_KEY' 백업

const YT_BASE = "https://www.googleapis.com/youtube/v3" as const;
const MUSIC_CATEGORY_ID = "10"; // 음악 카테고리

export type StationSeed =
  | { type: "video"; videoId: string }
  | { type: "artist"; artist: string }
  | { type: "query"; query: string };

export type StationBuildOptions = {
  targetCount?: number; // 기본 30
  dedupe?: boolean; // 기본 true
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

// ----- OAuth 토큰 확인 -----
function hasOAuthToken(): boolean {
  return !!(
    typeof window !== "undefined" &&
    window.localStorage.getItem("ytAccessToken")
  );
}

// ----- 공통 fetch (Bearer → API Key 백업) -----
async function ytFetch(
  endpoint: string,
  params: Record<string, string | number | boolean | undefined>,
  requireOAuth: boolean = false
) {
  const url = new URL(YT_BASE + endpoint);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  });

  // 1. Bearer 토큰 (OAuth) 시도
  const bearer =
    (typeof window !== "undefined"
      ? window.localStorage.getItem("ytAccessToken")
      : null) || null;

  const headers: Record<string, string> = {};
  if (bearer) headers["Authorization"] = `Bearer ${bearer}`;

  let res = await fetch(url.toString(), { method: "GET", headers });

  if (!res.ok) {
    // OAuth가 필수인 경우 (relatedToVideoId) API Key로 재시도하지 않음
    if (requireOAuth) {
      const text = await res.text();
      throw new Error(`YouTube API Error ${res.status}: ${text}`);
    }

    // 2. Bearer 토큰 실패 시 API Key 백업 시도
    const key = process.env.REACT_APP_YOUTUBE_API_KEY || "";

    if (key) {
      const url2 = new URL(url.toString());
      url2.searchParams.set("key", key);
      res = await fetch(url2.toString(), { method: "GET", headers: {} });
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`YouTube API Error ${res.status}: ${text}`);
    }
  }
  return res.json();
}

// ----- API helpers -----
async function ytSearch(
  qOrParams: { q: string; type?: string },
  opts?: { maxResults?: number; safeSearch?: StationBuildOptions["safeSearch"] }
) {
  let base: Record<string, string | number> = {
    part: "snippet",
    maxResults: opts?.maxResults ?? 25,
    q: qOrParams.q,
    type: "video",
    videoEmbeddable: "true",
    videoSyndicated: "true",
    videoCategoryId: MUSIC_CATEGORY_ID,
  };

  if (opts?.safeSearch && opts.safeSearch !== "none")
    (base as any).safeSearch = opts.safeSearch;

  const data = await ytFetch("/search", base, false);
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

// ----- 대안: 비디오 정보에서 아티스트/채널 추출 후 검색 -----
async function getVideoInfo(videoId: string) {
  try {
    const data = await ytFetch("/videos", {
      part: "snippet",
      id: videoId,
    });
    return data.items?.[0] || null;
  } catch {
    return null;
  }
}

// ----- 핵심: 스테이션 빌드 -----
export async function buildStation(
  seed: StationSeed,
  options: StationBuildOptions = {}
): Promise<StationResult> {
  console.log("[Station] 빌드 시작:", seed, options);

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
    console.log("[Station] 비디오 시드로 수집 시작:", seed.videoId);

    // relatedToVideoId 대신 비디오 정보 기반 검색 사용
    const videoInfo = await getVideoInfo(seed.videoId);
    console.log("[Station] 비디오 정보:", videoInfo?.snippet?.title);

    if (videoInfo) {
      const channelTitle = videoInfo.snippet?.channelTitle || "";
      const videoTitle = videoInfo.snippet?.title || "";

      // 원본 비디오 추가
      if (seed.videoId) {
        seen.add(seed.videoId);
        collected.push(seed.videoId);
      }

      // 채널의 다른 곡들 검색
      if (channelTitle) {
        console.log("[Station] 채널로 검색:", channelTitle);
        const s1 = await ytSearch(
          { q: `${channelTitle} official audio` },
          { maxResults: 25, safeSearch }
        );
        console.log("[Station] 채널 검색 결과:", s1.length);
        pushFromList(s1);
      }

      // 비디오 제목에서 아티스트명 추출 시도 (예: "Artist - Song Title")
      if (collected.length < target / 2 && videoTitle) {
        const artistMatch = videoTitle.match(/^([^-]+)\s*-/);
        if (artistMatch) {
          const artist = artistMatch[1].trim();
          console.log("[Station] 제목에서 추출한 아티스트:", artist);
          const s2 = await ytSearch(
            { q: `${artist}` },
            { maxResults: 25, safeSearch }
          );
          console.log("[Station] 아티스트 검색 결과:", s2.length);
          pushFromList(s2);
        }
      }
    }
    console.log("[Station] 1차 수집 완료:", collected.length);
  } else if (seed.type === "artist") {
    const s1 = await ytSearch(
      { q: `${seed.artist} official audio` },
      { maxResults: 25, safeSearch }
    );
    console.log("[Station] 아티스트 검색 결과:", s1.length);
    pushFromList(s1);
    if (collected.length < target) {
      const s2 = await ytSearch(
        { q: `${seed.artist} topic` },
        { maxResults: 25, safeSearch }
      );
      console.log("[Station] Topic 검색 결과:", s2.length);
      pushFromList(s2);
    }
  } else {
    const s = await ytSearch({ q: seed.query }, { maxResults: 25, safeSearch });
    console.log("[Station] 검색어 결과:", s.length);
    pushFromList(s);
  }

  console.log(
    "[Station] 1차 수집 완료, 총:",
    collected.length,
    "/ 목표:",
    target
  );

  // 2) 부족하면 추가 확장 (채널/아티스트 기반)
  if (collected.length < target && collected.length > 0) {
    console.log("[Station] 추가 확장 시작");

    // 첫 번째 수집된 비디오의 채널로 추가 검색
    const firstVideoInfo = await getVideoInfo(collected[0]);
    if (firstVideoInfo) {
      const channelTitle = firstVideoInfo.snippet?.channelTitle;
      if (channelTitle) {
        console.log("[Station] 첫 비디오 채널로 확장:", channelTitle);
        const more = await ytSearch(
          { q: channelTitle },
          { maxResults: Math.min(25, target - collected.length), safeSearch }
        );
        console.log("[Station] 채널 확장 결과:", more.length);
        pushFromList(more);
      }
    }

    // 여전히 부족하면 장르/분위기 기반 검색
    if (collected.length < target) {
      console.log("[Station] 장르 기반 확장 시작");
      const genres = ["pop music", "k-pop", "indie music", "rock music"];
      for (const genre of genres) {
        if (collected.length >= target) break;
        try {
          const extra = await ytSearch(
            { q: genre },
            { maxResults: Math.min(10, target - collected.length), safeSearch }
          );
          console.log(`[Station] ${genre} 검색 결과:`, extra.length);
          pushFromList(extra);
        } catch (e) {
          console.warn(`[Station] ${genre} 검색 실패:`, e);
        }
      }
    }
  }

  console.log("[Station] 최종 수집 완료:", collected.length);

  // 3) 디테일 조회
  const details = await ytVideosDetails(collected);

  // 4) 합성 playlist + videos
  // 기본 썸네일 URL
  const defaultThumbnail = "https://i.ytimg.com/vi/default/default.jpg";

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
        medium: {
          url:
            details?.[0]?.snippet?.thumbnails?.medium?.url ||
            details?.[0]?.snippet?.thumbnails?.default?.url ||
            defaultThumbnail,
        },
      },
    },
  };

  const videos: StationVideo[] = details.map((d: any) => ({
    id: { videoId: d.id },
    snippet: {
      title: d?.snippet?.title || "Untitled",
      playlistId: stationId,
      thumbnails: {
        default: {
          url:
            d?.snippet?.thumbnails?.default?.url ||
            d?.snippet?.thumbnails?.medium?.url ||
            `https://i.ytimg.com/vi/${d.id}/default.jpg`,
        },
      },
    },
  }));

  return { playlist, videos };
}
