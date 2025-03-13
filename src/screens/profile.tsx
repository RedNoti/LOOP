import { useEffect, useState } from "react";
import axios, { AxiosResponse } from "axios";

// 유튜브 API 키와 채널 ID 설정
const API_KEY = "AIzaSyDsVdzYP_NOpXFTIWYmyB4UeHo5bCAhN_0"; // 유튜브 API 키
const CHANNEL_IDS = [
  "UCrn0Jr9RPpEHvkY5_aZfFVg",
  "UC7LQwon3pzAIpqcwJUhxNjQ",
  "UCTHBi2wjFPI7YKn2ocXq9qA",
]; // 여러 유튜브 채널의 ID (예시)
const BASE_URL = "https://www.googleapis.com/youtube/v3";

// 유튜브 API 응답 타입 정의
interface ChannelResponse {
  items: Array<{
    snippet: {
      title: string;
      thumbnails: {
        medium: { url: string };
      };
    };
    contentDetails: {
      relatedPlaylists: {
        uploads: string;
      };
    };
  }> | null; // items가 없을 수 있으므로 null을 허용
}

interface VideoResponse {
  items: Array<{
    snippet: {
      title: string;
      resourceId: {
        videoId: string;
      };
      publishedAt: string;
      thumbnails: {
        default: { url: string };
        medium: { url: string };
        high: { url: string };
      };
    };
  }> | null; // items가 없을 수 있으므로 null을 허용
  nextPageToken?: string; // nextPageToken을 VideoResponse에 추가
}

// 채널 데이터 타입 정의
interface ChannelData {
  channelId: string;
  channelName: string;
  profileImage: string;
  videos: Array<{
    title: string;
    videoId: string;
    publishedAt: string;
    thumbnailUrl: string;
  }>;
}

// 유튜브 API를 통해 채널의 업로드 리스트를 가져오는 함수
const getUploadPlaylistId = async (
  channelId: string
): Promise<{
  playlistId: string;
  channelName: string;
  profileImage: string;
}> => {
  try {
    const response: AxiosResponse<ChannelResponse> = await axios.get(
      `${BASE_URL}/channels`,
      {
        params: {
          part: "snippet,contentDetails",
          id: channelId, // 채널 ID로 요청
          key: API_KEY,
        },
      }
    );

    // response.data.items가 없으면 오류를 던짐
    if (!response.data.items || response.data.items.length === 0) {
      throw new Error("채널을 찾을 수 없습니다.");
    }

    const playlistId =
      response.data.items[0].contentDetails.relatedPlaylists.uploads;
    const channelName = response.data.items[0].snippet.title;
    const profileImage = response.data.items[0].snippet.thumbnails.medium.url;

    return { playlistId, channelName, profileImage };
  } catch (error) {
    throw new Error(`업로드 리스트 ID를 가져오는 중 오류 발생: ${error}`);
  }
};

// 플레이리스트 ID를 통해 해당 채널의 모든 동영상을 가져오는 함수
const getVideosFromPlaylist = async (playlistId: string) => {
  try {
    const videos: Array<{
      title: string;
      videoId: string;
      publishedAt: string;
      thumbnailUrl: string;
    }> = [];
    let nextPageToken: string | undefined = "";

    do {
      const response: AxiosResponse<VideoResponse> = await axios.get(
        `${BASE_URL}/playlistItems`,
        {
          params: {
            part: "snippet",
            playlistId,
            maxResults: 50, // 한 번에 가져올 수 있는 최대 수
            pageToken: nextPageToken,
            key: API_KEY,
          },
        }
      );

      // 비디오 데이터 추출
      if (response.data.items) {
        response.data.items.forEach((video) => {
          const { title, resourceId, publishedAt, thumbnails } = video.snippet;
          videos.push({
            title,
            videoId: resourceId.videoId, // videoId는 resourceId 안에 있음
            publishedAt,
            thumbnailUrl: thumbnails.high.url, // high 사이즈 썸네일을 사용
          });
        });
      }

      // 다음 페이지 토큰 설정
      nextPageToken = response.data.nextPageToken;
    } while (nextPageToken); // nextPageToken이 있는 한 계속해서 페이지네이션 수행

    return videos;
  } catch (error) {
    throw new Error(`동영상 리스트를 가져오는 중 오류 발생: ${error}`);
  }
};

// Profile 컴포넌트
const Profile = () => {
  const [channelsData, setChannelsData] = useState<ChannelData[]>([]); // 유튜브 채널별 영상 리스트 상태
  const [loading, setLoading] = useState<boolean>(true); // 로딩 상태

  useEffect(() => {
    const fetchYoutubeVideos = async () => {
      try {
        const channelsVideosData: ChannelData[] = [];

        // 각 채널에 대해 비디오 가져오기
        for (let channelId of CHANNEL_IDS) {
          const { playlistId, channelName, profileImage } =
            await getUploadPlaylistId(channelId);
          const fetchedVideos = await getVideosFromPlaylist(playlistId);

          // 가장 최근의 3개 영상만 가져오기
          channelsVideosData.push({
            channelId,
            channelName,
            profileImage,
            videos: fetchedVideos.slice(0, 3),
          });
        }

        setChannelsData(channelsVideosData); // 가져온 영상 데이터를 상태에 저장
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false); // 데이터 로드가 끝나면 로딩 상태 해제
      }
    };

    fetchYoutubeVideos();
  }, []);

  return (
    <div>
      {/* 상단 이미지 추가 */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <img
          src="/sonactop.png" // public 폴더에 sonactop.png가 있어야 합니다.
          alt="Profile Image"
          style={{ width: "100%", maxWidth: "600px", height: "auto" }}
        />
      </div>

      <div>
        {loading ? (
          <p>로딩 중...</p> // 로딩 중일 때 메시지
        ) : channelsData.length > 0 ? (
          channelsData.map((channel, index) => (
            <div
              key={index}
              style={{
                marginBottom: "40px",
                display: "flex",
                alignItems: "center",
              }}
            >
              {/* 채널 프로필 이미지와 이름 */}
              <div
                style={{
                  marginRight: "20px",
                  textAlign: "center",
                  flexShrink: 0,
                }}
              >
                <img
                  src={channel.profileImage}
                  alt={channel.channelName}
                  style={{
                    borderRadius: "50%",
                    width: "100px",
                    height: "100px",
                    objectFit: "cover",
                  }}
                />
                <h2
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginTop: "10px",
                    width: "150px", // 이름이 너무 길어지지 않도록 최대 폭을 제한
                    textAlign: "center",
                  }}
                >
                  {channel.channelName}
                </h2>
              </div>

              {/* 영상 목록 */}
              <div
                style={{
                  display: "flex",
                  gap: "20px",
                  justifyContent: "center",
                  flexGrow: 1, // 영상 영역이 나머지 공간을 차지하도록 함
                }}
              >
                {channel.videos.map((video: any, index: number) => (
                  <div
                    key={index}
                    style={{
                      flex: 1,
                      position: "relative",
                      overflow: "hidden",
                      borderRadius: "8px",
                    }}
                  >
                    <a
                      href={`https://www.youtube.com/watch?v=${video.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "block" }}
                    >
                      {/* 썸네일 비율 맞추기 */}
                      <div
                        style={{
                          position: "relative",
                          paddingBottom: "56.25%", // 16:9 비율
                        }}
                      >
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            objectFit: "cover", // 썸네일 이미지 비율 유지
                          }}
                        />
                      </div>
                    </a>
                    {/* 제목 영역 */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: "10px", // 썸네일 하단에 제목 표시
                        left: "10px",
                        right: "10px",
                        backgroundColor: "rgba(0, 0, 0, 0.6)",
                        color: "white",
                        padding: "10px",
                        borderRadius: "8px",
                        fontWeight: "bold",
                        fontSize: "16px",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        width: "calc(100% - 20px)", // padding을 고려하여 너비 계산
                      }}
                    >
                      {video.title}
                    </div>
                    <p
                      style={{
                        textAlign: "center",
                        fontSize: "12px",
                        marginTop: "5px",
                      }}
                    >
                      {new Date(video.publishedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p>영상이 없습니다.</p> // 영상이 없을 때 메시지
        )}
      </div>
    </div>
  );
};

export default Profile;

//AIzaSyDsVdzYP_NOpXFTIWYmyB4UeHo5bCAhN_0
