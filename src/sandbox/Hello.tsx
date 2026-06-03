import { useState } from "react";

export default function Hello({ name }: { name: string }) {
  const [shouted, setShouted] = useState(false);

  function toggleShouted() {
    setShouted((prev) => !prev);
  }

  return (
    <>
      {shouted ? (
        <div> HELLO, {name.toUpperCase()}!</div>
      ) : (
        <div>Hello, {name}!</div>
      )}
      <button onClick={toggleShouted}>
        {shouted ? "Stop shouting" : "Shout"}
      </button>
    </>
  );
}
