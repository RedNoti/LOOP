import styled from "styled-components";
import { IPost } from "../types/post-type";
import { auth, firestore } from "../firebaseConfig";
import moment from "moment";
import Item from "./Post-ItemMenu";
import { deleteDoc, doc } from "firebase/firestore";

const Container = styled.div`
  width: 100%;
  max-width: 600px; /* 최대 너비 */
  margin-left: 0; /* 왼쪽 고정 */
  margin-right: 0; /* 오른쪽 고정 */
  border: 1px solid #353535;
  padding: 10px 15px;
  border-radius: 30px;
  height: auto; /* 높이를 내용에 맞게 자동으로 조정 */
`;
const Wrapper = styled.div`
  display: flex;
  gap: 5px;
  align-items: flex-start; /* 세로 정렬을 맞추기 위해 flex-start 사용 */
  height: 100%; /* Wrapper의 높이를 100%로 맞추기 */
`;
const ProfileArea = styled.div``;
const ProfileImg = styled.img`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background-color: white;
`;
const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
`;
const UserInfo = styled.div`
  display: flex;
  gap: 5px;
  align-items: flex-end;
`;
const UserEmail = styled.div`
  font-size: 10px;
  color: #52adf8;
`;
const UserName = styled.div`
  font-weight: 700;
  font-size: 13px;
`;
const PostText = styled.div`
  font-size: 15px;
`;
const CreateTime = styled.div`
  font-size: 10px;
  color: #575757;
`;
const Footer = styled.div`
  display: flex;
  gap: 8px;
  margin: 10px 0px;
`;
const Topbar = styled.div`
  display: flex;
  justify-content: space-between;
`;
const DeleteBtn = styled.button`
  cursor: pointer;
  font-size: 10px;
`;

const defaultProfileImg =
  "https://static-00.iconduck.com/assets.00/profile-circle-icon-2048x2048-cqe5466q.png";

export default ({ id, userId, createdAt, nickname, post, photoUrl }: IPost) => {
  const user = auth.currentUser;
  
  const onDelete = async () => {
    const isOK = window.confirm("삭제하시겠습니까?");

    try {
      if (isOK) {
        if (user?.uid !== userId) {
          return;
        }
        const removeDoc = await doc(firestore, "posts", id);
        await deleteDoc(removeDoc);
      }
    } catch (e) {
      console.error("post delete error : ", e);
    }
  };

  return (
    <Container>
      <Wrapper>
        <ProfileArea>
          <ProfileImg src={photoUrl || defaultProfileImg} />
        </ProfileArea>
        <Content>
          <Topbar>
            <UserInfo>
              <UserName>{nickname}</UserName>
              {auth.currentUser && (
                <UserEmail>{auth.currentUser.email}</UserEmail>
              )}
            </UserInfo>
            {user?.uid === userId && (
              <DeleteBtn onClick={onDelete}>delete</DeleteBtn>
            )}
          </Topbar>
          <PostText>{post}</PostText>
          <CreateTime>{moment(createdAt).fromNow()}</CreateTime>
        </Content>
      </Wrapper>
      <Footer>
        <Item type="like" num={83} />
        <Item type="view" num={2383} />
        <Item type="comment" num={12} />
      </Footer>
    </Container>
  );
};
