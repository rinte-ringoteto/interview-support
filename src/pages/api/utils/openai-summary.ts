import { Configuration, OpenAIApi } from "openai";
import { db } from "../../../firebase/backend";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openAI = new OpenAIApi(configuration);

export const extractSummary = async (
  fieldName: string,
  matchingInterviewee: any,
  selectedInterviewSheet: any,
  answerResult: any
) => {
  console.log("開始");

  const maxAttempts = 5;

  let prompt = `You are to generate a summary for interview result.\n
    Background interview information is ${selectedInterviewSheet.background}.\n
    The information of nterviewee is ${matchingInterviewee.intervieweeInformation}\n.
    Answers of interviewee are ${answerResult}.\n
    Based on Answers of interviewee, please teach me summary of the interview.\n
    If the point of view is included in background interview information, answer with the the point of view.\n
    Answer in japanese.`;

  let attempt = 0;
  let success = false;
  while (attempt < maxAttempts && !success) {
    try {
      const completion = await openAI.createChatCompletion({
        model: "gpt-3.5-turbo-0613",
        messages: [{ role: "system", content: prompt }],
        max_tokens: 1000,
        n: 1,
        temperature: 1.0,
        top_p: 1,
      });
      const res = completion.data!.choices[0]!.message!.content;
      console.log(res);

      matchingInterviewee.answerSummary = res;

      selectedInterviewSheet.interviewees =
        selectedInterviewSheet.interviewees.map((interviewee: any) => {
          if (interviewee.intervieweeName === fieldName) {
            return matchingInterviewee; // update with the new object
          } else {
            return interviewee; // keep the original object
          }
        });

      console.log(selectedInterviewSheet.interviewees);

      const updateInterviewSheet = async (selectedInterviewSheet: any) => {
        await db
          .collection("interviewSheets")
          .doc(selectedInterviewSheet.id)
          .set(selectedInterviewSheet);
      };
      updateInterviewSheet(selectedInterviewSheet);

      success = true;
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed, retrying...`, error);
      attempt++;
    }
  }

  if (attempt === maxAttempts) {
    throw new Error("Max attempts exceeded, operation failed");
  }

  return selectedInterviewSheet;
};
