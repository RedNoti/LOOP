import LiveComments from "../components/LiveComments";
import CommentInputBar from "../components/CommentInputBar";
import ColorThief from "colorthief/dist/color-thief";
import React, { useEffect, useState } from "react";
import YouTube, { YouTubeEvent, YouTubePlayer } from "react-youtube";
import styled from "styled-components";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Repeat,
  Shuffle,
  MessageCircle,
  X,
} from "lucide-react";
import {
  useMusicPlayer,
  playerRef,
  playerReadyRef,
} from "../components/MusicFunction";

const Container = styled.div<{ $isCollapsed: boolean }>`
  color: white;
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
  padding-bottom: ${(props) => (props.$isCollapsed ? "60px" : "0")};
`;

const PlayerSection = styled.div<{ $isCommentView: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  /* 앨범 커버가 움직이지 않도록 중앙 정렬 유지 */
  justify-content: center;
  align-items: center;
  /* 상하단 패딩 제거 */
  padding: 0 1rem;
  min-height: 0;
  overflow-y: auto;
`;

// 🚨 PlayerWrapper 수정: isCommentView 상태에 따라 translateY 애니메이션 적용
const PlayerWrapper = styled.div<{ $isCommentView: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 320px;
  position: relative;
  margin-top: 1rem;
  /* 🚨 애니메이션을 위한 transition 추가 */
  transition: transform 0.3s ease-out;
  /* 🚨 이동 값을 -30px로 줄여 앨범 커버 짤림 문제 해결 및 자연스러운 움직임 유도 */
  transform: translateY(${(props) => (props.$isCommentView ? "-30px" : "0")});
`;

const AlbumArtWrapper = styled.div`
  position: relative;
  width: 280px;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: 12px;
  margin-bottom: 0.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
`;

const AlbumArt = styled.img`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 160%;
  height: 160%;
  transform: translate(-50%, -50%);
  object-fit: cover;
  transition: transform 0.3s ease;

  &:hover {
    transform: translate(-50%, -50%) scale(1.03);
  }
`;

const Title = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 5px;
  padding: 4px 0;
`;

const Controls = styled.div`
  display: flex;
  gap: 2rem;
  justify-content: center;
  margin-top: 1.5rem;

  button {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    transition: transform 0.2s ease;

    &:hover {
      transform: scale(1.1);
    }
  }
`;

// 재생바는 댓글 뷰일 때 숨김
const ProgressBarWrapper = styled.div<{ $isHidden: boolean }>`
  display: ${(props) => (props.$isHidden ? "none" : "flex")};
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  max-width: 320px;
  margin-top: 1rem;
`;

const ProgressTime = styled.span`
  font-size: 0.75rem;
  color: #bbb;
  width: 30px;
  text-align: center;
`;

const ProgressBar = styled.input`
  flex: 1;
  appearance: none;
  height: 4px;
  background: linear-gradient(to right, #4d76fc 0%, #444 0%);
  border-radius: 2px;
  outline: none;
  position: relative;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 10px;
    height: 10px;
    background: white;
    border-radius: 50%;
    cursor: pointer;
    position: relative;
    z-index: 2;
  }
`;

const VolumeWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const VolumeSlider = styled.input`
  width: 100px;
  height: 6px;
  appearance: none;
  background: linear-gradient(to right, #4d76fc 50%, #444 50%);
  border-radius: 10px;
  outline: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 12px;
    background: white;
    border-radius: 50%;
    box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
    position: relative;
    z-index: 2;
  }

  &::-moz-range-thumb {
    width: 12px;
    height: 12px;
    background: white;
    border-radius: 50%;
    border: none;
  }
`;

const PlaybackControlsWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const PlaybackControlButton = styled.button<{ active?: boolean }>`
  background: none;
  border: none;
  color: ${(props) => (props.active ? "#4d76fc" : "white")};
  cursor: pointer;
  transition: transform 0.2s ease, color 0.2s ease;

  &:hover {
    transform: scale(1.1);
  }
`;

const ControlsRow = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const CommentBarWrapper = styled.div`
  width: 100%;
  margin-top: 4px;
`;

const BottomTabsWrapper = styled.div<{ $isCollapsed: boolean }>`
  width: 100%;
  background-color: transparent;
  z-index: 10;
  position: relative;
  height: ${(props) => (props.$isCollapsed ? "auto" : "100%")};
  display: flex;
  flex-direction: column;
  padding-bottom: ${(props) => (props.$isCollapsed ? "10px" : "0")};
`;

const TabButtons = styled.div<{ hasActiveTab: boolean }>`
  font-size: 0.875rem;
  display: flex;
  justify-content: space-around;
  padding: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  z-index: 1010;
  background-color: inherit;
  flex-shrink: 0;

  animation-name: ${(props) => (props.hasActiveTab ? "slideUp" : "slideDown")};
  animation-duration: 0.8s;
  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  animation-fill-mode: forwards;

  @keyframes slideUp {
    from {
      transform: translateY(0);
    }
    to {
      transform: translateY(-12px);
    }
  }

  @keyframes slideDown {
    from {
      transform: translateY(-12px);
    }
    to {
      transform: translateY(0);
    }
  }

  span {
    color: white;
    cursor: pointer;
    transition: all 400ms cubic-bezier(0.16, 1, 0.3, 1);
    transform: scale(${(props) => (props.hasActiveTab ? "1" : "0.95")});
    opacity: ${(props) => (props.hasActiveTab ? 1 : 0.6)};

    &:hover {
      opacity: 1 !important;
      transform: scale(1.1);
    }
  }
`;

const TabContentWrapper = styled.div<{ $isExpanded: boolean }>`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background-color: inherit;
  overflow: hidden;
`;

const TabContent = styled.div<{ $isActive: boolean }>`
  flex: 1;
  min-height: 0;
  overflow: hidden;
  opacity: ${(props) => (props.$isActive ? 1 : 0)};
  transform: translateY(${(props) => (props.$isActive ? "0" : "10px")});
  transition: opacity 0.5s ease-in-out, transform 0.5s ease-in-out;
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  color: white;
  flex-shrink: 0;
  padding: 0.5rem 1rem;
`;

const ScrollableContent = styled.div`
  flex: 1;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  padding-bottom: 3.5rem;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.5);
  }
`;

const PlaylistItemList = styled.ul`
  list-style: none;
  padding: 0 1rem 2rem 1rem;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const PlaylistItem = styled.li<{ hoverColor?: string }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;

  &:hover {
    background-color: ${(props) => props.hoverColor || "#1f1f1f"};
  }

  .thumbnail {
    width: 56px;
    height: 56px;
    border-radius: 8px;
    overflow: hidden;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .thumbnail img {
    width: 160%;
    height: 160%;
    object-fit: cover;
    object-position: center;
  }

  p {
    font-size: 0.875rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }
`;

const PlayerControlsGroup = styled.div<{ $isHidden: boolean }>`
  width: 100%;
  display: ${(props) => (props.$isHidden ? "none" : "flex")};
  flex-direction: column;
  gap: 12px;
  max-width: 320px;
  margin-top: 1.5rem;
`;

const CommentViewHeader = styled.div`
  width: 100%;
  max-width: 320px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  /* 노래 제목과 X 버튼 사이 여백 최소화 */
  padding: 0;
  margin-top: 0;
  margin-bottom: 0.5rem;
`;

const CommentSectionWrapper = styled.div<{ $isVisible: boolean }>`
  width: 100%;
  max-width: 320px;
  display: ${(props) => (props.$isVisible ? "flex" : "none")};
  flex-direction: column;
  gap: 10px;
  /* height: auto로 변경하고 flex: 1을 제거하여 내용물 크기만큼만 차지하도록 함 */
  height: auto;
  min-height: 0;
  /* 하단 탭 버튼과 겹침 방지를 위한 패딩 제거 */
  padding-bottom: 0;
`;

const ControlButton = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;

  &:hover {
    transform: scale(1.1);
  }
`;

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
}

enum RepeatMode {
  NO_REPEAT = 0,
  REPEAT_ALL = 1,
  REPEAT_ONE = 2,
}

const STORAGE_KEYS = {
  VOLUME: "musicPlayerVolume",
  LAST_VIDEO_ID: "musicPlayerLastVideoId",
  LAST_VIDEO_TITLE: "musicPlayerLastVideoTitle",
  LAST_VIDEO_THUMBNAIL: "musicPlayerLastVideoThumbnail",
  REPEAT_MODE: "musicPlayerRepeatMode",
  SHUFFLE_MODE: "musicPlayerShuffleMode",
  LAST_PLAYLIST_ID: "musicPlayerLastPlaylistId",
  CURRENT_VIDEO_INDEX: "musicPlayerCurrentVideoIndex",
};

export default function YouTubeMusicPlayer({
  onColorExtract,
  onColorExtractSecondary,
  onColorExtractHover,
  isFullScreenMode = false,
}: {
  onColorExtract?: (color: string) => void;
  onColorExtractSecondary?: (color: string) => void;
  onColorExtractHover?: (color: string) => void;
  isFullScreenMode?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"playlist" | "lyrics" | null>(
    null
  );
  // 댓글 뷰 상태
  const [isCommentView, setIsCommentView] = useState(false);

  const {
    currentVideoId,
    currentVideoTitle,
    currentVideoThumbnail,
    isPlaying,
    volume,
    onStateChange,
    playPause,
    prevTrack,
    nextTrack,
    changeVolume,
    videos,
    playlists,
    playPlaylist,
    setPlaylists,
    setVideos,
  } = useMusicPlayer();

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);
  const [dominantColor, setDominantColor] = useState<string | null>(null);
  const [hoverColor, setHoverColor] = useState<string | null>(null);

  const [repeatMode, setRepeatMode] = useState<RepeatMode>(() => {
    const savedRepeatMode = localStorage.getItem(STORAGE_KEYS.REPEAT_MODE);
    return savedRepeatMode ? parseInt(savedRepeatMode) : RepeatMode.NO_REPEAT;
  });

  const [shuffleMode, setShuffleMode] = useState<boolean>(() => {
    const savedShuffleMode = localStorage.getItem(STORAGE_KEYS.SHUFFLE_MODE);
    return savedShuffleMode ? savedShuffleMode === "true" : false;
  });

  // 댓글 뷰 토글 함수
  const toggleCommentView = () => setIsCommentView((prev) => !prev);

  useEffect(() => {
    const handlePostPlaylist = () => {
      const fromPost = sessionStorage.getItem("play_from_post");
      const raw = sessionStorage.getItem("post_playlist");

      if (fromPost === "true" && raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.tracks?.length > 0) {
            const syntheticPlaylists = [
              {
                id: parsed.id,
                snippet: {
                  title: parsed.title || "임시 재생목록",
                  thumbnails: { medium: { url: parsed.thumbnail } },
                },
              },
            ];

            const syntheticVideos = parsed.tracks.map((track: any) => ({
              id: { videoId: track.videoId },
              snippet: {
                title: track.title,
                playlistId: parsed.id,
                thumbnails: { default: { url: track.thumbnail } },
              },
            }));

            setPlaylists(syntheticPlaylists);
            setVideos(syntheticVideos);
            playPlaylist(parsed.id, 0);
          }
        } catch (e) {
          console.error("Post playlist parse error", e);
        } finally {
          sessionStorage.removeItem("play_from_post");
          sessionStorage.removeItem("post_playlist");
        }
      }
    };

    handlePostPlaylist();
    const handler = () => handlePostPlaylist();
    window.addEventListener("post_playlist_selected", handler);
    return () => window.removeEventListener("post_playlist_selected", handler);
  }, []);

  useEffect(() => {
    const savedPlaylistId = localStorage.getItem(STORAGE_KEYS.LAST_PLAYLIST_ID);
    const savedVideoIndex = localStorage.getItem(
      STORAGE_KEYS.CURRENT_VIDEO_INDEX
    );
    if (savedPlaylistId && savedVideoIndex && playlists.length > 0) {
      const timer = setTimeout(() => {
        playPlaylist(savedPlaylistId, parseInt(savedVideoIndex));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [playlists.length]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VOLUME, String(volume));
  }, [volume]);

  useEffect(() => {
    if (currentVideoId && currentVideoTitle && currentVideoThumbnail) {
      localStorage.setItem(STORAGE_KEYS.LAST_VIDEO_ID, currentVideoId);
      localStorage.setItem(STORAGE_KEYS.LAST_VIDEO_TITLE, currentVideoTitle);
      localStorage.setItem(
        STORAGE_KEYS.LAST_VIDEO_THUMBNAIL,
        currentVideoThumbnail
      );

      const currentVideoIndex = videos.findIndex(
        (v) => v.id.videoId === currentVideoId
      );
      if (currentVideoIndex !== -1) {
        const playlistId = videos[currentVideoIndex].snippet.playlistId;
        localStorage.setItem(
          STORAGE_KEYS.CURRENT_VIDEO_INDEX,
          String(currentVideoIndex)
        );
        if (playlistId && playlistId !== "undefined") {
          localStorage.setItem(STORAGE_KEYS.LAST_PLAYLIST_ID, playlistId);
        }
      }
    }
  }, [currentVideoId, currentVideoTitle, currentVideoThumbnail, videos]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REPEAT_MODE, String(repeatMode));
  }, [repeatMode]);

  useEffect(() => {
    const handleSeekToTime = (event: CustomEvent) => {
      const { seconds } = event.detail;
      if (playerRef.current && playerRef.current.seekTo) {
        playerRef.current.seekTo(seconds, true);
        setCurrentTime(seconds);
        setSliderValue(seconds);
      }
    };

    window.addEventListener("seekToTime", handleSeekToTime as EventListener);
    return () => {
      window.removeEventListener(
        "seekToTime",
        handleSeekToTime as EventListener
      );
    };
  }, []);

  useEffect(() => {
    if (!currentVideoThumbnail) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = currentVideoThumbnail;

    img.onload = () => {
      const colorThief = new ColorThief();
      try {
        const palette = colorThief.getPalette(img, 5);
        const mainColor = palette?.[0];
        const secondColor = palette?.[1];

        if (mainColor) {
          const formattedMain = `rgb(${mainColor[0]}, ${mainColor[1]}, ${mainColor[2]})`;
          setDominantColor(formattedMain);
          onColorExtract?.(formattedMain);

          const desaturated = mainColor.map((c: number) => Math.floor(c * 0.6));
          const formattedHover = `rgb(${desaturated[0]}, ${desaturated[1]}, ${desaturated[2]})`;
          setHoverColor(formattedHover);
          onColorExtractHover?.(formattedHover);
        }

        if (secondColor) {
          const formattedSecond = `rgb(${secondColor[0]}, ${secondColor[1]}, ${secondColor[2]})`;
          onColorExtractSecondary?.(formattedSecond);
        }
      } catch (e) {
        console.error("Failed to extract color palette:", e);
      }
    };
  }, [currentVideoThumbnail]);

  useEffect(() => {
    if (dominantColor) onColorExtract?.(dominantColor);
  }, [dominantColor]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SHUFFLE_MODE, String(shuffleMode));
  }, [shuffleMode]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isSeeking && playerRef.current) {
        const time = playerRef.current.getCurrentTime();
        if (typeof time === "number" && !isNaN(time)) {
          setCurrentTime(time);
          setSliderValue(time);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [playerRef, isSeeking]);

  const handleSeekStart = () => setIsSeeking(true);

  const handleSeekChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    setSliderValue(parseFloat(event.target.value));

  const handleSeek = () => {
    if (playerRef.current) {
      playerRef.current.seekTo(sliderValue, true);
      setCurrentTime(sliderValue);

      const playerState = playerRef.current.getPlayerState();
      if (playerState === 1 || isPlaying) playerRef.current.playVideo();
    }
    setIsSeeking(false);
  };

  const progressPercentage = duration > 0 ? (sliderValue / duration) * 100 : 0;
  const progressStyle = {
    background: `linear-gradient(to right, #4d76fc ${progressPercentage}%, #444 ${progressPercentage}%)`,
  };

  const toggleRepeatMode = () => {
    setRepeatMode((prevMode) => {
      switch (prevMode) {
        case RepeatMode.NO_REPEAT:
          return RepeatMode.REPEAT_ALL;
        case RepeatMode.REPEAT_ALL:
          return RepeatMode.REPEAT_ONE;
        case RepeatMode.REPEAT_ONE:
          return RepeatMode.NO_REPEAT;
        default:
          return RepeatMode.NO_REPEAT;
      }
    });
  };

  const toggleShuffleMode = () => setShuffleMode((prevMode) => !prevMode);

  const handleNextTrack = () => {
    if (shuffleMode && videos.length > 1) {
      const currentIndex = videos.findIndex(
        (v) => v.id.videoId === currentVideoId
      );
      let nextIndex = currentIndex;
      while (nextIndex === currentIndex)
        nextIndex = Math.floor(Math.random() * videos.length);
      playPlaylist(videos[nextIndex].snippet.playlistId || "", nextIndex);
    } else {
      nextTrack();
    }
  };

  const handleTrackEnd = () => {
    if (repeatMode === RepeatMode.REPEAT_ONE && playerRef.current) {
      playerRef.current.seekTo(0, true);
      playerRef.current.playVideo();
    } else {
      handleNextTrack();
    }
  };

  useEffect(() => {
    return () => {
      if (playerRef.current) {
        const currentTime = playerRef.current.getCurrentTime();
        localStorage.setItem("youtube_player_time", String(currentTime));
        localStorage.setItem("youtube_player_playing", String(isPlaying));
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    if (playerRef.current && playerReadyRef.current) {
      const savedTime = localStorage.getItem("youtube_player_time");
      const wasPlaying =
        localStorage.getItem("youtube_player_playing") === "true";
      if (savedTime) {
        try {
          playerRef.current.seekTo(parseFloat(savedTime), true);
          if (wasPlaying) playerRef.current.playVideo();
        } catch (err) {
          console.error("🎬 seekTo 실패:", err);
        }
      }
    }
  }, [playerReadyRef.current]);
  const resolveVideoId = (v: any): string | null => {
     if (!v) return null;
     // 형태 1) 검색 결과: { id: { videoId } }
     if (typeof v.id === "object" && v.id && "videoId" in v.id) return (v.id as any).videoId;
     // 형태 2) 단일 문자열 id: "VIDEO_ID"
     if (typeof v.id === "string") return v.id as string;
     // 형태 3) 플레이리스트 항목: snippet.resourceId.videoId
     return v?.snippet?.resourceId?.videoId ?? null;
   };

  let currentIndex = Array.isArray(videos)
   ? videos.findIndex((v) => resolveVideoId(v) === currentVideoId)
    : -1;
  if (currentIndex < 0) currentIndex = 0; // 못 찾으면 0으로 폴백
  const current = Array.isArray(videos) && videos.length > 0 ? videos[currentIndex] : null;
  const ytId = resolveVideoId(current);
  const baseThumb =
  current?.snippet?.thumbnails?.high?.url ||
  current?.snippet?.thumbnails?.medium?.url ||
  current?.snippet?.thumbnails?.default?.url ||
 (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : currentVideoThumbnail || "");

  const srcSet =
    ytId
      ? [
          `https://i.ytimg.com/vi/${ytId}/sddefault.jpg 640w`,
          `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg 1280w`,
          `https://i.ytimg.com/vi/${ytId}/maxresdefault.jpg 1920w`,
        ].join(", ")
      : undefined;

  return (
    <Container $isCollapsed={activeTab === null}>
      {currentVideoId && (
        <YouTube
          videoId={currentVideoId}
          key={currentVideoId}
          opts={{ height: "0", width: "0", playerVars: { autoplay: 1 } }}
          onReady={(e: YouTubeEvent<YouTubePlayer>) => {
            playerRef.current = e.target;
            playerReadyRef.current = true;
            const d = e.target.getDuration();
            if (typeof d === "number" && !isNaN(d)) setDuration(d);
            const savedVolume = localStorage.getItem("musicPlayerVolume");
            if (savedVolume !== null) {
              playerRef.current.setVolume(Number(savedVolume));
              changeVolume({
                target: { value: savedVolume },
              } as React.ChangeEvent<HTMLInputElement>);
            }
          }}
          onStateChange={onStateChange}
          onEnd={handleTrackEnd}
        />
      )}

      {/* 플레이어 섹션은 탭이 닫혀있을 때만 표시 */}
      {activeTab === null && (
        <PlayerSection $isCommentView={isCommentView}>
          <PlayerWrapper $isCommentView={isCommentView}>
            {/* 앨범 아트, 제목은 항상 표시 */}
            <AlbumArtWrapper>
              <AlbumArt
                 src={baseThumb}
                 srcSet={srcSet}
                  sizes="(max-width: 480px) 280px, 480px"
                  alt={currentVideoTitle || 'album'}
                loading="lazy"
            />
            </AlbumArtWrapper>
            <Title>{currentVideoTitle}</Title>

            {/* 재생 버튼은 댓글 뷰일 때 숨김 */}
            {!isCommentView && (
              <Controls>
                <button onClick={prevTrack}>
                  <SkipBack size={28} />
                </button>
                <button onClick={playPause}>
                  {isPlaying ? <Pause size={28} /> : <Play size={28} />}
                </button>
                <button onClick={handleNextTrack}>
                  <SkipForward size={28} />
                </button>
              </Controls>
            )}

            {/* 재생바는 댓글 뷰일 때 숨김 */}
            <ProgressBarWrapper $isHidden={isCommentView}>
              <ProgressTime>{formatTime(currentTime)}</ProgressTime>
              <ProgressBar
                type="range"
                min="0"
                max={duration}
                value={sliderValue}
                style={progressStyle}
                onMouseDown={handleSeekStart}
                onChange={handleSeekChange}
                onMouseUp={handleSeek}
                onTouchEnd={handleSeek}
              />
              <ProgressTime>{formatTime(duration)}</ProgressTime>
            </ProgressBarWrapper>

            {/* ======================= 컨트롤 영역 재구성 시작 ======================= */}

            {/* 1. 댓글 뷰 상단 헤더: 나가기 버튼 전용 (제목 아래) */}
            {isCommentView && (
              <CommentViewHeader>
                {/* 제목 중앙 정렬 유지를 위해 좌측에 빈 공간 추가 */}
                <div style={{ flex: 1 }} />
                {/* 나가기 버튼을 오른쪽으로 배치 */}
                <ControlButton
                  onClick={toggleCommentView}
                  title="Exit Comments"
                >
                  <X size={20} />
                </ControlButton>
              </CommentViewHeader>
            )}

            {/* 2. 기존 플레이어 컨트롤 그룹: 댓글 뷰가 아닐 때만 표시 (볼륨/셔플/반복/댓글 버튼) */}
            <PlayerControlsGroup $isHidden={isCommentView}>
              <ControlsRow>
                <VolumeWrapper>
                  <Volume2 size={16} />
                  <VolumeSlider
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={changeVolume}
                    style={{
                      background: `linear-gradient(to right, #4d76fc ${volume}%, #444 ${volume}%)`,
                    }}
                  />
                </VolumeWrapper>

                <PlaybackControlsWrapper>
                  {/* 댓글 버튼 (셔플, 반복과 같은 라인) */}
                  <PlaybackControlButton
                    onClick={toggleCommentView}
                    title="Show Comments"
                  >
                    <MessageCircle size={16} />
                  </PlaybackControlButton>

                  <PlaybackControlButton
                    active={shuffleMode}
                    onClick={toggleShuffleMode}
                    title="Shuffle Play"
                  >
                    <Shuffle size={16} />
                  </PlaybackControlButton>
                  <PlaybackControlButton
                    active={repeatMode !== RepeatMode.NO_REPEAT}
                    onClick={toggleRepeatMode}
                    title={
                      repeatMode === RepeatMode.NO_REPEAT
                        ? "No Repeat"
                        : repeatMode === RepeatMode.REPEAT_ALL
                        ? "Repeat All"
                        : "Repeat One"
                    }
                  >
                    <Repeat size={16} />
                    {repeatMode === RepeatMode.REPEAT_ONE && (
                      <span
                        style={{
                          fontSize: "10px",
                          position: "absolute",
                          marginTop: "-8px",
                          marginLeft: "-6px",
                        }}
                      >
                        1
                      </span>
                    )}
                  </PlaybackControlButton>
                </PlaybackControlsWrapper>
              </ControlsRow>
            </PlayerControlsGroup>

            {/* 3. 댓글 입력 및 리스트: 댓글 뷰일 때만 표시 */}
            <CommentSectionWrapper $isVisible={isCommentView}>
              {/* 댓글 입력 바가 목록 위에 오도록 순서 유지 */}
              <CommentBarWrapper>
                <CommentInputBar trackId={currentVideoId} />
              </CommentBarWrapper>
              {/* LiveComments가 CommentBarWrapper 바로 아래에 배치됨 */}
              <LiveComments trackId={currentVideoId} />
            </CommentSectionWrapper>

            {/* ======================= 컨트롤 영역 재구성 종료 ======================= */}
          </PlayerWrapper>
        </PlayerSection>
      )}

      {/* 하단 탭들 */}
      <BottomTabsWrapper $isCollapsed={activeTab === null}>
        <TabButtons hasActiveTab={activeTab !== null}>
          <span
            style={{
              cursor: "pointer",
              opacity: activeTab === "playlist" ? 1 : 0.5,
            }}
            onClick={() =>
              setActiveTab((prev) => (prev === "playlist" ? null : "playlist"))
            }
          >
            다음 트랙
          </span>
          <span
            style={{
              cursor: "pointer",
              opacity: activeTab === "lyrics" ? 1 : 0.5,
            }}
            onClick={() =>
              setActiveTab((prev) => (prev === "lyrics" ? null : "lyrics"))
            }
          >
            재생목록
          </span>
        </TabButtons>

        <TabContentWrapper $isExpanded={activeTab !== null}>
          <TabContent $isActive={activeTab !== null}>
            {activeTab === "playlist" && (
              <ScrollableContent>
                <PlaylistItemList>
                  {videos.map((video, index) => (
                    <PlaylistItem
                      key={index}
                      onClick={() =>
                        playPlaylist(video.snippet.playlistId || "", index)
                      }
                    >
                      <div className="thumbnail">
                        <img
                          src={video.snippet.thumbnails.default.url}
                          alt={video.snippet.title}
                        />
                      </div>
                      <p>{video.snippet.title}</p>
                    </PlaylistItem>
                  ))}
                </PlaylistItemList>
              </ScrollableContent>
            )}

            {activeTab === "lyrics" && (
              <ScrollableContent>
                <PlaylistItemList>
                  {playlists.map((playlist, index) => (
                    <PlaylistItem
                      key={index}
                      onClick={() => playPlaylist(playlist.id, 0)}
                    >
                      <div className="thumbnail">
                        <img
                          src={playlist.snippet.thumbnails?.medium?.url}
                          alt={playlist.snippet.title}
                        />
                      </div>
                      <p>{playlist.snippet.title}</p>
                    </PlaylistItem>
                  ))}
                </PlaylistItemList>
              </ScrollableContent>
            )}
          </TabContent>
        </TabContentWrapper>
      </BottomTabsWrapper>
    </Container>
  );
}
