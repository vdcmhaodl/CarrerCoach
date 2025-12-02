"use client";

import { useLanguage } from "../context/LanguageContext";
import { useEffect, useState } from "react";

export function useLanguageWithMount() {
  const [mounted, setMounted] = useState(false);
  
  // Call useLanguage at the top level (required by React hooks rules)
  const languageContext = useLanguage();

  useEffect(() => {
    setMounted(true);
  }, []);

  return {
    mounted,
    ...languageContext,
  };
}
