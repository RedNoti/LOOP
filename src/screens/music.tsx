import React, { useState, useEffect } from "react";
import YouTube from "react-youtube";
import styled from "styled-components";
import Playlist from "../components/playlist";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useMusicPlayer } from "../components/MusicFunction";

// 컨테이너를 유동적으로 조절할 수 있도록 수정
const Container = styled.div<{ isFullscreen: boolean }>`
  background-color: #1f2937;
  color: white;
  border-radius: ${(props) => (props.isFullscreen ? "0" : "60px")};
  padding: 1.5rem;
  width: 100%;
  height: ${(props) => (props.isFullscreen ? "100dvh" : "auto")};
  max-height: 100dvh;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  position: relative;
  box-sizing: border-box;
  transition: all 0.3s ease;

  @media (max-width: 768px) {
    padding: 1rem;
    border-radius: ${(props) => (props.isFullscreen ? "0" : "60px")};
  }
`;

// 새로운 스크롤 가능한 콘텐츠 래퍼 추가
const ScrollableContent = styled.div`
  overflow-y: auto;
  flex: 1;
  min-height: 0;
`;

// 레이아웃을 유연하게 수정
const ContentWrapper = styled.div<{ isFullscreen: boolean }>`
  display: flex;
  flex-direction: ${(props) => (props.isFullscreen ? "row" : "column")};
  width: 100%;
  height: 100%;
  gap: 2rem;
  align-items: ${(props) => (props.isFullscreen ? "flex-start" : "center")};

  @media (max-width: 992px) {
    flex-direction: column;
  }
`;

const PlayerSection = styled.div<{ isFullscreen: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: ${(props) => (props.isFullscreen ? "350px" : "100%")};
  max-width: 100%;

  @media (max-width: 992px) {
    width: 100%;
  }
`;

const PlaylistSection = styled.div`
  flex: 1;
  width: 100%;
  overflow-y: auto;
`;

const AlbumArt = styled.img<{ isFullscreen: boolean }>`
  width: ${(props) => (props.isFullscreen ? "256px" : "200px")};
  height: ${(props) => (props.isFullscreen ? "256px" : "200px")};
  border-radius: 0.75rem;
  margin-bottom: 1.5rem;
  object-fit: cover;
  transition: transform 0.3s, width 0.3s, height 0.3s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);

  &:hover {
    transform: scale(1.05);
  }

  @media (max-width: 576px) {
    width: 180px;
    height: 180px;
  }
`;

const Title = styled.p`
  font-size: 1.125rem;
  font-weight: 500;
  margin-bottom: 1rem;
  text-align: center;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ControlRow = styled.div`
  display: flex;
  gap: 1.5rem;
  margin-top: 1rem;
  justify-content: center;
  align-items: center;
`;

const VolumeControl = styled.div`
  margin-top: 1.5rem;
  width: 100%;
  max-width: 300px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PlaylistGrid = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1rem;

  @media (max-width: 576px) {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }
`;

const PlaylistCard = styled.div`
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-4px);
  }
`;

const PlaylistImage = styled.img`
  width: 100%;
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
`;

const UserProfile = styled.div`
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  z-index: 10;
`;

const UserImage = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid white;
`;

const SectionTitle = styled.h3`
  font-size: 1rem;
  margin-bottom: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const YouTubeMusicPlayer: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  const {
    videos,
    currentVideoId,
    isLoading,
    isPlaying,
    volume,
    currentVideoTitle,
    currentVideoThumbnail,
    onReady,
    onStateChange,
    onEnd,
    playPause,
    nextTrack,
    prevTrack,
    changeVolume,
    playlists,
    likedVideos,
    userProfile,
    fetchLikedVideos,
    playPlaylist,
  } = useMusicPlayer();

  // 화면 크기 변경 감지
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 자동으로 화면 크기에 따라 전체화면 모드 결정
  useEffect(() => {
    // 992px 이상이면 가로 레이아웃이 잘 작동하므로 전체화면으로 보여줌
    if (windowSize.width >= 992) {
      setIsFullscreen(true);
    } else {
      setIsFullscreen(false);
    }
  }, [windowSize]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (isLoading || videos.length === 0 || !currentVideoId) {
    return (
      <Container isFullscreen={isFullscreen}>
        <div>Loading music...</div>
      </Container>
    );
  }

  return (
    <Container isFullscreen={isFullscreen}>
      {userProfile && (
        <UserProfile>
          <UserImage src={userProfile.picture} alt="user" />
          <span>{userProfile.name}</span>
        </UserProfile>
      )}

      <ScrollableContent>
        <ContentWrapper isFullscreen={isFullscreen}>
          <PlayerSection isFullscreen={isFullscreen}>
            <AlbumArt
              src={currentVideoThumbnail}
              alt="Album art"
              isFullscreen={isFullscreen}
            />

            <Title>{currentVideoTitle}</Title>

            <YouTube
              videoId={currentVideoId ?? undefined}
              opts={{
                height: "0",
                width: "0",
                playerVars: {
                  autoplay: 1,
                  controls: 0,
                  showinfo: 0,
                  modestbranding: 1,
                  rel: 0,
                },
              }}
              onReady={onReady}
              onStateChange={onStateChange}
              onEnd={onEnd}
            />

            <ControlRow>
              <button
                onClick={prevTrack}
                aria-label="Previous track"
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                <SkipBack size={24} color="white" />
              </button>
              <button
                onClick={playPause}
                aria-label={isPlaying ? "Pause" : "Play"}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                {isPlaying ? (
                  <Pause size={28} color="white" />
                ) : (
                  <Play size={28} color="white" />
                )}
              </button>
              <button
                onClick={nextTrack}
                aria-label="Next track"
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                <SkipForward size={24} color="white" />
              </button>
            </ControlRow>

            <VolumeControl>
              <Volume2 size={16} color="#9ca3af" />
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={changeVolume}
                style={{ flexGrow: 1 }}
              />
              <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                {volume}%
              </span>
            </VolumeControl>
          </PlayerSection>
          <PlaylistSection>
            {playlists.length > 0 && (
              <>
                <SectionTitle>
                  <span role="img" aria-label="Folder">
                    📁
                  </span>{" "}
                  내 재생목록
                </SectionTitle>
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
                      <p
                        style={{
                          fontSize: "0.75rem",
                          marginTop: "0.5rem",
                          maxWidth: "100%",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {playlist.snippet.title}
                      </p>
                    </PlaylistCard>
                  ))}
                </PlaylistGrid>
              </>
            )}
            {likedVideos.length > 0 && (
              <div style={{ marginTop: "2rem", width: "100%" }}>
                <SectionTitle>
                  <span role="img" aria-label="Heart">
                    ❤️
                  </span>{" "}
                  좋아요한 영상
                </SectionTitle>
                <ul
                  style={{
                    fontSize: "0.75rem",
                    color: "#d1d5db",
                    paddingLeft: "1rem",
                  }}
                >
                  {likedVideos.map((video) => (
                    <li
                      key={video.id}
                      style={{
                        marginBottom: "0.5rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {video.snippet.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </PlaylistSection>
        </ContentWrapper>
      </ScrollableContent>
    </Container>
  );
};

export default YouTubeMusicPlayer;
