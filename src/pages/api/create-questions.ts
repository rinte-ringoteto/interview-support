import { error } from "console";
import type { NextApiRequest, NextApiResponse } from "next";
import { generateQuestions } from "./utils/openai-question";

type Data = {
  message: string;
};

export default async function createIssue(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method === "POST") {
    const {
      row,
      id,
      item,
      selectedOption,
      generateNumber,
      selectedInterviewSheet,
    } = req.body;

    console.log(row);

    const rowNumber = parseInt(row.substring(1)); // "l"の後ろの数字を取得
    const newRow = `l${rowNumber + 1}`;

    const newContent = selectedInterviewSheet.content.map(
      (contentItem: any) => {
        const idParts = contentItem.id.split("-");

        // idPartsのrowNumber番目までの数字が一致しているか確認
        const idPartsMatch =
          idParts.slice(0, rowNumber).join("-") ===
          id.split("-").slice(0, rowNumber).join("-");

        if (idPartsMatch) {
          // rowNumber + 2以上のフィールドを""にする
          for (let i = rowNumber + 2; i <= idParts.length; i++) {
            contentItem[`l${i}`] = "";
          }
        }
        return contentItem;
      }
    );

    selectedInterviewSheet.content = newContent;

    const updatedInterselectedInterviewSheet = await generateQuestions(
      rowNumber,
      id,
      newRow,
      item,
      selectedOption,
      generateNumber,
      selectedInterviewSheet
    );

    res.status(200).json(updatedInterselectedInterviewSheet);
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
