import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { auth } from "../firebaseConfig";
import { FirebaseError } from "firebase/app";
import { useState, useEffect } from "react";

const Button = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 5px;
  background-color: #ffffff;
  color: black;
  padding: 10px 10px;
  border-radius: 15px;
  font-weight: 600;
  cursor: pointer;
`;
const Title = styled.p``;
const Icon = styled.img`
  width: 12px;
  height: 12px;
`;

export default ({ showPlaylists = false }: { showPlaylists?: boolean }) => {
  const navigation = useNavigate();
  const [playlists, setPlaylists] = useState<any[]>([]); // 재생목록 저장

  const onClick = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/youtube.readonly");

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (token) {
        localStorage.setItem("ytAccessToken", token);
        console.log("Access Token 저장됨:", token);
      }

      navigation("/");
    } catch (e) {
      if (e instanceof FirebaseError) {
        alert(e.message);
      }
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("ytAccessToken");
    if (!token) return;

    const fetchPlaylists = async () => {
      try {
        const response = await fetch(
          "https://www.googleapis.com/youtube/v3/playlists?part=snippet&mine=true&maxResults=10",
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );
        const data = await response.json();
        console.log("내 유튜브 재생목록:", data);
        setPlaylists(data.items || []);
      } catch (error) {
        console.error("YouTube API 호출 실패:", error);
      }
    };

    fetchPlaylists();
  }, []);

  return (
    <div>
      <Button onClick={onClick}>
        <Icon src={`${process.env.PUBLIC_URL}/google-icon.png`} />
        <Title>Google 계정으로 로그인하기</Title>
      </Button>

      {showPlaylists && playlists.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h3>내 유튜브 재생목록</h3>
          <ul>
            {playlists.map((playlist) => (
              <li key={playlist.id}>{playlist.snippet.title}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
