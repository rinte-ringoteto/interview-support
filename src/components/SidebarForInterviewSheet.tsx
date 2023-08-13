import { useState, useEffect, useRef, useContext } from "react";
import { DocumentData, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../firebase/client";
import {
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { InterviewSheet } from "../types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faTrashAlt } from "@fortawesome/free-solid-svg-icons";
import { useInterviewSheet } from "../contexts/InterviewSheetContext";
import { UserContext } from "../contexts/UserContext";

export default function Sidebar() {
  const [interviewSheets, setInterviewSheets] = useState<InterviewSheet[]>([]);
  const [editingInterviewSheet, setEditingInterviewSheet] = useState<
    string | null
  >(null);
  const [newInterviewSheetName, setNewInterviewSheetName] =
    useState<string>("");
  const { selectedInterviewSheet, setSelectedInterviewSheet } =
    useInterviewSheet();

  const { user } = useContext(UserContext) || { user: null };
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, "interviewSheets"),
        where("userId", "==", user.uid),
        orderBy("updatedAt", "desc") // 追加
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        let interviewSheetList: InterviewSheet[] = [];
        snapshot.forEach((doc: DocumentData) => {
          const data = doc.data();
          const createdAt = Timestamp.now();
          if (data && data.interviewSheetName) {
            interviewSheetList.push({
              id: doc.id,
              interviewSheetName: data.interviewSheetName,
              userId: data.userId,
              interviewSheetType: data.interviewSheetType,
              createdAt: createdAt.toDate(),
              updatedAt: createdAt.toDate(),
              interviewees: data.interviewees,
              background: data.background,
              interviewSummary: data.interviewSummary,
              generateNumber: data.generateNumber,
              content: data.content,
            });
          }
        });
        setInterviewSheets(interviewSheetList);
      });

      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    if (interviewSheets.length > 0 && !selectedInterviewSheet) {
      const defaultInterviewSheet = interviewSheets[0];
      setSelectedInterviewSheet(defaultInterviewSheet);
    }
  }, [interviewSheets, selectedInterviewSheet, setSelectedInterviewSheet]);

  useEffect(() => {
    if (interviewSheets.length > 0 && !selectedInterviewSheet) {
      // Check if the user has interviewSheets in their interviewSheetList
      if (
        user &&
        user.interviewSheetList &&
        user.interviewSheetList.length > 0
      ) {
        // Find the first interviewSheet in user's interviewSheetList that is also in the interviewSheets array
        const defaultInterviewSheet = interviewSheets.find((interviewSheet) =>
          user.interviewSheetList?.includes(interviewSheet.id as any)
        );

        // If such a interviewSheet exists, set it as the selected interviewSheet
        if (defaultInterviewSheet) {
          setSelectedInterviewSheet(defaultInterviewSheet);
        }
      } else {
        // If user has no interviewSheets in their interviewSheetList, set the first interviewSheet in the interviewSheets array as the selected interviewSheet
        const defaultInterviewSheet = interviewSheets[0];
        setSelectedInterviewSheet(defaultInterviewSheet);
      }
    }
  }, [
    interviewSheets,
    selectedInterviewSheet,
    setSelectedInterviewSheet,
    user,
  ]);

  const handleSelectInterviewSheet = (interviewSheet: InterviewSheet) => {
    setSelectedInterviewSheet(interviewSheet);
    localStorage.setItem("selectedInterviewSheetId", interviewSheet.id);
  };

  const handleAddInterviewSheet = async () => {
    if (user) {
      const newInterviewSheetRef = await addDoc(
        collection(db, "interviewSheets"),
        {
          userId: user.uid,
          interviewSheetName: "New InterviewSheet",
          interviewSheetType: "インタビューシート",
          order: null,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          interviewees: [],
          background: null,
          interviewSummary: null,
          generateNumber: 3,
          content: [
            {
              id: 1,
              l1: "",
              l2: "",
              l3: "",
            },
          ],
        }
      );

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        interviewSheetList: arrayUnion(newInterviewSheetRef.id),
      });

      const newInterviewSheet: any = {
        id: newInterviewSheetRef.id,
        interviewSheetName: "New InterviewSheet",
        userId: user.uid,
        interviewSheetType: "インタビューシート",
        order: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        interviewees: [],
        background: null,
        interviewSummary: null,
        generateNumber: 3,
        content: [
          {
            id: 1,
            l1: "",
            l2: "",
            l3: "",
          },
        ],
      };

      setSelectedInterviewSheet(newInterviewSheet);
      localStorage.setItem("selectedInterviewSheetId", newInterviewSheet.id);
    }
  };

  const handleEditInterviewSheet = (interviewSheet: InterviewSheet) => {
    setEditingInterviewSheet(interviewSheet.id);
    setNewInterviewSheetName(interviewSheet.interviewSheetName);
  };

  const handleSaveInterviewSheet = async (interviewSheetId: string) => {
    const interviewSheetRef = doc(db, "interviewSheets", interviewSheetId);
    await updateDoc(interviewSheetRef, {
      interviewSheetName: newInterviewSheetName,
    });

    // Update the selectedInterviewSheet state
    setSelectedInterviewSheet((prevInterviewSheet) => {
      if (!prevInterviewSheet) return null;

      // Update the interviewSheetName property
      return {
        ...prevInterviewSheet,
        interviewSheetName: newInterviewSheetName,
      };
    });

    setEditingInterviewSheet(null);
  };

  const handleDeleteInterviewSheet = async (interviewSheetId: string) => {
    const interviewSheetRef = doc(db, "interviewSheets", interviewSheetId);
    await deleteDoc(interviewSheetRef);

    if (user) {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        interviewSheetList: arrayRemove(interviewSheetId),
      });
    }
  };

  useEffect(() => {
    if (editingInterviewSheet !== null && inputRef.current !== null) {
      inputRef.current.focus();
    }
  }, [editingInterviewSheet]);

  return (
    <>
      <div className="bg-gray-100 w-58 h-full overflow-auto md:block hidden">
        <h2 className="font-bold text-xl mb-4 pt-4 px-2">InterviewSheets</h2>
        <ul className="w-full">
          {interviewSheets.map(
            (interviewSheet) =>
              user && (
                <li
                  key={interviewSheet.id}
                  className={`flex items-center p-2 cursor-pointer ${
                    selectedInterviewSheet &&
                    selectedInterviewSheet.id === interviewSheet.id
                      ? "bg-gray-300"
                      : ""
                  }`}
                  onClick={() => handleSelectInterviewSheet(interviewSheet)}
                >
                  {editingInterviewSheet === interviewSheet.id ? (
                    <input
                      ref={inputRef}
                      value={newInterviewSheetName}
                      onChange={(e) => setNewInterviewSheetName(e.target.value)}
                      onBlur={() => handleSaveInterviewSheet(interviewSheet.id)}
                    />
                  ) : (
                    <>
                      <span>
                        {interviewSheet.interviewSheetName.length > 11
                          ? interviewSheet.interviewSheetName.substring(0, 10) +
                            "..."
                          : interviewSheet.interviewSheetName}
                      </span>
                      <div className="ml-auto">
                        {selectedInterviewSheet &&
                          selectedInterviewSheet.id === interviewSheet.id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditInterviewSheet(interviewSheet);
                              }}
                              className="ml-2 text-gray-500"
                            >
                              <FontAwesomeIcon icon={faEdit} />
                            </button>
                          )}
                        {selectedInterviewSheet &&
                          selectedInterviewSheet.id === interviewSheet.id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteInterviewSheet(interviewSheet.id);
                              }}
                              className="ml-2 text-gray-500"
                            >
                              <FontAwesomeIcon icon={faTrashAlt} />
                            </button>
                          )}
                      </div>
                    </>
                  )}
                </li>
              )
          )}
        </ul>
        <div className="flex justify-center">
          <button
            className="mt-4 bg-gray-100 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
            onClick={handleAddInterviewSheet}
          >
            +
          </button>
        </div>
      </div>
      <div className="bg-gray-100 w-full h-full overflow-auto md:hidden">
        <select
          className="w-3/4 m-2 p-2"
          onChange={(e) => {
            const selectedSheet = interviewSheets.find(
              (sheet) => sheet.id === e.target.value
            );
            if (selectedSheet) {
              handleSelectInterviewSheet(selectedSheet);
            } else {
              // Handle the case when selectedSheet is undefined
            }
          }}
        >
          {interviewSheets.map(
            (interviewSheet) =>
              user && (
                <option
                  key={interviewSheet.id}
                  value={interviewSheet.id}
                  selected={
                    selectedInterviewSheet &&
                    selectedInterviewSheet.id === interviewSheet.id
                      ? true
                      : false
                  }
                >
                  {interviewSheet.interviewSheetName.length > 11
                    ? interviewSheet.interviewSheetName.substring(0, 10) + "..."
                    : interviewSheet.interviewSheetName}
                </option>
              )
          )}
        </select>
      </div>
    </>
  );
}
