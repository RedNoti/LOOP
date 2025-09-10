// src/screens/station.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import YouTube, { YouTubeEvent, YouTubePlayer } from "react-youtube";
import { buildStation, Seed, StationItem } from "../components/StationEngine";
import { useLocation, useNavigate } from "react-router-dom";

const Wrap = styled.div`
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 16px;
  padding: 16px;
  height: calc(100vh - 70px);
  box-sizing: border-box;
`;

const Sidebar = styled.div`
  border-right: 1px solid #eaeaea;
  padding-right: 12px;
  overflow: auto;
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

const Queue = styled.div`
  margin-top: 12px;
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

type LocationState = {
  seedVideoId?: string;
  seedKeyword?: string;
};

export default function MusicStation() {
  const navi = useNavigate();
  const loc = useLocation();
  const { seedVideoId, seedKeyword } = (loc.state || {}) as LocationState;

  const seeds = useMemo<Seed[]>(() => {
    const s: Seed[] = [];
    if (seedVideoId) s.push({ type: "videoId", value: seedVideoId });
    if (seedKeyword) s.push({ type: "keyword", value: seedKeyword });
    if (s.length === 0) s.push({ type: "keyword", value: "k-pop mix" }); // 기본값
    return s;
  }, [seedVideoId, seedKeyword]);

  const [queue, setQueue] = useState<StationItem[]>([]);
  const [index, setIndex] = useState(0);
  const playerRef = useRef<YouTubePlayer | null>(null); // ✅ 타입 지정
  const current = queue[index];

  // 최초/시드 바뀔 때 스테이션 생성
  useEffect(() => {
    let mounted = true;
    (async () => {
      const list = await buildStation(seeds, { maxSize: 50, shuffle: true });
      if (mounted) {
        setQueue(list);
        setIndex(0);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [seeds]);

  const playIdx = (i: number) => {
    if (i < 0 || i >= queue.length) return;
    setIndex(i);
  };

  const next = () => {
    if (index < queue.length - 1) setIndex(index + 1);
    else setIndex(0); // 루프
  };

  const prev = () => {
    if (index > 0) setIndex(index - 1);
    else setIndex(queue.length - 1);
  };

  const dislike = () => {
    // “별로예요” → 현재 항목 제외하고 다음 곡으로
    const vid = current?.videoId;
    if (!vid) return next();
    const filtered = queue.filter((x) => x.videoId !== vid);
    setQueue(filtered);
    setIndex((i) => Math.min(i, filtered.length - 1));
  };

  const like = () => {
    // 좋아요 → 간단히 다음 곡. (원한다면 Firestore에 선호도 저장 가능)
    next();
  };

  const refillIfShort = async () => {
    if (queue.length < 15 && current) {
      const more = await buildStation([{ type: "videoId", value: current.videoId }], {
        maxSize: 30,
        shuffle: true,
      });
      // 뒤에 이어붙이되, 현재 큐에 없는 것만 추가
      const exist = new Set(queue.map((x) => x.videoId));
      const merged = [...queue, ...more.filter((m) => !exist.has(m.videoId))];
      setQueue(merged);
    }
  };

  useEffect(() => {
    refillIfShort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.length]);

  return (
    <Wrap>
      <Sidebar>
        <Title>Music Station</Title>
        <div>
          {seeds.map((s, idx) => (
            <SeedBadge key={idx}>
              <span>Seed:</span>
              <b>{s.type}</b>
              <span>—</span>
              <span>{s.value}</span>
            </SeedBadge>
          ))}
        </div>
        <Queue>
          {queue.map((it, i) => (
            <Row key={it.videoId} active={i === index} onClick={() => playIdx(i)}>
              <Thumb src={it.thumbnail} alt={it.title} />
              <Meta>
                <div className="title">{it.title}</div>
                <div className="sub">{it.channelTitle}</div>
              </Meta>
            </Row>
          ))}
        </Queue>
      </Sidebar>

      <PlayerArea>
        <TopBar>
          <button onClick={() => navi(-1)}>← 뒤로</button>
          <Now>
            <div className="name">{current?.title || "로딩 중..."}</div>
            <div className="channel">{current?.channelTitle}</div>
          </Now>
        </TopBar>

        <div>
          {current && (
            <YouTube
              videoId={current.videoId}
              opts={{
                width: "100%",
                height: "520",
                playerVars: { autoplay: 1 },
              }}
              onEnd={next}
              onReady={(e: YouTubeEvent<YouTubePlayer>) => {
                playerRef.current = e.target; // ✅ e에 타입 지정
              }}
            />
          )}
        </div>

        <Controls>
          <button onClick={prev}>⏮ 이전</button>
          <button onClick={next}>⏭ 다음</button>
          <button onClick={like}>👍 좋아요</button>
          <button onClick={dislike}>👎 별로예요</button>
          <button
            onClick={async () => {
              // 현재 곡을 시드로 새로 생성
              if (current) {
                const list = await buildStation(
                  [{ type: "videoId", value: current.videoId }],
                  { maxSize: 50, shuffle: true }
                );
                setQueue(list);
                setIndex(0);
              }
            }}
          >
            🔁 현재 곡 기준으로 새로 만들기
          </button>
        </Controls>
      </PlayerArea>
    </Wrap>
  );
}
