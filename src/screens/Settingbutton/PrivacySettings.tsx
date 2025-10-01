// src/screens/Settingbutton/PrivacySettings.tsx
import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useTheme } from "../../components/ThemeContext";
import { auth, db } from "../../firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged, User } from "firebase/auth";

/* ====== UI 토큰 ====== */
const R = { lg: "16px", md: "12px" };
const shadow = {
  cardLight: "0 10px 30px rgba(15,23,42,.10)",
  cardDark: "0 16px 36px rgba(0,0,0,.55)",
  focus: "0 0 0 3px rgba(59,130,246,.20)",
};

/* ====== 레이아웃 ====== */
const Page = styled.div<{ $dark: boolean }>`
  min-height: 100vh;
  background: ${(p) => (p.$dark ? "#0b0c0e" : "#f6f7fb")};
  color: ${(p) => (p.$dark ? "#f8fafc" : "#0f172a")};
`;
const Wrap = styled.div`
  max-width: 920px;
  margin: 0 auto;
  padding: 24px 20px 80px;
  display: grid;
  gap: 16px;
`;
const Card = styled.section<{ $dark: boolean }>`
  background: ${(p) => (p.$dark ? "#121417" : "#ffffff")};
  border: 1px solid ${(p) => (p.$dark ? "#1f232a" : "#e5e7eb")};
  border-radius: ${R.lg};
  box-shadow: ${(p) => (p.$dark ? shadow.cardDark : shadow.cardLight)};
  overflow: hidden;
`;
const CardHead = styled.div<{ $dark: boolean }>`
  padding: 14px 18px;
  border-bottom: 1px solid ${(p) => (p.$dark ? "#1f232a" : "#eef2f7")};
  font-weight: 800;
`;
const Row = styled.div<{ $dark: boolean }>`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  padding: 14px 18px;
  border-top: 1px solid ${(p) => (p.$dark ? "#1f232a" : "#f1f5f9")};
  &:first-child {
    border-top: 0;
  }
`;
const Label = styled.div<{ $dark: boolean }>`
  display: grid;
  gap: 4px;
  strong {
    font-weight: 800;
  }
  span {
    font-size: 12px;
    color: ${(p) => (p.$dark ? "#9aa4b2" : "#64748b")};
  }
`;
const Right = styled.div`
  display: grid;
  align-content: center;
`;

/* ====== 스위치 ====== */
const Toggle = styled.button<{ $on: boolean }>`
  width: 52px;
  height: 30px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: ${(p) =>
    p.$on ? "linear-gradient(135deg,#22d3ee,#3b82f6)" : "#cbd5e1"};
  position: relative;
  cursor: pointer;
  transition: background 0.2s ease;
  &::after {
    content: "";
    position: absolute;
    top: 3px;
    left: ${(p) => (p.$on ? "26px" : "3px")};
    width: 24px;
    height: 24px;
    border-radius: 999px;
    background: #fff;
    transition: left 0.2s ease;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  }
`;

/* ====== 토글 그룹(세그먼티드) ====== */
const SegGroup = styled.div<{ $dark: boolean }>`
  --w: 96px;
  --g: 8px;
  display: inline-flex;
  align-items: center;
  gap: var(--g);
  padding: 6px;
  border-radius: 12px;
  position: relative;
  background: ${(p) => (p.$dark ? "#0f1112" : "#f8fafc")};
  border: 1px solid ${(p) => (p.$dark ? "#23262b" : "#e5e7eb")};
`;
const SegHighlight = styled.div`
  position: absolute;
  left: 6px;
  top: 6px;
  width: var(--w);
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.35),
    inset 0 0 0 1px rgba(255, 255, 255, 0.15);
  transform: translateX(calc(var(--i, 0) * (var(--w) + var(--g))));
  transition: transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
  pointer-events: none;
  z-index: 0;
`;
const SegRadio = styled.input.attrs({ type: "radio" })`
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  overflow: hidden;
  &:focus-visible + label {
    outline: 3px solid rgba(99, 102, 241, 0.35);
    outline-offset: 2px;
  }
`;
const SegBtn = styled.label<{ $dark: boolean }>`
  width: var(--w);
  height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  border: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 13px;
  cursor: pointer;
  position: relative;
  z-index: 1;
  background: transparent;
  color: ${(p) => (p.$dark ? "#e5e7eb" : "#0f172a")};
  transition: background 0.18s ease, color 0.18s ease, transform 0.08s ease;
  &:hover {
    background: ${(p) =>
      p.$dark ? "rgba(148,163,184,.10)" : "rgba(15,23,42,.05)"};
  }
  &:active {
    transform: scale(0.98);
  }
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/* 하단 액션 */
const BtnRow = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 6px 18px 18px;
`;
const GhostBtn = styled.button<{ $dark: boolean }>`
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 800;
  border: 1px solid ${(p) => (p.$dark ? "#2b3137" : "#e5e7eb")};
  background: transparent;
  color: inherit;
  &:hover {
    background: ${(p) => (p.$dark ? "#15181c" : "#f9fafb")};
  }
  &:focus-visible {
    outline: 3px solid rgba(59, 130, 246, 0.35);
    outline-offset: 2px;
  }
`;
const SaveBtn = styled(SegBtn).attrs({ as: "button" })``;

/* ====== 타입/기본값 ====== */
type Privacy = {
  profileVisibility: "public" | "followers" | "private";
  showOnline: boolean;
  allowDMFrom: "everyone" | "followers" | "none";
  allowMentions: boolean;
  readReceipts: boolean;
  updatedAt?: any;
};
const DEFAULT_PRIVACY: Privacy = {
  profileVisibility: "public",
  showOnline: true,
  allowDMFrom: "everyone",
  allowMentions: true,
  readReceipts: true,
};

const PrivacySettings: React.FC = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  // ★ UI는 즉시 렌더링
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [saving, setSaving] = useState(false);
  const [p, setP] = useState<Privacy>(DEFAULT_PRIVACY);

  // 인증 상태 구독
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // 개인정보 불러오기
  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        const ref = doc(db, "profiles", user.uid);
        const snap = await getDoc(ref);
        const data = snap.data() as any;
        if (data?.privacy) {
          setP({ ...DEFAULT_PRIVACY, ...data.privacy });
        } else if (!snap.exists()) {
          await setDoc(ref, { privacy: DEFAULT_PRIVACY }, { merge: true });
        }
      } catch (e) {
        console.warn("Load privacy failed:", e);
      }
    })();
  }, [user]);

  const dirty = useMemo(
    () => JSON.stringify(p) !== JSON.stringify(DEFAULT_PRIVACY),
    [p]
  );

  const save = async () => {
    if (!user) {
      navigate("/login", {
        replace: true,
        state: { notice: "로그인이 필요합니다." },
      });
      return;
    }
    setSaving(true);
    try {
      const ref = doc(db, "profiles", user.uid);
      await updateDoc(ref, { privacy: { ...p, updatedAt: serverTimestamp() } });
      // ✅ settings.tsx가 상단 토스트로 표시
      navigate("/settings", {
        replace: true,
        state: { notice: "저장되었습니다." },
      });
    } catch (e) {
      console.error(e);
      try {
        const ref = doc(db, "profiles", user.uid);
        await setDoc(
          ref,
          { privacy: { ...p, updatedAt: serverTimestamp() } },
          { merge: true }
        );
        navigate("/settings", {
          replace: true,
          state: { notice: "저장되었습니다." },
        });
      } catch {
        alert("저장 중 오류가 발생했습니다.");
      }
    } finally {
      setSaving(false);
    }
  };

  const resetDefault = () => setP(DEFAULT_PRIVACY);

  const visOptions: Privacy["profileVisibility"][] = [
    "public",
    "followers",
    "private",
  ];
  const visIndex = visOptions.indexOf(p.profileVisibility);
  const dmOptions: Privacy["allowDMFrom"][] = ["everyone", "followers", "none"];
  const dmIndex = dmOptions.indexOf(p.allowDMFrom);

  return (
    <Page $dark={isDarkMode}>
      <Wrap>
        <Card $dark={isDarkMode}>
          <CardHead $dark={isDarkMode}>개인정보 설정</CardHead>

          {/* 공개 범위 - Segmented */}
          <Row $dark={isDarkMode}>
            <Label $dark={isDarkMode}>
              <strong>프로필 공개 범위</strong>
              <span>전체공개 / 팔로워만 / 비공개</span>
            </Label>
            <Right>
              <SegGroup
                $dark={isDarkMode}
                role="radiogroup"
                aria-label="프로필 공개 범위"
                style={{ ["--i" as any]: visIndex }}
              >
                <SegHighlight />
                {visOptions.map((opt) => {
                  const id = `vis-${opt}`;
                  return (
                    <React.Fragment key={opt}>
                      <SegRadio
                        name="profile-vis"
                        id={id}
                        checked={p.profileVisibility === opt}
                        onChange={() =>
                          setP((prev) => ({ ...prev, profileVisibility: opt }))
                        }
                      />
                      <SegBtn $dark={isDarkMode} htmlFor={id}>
                        {opt === "public"
                          ? "전체공개"
                          : opt === "followers"
                          ? "팔로워만"
                          : "비공개"}
                      </SegBtn>
                    </React.Fragment>
                  );
                })}
              </SegGroup>
            </Right>
          </Row>

          {/* 온라인 표시 */}
          <Row $dark={isDarkMode}>
            <Label $dark={isDarkMode}>
              <strong>온라인 상태 표시</strong>
              <span>내가 접속 중인지 상대가 볼 수 있습니다</span>
            </Label>
            <Right>
              <Toggle
                aria-label="온라인 상태 표시"
                $on={p.showOnline}
                onClick={() =>
                  setP((prev) => ({ ...prev, showOnline: !prev.showOnline }))
                }
              />
            </Right>
          </Row>

          {/* DM 허용 - Segmented */}
          <Row $dark={isDarkMode}>
            <Label $dark={isDarkMode}>
              <strong>DM 허용</strong>
              <span>누가 나에게 DM을 보낼 수 있는지</span>
            </Label>
            <Right>
              <SegGroup
                $dark={isDarkMode}
                role="radiogroup"
                aria-label="DM 허용"
                style={{ ["--i" as any]: dmIndex }}
              >
                <SegHighlight />
                {["everyone", "followers", "none"].map((opt) => {
                  const id = `dm-${opt}`;
                  return (
                    <React.Fragment key={opt}>
                      <SegRadio
                        name="dm-allow"
                        id={id}
                        checked={p.allowDMFrom === opt}
                        onChange={() =>
                          setP((prev) => ({ ...prev, allowDMFrom: opt as any }))
                        }
                      />
                      <SegBtn $dark={isDarkMode} htmlFor={id}>
                        {opt === "everyone"
                          ? "전체"
                          : opt === "followers"
                          ? "팔로워만"
                          : "차단"}
                      </SegBtn>
                    </React.Fragment>
                  );
                })}
              </SegGroup>
            </Right>
          </Row>

          {/* 멘션 허용 */}
          <Row $dark={isDarkMode}>
            <Label $dark={isDarkMode}>
              <strong>멘션 허용</strong>
              <span>@아이디로 나를 언급할 수 있게 허용</span>
            </Label>
            <Right>
              <Toggle
                aria-label="멘션 허용"
                $on={p.allowMentions}
                onClick={() =>
                  setP((prev) => ({
                    ...prev,
                    allowMentions: !prev.allowMentions,
                  }))
                }
              />
            </Right>
          </Row>

          {/* 읽음 표시 */}
          <Row $dark={isDarkMode}>
            <Label $dark={isDarkMode}>
              <strong>읽음 표시</strong>
              <span>내가 읽으면 ‘읽음’으로 표시됩니다</span>
            </Label>
            <Right>
              <Toggle
                aria-label="읽음 표시"
                $on={p.readReceipts}
                onClick={() =>
                  setP((prev) => ({
                    ...prev,
                    readReceipts: !prev.readReceipts,
                  }))
                }
              />
            </Right>
          </Row>

          {/* 액션 */}
          <BtnRow>
            <GhostBtn $dark={isDarkMode} onClick={() => navigate(-1)}>
              취소
            </GhostBtn>
            <SaveBtn $dark={isDarkMode} onClick={save} disabled={saving}>
              {saving ? "저장 중…" : "저장"}
            </SaveBtn>
          </BtnRow>
        </Card>
      </Wrap>
    </Page>
  );
};

export default PrivacySettings;
