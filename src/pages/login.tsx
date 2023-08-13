import { useState } from "react";
import { useRouter } from "next/router";
import { auth, db } from "../firebase/client";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { useInterviewSheet } from "../contexts/InterviewSheetContext";
import { InterviewSheet } from "../types";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showResetModal, setShowResetModal] = useState(false); // State variable for the modal
  const router = useRouter();
  const { selectedInterviewSheet, setSelectedInterviewSheet } =
    useInterviewSheet();

  const handleSignIn = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);

      // ログイン成功後の処理...
      const userId = auth?.currentUser?.uid; // 現在のログインユーザーIDを取得
      const interviewSheetQuery = query(
        collection(db, "interviewSheets"),
        where("userId", "==", userId), // userIdが一致するプロジェクトを選択
        orderBy("updatedAt", "desc"), // createdAtが新しい順に並べ替え
        limit(1) // 最初の1つだけを取得
      );

      const querySnapshot = await getDocs(interviewSheetQuery);

      // 一番新しいプロジェクトをselectedInterviewSheetにセット
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log(data);
        setSelectedInterviewSheet({
          id: doc.id,
          interviewSheetName: data.interviewSheetName,
          userId: data.userId,
          interviewSheetType: data.interviewSheetType,
          createdAt: data.createdAt,
          updatedAt: data.createdAt,
          interviewees: data.interviewees,
          background: data.background,
          interviewSummary: data.interviewSummary,
          generateNumber: data.generateNumber,
          content: data.content,
        });
      });

      router.push("/interview-sheet"); // 追加
    } catch (error) {
      console.error(error);
      alert("ログインに失敗しました。");
    }
  };

  const handleSignUp = async (
    setSelectedInterviewSheet: React.Dispatch<
      React.SetStateAction<InterviewSheet | null>
    >
  ) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Check if it's a new user
      const createdAt = Timestamp.now();
      if (user.metadata.creationTime === user.metadata.lastSignInTime) {
        // It's a new user, add some data to Firestore
        const newInterviewSheetRef = await addDoc(
          collection(db, "interviewSheets"),
          {
            userId: user.uid,
            interviewSheetName: "New InterviewSheet",
            interviewSheetType: "インタビューシート",
            order: null,
            createdAt: createdAt,
            updatedAt: createdAt,
            interviewees: [],
            background: null,
            interviewSummary: null,
            generateNumber: 3,
            content: [{ id: "1", l1: "", l2: "", l3: "" }],
          }
        );

        await setDoc(doc(db, "users", user.uid), {
          interviewSheetList: [newInterviewSheetRef.id],
        });

        // Select the new interviewSheet
        setSelectedInterviewSheet({
          id: newInterviewSheetRef.id,
          interviewSheetName: "New InterviewSheet",
          userId: user.uid,
          interviewSheetType: "インタビューシート",
          createdAt: createdAt.toDate(),
          updatedAt: createdAt.toDate(),
          interviewees: [],
          background: "",
          interviewSummary: "",
          generateNumber: 3,
          content: [{ id: "1", l1: "", l2: "", l3: "" }],
        });

        router.push("/interview-sheet");
      }
    } catch (error) {
      console.error(error);
      alert("新規登録に失敗しました。");
    }
  };

  const handlePasswordReset = async () => {
    setShowResetModal(true); // Show the reset password modal
  };

  const handleConfirmReset = async () => {
    try {
      await sendPasswordResetEmail(auth, email);
      // Display a message or do something else after sending the email
      setShowResetModal(false); // Hide the reset password modal
    } catch (error) {
      console.error(error);
    }
  };

  const handleCloseResetModal = () => {
    setShowResetModal(false); // Hide the reset password modal
  };

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gray-100">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="p-2 mb-4 w-64 bg-white border border-gray-300 rounded-md"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="p-2 mb-4 w-64 bg-white border border-gray-300 rounded-md"
      />
      <button
        onClick={handleSignIn}
        className="p-2 mb-2 w-64 bg-orange-500 text-white rounded-md"
      >
        ログイン
      </button>
      <button
        onClick={() => handleSignUp(setSelectedInterviewSheet)}
        className="p-2 w-64 bg-orange-500 text-white rounded-md"
      >
        新規登録
      </button>
      <button
        onClick={handlePasswordReset}
        className="p-2 w-64 text-blue-500 rounded-md underline"
      >
        Reset password
      </button>

      {/* Reset password modal */}
      {showResetModal && (
        <div>
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="bg-white p-5 rounded shadow-lg max-w-sm mx-auto">
              <h2 className="text-xl font-semibold mb-4">
                Reset password confirmation
              </h2>
              <p className="mb-4">本当にパスワードをリセットしますか？</p>
              <div className="flex justify-center">
                <button
                  className="py-2 px-4 bg-orange-500 text-white rounded hover:bg-orange-700 mr-2 mb-2"
                  onClick={handleConfirmReset}
                >
                  はい
                </button>
                <button
                  className="py-2 px-4 text-black rounded hover:bg-gray-400 mb-2"
                  onClick={handleCloseResetModal}
                >
                  いいえ
                </button>
              </div>
            </div>
          </div>
          <div className="fixed inset-0 bg-black opacity-50"></div>
        </div>
      )}
    </div>
  );
}
