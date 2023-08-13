import { useState, useEffect } from "react";

interface UseTranscribe {
  transcribing: boolean;
  transcript: string;
  setTranscribing: React.Dispatch<React.SetStateAction<boolean>>;
  setTranscript: React.Dispatch<React.SetStateAction<string>>;
}

export default function useTranscribe(): UseTranscribe {
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");

  useEffect(() => {
    let recognition: SpeechRecognition | null = null;

    function startTranscribing() {
      recognition = new (window.SpeechRecognition ||
        (window as any).webkitSpeechRecognition)();
      recognition.lang = "ja-JP"; // 言語を日本語に設定します
      recognition.interimResults = true; // 結果がまだ確定していない場合でも取得します

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            setTranscript(
              (prevTranscript) =>
                prevTranscript + event.results[i][0].transcript
            );
          }
        }
      };

      // 録音が何らかの理由で終了した時、再度録音を開始します
      recognition.onend = () => {
        if (transcribing) {
          recognition?.start();
        }
      };

      recognition.start();
    }

    function stopTranscribing() {
      if (recognition) {
        recognition.onend = () => {}; // 録音停止時のイベントハンドラを無効化
        recognition.stop();
        recognition = null;
      }
    }

    if (transcribing) {
      startTranscribing();
    } else {
      stopTranscribing();
    }

    return () => {
      stopTranscribing();
    };
  }, [transcribing]);

  return { transcribing, transcript, setTranscribing, setTranscript };
}
