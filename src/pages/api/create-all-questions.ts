import { error } from "console";
import type { NextApiRequest, NextApiResponse } from "next";
import { generateAllQuestions } from "./utils/openai-all-questions";

type Data = {
  message: string;
};

export default async function createAllQuestion(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method === "POST") {
    const { row, selectedOption, generateNumber, selectedInterviewSheet } =
      req.body;

    const rowNumber = parseInt(row.substring(1)); // "l"の後ろの数字を取得
    const newRow = `l${rowNumber + 1}`;
    // console.log(selectedInterviewSheet);

    let uniqueRows;
    if (selectedInterviewSheet && selectedInterviewSheet.content) {
      uniqueRows = selectedInterviewSheet.content.filter(
        (item: any, index: number, self: any) => {
          return self.findIndex((i: any) => i[row] === item[row]) === index;
        }
      );
    }
    let outTargetRows = [];

    if (uniqueRows && uniqueRows.length > 0) {
      uniqueRows.forEach((row: any) => {
        let targetField = `l${rowNumber + 2}`; // フィールド名を作成
        if (row.hasOwnProperty(targetField)) {
          // フィールドが存在する場合
          row[targetField] = ""; // 値を空文字列に設定
        }
      });

      // Remove objects where the field specified by 'row' is "" or does not exist
      uniqueRows = uniqueRows.filter((item: any) => {
        const targetField = item[row];
        // Check if the field exists and is not empty
        return targetField !== undefined && targetField !== "";
      });

      // Filter out objects from selectedInterviewSheet.content that do not match the IDs in uniqueRows
      const uniqueIds = uniqueRows.map((row: any) => row.id);
      outTargetRows = selectedInterviewSheet.content.filter((item: any) => {
        return !uniqueIds.includes(item.id);
      });
    }

    console.log(row);
    console.log(uniqueRows); // ユニークな行を表示します。
    console.log(outTargetRows); // print the result array
    selectedInterviewSheet.content = [...uniqueRows];

    const updatedInterviewSheet = await generateAllQuestions(
      rowNumber,
      uniqueRows,
      outTargetRows,
      row,
      newRow,
      selectedOption,
      generateNumber,
      selectedInterviewSheet
    );

    res.status(200).json(updatedInterviewSheet);
  } else {
    res.status(405).json({ message: "Method not allowed" }); // Only POST method is allowed
  }
}
