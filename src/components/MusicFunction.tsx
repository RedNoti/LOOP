import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../firebaseConfig"; // adjust path as needed

export const playerRef: { current: any } = { current: null };
export const playerReadyRef: { current: boolean } = { current: false };

const savePlaybackStateToFirestore = async (
  userId: string,
  playlistId: string,
  videoIndex: number
) => {
  try {
    await setDoc(doc(db, "playbackStates", userId), {
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
    const docSnap = await getDoc(doc(db, "playbackStates", userId));
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (err) {
    console.error("Firebase 불러오기 실패:", err);
  }
  return null;
};

export const useMusicPlayer = () => {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("musicPlayerVolume");
    return saved ? parseInt(saved) : 50;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [likedVideos, setLikedVideos] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string | null>(
    null
  );
  const [playbackRestored, setPlaybackRestored] = useState(false);

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

  const playPlaylist = async (playlistId: string, startIndex = 0) => {
    setCurrentPlaylistId(playlistId); // track current playlist
    await fetchPlaylistVideos(playlistId);

    const nextVideoId = videos[startIndex]?.snippet?.resourceId?.videoId;
    if (nextVideoId) {
      setCurrentIndex(startIndex);
      setCurrentVideoId(nextVideoId);

      if (auth.currentUser?.uid) {
        savePlaybackStateToFirestore(
          auth.currentUser.uid,
          playlistId,
          startIndex
        );
      }
    }
  };

  useEffect(() => {
    const tryRestorePlayback = async () => {
      if (auth.currentUser?.uid && playlists.length > 0 && !playbackRestored) {
        const saved = await loadPlaybackStateFromFirestore(
          auth.currentUser.uid
        );
        if (saved?.playlistId) {
          const index = saved.videoIndex || 0;
          await playPlaylist(saved.playlistId, index);
          setPlaybackRestored(true);
        } else {
          // fallback: load first playlist only if no saved playback exists
          await fetchPlaylistVideos(playlists[0].id);
        }
      }
    };
    tryRestorePlayback();
  }, [playlists]);

  const onReady = (event: any) => {
    playerRef.current = event.target;
    playerReadyRef.current = true;
    playerRef.current.setVolume(volume);

    const fallbackId = currentVideoId;
    const videoId =
      videos[currentIndex]?.snippet?.resourceId?.videoId || fallbackId;
    if (videoId) {
      playerRef.current.loadVideoById(videoId);
      setIsPlaying(true);
    }
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
    isPlaying ? playerRef.current.pauseVideo() : playerRef.current.playVideo();
    setIsPlaying(!isPlaying);
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
    playPlaylist, // 추가됨
    playerRef, // 추가
  };
};
