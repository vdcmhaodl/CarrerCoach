"use client";

import Link from "next/link";
import { useLanguageWithMount } from "../hooks/useLanguageWithMount";
import { lazy, Suspense } from "react";

export const dynamic = 'force-dynamic';

const LanguageSwitcherComponent = lazy(() => import("../components/LanguageSwitcher").then(mod => ({ default: mod.LanguageSwitcher })));

export default function CareerCoachStart() {
  const { t, mounted } = useLanguageWithMount();
  
  if (!mounted) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  return (
    <div className="flex flex-col bg-slate-100">
      <div className="navbar bg-base-100 shadow-sm">
        <div className="navbar-start"></div>

        <div className="navbar-center">
          <a className="text-2xl text-transparent bg-clip-text bg-linear-to-r from-indigo-500 from-10% via-sky-500 via-30% to-emerald-500 to-90%">
            career coach
          </a>
        </div>

        <div className="navbar-end">
          <ul className="menu menu-horizontal px-1 gap-2">
            <li className="text-xl text-transparent bg-clip-text bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500">
              <Link href="/">{t("nav.warmup")}</Link>
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
        <h1 className="text-8xl font-semibold w-full text-center mt-40">
          {t("career.title")}{" "}
          <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-500 from-10% via-sky-500 via-30% to-emerald-500 to-90%">
            {t("career.highlight")}
          </span>
        </h1>
        <h2 className="w-full text-center text-gray-600 font-semibold text-2xl mt-8">
          {t("career.subtitle")}
        </h2>
        <a href="/CareerCoach/start" className="mt-5">
          <button className="btn btn-info px-20 py-6 rounded-xl">{t("career.button")}</button>
        </a>
      </div>
    </div>
  );
}
