import React, { useState, useEffect, useRef } from "react";
import YouTube from "react-youtube";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";

interface VideoItem {
  id: string;
  title: string;
  thumbnail: string;
}

const YouTubeMusicPlayer: React.FC = () => {
  const [playlist, setPlaylist] = useState<VideoItem[]>([]);
  const [videoIndex, setVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [isLoading, setIsLoading] = useState(true);
  const playerRef = useRef<any>(null);
  const playerReadyRef = useRef<boolean>(false);

  // YouTube API로부터 음악 비디오 가져오기
  useEffect(() => {
    const fetchMusicVideos = async () => {
      try {
        setIsLoading(true);
        
        // YouTube API 키를 여기에 넣으세요
        const API_KEY = "AIzaSyBNWPwKZ26XlK0O5JCqooZFoAk2FScx2fE";
        
        // 음악 카테고리 ID (YouTube API에서 제공)
        const MUSIC_CATEGORY_ID = "10"; // 10은 음악 카테고리 ID입니다
        
        // 인기 음악 비디오 가져오기
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&videoCategoryId=${MUSIC_CATEGORY_ID}&maxResults=20&key=${API_KEY}`
        );
        
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
          // 비디오 데이터 매핑
          const videos = data.items.map((item: any) => ({
            id: item.id,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.high.url
          }));
          
          // 배열 무작위로 섞기
          const shuffledVideos = [...videos].sort(() => Math.random() - 0.5);
          
          setPlaylist(shuffledVideos);
        }
      } catch (error) {
        console.error("Error fetching music videos:", error);
        // 오류 발생 시 폴백 비디오 목록 사용
        setPlaylist([
          {
            id: "dQw4w9WgXcQ",
            title: "Rick Astley - Never Gonna Give You Up",
            thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
          },
          {
            id: "9bZkp7q19f0",
            title: "PSY - Gangnam Style",
            thumbnail: "https://img.youtube.com/vi/9bZkp7q19f0/hqdefault.jpg"
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMusicVideos();
  }, []);

  const opts = {
    height: "0",
    width: "0",
    playerVars: {
      autoplay: 1,
      controls: 0,
      showinfo: 0,
      modestbranding: 1,
      rel: 0,
    },
  };

  const onReady = (event: any) => {
    playerRef.current = event.target;
    playerReadyRef.current = true;
    playerRef.current.setVolume(volume);
    playerRef.current.playVideo();
    setIsPlaying(true);
  };

  const onStateChange = (event: any) => {
    setIsPlaying(event.data === 1); // 1 is the state for "playing"
  };

  const playPause = () => {
    if (!playerReadyRef.current || !playerRef.current) return;
    
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const nextTrack = () => {
    if (!playerReadyRef.current || !playerRef.current || playlist.length === 0) return;
    
    const nextIndex = (videoIndex + 1) % playlist.length;
    setVideoIndex(nextIndex);
  };

  const prevTrack = () => {
    if (!playerReadyRef.current || !playerRef.current || playlist.length === 0) return;
    
    const prevIndex = (videoIndex - 1 + playlist.length) % playlist.length;
    setVideoIndex(prevIndex);
  };

  const changeVolume = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(event.target.value, 10);
    setVolume(newVolume);
    
    if (playerReadyRef.current && playerRef.current) {
      playerRef.current.setVolume(newVolume);
    }
  };

  // videoIndex나 playlist가 변경되면 새 비디오 로드
  useEffect(() => {
    if (playerReadyRef.current && playerRef.current && playlist.length > 0) {
      playerRef.current.loadVideoById(playlist[videoIndex].id);
    }
  }, [videoIndex, playlist]);

  // 플레이리스트가 비어있으면 로딩 표시
  if (isLoading || playlist.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-gray-900 text-white rounded-lg shadow-lg w-96 h-96 mx-auto mt-10">
        <div className="text-xl">Loading music...</div>
      </div>
    );
  }

  const currentTrack = playlist[videoIndex];

  return (
    <div className="flex flex-col items-center p-6 bg-gray-900 text-white rounded-lg shadow-lg w-96 mx-auto mt-10">
      {/* 앨범 아트 표시 */}
      <div className="w-64 h-64 mb-6 overflow-hidden rounded-lg shadow-lg">
        <img 
          src={currentTrack.thumbnail} 
          alt="Album art"
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
        />
      </div>
      
      {/* 현재 곡 제목 표시 */}
      <p className="font-medium text-lg mb-4 text-center line-clamp-2">{currentTrack.title}</p>
      
      <YouTube
        videoId={currentTrack.id}
        opts={opts}
        onReady={onReady}
        onStateChange={onStateChange}
        onEnd={nextTrack}
      />
      
      <div className="flex gap-6 mt-4 w-full justify-center items-center">
        <button
          className="p-2 text-gray-300 hover:text-white transition"
          onClick={prevTrack}
          aria-label="Previous track"
        >
          <SkipBack size={24} />
        </button>
        <button
          className="p-3 bg-blue-600 rounded-full hover:bg-blue-700 transition"
          onClick={playPause}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <button
          className="p-2 text-gray-300 hover:text-white transition"
          onClick={nextTrack}
          aria-label="Next track"
        >
          <SkipForward size={24} />
        </button>
      </div>
      
      <div className="mt-6 w-full">
        <div className="flex justify-between items-center">
          <Volume2 size={16} className="text-gray-400" />
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={changeVolume}
            className="mx-2 flex-grow"
          />
          <span className="text-xs text-gray-400">{volume}%</span>
        </div>
      </div>
    </div>
  );
};

export default YouTubeMusicPlayer;