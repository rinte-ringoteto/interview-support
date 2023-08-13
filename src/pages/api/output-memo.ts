import type { NextApiRequest, NextApiResponse } from "next";
import { outputMemo } from "./utils/lc-memo";

type Data = {
  text: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data | { error: string }>
) {
  if (req.method === "POST") {
    try {
      const { fieldName, transcript, selectedInterviewSheet } = req.body;

      if (typeof fieldName !== "string") {
        res
          .status(400)
          .json({ error: "Invalid data format, expecting string" });
        return;
      }

      let answerResult = selectedInterviewSheet.content.map(
        (contentObj: any) => {
          let resultString = "";
          const keys = Object.keys(contentObj);
          let maxNumber = 0;

          keys.forEach((key) => {
            if (key.startsWith("l")) {
              const number = parseInt(key.substring(1));
              if (number > maxNumber) {
                maxNumber = number;
              }
            }
          });

          for (let i = 1; i <= maxNumber; i++) {
            const lProp = `l${i}`;

            if (i === 1) {
              if (contentObj.hasOwnProperty(lProp)) {
                resultString += "「" + contentObj[lProp] + "」";
              }
            } else {
              if (contentObj.hasOwnProperty(lProp)) {
                resultString += "についての" + "「" + contentObj[lProp] + "」";
              }
            }
          }

          return resultString;
        }
      );
      console.log(answerResult);

      const answer = await outputMemo(
        fieldName,
        transcript,
        answerResult,
        selectedInterviewSheet
      );

      res.status(200).json(answer);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
