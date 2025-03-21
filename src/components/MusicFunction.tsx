import { useState, useEffect, useRef } from "react";

interface VideoItem {
  id: string;
  title: string;
  thumbnail: string;
}

export const useMusicPlayer = () => {
  const [playlist, setPlaylist] = useState<VideoItem[]>([]);
  const [videoIndex, setVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [isLoading, setIsLoading] = useState(true);
  const playerRef = useRef<any>(null);
  const playerReadyRef = useRef<boolean>(false);

  // 인기 음악 비디오 불러오기
  useEffect(() => {
    const fetchMusicVideos = async () => {
      try {
        setIsLoading(true);
        const API_KEY = "AIzaSyBNWPwKZ26XlK0O5JCqooZFoAk2FScx2fE"; // ← 여기에 본인의 YouTube API Key 넣기
        const MUSIC_CATEGORY_ID = "10";
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&videoCategoryId=${MUSIC_CATEGORY_ID}&maxResults=20&key=${API_KEY}`
        );
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          const videos = data.items.map((item: any) => ({
            id: item.id,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.high.url,
          }));
          const shuffled = [...videos].sort(() => Math.random() - 0.5);
          setPlaylist(shuffled);
        }
      } catch {
        setPlaylist([
          {
            id: "dQw4w9WgXcQ",
            title: "Rick Astley - Never Gonna Give You Up",
            thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
          },
          {
            id: "9bZkp7q19f0",
            title: "PSY - Gangnam Style",
            thumbnail: "https://img.youtube.com/vi/9bZkp7q19f0/hqdefault.jpg",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMusicVideos();
  }, []);

  // 곡 전환 시 비디오 로딩
  useEffect(() => {
    if (playerReadyRef.current && playerRef.current && playlist.length > 0) {
      playerRef.current.loadVideoById(playlist[videoIndex].id);
    }
  }, [videoIndex, playlist]);

  const onReady = (event: any) => {
    playerRef.current = event.target;
    playerReadyRef.current = true;
    playerRef.current.setVolume(volume);
    playerRef.current.playVideo();
    setIsPlaying(true);
  };

  const onStateChange = (event: any) => {
    setIsPlaying(event.data === 1); // 1: playing
  };

  const playPause = () => {
    if (!playerReadyRef.current || !playerRef.current) return;
    isPlaying ? playerRef.current.pauseVideo() : playerRef.current.playVideo();
  };

  const nextTrack = () => {
    if (playlist.length === 0) return;
    setVideoIndex((videoIndex + 1) % playlist.length);
  };

  const prevTrack = () => {
    if (playlist.length === 0) return;
    setVideoIndex((videoIndex - 1 + playlist.length) % playlist.length);
  };

  const changeVolume = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(event.target.value, 10);
    setVolume(newVolume);
    if (playerReadyRef.current && playerRef.current) {
      playerRef.current.setVolume(newVolume);
    }
  };

  return {
    playlist,
    videoIndex,
    isPlaying,
    volume,
    isLoading,
    currentTrack: playlist[videoIndex],
    onReady,
    onStateChange,
    nextTrack,
    prevTrack,
    playPause,
    changeVolume,
  };
};
