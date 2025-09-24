// src/screens/station.tsx
// 플레이어 에러(2/5/100/101/150) 자동 스킵 + 빈/잘못된 아이템 가드 + 폴백 재빌드

import React, { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import YouTube, { YouTubeEvent, YouTubePlayer } from "react-youtube";
import { useLocation } from "react-router-dom";
import { buildStation, Seed, StationItem } from "../components/StationEngine";

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

const Title = styled.h2`
  margin: 8px 0 12px;
  font-size: 20px;
  font-weight: 700;
`;
const SeedBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 999px;
  background: #f3f4f6;
  margin: 0 8px 8px 0;
`;
const QueueBox = styled.div`
  margin-top: 16px;
`;
const QueueTitle = styled.div`
  margin-bottom: 10px;
  font-size: 12px;
  color: #6b7280;
`;
const QueueList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
  max-height: calc(100% - 150px);
`;
const Row = styled.div<{ active?: boolean }>`
  display: grid;
  grid-template-columns: 84px 1fr;
  gap: 10px;
  padding: 8px;
  border-radius: 10px;
  cursor: pointer;
  background: ${({ active }) => (active ? "#eef6ff" : "transparent")};
  &:hover {
    background: ${({ active }) => (active ? "#e3f1ff" : "#fafafa")};
  }
`;
const Thumb = styled.img`
  width: 84px;
  height: 56px;
  object-fit: cover;
  border-radius: 8px;
  background: #e5e7eb;
`;
const Meta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  .title {
    font-weight: 600;
    line-height: 1.2;
  }
  .sub {
    color: #6b7280;
  }
`;
const PlayerArea = styled.div`
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 12px;
  height: 100%;
`;
const TopBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;
const Controls = styled.div`
  display: flex;
  gap: 8px;
  button {
    border: 1px solid #e5e7eb;
    background: #fff;
    border-radius: 10px;
    padding: 8px 12px;
    cursor: pointer;
    transition: box-shadow 0.15s ease;
    &:hover {
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
    }
  }
`;
const Now = styled.div`
  font-size: 14px;
  .name {
    font-weight: 700;
  }
  .channel {
    color: #6b7280;
  }
`;
const Help = styled.div`
  margin-top: 8px;
  font-size: 12px;
  color: #6b7280;
`;
const EmptyBox = styled.div`
  padding: 24px;
  border: 1px dashed #e5e7eb;
  border-radius: 12px;
  color: #6b7280;
  text-align: center;
`;

type LocationState = { seedVideoId?: string; seedKeyword?: string };

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

// 플레이어 에러 코드들 → 스킵 대상
const SKIP_ERROR_CODES = new Set([2, 5, 100, 101, 150]);

export default function MusicStation() {
  const loc = useLocation();
  const { seedVideoId, seedKeyword } = (loc.state || {}) as LocationState;

  const seeds = useMemo<Seed[]>(() => {
    const s: Seed[] = [];
    if (seedVideoId) s.push({ type: "videoId", value: seedVideoId });
    if (seedKeyword) s.push({ type: "keyword", value: seedKeyword });
    if (s.length === 0) s.push({ type: "keyword", value: "music mix" });
    return s;
  }, [seedVideoId, seedKeyword]);

  const playerRef = useRef<YouTubePlayer | null>(null);
  const [queue, setQueue] = useState<StationItem[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  async function buildAndSet() {
    setLoading(true);
    try {
      const q = await buildStation(seeds);
      setQueue(q);
      setIndex(0);
    } catch (e) {
      console.warn("[Station] build error:", e);
      setQueue([]);
      setIndex(0);
    } finally {
      setLoading(false);
    }
  }

  // 최초/시드 변경 시 큐 빌드
  useEffect(() => {
    buildAndSet();
  }, [seeds.map((s) => `${s.type}:${s.value}`).join("|")]);

  // index 변경 시 재생
  useEffect(() => {
    const it = queue[index];
    if (!it || !it.videoId) {
      return;
    }
    if (playerRef.current) {
      playerRef.current.loadVideoById(it.videoId);
    }
  }, [index, queue]);

  const playAt = (i: number) => {
    const it = queue[i];
    if (!it || !it.videoId) {
      console.warn("[Station] invalid item, skip", it);
      return;
    }
    setIndex(i);
  };

  const next = () => {
    if (queue.length === 0) return;
    const ni = index + 1;
    if (ni >= queue.length) {
      // 큐 소진 → 재빌드 시도
      buildAndSet();
    } else {
      setIndex(ni);
    }
  };

  const prev = () => {
    if (index > 0) setIndex(index - 1);
  };

  // YouTube 이벤트
  const onReady = (e: YouTubeEvent) => {
    playerRef.current = e.target as unknown as YouTubePlayer;
    try {
      // 자동재생 정책 회피: mute 후 play
      playerRef.current.mute();
      playerRef.current.playVideo();
    } catch {}
  };

  const onEnd = () => {
    next();
  };

  const onError = (e: { data: number }) => {
    const code = e?.data;
    console.warn("[Station] YouTube error:", code, "video:", queue[index]?.videoId);
    if (SKIP_ERROR_CODES.has(code)) {
      // 현재 아이템 제거 후 다음 곡
      setQueue((old) => old.filter((_, i) => i !== index));
      // 제거했으니 같은 index로 다음 아이템이 자동 당겨짐
      // 만약 제거 후 큐가 비면 재빌드
      setTimeout(() => {
        if (index >= (queue.length - 1)) {
          buildAndSet();
        }
      }, 0);
    }
  };

  const now = queue[index];

  return (
    <Wrap>
      <Sidebar>
        <Title>뮤직 스테이션</Title>
        <div>
          {seeds.map((s, i) => (
            <SeedBadge key={i}>
              <b>{s.type}</b> {s.value}
            </SeedBadge>
          ))}
        </div>

        <QueueBox>
          <QueueTitle>대기열 ({queue.length})</QueueTitle>
          {queue.length === 0 ? (
            <EmptyBox>
              {loading ? "스테이션 준비 중..." : "결과가 없습니다. 다시 시도해주세요."}
            </EmptyBox>
          ) : (
            <QueueList>
              {queue.map((q, i) => (
                <Row key={q.videoId} active={i === index} onClick={() => playAt(i)}>
                  <Thumb src={q.thumbnail} alt="" />
                  <Meta>
                    <div className="title">{q.title}</div>
                    <div className="sub">{q.channelTitle}</div>
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
            <button onClick={prev}>이전</button>
            <button onClick={next}>다음</button>
            <button onClick={buildAndSet}>재생목록 다시 만들기</button>
          </Controls>
          <Now>
            {now ? (
              <>
                <span className="name">{now.title}</span>{" "}
                <span className="channel">· {now.channelTitle}</span>
              </>
            ) : (
              "대기열 없음"
            )}
          </Now>
        </TopBar>

        <div>
          <YouTube
            videoId={now?.videoId || undefined}
            opts={playerOpts}
            onReady={onReady}
            onEnd={onEnd}
            onError={onError}
          />
        </div>

        <Help>
          임베드 불가/삭제/잘못된 파라미터 영상은 자동으로 건너뜁니다. (코드 2/5/100/101/150)
        </Help>
      </PlayerArea>
    </Wrap>
  );
}
