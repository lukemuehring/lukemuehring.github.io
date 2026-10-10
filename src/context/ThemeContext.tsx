import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type ThemeContextValue = {
  darkMode: boolean;
  toggle: () => void;
};

// `null` default so a missing Provider is detectable (see useTheme guard below).
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Lazy initializer (runs once): localStorage > system preference > time-based fallback.
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved !== null) {
      return saved === "true";
    }
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    if (mediaQuery.media !== "not all") {
      return mediaQuery.matches;
    }
    const hour = new Date().getHours();
    return hour >= 19 || hour < 7;
  });

  // Sync the choice to localStorage and the <html>/<body> `dark` class.
  useEffect(() => {
    localStorage.setItem("darkMode", String(darkMode));
    const htmlElement = document.documentElement;
    const bodyElement = htmlElement.getElementsByTagName("body")[0];
    if (darkMode) {
      htmlElement.classList.add("dark");
      bodyElement.classList.add("dark");
    } else {
      htmlElement.classList.remove("dark");
      bodyElement.classList.remove("dark");
    }
  }, [darkMode]);

  const toggle = () => setDarkMode((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ darkMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook so consumers never touch useContext directly, and we fail loudly
// if used outside the provider.
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside a <ThemeProvider>");
  }
  return ctx;
}
