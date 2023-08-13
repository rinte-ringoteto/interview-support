import React from "react";
import { InterviewSheet } from "../types";

interface InterviewSheetContextType {
  selectedInterviewSheet: InterviewSheet | null;
  setSelectedInterviewSheet: React.Dispatch<
    React.SetStateAction<InterviewSheet | null>
  >;
}

interface InterviewSheetProviderProps {
  children: React.ReactNode;
}

const InterviewSheetContext = React.createContext<
  InterviewSheetContextType | undefined
>(undefined);

export const InterviewSheetProvider: React.FC<InterviewSheetProviderProps> = ({
  children,
}) => {
  const [selectedInterviewSheet, setSelectedInterviewSheet] =
    React.useState<InterviewSheet | null>(null);

  return (
    <InterviewSheetContext.Provider
      value={{ selectedInterviewSheet, setSelectedInterviewSheet }}
    >
      {children}
    </InterviewSheetContext.Provider>
  );
};

export const useInterviewSheet = (): InterviewSheetContextType => {
  const context = React.useContext(InterviewSheetContext);
  if (context === undefined) {
    throw new Error(
      "useInterviewSheet must be used within a InterviewSheetProvider"
    );
  }
  return context;
};

export default InterviewSheetContext;
