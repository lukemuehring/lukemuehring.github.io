import Hello from "./Hello";

// Scratch page for lesson exercises. Reachable at /sandbox.
// This route is only wired up on the `react-lessons` branch, so it never ships.
export default function SandboxPage() {
  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", lineHeight: 1.5 }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Sandbox</h1>
      <p style={{ color: "#666" }}>
        Scratch space for React lesson exercises. Add new demos as sections below.
      </p>

      <section style={{ marginTop: "2rem" }}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
          Lesson 1 — Hello
        </h2>
        <Hello name="Luke" />
      </section>
    </div>
  );
}
