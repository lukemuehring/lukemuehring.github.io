import { useState } from "react";

// Lesson 3 — demonstrates why `key={index}` corrupts a list with per-row state.
//
// The trick that makes the bug VISIBLE: the per-row <input> is UNCONTROLLED
// (no value/onChange). Its text lives in the real DOM node. When React reuses a
// DOM node because its index key still "matches" after a delete, the stale typed
// text stays in that reused node and ends up next to a DIFFERENT row's data.

type Row = { id: number; label: string };

const INITIAL: Row[] = [
  { id: 1, label: "Apple" },
  { id: 2, label: "Banana" },
  { id: 3, label: "Cherry" },
  { id: 4, label: "Date" },
];

function RowList({
  rows,
  onDelete,
  keyMode,
}: {
  rows: Row[];
  onDelete: (id: number) => void;
  keyMode: "index" | "id";
}) {
  return (
    <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((row, index) => (
        // The ONLY difference between the two lists is this key:
        <li
          key={keyMode === "index" ? index : row.id}
          style={{ display: "flex", gap: 8, alignItems: "center" }}
        >
          <span style={{ width: 70 }}>{row.label}</span>
          {/* Uncontrolled on purpose — see file header. */}
          <input placeholder={`type for ${row.label}`} />
          <button onClick={() => onDelete(row.id)}>delete</button>
        </li>
      ))}
    </ul>
  );
}

export default function KeyBug() {
  const [rows, setRows] = useState<Row[]>(INITIAL);
  const deleteRow = (id: number) => setRows((prev) => prev.filter((r) => r.id !== id));

  return (
    <div>
      <p style={{ maxWidth: 560 }}>
        <strong>Try this:</strong> type a different word into every input in <em>both</em> lists,
        then click <em>delete</em> on the <strong>top</strong> row of each. The id-keyed list keeps
        each typed word with its row; the index-keyed list smears the words onto the wrong rows
        (and drops the last one), because React reuses DOM nodes by position.
      </p>
      <button onClick={() => setRows(INITIAL)} style={{ marginBottom: 16 }}>
        Reset rows
      </button>
      <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
        <div>
          <h3>❌ key = index</h3>
          <RowList rows={rows} onDelete={deleteRow} keyMode="index" />
        </div>
        <div>
          <h3>✅ key = row.id</h3>
          <RowList rows={rows} onDelete={deleteRow} keyMode="id" />
        </div>
      </div>
    </div>
  );
}
