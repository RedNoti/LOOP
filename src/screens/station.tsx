import React, { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import YouTube, { YouTubeEvent, YouTubePlayer } from "react-youtube";
import { useLocation, useNavigate } from "react-router-dom";
import { buildStation, Seed, StationItem } from "../components/StationEngine";

/**
 * ✅ 안정판 포인트
 * 1) 기존 buildStation 사용 (정상 동작 시 그대로 재생)
 * 2) 실패/빈 큐면 → YouTube Data API v3로 폴백 큐 생성(relatedToVideoId / keyword 검색)
 * 3) 임베드 불가/삭제 영상은 onError에서 자동 제거·스킵 (코드 2/5/100/101/150)
 * 4) autoplay 정책 대응: onReady에서 mute 후 play
 * 5) index/queue 변경 시 loadVideoById 즉시 재생, 큐 자동 보충
 */

const Wrap = styled.div`
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 16px;
  padding: 16px;
  height: calc(100vh - 70px);
  box-sizing: border-box;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    height: auto;
    min-height: calc(100vh - 70px);
  }
`;

const Sidebar = styled.div`
  border-right: 1px solid #eaeaea;
  padding-right: 12px;
  overflow: auto;

  @media (max-width: 900px) {
    border-right: none;
    border-bottom: 1px solid #eaeaea;
    padding-right: 0;
    padding-bottom: 12px;
    margin-bottom: 12px;
  }
`;

const Title = styled.h2` margin: 8px 0 12px; font-size: 20px; font-weight: 700; `;
const SeedBadge = styled.div`
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 12px; padding: 6px 10px; border-radius: 999px; background: #f3f4f6;
  margin: 0 8px 8px 0;
`;
const QueueBox = styled.div` margin-top: 16px; `;
const QueueTitle = styled.div` margin-bottom: 10px; font-size: 12px; color: #6b7280; `;
const QueueList = styled.div`
  display: flex; flex-direction: column; gap: 8px; overflow: auto; max-height: calc(100% - 150px);
`;
const Row = styled.div<{ active?: boolean }>`
  display: grid; grid-template-columns: 84px 1fr; gap: 10px; padding: 8px;
  border-radius: 10px; cursor: pointer; background: ${({ active }) => (active ? "#eef6ff" : "transparent")};
  &:hover { background: ${({ active }) => (active ? "#e3f1ff" : "#fafafa")}; }
`;
const Thumb = styled.img` width: 84px; height: 56px; object-fit: cover; border-radius: 8px; background: #e5e7eb; `;
const Meta = styled.div`
  display: flex; flex-direction: column; gap: 4px; font-size: 13px;
  .title { font-weight: 600; line-height: 1.2; } .sub { color: #6b7280; }
`;
const PlayerArea = styled.div` display: grid; grid-template-rows: auto 1fr auto; gap: 12px; height: 100%; `;
const TopBar = styled.div` display: flex; align-items: center; gap: 12px; flex-wrap: wrap; `;
const Controls = styled.div`
  display: flex; gap: 8px;
  button {
    border: 1px solid #e5e7eb; background: #fff; border-radius: 10px; padding: 8px 12px; cursor: pointer;
    transition: box-shadow 0.15s ease; &:hover { box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
  }
`;
const Now = styled.div` font-size: 14px; .name { font-weight: 700; } .channel { color: #6b7280; }`;
const Help = styled.div` margin-top: 8px; font-size: 12px; color: #6b7280; `;
const EmptyBox = styled.div`
  padding: 24px; border: 1px dashed #e5e7eb; border-radius: 12px; color: #6b7280; text-align: center;
`;

type LocationState = { seedVideoId?: string; seedKeyword?: string; };

const playerOpts = {
  playerVars: {
    autoplay: 1,
    playsinline: 1,
    rel: 0,
    controls: 1,
    modestbranding: 1,
    origin: typeof window !== "undefined" ? window.location.origin : undefined,
  },
};

/* -------------------- 폴백 스테이션 빌더 -------------------- */
type FallbackItem = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;    // ✅ undefined 허용하지 않기
};

function pickKeyword(seeds: Seed[]): string {
  const k = seeds.find(s => s.type === "keyword")?.value;
  return k || "music mix";
}

function uniqBy<T>(arr: T[], key: (x: T) => string) {
  const seen = new Set<string>();
  return arr.filter(x => { const k = key(x); if (seen.has(k)) return false; seen.add(k); return true; });
}

async function fetchRelated(apiKey: string, videoId: string, max = 25): Promise<FallbackItem[]> {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", String(max));
  url.searchParams.set("relatedToVideoId", videoId);
  url.searchParams.set("videoEmbeddable", "true");
  url.searchParams.set("videoSyndicated", "true"); // ✅ 외부 임베드 가능
  url.searchParams.set("topicId", "/m/04rlf");     // ✅ 음악 토픽
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`YT search relatedToVideoId failed: ${res.status}`);
  const data = await res.json();
  return (data.items || []).map((it: any) => ({
    videoId: it.id?.videoId,
    title: it.snippet?.title ?? "",
    channelTitle: it.snippet?.channelTitle ?? "",
    thumbnail:
      it.snippet?.thumbnails?.medium?.url ??
      it.snippet?.thumbnails?.default?.url ??
      "",                                // ✅ 항상 string
  })).filter((x: FallbackItem) => !!x.videoId && x.thumbnail !== "");
}

async function fetchByKeyword(apiKey: string, q: string, max = 25): Promise<FallbackItem[]> {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", String(max));
  url.searchParams.set("q", q);
  url.searchParams.set("videoEmbeddable", "true");
  url.searchParams.set("videoSyndicated", "true"); // ✅
  url.searchParams.set("topicId", "/m/04rlf");     // ✅
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`YT search by keyword failed: ${res.status}`);
  const data = await res.json();
  return (data.items || []).map((it: any) => ({
    videoId: it.id?.videoId,
    title: it.snippet?.title ?? "",
    channelTitle: it.snippet?.channelTitle ?? "",
    thumbnail:
      it.snippet?.thumbnails?.medium?.url ??
      it.snippet?.thumbnails?.default?.url ??
      "",                                // ✅ 항상 string
  })).filter((x: FallbackItem) => !!x.videoId && x.thumbnail !== "");
}

async function buildStationFallback(seeds: Seed[]): Promise<StationItem[]> {
  const apiKey =
    (import.meta as any)?.env?.VITE_YT_API_KEY ||
    (process.env as any)?.REACT_APP_YT_API_KEY;

  if (!apiKey) {
    console.error("[Station] No API key found in env (VITE_YT_API_KEY / REACT_APP_YT_API_KEY).");
    return [];
  }

  let items: FallbackItem[] = [];
  const seedVid = seeds.find(s => s.type === "videoId")?.value;
  const keyword = pickKeyword(seeds);

  try {
    if (seedVid) {
      const rel = await fetchRelated(apiKey, seedVid, 30);
      items = items.concat(rel);
    }
  } catch (e) {
    console.warn("[Station] relatedToVideoId fallback failed:", e);
  }

  if (items.length < 10) {
    try {
      const kw = await fetchByKeyword(apiKey, keyword, 30);
      items = items.concat(kw);
    } catch (e) {
      console.warn("[Station] keyword fallback failed:", e);
    }
  }

  // 중복 제거 및 상위 50개 제한
  const uniq = uniqBy(items, x => x.videoId).slice(0, 50);

const mapped: StationItem[] = uniq.map(x => ({
  videoId: x.videoId,
  title: x.title,
  channelTitle: x.channelTitle,
  thumbnail: x.thumbnail,   // ✅ 이제 항상 string
})) as StationItem[];        // ✅ 타입 단언으로 마무리

  return mapped;
}

/* -------------------- 컴포넌트 -------------------- */
export default function MusicStation() {
  const navi = useNavigate();
  const loc = useLocation();
  const { seedVideoId, seedKeyword } = (loc.state || {}) as LocationState;

  const seeds = useMemo<Seed[]>(() => {
    const s: Seed[] = [];
    if (seedVideoId) s.push({ type: "videoId", value: seedVideoId });
    if (seedKeyword) s.push({ type: "keyword", value: seedKeyword });
    if (s.length === 0) s.push({ type: "keyword", value: "k-pop mix" });
    return s;
  }, [seedVideoId, seedKeyword]);

  const [queue, setQueue] = useState<StationItem[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(true);

  const playerRef = useRef<YouTubePlayer | null>(null);
  const current = queue[index];

  // 스테이션 생성 (기본 → 폴백 순)
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        // 1) 기존 엔진 시도
        const list = await buildStation(seeds, { maxSize: 50, shuffle: true });
        if (!mounted) return;
        if (list && list.length) {
          setQueue(list);
          setIndex(0);
          return;
        }
        throw new Error("Empty result from StationEngine");
      } catch (e) {
        console.warn("[Station] StationEngine failed/empty -> fallback:", e);
        try {
          // 2) 폴백
          const fb = await buildStationFallback(seeds);
          if (!mounted) return;
          setQueue(fb || []);
          setIndex(0);
        } catch (err) {
          console.error("[Station] fallback error:", err);
          if (mounted) { setQueue([]); setIndex(0); }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedVideoId, seedKeyword]);

  // 큐 보충 (현재 트랙 기반)
  const refillIfShort = async () => {
    if (!queue[index] || queue.length >= 15) return;
    try {
      const more = await buildStationFallback([{ type: "videoId", value: queue[index].videoId }]);
      const exist = new Set(queue.map((x) => x.videoId));
      const merged = [...queue, ...(more || []).filter((m) => !exist.has(m.videoId))];
      setQueue(merged);
    } catch (e) {
      console.warn("[Station] refill fallback failed:", e);
    }
  };

  // index/queue 바뀔 때마다 로드·재생
  useEffect(() => {
    const p = playerRef.current;
    const vid = queue[index]?.videoId;
    if (!p || !vid) return;
    try {
      if (muted) p.mute();
      p.loadVideoById(vid);
      p.playVideo();
      const t = setTimeout(refillIfShort, 600);
      return () => clearTimeout(t);
    } catch (e) {
      console.error("[Station] loadVideoById error:", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, queue]);

  const onPlayerReady = (e: YouTubeEvent<any>) => {
    playerRef.current = e.target;
    try {
      e.target.mute();
      const vid = queue[index]?.videoId;
      if (vid) { e.target.loadVideoById(vid); e.target.playVideo(); }
    } catch (err) {
      console.error("[Station] onReady error:", err);
    }
  };

  const onPlayerStateChange = (e: YouTubeEvent<any>) => {
    if (e.data === 0) next();
  };

  const onError = (e: YouTubeEvent<any>) => {
    const code = e.data; // 2,5,100,101,150 등
    console.warn("[Station] YouTube error:", code, "video:", queue[index]?.videoId);
    const FATAL = new Set([2, 5, 100, 101, 150]);
    if (FATAL.has(code)) {
      setQueue(prev => {
        const newQueue = prev.filter((_, i) => i !== index);
        setIndex(i => (newQueue.length === 0 ? 0 : Math.min(i, newQueue.length - 1)));
        return newQueue;
      });
    } else {
      next();
    }
  };

  // 컨트롤
  const playIdx = (i: number) => { if (i >= 0 && i < queue.length) setIndex(i); };
  const next = () => { if (queue.length > 0) setIndex(p => (p < queue.length - 1 ? p + 1 : 0)); };
  const prev = () => { if (queue.length > 0) setIndex(p => (p > 0 ? p - 1 : queue.length - 1)); };
  const dislike = () => {
    if (!current) return next();
    setQueue(prev => {
      const filtered = prev.filter((x) => x.videoId !== current.videoId);
      setIndex(i => (filtered.length === 0 ? 0 : Math.min(i, filtered.length - 1)));
      return filtered;
    });
  };
  const like = () => { next(); };
  const toggleMute = () => {
    const p = playerRef.current;
    if (!p) return;
    if (muted) { p.unMute(); setMuted(false); } else { p.mute(); setMuted(true); }
  };
  const goHome = () => navi("/");

  return (
    <Wrap>
      <Sidebar>
        <Title>Music Station</Title>

        <div style={{ marginBottom: 10, fontSize: 12, color: "#6b7280" }}>Seed</div>
        {seeds.map((s, i) => (
          <SeedBadge key={i}>{s.type === "videoId" ? "🎬 Video" : "🔎 Keyword"}: {s.value}</SeedBadge>
        ))}

        <QueueBox>
          <QueueTitle>Queue</QueueTitle>
          {queue.length === 0 ? (
            <EmptyBox>
              {loading
                ? "추천을 불러오는 중입니다…"
                : "재생 가능한 항목이 없습니다. API 키/네트워크/임베드 제한을 확인해 주세요."}
            </EmptyBox>
          ) : (
            <QueueList>
              {queue.map((item, i) => (
                <Row key={item.videoId + i} active={i === index} onClick={() => playIdx(i)}>
                  <Thumb src={item.thumbnail || ""} alt={item.title} />
                  <Meta>
                    <div className="title">{item.title}</div>
                    <div className="sub">{item.channelTitle}</div>
                  </Meta>
                </Row>
              ))}
            </QueueList>
          )}
        </QueueBox>
      </Sidebar>

      <PlayerArea>
        <TopBar>
          <Controls>
            <button onClick={prev}>⏮ 이전</button>
            <button onClick={next}>⏭ 다음</button>
            <button onClick={like}>👍 좋아요</button>
            <button onClick={dislike}>👎 별로예요</button>
            <button onClick={toggleMute}>{muted ? "🔈 소리 켜기" : "🔇 소리 끄기"}</button>
            <button onClick={goHome}>🏠 홈</button>
          </Controls>

          <Now>
            {current ? (
              <>
                <div className="name">{current.title}</div>
                <div className="channel">{current.channelTitle}</div>
              </>
            ) : (
              <div className="channel">재생 항목이 없습니다.</div>
            )}
          </Now>

          <Help>자동재생이 바로 시작되지 않으면 “소리 켜기” 또는 컨트롤을 한 번 눌러주세요 (브라우저 정책).</Help>
        </TopBar>

        <div style={{ display: "grid", placeItems: "center" }}>
          <div style={{ width: "min(100%, 720px)" }}>
            <YouTube
              videoId={queue[index]?.videoId}
              opts={playerOpts}
              onReady={onPlayerReady}
              onStateChange={onPlayerStateChange}
              onError={onError}
            />
          </div>
        </div>

        <div />
      </PlayerArea>
    </Wrap>
  );
}
