import React from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { useInterviewSheet } from "../contexts/InterviewSheetContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileExcel } from "@fortawesome/free-solid-svg-icons";

interface ExcelExportButtonProps {
  isModalOpen: boolean;
}

const ExcelExportButtonForInterviewSheet: React.FC<ExcelExportButtonProps> = ({
  isModalOpen,
}) => {
  const { selectedInterviewSheet } = useInterviewSheet(); // InterviewSheetのContextからselectedInterviewSheetを取得

  const handleExport = async () => {
    if (!selectedInterviewSheet) return;

    // Workbookを新規作成
    const wb = new ExcelJS.Workbook();

    // 新規ワークシートを追加
    const ws = wb.addWorksheet("Sheet1");

    if (selectedInterviewSheet.interviewSheetType === "インタビューシート") {
      selectedInterviewSheet.content = selectedInterviewSheet.content.map(
        (obj) => {
          return {
            ...obj,
            Answer: "", // 新しい 'answer' フィールドを追加
          };
        }
      );
    }

    // 全てのフィールド（キー）を収集
    const allFields = new Set<string>();
    for (const item of selectedInterviewSheet.content) {
      for (const field in item) {
        allFields.add(field);
      }
    }

    // すべてのフィールド名を取得
    const fieldNames = Object.keys(selectedInterviewSheet.content[0]);

    fieldNames.forEach((fieldName) => {
      // "answer" フィールドは削除対象外
      if (fieldName === "answer") return;

      // 特定のフィールドが存在し、その値が空でないオブジェクトがあるかどうかチェック
      let fieldExistsAndNotEmpty = false;
      for (let i = 0; i < selectedInterviewSheet.content.length; i++) {
        const obj = selectedInterviewSheet.content[i];
        if (obj[fieldName] && obj[fieldName] !== "") {
          fieldExistsAndNotEmpty = true;
          break;
        }
      }

      // フィールドが存在しないか、その値が空の場合、そのフィールドをすべてのオブジェクトから削除
      if (!fieldExistsAndNotEmpty) {
        for (let i = 0; i < selectedInterviewSheet.content.length; i++) {
          delete selectedInterviewSheet.content[i][fieldName];
        }
      }
    });

    const sortedFields = Array.from(allFields).sort((a, b) => {
      if (a === "id") return -1;
      if (b === "id") return 1;
      if (a === "Answer") return 1; // 'answer' フィールドを最後に配置
      if (b === "Answer") return -1; // 'answer' フィールドを最後に配置
      if (a.startsWith("l") && b.startsWith("l")) {
        return Number(a.slice(1)) - Number(b.slice(1));
      }
      return a.localeCompare(b);
    });

    // ヘッダー行を追加（色付き）
    ws.addRow([]);
    const headerRow = ws.addRow(["", ...sortedFields]); // Add an empty cell in the first column
    headerRow.eachCell((cell, colNumber) => {
      // Ignore the first column when applying the color
      if (colNumber !== 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "00cecece" },
        };
      }
      // 1列目に罫線を設定
      if (colNumber === 1) {
        cell.border = {
          left: { style: "thin", color: { argb: "00000000" } },
        };
      }

      // フォントを 'Meiryo UI' に設定
      cell.font = {
        name: "Meiryo UI",
        family: 2,
        size: 11,
        underline: false,
        bold: false,
      };
    });

    // ID列の横幅を設定
    ws.getColumn(1).width = 3; // Adjust the column index if needed
    ws.getColumn(2).width = 10; // Adjust the column index if needed

    // その他の列の横幅を設定
    for (let i = 3; i <= ws.columns.length; i++) {
      // Adjust the column index if needed
      const column = ws.getColumn(i);
      column.width = 32;
    }

    // 各フィールドの最初のIDを追跡
    const firstIdForValue = new Map<string, string>();

    // ソートされたコンテンツリストを作成
    const sortedContent = [...selectedInterviewSheet.content].sort((a, b) =>
      a.id
        .split("-")
        .map(Number)
        .join()
        .localeCompare(b.id.split("-").map(Number).join())
    );

    // データを追加
    for (const item of sortedContent) {
      const row = [];
      for (const field of sortedFields) {
        let value = item[field] || "";
        if (value !== "") {
          const key = `${field}_${value}`;
          const previousId = firstIdForValue.get(key);
          if (previousId === undefined) {
            firstIdForValue.set(key, item.id);
          } else {
            value = ""; // 既に出現している場合は空文字に設定
          }
        }
        row.push(value);
      }
      const newRow = ws.addRow(["", ...row]); // Add an empty cell in the first column

      // テキストを折り返して表示し、配置をセルの上にする
      newRow.eachCell((cell, colNumber) => {
        cell.alignment = {
          wrapText: true,
          vertical: "top",
        };
        // 1列目に罫線を設定
        if (colNumber === 1) {
          cell.border = {
            ...cell.border,
            left: { style: "thin", color: { argb: "00000000" } },
          };
        }
        // フォントを 'Meiryo UI' に設定
        cell.font = {
          name: "Meiryo UI",
          family: 2,
          size: 11,
          underline: false,
          bold: false,
        };
      });
    }

    // id列の上下に罫線を設定
    const idColumn = ws.getColumn(1);
    idColumn.eachCell((cell, rowNumber) => {
      if (rowNumber === 1) {
        // 1行目の上に罫線を引く
        cell.border = {
          top: { style: "thin", color: { argb: "00000000" } },
          bottom: { style: "thin", color: { argb: "00000000" } },
        };
      } else if (rowNumber === ws.rowCount) {
        // 最終行の下に罫線を引かない
        cell.border = {
          top: { style: "thin", color: { argb: "00000000" } },
        };
      } else {
        // 中間行の上に罫線を引く
        cell.border = {
          top: { style: "thin", color: { argb: "00000000" } },
        };
        const nextCell = ws.getCell(`B${rowNumber + 1}`); // id列の次のセルを取得
        nextCell.border = {
          top: { style: "thin", color: { argb: "00000000" } },
        };
      }
    });

    if (selectedInterviewSheet.interviewSheetType === "インタビューシート") {
      // id列の上下に罫線を設定
      const lastColumnNumber = ws.columnCount;
      const answerColumn = ws.getColumn(lastColumnNumber);

      answerColumn.eachCell((cell, rowNumber) => {
        if (rowNumber === 1) {
          // 1行目の上に罫線を引く
          cell.border = {
            top: { style: "thin", color: { argb: "00000000" } },
            bottom: { style: "thin", color: { argb: "00000000" } },
          };
        } else if (rowNumber === ws.rowCount) {
          // 最終行の下に罫線を引かない
          cell.border = {
            top: { style: "thin", color: { argb: "00000000" } },
          };
        } else {
          // 中間行の上に罫線を引く
          cell.border = {
            top: { style: "thin", color: { argb: "00000000" } },
          };
          const nextCell = ws.getCell(`B${rowNumber + 1}`); // id列の次のセルを取得
          nextCell.border = {
            top: { style: "thin", color: { argb: "00000000" } },
          };
        }
      });
    }

    let eachIssueLength = [];
    let maxIdPartsLength = 0;

    // Find the maximum length of idParts across all data entries
    for (let i = 0; i < sortedContent.length; i++) {
      let idPartsLength = sortedContent[i].id.split("-").length;
      if (idPartsLength > maxIdPartsLength) {
        maxIdPartsLength = idPartsLength;
      }
    }

    let prevIdParts = new Array(maxIdPartsLength).fill(0);

    for (let i = 0; i < sortedContent.length; i++) {
      let idParts = sortedContent[i].id
        .split("-")
        .map((part) => (part ? Number(part) : 0));

      // Add missing fields with value 0
      for (let j = idParts.length; j < maxIdPartsLength; j++) {
        idParts[j] = 0;
      }

      for (let j = 0; j < maxIdPartsLength; j++) {
        // If the eachIssueLength array is shorter than the number of idParts, expand it
        if (j >= eachIssueLength.length) {
          eachIssueLength.push({ key: `l${j + 1}`, counter: [1] });
        } else {
          if (prevIdParts[j] === idParts[j]) {
            eachIssueLength[j].counter[eachIssueLength[j].counter.length - 1]++;
          } else {
            eachIssueLength[j].counter.push(1);
          }
        }

        prevIdParts[j] = idParts[j];
      }
    }

    // 1行目の下に罫線を設定
    const secondRow = ws.getRow(3);
    secondRow.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: "thin", color: { argb: "00000000" } },
      };

      // テキストを折り返して表示し、配置をセルの上にする
      cell.alignment = {
        wrapText: true,
        vertical: "top",
      };

      // 最大列の右に罫線を設定
      if (colNumber === ws.columns.length) {
        cell.border = {
          ...cell.border,
          right: { style: "thin", color: { argb: "00000000" } },
        };
      }
    });

    for (let i = 0; i < eachIssueLength.length; i++) {
      const column = i + 3; // Column index (starting from 2)
      const counters = eachIssueLength[i].counter;

      for (let j = 0; j < counters.length; j++) {
        const rowCount = counters[j]; // Number of rows with border
        const startRow = sumArray(counters.slice(0, j)) + 2; // Starting row index (starting from 2)

        for (let k = 0; k < rowCount; k++) {
          const row = startRow + k;
          const currentCounter = counters[j];

          // Add border to the cell below
          // Adjust the style and color as needed
          if (k === rowCount - 1) {
            const cell = ws.getCell(`${getColumnName(column)}${row + 1}`);
            cell.border = {
              bottom: { style: "thin", color: { argb: "00000000" } },
            };
          }
          if (k === 0) {
            const cell = ws.getCell(`${getColumnName(column)}${row + 1}`);
            cell.border = {
              top: { style: "thin", color: { argb: "00000000" } },
            };
          }
        }
      }
    }

    // Function to accumulate the values in an array
    function accumulateArray(arr: any) {
      let sum = 0;
      return arr.map((value: number) => (sum += value));
    }

    // Function to calculate the sum of an array
    function sumArray(arr: any) {
      return arr.reduce((sum: any, value: any) => sum + value, 0);
    }

    // Function to get the column name based on the column index
    function getColumnName(index: any) {
      let name = "";
      while (index > 0) {
        let remainder = (index - 1) % 26;
        name = String.fromCharCode(65 + remainder) + name;
        index = Math.floor((index - 1) / 26);
      }
      return name;
    }

    // 1行目の上に罫線を設定
    const firstRow = ws.getRow(2);
    firstRow.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: "thin", color: { argb: "00000000" } },
      };

      // テキストを折り返して表示し、配置をセルの上にする
      cell.alignment = {
        wrapText: true,
        vertical: "top",
      };

      // 最大列の右に罫線を設定
      if (colNumber === ws.columns.length) {
        cell.border = {
          ...cell.border,
          right: { style: "thin", color: { argb: "00000000" } },
        };
      }
    });

    // 最大行の下に罫線を設定
    const lastRow = ws.getRow(ws.rowCount);
    lastRow.eachCell((cell, colNumber) => {
      // セルの値が空でない場合、上部にも罫線を引く
      if (cell.value) {
        cell.border = {
          top: { style: "thin", color: { argb: "00000000" } },
          bottom: { style: "thin", color: { argb: "00000000" } },
        };
      } else {
        cell.border = {
          bottom: { style: "thin", color: { argb: "00000000" } },
        };
      }

      // テキストを折り返して表示し、配置をセルの上にする
      cell.alignment = {
        wrapText: true,
        vertical: "top",
      };
    });

    // 全ての列の左右に罫線を引く
    ws.eachRow((row, rowNumber) => {
      row.eachCell((cell, cellNumber) => {
        cell.border = {
          ...cell.border,
          left: { style: "thin", color: { argb: "00000000" } },
          right: { style: "thin", color: { argb: "00000000" } },
        };
      });
    });

    ws.eachRow((row, rowNumber) => {
      const cell = row.getCell(1); // Get the first cell of the row
      if (cell.border) {
        cell.border = {
          ...cell.border,
          top: undefined, // Remove the top border
          bottom: undefined, // Remove the bottom border
        };
      }
    });

    // ファイルを書き出す
    const buffer = await wb.xlsx.writeBuffer();

    // ArrayBufferをBlobに変換
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    const cleanFileName = (input: string) => {
      // 不適切な文字を取り除くか置換します
      return input
        .replace(/[\/:*?"<>|]/g, "") // これらの特殊文字を削除
        .replace(/\s+/g, "_"); // 空白文字をアンダースコアに置換
    };

    // ファイル名を作成
    const cleanedInterviewSheetName = cleanFileName(
      selectedInterviewSheet.interviewSheetName
    );
    const filename = `${cleanedInterviewSheetName}_${year}${month}${day}.xlsx`;

    // Blobをダウンロード
    saveAs(blob, filename);
  };

  const saveButtonStyle = isModalOpen
    ? "p-2 m-2 bg-green-500 text-white rounded-md shadow-lg opacity-50 md:block hidden h-10"
    : "p-2 m-2 bg-green-500 text-white rounded-md shadow-lg md:block hidden h-10";

  return (
    <button className={saveButtonStyle} onClick={handleExport}>
      <FontAwesomeIcon icon={faFileExcel} /> Export to Excel
    </button>
  );
};

export default ExcelExportButtonForInterviewSheet;
