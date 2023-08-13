import { OpenAI } from "langchain/llms/openai";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { RetrievalQAChain } from "langchain/chains";
import { HNSWLib } from "langchain/vectorstores/hnswlib";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { db } from "../../../firebase/backend";

export const outputMemo = async (
  fieldName: string,
  transcript: string,
  answerResult: any,
  selectedInterviewSheet: any
) => {
  try {
    // 以下の処理にエラーハンドリングを追加
    const model = new OpenAI({
      modelName: "gpt-3.5-turbo-0613",
      openAIApiKey: process.env.OPENAI_API_KEY,
      temperature: 0.9,
    });
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
    });
    const docs = await textSplitter.createDocuments([transcript]);

    const vectorStore = await HNSWLib.fromDocuments(
      docs,
      new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: "text-embedding-ada-002",
      })
    );

    for (let i = 0; i < answerResult.length; i++) {
      const prompt = `${answerResult[i]}.\n
            Answer in Japanese.`;
      const chain = RetrievalQAChain.fromLLM(model, vectorStore.asRetriever());
      const res = await chain.call({
        query: prompt,
      });

      console.log(i);
      console.log(res.text);
      selectedInterviewSheet.content[i][fieldName] = res.text;
    }

    console.log(selectedInterviewSheet);

    const updateInterviewSheet = async (selectedInterviewSheet: any) => {
      await db
        .collection("interviewSheets")
        .doc(selectedInterviewSheet.id)
        .set(selectedInterviewSheet);
    };

    await updateInterviewSheet(selectedInterviewSheet);
    return selectedInterviewSheet;
  } catch (error) {
    console.error("Error during outputMemo execution: ", error);
    throw error;
  }
};
