import { Configuration, OpenAIApi } from "openai";
import { db } from "../../../firebase/backend";

type Item = {
  id: string;
  [key: string]: any; // 他の任意のプロパティを許容
};

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openAI = new OpenAIApi(configuration);

export const generateAllQuestions = async (
  rowNumber: number,
  uniqueRows: [],
  outTargetRows: [],
  row: string,
  newRow: string,
  selectedOption: string,
  generateNumber: number,
  selectedInterviewSheet: any
) => {
  console.log("全件開始");

  const maxAttempts = 5;

  for (let i = 0; i < uniqueRows.length; i++) {
    console.log(`${i + 1}回目`);

    let issue = "";
    for (let n = 1; n <= rowNumber; n++) {
      issue += uniqueRows[i]["l" + n];
      if (n !== rowNumber) {
        issue += "の中の"; // Add 'の中の' between fields
      }
    }
    console.log(issue);

    let prompt;
    if (selectedOption === "インタビューシート") {
      prompt = `You are to generate an interview sheet.\n
    Generate interview points about ${issue}.\n
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
          responseArray = JSON.parse(res);
        } catch (e) {
          throw new Error("Unable to parse the response into an array.");
        }

        if (Array.isArray(responseArray)) {
          const newItems = responseArray.map((content, index) => {
            const item: [] = uniqueRows[i];
            const newItem: Item = { id: "", ...item };

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

          if (i === uniqueRows.length - 1) {
            updatedContent.push(...outTargetRows);
          }

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
  }
  return selectedInterviewSheet;
};
