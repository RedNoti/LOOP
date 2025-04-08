// 📄 Playlist 컴포넌트 - 사용자의 재생목록들을 보여주는 리스트 UI입니다.
import styled from "styled-components";
import { useMusicPlayer } from "./MusicFunction";

const PlaylistGrid = styled.div`  // 🎨 styled-components 스타일 정의
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1.5rem;
`;

const Card = styled.div`  // 🎨 styled-components 스타일 정의
  background-color: #1e1e1e;
  border-radius: 12px;
  padding: 1rem;
  cursor: pointer;
  transition: background 0.3s ease, transform 0.2s ease;

  &:hover {
    background-color: #2a2a2a;
    transform: scale(1.02);
  }
`;

const Thumbnail = styled.img`  // 🎨 styled-components 스타일 정의
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  object-fit: cover;
  margin-bottom: 0.75rem;
`;

const Title = styled.p`  // 🎨 styled-components 스타일 정의
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export default function Playlist() {
  const { playlists, playPlaylist } = useMusicPlayer();

  if (!playlists.length) return null;

  return (  // 🔚 컴포넌트의 JSX 반환 시작
    <>
      <h3 style={{ color: "white", marginBottom: "1rem" }}>내 재생목록</h3>
      <PlaylistGrid>
        {playlists.map((playlist) => (
          <Card key={playlist.id} onClick={() => playPlaylist(playlist.id)}>
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