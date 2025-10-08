// src/screens/Station.tsx
import React, { useCallback, useMemo, useState } from "react";
import styled from "styled-components";
import { buildStation } from "../components/StationEngine";
import {
  useMusicPlayer,
  playPlaylistFromFile,
} from "../components/MusicFunction";

type StationSeed =
  | { type: "video"; videoId: string }
  | { type: "artist"; artist: string }
  | { type: "query"; query: string };

type StationVideo = {
  id: { videoId?: string } | string;
  snippet: {
    title: string;
    thumbnails?: { [k: string]: { url: string } };
    playlistId?: string;
    channelTitle?: string;
  };
};

type StationPlaylist = {
  id: string;
  snippet: {
    title: string;
    thumbnails?: { [k: string]: { url: string } };
  };
};

type StationResult = {
  playlist: StationPlaylist;
  videos: StationVideo[];
};

type PlaylistJsonTrack = {
  videoId: string;
  title: string;
  thumbnail: string;
};

type PlaylistJson = {
  id: string;
  title: string;
  thumbnail: string;
  tracks: PlaylistJsonTrack[];
};

// Station 결과 → 재생목록 JSON
function toPlaylistJson(result: StationResult): PlaylistJson {
  const { playlist, videos } = result;

  const getThumb = (v?: StationVideo) =>
    v?.snippet?.thumbnails?.medium?.url ||
    (v as any)?.snippet?.thumbnails?.default?.url ||
    "";

  const playlistThumb =
    (playlist?.snippet as any)?.thumbnails?.medium?.url ||
    (playlist?.snippet as any)?.thumbnails?.high?.url ||
    getThumb(videos?.[0]) ||
    "";

  const tracks: PlaylistJsonTrack[] = (videos || [])
    .map((v) => {
      const videoId = typeof v.id === "string" ? v.id : v.id?.videoId;
      if (!videoId) return null;
      return {
        videoId,
        title: v.snippet.title,
        thumbnail: getThumb(v),
      };
    })
    .filter(Boolean) as PlaylistJsonTrack[];

  return {
    id: playlist?.id || `station:${Date.now()}`,
    title: playlist?.snippet?.title || "Music Station",
    thumbnail: playlistThumb,
    tracks,
  };
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px; /* 간격 살짝 넓힘 */
  padding: 24px; /* 패딩 넓힘 */
  width: 100%;
  height: 100%;
  overflow: auto;
  /* LOOP 기본 배경 색상에 맞춤 */
  background: #0d0d0d;
  color: #f0f0f0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen",
    "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue",
    sans-serif;
`;
/* 💡 수정: 섹션 전체를 네모 박스로 감싸고 호버 효과 추가 */
const Section = styled.div`
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 10px; /* 간격 수정 */
  align-items: center;
  /* 네모 박스 스타일 추가 */
  border: 1px solid #282828;
  border-radius: 12px;
  padding: 15px;
  background: #1e1e1e;
  transition: border-color 0.3s; /* 호버 애니메이션 추가 */

  &:hover {
    border-color: #3c3c3c; /* 호버 시 테두리 색상 변경 */
  }

  @media (max-width: 720px) {
    grid-template-columns: 1fr auto;
  }
`;
const Input = styled.input`
  width: 100%;
  padding: 12px; /* 패딩 넓힘 */
  border-radius: 8px; /* 둥근 정도 수정 */
  border: 1px solid #282828; /* 어두운 테두리 */
  background: #0d0d0d; /* 섹션 배경보다 더 어둡게 */
  color: #f0f0f0;
  font-size: 14px;
  &:focus {
    border-color: #6e6eff; /* 포커스 색상 유지 */
    outline: none;
  }
`;
/* 💡 수정: 버튼 내부 아이콘 공간 확보 및 텍스트/아이콘 정렬 */
const Button = styled.button<{ $primary?: boolean }>`
  display: flex; /* 아이콘과 텍스트를 나란히 */
  align-items: center;
  justify-content: center;
  gap: 6px; /* 아이콘과 텍스트 사이 간격 */
  padding: 12px 16px; /* 패딩 수정 */
  border-radius: 8px; /* 둥근 정도 수정 */
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;

  /* Primary 버튼 스타일 */
  ${({ $primary }) =>
    $primary
      ? `
      border: 1px solid #6e6eff;
      background: #6e6eff;
      color: #fff;
    `
      : `
      border: 1px solid #3c3c3c; /* 일반 버튼 테두리 */
      background: #282828; /* 일반 버튼 배경 */
      color: #f0f0f0;
    `}

  &:hover:not(:disabled) {
    opacity: 0.9;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
const PreviewGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(
    auto-fill,
    minmax(240px, 1fr)
  ); /* 최소 크기 키움 */
  gap: 20px; /* 간격 넓힘 */
  padding-top: 10px;
`;
const Card = styled.div`
  /* 설정 화면의 항목처럼 깔끔한 스타일로 변경 */
  border: 1px solid #282828;
  border-radius: 12px;
  overflow: hidden;
  background: #1e1e1e;
  color: #f0f0f0;
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-2px);
    border-color: #3c3c3c;
  }
`;
const Thumb = styled.img`
  width: 100%;
  height: 130px; /* 높이 약간 키움 */
  object-fit: cover;
  display: block;
  background: #0a0a0a;
`;
const Meta = styled.div`
  padding: 15px 12px 12px; /* 패딩 조정 */
  display: grid;
  gap: 8px; /* 간격 조정 */
`;
const Title = styled.div`
  font-weight: 700;
  font-size: 15px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const Sub = styled.div`
  font-size: 12px;
  opacity: 0.7;
`;
const PlayButton = styled.button`
  /* 버튼 스타일을 통일감 있게 변경 */
  border: none;
  background: #3c3c3c;
  color: #f0f0f0;
  border-radius: 6px;
  padding: 8px 10px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 4px; /* 위쪽 여백 */

  &:hover {
    background: #505050;
  }
`;

export default function Station() {
  const { currentVideoId, currentVideoTitle } = useMusicPlayer() as any;

  const [artist, setArtist] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [previews, setPreviews] = useState<PlaylistJson[]>([]);

  const canUseCurrent = !!currentVideoId;
  const seedHint = useMemo(
    () =>
      currentVideoTitle
        ? `현재 곡: ${currentVideoTitle}`
        : "현재 재생 중인 곡이 있으면 바로 스테이션을 시작할 수 있어요.",
    [currentVideoTitle]
  );

  const build = useCallback(async (seed: StationSeed) => {
    const result = (await buildStation(seed, {
      targetCount: 35,
      dedupe: true,
      safeSearch: "moderate",
    })) as StationResult;
    return toPlaylistJson(result);
  }, []);

  // 즉시 재생 경로 – 내부 재생기 함수 사용 (이벤트 직접 dispatch 금지)
  const startFromSeed = useCallback(
    async (seed: StationSeed) => {
      setLoading(true);
      try {
        const json = await build(seed);
        if (!json.tracks?.length) {
          alert("가져온 트랙이 없습니다. 검색어나 아티스트를 바꿔보세요.");
          return;
        }
        playPlaylistFromFile(json); // ✅ 여기로 통일
      } catch (e) {
        console.error("[Station] build error", e);
        alert(
          "스테이션 생성에 실패했습니다. API 키/도메인/쿼터 설정을 확인해주세요."
        );
      } finally {
        setLoading(false);
      }
    },
    [build]
  );

  // 미리보기 카드 생성
  const buildPreview = useCallback(
    async (seed: StationSeed) => {
      setBuilding(true);
      try {
        const json = await build(seed);
        setPreviews((prev) => [json, ...prev.filter((p) => p.id !== json.id)]);
      } catch (e) {
        console.error("[Station] preview build error", e);
        alert("스테이션 미리보기 생성에 실패했습니다.");
      } finally {
        setBuilding(false);
      }
    },
    [build]
  );

  return (
    <Container>
      <h2 style={{ margin: 0, fontSize: 20 }}>뮤직 스테이션</h2>
      <div
        style={{ fontSize: 13, opacity: 0.75, marginTop: 4, color: "#ffcc00" }}
      >
        관심있는 가수나 곡을 검색하면 관련 플레이 리스트를 생성해드립니다.
      </div>
      <div style={{ fontSize: 13, opacity: 0.75, marginTop: -4 }}>
        {seedHint}
      </div>

      {/* 1) 현재 곡에서 시작 */}
      <Section>
        <Input
          readOnly
          value={
            currentVideoTitle
              ? `현재 곡: ${currentVideoTitle}`
              : "현재 재생 중인 곡이 없습니다"
          }
        />
        <Button
          $primary
          disabled={!canUseCurrent || loading}
          onClick={() =>
            startFromSeed({ type: "video", videoId: String(currentVideoId) })
          }
          title={canUseCurrent ? "현재 곡에서 즉시 재생" : "재생 중인 곡 없음"}
        >
          <span style={{ fontSize: 16 }}>▶</span> 빠른 시작
        </Button>
        <Button
          disabled={!canUseCurrent || building}
          onClick={() =>
            buildPreview({ type: "video", videoId: String(currentVideoId) })
          }
          title={
            canUseCurrent ? "현재 곡으로 미리보기 생성" : "재생 중인 곡 없음"
          }
        >
          <span style={{ fontSize: 16 }}>🔍</span> 미리보기
        </Button>
      </Section>

      {/* 2) 아티스트로 시작 */}
      <Section>
        <Input
          placeholder="아티스트명 예) NewJeans"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
        />
        <Button
          $primary
          disabled={!artist || loading}
          onClick={() => startFromSeed({ type: "artist", artist })}
        >
          <span style={{ fontSize: 16 }}>▶</span> 빠른 시작
        </Button>
        <Button
          disabled={!artist || building}
          onClick={() => buildPreview({ type: "artist", artist })}
        >
          <span style={{ fontSize: 16 }}>🔍</span> 미리보기
        </Button>
      </Section>

      {/* 3) 검색어로 시작 */}
      <Section>
        <Input
          placeholder="검색어 예) lofi chill, pop 2024"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button
          $primary
          disabled={!query || loading}
          onClick={() => startFromSeed({ type: "query", query })}
        >
          <span style={{ fontSize: 16 }}>▶</span> 빠른 시작
        </Button>
        <Button
          disabled={!query || building}
          onClick={() => buildPreview({ type: "query", query })}
        >
          <span style={{ fontSize: 16 }}>🔍</span> 미리보기
        </Button>
      </Section>

      {previews.length > 0 && (
        <h3 style={{ margin: "10px 0 0 0", fontSize: 18 }}>
          스테이션 미리보기
        </h3>
      )}

      <PreviewGrid>
        {previews.map((p) => (
          <Card key={p.id}>
            <Thumb
              src={p.thumbnail || "https://i.ytimg.com/img/no_thumbnail.jpg"}
              alt=""
              loading="lazy"
              onError={(e) =>
                ((e.target as HTMLImageElement).src =
                  "https://i.ytimg.com/img/no_thumbnail.jpg")
              }
            />
            <Meta>
              <Title>{p.title}</Title>
              <Sub>트랙 {p.tracks.length}개 · 클릭 시 즉시 재생</Sub>
              <PlayButton type="button" onClick={() => playPlaylistFromFile(p)}>
                ▶ 이 재생목록 재생
              </PlayButton>
            </Meta>
          </Card>
        ))}
      </PreviewGrid>
    </Container>
  );
}
