import { Navigate } from "react-router-dom";
import { auth } from "../firebaseConfig";

type Props = {
  children: React.ReactNode;
};

// User가 로그인하지 않은 경우, 특정페이지 접근 막음
export default ({ children }: Props) => {
  // 1. User가 로그인을 했는지 안했는지 확인
  const user = auth.currentUser;

  // 1-A. O - User가 로그인을 한 경우
  if (user) {
    //  ㄴ 접근하려는 페이지 그대로 보여줌
    return <>{children}</>;
  }
  // 1-B. X - User가 로그인을 하지 않은 경우
  else {
    //  ㄴ 로그인 페이지로 돌려보냄
    return <Navigate to={"/signin"} />;
  }
};
