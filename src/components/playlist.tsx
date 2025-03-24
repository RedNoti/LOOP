// src/components/Playlist.tsx
import styled from "styled-components";
import { useMusicPlayer } from "./MusicFunction";

const SectionTitle = styled.h3`
  font-size: 1rem;
  margin-bottom: 1rem;
  font-weight: 600;
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

export default function Playlist() {
  const { playlists, playPlaylist } = useMusicPlayer();

  if (!playlists.length) return null;

  return (
    <>
      <SectionTitle>
        <span role="img" aria-label="Folder">
          📁
        </span>
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
  );
}
