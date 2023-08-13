import { User } from "firebase/auth";

export type TableRow = {
  id: string;
  l1: string;
  l2: string;
  l3: string;
  [key: string]: string;
};

export type Interviewee = {
  intervieweeName: string;
  intervieweeInformation: string;
  intervieweeId: number;
  createdAt: Date;
  answerSummary: string;
  transcript: string;
  // 他のプロパティもここに追加します
};
export type InterviewSheet = {
  id: string;
  interviewSheetName: string;
  userId: string;
  interviewSheetType: string;
  generateNumber: number;
  createdAt: Date;
  updatedAt: Date;
  interviewees: Interviewee[];
  background: string;
  interviewSummary: string;
  content: Array<{
    id: string;
    l1: string;
    l2: string;
    l3: string;
    [key: string]: any;
  }>;
};

export interface AppUser extends User {
  logicTreeList?: [];
  interviewSheetList?: [];
}
