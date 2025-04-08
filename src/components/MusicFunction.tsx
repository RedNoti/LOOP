import { useEffect, useState } from "react";
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

  localStorage.setItem("musicPlayerLastPlaylistId", json.id);
  localStorage.setItem("musicPlayerCurrentVideoIndex", "0");

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
      },
    })
  );
}

export const useMusicPlayer = () => {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false); // 💡 상태(State) 정의
  const [volume, setVolume] = useState(() => {
    // 💡 상태(State) 정의
    const saved = localStorage.getItem("musicPlayerVolume");
    return saved ? parseInt(saved) : 50;
  });
  const [isLoading, setIsLoading] = useState(false); // 💡 상태(State) 정의
  const [likedVideos, setLikedVideos] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(
    null
  );
  const [playbackRestored, setPlaybackRestored] = useState(false); // 💡 상태(State) 정의

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
    if (playerRef.current?.stopVideo) {
      playerRef.current.stopVideo();
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
      const { videos, playlistMeta } = event.detail;
      setVideos(videos);
      setCurrentIndex(0);
      setCurrentVideoId(videos[0]?.id?.videoId || null);
      setCurrentPlaylistId(playlistMeta?.id || null);
      setPlaylists((prev) => {
        const exists = prev.some((p) => p.id === playlistMeta.id);
        if (!exists) {
          return [
            {
              id: playlistMeta.id,
              snippet: {
                title: playlistMeta.title,
                thumbnails: { high: { url: playlistMeta.thumbnail } },
              },
            },
            ...prev,
          ];
        }
        return prev.map((p) =>
          p.id === playlistMeta.id
            ? {
                ...p,
                snippet: {
                  title: playlistMeta.title,
                  thumbnails: { high: { url: playlistMeta.thumbnail } },
                },
              }
            : p
        );
      });

      if (playerRef.current?.loadVideoById) {
        playerRef.current.loadVideoById(videos[0]?.id?.videoId);
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
    playerRef.current = event.target;
    playerReadyRef.current = true;
    playerRef.current.setVolume(volume);

    const duration = event.target.getDuration();
    if (typeof duration === "number" && !isNaN(duration)) {
      setIsLoading(false);
    }

    const savedVolume = localStorage.getItem("musicPlayerVolume");
    if (savedVolume !== null) {
      playerRef.current.setVolume(Number(savedVolume));
      changeVolume({
        target: { value: savedVolume },
      } as React.ChangeEvent<HTMLInputElement>);
    }

    // Do not load video here to avoid duplicate playback.
  };

  const onStateChange = (event: any) => {
    setIsPlaying(event.data === 1); // 1: playing
  };

  const onEnd = () => {
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

  const playPause = () => {
    if (!playerReadyRef.current || !playerRef.current) return;

    const player = playerRef.current;
    const state = player.getPlayerState?.(); // 현재 플레이어 상태 가져오기

    if (state === 1) {
      player.pauseVideo();
      setIsPlaying(false);
    } else {
      player.playVideo();
      setIsPlaying(true);
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
        setPlaylists(data.items);
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
