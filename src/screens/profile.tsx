// 📄 Profile 화면 - 사용자 프로필을 수정하고 미리보기할 수 있는 다크모드 화면입니다.
import React from "react";
import { auth } from "../firebaseConfig";
import { useProfileFunctions } from "../components/ProfileFunction";
import styled from "styled-components";

const Container = styled.div`
  background-color: #121212;
  color: #e0e0e0;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
  overflow: hidden; /* 🔥 스크롤 제거 */
`;

const ContentArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const ScrollableContent = styled.div`
  flex: 1;
  padding: 0px 20px;
  box-sizing: border-box;
`;

const Card = styled.div`
  background-color: #1e1e1e;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  color: #fff;
`;

const Label = styled.label`
  font-size: 25px;
  color: #ffe9d2;
  margin-bottom: 4px;
  display: block;
  width: 100%;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  background-color: rgba(255, 255, 255, 0.05);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  margin-bottom: 16px;
  box-sizing: border-box;
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 12px;
  background-color: rgba(255, 255, 255, 0.05);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  margin-bottom: 16px;
  box-sizing: border-box;
  height: 56px;
  resize: none;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
`;

const Button = styled.button`
  padding: 10px 20px;
  font-size: 14px;
  border-radius: 4px;
  cursor: pointer;
`;

const SaveButton = styled(Button)`
  background-color: #2e2e2e;
  color: #fff;
  border: none;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #444;
  }
`;

const CancelButton = styled(Button)`
  background-color: #2e2e2e;
  color: #fff;
  border: none;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #444;
  }
`;

const PhotoContainer = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  margin: 0 auto 24px;
  position: relative;
`;

const Photo = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const Overlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  &:hover {
    opacity: 1;
  }
`;

const SuccessBox = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #e0e0e0;
`;

const SuccessIcon = styled.div`
  font-size: 64px;
  color: #4caf50;
  margin-bottom: 24px;
`;

const SuccessTitle = styled.h1`
  font-size: 24px;
  margin-bottom: 16px;
`;

const SuccessText = styled.p`
  font-size: 16px;
  color: #9e9e9e;
  max-width: 500px;
  margin: 0 auto 32px;
`;

const ProfileEditor = () => {
  const {
    profile,
    showPreview,
    isSubmitted,
    handleChange,
    handleSubmit,
    handleBackToEdit,
    fileInputRef,
    handleFileChange,
    handleUploadButtonClick,
    hoverPhoto,
    setHoverPhoto,
    hoverSave,
    setHoverSave,
    hoverCancel,
    setHoverCancel,
  } = useProfileFunctions();

  if (isSubmitted) {
    return (
      <Container>
        <ScrollableContent>
          <Card>
            <SuccessBox>
              <SuccessIcon>👌</SuccessIcon>
              <SuccessTitle>
                프로필이 성공적으로 업데이트되었습니다!
              </SuccessTitle>
              <SuccessText>변경한 정보가 저장되었습니다.</SuccessText>
              <CancelButton onClick={handleBackToEdit}>돌아가기</CancelButton>
            </SuccessBox>
          </Card>
        </ScrollableContent>
      </Container>
    );
  }

  return (
    <Container>
      {showPreview && (
        <ScrollableContent>
          <Card style={{ marginBottom: "0px" }}>
            <h2
              style={{ marginTop: 0, marginBottom: "16px", color: "#90caf9" }}
            >
              프로필 미리보기
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <img
                src={
                  profile.photoUrl === ""
                    ? auth.currentUser?.photoURL ||
                      "https://via.placeholder.com/150"
                    : profile.photoUrl
                }
                alt="미리보기 이미지"
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid #1a73e8",
                }}
              />
              <div>
                <div style={{ fontSize: "18px", fontWeight: 500 }}>
                  {profile.name || (
                    <span style={{ fontStyle: "italic", color: "#999" }}>
                      이름 미입력
                    </span>
                  )}
                </div>
                <div style={{ color: "#aaa" }}>
                  {profile.location || (
                    <span style={{ fontStyle: "italic", color: "#999" }}>
                      위치 미입력
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ marginTop: "24px" }}>
              <Label>이메일</Label>
              <div>
                {profile.email || (
                  <span style={{ fontStyle: "italic", color: "#999" }}>
                    이메일 미입력
                  </span>
                )}
              </div>
            </div>
            <div style={{ marginTop: "16px" }}>
              <Label>소개</Label>
              <div>
                {profile.bio || (
                  <span style={{ fontStyle: "italic", color: "#999" }}>
                    소개 미입력
                  </span>
                )}
              </div>
            </div>
          </Card>
        </ScrollableContent>
      )}

      <ContentArea>
        <ScrollableContent>
          <Card>
            <PhotoContainer
              onClick={handleUploadButtonClick}
              onMouseEnter={() => setHoverPhoto(true)}
              onMouseLeave={() => setHoverPhoto(false)}
            >
              <Photo
                src={
                  profile.photoUrl === ""
                    ? auth.currentUser?.photoURL ||
                      "https://via.placeholder.com/150"
                    : profile.photoUrl
                }
                alt="프로필 사진"
              />
              <Overlay style={{ opacity: hoverPhoto ? 1 : 0 }}>
                사진 변경
              </Overlay>
            </PhotoContainer>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: "none" }}
              accept="image/*"
            />

            <form onSubmit={handleSubmit}>
              <Label htmlFor="name">이름</Label>
              <Input
                type="text"
                id="name"
                name="name"
                value={profile.name}
                onChange={handleChange}
              />

              <Label htmlFor="email">이메일</Label>
              <Input
                type="email"
                id="email"
                name="email"
                value={profile.email}
                onChange={handleChange}
              />

              <Label htmlFor="bio">소개</Label>
              <Textarea
                id="bio"
                name="bio"
                value={profile.bio}
                onChange={handleChange}
              />

              <Label htmlFor="location">위치</Label>
              <Input
                type="text"
                id="location"
                name="location"
                value={profile.location}
                onChange={handleChange}
              />

              <ButtonRow data-mobile-actions>
                <CancelButton
                  type="button"
                  onMouseEnter={() => setHoverCancel(true)}
                  onMouseLeave={() => setHoverCancel(false)}
                  onClick={handleBackToEdit}
                >
                  취소
                </CancelButton>
                <SaveButton
                  type="submit"
                  onMouseEnter={() => setHoverSave(true)}
                  onMouseLeave={() => setHoverSave(false)}
                >
                  변경사항 저장
                </SaveButton>
              </ButtonRow>
            </form>
          </Card>
        </ScrollableContent>
      </ContentArea>
    </Container>
  );
};

export default ProfileEditor;
