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

/* ====== 컨트롤 ====== */
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
const RadioGroup = styled.div<{ $dark: boolean }>`
  display: inline-flex;
  gap: 8px;
  background: ${(p) => (p.$dark ? "#0f1112" : "#f8fafc")};
  border: 1px solid ${(p) => (p.$dark ? "#23262b" : "#e5e7eb")};
  padding: 6px;
  border-radius: 12px;
`;
const Radio = styled.button<{ $active: boolean }>`
  padding: 8px 12px;
  border-radius: 10px;
  border: 0;
  cursor: pointer;
  font-weight: 700;
  background: ${(p) => (p.$active ? "#3b82f6" : "transparent")};
  color: ${(p) => (p.$active ? "#fff" : "inherit")};
`;
const BtnRow = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 6px 18px 18px;
`;
const Btn = styled.button<{ $kind?: "primary" | "ghost" }>`
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 800;
  border: ${(p) =>
    p.$kind === "ghost" ? "1px solid rgba(148,163,184,.35)" : "0"};
  background: ${(p) =>
    p.$kind === "primary"
      ? "linear-gradient(135deg,#3b82f6,#6366f1)"
      : "transparent"};
  color: ${(p) => (p.$kind === "primary" ? "#fff" : "inherit")};
`;

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
  const user = auth.currentUser;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [p, setP] = useState<Privacy>(DEFAULT_PRIVACY);

  // 유저 없으면 로그인으로
  useEffect(() => {
    if (!user)
      navigate("/login", {
        replace: true,
        state: { notice: "로그인이 필요합니다." },
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // 불러오기
  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        const ref = doc(db, "profiles", user.uid);
        const snap = await getDoc(ref);
        const data = snap.data() as any;
        if (data?.privacy) {
          setP({ ...DEFAULT_PRIVACY, ...data.privacy });
        } else {
          if (!snap.exists()) {
            await setDoc(ref, { privacy: DEFAULT_PRIVACY }, { merge: true });
          }
        }
      } catch (e) {
        console.warn("Load privacy failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const dirty = useMemo(
    () => JSON.stringify(p) !== JSON.stringify(DEFAULT_PRIVACY),
    [p]
  );

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const ref = doc(db, "profiles", user.uid);
      await updateDoc(ref, { privacy: { ...p, updatedAt: serverTimestamp() } });
      alert("개인정보 설정이 저장되었습니다.");
    } catch (e) {
      console.error(e);
      try {
        const ref = doc(db, "profiles", user.uid);
        await setDoc(
          ref,
          { privacy: { ...p, updatedAt: serverTimestamp() } },
          { merge: true }
        );
        alert("개인정보 설정이 저장되었습니다.");
      } catch (e2) {
        alert("저장 중 오류가 발생했습니다.");
      }
    } finally {
      setSaving(false);
    }
  };

  const resetDefault = () => setP(DEFAULT_PRIVACY);

  if (loading) {
    return (
      <Page $dark={isDarkMode}>
        <Wrap>로딩 중…</Wrap>
      </Page>
    );
  }

  return (
    <Page $dark={isDarkMode}>
      <Wrap>
        <Card $dark={isDarkMode}>
          <CardHead $dark={isDarkMode}>개인정보 설정</CardHead>

          {/* 공개 범위 */}
          <Row $dark={isDarkMode}>
            <Label $dark={isDarkMode}>
              <strong>프로필 공개 범위</strong>
              <span>전체공개 / 팔로워만 / 비공개</span>
            </Label>
            <Right>
              <RadioGroup
                $dark={isDarkMode}
                role="radiogroup"
                aria-label="프로필 공개 범위"
              >
                {(
                  [
                    "public",
                    "followers",
                    "private",
                  ] as Privacy["profileVisibility"][]
                ).map((opt) => (
                  <Radio
                    key={opt}
                    type="button"
                    aria-pressed={p.profileVisibility === opt}
                    $active={p.profileVisibility === opt}
                    onClick={() =>
                      setP((prev) => ({ ...prev, profileVisibility: opt }))
                    }
                  >
                    {opt === "public"
                      ? "전체공개"
                      : opt === "followers"
                      ? "팔로워만"
                      : "비공개"}
                  </Radio>
                ))}
              </RadioGroup>
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

          {/* DM 허용 대상 */}
          <Row $dark={isDarkMode}>
            <Label $dark={isDarkMode}>
              <strong>DM 허용</strong>
              <span>누가 나에게 DM을 보낼 수 있는지</span>
            </Label>
            <Right>
              <RadioGroup
                $dark={isDarkMode}
                role="radiogroup"
                aria-label="DM 허용"
              >
                {(
                  ["everyone", "followers", "none"] as Privacy["allowDMFrom"][]
                ).map((opt) => (
                  <Radio
                    key={opt}
                    type="button"
                    $active={p.allowDMFrom === opt}
                    aria-pressed={p.allowDMFrom === opt}
                    onClick={() =>
                      setP((prev) => ({ ...prev, allowDMFrom: opt }))
                    }
                  >
                    {opt === "everyone"
                      ? "전체"
                      : opt === "followers"
                      ? "팔로워만"
                      : "차단"}
                  </Radio>
                ))}
              </RadioGroup>
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

          {/* 읽음 확인(읽음 표시) */}
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

          <BtnRow>
            <Btn $kind="ghost" onClick={resetDefault}>
              기본값
            </Btn>
            <Btn $kind="primary" onClick={save} disabled={saving}>
              {saving ? "저장 중…" : "저장"}
            </Btn>
          </BtnRow>
        </Card>
      </Wrap>
    </Page>
  );
};

export default PrivacySettings;
