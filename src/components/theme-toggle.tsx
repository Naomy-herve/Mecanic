"use client";
import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";
const labels = {
  fr: { label: "Apparence", system: "Système", light: "Clair", dark: "Sombre" },
  en: { label: "Appearance", system: "System", light: "Light", dark: "Dark" },
  it: { label: "Aspetto", system: "Sistema", light: "Chiaro", dark: "Scuro" },
};

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  const [locale, setLocale] = useState<keyof typeof labels>("fr");

  useEffect(() => {
    const saved = window.localStorage.getItem("kia-piece-theme");
    const initial: Theme = saved === "light" || saved === "dark" ? saved : "system";
    setTheme(initial);
    const path = window.location.pathname;
    setLocale(path.startsWith("/en") ? "en" : path.startsWith("/it") ? "it" : "fr");
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme === "system" ? "light dark" : theme;
    if (theme === "system") window.localStorage.removeItem("kia-piece-theme");
    else window.localStorage.setItem("kia-piece-theme", theme);
  }, [theme]);

  const t = labels[locale];
  return (
    <label className="theme-control">
      <span className="theme-control-icon" aria-hidden="true">{theme === "dark" ? "☾" : theme === "light" ? "☀" : "◐"}</span>
      <span className="sr-only">{t.label}</span>
      <select aria-label={t.label} value={theme} onChange={(event) => setTheme(event.target.value as Theme)}>
        <option value="system">{t.system}</option>
        <option value="light">{t.light}</option>
        <option value="dark">{t.dark}</option>
      </select>
    </label>
  );
}
