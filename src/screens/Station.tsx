// src/screens/station.tsx
// 스테이션 생성 화면(컴포넌트) – 여기서만 useMusicPlayer 훅을 사용해 setPlaylists / setVideos 호출

import React, { useState } from "react";
import styled from "styled-components";
import { useMusicPlayer } from "../components/MusicFunction";
import { buildStation, StationSeed } from "../components/StationEngine";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  height: 100%;
  overflow: auto;
`;

const Row = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`;

const Input = styled.input`
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e0e0e0;
  flex: 1;
`;

const Button = styled.button`
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid #e0e0e0;
  background: #202020;
  color: #fff;
  cursor: pointer;
  transition: transform 0.1s ease;
  &:hover {
    transform: translateY(-1px);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Hint = styled.div`
  color: #8e8e93;
  font-size: 13px;
`;

export default function MusicStation() {
  const {
    currentVideoId,
    currentVideoTitle,
    // setVideos,     <-- 이제 필요 없음
    // setPlaylists,  <-- 이제 필요 없음
    // playPlaylist,  <-- 이제 필요 없음
    playStation, // <--- 새로 사용
  } = useMusicPlayer();

  const [artist, setArtist] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastTitle, setLastTitle] = useState<string | null>(null);

  const canUseCurrent = Boolean(currentVideoId);

  const startFromSeed = async (seed: StationSeed) => {
    setLoading(true);
    try {
      // 🚨 buildStation을 직접 호출하는 대신, useMusicPlayer의 playStation 훅을 사용
      const title = await playStation(seed); // <-- playStation이 모든 상태 업데이트 및 재생 처리

      if (title) {
        setLastTitle(title);
      }
    } catch (e) {
      console.error("[Station] build error", e);
      alert(
        "스테이션 생성 중 오류가 발생했습니다. 로그인/토큰 상태를 확인해주세요."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <h2 style={{ margin: 0 }}>뮤직 스테이션</h2>
      <Hint>곡/아티스트/검색어를 시드로 연관 트랙을 자동 생성합니다.</Hint>

      <Row>
        <Button
          disabled={!canUseCurrent || loading}
          onClick={() =>
            startFromSeed({ type: "video", videoId: currentVideoId as string })
          }
          title={
            canUseCurrent
              ? currentVideoTitle || "현재 곡에서 시작"
              : "재생 중인 곡이 없습니다"
          }
        >
          현재 곡에서 시작
        </Button>

        <Input
          placeholder="아티스트명 (예: NewJeans)"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
        />
        <Button
          disabled={!artist || loading}
          onClick={() => startFromSeed({ type: "artist", artist })}
        >
          아티스트로 시작
        </Button>
      </Row>

      <Row>
        <Input
          placeholder="검색어 (예: lo-fi chill)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button
          disabled={!query || loading}
          onClick={() => startFromSeed({ type: "query", query })}
        >
          검색어로 시작
        </Button>
      </Row>

      {loading && <Hint>스테이션을 구성 중입니다…</Hint>}
      {lastTitle && !loading && (
        <Hint>
          생성됨: <b>{lastTitle}</b>
        </Hint>
      )}
    </Container>
  );
}
