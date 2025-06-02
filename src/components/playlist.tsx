import styled from "styled-components";
import { useMusicPlayer } from "./MusicFunction";

const PlaylistGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1.5rem;
`;

const Card = styled.div<{ selected: boolean }>`
  background-color: ${({ selected }) => (selected ? "#333" : "#1e1e1e")};
  border: ${({ selected }) => (selected ? "2px solid #00f" : "none")};
  border-radius: 12px;
  padding: 1rem;
  cursor: pointer;
  transition: background 0.3s ease, transform 0.2s ease;

  &:hover {
    background-color: #2a2a2a;
    transform: scale(1.02);
  }
`;

const Thumbnail = styled.img`
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  object-fit: cover;
  margin-bottom: 0.75rem;
`;

const Title = styled.p`
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export default function Playlist() {
  const { playlists, playPlaylist, currentPlaylistId } = useMusicPlayer();

  if (!playlists.length) return null;

  return (
    <>
      <h3 style={{ color: "white", marginBottom: "1rem" }}>내 재생목록</h3>
      <PlaylistGrid>
        {playlists.map((playlist) => (
          <Card
            key={playlist.id}
            selected={playlist.id === currentPlaylistId}
            onClick={() => {
              localStorage.setItem("last_playlist_id", playlist.id);
              localStorage.setItem("current_video_index", "0");
              playPlaylist(playlist.id);
            }}
          >
            <Thumbnail
              src={playlist.snippet.thumbnails.medium.url}
              alt={playlist.snippet.title}
            />
            <Title>{playlist.snippet.title}</Title>
          </Card>
        ))}
      </PlaylistGrid>
    </>
  );
}
