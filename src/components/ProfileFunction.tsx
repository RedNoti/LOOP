// src/components/ProfileFunction.tsx
import { useState, useRef, useEffect } from "react";
import { auth, onAuthStateChanged } from "../firebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";
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

  const saveProfileToFirestore = async () => {
    const user = auth.currentUser;
    if (user) {
      await setDoc(doc(db, "profiles", user.uid), profile);
    }
  };

  const togglePreview = () => setShowPreview((prev) => !prev);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("프로필 업데이트:", profile);
    await saveProfileToFirestore();
    setIsSubmitted(true);
  };

  const handleBackToEdit = () => setIsSubmitted(false);

  const handleUploadButtonClick = () => fileInputRef.current?.click();

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

      // 서버에 파일 업로드
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("https://sonaccloud.kro.kr/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        const relativePath = data.path; // 예: "image/12.png"

        const imageUrl = `https://sonacstudio.kro.kr/${relativePath}`;
        setProfile((prev) => ({ ...prev, photoUrl: imageUrl }));
      } catch (err) {
        console.error("이미지 업로드 실패", err);
        alert("이미지 업로드에 실패했습니다.");
      }
    }
  };

  const loadProfileFromFirestore = async () => {
    const user = auth.currentUser;
    if (user) {
      const docSnap = await getDoc(doc(db, "profiles", user.uid));
      if (docSnap.exists()) {
        setProfile(docSnap.data() as ProfileData);
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
  };
};
