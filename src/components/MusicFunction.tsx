import { useEffect, useState, createContext, useContext } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../firebaseConfig"; // adjust path as needed

export const playerRef: { current: any } = { current: null };
export const playerReadyRef: { current: boolean } = { current: false };

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
//--------
export const detectVideoLanguage = (
  title: string,
  channelTitle?: string
): string => {
  const text = `${title} ${channelTitle || ""}`.toLowerCase();

  // 한국어 감지
  if (/[\uAC00-\uD7AF]/.test(title)) return "ko";

  // 일본어 감지 (히라가나, 가타카나 포함)
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(title)) return "ja";

  // 중국어 감지
  if (
    /[\u4E00-\u9FFF]/.test(title) &&
    !/[\u3040-\u309F\u30A0-\u30FF]/.test(title)
  )
    return "zh";

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
            const channelTitle = item.snippet.channelTitle;
            const videoId =
              item.snippet.resourceId?.videoId || item.id?.videoId;

            // 언어 감지
            const detectedLang = detectVideoLanguage(
              originalTitle,
              channelTitle
            );

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
                    localizedChannelTitle: localizedVideo.snippet.channelTitle,
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
        thumbnails: { high: { url: json.thumbnail } },
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
}

export const useMusicPlayer = () => {
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

  const fetchPlaylistVideos = async (playlistId: string) => {
    const token = localStorage.getItem("ytAccessToken");
    if (!token) return;

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

      setVideos(allItems);
      setCurrentIndex(0);
      setCurrentVideoId(allItems[0]?.snippet?.resourceId?.videoId || null);
    } catch (err) {
      console.error("영상 목록 불러오기 실패:", err);
    }
  };

  const playPlaylist = async (
    playlistId: string,
    startIndex: number = 0,
    forcePlay: boolean = false
  ) => {
    if (
      !forcePlay &&
      playlistId === currentPlaylistId &&
      startIndex === currentIndex
    )
      return;

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

  const playPlaylistFromFile = (playlistData: any) => {
    console.log("📥 playPlaylistFromFile 호출됨:", playlistData);
    const videoItems = playlistData.tracks.map((track: any) => ({
      snippet: {
        title: track.title,
        thumbnails: {
          high: { url: track.thumbnail },
        },
        resourceId: {
          videoId: track.videoId,
        },
      },
    }));

    setVideos(videoItems);
    setCurrentIndex(0);
    setCurrentVideoId(videoItems[0]?.snippet?.resourceId?.videoId || null);
    setCurrentPlaylistId(playlistData.id); // json.id → playlistData.id

    setPlaylists((prev) => {
      const exists = prev.some((p) => p.id === playlistData.id);
      if (!exists) {
        return [
          ...prev,
          {
            id: playlistData.id,
            snippet: {
              title: playlistData.title,
              thumbnails: { high: { url: playlistData.thumbnail } },
            },
          },
        ];
      }
      return prev;
    });

    if (playerRef.current?.loadVideoById) {
      playerRef.current.loadVideoById(
        videoItems[0]?.snippet?.resourceId?.videoId
      );
    }
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
        await fetchPlaylistVideos(playlists[0].id);
      }

      setPlaybackRestored(true);
    };

    tryRestorePlayback();
  }, [playlists]);

  useEffect(() => {
    const handlePlayPlaylistFromFile = (event: any) => {
      const { videos, playlistMeta, existingPlaylists } = event.detail;

      // 비디오 목록 설정
      setVideos(videos);
      setCurrentIndex(0);
      setCurrentVideoId(videos[0]?.id?.videoId || null);
      setCurrentPlaylistId(playlistMeta?.id || null);

      // 재생목록 목록 업데이트
      if (existingPlaylists) {
        setPlaylists(existingPlaylists);
        sessionStorage.setItem("playlists", JSON.stringify(existingPlaylists));
      }

      // 플레이어에 비디오 로드
      if (playerRef.current?.loadVideoById) {
        setTimeout(() => {
          try {
            playerRef.current.loadVideoById(videos[0]?.id?.videoId);
          } catch (error) {
            console.error("비디오 로드 실패:", error);
          }
        }, 1000);
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
  };

  const onStateChange = (event: any) => {
    try {
      if (event.data === 1) {
        // 재생 중
        setIsPlaying(true);
      } else if (event.data === 2) {
        // 일시정지
        setIsPlaying(false);
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
    const nextIndex = currentIndex + 1;
    if (nextIndex < videos.length) {
      setCurrentIndex(nextIndex);
      setCurrentVideoId(videos[nextIndex].snippet?.resourceId?.videoId || null);
    } else if (videos.length > 0) {
      // 마지막 곡일 때 첫 곡으로 순환
      setCurrentIndex(0);
      setCurrentVideoId(videos[0].snippet?.resourceId?.videoId || null);
    }
  };

  const prevTrack = () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setCurrentIndex(prevIndex);
      setCurrentVideoId(videos[prevIndex].snippet?.resourceId?.videoId || null);
    } else {
      // 첫 곡일 때는 마지막 곡으로 순환
      const lastIndex = videos.length - 1;
      setCurrentIndex(lastIndex);
      setCurrentVideoId(videos[lastIndex].snippet?.resourceId?.videoId || null);
    }
  };

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    localStorage.setItem("musicPlayerVolume", String(newVolume));
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

  const fetchUserPlaylists = async () => {
    const token = localStorage.getItem("ytAccessToken");
    if (!token) return;

    try {
      const channelRes = await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=id&mine=true",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );
      const channelData = await channelRes.json();
      const channelId = channelData?.items?.[0]?.id;
      if (!channelId) {
        console.warn("🔍 유저 채널 ID 없음");
        return;
      }

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/playlists?part=snippet&channelId=${channelId}&maxResults=10`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );
      const data = await response.json();
      if (data.items?.length > 0) {
        // 기존 재생목록 가져오기
        const existingPlaylists = JSON.parse(
          sessionStorage.getItem("playlists") || "[]"
        );

        // YouTube API에서 가져온 재생목록과 기존 재생목록 합치기
        const combinedPlaylists = [...existingPlaylists];

        // YouTube API에서 가져온 재생목록 추가
        data.items.forEach((newPlaylist: any) => {
          const exists = combinedPlaylists.some(
            (p: any) => p.id === newPlaylist.id
          );
          if (!exists) {
            combinedPlaylists.push(newPlaylist);
          }
        });

        // 상태 업데이트 및 저장
        setPlaylists(combinedPlaylists);
        sessionStorage.setItem("playlists", JSON.stringify(combinedPlaylists));
      } else {
        console.warn("📁 불러온 플레이리스트 없음");
      }
    } catch (err) {
      console.error("플레이리스트 가져오기 실패:", err);
    }
  };

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

  return {
    playlists,
    setPlaylists,
    videos,
    currentVideoId,
    isLoading,
    isPlaying,
    volume,
    currentVideoTitle: videos[currentIndex]?.snippet?.title || "",
    currentVideoThumbnail:
      videos[currentIndex]?.snippet?.thumbnails?.high?.url || "",
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
    playPlaylistFromFile, // 추가된 항목
    playerRef,
    currentPlaylistId,
    setVideos,
  };
};
