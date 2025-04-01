import { useState, useRef, useEffect } from "react";
import { auth, onAuthStateChanged } from "../firebaseConfig";
import { updateProfile } from "firebase/auth"; // firebase/auth에서 직접 import
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";

// 프로필 데이터 인터페이스
export interface ProfileData {
  name: string;
  email: string;
  photoUrl: string;
  bio: string;
  location: string;
}

// 커스텀 훅을 생성하여 ProfileEditor에서 사용하도록 함
export const useProfileFunctions = () => {
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [previousProfile, setPreviousProfile] = useState<ProfileData | null>(
    null
  );
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);

  const handleDeletePhoto = () => {
    const isUploadedPhoto =
      profile.photoUrl &&
      profile.photoUrl.startsWith("http://uploadloop.kro.kr:4000/uploads/");

    if (isUploadedPhoto) {
      fetch("http://uploadloop.kro.kr:4000/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: profile.photoUrl }),
      }).catch((err) => {
        console.error("서버에서 이미지 삭제 실패:", err);
      });
    }

    setPendingPhotoFile(null);
    setProfile((prev) => ({ ...prev, photoUrl: "" }));
  };

  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    email: "",
    photoUrl: "https://via.placeholder.com/150",
    bio: "",
    location: "",
  });

  const [showPreview, setShowPreview] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [hoverPhoto, setHoverPhoto] = useState(false);
  const [hoverCancel, setHoverCancel] = useState(false);
  const [hoverSave, setHoverSave] = useState(false);
  const [hoverToggle, setHoverToggle] = useState(false);
  const [hoverBackToEdit, setHoverBackToEdit] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  // 변경된 saveProfileToFirestore 함수
  const saveProfileToFirestore = async () => {
    const user = auth.currentUser;
    if (user) {
      // 1. Firestore에 프로필 저장
      await setDoc(doc(db, "profiles", user.uid), profile);
      
      // 2. Auth 프로필 업데이트
      await updateProfile(user, {
        displayName: profile.name,
        photoURL: profile.photoUrl
      });
      
      // 3. 사용자의 모든 게시물의 프로필 정보 업데이트
      try {
        const postsRef = collection(db, "posts");
        const q = query(postsRef, where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        
        // 각 게시물마다 프로필 정보 업데이트
        const updatePromises = querySnapshot.docs.map(postDoc => {
          return updateDoc(doc(db, "posts", postDoc.id), {
            photoUrl: profile.photoUrl,
            nickname: profile.name
          });
        });
        
        // 모든 업데이트 완료 대기
        await Promise.all(updatePromises);
        console.log("모든 게시물의 프로필 정보가 업데이트되었습니다.");
      } catch (error) {
        console.error("게시물 프로필 정보 업데이트 중 오류:", error);
      }
    }
  };

  const togglePreview = () => setShowPreview((prev) => !prev);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("프로필 업데이트:", profile);

    if (pendingPhotoFile) {
      const formData = new FormData();
      formData.append("file", pendingPhotoFile);
      try {
        const res = await fetch("http://uploadloop.kro.kr:4000/upload", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error("업로드 실패");
        const data = await res.json();
        const imageUrl = `http://uploadloop.kro.kr:4000/${data.path}`;
        profile.photoUrl = imageUrl;
      } catch (err) {
        console.error("이미지 업로드 실패", err);
        alert("이미지 업로드에 실패했습니다.");
      }
    }

    await saveProfileToFirestore();
    setIsSubmitted(true);
    setPendingPhotoFile(null);
    setImageToDelete(null);
  };

  const handleBackToEdit = () => setIsSubmitted(false);

  const handleUploadButtonClick = () => {
    const isUploadedPhoto =
      profile.photoUrl &&
      profile.photoUrl.startsWith("http://uploadloop.kro.kr:4000/uploads/");

    if (isUploadedPhoto) {
      const confirmDelete = window.confirm(
        "현재 프로필 사진을 삭제하시겠습니까?"
      );
      if (confirmDelete) {
        handleDeletePhoto();
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("이미지 파일만 업로드할 수 있습니다.");
        return;
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        alert("파일 크기가 5MB를 초과할 수 없습니다.");
        return;
      }

      setPendingPhotoFile(file); // Store file locally

      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile((prev) => ({ ...prev, photoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file); // Preview image as base64
    }
  };

  const loadProfileFromFirestore = async () => {
    const user = auth.currentUser;
    if (user) {
      const docSnap = await getDoc(doc(db, "profiles", user.uid));
      if (docSnap.exists()) {
        const data = docSnap.data() as ProfileData;
        setPreviousProfile(data);
        if (!data.photoUrl || data.photoUrl.trim() === "") {
          data.photoUrl = user.photoURL || "/profile_normal.png";
        }
        setProfile(data);
      } else {
        // 새로운 사용자일 경우 구글 프로필 또는 기본 이미지 적용
        setProfile((prev) => ({
          ...prev,
          email: user.email || "",
          name: user.displayName || "",
          photoUrl: user.photoURL || "/profile_normal.png",
        }));
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: any) => {
      if (user) {
        loadProfileFromFirestore();
      }
    });

    return () => unsubscribe();
  }, []);

  return {
    profile,
    setProfile,
    showPreview,
    setShowPreview,
    isSubmitted,
    setIsSubmitted,
    hoverPhoto,
    setHoverPhoto,
    hoverCancel,
    setHoverCancel,
    hoverSave,
    setHoverSave,
    hoverToggle,
    setHoverToggle,
    hoverBackToEdit,
    setHoverBackToEdit,
    fileInputRef,
    handleChange,
    togglePreview,
    handleSubmit,
    handleBackToEdit,
    handleUploadButtonClick,
    handleFileChange,
    saveProfileToFirestore,
    handleDeletePhoto,
    pendingPhotoFile,
    setPendingPhotoFile,
    imageToDelete,
    setImageToDelete,
  };
};