import { useEffect, useState } from "react";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { auth } from "../firebase/client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRightFromBracket,
  faArrowRightToBracket,
} from "@fortawesome/free-solid-svg-icons";

export default function Topbar() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const router = useRouter();
  const isActive = (pathname: any) => router.pathname === pathname;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div className="p-4 bg-orange-500 text-white w-full fixed top-0 flex justify-between items-center z-50">
      <Link
        href="/"
        className="font-bold text-lg inline-flex items-center justify-start"
      >
        <Image
          src="/favicon.ico"
          alt="Logo"
          width={48}
          height={48}
          className="pr-2"
        />
        <span className="md:inline hidden">Issue Mole</span>
      </Link>
      {currentUser ? (
        <>
          <div className="">
            <Link
              href="/interview-sheet"
              className={`p-2 text-white rounded-md ${
                isActive("/interview-sheet")
                  ? "font-bold text-white bg-orange-700"
                  : ""
              }`}
            >
              Interview sheet
            </Link>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleLogout}
              className="p-2 bg-orange-200 text-gray-800 rounded-md"
            >
              <FontAwesomeIcon icon={faArrowRightFromBracket} />
            </button>
          </div>
        </>
      ) : (
        <Link
          href="/login"
          className="p-2 bg-orange-200 text-gray-800 rounded-md"
        >
          <FontAwesomeIcon icon={faArrowRightToBracket} />
        </Link>
      )}
    </div>
  );
}
