// src/screens/Station.tsx
import React, { useCallback, useMemo, useState } from "react";
import styled from "styled-components";
import { buildStation } from "../components/StationEngine";
import { useMusicPlayer, playPlaylistFromFile } from "../components/MusicFunction";
import { auth, db } from "../firebaseConfig";
import { doc, setDoc } from "firebase/firestore";

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

// =============================
// B) 재생목록 JSON에 제작자/메타 필드 추가
// =============================
type PlaylistJson = {
  id: string;
  title: string;
  thumbnail: string;
  tracks: PlaylistJsonTrack[];
  // ---- 추가 메타 ----
  createdAt: number;
  createdByUid: string | null;
  createdByName: string | null;
  source: { kind: "station"; seed: StationSeed };
};

// =============================
// Station 결과 → 재생목록 JSON
// (seed를 받아 메타에 기록)
// =============================
function toPlaylistJson(result: StationResult, seed?: StationSeed): PlaylistJson {
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
    // ---- 메타 기록 ----
    createdAt: Date.now(),
    createdByUid: auth.currentUser?.uid ?? null,
    createdByName: auth.currentUser?.displayName ?? null,
    source: { kind: "station", seed: seed! },
  };
}

// =============================
// C) 업로드/DB 저장 유틸들 (컴포넌트 밖)
// =============================

// 서버에 .json 업로드 (InputPost.tsx와 동일한 프로토콜: field name = "file")
async function uploadStationPlaylistJson(json: PlaylistJson) {
  const blob = new Blob([JSON.stringify(json)], { type: "application/json" });
  const form = new FormData();
  form.append("file", blob, "playlist.json");
  form.append("userId", auth.currentUser?.uid || "");
  form.append("playlistTitle", json.title);

  const res = await fetch("https://loopmusic.o-r.kr:4001/upload/playlist", {
    method: "POST",
    body: form,
    mode: "cors",
    referrerPolicy: "no-referrer",
  });

  // 서버가 에러면 여기서 throw
  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch {/* ignore */}
  if (!res.ok || !data?.success || !data?.data?.filename) {
    throw new Error(`Upload failed: HTTP ${res.status} · ${text?.slice(0,200)}`);
  }

  const playlistFileUrl =
    `https://loopmusic.o-r.kr:4001/uploads/shared_playlists/${data.data.filename}`;
  return playlistFileUrl;
}

// Firestore(shared_playlists/{id})에 메타 저장
async function saveStationPlaylistMeta(json: PlaylistJson, playlistFileUrl: string) {
  const ref = doc(db, "shared_playlists", json.id);
  await setDoc(ref, {
    id: json.id,
    title: json.title,
    thumbnail: json.thumbnail,
    tracksCount: json.tracks.length,
    createdAt: json.createdAt,
    createdByUid: json.createdByUid,
    createdByName: json.createdByName,
    playlistFileUrl,
    source: json.source,
  }, { merge: true });
}

// 세션의 "내 재생목록" 목록에 추가 (music 화면에서 클릭 가능하게)
function registerPlaylistInSession(json: PlaylistJson) {
  const key = "playlists";
  const existing = JSON.parse(sessionStorage.getItem(key) || "[]");
  const exists = existing.some((p: any) => p.id === json.id);
  if (!exists) {
    existing.push({
      id: json.id,
      snippet: {
        title: json.title,
        thumbnails: {
          high: { url: json.thumbnail },
          medium: { url: json.thumbnail },
          default: { url: json.thumbnail },
        },
      },
    });
    sessionStorage.setItem(key, JSON.stringify(existing));
  }
}

// =============================
// UI
// =============================
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  width: 100%;
  height: 100%;
  overflow: auto;
`;
const Section = styled.div`
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 8px;
  align-items: center;
  @media (max-width: 720px) {
    grid-template-columns: 1fr auto;
  }
`;
const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #2a2a2e;
  background: #101013;
  color: #fff;
  &:focus { border-color: #6e6eff; }
`;
const Button = styled.button<{ $primary?: boolean }>`
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid ${({ $primary }) => ($primary ? "#6e6eff" : "#2a2a2e")};
  background: ${({ $primary }) => ($primary ? "#6e6eff" : "#17171a")};
  color: #fff; font-weight: 600; cursor: pointer;
  &:disabled { opacity: .6; cursor: not-allowed; }
`;
const PreviewGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
`;
const Card = styled.div`
  border: 1px solid #2a2a2e; border-radius: 12px; overflow: hidden; background: #101013; color: #fff;
`;
const Thumb = styled.img`
  width: 100%; height: 124px; object-fit: cover; display: block; background: #070708;
`;
const Meta = styled.div` padding: 10px 12px; display: grid; gap: 6px; `;
const Title = styled.div` font-weight: 700; font-size: 14px; `;
const Sub = styled.div` font-size: 12px; opacity: .8; `;
const PlayButton = styled.button`
  border: 1px solid #ffffff33; background: #ffffff14; color: #fff;
  border-radius: 8px; padding: 8px 10px; font-weight: 600; cursor: pointer;
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
    () => (currentVideoTitle ? `현재 곡: ${currentVideoTitle}` : "현재 재생 중인 곡이 있으면 바로 스테이션을 시작할 수 있어요."),
    [currentVideoTitle]
  );

  // buildStation → JSON 변환 (seed 전달: 메타 기록용)
  const build = useCallback(async (seed: StationSeed) => {
    const result = (await buildStation(seed, {
      targetCount: 35,
      dedupe: true,
      safeSearch: "moderate",
    })) as StationResult;
    return toPlaylistJson(result, seed);
  }, []);

  // =============================
<<<<<<< HEAD
  // D) 즉시 재생 + 백그라운드 업로드/저장
=======
  // 즉시 재생 + 백그라운드 업로드/저장
>>>>>>> PARKSUNGHAN
  // =============================
  const persistAndPlay = useCallback((json: PlaylistJson) => {
    // 1) 세션 등록 + 즉시 재생 (네트워크 실패와 무관하게 동작)
    registerPlaylistInSession(json);
    playPlaylistFromFile(json);

    // 2) 업로드/메타 저장은 백그라운드 시도 (실패해도 UX 영향 없음)
    (async () => {
      try {
        const url = await uploadStationPlaylistJson(json);
        await saveStationPlaylistMeta(json, url);
<<<<<<< HEAD
=======
        console.log(`✅ 스테이션 재생목록 저장 완료: ${json.title}`);
>>>>>>> PARKSUNGHAN
      } catch (e) {
        console.warn("[Station] background upload/persist failed:", e);
        // 필요 시: 한번만 토스트/알림센터 기록 등
      }
    })();
  }, []);

  // 즉시 재생 경로 – 내부 재생기 함수 사용
  const startFromSeed = useCallback(async (seed: StationSeed) => {
    setLoading(true);
    try {
      const json = await build(seed);
      if (!json.tracks?.length) {
        alert("가져온 트랙이 없습니다. 검색어나 아티스트를 바꿔보세요.");
        return;
      }
      // 즉시 재생 + 백그라운드 업로드
      persistAndPlay(json);
    } catch (e) {
      console.error("[Station] build error", e);
      alert("스테이션 생성에 실패했습니다. API 키/도메인/쿼터 설정을 확인해주세요.");
    } finally {
      setLoading(false);
    }
  }, [build, persistAndPlay]);

  // 미리보기 카드 생성
  const buildPreview = useCallback(async (seed: StationSeed) => {
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
  }, [build]);

  return (
    <Container>
      <h2 style={{ margin: 0, fontSize: 18 }}>뮤직 스테이션</h2>
      <div style={{ fontSize: 13, opacity: 0.75, marginTop: -4 }}>{seedHint}</div>

      {/* 1) 현재 곡에서 시작 */}
      <Section>
        <Input readOnly value={currentVideoTitle ? `현재 곡: ${currentVideoTitle}` : "현재 재생 중인 곡이 없습니다"} />
        <Button
          $primary
          disabled={!canUseCurrent || loading}
          onClick={() => startFromSeed({ type: "video", videoId: String(currentVideoId) })}
          title={canUseCurrent ? "현재 곡에서 즉시 재생" : "재생 중인 곡 없음"}
        >
          빠른 시작(즉시 재생)
        </Button>
        <Button
          disabled={!canUseCurrent || building}
          onClick={() => buildPreview({ type: "video", videoId: String(currentVideoId) })}
          title={canUseCurrent ? "현재 곡으로 미리보기 생성" : "재생 중인 곡 없음"}
        >
          미리보기 생성
        </Button>
      </Section>

      {/* 2) 아티스트로 시작 */}
      <Section>
        <Input placeholder="아티스트명 예) NewJeans" value={artist} onChange={(e) => setArtist(e.target.value)} />
        <Button $primary disabled={!artist || loading} onClick={() => startFromSeed({ type: "artist", artist })}>
          빠른 시작
        </Button>
        <Button disabled={!artist || building} onClick={() => buildPreview({ type: "artist", artist })}>
          미리보기
        </Button>
      </Section>

      {/* 3) 검색어로 시작 */}
      <Section>
        <Input placeholder="검색어 예) lofi chill, pop 2024" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Button $primary disabled={!query || loading} onClick={() => startFromSeed({ type: "query", query })}>
          빠른 시작
        </Button>
        <Button disabled={!query || building} onClick={() => buildPreview({ type: "query", query })}>
          미리보기
        </Button>
      </Section>

      {previews.length > 0 && <h3 style={{ margin: "10px 0 0 0", fontSize: 16 }}>스테이션 미리보기</h3>}

      <PreviewGrid>
        {previews.map((p) => (
          <Card key={p.id}>
            <Thumb
              src={p.thumbnail || "https://i.ytimg.com/img/no_thumbnail.jpg"}
              alt=""
              loading="lazy"
              onError={(e) => ((e.target as HTMLImageElement).src = "https://i.ytimg.com/img/no_thumbnail.jpg")}
            />
            <Meta>
              <Title>{p.title}</Title>
              <Sub>트랙 {p.tracks.length}개 · 클릭 시 즉시 재생</Sub>
<<<<<<< HEAD
              {/* D) 즉시 재생 + 백그라운드 업로드로 변경 */}
=======
              {/* 즉시 재생 + 백그라운드 업로드로 변경 */}
>>>>>>> PARKSUNGHAN
              <PlayButton type="button" onClick={() => persistAndPlay(p)}>
                ▶ 이 재생목록 재생
              </PlayButton>
            </Meta>
          </Card>
        ))}
      </PreviewGrid>
    </Container>
  );
}