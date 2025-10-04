import { useEffect, useState } from "react";
import RecordingPopup from "./RecordingPopup";
import "./RecordingWrapper.css";

function RecordingWrapper() {
  const [isRecording, setIsRecording] = useState(false);

  function start() {
    if (isRecording) {
      return;
    }
    setIsRecording(true);
  }

  function stop() {
    if (!isRecording) return;
    setIsRecording(false);
  }

  // Listeners for keyboard shortcuts
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (isRecording && document.visibilityState === "hidden") {
        stop();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isRecording, start, stop]);

  return (
    <>
      <div className="flex flex-col items-center justify-center mx-auto   mt-8 mb-8">
        <p className="md:text-3xl text-2xl w-3/4 p-4">
          I built an app that transcribes speech to text using the OpenAI
          Whisper model. Here's a waveform component I made from scratch below.
        </p>
        <div className="mt-4">
          {isRecording ? (
            <button className="shaf-btn" onClick={stop}>
              close the component
            </button>
          ) : (
            <button className="shaf-btn" onClick={start}>
              see the component
            </button>
          )}
        </div>
        <div className="mt-2">
          <RecordingPopup isRecording={isRecording} />
        </div>
      </div>
    </>
  );
}

export default RecordingWrapper;
