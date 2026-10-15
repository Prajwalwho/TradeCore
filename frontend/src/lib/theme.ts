import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function initial(): Theme {
  return localStorage.getItem("theme") === "dark" ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

// Applied as soon as this file loads, so the page never flashes the wrong theme.
applyTheme(initial());

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initial);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return { theme, toggle: () => setTheme((t) => (t === "light" ? "dark" : "light")) };
}
