"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguageWithMount } from "../../hooks/useLanguageWithMount";
import { lazy, Suspense } from "react";

export const dynamic = 'force-dynamic';

const LanguageSwitcherComponent = lazy(() => import("../../components/LanguageSwitcher").then(mod => ({ default: mod.LanguageSwitcher })));

const fields: string[] = [
  "field.dataScience",
  "field.machineLearning",
  "field.computerSystems",
  "field.computerScience",
];

export default function Start() {
  const { t, mounted } = useLanguageWithMount();
  const [selectedOption, setSelectedOption] = useState<string>("");
  
  const selectAction = (action: string) => {
    setSelectedOption(() => {
      console.log("Selected option:", action);
      return action;
    });
  };

  if (!mounted) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // const [llmResponse, setLLMResponse] = useState<string>("Sample text");
  // const getLLMResponse = async () => {
  //   const response = await ai.models.generateContent({
  //     model: "gemini-2.5-flash",
  //     contents: `Create 20 interview questions for these fields: ${selectedOption}`,
  //   });
  //   setLLMResponse(response.text || "No response");
  // };

  return (
    <div className="flex flex-col">
      <div className="navbar bg-base-100 shadow-sm">
        <div className="navbar-start">
          <Link href="/" className="btn btn-ghost text-xl">
            {t("nav.back")}
          </Link>
        </div>

        <div className="navbar-center">
          <a className="text-2xl text-transparent bg-clip-text bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500">
            interview warmup
          </a>
        </div>

        <div className="navbar-end">
          <ul className="menu menu-horizontal px-1">
            <li>
              <Suspense fallback={null}>
                <LanguageSwitcherComponent />
              </Suspense>
            </li>
          </ul>
        </div>
      </div>

      <div className="min-h-screen bg-slate-50">
        <div className="w-full max-w-xl mx-auto px-6 pt-16">
          <h1 className="text-center text-slate-700 text-2xl font-sans">
            {t("warmupStart.question")}
          </h1>

          <div className="space-y-3 mt-20">
            {fields.map((fieldKey: string, idx: number) => (
              <label
                key={idx}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow transition"
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="radio-1"
                    className="radio"
                    value={t(fieldKey)}
                    onChange={(e) => selectAction(e.currentTarget.value)}
                  />
                  <span className="text-slate-800">{t(fieldKey)}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="mt-6 flex gap-3 justify-center">
            <a
              href={`/InterviewWarmup/start/call?selectedOption=${selectedOption}`}
              className="w-full"
            >
              <button className="btn btn-primary w-full">{t("warmupStart.start")}</button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
