// src/hooks/useAISearch.tsx
import { useState, useCallback } from "react";
import { callGeminiAPI, GeminiResult, Track } from "../services/geminiApi";
import { ytSearch, ytVideosDetails } from "../components/StationEngine";
import { playFromKategorieSearch } from "../components/MusicFunction";
import { or } from "firebase/firestore";

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
      
      // AI 검색 결과를 세션 스토리지에 저장
      if (tracksWithYouTube.length > 0) {
        const searchResults = (tracksWithYouTube as TrackWithYouTube[])
  .filter(track => track.youtube !== undefined)
  .map(track => ({
    id: track.youtube!.id,
    videoId: track.youtube!.id,
    title: track.youtube!.title,
    thumbnails: {
      medium: { url: track.youtube!.thumbnail },
      default: { url: track.youtube!.thumbnail }
    }
  }));
        
        sessionStorage.setItem(`kategorieSearch:${query}`, JSON.stringify(searchResults));
        console.log(`🔍 AI 검색 결과 저장: "${query}" - ${searchResults.length}개 비디오`);
      }
    } catch (err: any) {
      setError(err.message || "LOOP AI 검색 중 오류가 발생하였습니다.");
    } finally {
      setLoading(false);
    }
  };
  // 3. 재생 함수 추가
  const playTrack = useCallback((track: TrackWithYouTube) => {
    if (track.youtube) {
      const playlistData = {
        id: `ai:${originalQuery}:${Date.now()}`,
        title: `AI 추천: ${originalQuery}`,
        thumbnail: track.youtube.thumbnail,
        tracks: tracks.filter(t => t.youtube).map(t => ({
          videoId: t.youtube!.id,
          title: t.youtube!.title,
          thumbnail: t.youtube!.thumbnail,
        })),
        startIndex: tracks.findIndex(t => t.youtube?.id === track.youtube?.id),
      };
      import("../components/MusicFunction").then(({ playPlaylistFromFile }) => {
        playPlaylistFromFile(playlistData);
      });
    }
  }, [tracks, originalQuery]);

  return { recommendations, tracks, loading, error, searchWithAI, playTrack };
}




