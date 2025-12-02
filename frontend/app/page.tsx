"use client";

import { useState, useEffect } from "react";
import { useLanguageWithMount } from "./hooks/useLanguageWithMount";
import { lazy, Suspense } from "react";

export const dynamic = 'force-dynamic';

const LanguageSwitcherComponent = lazy(() => import("./components/LanguageSwitcher").then(mod => ({ default: mod.LanguageSwitcher })));

export default function InterviewStart() {
  const { t, language, mounted } = useLanguageWithMount();

  const fieldsEn: string[] = [
    "Data Science",
    "Machine Learning",
    "Computer Systems",
    "Computer Science",
  ];

  const fieldsVi: string[] = [
    "Khoa Học Dữ Liệu",
    "Học Máy",
    "Hệ Thống Máy Tính",
    "Khoa Học Máy Tính",
  ];

  const fields = language === "en" ? fieldsEn : fieldsVi;
  const [currentField, setCurrentField] = useState(fields[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentField((prev) => {
        const currentIndex = fields.indexOf(prev);
        const nextIndex = (currentIndex + 1) % fields.length;
        return fields[nextIndex];
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [fields]);

  if (!mounted) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex flex-col bg-slate-100">
      <div className="navbar bg-base-100 shadow-sm">
        <div className="navbar-start" />

        <div className="navbar-center">
          <a className="text-2xl text-transparent bg-clip-text bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500">
            coach warmup
          </a>
        </div>

        <div className="navbar-end">
          <ul className="menu menu-horizontal px-1 gap-2">
            <li className="text-xl text-transparent bg-clip-text bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500">
              <a href="/CareerCoach">{t("nav.career")}</a>
            </li>
            <li>
              <Suspense fallback={null}>
                <LanguageSwitcherComponent />
              </Suspense>
            </li>
          </ul>
        </div>
      </div>
      <div className="flex flex-col grid-rows-5 gap-2.5 h-screen place-items-center">
        <h1 className="text-6xl font-semibold w-full text-center mt-40">
          {t("home.title")}{" "}
          <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500">
            {t("home.titleHighlight")}
          </span>
        </h1>
        <h2 className="text-base w-full text-center text-gray-500 mt-8">
          {t("home.subtitle")}
        </h2>
        <div className="badge badge-soft badge-info font-semibold text-lg">
          {currentField}
        </div>
        <h2 className="text-base w-full text-center mt-8 max-w-[36rem]">
          {t("home.description")}
        </h2>
        <a href="/InterviewWarmup/start" className="mt-5">
          <button className="btn btn-info rounded-xl">
            {t("home.button")}
          </button>
        </a>
      </div>
    </div>
  );
}

