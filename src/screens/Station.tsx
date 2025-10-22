// src/screens/Station.tsx
import React, { useCallback, useMemo, useState } from "react";
import styled from "styled-components";
import { buildStation } from "../components/StationEngine";
import {
  useMusicPlayer,
  playPlaylistFromFile,
} from "../components/MusicFunction";
import { useTheme } from "../components/ThemeContext";

/* ================= Types ================= */
type StationSeed =
  | { type: "video"; videoId: string }
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

/* ================= Utils ================= */
const pick = (isDark: boolean, light: string, dark: string) =>
  isDark ? dark : light;

function toPlaylistJson(result: StationResult): PlaylistJson {
  const { playlist, videos } = result;
  const getThumb = (v?: StationVideo) =>
    (v as any)?.snippet?.thumbnails?.maxres?.url ||
    (v as any)?.snippet?.thumbnails?.high?.url ||
    (v as any)?.snippet?.thumbnails?.medium?.url ||
    (v as any)?.snippet?.thumbnails?.default?.url ||
    "";

  const playlistThumb =
    (playlist?.snippet as any)?.thumbnails?.maxres?.url ||
    (playlist?.snippet as any)?.thumbnails?.high?.url ||
    (playlist?.snippet as any)?.thumbnails?.medium?.url ||
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

/* ================= Styled ================= */
const Page = styled.div<{ $isDark: boolean }>`
  display: grid;
  grid-template-rows: auto auto 1fr;
  gap: 18px;
  padding: 0 0 28px;
  min-height: 100%;
  background: ${({ $isDark }) =>
    $isDark
      ? "linear-gradient(180deg,#0b0c0e 0%, #0d0f16 35%, #0d0d0d 100%)"
      : "linear-gradient(180deg,#f7f7fb 0%, #ffffff 40%, #fafafa 100%)"};
  color: ${({ $isDark }) => pick($isDark, "#0b0c0e", "#f0f0f0")};
  color-scheme: ${({ $isDark }) => ($isDark ? "dark" : "light")};
`;

const Hero = styled.div<{ $isDark: boolean }>`
  position: relative;
  padding: clamp(18px, 3.5vw, 28px) clamp(16px, 3.6vw, 28px) 14px;
  color: ${({ $isDark }) => ($isDark ? "#e5e7eb" : "#0f172a")};
  display: grid;
  gap: 10px;
  overflow: hidden;

  &::after {
    content: "";
    position: absolute;
    inset: -40% -10% auto auto;
    width: 60vw;
    aspect-ratio: 2 / 1;
    border-radius: 999px;
    filter: blur(60px);
    opacity: ${({ $isDark }) => ($isDark ? 0.16 : 0.22)};
    background: ${({ $isDark }) =>
      $isDark
        ? "conic-gradient(from 220deg at 50% 50%, #6e6eff, #10b981, #06b6d4, #6e6eff)"
        : "conic-gradient(from 220deg at 50% 50%, #6366f1, #22c55e, #06b6d4, #6366f1)"};
    pointer-events: none;
  }
`;

const H1 = styled.h2`
  margin: 0;
  font-size: clamp(20px, 3vw, 28px);
  font-weight: 900;
  letter-spacing: 0.2px;
`;

const HSub = styled.p<{ $isDark: boolean }>`
  margin: 0;
  font-size: 13px;
  color: ${({ $isDark }) => ($isDark ? "#98a2b3" : "#475569")};
`;

const Main = styled.div`
  display: grid;
  gap: 14px;
  padding: 0 clamp(16px, 3.6vw, 28px);
`;

const SearchRow = styled.div<{ $isDark: boolean }>`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
  background: ${({ $isDark }) =>
    pick($isDark, "#ffffff", "rgba(255,255,255,.06)")};
  border: 1px solid ${({ $isDark }) => pick($isDark, "#e7e7ec", "#2a2f39")};
  border-radius: 14px;
  padding: 10px 12px;
  box-shadow: ${({ $isDark }) =>
    $isDark ? "0 10px 28px rgba(0,0,0,.35)" : "0 12px 26px rgba(15,23,42,.1)"};
`;

/* === THEMED TOGGLE (현재곡 / 검색어) === */
const SegmentedRoot = styled.div<{ $isDark: boolean }>`
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 180px;
  height: 34px;
  padding: 4px;
  border-radius: 999px;
  border: 1px solid ${({ $isDark }) => pick($isDark, "#e5e7eb", "#2a2f39")};
  background: ${({ $isDark }) =>
    $isDark
      ? "linear-gradient(180deg,#141821 0%,#10141c 100%)"
      : "linear-gradient(180deg,#f2f5fa 0%,#e9edf5 100%)"};
  box-shadow: ${({ $isDark }) =>
    $isDark
      ? "inset 0 1px 0 rgba(255,255,255,.05)"
      : "inset 0 1px 0 rgba(255,255,255,.6)"};
`;

const SegIndicator = styled.div<{ $isDark: boolean; $pos: 0 | 1 }>`
  position: absolute;
  top: 4px;
  left: 4px;
  width: calc(50% - 4px);
  height: calc(100% - 8px);
  border-radius: 999px;
  background: ${({ $isDark }) =>
    $isDark
      ? "linear-gradient(135deg,#0ea5e9,#6e6eff)"
      : "linear-gradient(135deg,#38bdf8,#6366f1)"};
  box-shadow: ${({ $isDark }) =>
    $isDark
      ? "0 6px 18px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.08)"
      : "0 6px 18px rgba(15,23,42,.18), inset 0 0 0 1px rgba(255,255,255,.35)"};
  transform: translateX(${({ $pos }) => ($pos === 0 ? "0%" : "100%")});
  transition: transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
`;

const SegBtn = styled.button<{ $isDark: boolean; $active?: boolean }>`
  position: relative;
  z-index: 1;
  border: none;
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.2px;
  color: ${({ $isDark, $active }) =>
    $active
      ? pick($isDark, "#ffffff", "#0f172a")
      : pick($isDark, "#0f172a", "#cbd5e1")};
  transition: color 120ms ease, transform 80ms ease;
  &:active {
    transform: translateY(1px);
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px
      ${({ $isDark }) =>
        pick($isDark, "rgba(99,102,241,.22)", "rgba(99,102,241,.35)")};
  }
`;

const InputWrap = styled.div<{ $isDark: boolean; $disabled?: boolean }>`
  display: grid;
  grid-template-columns: 24px 1fr;
  gap: 8px;
  align-items: center;
  padding: 0 6px;
  border-left: 1px dashed
    ${({ $isDark }) => pick($isDark, "#e5e7eb", "#30343d")};
  opacity: ${({ $disabled }) => ($disabled ? 0.6 : 1)};
`;

const SearchIcon = ({ dark }: { dark: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
    <circle
      cx="11"
      cy="11"
      r="7"
      stroke={dark ? "#cbd5e1" : "#475569"}
      strokeWidth="2"
      fill="none"
    />
    <path
      d="M20 20l-3.2-3.2"
      stroke={dark ? "#cbd5e1" : "#475569"}
      strokeWidth="2"
      fill="none"
    />
  </svg>
);

const TextInput = styled.input<{ $isDark: boolean }>`
  width: 100%;
  padding: 10px 6px;
  border: none;
  background: transparent;
  color: ${({ $isDark }) => pick($isDark, "#0b0c0e", "#f8fafc")};
  font-size: 14px;
  outline: none;

  &::placeholder {
    color: ${({ $isDark }) => pick($isDark, "#9aa0a6", "#9aa3ae")};
  }
`;

const Primary = styled.button<{ $isDark: boolean }>`
  border: 1px solid ${({ $isDark }) => pick($isDark, "#6366f1", "#6e6eff")};
  background: ${({ $isDark }) => pick($isDark, "#6366f1", "#6e6eff")};
  color: #fff;
  border-radius: 10px;
  font-weight: 800;
  padding: 10px 14px;
  font-size: 14px;
  cursor: pointer;
  transition: transform 0.08s ease, opacity 0.15s ease;
  &:active {
    transform: translateY(1px);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Ghost = styled.button<{ $isDark: boolean }>`
  border: 1px solid ${({ $isDark }) => pick($isDark, "#e4e4e7", "#323843")};
  background: ${({ $isDark }) => pick($isDark, "#f8fafc", "#20242d")};
  color: ${({ $isDark }) => pick($isDark, "#0b0c0e", "#e5e7eb")};
  border-radius: 10px;
  font-weight: 700;
  padding: 10px 12px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease,
    transform 0.08s ease;
  &:hover {
    background: ${({ $isDark }) => pick($isDark, "#eef2f7", "#242a34")};
  }
  &:active {
    transform: translateY(1px);
  }
`;

/* ▶ 현재곡 모드 전용: 재생 버튼 */
const PlayNow = styled.button<{ $isDark: boolean }>`
  border: 1px solid ${({ $isDark }) => pick($isDark, "#e5e7eb", "#3a4150")};
  background: ${({ $isDark }) => pick($isDark, "#ffffff", "#262b35")};
  color: ${({ $isDark }) => pick($isDark, "#111827", "#e5e7eb")};
  border-radius: 10px;
  font-weight: 800;
  padding: 10px 12px;
  font-size: 14px;
  cursor: pointer;
  transition: transform 0.08s ease, background 0.15s ease,
    border-color 0.15s ease;
  &:hover {
    background: ${({ $isDark }) => pick($isDark, "#f8fafc", "#2a3140")};
  }
  &:active {
    transform: translateY(1px);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Presets = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const Chip = styled.button<{ $isDark: boolean }>`
  border: 1px solid ${({ $isDark }) => pick($isDark, "#e5e7eb", "#2a2f39")};
  background: ${({ $isDark }) => pick($isDark, "#ffffff", "#151922")};
  color: ${({ $isDark }) => pick($isDark, "#0f172a", "#cbd5e1")};
  font-size: 12px;
  padding: 8px 12px;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.08s ease,
    border-color 0.15s ease;
  &:hover {
    background: ${({ $isDark }) => pick($isDark, "#f6f7fb", "#1a1f2b")};
  }
  &:active {
    transform: translateY(1px);
  }
`;

const SectionTitle = styled.h3<{ $isDark: boolean }>`
  margin: 6px 0 2px;
  font-size: 15px;
  color: ${({ $isDark }) => pick($isDark, "#0f172a", "#e5e7eb")};
  opacity: 0.9;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
`;

const Card = styled.div<{ $isDark: boolean }>`
  position: relative;
  border: 1px solid ${({ $isDark }) => pick($isDark, "#ececf1", "#2a2f39")};
  background: ${({ $isDark }) => pick($isDark, "#ffffff", "#181c25")};
  border-radius: 14px;
  overflow: hidden;
  transition: transform 0.16s ease, box-shadow 0.16s ease,
    border-color 0.16s ease;
  box-shadow: ${({ $isDark }) =>
    $isDark ? "0 12px 28px rgba(0,0,0,.35)" : "0 12px 26px rgba(15,23,42,.08)"};
  &:hover {
    transform: translateY(-2px);
    border-color: ${({ $isDark }) => pick($isDark, "#dfe3ea", "#3a4150")};
  }
`;

const Cover = styled.div<{ src: string; $isDark: boolean }>`
  position: relative;
  height: 140px;
  background: url(${(p) => p.src}) center/cover no-repeat,
    ${({ $isDark }) => pick($isDark, "#f1f5f9", "#0a0a0a")};
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      rgba(0, 0, 0, 0) 40%,
      rgba(0, 0, 0, 0.35) 100%
    );
    opacity: 0.85;
  }
`;

const FloatingPlay = styled.button<{ $isDark: boolean }>`
  position: absolute;
  right: 10px;
  bottom: 10px;
  z-index: 2;
  border: none;
  border-radius: 999px;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  cursor: pointer;
  background: ${({ $isDark }) =>
    pick($isDark, "rgba(255,255,255,.92)", "rgba(20,22,30,.92)")};
  color: ${({ $isDark }) => pick($isDark, "#0b0c0e", "#e5e7eb")};
  box-shadow: ${({ $isDark }) =>
    $isDark ? "0 8px 18px rgba(0,0,0,.45)" : "0 8px 18px rgba(15,23,42,.22)"};
  transition: transform 0.12s ease, opacity 0.15s ease;
  &:hover {
    transform: scale(1.05);
  }
  &:active {
    transform: scale(0.98);
  }
`;

const Meta = styled.div<{ $isDark: boolean }>`
  display: grid;
  gap: 6px;
  padding: 12px 12px 14px;
  color: ${({ $isDark }) => pick($isDark, "#0f172a", "#e5e7eb")};
`;

const Title = styled.div`
  font-weight: 800;
  font-size: 14px;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Sub = styled.div<{ $isDark: boolean }>`
  font-size: 12px;
  color: ${({ $isDark }) => pick($isDark, "#6b7280", "#a8b1c7")};
`;

/* Empty / Skeleton */
const Empty = styled.div<{ $isDark: boolean }>`
  display: grid;
  place-items: center;
  padding: 32px;
  border: 1px dashed ${({ $isDark }) => pick($isDark, "#d7dbe3", "#344054")};
  border-radius: 14px;
  color: ${({ $isDark }) => pick($isDark, "#334155", "#cbd5e1")};
  background: ${({ $isDark }) => pick($isDark, "#fbfbfe", "#11141a")};
`;

const Skeleton = styled.div<{ $isDark: boolean }>`
  border: 1px solid ${({ $isDark }) => pick($isDark, "#ececf1", "#2a2f39")};
  background: ${({ $isDark }) => pick($isDark, "#ffffff", "#181c25")};
  border-radius: 14px;
  overflow: hidden;
  .cover {
    height: 140px;
    background: linear-gradient(
      90deg,
      ${({ $isDark }) => pick($isDark, "#f1f5f9", "#212635")} 25%,
      ${({ $isDark }) => pick($isDark, "#e5e7eb", "#2a2f39")} 37%,
      ${({ $isDark }) => pick($isDark, "#f1f5f9", "#212635")} 63%
    );
    background-size: 400% 100%;
    animation: shimmer 1.1s infinite;
  }
  .lines {
    padding: 12px;
  }
  .line {
    height: 10px;
    margin: 8px 0;
    border-radius: 6px;
    background: ${({ $isDark }) => pick($isDark, "#eef2f7", "#262b37")};
  }
  @keyframes shimmer {
    0% {
      background-position: 100% 0;
    }
    100% {
      background-position: -100% 0;
    }
  }
`;

/* ================= Component ================= */
type Mode = "current" | "query";

export default function Station() {
  const { currentVideoId, currentVideoTitle } = useMusicPlayer() as any;
  const { isDarkMode } = useTheme();

  const [mode, setMode] = useState<Mode>("query");
  const [text, setText] = useState("");
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

  const upsertPreview = useCallback((json: PlaylistJson) => {
  setPreviews((prev) => [json, ...prev.filter((p) => p.id !== json.id)]);
}, []);

// 현재 모드에 맞는 seed 생성(현재곡/검색어)
const getSeed = useCallback((): StationSeed | null => {
  if (mode === "current") {
    if (!currentVideoId) return null;
    return { type: "video", videoId: String(currentVideoId) };
  }
  const q = text.trim();
  if (!q) return null;
  return { type: "query", query: q };
}, [mode, currentVideoId, text]);

// seed로 스테이션 생성 후 PlaylistJson 반환(트랙 없는 경우 null)
const runBuild = useCallback(async (): Promise<PlaylistJson | null> => {
  const seed = getSeed();
  if (!seed) return null;
  const json = await build(seed);
  if (!json.tracks?.length) return null;
  return json;
}, [getSeed, build]);

  // 빠른 시작(바로 재생)
  const handleQuickStart = useCallback(async () => {
  setLoading(true);
  try {
    const json = await runBuild();
    if (!json) {
      alert("가져온 트랙이 없습니다. 다른 키워드/현재곡으로 시도해보세요.");
      return;
    }
    playPlaylistFromFile(json);
  } catch (e) {
    console.error("[Station] quick start error", e);
    alert("스테이션 생성에 실패했습니다. API/도메인/쿼터 설정을 확인해주세요.");
  } finally {
    setLoading(false);
  }
}, [runBuild]);

  // 미리보기
  const handlePreview = useCallback(async () => {
  setBuilding(true);
  try {
    const json = await runBuild();
    if (!json) return;
    upsertPreview(json);
  } catch (e) {
    console.error("[Station] preview build error", e);
    alert("스테이션 미리보기 생성에 실패했습니다.");
  } finally {
    setBuilding(false);
  }
}, [runBuild, upsertPreview]);


  // 프리셋 → 자동으로 query 모드
 const applyPreset = useCallback(async (q: string) => {
  setMode("query");
  setText(q);
  setBuilding(true);
  try {
    const json = await build({ type: "query", query: q });
    if (json) upsertPreview(json);
  } catch (e) {
    console.error("[Station] preset preview error", e);
  } finally {
    setBuilding(false);
  }
}, [build, upsertPreview]);




  const placeholder =
    mode === "query"
      ? "검색어 예) lofi chill, pop 2024"
      : "현재 곡에서 시작 모드";

  return (
    <Page $isDark={isDarkMode}>
      <Hero $isDark={isDarkMode}>
        <H1>뮤직 스테이션</H1>
        <HSub $isDark={isDarkMode}>
          검색 또는 현재곡으로 스테이션을 만들어요. {seedHint}
        </HSub>
      </Hero>

      <Main>
        <SearchRow $isDark={isDarkMode}>
          {/* 모드 토글: 테마 연동 슬라이더 */}
          <SegmentedRoot
            $isDark={isDarkMode}
            role="tablist"
            aria-label="스테이션 시작 모드"
          >
            <SegIndicator
              $isDark={isDarkMode}
              $pos={mode === "current" ? 0 : 1}
            />
            <SegBtn
              $isDark={isDarkMode}
              $active={mode === "current"}
              onClick={() => setMode("current")}
              role="tab"
              aria-selected={mode === "current"}
              aria-controls="station-search"
              title={canUseCurrent ? "현재 곡에서 시작" : "재생 중인 곡 없음"}
            >
              현재곡
            </SegBtn>
            <SegBtn
              $isDark={isDarkMode}
              $active={mode === "query"}
              onClick={() => setMode("query")}
              role="tab"
              aria-selected={mode === "query"}
              aria-controls="station-search"
            >
              검색어
            </SegBtn>
          </SegmentedRoot>

          {/* 단일 인풋 */}
          <InputWrap $isDark={isDarkMode} $disabled={mode === "current"}>
            <SearchIcon dark={isDarkMode} />
            <TextInput
              id="station-search"
              $isDark={isDarkMode}
              placeholder={placeholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={mode === "current"}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handlePreview();
                }
              }}
            />
          </InputWrap>

          {/* 현재곡 모드: [재생][빠른 시작][미리보기] / 검색어 모드: [빠른 시작][미리보기] */}
          <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
            {mode === "current" && (
              <PlayNow
                $isDark={isDarkMode}
                onClick={handleQuickStart}
                disabled={loading || !canUseCurrent}
                title="현재 곡으로 바로 재생(스테이션 생성)"
              >
                ▶ 재생
              </PlayNow>
            )}
            <Primary
              $isDark={isDarkMode}
              onClick={handleQuickStart}
              disabled={
                loading ||
                (mode === "current" ? !canUseCurrent : text.trim().length === 0)
              }
              title="바로 재생"
            >
              ▶ 빠른 시작
            </Primary>
            <Ghost
              $isDark={isDarkMode}
              onClick={handlePreview}
              disabled={
                building ||
                (mode === "current" ? !canUseCurrent : text.trim().length === 0)
              }
              title="미리보기 생성"
            >
              🔍 미리보기
            </Ghost>
          </div>
        </SearchRow>

        {/* 프리셋 */}
        <Presets>
          {[
            "k-pop 2025 hits",
            "lofi chill",
            "piano focus",
            "EDM festival",
            "hiphop korean",
            "pop remix",
          ].map((t) => (
            <Chip key={t} $isDark={isDarkMode} onClick={() => applyPreset(t)}>
              #{t}
            </Chip>
          ))}
        </Presets>

        {/* 미리보기 */}
        <SectionTitle $isDark={isDarkMode}>스테이션 미리보기</SectionTitle>

        {(building || loading) && (
          <Grid>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={`sk-${i}`} $isDark={isDarkMode}>
                <div className="cover" />
                <div className="lines">
                  <div className="line" style={{ width: "70%" }} />
                  <div className="line" style={{ width: "40%" }} />
                </div>
              </Skeleton>
            ))}
          </Grid>
        )}

        {!building && !loading && previews.length === 0 && (
          <Empty $isDark={isDarkMode} aria-live="polite">
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 38, marginBottom: 8 }}>🎧</div>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>
                아직 미리보기가 없어요
              </div>
              <div style={{ fontSize: 13, opacity: 0.8 }}>
                검색어를 입력하거나, 프리셋 태그를 눌러 시작해보세요.
              </div>
            </div>
          </Empty>
        )}

        {previews.length > 0 && (
          <Grid>
            {previews.map((p) => (
              <Card key={p.id} $isDark={isDarkMode}>
                <Cover
                  $isDark={isDarkMode}
                  src={
                    p.thumbnail || "https://i.ytimg.com/img/no_thumbnail.jpg"
                  }
                >
                  <FloatingPlay
                    $isDark={isDarkMode}
                    title="이 재생목록 재생"
                    onClick={() => playPlaylistFromFile(p)}
                  >
                    ▶
                  </FloatingPlay>
                </Cover>
                <Meta $isDark={isDarkMode}>
                  <Title title={p.title}>{p.title}</Title>
                  <Sub $isDark={isDarkMode}>
                    트랙 {p.tracks.length}개 · 클릭 시 즉시 재생
                  </Sub>
                </Meta>
              </Card>
            ))}
          </Grid>
        )}
      </Main>
    </Page>
  );
}
