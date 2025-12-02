"use client";

import { useLanguageWithMount } from "@/app/hooks/useLanguageWithMount";

export const LanguageSwitcher = () => {
  const { language, setLanguage, mounted } = useLanguageWithMount();

  if (!mounted) {
    return null;
  }

  return (
    <div className="dropdown dropdown-end">
      <button
        tabIndex={0}
        className="btn btn-ghost btn-sm gap-2"
        title="Switch language"
      >
        <span className="text-lg">🌐</span>
        <span className="uppercase text-xs font-semibold">{language}</span>
      </button>
      <ul
        tabIndex={0}
        className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32"
      >
        <li>
          <a
            onClick={() => setLanguage("en")}
            className={language === "en" ? "active" : ""}
          >
            English
          </a>
        </li>
        <li>
          <a
            onClick={() => setLanguage("vi")}
            className={language === "vi" ? "active" : ""}
          >
            Tiếng Việt
          </a>
        </li>
      </ul>
    </div>
  );
};
