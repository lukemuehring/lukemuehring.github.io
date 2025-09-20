import { useEffect, useState } from "react";
import RecordingPopup from "./RecordingPopup";

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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.ctrlKey && e.shiftKey && !isRecording) {
        e.preventDefault(); // Prevents page scrolling when Space is pressed
        start();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (isRecording) {
        if (e.code === "Space" || !e.ctrlKey || !e.shiftKey) {
          stop();
        }
      }
    };

    const handleVisibilityChange = () => {
      if (isRecording && document.visibilityState === "hidden") {
        stop();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isRecording, start, stop]);

  return (
    <>
      <div className="flex flex-col items-center justify-center mx-auto mb-8">
        <div className="text-xl">
          Hold Control + Shift + Space to test the component.
        </div>
      </div>
      <RecordingPopup isRecording={isRecording} />
    </>
  );
}

export default RecordingWrapper;
