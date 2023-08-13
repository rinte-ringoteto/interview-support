import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider } from "../contexts/UserContext";
import { InterviewSheetProvider } from "../contexts/InterviewSheetContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <UserProvider>
      <InterviewSheetProvider>
        <Component {...pageProps} />
      </InterviewSheetProvider>
    </UserProvider>
  );
}
