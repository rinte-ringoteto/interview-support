import { useState, useEffect, useContext } from "react";
import { TableRow, InterviewSheet } from "../types";
import { useInterviewSheet } from "../contexts/InterviewSheetContext";
import axios from "axios";
import { setDoc, doc } from "firebase/firestore";
import { db } from "../firebase/client";
import OverlaySpinner from "./OverlaySpinner";
import { shouldDisplayCell } from "../logic/displayHelper";
import { UserContext } from "../contexts/UserContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleInfo,
  faEye,
  faEyeSlash,
  faFile,
  faFileLines,
  faMicrophone,
  faSave,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import ExcelExportButtonForInterviewSheet from "./ExcelExportButtonForInterviewSheet";
import useTranscribe from "../logic/useTranscribe";

export default function Main() {
  const { user } = useContext(UserContext) || { user: null };
  const { selectedInterviewSheet, setSelectedInterviewSheet } =
    useInterviewSheet();
  const [inputText, setInputText] = useState("");
  const [selectedOption, setSelectedOption] = useState(
    selectedInterviewSheet?.interviewSheetType || ""
  );
  const [selectedNumber, setSelectedNumber] = useState<number>(
    selectedInterviewSheet?.generateNumber || 0
  );
  const initialFieldNames = selectedInterviewSheet?.content?.[0]
    ? Object.keys(selectedInterviewSheet.content[0])
    : ["ID", "L1", "L2", "L3"];
  const [fieldNames, setFieldNames] = useState<string[]>(initialFieldNames);
  const [newColumnName, setNewColumnName] = useState("");
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isFailure, setIsFailure] = useState(false);
  // const [isSuccess, setIsSuccess] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState(
    "Are you sure you want to generate all issues?"
  );
  const [selectedFieldName, setSelectedFieldName] = useState("---");

  const [isSetInfoModalOpen, setIsSetInfoModalOpen] = useState(false);
  const [isSetBackgroundModalOpen, setIsSetBackgroundModalOpen] =
    useState(false);
  const [isSetSummaryModalOpen, setIsSetSummaryModalOpen] = useState(false);
  const [isSetAllSummaryModalOpen, setIsSetAllSummaryModalOpen] =
    useState(false);
  const [isSetMemoModalOpen, setIsSetMemoModalOpen] = useState(false);

  const [selectedIntervieweeInfo, setSelectedIntervieweeInfo] = useState("");
  const [selectedAnswerSummary, setSelectedAnswerSummary] = useState("");
  const [selectedTranscript, setSelectedTranscript] = useState("");
  const [background, setBackground] = useState("");
  const [allSummary, setAllSummary] = useState("");

  const { transcribing, transcript, setTranscribing, setTranscript } =
    useTranscribe();

  // Extract l+number fields and find the max l+number
  const lNumberFields = fieldNames.filter((fieldName) =>
    /^l\d+$/i.test(fieldName)
  );
  const maxLNumberField = lNumberFields.sort().pop();

  // 現在の useEffect からフィールド名の更新を取り除きます。
  useEffect(() => {
    if (selectedInterviewSheet) {
      setSelectedOption(selectedInterviewSheet.interviewSheetType || "");
      setSelectedNumber(selectedInterviewSheet.generateNumber);
      setInputText(selectedInterviewSheet.interviewSheetName || "");
      setBackground(selectedInterviewSheet.background || "");
      setAllSummary(selectedInterviewSheet.interviewSummary || "");
    }
  }, [selectedInterviewSheet]);

  // 新たにフィールド名の更新のための useEffect を作成します。
  useEffect(() => {
    if (selectedInterviewSheet?.content?.[0]) {
      const unorderedFieldNames = Object.keys(
        selectedInterviewSheet.content[0]
      );
      const orderedFieldNames = [
        "id",
        ...unorderedFieldNames.filter((name) => name.startsWith("l")).sort(),
        ...unorderedFieldNames.filter(
          (name) => !name.startsWith("l") && name !== "id"
        ),
      ];
      setFieldNames(orderedFieldNames);
    }
  }, [selectedInterviewSheet]);

  useEffect(() => {
    if (selectedInterviewSheet && selectedFieldName) {
      // Find the interviewee with the matching name
      const matchingInterviewee = selectedInterviewSheet?.interviewees?.find(
        (interviewee) => interviewee.intervieweeName === selectedFieldName
      );

      // If we found a match, update the selectedIntervieweeInfo state
      if (matchingInterviewee) {
        setSelectedIntervieweeInfo(matchingInterviewee.intervieweeInformation);
        setSelectedAnswerSummary(matchingInterviewee.answerSummary);
        setTranscript(matchingInterviewee.transcript);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInterviewSheet, selectedFieldName]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedOption(e.target.value);
    setSelectedInterviewSheet((prevInterviewSheet) => {
      if (prevInterviewSheet !== null) {
        return {
          ...prevInterviewSheet,
          interviewSheetType: e.target.value,
        };
      } else {
        return null;
      }
    });
  };

  const handleSelectNumber = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedNumber(parseInt(e.target.value));
    setSelectedInterviewSheet((prevInterviewSheet) => {
      if (prevInterviewSheet !== null) {
        return {
          ...prevInterviewSheet,
          generateNumber: parseInt(e.target.value),
        };
      } else {
        return null;
      }
    });
  };

  const handleSave = async () => {
    if (!selectedInterviewSheet) {
      console.error("No selected interviewSheet to save");
      return;
    }

    try {
      const docRef = doc(db, "interviewSheets", selectedInterviewSheet.id);
      await setDoc(docRef, selectedInterviewSheet, { merge: true });
      console.log(
        "InterviewSheet updated with ID: ",
        selectedInterviewSheet.id
      );
      window.alert("保存しました");
    } catch (error) {
      console.error("Error updating document: ", error);
      window.alert("保存に失敗しました");
    }
  };

  const saveButtonStyle = isModalOpen
    ? "p-2 m-2 bg-orange-500 text-white rounded-md shadow-lg opacity-50 h-10 md:block hidden"
    : "p-2 m-2 bg-orange-500 text-white rounded-md shadow-lg h-10 md:block hidden";

  const compareIds = (id1: string, id2: string) => {
    const parts1 = id1.split("-").map(Number);
    const parts2 = id2.split("-").map(Number);

    for (let i = 0; i < Math.min(parts1.length, parts2.length); i++) {
      if (parts1[i] < parts2[i]) return -1;
      if (parts1[i] > parts2[i]) return 1;
    }

    // If all parts are equal up to the minimum length, the shorter ID goes first
    if (parts1.length < parts2.length) return -1;
    if (parts1.length > parts2.length) return 1;

    // If all parts are equal and the lengths are the same, the IDs are equal
    return 0;
  };

  const handleTextareaChange = (
    index: number,
    newValue: string,
    fieldName: string
  ) => {
    setSelectedInterviewSheet((prevInterviewSheet) => {
      if (!prevInterviewSheet) {
        return null;
      }

      return {
        ...prevInterviewSheet,
        content: prevInterviewSheet.content.map((item, itemIndex) => {
          const idParts = String(item.id).split("-");
          const targetIdParts = String(
            prevInterviewSheet.content[index].id
          ).split("-");

          // Update the condition to check if the id parts up to the column being edited match
          if (
            itemIndex === index ||
            (idParts.length >= parseInt(fieldName.substring(1)) &&
              idParts.slice(0, parseInt(fieldName.substring(1))).join("-") ===
                targetIdParts
                  .slice(0, parseInt(fieldName.substring(1)))
                  .join("-"))
          ) {
            const updatedItem = { ...item, [fieldName]: newValue };

            if (fieldName !== "id" && newValue !== "") {
              const fieldNumber = parseInt(fieldName.substring(1));
              if (
                idParts.length < fieldNumber ||
                !String(updatedItem.id).includes("-")
              ) {
                updatedItem.id = `${updatedItem.id}-1`;
              }
            }

            return updatedItem;
          }
          return item;
        }),
      };
    });
  };

  const addRow = (index: number, fieldName: string) => {
    setSelectedInterviewSheet((prevInterviewSheet) => {
      if (!prevInterviewSheet) {
        return null;
      }

      const currentRow = prevInterviewSheet.content[index];
      let newRow: TableRow = {
        id: "",
        l1: "",
        l2: "",
        l3: "",
        l4: "",
        l5: "",
      };

      for (let field of fieldNames) {
        if (field === fieldName) {
          break;
        }
        newRow[field] = currentRow[field];
      }

      // Check the number from fieldName (e.g., '3' from 'L3')
      const fieldNumber = parseInt(fieldName.substring(1));

      // Function to check if the id already exists in the content
      const idExists = (id: string) =>
        prevInterviewSheet.content.some(
          (item) => item.id === id || item.id.startsWith(id + "-")
        );

      // Split the displayId into parts
      let idParts = currentRow.id.split("-");
      let newIdParts = [...idParts];

      // Start from 1 if the id doesn't contain a hyphen
      let newIdPart =
        idParts.length > 1 ? parseInt(idParts[fieldNumber - 1]) + 1 : 1;

      while (true) {
        if (idParts.length >= fieldNumber) {
          // Assign the new ID part
          newIdParts[fieldNumber - 1] = newIdPart.toString();
        } else if (idParts.length === fieldNumber - 1) {
          // If there is no (x-1)th part, append '1'
          newIdParts.push("1");
        }

        // Exclude the parts from the fieldNumber-th part and beyond
        newIdParts = newIdParts.slice(0, fieldNumber);

        newRow.id = newIdParts.join("-");

        // Check if the new id already exists
        if (!idExists(newRow.id)) {
          break;
        }

        // If the new id already exists, increment the part again in the next loop
        newIdPart++;
      }

      const newContent = [
        ...prevInterviewSheet.content.slice(0, index + 1),
        newRow,
        ...prevInterviewSheet.content.slice(index + 1),
      ];

      // Sort the new content array based on the IDs
      newContent.sort((a, b) => {
        const aParts = a.id.split("-").map(Number);
        const bParts = b.id.split("-").map(Number);

        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
          if (i >= aParts.length) return -1;
          if (i >= bParts.length) return 1;

          if (aParts[i] < bParts[i]) return -1;
          if (aParts[i] > bParts[i]) return 1;
        }

        return 0;
      });

      return {
        ...prevInterviewSheet,
        content: newContent,
      };
    });
  };

  const handleRemoveRow = (index: number) => {
    setSelectedInterviewSheet((prevInterviewSheet) => {
      if (!prevInterviewSheet) {
        return null;
      }

      return {
        ...prevInterviewSheet,
        content: prevInterviewSheet.content.filter(
          (_, itemIndex) => itemIndex !== index
        ),
      };
    });
  };

  const addColumn = () => {
    setSelectedInterviewSheet((prevInterviewSheet) => {
      if (!prevInterviewSheet || prevInterviewSheet.content.length === 0) {
        return null;
      }

      // "L"で始まるフィールドの数をカウントし、新たなフィールド名を生成
      const newFieldNumber =
        fieldNames.filter((fieldName) => fieldName.startsWith("l")).length + 1;
      const newField = `l${newFieldNumber}`;

      // 新しいフィールド名を挿入
      const newFieldNames = [...fieldNames];
      newFieldNames.splice(-1, 0, newField);

      setFieldNames(newFieldNames);

      return {
        ...prevInterviewSheet,
        content: prevInterviewSheet.content.map((item) => ({
          ...item,
          [newField]: item[newField] !== undefined ? item[newField] : "",
        })),
      };
    });
  };

  const addNewColumn = (newColumnName: string) => {
    // Check if the new column name is valid
    if (newColumnName === "" || fieldNames.includes(newColumnName)) {
      console.error(`Invalid column name: ${newColumnName}`);
      return;
    }

    // Add the new column name to the fieldNames state variable
    const newFieldNames = [...fieldNames, newColumnName];
    console.log(newFieldNames);
    setFieldNames(newFieldNames);

    // Add the new field and an empty value to each row in the selected interview sheet
    setSelectedInterviewSheet((prevInterviewSheet: any) => {
      if (!prevInterviewSheet) {
        return null;
      }

      let maxIntervieweeId = 0;

      if (prevInterviewSheet && prevInterviewSheet.interviewees) {
        maxIntervieweeId = prevInterviewSheet.interviewees.reduce(
          (maxId: number, interviewee: any) =>
            Math.max(interviewee.intervieweeId, maxId),
          0
        );
      }

      const nextIntervieweeId = maxIntervieweeId + 1;

      // Create a new interviewee
      const newInterviewee = {
        intervieweeId: nextIntervieweeId,
        intervieweeName: newColumnName,
        intervieweeInformation: "",
        answerSummary: "",
        transcript: "",
        createdAt: new Date().toISOString(),
      };

      // Add the new interviewee to the interviewees array
      const updatedInterviewee = [
        ...prevInterviewSheet.interviewees,
        newInterviewee,
      ];

      return {
        ...prevInterviewSheet,
        content: prevInterviewSheet.content.map((item: any) => ({
          ...item,
          [newColumnName]: "",
        })),
        interviewees: updatedInterviewee,
      };
    });

    // Reset newColumnName after adding the new field
    setNewColumnName("");
  };

  const isLeftColumnFilled = (item: any, index: number) => {
    for (let i = 0; i < index; i++) {
      if (!item[fieldNames[i]] || String(item[fieldNames[i]]).trim() === "") {
        return false;
      }
    }
    return true;
  };

  const hideColumn = (column: any) => {
    setHiddenColumns((prev) => [...prev, column]);
  };

  const showColumn = (column: any) => {
    setHiddenColumns((prev) => prev.filter((col) => col !== column));
  };

  const handleClickExtractAll = async () => {
    setIsLoading(true);

    const postData = {
      selectedInterviewSheet: selectedInterviewSheet,
    };

    try {
      const response = await axios.post("/api/extract-all-summary", postData);
      setSelectedInterviewSheet(response.data);
    } catch (error) {
      console.error(error);
      window.alert("An error occurred");
    }

    // Only set loading to false after fetchInterviewSheetData has completed
    setIsLoading(false);
  };

  const handleClickSingleIssue = async (id: any, fieldName: string) => {
    const itemToPost = selectedInterviewSheet?.content.find(
      (item) => item.id === id
    );
    if (!itemToPost) {
      console.error("No item to post with this id");
      setIsLoading(false);
      setIsFailure(true);
      return;
    }

    setIsLoading(true);

    const postData = {
      row: fieldName,
      id: itemToPost.id,
      item: itemToPost,
      selectedOption: selectedOption,
      generateNumber: selectedNumber,
      selectedInterviewSheet: selectedInterviewSheet,
    };

    try {
      const response = await axios.post("/api/create-questions", postData);
      setSelectedInterviewSheet(response.data);
    } catch (error) {
      console.error(error);
      window.alert("An error occurred");
    }

    // Only set loading to false after fetchInterviewSheetData has completed
    setIsLoading(false);
  };

  const handleClickAllIssues = async (fieldName: any) => {
    let uniqueRows: any = [];
    if (selectedInterviewSheet && selectedInterviewSheet.content) {
      uniqueRows = selectedInterviewSheet.content.filter(
        (item: any, index: number, self: any) => {
          return (
            self.findIndex((i: any) => i[fieldName] === item[fieldName]) ===
            index
          );
        }
      );
    }

    if (uniqueRows.length > 50) {
      setModalContent(
        "Cannot execute due to exceeding the limit of 50 unique rows."
      );
      return;
    }

    setIsLoading(true);

    const postData = {
      row: fieldName,
      selectedOption: selectedOption,
      generateNumber: selectedNumber,
      selectedInterviewSheet: selectedInterviewSheet,
    };

    try {
      const response = await axios.post("/api/create-all-questions", postData);
      console.log(response.data);
      setSelectedInterviewSheet(response.data);
    } catch (error) {
      console.error(error);
      window.alert("An error occurred");
    }
    setIsLoading(false);
  };

  const handleClickExtractSingle = async (fieldName: string) => {
    setIsLoading(true);

    const postData = {
      fieldName: fieldName,
      selectedInterviewSheet: selectedInterviewSheet,
    };

    try {
      const response = await axios.post("/api/extract-summary", postData);
      setSelectedInterviewSheet(response.data);
    } catch (error) {
      console.error(error);
      window.alert("An error occurred");
    }

    // Only set loading to false after fetchInterviewSheetData has completed
    setIsLoading(false);
  };

  const handleClickSetInformation = async (selectedFieldName: string) => {
    if (selectedInterviewSheet) {
      const updatedInterviewees = selectedInterviewSheet.interviewees.map(
        (interviewee: any) => {
          if (interviewee.intervieweeName === selectedFieldName) {
            return {
              ...interviewee,
              intervieweeInformation: selectedIntervieweeInfo,
            };
          }
          return interviewee;
        }
      );

      // 新しい selectedInterviewSheet の値を一時変数に保存
      const updatedInterviewSheet = {
        ...selectedInterviewSheet,
        interviewees: updatedInterviewees,
      };

      // 状態を更新
      setSelectedInterviewSheet(updatedInterviewSheet);

      // Firestore のドキュメントを更新
      const docRef = doc(db, "interviewSheets", updatedInterviewSheet.id);
      await setDoc(docRef, updatedInterviewSheet, { merge: true });
    }
  };

  const handleClickOutputMemo = async (fieldName: any) => {
    setIsLoading(true);

    const postData = {
      fieldName: fieldName,
      transcript: transcript,
      selectedInterviewSheet: selectedInterviewSheet,
    };

    try {
      const response = await axios.post("/api/output-memo", postData);
      console.log(response.data);
      setSelectedInterviewSheet(response.data);
    } catch (error) {
      console.error(error);
      window.alert("An error occurred");
    }
    setIsLoading(false);
  };

  const handleClickSetTranscript = async (selectedFieldName: string) => {
    if (selectedInterviewSheet) {
      const updatedInterviewees = selectedInterviewSheet.interviewees.map(
        (interviewee: any) => {
          if (interviewee.intervieweeName === selectedFieldName) {
            return {
              ...interviewee,
              transcript: transcript,
            };
          }
          return interviewee;
        }
      );

      // 新しい selectedInterviewSheet の値を一時変数に保存
      const updatedInterviewSheet = {
        ...selectedInterviewSheet,
        interviewees: updatedInterviewees,
      };

      // 状態を更新
      setSelectedInterviewSheet(updatedInterviewSheet);

      // Firestore のドキュメントを更新
      const docRef = doc(db, "interviewSheets", updatedInterviewSheet.id);
      await setDoc(docRef, updatedInterviewSheet, { merge: true });
    }
  };

  const handleClickSetBackground = () => {
    if (selectedInterviewSheet) {
      setSelectedInterviewSheet({
        ...selectedInterviewSheet,
        background: background,
      });
    }
  };

  const handleClickTranscribing = () => {
    setTranscribing((prevTranscribing) => !prevTranscribing);
  };

  const handleClickFieldName = (e: any) => {
    setSelectedFieldName(e.target.value);
  };

  const openSetBackgroundModal = () => {
    setIsSetBackgroundModalOpen(true);
    // setSelectedFieldName(fieldName);
  };

  const closeSetBackgroundModal = () => {
    setIsSetBackgroundModalOpen(false);
  };

  const openModal = (fieldName: any) => {
    setIsModalOpen(true);
    setSelectedFieldName(fieldName);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const openSetInfoModal = (fieldName: any) => {
    setIsSetInfoModalOpen(true);
    setSelectedFieldName(fieldName);
  };

  const closeSetInfoModal = () => {
    setIsSetInfoModalOpen(false);
  };

  const openSummaryModal = (fieldName: any) => {
    setIsSetSummaryModalOpen(true);
    setSelectedFieldName(fieldName);
  };

  const closeSummaryModal = () => {
    setIsSetSummaryModalOpen(false);
  };

  const openAllSummaryModal = () => {
    setIsSetAllSummaryModalOpen(true);
  };

  const closeAllSummaryModal = () => {
    setIsSetAllSummaryModalOpen(false);
  };

  const openMemoModal = (fieldName: any) => {
    setIsSetMemoModalOpen(true);
    setSelectedFieldName(fieldName);
  };

  const closeMemoModal = () => {
    setIsSetMemoModalOpen(false);
  };

  // 'l'を取り除く
  const cleanedFieldName = selectedFieldName.replace(/l/g, "");

  // 数字を取り出す
  const numberMatch = cleanedFieldName.match(/\d+/g);

  // 数字が存在すれば2を加える。存在しなければ元の値を保持する
  const newFieldName = numberMatch
    ? cleanedFieldName.replace(
        numberMatch[0],
        String(Number(numberMatch[0]) + 2)
      )
    : cleanedFieldName;

  return (
    <div className="md:p-8 flex-grow">
      {isLoading && <OverlaySpinner loading={isLoading} />}
      {isModalOpen && (
        <div>
          <div className="fixed inset-0 flex items-center justify-center z-50">
            {/* Move this transparent div here to be under the actual modal */}
            <div className="bg-white p-5 rounded shadow-lg max-w-sm mx-auto">
              <h2 className="text-xl font-semibold mb-4">
                L{newFieldName}以降のデータがリセットされます。
                Generateしますか？
              </h2>
              <div className="flex flex-col justify-center items-center">
                <button
                  className="py-2 px-4 bg-orange-500 text-white rounded hover:bg-orange-700 mr-2 mb-2"
                  onClick={() => {
                    handleClickAllIssues(selectedFieldName);
                    closeModal();
                  }}
                >
                  Generate
                </button>
                <button
                  className="py-2 px-4 text-black rounded hover:bg-gray-400 mb-2"
                  onClick={closeModal}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
          <div className="fixed inset-0 bg-black opacity-50"></div>
        </div>
      )}
      {isSetInfoModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded shadow-lg max-w-5xl mx-auto space-y-4">
            <h2 className="text-xl font-semibold mb-4">インタビュイーの情報</h2>
            <textarea
              className="w-full h-64 p-2 border border-gray-400 rounded resize-none"
              value={selectedIntervieweeInfo}
              onChange={(e) => setSelectedIntervieweeInfo(e.target.value)}
            />
            {isSetInfoModalOpen && (
              <div className="fixed inset-0 flex items-center justify-center">
                <div className="bg-white p-8 rounded shadow-lg max-w-5xl w-4/5 mx-auto space-y-4 z-50">
                  <textarea
                    className="w-full h-64 p-2 border border-gray-400 rounded resize-none"
                    value={selectedIntervieweeInfo}
                    onChange={(e) => setSelectedIntervieweeInfo(e.target.value)}
                  />
                  <div className="flex flex-col items-center space-y-4">
                    <button
                      className="py-2 px-4 bg-orange-500 text-white rounded hover:bg-orange-700 w-1/4"
                      onClick={() => {
                        handleClickSetInformation(selectedFieldName);
                        closeSetInfoModal();
                      }}
                    >
                      保存
                    </button>
                    <button
                      className="py-2 px-4 bg-gray-200 rounded hover:bg-gray-300 w-1/4"
                      onClick={closeSetInfoModal}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                <div className="fixed inset-0 bg-black opacity-50"></div>
              </div>
            )}
          </div>
        </div>
      )}
      {isSetBackgroundModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded shadow-lg max-w-5xl mx-auto space-y-4">
            <h2 className="text-xl font-semibold mb-4">インタビュー背景</h2>
            <textarea
              className="w-full h-64 p-2 border border-gray-400 rounded resize-none"
              value={background}
              onChange={(e) => setBackground(e.target.value)}
            />
            {isSetBackgroundModalOpen && (
              <div className="fixed inset-0 flex items-center justify-center">
                <div className="bg-white p-8 rounded shadow-lg max-w-5xl w-4/5 mx-auto space-y-4 z-50">
                  <textarea
                    className="w-full h-64 p-2 border border-gray-400 rounded resize-none"
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                  />
                  <div className="flex flex-col items-center space-y-4">
                    <button
                      className="py-2 px-4 bg-orange-500 text-white rounded hover:bg-orange-700 w-1/4"
                      onClick={() => {
                        handleClickSetBackground();
                        closeSetBackgroundModal();
                      }}
                    >
                      Set
                    </button>
                    <button
                      className="py-2 px-4 bg-gray-200 rounded hover:bg-gray-300 w-1/4"
                      onClick={closeSetBackgroundModal}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                <div className="fixed inset-0 bg-black opacity-50"></div>
              </div>
            )}
          </div>
        </div>
      )}
      {isSetMemoModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded shadow-lg max-w-5xl mx-auto space-y-4">
            <h2 className="text-xl font-semibold mb-4">インタビュー背景</h2>
            <textarea
              className="w-full h-64 p-2 border border-gray-400 rounded resize-none"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
            {isSetMemoModalOpen && (
              <div className="fixed inset-0 flex items-center justify-center">
                <div className="bg-white p-8 rounded shadow-lg max-w-5xl w-4/5 mx-auto space-y-4 z-50">
                  <textarea
                    className="w-full h-64 p-2 border border-gray-400 rounded resize-none"
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                  />
                  <div className="flex flex-col items-center space-y-4">
                    <button
                      className={`p-2 m-2 text-white rounded w-1/4 ${
                        transcribing
                          ? "bg-red-500 hover:bg-red-700"
                          : "bg-green-500 hover:bg-green-700"
                      }`}
                      onClick={handleClickTranscribing}
                    >
                      <FontAwesomeIcon icon={faMicrophone} />
                      {transcribing ? " 録音中..." : " 録音"}
                    </button>
                    <button
                      className="py-2 px-4 bg-orange-500 text-white rounded hover:bg-orange-700 w-1/4"
                      onClick={() => {
                        handleClickSetTranscript(selectedFieldName);
                        closeMemoModal();
                      }}
                    >
                      保存
                    </button>
                    <button
                      className="py-2 px-4 bg-orange-500 text-white rounded hover:bg-orange-700 w-1/4"
                      onClick={() => {
                        handleClickOutputMemo(selectedFieldName);
                        closeMemoModal();
                      }}
                    >
                      メモをもとに回答を出力
                    </button>
                    <button
                      className="py-2 px-4 bg-gray-200 rounded hover:bg-gray-300 w-1/4"
                      onClick={closeMemoModal}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                <div className="fixed inset-0 bg-black opacity-50"></div>
              </div>
            )}
          </div>
        </div>
      )}
      {isSetAllSummaryModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded shadow-lg max-w-5xl mx-auto space-y-4">
            <h2 className="text-xl font-semibold mb-4">全体の示唆</h2>
            <textarea
              className="w-full h-64 p-2 border border-gray-400 rounded resize-none"
              value={allSummary}
              onChange={(e) => setAllSummary(e.target.value)}
            />
            {isSetAllSummaryModalOpen && (
              <div className="fixed inset-0 flex items-center justify-center">
                <div className="bg-white p-8 rounded shadow-lg max-w-5xl w-4/5 mx-auto space-y-4 z-50">
                  <textarea
                    className="w-full h-64 p-2 border border-gray-400 rounded resize-none"
                    value={allSummary}
                    onChange={(e) => setAllSummary(e.target.value)}
                  />
                  <div className="flex flex-col items-center space-y-4">
                    <button
                      className="py-2 px-4 bg-orange-500 text-white rounded hover:bg-orange-700 w-1/4"
                      onClick={() => {
                        handleClickExtractAll();
                      }}
                    >
                      Generate
                    </button>
                    <button
                      className="py-2 px-4 bg-gray-200 rounded hover:bg-gray-300 w-1/4"
                      onClick={closeAllSummaryModal}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                <div className="fixed inset-0 bg-black opacity-50"></div>
              </div>
            )}
          </div>
        </div>
      )}
      {isSetSummaryModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded shadow-lg max-w-5xl mx-auto space-y-4">
            <h2 className="text-xl font-semibold mb-4">示唆</h2>
            <textarea
              className="w-full h-64 p-2 border border-gray-400 rounded resize-none"
              value={selectedAnswerSummary}
              onChange={(e) => setSelectedAnswerSummary(e.target.value)}
            />
            {isSetSummaryModalOpen && (
              <div className="fixed inset-0 flex items-center justify-center">
                <div className="bg-white p-8 rounded shadow-lg max-w-5xl w-4/5 mx-auto space-y-4 z-50">
                  <textarea
                    className="w-full h-64 p-2 border border-gray-400 rounded resize-none"
                    value={selectedAnswerSummary}
                    onChange={(e) => setSelectedAnswerSummary(e.target.value)}
                  />
                  <div className="flex flex-col items-center space-y-4">
                    <button
                      className="py-2 px-4 bg-orange-500 text-white rounded hover:bg-orange-700 w-1/4"
                      onClick={() => {
                        handleClickExtractSingle(selectedFieldName);
                        // closeSummaryModal();
                      }}
                    >
                      Generate
                    </button>
                    <button
                      className="py-2 px-4 bg-gray-200 rounded hover:bg-gray-300 w-1/4"
                      onClick={closeSummaryModal}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                <div className="fixed inset-0 bg-black opacity-50"></div>
              </div>
            )}
          </div>
        </div>
      )}
      {user ? (
        <>
          <div className="flex items-center mb-4 space-x-4">
            <select
              className="p-2 border border-gray-300 rounded-md md:block hidden"
              value={selectedOption}
              onChange={handleSelectChange}
            >
              <option value="インタビューシート">インタビューシート</option>
            </select>
            <select
              className="p-2 border border-gray-300 rounded-md md:block hidden"
              value={selectedNumber}
              onChange={handleSelectNumber}
            >
              {Array.from({ length: 9 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1}
                </option>
              ))}
            </select>
            <button
              className="p-1 text-gray rounded-md md:block hidden"
              onClick={() => openSetBackgroundModal()}
            >
              <FontAwesomeIcon icon={faCircleInfo} /> インタビュー背景
            </button>
            <button
              className="p-1 text-gray rounded-md md:block hidden"
              onClick={() => openAllSummaryModal()}
            >
              <FontAwesomeIcon icon={faFileLines} /> 全体示唆
            </button>
            <div
              style={{
                position: "fixed",
                top: "90px",
                right: "20px",
              }}
              className="flex md:flex-row flex-col space-x-2 md:space-x-4"
            >
              <button className={saveButtonStyle} onClick={handleSave}>
                <FontAwesomeIcon icon={faSave} /> 保存
              </button>
              <ExcelExportButtonForInterviewSheet isModalOpen={isModalOpen} />
              <button
                className={`p-2 m-2 mt-8 text-white rounded md:hidden ${
                  transcribing
                    ? "bg-red-500 hover:bg-red-700"
                    : "bg-green-500 hover:bg-green-500"
                }`}
                onClick={handleClickTranscribing}
              >
                <FontAwesomeIcon icon={faMicrophone} />
                {transcribing ? " 録音中..." : " 録音"}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto md:block hidden">
            <table className="min-w-max table-auto">
              <thead>
                <tr>
                  <th className="px-4 py-2">
                    <span>Action</span> {/* Add this */}
                  </th>
                  {fieldNames.map((fieldName, index) => (
                    <th
                      key={index}
                      className={`px-4 py-2`}
                      style={
                        fieldName === "id"
                          ? { width: "100px" }
                          : hiddenColumns.includes(fieldName)
                          ? { width: "80px" }
                          : { width: "300px" }
                      }
                    >
                      <div className="flex flex-col">
                        <div className="flex justify-between items-center">
                          <span>{fieldName.toUpperCase()}</span>
                          <div className="flex items-center">
                            {fieldName !== "id" && (
                              <div>
                                {hiddenColumns.includes(fieldName) ? (
                                  <button
                                    onClick={() => showColumn(fieldName)}
                                    className="text-gray-500"
                                  >
                                    <FontAwesomeIcon icon={faEye} />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => hideColumn(fieldName)}
                                    className="text-gray-500"
                                  >
                                    <FontAwesomeIcon icon={faEyeSlash} />
                                  </button>
                                )}
                              </div>
                            )}
                            {fieldName === maxLNumberField && (
                              <button
                                onClick={addColumn}
                                className="justify-center ml-2"
                              >
                                +
                              </button>
                            )}
                          </div>
                        </div>

                        {fieldName === "id" ||
                        hiddenColumns.includes(
                          fieldName
                        ) ? null : /^L\d+$/i.test(fieldName) ? (
                          selectedInterviewSheet?.content?.some(
                            (item) => item[fieldName]
                          ) ? (
                            <button
                              onClick={() => openModal(fieldName)}
                              className="p-1 text-orange-500 rounded-md"
                            >
                              Generate All
                            </button>
                          ) : null
                        ) : (
                          <div className="flex flex-row">
                            <button
                              className="p-1 text-gray-500 rounded-md"
                              onClick={() => openSetInfoModal(fieldName)}
                            >
                              <FontAwesomeIcon icon={faCircleInfo} /> 属性
                            </button>
                            <button
                              className="p-1 text-gray-500 rounded-md"
                              onClick={() => openMemoModal(fieldName)}
                            >
                              <FontAwesomeIcon icon={faMicrophone} /> メモ
                            </button>
                            <button
                              className="p-1 text-gray-500 rounded-md"
                              onClick={() => openSummaryModal(fieldName)}
                            >
                              <FontAwesomeIcon icon={faFile} /> 示唆
                            </button>
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                  <th>
                    <div className="flex flex-col">
                      <input
                        type="text"
                        placeholder="Enter new column name"
                        value={newColumnName}
                        onChange={(e) => setNewColumnName(e.target.value)}
                      />
                      <button
                        onClick={() => addNewColumn(newColumnName)}
                        className="flex justify-between items-center"
                      >
                        Add New Interviewee
                      </button>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {selectedInterviewSheet && selectedInterviewSheet.content
                  ? selectedInterviewSheet.content
                      .sort((item1, item2) => compareIds(item1.id, item2.id))
                      .map((item, index) => (
                        <tr key={index} className="text-center border">
                          <td>
                            <button
                              onClick={() => handleRemoveRow(index)}
                              className="ml-2 text-gray-500"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </td>
                          {fieldNames.map((fieldName, fieldIndex) => (
                            <td className="px-4 py-2" key={fieldIndex}>
                              {hiddenColumns.includes(fieldName) ? (
                                " "
                              ) : fieldName === "id" ? (
                                item.id
                              ) : /^l\d+$/i.test(fieldName) ? (
                                shouldDisplayCell(
                                  item,
                                  fieldName,
                                  index,
                                  selectedInterviewSheet?.content
                                ) && isLeftColumnFilled(item, fieldIndex) ? (
                                  <div className="flex flex-col justify-start">
                                    <div className="flex flex-row">
                                      <textarea
                                        className="p-2 border border-gray-300 rounded-md w-60 mr-2 items-start"
                                        value={item[fieldName]}
                                        onChange={(e) =>
                                          handleTextareaChange(
                                            index,
                                            e.target.value,
                                            fieldName
                                          )
                                        }
                                        rows={2}
                                      />
                                      {
                                        // Check if fieldName matches "l" followed by one or more digits
                                        /^l\d+$/i.test(fieldName) &&
                                        item[fieldName] &&
                                        String(item[fieldName]).trim() !==
                                          "" ? (
                                          <button
                                            onClick={() =>
                                              handleClickSingleIssue(
                                                item.id,
                                                fieldName
                                              )
                                            }
                                            className="p-1 text-orange-500 rounded-md"
                                          >
                                            {`Generate\n▶︎`}
                                          </button>
                                        ) : null
                                      }
                                    </div>
                                    <div>
                                      {item[fieldName] &&
                                      String(item[fieldName]).trim() !== "" ? (
                                        <>
                                          <button
                                            className="p-1 text-gray rounded-md"
                                            onClick={() =>
                                              addRow(index, fieldName)
                                            }
                                          >
                                            +
                                          </button>
                                        </>
                                      ) : (
                                        <button className="p-1 text-gray rounded-md text-white">
                                          +
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ) : null
                              ) : (
                                <div className="flex flex-col justify-start">
                                  <div className="flex flex-row">
                                    <textarea
                                      className="p-2 border border-gray-300 rounded-md w-60 mr-2 items-start"
                                      value={item[fieldName]}
                                      onChange={(e) =>
                                        handleTextareaChange(
                                          index,
                                          e.target.value,
                                          fieldName
                                        )
                                      }
                                      rows={2}
                                    />
                                    {
                                      // Check if fieldName matches "l" followed by one or more digits
                                      /^l\d+$/i.test(fieldName) &&
                                      item[fieldName] &&
                                      String(item[fieldName]).trim() !== "" ? (
                                        <button
                                          onClick={() =>
                                            handleClickSingleIssue(
                                              item.id,
                                              fieldName
                                            )
                                          }
                                          className="p-1 text-orange-500 rounded-md"
                                        >
                                          {`Generate\n▶︎`}
                                        </button>
                                      ) : null
                                    }
                                  </div>
                                  <div>
                                    {item[fieldName] &&
                                    String(item[fieldName]).trim() !== "" ? (
                                      <>
                                        <button
                                          className="p-1 text-gray rounded-md"
                                          onClick={() =>
                                            addRow(index, fieldName)
                                          }
                                        >
                                          +
                                        </button>
                                      </>
                                    ) : (
                                      <button className="p-1 text-gray rounded-md text-white">
                                        +
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))
                  : null}
              </tbody>
            </table>
          </div>
          {/* スマホ画面 */}
          <div className="p-2 flex flex-col items-center mb-4 space-y-4 md:hidden">
            <div className="w-full">
              <select
                className="w-full border border-gray-300 rounded-md p-2"
                value={selectedFieldName}
                onChange={handleClickFieldName}
              >
                <option value="---">---</option>
                {fieldNames
                  .filter(
                    (fieldName) =>
                      fieldName !== "id" && !/^l\d+$/i.test(fieldName)
                  )
                  .map((fieldName, index) => (
                    <option key={index} value={fieldName}>
                      {fieldName}
                    </option>
                  ))}
              </select>
              <div className="flex flex-row m-2">
                <input
                  type="text"
                  placeholder="New Interviewee"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                />
                <button
                  onClick={() => addNewColumn(newColumnName)}
                  className="flex justify-between items-center ml-4"
                >
                  +
                </button>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-700">
                インタビューメモ
              </h2>
              <textarea
                className="w-full h-64 p-2 border border-gray-400 rounded resize-none"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
              />
              <button
                className="py-2 px-4 bg-orange-500 text-white rounded hover:bg-orange-700 w-full md:w-1/4"
                onClick={() => {
                  handleClickSetTranscript(selectedFieldName);
                  closeMemoModal();
                }}
              >
                保存
              </button>
            </div>
          </div>
        </>
      ) : (
        <div>
          <h1>ログインしてください</h1>
        </div>
      )}
    </div>
  );
}
