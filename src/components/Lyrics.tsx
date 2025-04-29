import React, { useEffect, useState } from "react";
import styled from "styled-components";

const Container = styled.div`
  color: white;
  padding: 2rem;
  overflow-y: auto;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.85);
`;

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
`;

const LyricsBox = styled.pre`
  white-space: pre-wrap;
  font-size: 1rem;
  line-height: 1.6;
  color: #dcdcdc;
  background-color: #1a1a1a;
  padding: 1rem;
  border-radius: 10px;
  max-height: 80vh;
  overflow-y: auto;
`;

const Loading = styled.div`
  color: gray;
`;

export default function Lyrics({
  title,
  artist,
}: {
  title: string;
  artist: string;
}) {
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchLyrics = async () => {
      if (!title) {
        setLyrics("제목이 없습니다.");
        setLoading(false);
        return;
      }

      const accessToken = "YOUR_GENIUS_ACCESS_TOKEN"; // 여기에 토큰 입력
      const query = encodeURIComponent(title);

      try {
        const searchRes = await fetch(
          `https://api.genius.com/search?q=${query}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        const searchData = await searchRes.json();
        const songPath = searchData.response.hits[0]?.result?.path;

        if (!songPath) {
          setLyrics("가사를 찾을 수 없습니다.");
          setLoading(false);
          return;
        }

        const pageRes = await fetch(`https://genius.com${songPath}`);
        const html = await pageRes.text();

        const match = html.match(
          /<div[^>]+data-lyrics-container="true"[^>]*>(.*?)<\/div>/
        );
        if (match) {
          const rawLyrics = match
            .map((block) =>
              block
                .replace(/<br\s*\/?>/gi, "\n")
                .replace(/<[^>]+>/g, "")
                .trim()
            )
            .join("\n\n");
          setLyrics(rawLyrics);
        } else {
          setLyrics("가사를 찾을 수 없습니다.");
        }
      } catch (error) {
        console.error(error);
        setLyrics("가사 로딩 오류");
      } finally {
        setLoading(false);
      }
    };

    fetchLyrics();
  }, [title]);

  return (
    <Container>
      <Title>가사</Title>
      {loading ? (
        <Loading>로딩 중...</Loading>
      ) : (
        <LyricsBox>{lyrics}</LyricsBox>
      )}
    </Container>
  );
}
