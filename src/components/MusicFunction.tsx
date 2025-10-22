import { useEffect, useState, useRef, createContext, useContext } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../firebaseConfig"; // adjust path as needed
import { buildStation, StationSeed } from "./StationEngine";

export const playerRef: { current: any } = { current: null };
export const playerReadyRef: { current: boolean } = { current: false };
export const ensurePlayerReady = () =>
  Boolean(playerRef.current) && playerReadyRef.current;
export const queuedVideoIdRef: { current: string | null } = { current: null };
export const pendingSeekSecRef: { current: number | null } = { current: null };


// 외부에서 안전하게 seek을 요청할 때 사용하는 함수
export function requestSeek(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return;
  if (!ensurePlayerReady()) {
    // 준비 전이면 큐에 저장
    pendingSeekSecRef.current = seconds;
    return;
  }
  try {
    playerRef.current?.seekTo?.(seconds, true);
    // 시킹 후 재생 보장 (멈춤 방지)
    playerRef.current?.playVideo?.();
  } catch (e) {
    console.warn("[requestSeek] seekTo/playVideo 실패, 큐에 저장:", e);
    pendingSeekSecRef.current = seconds;
  }
}
export function safeLoadVideoById(videoId?: string | null) {
  
  if (!videoId) return;
  if (!ensurePlayerReady()) {
    queuedVideoIdRef.current = videoId; // 준비 전이면 대기열에 저장
    return;
  }
  try {
  playerRef.current!.loadVideoById(videoId);
  queuedVideoIdRef.current = null;
  
  // 로드 직후, 보류된 seek가 있으면 처리
  if (pendingSeekSecRef.current != null) {
    const s = pendingSeekSecRef.current;
    pendingSeekSecRef.current = null;
    setTimeout(() => {
      try {
        playerRef.current?.seekTo?.(s, true);
        playerRef.current?.playVideo?.();
      } catch (e) {
        console.warn("[safeLoadVideoById] post-load seek 실패, 재대기:", e);
        pendingSeekSecRef.current = s;
      }
    }, 0);
  } else {
    // 별도 보류가 없다면 재생 보장
    playerRef.current?.playVideo?.();
  }
  
} catch (e) {
  console.error("safeLoadVideoById 실패:", e);
  playerReadyRef.current = false;
  queuedVideoIdRef.current = videoId; // 혹시 모를 타이밍 이슈 대비
}
}

export const fetchPlaylistVideosReturn = async (playlistId: string) => {
  const token = localStorage.getItem("ytAccessToken");
  if (!token) return [];
  if (playlistId.includes(",")) {
    console.warn(
      "❗ 잘못된 playlistId 형식입니다. 단일 ID여야 합니다:",
      playlistId
    );
    return [];
  }

  let nextPageToken = "";
  const allItems: any[] = [];

  try {
    do {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&pageToken=${nextPageToken}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (data.items) {
        allItems.push(...data.items);
      }
      nextPageToken = data.nextPageToken || "";
    } while (nextPageToken);

    return allItems;
  } catch (err) {
    console.error("❌ 재생목록 영상 fetch 실패:", err);
    return [];
  }
};
type PlaylistJsonTrack = {
  videoId: string;
  title: string;
  thumbnail?: string;
};

type PlaylistJson = {
  id: string;
  title: string;
  thumbnail?: string;
  tracks?: PlaylistJsonTrack[];
  // 혹시 다른 경로에서 이미 videos 형태가 올 수도 있어 보강
  videos?: Array<{
    id: { videoId?: string } | string;
    snippet: {
      title: string;
      thumbnails?: { [k: string]: { url: string } };
      playlistId?: string;
    };
  }>;
};

// 스테이션/공유 JSON을 재생기에 맞는 videos 배열로 변환
export function normalizeJsonToVideos(json: PlaylistJson) {
  // 이미 videos가 있으면 그대로 사용
  if (Array.isArray(json.videos) && json.videos.length) return json.videos;

  const tracks = Array.isArray(json.tracks) ? json.tracks : [];
  const videos = tracks.map((t) => ({
    id: { videoId: t.videoId },
    snippet: {
      title: t.title,
      thumbnails: {
        default: { url: t.thumbnail || "" },
        medium: { url: t.thumbnail || "" },
      },
      playlistId: json.id, // 소속 표시
    },
  }));
  return videos;
}
const resolveVideoId = (v: any): string | null =>
  v?.id?.videoId ??
  v?.snippet?.resourceId?.videoId ??
  (typeof v?.id === "string" ? v.id : null) ??
  null;

// ✅ 공통: 세션스토리지 동기화
const syncSession = (params: {
  videos?: any[]; index?: number; videoId?: string | null; playlistId?: string;
}) => {
  const { videos, index, videoId, playlistId } = params;
  if (videos) sessionStorage.setItem("musicPlayerVideos", JSON.stringify(videos));
  if (typeof index === "number") sessionStorage.setItem("currentVideoIndex", String(index));
  if (videoId != null) sessionStorage.setItem("currentVideoId", String(videoId));
  if (playlistId) sessionStorage.setItem("currentPlaylistId", String(playlistId));
};

// ✅ 공통: 가져온(or 생성한) 목록을 상태/세션/플레이어에 일괄 반영
const applyFetchedVideos = (
  playlistId: string,
  items: any[],
  startIndex: number,
  setVideos: (v: any[]) => void,
  setCurrentIndex: (i: number) => void,
  setCurrentVideoId: (id: string | null) => void,
  setCurrentPlaylistId: (id: string) => void
) => {
  if (!items.length) return;
  const idx = Math.max(0, Math.min(startIndex, items.length - 1));
  const nextId = resolveVideoId(items[idx]);

  setVideos(items);
  setCurrentIndex(idx);
  setCurrentVideoId(nextId);
  setCurrentPlaylistId(playlistId);

  syncSession({ videos: items, index: idx, videoId: nextId, playlistId });

  safeLoadVideoById(nextId);
};
//--------
export const detectVideoLanguage = (title: string): string => {
  const text = title.toLowerCase();

  // 한국어 감지
  if (/[-]/.test(title)) return "ko";

  // 일본어 감지 (히라가나, 가타카나 포함)
  if (/[-]/.test(title)) return "ja";

  // 중국어 감지
  if (/[-]/.test(title)) return "zh";

  // 특정 키워드로 언어 추정
  const koreanKeywords = ["korean", "한국", "kpop", "k-pop"];
  const japaneseKeywords = ["japanese", "日本", "jpop", "j-pop", "anime"];
  const chineseKeywords = ["chinese", "中国", "cpop", "c-pop", "mandarin"];

  if (koreanKeywords.some((keyword) => text.includes(keyword))) return "ko";
  if (japaneseKeywords.some((keyword) => text.includes(keyword))) return "ja";
  if (chineseKeywords.some((keyword) => text.includes(keyword))) return "zh";

  return "en";
};
export const fetchVideoInLanguage = async (
  videoId: string,
  language: string
) => {
  const token = localStorage.getItem("ytAccessToken");
  if (!token) return null;

  const languageMap: { [key: string]: string } = {
    ko: "ko-KR",
    ja: "ja-JP",
    zh: "zh-CN",
    en: "en-US",
  };

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&hl=${
        languageMap[language] || "en-US"
      }`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();
    return data.items?.[0] || null;
  } catch (error) {
    console.error(`언어 ${language}로 비디오 정보 가져오기 실패:`, error);
    return null;
  }
};
export const fetchPlaylistVideosReturnWithLanguage = async (
  playlistId: string
) => {
  const token = localStorage.getItem("ytAccessToken");
  if (!token) return [];

  if (playlistId.includes(",")) {
    console.warn(
      "❗ 잘못된 playlistId 형식입니다. 단일 ID여야 합니다:",
      playlistId
    );
    return [];
  }

  let nextPageToken = "";
  const allItems: any[] = [];

  try {
    do {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&pageToken=${nextPageToken}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();

      if (data.items) {
        // 각 비디오의 언어 감지 및 현지화
        const processedItems = await Promise.all(
          data.items.map(async (item: any) => {
            const originalTitle = item.snippet.title;
            const videoId =
              item.snippet.resourceId?.videoId || item.id?.videoId;

            // 언어 감지
            const detectedLang = detectVideoLanguage(originalTitle);

            // 영어가 아닌 언어로 감지되면 해당 언어로 정보 가져오기
            if (detectedLang !== "en") {
              const localizedVideo = await fetchVideoInLanguage(
                videoId,
                detectedLang
              );

              if (localizedVideo) {
                return {
                  ...item,
                  snippet: {
                    ...item.snippet,
                    title: localizedVideo.snippet.title,
                    originalTitle: originalTitle,
                    detectedLanguage: detectedLang,
                  },
                };
              }
            }

            // 현지화 실패 또는 영어인 경우 원본 유지
            return {
              ...item,
              snippet: {
                ...item.snippet,
                originalTitle: originalTitle,
                detectedLanguage: detectedLang,
              },
            };
          })
        );

        allItems.push(...processedItems);
      }

      nextPageToken = data.nextPageToken || "";
    } while (nextPageToken);

    console.log(
      `📋 총 ${allItems.length}개 비디오 로드 완료 (언어별 현지화 적용)`
    );
    return allItems;
  } catch (err) {
    console.error("❌ 재생목록 영상 fetch 실패:", err);
    return [];
  }
};
//-------
export const MusicContext = createContext<ReturnType<
  typeof useMusicPlayer
> | null>(null);

export const MusicPlayerProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(
    () => {
      return sessionStorage.getItem("currentPlaylistId");
    }
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(() => {
    return sessionStorage.getItem("isPlaying") === "true";
  });
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(() => {
    return sessionStorage.getItem("currentVideoId");
  });
  const [playlists, setPlaylists] = useState<any[]>(() => {
    const savedPlaylists = sessionStorage.getItem("playlists");
    return savedPlaylists ? JSON.parse(savedPlaylists) : [];
  });
  const [videos, setVideos] = useState<any[]>(() => {
    const savedVideos = sessionStorage.getItem("musicPlayerVideos");
    return savedVideos ? JSON.parse(savedVideos) : [];
  });

  // 상태가 변경될 때마다 sessionStorage에 저장
  useEffect(() => {
    if (currentPlaylistId) {
      sessionStorage.setItem("currentPlaylistId", currentPlaylistId);
    }
  }, [currentPlaylistId]);

  useEffect(() => {
    if (videos.length > 0) {
      sessionStorage.setItem("musicPlayerVideos", JSON.stringify(videos));
    }
  }, [videos]);

  useEffect(() => {
    if (playlists.length > 0) {
      sessionStorage.setItem("playlists", JSON.stringify(playlists));
    }
  }, [playlists]);

  const music = useMusicPlayer();
  return (
    <MusicContext.Provider
      value={{ ...music, currentPlaylistId, playlists, videos }}
    >
      {children}
    </MusicContext.Provider>
  );
};

// Playlist 인터페이스 추가
interface Playlist {
  id: string;
  snippet: {
    title: string;
    thumbnails: {
      high?: { url: string };
      medium?: { url: string };
      default?: { url: string };
    };
  };
}

// useMusic 훅 수정
export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error("useMusic must be used within a MusicPlayerProvider");
  }
  return {
    ...context,
    currentPlaylistId: sessionStorage.getItem("currentPlaylistId"),
    playlists: JSON.parse(
      sessionStorage.getItem("playlists") || "[]"
    ) as Playlist[],
    videos: JSON.parse(sessionStorage.getItem("musicPlayerVideos") || "[]"),
  };
};

const savePlaybackStateToFirestore = async (
  userId: string,
  playlistId: string,
  videoIndex: number
) => {
  try {
    await setDoc(doc(db, "playbackStates", userId), {
      // 📄 Firestore 문서 참조
      playlistId,
      videoIndex,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.error("Firebase 저장 실패:", err);
  }
};

const loadPlaybackStateFromFirestore = async (userId: string) => {
  try {
    const docSnap = await getDoc(doc(db, "playbackStates", userId)); // 📄 Firestore 문서 참조
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (err) {
    console.error("Firebase 불러오기 실패:", err);
  }
  return null;
};

export function playPlaylistFromFile(json: {
  id: string;
  title: string;
  thumbnail: string;
  tracks: {
    videoId: string;
    title: string;
    thumbnail: string;
  }[];
}) {
  const videos = json.tracks.map((track) => ({
    id: { videoId: track.videoId },
    snippet: {
      title: track.title,
      thumbnails: {
        default: {
          url: track.thumbnail,
        },
      },
      playlistId: json.id,
    },
  }));

  // 기존 재생목록 정보를 sessionStorage에서 가져옴
  const existingPlaylists = JSON.parse(
    sessionStorage.getItem("playlists") || "[]"
  );

  // 새로운 재생목록이 기존 목록에 없는 경우에만 추가
  const playlistExists = existingPlaylists.some((p: any) => p.id === json.id);
  if (!playlistExists) {
    const newPlaylist = {
      id: json.id,
      snippet: {
        title: json.title,
        thumbnails: { 
          high: { url: json.thumbnail },
          medium: { url: json.thumbnail },
          default: { url: json.thumbnail }
        },
      },
    };
    existingPlaylists.push(newPlaylist);
    sessionStorage.setItem("playlists", JSON.stringify(existingPlaylists));
  }

  // 현재 재생 중인 재생목록 정보 저장
  sessionStorage.setItem("currentPlaylistId", json.id);
  sessionStorage.setItem("currentVideoIndex", "0");
  sessionStorage.setItem("musicPlayerVideos", JSON.stringify(videos));

  // 상태를 전역에서 관리하는 방식으로 전달
  window.dispatchEvent(
    new CustomEvent("play_playlist_from_file", {
      detail: {
        videos,
        playlistMeta: {
          id: json.id,
          title: json.title,
          thumbnail: json.thumbnail,
        },
        existingPlaylists, // 기존 재생목록 정보도 함께 전달
      },
    })
  );
  sessionStorage.setItem(`playlistVideos:${json.id}`, JSON.stringify(videos));
}


// 카테고리 검색에서 비디오를 재생하는 함수
export const playFromKategorieSearch = (query: string, index: number) => {
  console.log(`🎵 카테고리 검색 재생: "${query}"의 ${index}번째 비디오`);
  
  // 현재 세션에서 검색 결과를 가져옴 (KategorieScreen에서 설정한 데이터)
  const searchResults = sessionStorage.getItem(`kategorieSearch:${query}`);
  if (!searchResults) {
    console.warn("검색 결과를 찾을 수 없습니다:", query);
    return;
  }

  try {
    const videos = JSON.parse(searchResults);
    if (!Array.isArray(videos) || videos.length === 0) {
      console.warn("검색 결과가 비어있습니다:", query);
      return;
    }

    if (index < 0 || index >= videos.length) {
      console.warn("유효하지 않은 인덱스:", index, "총 비디오 수:", videos.length);
      return;
    }

    const selectedVideo = videos[index];
    const videoId = selectedVideo.id || selectedVideo.videoId;
    
    if (!videoId) {
      console.warn("비디오 ID를 찾을 수 없습니다:", selectedVideo);
      return;
    }

    // 재생목록 데이터 생성
    const playlistData = {
      id: `kategorie:${query}:${Date.now()}`,
      title: `검색: ${query}`,
      thumbnail: selectedVideo.thumbnails?.medium?.url || selectedVideo.thumbnails?.default?.url || "",
      tracks: videos.map((video: any) => ({
        videoId: video.id || video.videoId,
        title: video.title,
        thumbnail: video.thumbnails?.medium?.url || video.thumbnails?.default?.url || "",
      })),
    };

    // 기존 playPlaylistFromFile 함수 사용
    playPlaylistFromFile(playlistData);
    console.log(`✅ 카테고리 검색 재생 시작: ${playlistData.title}`);
  } catch (error) {
    console.error("카테고리 검색 재생 실패:", error);
  }
};

// AI 검색 결과를 현재 재생목록에 추가하는 함수
export const addTrackToPlaylist = async (
  playlistId: string, 
  video: any, 
  playlistName: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // 현재 재생목록의 비디오 목록 가져오기
    const currentVideos = JSON.parse(sessionStorage.getItem("musicPlayerVideos") || "[]");
    
    // 새 비디오 추가 (YouTube API 형식에 맞게 변환)
    const newVideo = {
      id: { videoId: video.id },
      snippet: {
        title: video.title,
        thumbnails: {
          default: { url: video.thumbnails?.medium?.url || "" },
          medium: { url: video.thumbnails?.medium?.url || "" },
          high: { url: video.thumbnails?.medium?.url || "" }
        },
        resourceId: { videoId: video.id },
        playlistId: playlistId
      }
    };
    
    // 기존 비디오 목록에 새 비디오 추가
    const updatedVideos = [...currentVideos, newVideo];
    
    // 세션 스토리지 업데이트
    sessionStorage.setItem("musicPlayerVideos", JSON.stringify(updatedVideos));

    // music.tsx의 React 상태를 실시간으로 업데이트하기 위한 이벤트 발생
    window.dispatchEvent(new CustomEvent("playlistUpdated", {
      detail: { videos: updatedVideos }
    }));
    
    // 재생목록 목록도 업데이트 (제목 동기화)
    const playlists = JSON.parse(sessionStorage.getItem("playlists") || "[]");
    const updatedPlaylists = playlists.map((p: any) => {
      if (p.id === playlistId) {
        return {
          ...p,
          snippet: {
            ...p.snippet,
            title: playlistName
          }
        };
      }
      return p;
    });
    sessionStorage.setItem("playlists", JSON.stringify(updatedPlaylists));
    
    // 성공 메시지 반환
    return { 
      success: true, 
      message: `"${video.title}"이(가) "${playlistName}" 재생목록에 추가되었습니다!` 
    };
    
  } catch (error) {
    console.error("재생목록에 노래 추가 실패:", error);
    return { 
      success: false, 
      message: "재생목록에 노래를 추가하는 중 오류가 발생했습니다." 
    };
  }
};

export const useMusicPlayer = () => {
  const playStation = async (seed: StationSeed) => {
    setIsLoading(true); // 로딩 상태 시작
    try {
      const { playlist, videos } = await buildStation(seed, {
        targetCount: 35,
        dedupe: true,
        safeSearch: "moderate",
      });

      // 기존 재생목록 목록에 스테이션 추가
      setPlaylists((prev) => {
        const exists = prev.some((p: any) => p.id === playlist.id);
        if (!exists) {
          return [...prev, playlist];
        }
        return prev;
      });
      sessionStorage.setItem(
        "playlists",
        JSON.stringify([...playlists, playlist])
      ); // 세션 저장 (Playlists 상태의 복사본이 아닌 `prev`를 기반으로 해야 정확하지만, 여기서는 단순화)

      const nextVideoId = videos[0]?.id?.videoId || null;

      // 비디오 목록 설정
      setVideos(videos as any);
      setCurrentIndex(0);
      setCurrentVideoId(nextVideoId);
      setCurrentPlaylistId(playlist.id);

      // 플레이어에 비디오 로드 및 재생
      if (playerRef.current?.loadVideoById && nextVideoId) {
        setTimeout(() => {
          try {
            playerRef.current.loadVideoById(nextVideoId);
          } catch (error) {
            console.error("스테이션 비디오 로드 실패:", error);
          }
        }, 100);
      }

      // Firebase에 재생 상태 저장
      if (auth.currentUser?.uid) {
        savePlaybackStateToFirestore(auth.currentUser.uid, playlist.id, 0);
      }

      localStorage.setItem("last_playlist_id", playlist.id);
      localStorage.setItem("current_video_index", "0");

      return playlist.snippet.title; // 생성된 스테이션 제목 반환
    } catch (e) {
      console.error("[Station] build error", e);
      alert(
        "스테이션 생성 중 오류가 발생했습니다. 로그인/토큰 상태를 확인해주세요."
      );
      return null;
    } finally {
      setIsLoading(false); // 로딩 상태 종료
    }
  };
  const [playlists, setPlaylists] = useState<any[]>(() => {
    const savedPlaylists = sessionStorage.getItem("playlists");
    return savedPlaylists ? JSON.parse(savedPlaylists) : [];
  });
  const [videos, setVideos] = useState<any[]>(() => {
    const savedVideos = sessionStorage.getItem("musicPlayerVideos");
    return savedVideos ? JSON.parse(savedVideos) : [];
  });
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(() => {
    return sessionStorage.getItem("currentVideoId");
  });
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    const savedIndex = sessionStorage.getItem("currentVideoIndex");
    return savedIndex ? parseInt(savedIndex) : 0;
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(() => {
    return sessionStorage.getItem("isPlaying") === "true";
  });
  const [volume, setVolume] = useState<number>(() => {
    const savedVolume = sessionStorage.getItem("volume");
    return savedVolume ? parseInt(savedVolume) : 50;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [likedVideos, setLikedVideos] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(
    () => {
      return sessionStorage.getItem("currentPlaylistId");
    }
  );
  const [playbackRestored, setPlaybackRestored] = useState<boolean>(false);

  // 상태가 변경될 때마다 sessionStorage에 저장
  useEffect(() => {
    if (videos.length > 0) {
      sessionStorage.setItem("musicPlayerVideos", JSON.stringify(videos));
    }
  }, [videos]);

  useEffect(() => {
    if (currentVideoId) {
      sessionStorage.setItem("currentVideoId", currentVideoId);
    }
  }, [currentVideoId]);

  useEffect(() => {
    sessionStorage.setItem("currentVideoIndex", currentIndex.toString());
  }, [currentIndex]);

  useEffect(() => {
    sessionStorage.setItem("isPlaying", isPlaying.toString());
  }, [isPlaying]);

  useEffect(() => {
    sessionStorage.setItem("volume", volume.toString());
  }, [volume]);

  useEffect(() => {
    if (currentPlaylistId) {
      sessionStorage.setItem("currentPlaylistId", currentPlaylistId);
    }
  }, [currentPlaylistId]);

  console.log("🎧 videos:", videos);
  console.log("▶️ currentVideoId:", currentVideoId);
  console.log("🧠 isLoading:", isLoading);

  const playPlaylist = async (
  playlistId: string,
  startIndex: number = 0,
  forcePlay: boolean = false
) => {
  // 같은 곡을 다시 누른 경우 방지
  if (!forcePlay && playlistId === currentPlaylistId && startIndex === currentIndex) {
    return;
  }

  const cached = sessionStorage.getItem(`playlistVideos:${playlistId}`);
if (cached) {
  try {
    const list = JSON.parse(cached);
    if (Array.isArray(list) && list.length > 0) {
      // 인덱스 보정
      const idx =
        Number.isInteger(startIndex) && startIndex >= 0 && startIndex < list.length
          ? startIndex
          : 0;

      // ✅ 공통 유틸로 상태/세션/재생을 일괄 처리
      applyFetchedVideos(
        playlistId,
        list,
        idx,
        setVideos,
        setCurrentIndex,
        setCurrentVideoId,
        setCurrentPlaylistId
      );

      // 최근 재생 메타 + Firestore(있을 때만)
      try {
        localStorage.setItem("last_playlist_id", playlistId);
        localStorage.setItem("current_video_index", String(idx));
        if (auth?.currentUser?.uid) {
          savePlaybackStateToFirestore(auth.currentUser.uid, playlistId, idx);
        }
      } catch {}

      return; // ✅ 캐시 히트 시 종료
    }
  } catch {}
}


    // ✅ 합성 재생목록(station:/single_)은 fetch 없이 현재 videos로 바로 처리
    if (
  playlistId?.startsWith("station:") ||
  playlistId?.startsWith("single_")
) {
  // 1) 현재 메모리(or 세션)에 있는 videos 확보
  const list =
    Array.isArray(videos) && videos.length > 0
      ? videos
      : (() => {
          try {
            const raw = sessionStorage.getItem("musicPlayerVideos");
            return raw ? JSON.parse(raw) : [];
          } catch {
            return [];
          }
        })();

  if (!list.length) return;

  // ✅ 공통 유틸로 일괄 처리
  applyFetchedVideos(
    playlistId,
    list,
    startIndex,
    setVideos,
    setCurrentIndex,
    setCurrentVideoId,
    setCurrentPlaylistId
  );

  // (선택) 최근 재생 메타 + Firestore
  localStorage.setItem("last_playlist_id", playlistId);
  localStorage.setItem("current_video_index", String(startIndex));
  if (auth.currentUser?.uid) {
    savePlaybackStateToFirestore(auth.currentUser.uid, playlistId, startIndex);
  }
  return; // ✅ 합성 재생목록 경로 종료
}


    const fetchedVideos = await fetchPlaylistVideosReturn(playlistId);
    if (!fetchedVideos.length) return;

    // stop currently playing video before loading new one
    if (
      playerRef.current &&
      typeof playerRef.current.stopVideo === "function"
    ) {
      try {
        playerRef.current.stopVideo();
      } catch (err) {
        console.error("stopVideo 실패:", err);
      }
    }

    const nextVideo = fetchedVideos[startIndex];
    const nextVideoId =
      nextVideo?.snippet?.resourceId?.videoId || nextVideo?.id?.videoId;
    if (!nextVideoId) return;

    setVideos(fetchedVideos);
    setCurrentIndex(startIndex);
    setCurrentVideoId(nextVideoId);
    setCurrentPlaylistId(playlistId);

    // Firebase에 재생 상태 저장
    if (auth.currentUser?.uid) {
      // 🔐 현재 로그인된 사용자 정보 참조
      savePlaybackStateToFirestore(
        auth.currentUser.uid, // 🔐 현재 로그인된 사용자 정보 참조
        playlistId,
        startIndex
      ); // 이 부분을 수정
    }

    localStorage.setItem("last_playlist_id", playlistId);
    localStorage.setItem("current_video_index", String(startIndex));
  };

  useEffect(() => {
    // 🔁 컴포넌트 마운트 시 실행되는 훅
    const tryRestorePlayback = async () => {
      if (!auth.currentUser?.uid || playlists.length === 0 || playbackRestored)
        // 🔐 현재 로그인된 사용자 정보 참조
        return;

      // 1. Firebase 우선 복원
      const saved = await loadPlaybackStateFromFirestore(auth.currentUser.uid); // 🔐 현재 로그인된 사용자 정보 참조
      if (
        saved?.playlistId &&
        playlists.some((p) => p.id === saved.playlistId)
      ) {
        await playPlaylist(saved.playlistId, saved.videoIndex || 0);
        setPlaybackRestored(true);
        return;
      }

      // 2. Firebase 복원 실패 → 로컬스토리지 시도
      const localPlaylistId = localStorage.getItem("last_playlist_id");
      const localIndex = parseInt(
        localStorage.getItem("current_video_index") || "0"
      );
      if (localPlaylistId && playlists.some((p) => p.id === localPlaylistId)) {
        await playPlaylist(localPlaylistId, localIndex);
      } else {
        // 3. 아무 것도 없으면 첫 플레이리스트
        const fetched = await fetchPlaylistVideosReturn(playlists[0].id);
applyFetchedVideos(
  playlists[0].id,
  fetched,
  0,
  setVideos,
  setCurrentIndex,
  setCurrentVideoId,
  setCurrentPlaylistId
);
      }

      setPlaybackRestored(true);
    };

    tryRestorePlayback();
  }, [playlists]);

  useEffect(() => {
    const handlePlayPlaylistFromFile = (event: any) => {
      const { videos, playlistMeta, existingPlaylists } = event.detail || {};
      if (!Array.isArray(videos) || videos.length === 0) {
        console.warn("[handlePlayPlaylistFromFile] empty videos", event.detail);
        return;
      }

      // 상태 세팅(항상 first 접근 방어)
      setVideos(videos);
      setCurrentIndex(0);
      const firstId =
        videos[0]?.id?.videoId ||
        videos[0]?.snippet?.resourceId?.videoId ||
        null;
      setCurrentVideoId(firstId);
      setCurrentPlaylistId(playlistMeta?.id || null);

      // 재생목록 목록 업데이트 + 세션 동기화
      if (existingPlaylists) {
        setPlaylists(existingPlaylists);
        sessionStorage.setItem("playlists", JSON.stringify(existingPlaylists));
      }
      sessionStorage.setItem("musicPlayerVideos", JSON.stringify(videos));
      if (firstId) sessionStorage.setItem("currentVideoId", String(firstId));
      sessionStorage.setItem("currentVideoIndex", "0");
      if (playlistMeta?.id)
        sessionStorage.setItem("currentPlaylistId", playlistMeta.id);

      // 플레이어 로드: 준비 가드 + try/catch
      if (
        playerReadyRef.current &&
        playerRef.current?.loadVideoById &&
        firstId
      ) {
        try {
          playerRef.current.loadVideoById(firstId);
        } catch (error) {
          console.error("비디오 로드 실패:", error);
        }
      } else {
        // onReady에서 sessionStorage의 currentVideoId로 로드됨
        console.warn(
          "[handlePlayPlaylistFromFile] player not ready; defer load"
        );
      }
    };

    window.addEventListener(
      "play_playlist_from_file",
      handlePlayPlaylistFromFile
    );
    return () => {
      window.removeEventListener(
        "play_playlist_from_file",
        handlePlayPlaylistFromFile
      );
    };
  }, []);

  const onReady = (event: any) => {
    try {
      playerRef.current = event.target;
      playerReadyRef.current = true;

      // 볼륨 설정
      const savedVolume = sessionStorage.getItem("volume");
      if (savedVolume !== null) {
        const volumeValue = Number(savedVolume);
        playerRef.current.setVolume(volumeValue);
        setVolume(volumeValue);
      }

      // 현재 재생 중인 비디오가 있다면 로드
      const savedVideoId = sessionStorage.getItem("currentVideoId");
      if (savedVideoId && playerRef.current) {
        setTimeout(() => {
          try {
            playerRef.current.loadVideoById(savedVideoId);
          } catch (error) {
            console.error("비디오 로드 실패:", error);
          }
        }, 1000); // 1초 후에 비디오 로드 시도
      }

      setIsLoading(false);
    } catch (error) {
      console.error("플레이어 초기화 실패:", error);
    }
    if (queuedVideoIdRef.current) {
      const toLoad = queuedVideoIdRef.current;
      queuedVideoIdRef.current = null;
      safeLoadVideoById(toLoad); // ✅ 준비되자마자 안전 로드
    }
  };

  // 어딘가 상단에서 ref 준비 (마운트 후 최신값 동기화)
  const videosRef = useRef(videos);
  const currentIndexRef = useRef(currentIndex);
  useEffect(() => {
    videosRef.current = videos;
  }, [videos]);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const onStateChange = (event: any) => {
    try {
      const PlayerState = (window as any).YT?.PlayerState || {
        UNSTARTED: -1,
        ENDED: 0,
        PLAYING: 1,
        PAUSED: 2,
        BUFFERING: 3,
        CUED: 5,
      };

      if (event.data === PlayerState.PLAYING) {
        setIsPlaying(true);
        return;
      }
      if (event.data === PlayerState.PAUSED) {
        setIsPlaying(false);
        return;
      }

      if (event.data === PlayerState.ENDED) {
  try {
    const repeat = localStorage.getItem("musicPlayerRepeatMode"); // "2" → 1곡 반복
    if (repeat === "2") {
      const vids = videosRef.current;
      const idx  = currentIndexRef.current;
      const curId = resolveVideoId(vids?.[idx]);

      if (curId) {
        setCurrentVideoId(curId);
        syncSession({ videoId: curId });
        safeLoadVideoById(curId);
        setIsPlaying(true);
      } else if (playerRef.current) {
        playerRef.current.seekTo(0, true);
        playerRef.current.playVideo?.();
        setIsPlaying(true);
      }
      return;
    }
  } catch {}

  const vids = videosRef.current;
  const idx = currentIndexRef.current;
  if (!Array.isArray(vids) || vids.length === 0) return;

  const nextIdx = idx + 1;
  if (nextIdx >= vids.length) {
    setIsPlaying(false);
    return;
  }

  const nxt = resolveVideoId(vids[nextIdx]);
  setCurrentIndex(nextIdx);
  setCurrentVideoId(nxt);
  syncSession({ index: nextIdx, videoId: nxt });

  safeLoadVideoById(nxt);
  return;
}
    } catch (error) {
      console.error("상태 변경 처리 실패:", error);
    }
  };
  

  const onEnd = () => {
    try {
      const nextIndex = currentIndex + 1;
      if (nextIndex < videos.length) {
        setCurrentIndex(nextIndex);
        setCurrentVideoId(
          videos[nextIndex].snippet?.resourceId?.videoId || null
        );
      } else if (videos.length > 0) {
        // 마지막 곡일 때 첫 곡으로 순환
        setCurrentIndex(0);
        setCurrentVideoId(videos[0].snippet?.resourceId?.videoId || null);
      }
    } catch (error) {
      console.error("다음 곡 재생 실패:", error);
    }
  };

  const playPause = () => {
    if (!ensurePlayerReady()) return;
    try {
      if (!playerReadyRef.current || !playerRef.current) {
        console.warn("플레이어가 준비되지 않았습니다.");
        return;
      }

      const player = playerRef.current;
      const state = player.getPlayerState?.();

      if (state === 1) {
        player.pauseVideo();
        setIsPlaying(false);
      } else {
        player.playVideo();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("재생/일시정지 실패:", error);
    }
  };

  const nextTrack = () => {
  if (!Array.isArray(videos) || !videos.length) return;

  const nextIdx = Math.min(currentIndex + 1, videos.length - 1);
  const nextId = resolveVideoId(videos[nextIdx]);

  setCurrentIndex(nextIdx);
  setCurrentVideoId(nextId);
  syncSession({ index: nextIdx, videoId: nextId });

  safeLoadVideoById(nextId);
};


  const prevTrack = () => {
    if (!Array.isArray(videos) || !videos.length) return;

    const prevIdx = Math.max(currentIndex - 1, 0);
    const prevId =
      videos[prevIdx]?.id?.videoId ??
      videos[prevIdx]?.snippet?.resourceId?.videoId ??
      null;

    setCurrentIndex(prevIdx);
    setCurrentVideoId(prevId);
    sessionStorage.setItem("currentVideoIndex", String(prevIdx));
    if (prevId) sessionStorage.setItem("currentVideoId", String(prevId));

    safeLoadVideoById(prevId); // ✅ 중요
  };

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
  const newVolume = parseInt(e.target.value);
  setVolume(newVolume);
  sessionStorage.setItem("volume", String(newVolume)); // ← 통일
  if (playerRef.current) {
    playerRef.current.setVolume(newVolume);
  }
};

  const refreshAccessToken = async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem("ytRefreshToken");
    if (!refreshToken) return false;

    try {
      const response = await fetch("/api/refresh-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      const data = await response.json();
      if (data.access_token) {
        localStorage.setItem("ytAccessToken", data.access_token);
        console.log("🔄 Access token refreshed");
        return true;
      } else {
        console.warn("❗️Access token refresh failed");
        return false;
      }
    } catch (error) {
      console.error("토큰 갱신 중 오류 발생:", error);
      return false;
    }
  };

  useEffect(() => {
    // 🔁 컴포넌트 마운트 시 실행되는 훅
    const initialize = async () => {
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        console.warn("🔁 토큰 갱신 실패 - 기존 access token으로 시도함");
      }
      fetchUserPlaylists();
      fetchUserInfo();
    };
    initialize();
  }, []);

  // 기존 fetchUserPlaylists 전체를 아래로 교체
async function fetchUserPlaylists() {
  const token = localStorage.getItem("ytAccessToken");
  if (!token) {
    console.warn("[YT] 액세스 토큰 없음: 재생목록 동기화 건너뜀");
    return;
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  try {
    // ✅ mine=true 경로만 사용 (가장 안전)
    const res = await fetch(
      "https://www.googleapis.com/youtube/v3/playlists?part=snippet&mine=true&maxResults=50",
      { headers }
    );

    if (res.status === 401) {
      console.warn("[YT] 401 Unauthorized: 토큰 만료/무효, 재로그인 필요");
      return;
    }
    if (res.status === 403) {
      console.warn(
        "[YT] 403 Forbidden: youtube.readonly 스코프 미동의이거나 계정에 유튜브 채널이 없습니다. 동기화를 건너뜁니다."
      );
      return;
    }
    if (!res.ok) {
      console.warn(`[YT] playlists?mine=true 실패: HTTP ${res.status}`);
      return;
    }

    const data = await res.json();
    const items = Array.isArray(data?.items) ? data.items : [];
    if (items.length === 0) {
      console.warn("[YT] 불러온 재생목록이 없습니다.");
      return;
    }

    // 세션에 있던 기존 목록과 합치기 (중복 제거)
    const existing = JSON.parse(sessionStorage.getItem("playlists") || "[]");
    const merged = [...existing];
    for (const p of items) {
      if (!merged.some((x: any) => x.id === p.id)) merged.push(p);
    }
    sessionStorage.setItem("playlists", JSON.stringify(merged));

    // 컨텍스트/상태에 반영 (이미 setPlaylists 같은 setter가 있을 것)
    try {
      typeof setPlaylists === "function" && setPlaylists(merged);
    } catch {}
  } catch (e) {
    console.error("[YT] 재생목록 가져오기 실패:", e);
  }
}



  const fetchLikedVideos = async () => {
    const token = localStorage.getItem("ytAccessToken");
    if (!token) return;

    try {
      const response = await fetch(
        "https://www.googleapis.com/youtube/v3/videos?part=snippet&myRating=like&maxResults=10",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (data.items?.length > 0) {
        setLikedVideos(data.items);
      } else {
        console.warn("❤️ 좋아요한 영상 없음");
      }
    } catch (err) {
      console.error("좋아요한 영상 가져오기 실패:", err);
    }
  };

  const fetchUserInfo = async () => {
    const token = localStorage.getItem("ytAccessToken");
    if (!token) return;

    try {
      const response = await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      setUserProfile(data);
    } catch (err) {
      console.error("유저 정보 가져오기 실패:", err);
    }
  };
  const current = videos[currentIndex];
  const ytId =
    current?.id?.videoId ??
    current?.snippet?.resourceId?.videoId ??
    (typeof current?.id === "string" ? current.id : null);
  const safeThumb =
    current?.snippet?.thumbnails?.high?.url ||
    current?.snippet?.thumbnails?.medium?.url ||
    current?.snippet?.thumbnails?.default?.url ||
    (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : "");

  return {
    playlists,
    setPlaylists,
    videos,
    currentVideoId,
    isLoading,
    isPlaying,
    volume,
    currentVideoTitle: videos[currentIndex]?.snippet?.title || "",
    currentVideoThumbnail: safeThumb,
    likedVideos,
    userProfile,
    fetchLikedVideos,
    onReady,
    onStateChange,
    onEnd,
    playPause,
    nextTrack,
    prevTrack,
    changeVolume,
    playPlaylist,
    playPlaylistFromFile, 
    playerRef,
    currentPlaylistId,
    setVideos,
    playStation,
  };
};