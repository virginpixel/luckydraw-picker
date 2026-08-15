"use client";

import { useSyncExternalStore } from "react";
import styles from "./page.module.css";

type ThemePreference = "system" | "dark" | "light";

const storageKey = "lucky-draw-theme";
const listeners = new Set<() => void>();
let currentTheme: ThemePreference = "system";
let loaded = false;

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "dark" || value === "light";
}

function applyTheme(theme: ThemePreference) {
  document.documentElement.dataset.theme = theme;
}

function loadTheme() {
  if (loaded || typeof window === "undefined") {
    return;
  }

  const storedTheme = window.localStorage.getItem(storageKey);
  currentTheme = isThemePreference(storedTheme) ? storedTheme : "system";
  applyTheme(currentTheme);
  loaded = true;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  loadTheme();
  return currentTheme;
}

function getServerSnapshot(): ThemePreference {
  return "system";
}

function selectTheme(theme: ThemePreference) {
  currentTheme = theme;
  loaded = true;
  window.localStorage.setItem(storageKey, theme);
  applyTheme(theme);
  listeners.forEach((listener) => listener());
}

const themes: Array<{
  value: ThemePreference;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    value: "system",
    label: "Use system theme",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.5" y="4.5" width="17" height="12" rx="1.5" />
        <path d="M8.5 20h7M12 16.5V20" />
      </svg>
    ),
  },
  {
    value: "dark",
    label: "Use dark theme",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z" />
      </svg>
    ),
  },
  {
    value: "light",
    label: "Use light theme",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="3.5" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
      </svg>
    ),
  },
];

export default function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return (
    <div className={styles.themeToggle} role="group" aria-label="Color theme">
      {themes.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-label={option.label}
          aria-pressed={theme === option.value}
          title={option.label}
          onClick={() => selectTheme(option.value)}
        >
          {option.icon}
        </button>
      ))}
    </div>
  );
}
