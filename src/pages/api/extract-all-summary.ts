import { error } from "console";
import type { NextApiRequest, NextApiResponse } from "next";
import { extractAllSummary } from "./utils/openai-all-summary";

type Data = {
  message: string;
};

export default async function createIssue(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method === "POST") {
    const { selectedInterviewSheet } = req.body;

    let intervieweeInformations = selectedInterviewSheet.interviewees.map(
      (interviewee: any) => {
        return `${interviewee.intervieweeName}は${interviewee.intervieweeInformation}です`;
      }
    );

    console.log(intervieweeInformations);

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
            if (i === maxNumber) {
              resultString +=
                "についての" +
                "「" +
                contentObj[lProp] +
                "」" +
                "という質問に対し、";
            } else {
              resultString += "についての" + "「" + contentObj[lProp] + "」";
            }
          }
        }
      }

      keys.forEach((key) => {
        if (!key.startsWith("l") && key !== "id") {
          resultString += key + "は「" + contentObj[key] + "」という回答です。";
        }
      });
      return resultString;
    });

    console.log(answerResult);

    const updatedInterselectedInterviewSheet = await extractAllSummary(
      intervieweeInformations,
      answerResult,
      selectedInterviewSheet
    );

    res.status(200).json(updatedInterselectedInterviewSheet);
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
