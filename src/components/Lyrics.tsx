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

const NoLyricsMessage = styled.div`
  background-color: #2a2a2a;
  padding: 1.5rem;
  border-radius: 10px;
  text-align: center;
`;

const SearchOptions = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
`;

const SearchCard = styled.a`
  display: block;
  background-color: #333;
  padding: 1rem;
  border-radius: 8px;
  text-decoration: none;
  color: white;
  transition: background-color 0.2s;

  &:hover {
    background-color: #444;
    color: white;
  }
`;

const SearchCardTitle = styled.h4`
  margin: 0 0 0.5rem 0;
  color: #1db954;
`;

const SearchCardDescription = styled.p`
  margin: 0;
  font-size: 0.9rem;
  color: #ccc;
`;

const SongInfo = styled.div`
  font-size: 0.9rem;
  color: #888;
  margin-bottom: 1rem;
`;

const BackupInfo = styled.div`
  background-color: #1a1a1a;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  border-left: 4px solid #1db954;
`;

const TipsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 1rem 0;
`;

const Tip = styled.li`
  padding: 0.5rem 0;
  border-bottom: 1px solid #333;

  &:last-child {
    border-bottom: none;
  }
`;

interface LyricsProps {
  title: string;
  artist?: string;
  youtubeTitle?: string;
  videoId?: string;
  channelTitle?: string;
}

export default function LyricsWithLinks({
  title,
  artist,
  youtubeTitle,
  videoId,
  channelTitle,
}: LyricsProps) {
  const [finalArtist, setFinalArtist] = useState<string>("");
  const [finalTitle, setFinalTitle] = useState<string>("");

  // 유튜브 제목 파싱
  const parseYouTubeTitle = (ytTitle: string) => {
    let cleanedTitle = ytTitle
      .replace(/\(.*?가사.*?\)/gi, "")
      .replace(/\[.*?가사.*?\]/gi, "")
      .replace(/\(.*?official.*?\)/gi, "")
      .replace(/\[.*?official.*?\]/gi, "")
      .replace(/\(.*?mv.*?\)/gi, "")
      .replace(/\[.*?mv.*?\]/gi, "")
      .replace(/\(.*?music\s*video.*?\)/gi, "")
      .replace(/\[.*?music\s*video.*?\]/gi, "")
      .replace(/\(.*?live.*?\)/gi, "")
      .replace(/\[.*?live.*?\]/gi, "")
      .trim();

    const patterns = [
      /^(.+?)\s*-\s*(.+)$/,
      /^(.+?)\s*:\s*(.+)$/,
      /^(.+?)\s*by\s*(.+)$/i,
      /^(.+?)\s*\|\s*(.+)$/,
      /^(.+?)\s*×\s*(.+)$/,
      /^(.+?)\s*ft\.?\s*(.+)$/i,
      /^(.+?)\s*feat\.?\s*(.+)$/i,
    ];

    for (const pattern of patterns) {
      const match = cleanedTitle.match(pattern);
      if (match) {
        if (pattern.source.includes("by")) {
          return { artist: match[2].trim(), title: match[1].trim() };
        }
        return { artist: match[1].trim(), title: match[2].trim() };
      }
    }

    return { artist: "", title: cleanedTitle };
  };

  // 한국어 노래 제목 정리
  const cleanKoreanTitle = (title: string): string => {
    return title
      .replace(/\(.*?가사.*?\)/gi, "")
      .replace(/\[.*?가사.*?\]/gi, "")
      .replace(/\(.*?official.*?\)/gi, "")
      .replace(/\[.*?official.*?\]/gi, "")
      .replace(/\(.*?mv.*?\)/gi, "")
      .replace(/\[.*?mv.*?\]/gi, "")
      .replace(/\(.*?video.*?\)/gi, "")
      .replace(/\[.*?video.*?\]/gi, "")
      .replace(/\(.*?live.*?\)/gi, "")
      .replace(/\[.*?live.*?\]/gi, "")
      .replace(/\(.*?remix.*?\)/gi, "")
      .replace(/\[.*?remix.*?\]/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  useEffect(() => {
    let searchArtist = artist || "";
    let searchTitle = title || "";

    // 아티스트와 제목 파싱 로직
    if (artist && title) {
      searchArtist = artist;
      searchTitle = title;
    } else {
      if (youtubeTitle) {
        const parsed = parseYouTubeTitle(youtubeTitle);
        if (parsed.artist && parsed.title) {
          searchArtist = parsed.artist;
          searchTitle = cleanKoreanTitle(parsed.title);
        } else {
          searchTitle = cleanKoreanTitle(parsed.title);
        }
      }

      // 채널명에서 아티스트 추출
      if (!searchArtist && channelTitle) {
        const labelKeywords = [
          "entertainment",
          "ent",
          "records",
          "music",
          "official",
          "엔터테인먼트",
          "뮤직",
          "레코드",
          "오피셜",
          "컴퍼니",
        ];

        const hasLabelKeyword = labelKeywords.some((keyword) =>
          channelTitle.toLowerCase().includes(keyword.toLowerCase())
        );

        if (!hasLabelKeyword && channelTitle.trim()) {
          searchArtist = channelTitle.trim();
        }
      }
    }

    setFinalArtist(searchArtist);
    setFinalTitle(searchTitle);
  }, [title, artist, youtubeTitle, videoId, channelTitle]);

  // 검색 쿼리 생성
  const createSearchQuery = (includeLyrics = true) => {
    const query = finalArtist ? `${finalArtist} ${finalTitle}` : finalTitle;
    return includeLyrics ? `${query} 가사` : query;
  };

  // 검색 링크들
  const searchLinks = [
    {
      title: "네이버 뮤직",
      description: "가장 정확한 한국어 가사 제공",
      url: `https://music.naver.com/search/search.nhn?query=${encodeURIComponent(
        createSearchQuery()
      )}`,
    },
    {
      title: "멜론",
      description: "국내 최대 음원 플랫폼",
      url: `https://www.melon.com/search/total/index.htm?q=${encodeURIComponent(
        createSearchQuery()
      )}`,
    },
    {
      title: "지니 뮤직",
      description: "KT의 음원 서비스",
      url: `https://www.genie.co.kr/search/searchMain?query=${encodeURIComponent(
        createSearchQuery()
      )}`,
    },
    {
      title: "벅스 뮤직",
      description: "다양한 음원과 가사 제공",
      url: `https://music.bugs.co.kr/search/track?q=${encodeURIComponent(
        createSearchQuery()
      )}`,
    },
    {
      title: "Google 검색",
      description: "포괄적인 가사 검색",
      url: `https://www.google.com/search?q=${encodeURIComponent(
        createSearchQuery()
      )}`,
    },
    {
      title: "네이버 검색",
      description: "한국어 검색에 최적화",
      url: `https://search.naver.com/search.naver?query=${encodeURIComponent(
        createSearchQuery()
      )}`,
    },
  ];

  return (
    <Container>
      <Title>가사</Title>

      {(finalArtist || finalTitle) && (
        <SongInfo>
          {finalArtist && `아티스트: ${finalArtist}`}
          {finalArtist && finalTitle && " • "}
          {finalTitle && `제목: ${finalTitle}`}
        </SongInfo>
      )}

      <BackupInfo>
        <h3>💡 가사를 찾으려면?</h3>
        <p>
          한국어 가사는 아래 링크들을 통해 직접 검색하는 것이 가장 확실합니다.
        </p>
      </BackupInfo>

      <NoLyricsMessage>
        <h3>한국어 가사 자동 검색 제한</h3>
        <p>
          한국 음원 사이트들은 가사에 대한 저작권 보호로 인해
          <br />
          자동 API를 통한 가사 추출이 제한되어 있습니다.
        </p>

        <TipsList>
          <Tip>
            🎵 <strong>네이버 뮤직</strong>이 한국어 가사 검색에 가장 정확합니다
          </Tip>
          <Tip>🔍 곡 제목을 정확히 입력하면 검색 성공률이 높아집니다</Tip>
          <Tip>📱 모바일 앱에서는 더 쉽게 가사를 볼 수 있습니다</Tip>
        </TipsList>
      </NoLyricsMessage>

      <SearchOptions>
        {searchLinks.map((link, index) => (
          <SearchCard
            key={index}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <SearchCardTitle>{link.title}</SearchCardTitle>
            <SearchCardDescription>{link.description}</SearchCardDescription>
          </SearchCard>
        ))}
      </SearchOptions>
    </Container>
  );
}
