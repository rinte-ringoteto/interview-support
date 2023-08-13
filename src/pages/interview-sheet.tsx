// Home.tsx
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../firebase/client";
import Topbar from "../components/Topbar";
import SidebarForInterviewSheet from "@/components/SidebarForInterviewSheet";
import MainForInterviewSheet from "../components/MainForInterviewSheet";

export default function InterviewSheet() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <Topbar />
      <div className="flex flex-col md:flex-row flex-grow mt-[72px] max-w-full">
        <div className="w-full md:w-1/5 min-w-min md:static md:h-screen">
          <SidebarForInterviewSheet />
        </div>
        <div className="w-full md:w-4/5 min-w-0 overflow-x-hidden ml-auto">
          <MainForInterviewSheet />
        </div>
      </div>
    </div>
  );
}
