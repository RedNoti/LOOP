// src/hooks/useAISearch.tsx
import { useState, useCallback } from "react";
import { callGeminiAPI, GeminiResult, Track } from "../services/geminiApi";
import { ytSearch, ytVideosDetails } from "../components/StationEngine";

// YouTube 데이터가 포함된 트랙 타입
export interface TrackWithYouTube extends Track {
  youtube?: {
    id: string;
    title: string;
    thumbnail: string;
    duration: string;
    channelTitle: string;
  };
}

// LOOP 프로젝트용 AI 검색 상태를 관리하는 커스텀 훅 (프록시 패턴)
export function useAISearch() {
  const [recommendations, setRecommendations] = useState<string>('');
  const [tracks, setTracks] = useState<TrackWithYouTube[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originalQuery, setOriginalQuery] = useState<string>('');

  const searchWithAI = async (query: string) => {
    try {
      setLoading(true);
      setError(null);
      setOriginalQuery(query);
  
      const result: GeminiResult = await callGeminiAPI(query);
      setRecommendations(result.recommendations ?? '');
      
      const tracksWithYouTube = await Promise.all(
        (result.tracks ?? []).map(async (track) => {
          try {
            const searchQuery = `${track.title} ${track.artist}`;
            
            const searchResults = await ytSearch({ q: searchQuery, type: "video"});
            
            if (searchResults.length > 0) {
              const videoDetails = await ytVideosDetails([searchResults[0].id.videoId || ""]);
              
              return {
                ...track,
                youtube: {
                  id: searchResults[0].id.videoId,
                  title: searchResults[0].snippet.title,
                  thumbnail: searchResults[0].snippet.thumbnails?.medium?.url || searchResults[0].snippet.thumbnails?.default?.url,
                  duration: videoDetails[0].contentDetails?.duration || "정보 없음",
                  channelTitle: videoDetails[0].snippet.channelTitle || "정보 없음"
                }
              };
            }
            return track;
          } catch (error) {
            console.error(`YouTube 검색 실패 (${track.title}):`, error);
            return track;
          }
        })
      );
      
      setTracks(tracksWithYouTube as TrackWithYouTube[]);
      
      // ✅ 세션 스토리지 저장 로직 제거 (더 이상 필요 없음)
      
    } catch (err: any) {
      setError(err.message || "LOOP AI 검색 중 오류가 발생하였습니다.");
    } finally {
      setLoading(false);  // ✅ 올바른 위치
    }
  };
  // 3. 재생 함수 추가
  const playTrack = useCallback((track: TrackWithYouTube) => {
    if (track.youtube) {
      // ✅ 1. 재생목록 이름 입력 창 생성
      const playlistName = prompt("새 재생목록 이름을 입력하세요:");
      
      if (playlistName) {  // ✅ 2. 이름 지정
        const playlistData = {
          id: `ai:${playlistName}:${Date.now()}`,
          title: playlistName,  // ✅ 3. 지정한 이름으로 재생목록 생성
          thumbnail: track.youtube.thumbnail,
          tracks: [{  // ✅ 4. 클릭한 노래 1개만 추가
            videoId: track.youtube.id,
            title: track.youtube.title,
            thumbnail: track.youtube.thumbnail,
          }],
          startIndex: 0,
        };
        
        import("../components/MusicFunction").then(({ playPlaylistFromFile }) => {
          playPlaylistFromFile(playlistData);
        });
      }
    }
  }, [originalQuery]); // ✅ tracks 의존성 제거

  return { recommendations, tracks, loading, error, searchWithAI, playTrack };
}




