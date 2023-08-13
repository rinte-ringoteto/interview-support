import { Configuration, OpenAIApi } from "openai";
import { db } from "../../../firebase/backend";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openAI = new OpenAIApi(configuration);

export const generateQuestions = async (
  rowNumber: number,
  id: string,
  newRow: string,
  item: any,
  selectedOption: string,
  generateNumber: number,
  selectedInterviewSheet: any
) => {
  console.log("開始");
  console.log(process.env.OPENAI_API_KEY);

  let question = "";
  for (let i = 1; i <= rowNumber; i++) {
    question += item["l" + i];
    if (i !== rowNumber) {
      question += "の中の"; // Add 'の中の' between fields
    }
  }
  console.log(question);

  const maxAttempts = 5;

  let prompt;
  if (selectedOption === "インタビューシート") {
    prompt = `You are to generate an interview sheet.\n
    Generate interview points about ${question}.\n
    You need to consider these points are MECE (Mutually Exclusive and Collectively Exhaustive).\n
    Answer in japanese.\n
    Format is ["Content that you generated"].\n
    The number of elements of this list is ${generateNumber}.\n
    You have to generate only list format.`;
  } else {
    throw new Error("Invalid option.");
  }

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
      let responseArray;
      try {
        if (res) {
          responseArray = JSON.parse(res);
        } else {
          // handle the case where res is undefined
          console.error("res is undefined");
          throw new Error("Response from GPT-3 is undefined.");
        }
      } catch (e) {
        console.error("Unable to parse the response into an array.", e);
        throw e;
      }
      if (Array.isArray(responseArray)) {
        const newItems = responseArray.map((content, index) => {
          const newItem = { ...item };
          let idParts = newItem["id"].split("-");
          let rowNumber = parseInt(newRow.replace("l", ""));
          const addIndex = index + 1;
          if (isNaN(parseInt(idParts[rowNumber - 1]))) {
            idParts.push(addIndex.toString());
          } else {
            idParts[rowNumber - 1] = (
              parseInt(idParts[rowNumber - 1]) + index
            ).toString();
          }
          content = content.replace(/,/g, "、");
          newItem["id"] = idParts.join("-");
          newItem[newRow] = content;
          return newItem;
        });
        // idが一致するアイテムまたはその子アイテムをselectedInterviewSheet.contentから削除
        const updatedContent = selectedInterviewSheet.content.filter(
          (contentItem: any) => {
            // newItems 内の全てのアイテムについてチェック
            for (let newItem of newItems) {
              const newItemParentId = newItem.id.substring(
                0,
                newItem.id.lastIndexOf("-")
              );
              if (
                contentItem.id === newItemParentId ||
                contentItem.id === newItem.id ||
                contentItem.id.startsWith(newItem.id + "-")
              ) {
                return false;
              }
            }
            return true;
          }
        );
        // newItemsをupdatedContentに追加
        updatedContent.push(...newItems);
        // selectedInterviewSheet.contentを更新
        selectedInterviewSheet.content = updatedContent;
        console.log(selectedInterviewSheet);
        const updateInterviewSheet = async (selectedInterviewSheet: any) => {
          await db
            .collection("interviewSheets")
            .doc(selectedInterviewSheet.id)
            .set(selectedInterviewSheet);
        };
        updateInterviewSheet(selectedInterviewSheet);
      }
      // If we reached this point, the operation was successful
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
