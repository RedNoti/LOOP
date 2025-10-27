// src/screens/user-profile.tsx
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebaseConfig";
import { useTheme } from "../components/ThemeContext";
import { useRelations } from "../components/RelationsContext";
import {
  notifyFollow,
  notifyFollowFirestore,
} from "../components/NotificationUtil";


const Container = styled.div<{ $isDark: boolean }>`
  background: ${(p) => (p.$isDark ? "#000000" : "#ffffff")};
  color: ${(p) => (p.$isDark ? "#ffffff" : "#1a1a1a")};
  display: flex;
  justify-content: center;
  padding: 24px;
  min-height: calc(100vh - 70px);
`;

const Card = styled.div<{ $isDark: boolean }>`
  width: 100%;
  max-width: 800px;
  background: ${(p) => (p.$isDark ? "#202020" : "#ffffff")};
  border: 1px solid ${(p) => (p.$isDark ? "#404040" : "#f0f0f0")};
  border-radius: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  padding: 28px;
`;

const Header = styled.div`
  display: flex;
  gap: 20px;
  align-items: center;
  margin-bottom: 20px;
`;

const Avatar = styled.img`
  width: 96px;
  height: 96px;
  border-radius: 20px;
  object-fit: cover;
  border: 4px solid rgba(0, 0, 0, 0.06);
  background: #e9ecef;
`;

const Name = styled.h1<{ $isDark: boolean }>`
  margin: 0;
  font-size: 24px;
  color: ${(p) => (p.$isDark ? "#ffffff" : "#1a1a1a")};
`;

const Meta = styled.div<{ $isDark: boolean }>`
  color: ${(p) => (p.$isDark ? "#cccccc" : "#6c757d")};
  font-size: 14px;
  margin-top: 6px;
`;

const Section = styled.div`
  margin-top: 20px;
`;

const Label = styled.div<{ $isDark: boolean }>`
  font-size: 12px;
  font-weight: 700;
  color: ${(p) => (p.$isDark ? "#cccccc" : "#8e8e93")};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
`;

const Value = styled.div<{ $isDark: boolean }>`
  font-size: 15px;
  color: ${(p) => (p.$isDark ? "#ffffff" : "#1a1a1a")};
  line-height: 1.5;
`;

const Empty = styled.span<{ $isDark: boolean }>`
  color: ${(p) => (p.$isDark ? "#888888" : "#c7c7cc")};
  font-style: italic;
`;

const BackBtn = styled.button<{ $isDark: boolean }>`
  margin-top: 24px;
  padding: 10px 14px;
  font-size: 14px;
  border-radius: 12px;
  border: 1px solid ${(p) => (p.$isDark ? "#555" : "#e9ecef")};
  background: ${(p) => (p.$isDark ? "#2a2a2a" : "#fafafa")};
  color: ${(p) => (p.$isDark ? "#fff" : "#1a1a1a")};
  cursor: pointer;
`;

const ActionRow = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 12px;
`;

const ActionBtn = styled.button<{ $isDark: boolean; $primary?: boolean }>`
  padding: 10px 14px;
  font-size: 14px;
  border-radius: 12px;
  border: 1px solid ${(p) => (p.$isDark ? "#555" : "#e9ecef")};
  background: ${(p) =>
    p.$primary
      ? "linear-gradient(135deg, #007aff, #0051d0)"
      : p.$isDark
      ? "#2a2a2a"
      : "#fafafa"};
  color: ${(p) => (p.$primary ? "#fff" : p.$isDark ? "#fff" : "#1a1a1a")};
  cursor: pointer;
`;

type ProfileDoc = {
  name?: string;
  email?: string;
  photoUrl?: string;
  bio?: string;
  location?: string;
};

export default function UserProfileScreen() {
  const { isDarkMode } = useTheme();
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const me = auth.currentUser?.uid || null;
  const { isFollowing, isMuted, follow, unfollow, mute, unmute } =
    useRelations();

  const [data, setData] = useState<ProfileDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        if (!uid) return;
        const snap = await getDoc(doc(db, "profiles", uid));
        setData(snap.exists() ? (snap.data() as ProfileDoc) : {});
      } catch (e) {
        console.error("프로필 로드 실패", e);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [uid]);

  const avatarSrc =
    (data?.photoUrl && !data.photoUrl.includes("undefined") && data.photoUrl) ||
    "/default_profile.png";

  // ✅ DM 화면으로 이동 (상대 uid/이름/아바타를 쿼리로 전달)
  const goDM = () => {
    if (!uid) return;
    const name = encodeURIComponent(data?.name || "사용자");
    const avatar = encodeURIComponent(data?.photoUrl || "");
    navigate(`/dm?uid=${uid}&name=${name}&avatar=${avatar}`);
  };

  return (
    <Container $isDark={isDarkMode}>
      <Card $isDark={isDarkMode}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            불러오는 중...
          </div>
        ) : (
          <>
            <Header>
              <Avatar
                src={avatarSrc}
                alt="avatar"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/default_profile.png";
                }}
              />
              <div>
                <Name $isDark={isDarkMode}>{data?.name || "이름 미설정"}</Name>
                <Meta $isDark={isDarkMode}>
                  {data?.email || "이메일 미설정"}
                  {data?.location ? ` · ${data.location}` : ""}
                </Meta>

                {/* 내 프로필이 아닌 경우에만 버튼 노출 */}
                {uid && me && uid !== me && (
                  <ActionRow>
                    {isFollowing(uid) ? (
                      <ActionBtn
                        $isDark={isDarkMode}
                        $primary
                        onClick={() => unfollow(uid)}
                      >
                        팔로잉 취소
                      </ActionBtn>
                    ) : (
                     <ActionBtn
  $isDark={isDarkMode}
  $primary
  onClick={async () => {
    if (!uid) return; // uid = 지금 보고 있는 상대 유저의 uid (팔로우 당한 쪽)

    // 1) Firestore 관계 업데이트 (내가 uid를 팔로우)
    try {
      await follow(uid);
    } catch (err) {
      console.error("follow(uid) 실패. 그래도 알림까지는 보내서 동작 확인해볼게요:", err);
      // 여기서 return 안 하는 이유:
      // follow()에 권한 문제가 있어도 notifyFollow 자체는 정상적으로 도는지 확인하고 싶기 때문입니다.
    }

    // 2) 현재 로그인한 내 계정 정보
    const meUser = auth.currentUser;
    const followerUid = meUser?.uid ?? "";
    if (!followerUid) {
      console.warn("[팔로우 알림 중단] 로그인된 사용자 UID가 없습니다.");
      return;
    }

    // 3) 내 이름/아바타(팔로우 한 사람의 표시용)를 준비
    let followerName: string | undefined = meUser?.displayName || "익명";
    let followerAvatar: string | undefined = meUser?.photoURL || undefined;

    try {
      const snap = await getDoc(doc(db, "profiles", followerUid));
      if (snap.exists()) {
        const pdata = snap.data() as any;
        followerName =
          pdata.name ||
          pdata.displayName ||
          pdata.username ||
          pdata.nickname ||
          pdata.email ||
          meUser?.displayName ||
          "익명";

        followerAvatar =
          pdata.photoUrl ||
          pdata.avatar ||
          pdata.photoURL ||
          meUser?.photoURL ||
          undefined;
      }
    } catch (err) {
      console.error("프로필 로드 실패(팔로우 알림용):", err);
      // 여기서도 fallback으로 meUser 기반 값 쓰면 됨
    }

    // 4) 실제 알림 생성
    notifyFollow({
      targetUid: uid,          // ← 팔로우 "당한" 사람 (상대방 uid)
      followerUid,             // ← 나 (팔로우 한 사람)
      followerName,
      followerAvatar,
    });
    notifyFollowFirestore({
  targetUid: uid,
  followerUid,
  followerName,
  followerAvatar,
});

    // 5) 디버그 출력: 이게 찍혀야 실제로 notifyFollow가 실행된 거예요.
    console.log("[notifyFollow 호출됨]", {
      targetUid: uid,
      followerUid,
      followerName,
      followerAvatar,
    });

    // 6) 이제 localStorage 확인해볼 수 있음:
    //    localStorage.getItem("notif_inbox_" + uid)
    //    위 값이 이제는 null이 아니어야 정상입니다.
  }}
>
  팔로우
</ActionBtn>

                    )}

                    {isMuted(uid) ? (
                      <ActionBtn
                        $isDark={isDarkMode}
                        onClick={() => unmute(uid)}
                      >
                        뮤트 해제
                      </ActionBtn>
                    ) : (
                      <ActionBtn $isDark={isDarkMode} onClick={() => mute(uid)}>
                        뮤트
                      </ActionBtn>
                    )}

                    {/* ✅ DM 버튼 */}
                    <ActionBtn $isDark={isDarkMode} onClick={goDM}>
                      DM
                    </ActionBtn>
                  </ActionRow>
                )}
              </div>
            </Header>

            <Section>
              <Label $isDark={isDarkMode}>소개</Label>
              <Value $isDark={isDarkMode}>
                {data?.bio ? (
                  data.bio
                ) : (
                  <Empty $isDark={isDarkMode}>소개 미입력</Empty>
                )}
              </Value>
            </Section>

            <BackBtn $isDark={isDarkMode} onClick={() => navigate(-1)}>
              ← 돌아가기
            </BackBtn>
          </>
        )}
      </Card>
    </Container>
  );
}
