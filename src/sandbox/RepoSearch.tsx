import { useEffect, useReducer, useState } from "react";

// One repository result from the GitHub search API.
// (The API returns many more fields; these are just the ones we render.)
type Repo = {
  id: number;
  full_name: string;
  stargazers_count: number;
  html_url: string;
};
type Status = "idle" | "loading" | "success" | "error";

type State = { status: Status; repos: Repo[]; error: string | null };

type Action =
  | { type: "start" }
  | { type: "success"; repos: Repo[] }
  | { type: "error"; message: string }
  | { type: "reset" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "start":
      return { ...state, status: "loading", error: null };
    case "success":
      return { status: "success", repos: action.repos, error: null };
    case "error":
      return { ...state, status: "error", error: action.message };
    case "reset":
      return { status: "idle", repos: [], error: null };
    default:
      return state;
  }
}

export default function RepoSearch() {
  // --- state: the fetch "state machine" ---
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [state, dispatch] = useReducer(reducer, {
    status: "idle",
    repos: [],
    error: null,
  });

  // --- effect 1: debounce `query` -> `debounced` (Lesson 4 pattern) ---
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);

  // --- effect 2: fetch whenever `debounced` changes ---
  useEffect(() => {
    //   1. if debounced === "" -> setRepos([]), setStatus("idle"), then `return` (bail early)
    if (debounced === "") {
      dispatch({ type: "reset" });
      return;
    }

    //   2. const controller = new AbortController();  setStatus("loading");
    const controller = new AbortController();
    dispatch({ type: "start" });
    //   3. inner async fn `run`:
    const run = async () => {
      try {
        const res = await fetch(
          `https://api.github.com/search/repositories?q=${encodeURIComponent(debounced)}&per_page=10`,
          { signal: controller.signal }, // this is how the controller aborts this request if needed.
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // success
        const data = await res.json();
        dispatch({ type: "success", repos: data.items ?? [] });
      } catch (err) {
        if ((err as Error).name === "AbortError") return; // cancelled, not a real error
        dispatch({ type: "error", message: (err as Error).message });
      }
    };
    //   4. call run();
    run();

    return () => controller.abort(); // cancels any in-flight requests.
  }, [debounced]);

  // --- render: you MUST handle all four states ---
  return (
    <div style={{ maxWidth: 560 }}>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search GitHub repositories..."
        aria-label="Search GitHub repositories"
        style={{ width: "100%", padding: 8, boxSizing: "border-box" }}
      />
      <div style={{ marginTop: 12 }}>
        {/* TODO — branch on `status`:
            - "idle":    a hint like "Start typing to search."
            - "loading": a "Loading…" indicator
            - "error":   show `error`
            - "success" && repos.length === 0: empty state ("No repositories found")
            - "success" && repos.length > 0:   a <ul> of repos
                 (map with key={repo.id}; show repo.full_name and ⭐ repo.stargazers_count) */}
        {(() => {
          switch (state.status) {
            case "idle":
              return <p>Start typing to search.</p>;
            case "loading":
              return <p>Loading…</p>;
            case "error":
              return <p>{state.error ?? "Something went wrong."}</p>;
            case "success":
              if (state.repos.length === 0) {
                return <p>No repositories found</p>;
              }

              return (
                <ul>
                  {state.repos.map((repo) => (
                    <li key={repo.id}>
                      <a href={repo.html_url} target="_blank" rel="noreferrer">
                        {repo.full_name}
                      </a>{" "}
                      ⭐ {repo.stargazers_count}
                    </li>
                  ))}
                </ul>
              );
          }
        })()}
      </div>
    </div>
  );
}
