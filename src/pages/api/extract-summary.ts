import { error } from "console";
import type { NextApiRequest, NextApiResponse } from "next";
import { extractSummary } from "./utils/openai-summary";

type Data = {
  message: string;
};

export default async function createIssue(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method === "POST") {
    const { fieldName, selectedInterviewSheet } = req.body;

    const matchingInterviewee = selectedInterviewSheet.interviewees.find(
      (interviewee: any) => interviewee.intervieweeName === fieldName
    );

    console.log(matchingInterviewee);

    let answerResult = selectedInterviewSheet.content.map((contentObj: any) => {
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

      if (contentObj.hasOwnProperty(fieldName)) {
        resultString += "」という質問の答えは「" + contentObj[fieldName] + "」";
      }

      return resultString;
    });

    const updatedInterselectedInterviewSheet = await extractSummary(
      fieldName,
      matchingInterviewee,
      selectedInterviewSheet,
      answerResult
    );

    res.status(200).json(updatedInterselectedInterviewSheet);
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
