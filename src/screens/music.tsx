import ColorThief from "colorthief/dist/color-thief";
import React, { useRef, useEffect, useState } from "react";
import Lyrics from "../components/Lyrics";
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
} from "lucide-react";
import { useMusicPlayer } from "../components/MusicFunction";

const Container = styled.div`
  color: white;
  height: 100vh;
  height: 100dvh; /* 모바일에서 더 정확한 뷰포트 높이 */
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  box-sizing: border-box;
`;

const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
`;

const PlayerSection = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 0;
  padding: 0 1rem;
`;

const PlayerWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 1rem;
  flex-shrink: 0;
`;

const AlbumArtWrapper = styled.div`
  position: relative;
  width: 240px;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: 12px;
  margin-bottom: 1.25rem;
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
  line-height: 1.25rem;
  font-weight: 600;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 10px;
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

const ProgressBarWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 240px;
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
  background: linear-gradient(to right, #1db954 0%, #444 0%);
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

const PlayerControlsWrapper = styled.div`
  margin-top: 1.5rem;
  display: flex;
  align-items: center;
  width: 240px;
  justify-content: space-between;
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
  background: linear-gradient(to right, #1db954 50%, #444 50%);
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
  color: ${(props) => (props.active ? "#1db954" : "white")};
  cursor: pointer;
  transition: transform 0.2s ease, color 0.2s ease;

  &:hover {
    transform: scale(1.1);
  }
`;

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  color: white;
  flex-shrink: 0;
  padding: 0.5rem 1rem;
`;

const PlaylistItemList = styled.ul`
  list-style: none;
  padding: 0 1rem 2rem 1rem;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  overflow-x: hidden;

  /* 스크롤 성능 최적화 */
  will-change: scroll-position;

  /* 스크롤바 스타일링 */
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.3) rgba(255, 255, 255, 0.1);

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 4px;

    &:hover {
      background: rgba(255, 255, 255, 0.5);
    }
  }

  /* 스크롤 바운딩 설정 */
  scroll-behavior: smooth;

  /* 모바일에서 관성 스크롤 활성화 */
  -webkit-overflow-scrolling: touch;

  &::after {
    content: "";
    display: block;
    height: 24px;
    flex-shrink: 0;
  }
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

const PlaylistGrid = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1.5rem;
`;

const PlaylistCard = styled.div<{ hoverColor?: string }>`
  cursor: pointer;
  border-radius: 12px;
  padding: 1rem;
  transition: background-color 0.2s, transform 0.2s;
  text-align: center;
  font-weight: bold;

  &:hover {
    background-color: ${(props) => props.hoverColor || "#2a2a2a"};
    transform: translateY(-4px);
  }
`;

const PlaylistImage = styled.img`
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 0.75rem;
`;

const ScrollableContent = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;

  /* 스크롤바 스타일링 */
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

    &:hover {
      background: rgba(255, 255, 255, 0.5);
    }
  }
`;

const BottomFixed = styled.div`
  width: 100%;
  padding: 1rem 0 0 0;
  background-color: transparent;
  border-top: none;
  flex-shrink: 0;
  position: relative;
  overflow: visible;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-height: 120px;
  flex: 1;
  min-height: 0;
  height: 100%;
`;

const TabButtons = styled.div<{ hasActiveTab: boolean }>`
  font-size: 0.875rem;
  display: flex;
  justify-content: space-around;
  padding: 0.75rem 1rem 0.5rem;
  transform: ${(props) =>
    props.hasActiveTab ? "translateY(-12px)" : "translateY(0)"};
  transition: transform 0.3s ease;
  position: relative;
  z-index: 1010;
  background-color: inherit;
  flex-shrink: 0;
`;

const TabContentWrapper = styled.div<{ $isExpanded: boolean }>`
  height: ${(props) => {
    if (!props.$isExpanded) return "0";
    return `clamp(300px, 55vh, min(70vh, 700px))`;
  }};
  opacity: ${(props) => (props.$isExpanded ? 1 : 0)};
  transform: translateY(${(props) => (props.$isExpanded ? "0%" : "100%")});
  transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.4s ease,
    height 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;

  @media (max-width: 768px) {
    height: ${(props) => {
      if (!props.$isExpanded) return "0";
      return `clamp(250px, 60vh, 500px)`;
    }};
  }

  @media (max-height: 600px) {
    height: ${(props) => {
      if (!props.$isExpanded) return "0";
      return `calc(100vh - 180px)`;
    }};
  }
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
`;

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
}

// 반복 모드를 위한 상수 정의
enum RepeatMode {
  NO_REPEAT = 0,
  REPEAT_ALL = 1,
  REPEAT_ONE = 2,
}

// 로컬 스토리지 키 상수
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
}: {
  onColorExtract?: (color: string) => void;
  onColorExtractSecondary?: (color: string) => void;
  onColorExtractHover?: (color: string) => void;
}) {
  // 하단 탭 상태 (playlist | lyrics | null)
  const [activeTab, setActiveTab] = useState<"playlist" | "lyrics" | null>(
    null
  );
  const playerReadyRef = useRef<boolean>(false);
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
    playerRef,
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
                  thumbnails: {
                    medium: {
                      url: parsed.thumbnail,
                    },
                  },
                },
              },
            ];

            const syntheticVideos = parsed.tracks.map((track: any) => ({
              id: { videoId: track.videoId },
              snippet: {
                title: track.title,
                playlistId: parsed.id,
                thumbnails: {
                  default: {
                    url: track.thumbnail,
                  },
                },
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

  // 초기 로드 시 로컬 스토리지에서 설정 불러오기
  useEffect(() => {
    const savedPlaylistId = localStorage.getItem(STORAGE_KEYS.LAST_PLAYLIST_ID);
    const savedVideoIndex = localStorage.getItem(
      STORAGE_KEYS.CURRENT_VIDEO_INDEX
    );

    if (savedPlaylistId && savedVideoIndex && playlists.length > 0) {
      // 컴포넌트가 완전히 마운트된 후 플레이리스트 로드
      const timer = setTimeout(() => {
        playPlaylist(savedPlaylistId, parseInt(savedVideoIndex));
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [playlists.length]);

  // 볼륨 값이 변경될 때 로컬 스토리지 업데이트
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VOLUME, String(volume));
  }, [volume]);

  // 현재 재생 비디오가 변경될 때 로컬 스토리지 업데이트
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

  // 반복 모드가 변경될 때 로컬 스토리지 업데이트
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REPEAT_MODE, String(repeatMode));
  }, [repeatMode]);

  // Extract dominant color from album art when thumbnail changes
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
          if (onColorExtract) onColorExtract(formattedMain);

          const desaturated = mainColor.map((c) => Math.floor(c * 0.6));
          const formattedHover = `rgb(${desaturated[0]}, ${desaturated[1]}, ${desaturated[2]})`;
          setHoverColor(formattedHover);
          if (onColorExtractHover) onColorExtractHover(formattedHover);
        }

        if (secondColor && onColorExtractSecondary) {
          const formattedSecond = `rgb(${secondColor[0]}, ${secondColor[1]}, ${secondColor[2]})`;
          onColorExtractSecondary(formattedSecond);
        }
      } catch (e) {
        console.error("Failed to extract color palette:", e);
      }
    };
  }, [currentVideoThumbnail]);

  useEffect(() => {
    if (dominantColor && onColorExtract) {
      onColorExtract(dominantColor);
    }
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

  const handleSeekStart = () => {
    setIsSeeking(true);
  };

  const handleSeekChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSliderValue(parseFloat(event.target.value));
  };

  const handleSeek = () => {
    if (playerRef.current) {
      playerRef.current.seekTo(sliderValue, true);
      setCurrentTime(sliderValue);

      const playerState = playerRef.current.getPlayerState();

      if (playerState === 1 || isPlaying) {
        playerRef.current.playVideo();
      }
    }

    setIsSeeking(false);
  };

  const progressPercentage = duration > 0 ? (sliderValue / duration) * 100 : 0;
  const progressStyle = {
    background: `linear-gradient(to right, #1db954 ${progressPercentage}%, #444 ${progressPercentage}%)`,
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

  const toggleShuffleMode = () => {
    setShuffleMode((prevMode) => !prevMode);
  };

  const handleNextTrack = () => {
    if (shuffleMode && videos.length > 1) {
      const currentIndex = videos.findIndex(
        (v) => v.id.videoId === currentVideoId
      );
      let nextIndex = currentIndex;
      while (nextIndex === currentIndex) {
        nextIndex = Math.floor(Math.random() * videos.length);
      }
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

  return (
    <Container>
      <ContentWrapper>
        <YouTube
          videoId={currentVideoId || ""}
          key={currentVideoId || "fallback"}
          opts={{ height: "0", width: "0", playerVars: { autoplay: 1 } }}
          onReady={(e: YouTubeEvent<YouTubePlayer>) => {
            playerRef.current = e.target;
            playerReadyRef.current = true;
            const duration = e.target.getDuration();
            if (typeof duration === "number" && !isNaN(duration)) {
              setDuration(duration);
            }
            const savedVolume = localStorage.getItem(STORAGE_KEYS.VOLUME);
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
        {activeTab === null && (
          <PlayerSection>
            <PlayerWrapper>
              <AlbumArtWrapper>
                <AlbumArt src={currentVideoThumbnail} alt="album" />
              </AlbumArtWrapper>
              <Title>{currentVideoTitle}</Title>

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

              <ProgressBarWrapper>
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

              <PlayerControlsWrapper>
                <VolumeWrapper>
                  <Volume2 size={16} />
                  <VolumeSlider
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={changeVolume}
                    style={{
                      background: `linear-gradient(to right, #1db954 ${volume}%, #444 ${volume}%)`,
                    }}
                  />
                </VolumeWrapper>

                <PlaybackControlsWrapper>
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
              </PlayerControlsWrapper>
            </PlayerWrapper>
          </PlayerSection>
        )}

        <BottomFixed>
          <TabButtons hasActiveTab={activeTab !== null}>
            <span
              style={{
                cursor: "pointer",
                opacity: activeTab === "playlist" ? 1 : 0.5,
              }}
              onClick={() =>
                setActiveTab((prev) =>
                  prev === "playlist" ? null : "playlist"
                )
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
              가사
            </span>
          </TabButtons>
          <TabContentWrapper $isExpanded={activeTab !== null}>
            <TabContent $isActive={activeTab !== null}>
              {activeTab === "playlist" && (
                <>
                  <SectionTitle>🎵 현재 재생목록</SectionTitle>
                  <ScrollableContent>
                    <PlaylistItemList>
                      {videos.map((video, index) => (
                        <PlaylistItem
                          key={index}
                          hoverColor={hoverColor || undefined}
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
                </>
              )}

              {activeTab === "lyrics" && (
                <>
                  <SectionTitle>📜 가사</SectionTitle>
                  <ScrollableContent>
                    <Lyrics
                      title={currentVideoTitle || ""}
                      artist={
                        videos.find((v) => v.id.videoId === currentVideoId)
                          ?.snippet?.channelTitle || "unknown"
                      }
                    />
                  </ScrollableContent>
                </>
              )}
            </TabContent>
          </TabContentWrapper>
        </BottomFixed>
      </ContentWrapper>
    </Container>
  );
}
