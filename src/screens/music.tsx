import React from "react";
import YouTube from "react-youtube";
import styled from "styled-components";
import { Play, Pause, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { useMusicPlayer } from "../components/MusicFunction";

const Container = styled.div`
  background-color: #1f2937;
  color: white;
  border-radius: 1rem;
  padding: 2rem;
  width: 100%;
  height: 100dvh;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow-y: auto;

  @media (max-width: 768px) {
    height: auto;
    padding: 1rem;
  }
`;

const AlbumArt = styled.img`
  width: 256px;
  height: 256px;
  border-radius: 0.75rem;
  margin-bottom: 1.5rem;
  object-fit: cover;
  transition: transform 0.3s;
  &:hover {
    transform: scale(1.05);
  }
`;

const Title = styled.p`
  font-size: 1.125rem;
  font-weight: 500;
  margin-bottom: 1rem;
  text-align: center;
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
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PlaylistGrid = styled.div`
  margin-top: 2rem;
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
`;

const PlaylistCard = styled.div`
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

const UserProfile = styled.div`
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const UserImage = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid white;
`;

const YouTubeMusicPlayer: React.FC = () => {
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

  if (isLoading || videos.length === 0 || !currentVideoId) {
    return (
      <Container>
        <div>Loading music...</div>
      </Container>
    );
  }

  return (
    <Container>
      {userProfile && (
        <UserProfile>
          <UserImage src={userProfile.picture} alt="user" />
          <span>{userProfile.name}</span>
        </UserProfile>
      )}

      <AlbumArt src={currentVideoThumbnail} alt="Album art" />

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
            <Pause size={24} color="white" />
          ) : (
            <Play size={24} color="white" />
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
        <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{volume}%</span>
      </VolumeControl>

      {playlists.length > 0 && (
        <>
          <h3 style={{ marginTop: "2rem", fontSize: "1rem" }}>
            📁 내 재생목록
          </h3>
          <PlaylistGrid>
            {playlists.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                onClick={() => playPlaylist(playlist.id)}
              >
                <img
                  src={playlist.snippet.thumbnails.medium.url}
                  alt={playlist.snippet.title}
                  style={{ borderRadius: "0.5rem", width: "100%" }}
                />
                <p style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
                  {playlist.snippet.title}
                </p>
              </PlaylistCard>
            ))}
          </PlaylistGrid>
        </>
      )}

      <button
        onClick={fetchLikedVideos}
        style={{
          marginTop: "1.5rem",
          fontSize: "0.875rem",
          color: "#93c5fd",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textDecoration: "underline",
        }}
      >
        ❤️ 좋아요한 영상 보기
      </button>

      {likedVideos.length > 0 && (
        <div style={{ marginTop: "1rem", width: "100%" }}>
          <h3 style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
            ❤️ 좋아요한 영상
          </h3>
          <ul style={{ fontSize: "0.75rem", color: "#d1d5db" }}>
            {likedVideos.map((video) => (
              <li key={video.id}>{video.snippet.title}</li>
            ))}
          </ul>
        </div>
      )}
    </Container>
  );
};

export default YouTubeMusicPlayer;
