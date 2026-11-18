"use client";

import { useLayoutEffect } from "react";

export default function LocaleDocumentLanguage({ locale }: { locale: "en" | "it" }) {
  useLayoutEffect(() => {
    document.documentElement.lang = locale;
    return () => {
      document.documentElement.lang = "fr";
    };
  }, [locale]);

  return null;
}
