import { useEffect, useState, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

function initial(): Theme {
  return localStorage.getItem("theme") === "dark" ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

// Applied as soon as this file loads, so the page never flashes the wrong theme.
applyTheme(initial());

// For the toggle button: owns the choice and saves it.
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initial);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return { theme, toggle: () => setTheme((t) => (t === "light" ? "dark" : "light")) };
}

function subscribe(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

// For anything that only needs to react to the current theme (like the chart).
export function useCurrentTheme(): Theme {
  return useSyncExternalStore(
    subscribe,
    () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"),
    () => "light"
  );
}
