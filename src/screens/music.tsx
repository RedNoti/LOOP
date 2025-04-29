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
  padding: 2rem;
  height: 100%;
  overflow: visuable;
  display: flex;
  flex-direction: column;
  position: relative;
`;

const PlayerWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 10;
  padding-bottom: 1rem;
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
  font-weight: 600;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  margin-top: 2rem;
  margin-bottom: 1rem;
  font-size: 1rem;
  font-weight: 500;
  color: white;
`;

const PlaylistItemList = styled.ul`
  list-style: none;
  padding: 0;
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const PlaylistItem = styled.li<{ hoverColor?: string }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;

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
  overflow-y: auto;
  flex: 1;
  padding-bottom: 100px; // 💡 하단 버튼 영역 확보
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
  // 하단 탭 상태 (playlist | lyrics)
  const [activeTab, setActiveTab] = useState<"playlist" | "lyrics">("playlist");
  const playerReadyRef = useRef<boolean>(false); // ✅ 반드시 여기
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
            setVideos(videos); // setVideos는 이미 useState로 선언된 상태 업데이트 함수입니다.
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
    // 마지막 재생 플레이리스트 정보 불러오기
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

      // 현재 비디오의 인덱스와 플레이리스트 ID 찾기
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

          // ✅ hover color 계산
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

  // Export dominantColor via onColorExtract prop if provided
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
      // 시킹 중에는 현재 시간 업데이트 건너뛰기
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
    // 드래그 중에만 슬라이더 값 업데이트
    setSliderValue(parseFloat(event.target.value));
  };

  const handleSeek = () => {
    if (playerRef.current) {
      // 실제 비디오 시간 변경
      playerRef.current.seekTo(sliderValue, true);
      setCurrentTime(sliderValue);

      // 현재 재생 상태 확인 (1일 경우 재생 중)
      const playerState = playerRef.current.getPlayerState();

      // 만약 재생 중이었다면, 계속 재생
      if (playerState === 1 || isPlaying) {
        playerRef.current.playVideo();
      }
    }

    // 시킹 종료
    setIsSeeking(false);
  };

  // 재생 바의 진행 상태를 보여주는 스타일 계산
  const progressPercentage = duration > 0 ? (sliderValue / duration) * 100 : 0;
  const progressStyle = {
    background: `linear-gradient(to right, #1db954 ${progressPercentage}%, #444 ${progressPercentage}%)`,
  };

  // 반복 모드 토글 함수
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

  // 셔플 모드 토글 함수
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

  // 트랙 종료 시 핸들러 수정
  const handleTrackEnd = () => {
    if (repeatMode === RepeatMode.REPEAT_ONE && playerRef.current) {
      // 한 곡 반복 모드면 현재 곡을 다시 재생
      playerRef.current.seekTo(0, true);
      playerRef.current.playVideo();
    } else {
      handleNextTrack();
    }
  };

  return (
    <Container>
      <YouTube
        videoId={currentVideoId || ""}
        key={currentVideoId || "fallback"}
        //비디오는 숨기고 자동재생 설정만 적용
        opts={{ height: "0", width: "0", playerVars: { autoplay: 1 } }}
        //유튜브 플레이어 준비될때 불러오는 로직
        onReady={(e: YouTubeEvent<YouTubePlayer>) => {
          playerRef.current = e.target;
          playerReadyRef.current = true;
          //비디오 전체 길이를 가져옴
          const duration = e.target.getDuration();
          if (typeof duration === "number" && !isNaN(duration)) {
            setDuration(duration);
          }
          //로컬 저장소에 볼륨값 저장
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
      {/*음악 앨범아트 부분 그래픽*/}
      <PlayerWrapper>
        <AlbumArtWrapper>
          <AlbumArt src={currentVideoThumbnail} alt="album" />
        </AlbumArtWrapper>
        <Title>{currentVideoTitle}</Title>

        {/*음악 이전곡 다음곡 버튼*/}
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

        {/*남은 시간*/}
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

        {/*볼륨 조절바*/}
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

          {/*반복,한곡재생 버튼*/}
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

      {/* 상단 버튼 영역: 음악 플레이어와 재생목록 사이 고정 */}
      <div
        style={{
          width: "100%",
          fontSize: "0.875rem",
          display: "flex",
          justifyContent: "space-around",
          color: "#fff",
          padding: "0.75rem 1rem 0.5rem",
          background: "transparent", // ✅ 배경 제거
        }}
      >
        <span
          style={{
            cursor: "pointer",
            opacity: activeTab === "playlist" ? 1 : 0.5,
          }}
          onClick={() => setActiveTab("playlist")}
        >
          다음 트랙
        </span>
        <span
          style={{
            cursor: "pointer",
            opacity: activeTab === "lyrics" ? 1 : 0.5,
          }}
          onClick={() => setActiveTab("lyrics")}
        >
          가사
        </span>
      </div>

      {/*스크롤 영역에 있는 내용*/}
      <ScrollableContent>
        {activeTab === "playlist" && (
          <>
            {videos.length > 0 && (
              <>
                <SectionTitle>🎵 현재 재생목록</SectionTitle>
                <PlaylistItemList>
                  {videos
                    .filter(
                      (video) =>
                        video.snippet &&
                        video.snippet.title &&
                        video.snippet.thumbnails?.default?.url
                    )
                    .map((video, index) => (
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
              </>
            )}

            {playlists.length > 0 && (
              <>
                <SectionTitle>📁 내 재생목록</SectionTitle>
                <PlaylistGrid>
                  {playlists.map((playlist) => (
                    <PlaylistCard
                      key={playlist.id}
                      hoverColor={hoverColor || undefined}
                      onClick={() => playPlaylist(playlist.id)}
                    >
                      <PlaylistImage
                        src={playlist.snippet.thumbnails.medium.url}
                        alt={playlist.snippet.title}
                      />
                      <p>{playlist.snippet.title}</p>
                    </PlaylistCard>
                  ))}
                </PlaylistGrid>
              </>
            )}
          </>
        )}

        {activeTab === "lyrics" && (
          <>
            <SectionTitle>📜 가사</SectionTitle>
            <Lyrics
              title={currentVideoTitle || ""}
              artist={
                videos.find((v) => v.id.videoId === currentVideoId)?.snippet
                  ?.channelTitle || "unknown"
              }
            />
          </>
        )}
      </ScrollableContent>
    </Container>
  );
}
