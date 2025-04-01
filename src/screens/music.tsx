import React, { useEffect, useState, MouseEvent, TouchEvent } from "react";
import YouTube, { YouTubeEvent, YouTubePlayer } from "react-youtube";
import styled from "styled-components";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { useMusicPlayer } from "../components/MusicFunction";

const Container = styled.div`
  background-color: #121212;
  color: white;
  padding: 2rem;
  height: 100%;
  overflow: auto;
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
  background-color: #121212;
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

const VolumeWrapper = styled.div`
  margin-top: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const VolumeSlider = styled.input`
  width: 150px;
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

const PlaylistItem = styled.li`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background-color: #1f1f1f;
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

const PlaylistCard = styled.div`
  cursor: pointer;
  background-color: #1f1f1f;
  border-radius: 12px;
  padding: 1rem;
  transition: background-color 0.2s, transform 0.2s;
  text-align: center;

  &:hover {
    background-color: #2a2a2a;
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
`;

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
}

export default function YouTubeMusicPlayer() {
  const {
    currentVideoId,
    currentVideoTitle,
    currentVideoThumbnail,
    isPlaying,
    volume,
    onEnd,
    onStateChange,
    playPause,
    prevTrack,
    nextTrack,
    changeVolume,
    playerRef,
    videos,
    playlists,
    playPlaylist,
  } = useMusicPlayer();

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);

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

      // 현재 재생 상태 확인 (1은 재생 중)
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

  return (
    <Container>
      {currentVideoId && (
        <YouTube
          videoId={currentVideoId}
          key={currentVideoId}
          opts={{ height: "0", width: "0", playerVars: { autoplay: 1 } }}
          onReady={(e: YouTubeEvent<YouTubePlayer>) => {
            playerRef.current = e.target;
            const duration = e.target.getDuration();
            if (typeof duration === "number" && !isNaN(duration)) {
              setDuration(duration);
            }
          }}
          onStateChange={onStateChange}
          onEnd={onEnd}
        />
      )}

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
          <button onClick={nextTrack}>
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

        <VolumeWrapper>
          <Volume2 size={16} />
          <VolumeSlider
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={changeVolume}
          />
          <span style={{ fontSize: "0.75rem" }}>{volume}%</span>
        </VolumeWrapper>
      </PlayerWrapper>

      <ScrollableContent>
        {videos.length > 0 && (
          <>
            <SectionTitle>🎵 현재 재생목록</SectionTitle>
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
          </>
        )}

        {playlists.length > 0 && (
          <>
            <SectionTitle>📁 내 재생목록</SectionTitle>
            <PlaylistGrid>
              {playlists.map((playlist) => (
                <PlaylistCard
                  key={playlist.id}
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
      </ScrollableContent>
    </Container>
  );
}
