// 게시글 정보로부터 특정 아이콘 메뉴들을 표시
// - 댓글 수, 조회수 , 좋아요 수
import styled from "styled-components";

const ItemBox = styled.div`
  display: flex;
  align-items: center;
  font-size: 13px;
  gap: 1px;
  svg {
    width: 15px;
    height: 13px;
  }
`;
const ItemIcon = styled.span``;
const ItemText = styled.span``;

type ItemIcon = "like" | "view" | "comment";
type IItem = { type: ItemIcon; num: number };

const Item = ({ type, num }: IItem) => {
  // Logic
  // 1. type 에 따라 icon 그림을 보여준다.
  const icon = () => {
    switch (type) {
      case "comment":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
            />
          </svg>
        );
      case "like":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
            />
          </svg>
        );
      case "view":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
            />
          </svg>
        );
    }
  };
  // 2. (도전)fireabse에 저장된 각 메뉴 count를 num에 보여준다.
  // Design Rendering
  return (
    <ItemBox>
      <ItemIcon>{icon()}</ItemIcon>
      <ItemText>{num}</ItemText>
    </ItemBox>
  );
};

export default Item;
