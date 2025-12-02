"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useLanguageWithMount } from "../../../hooks/useLanguageWithMount";
import { lazy, Suspense } from "react";

export const dynamic = 'force-dynamic';

const LanguageSwitcherComponent = lazy(() => import("../../../components/LanguageSwitcher").then(mod => ({ default: mod.LanguageSwitcher })));

const CallPageContent: React.FC = () => {
  const { t, mounted } = useLanguageWithMount();
  const searchParams = useSearchParams();
  const selectedOption = searchParams.get("selectedOption") || "";
  const [llmResponse, setLLMResponse] = useState<string>("");
  const [llmCalled, setLLMCalled] = useState<boolean>(false);
  const [backgroundQuestions, setBackgroundQuestions] = useState<string[]>([]);
  const [situationQuestions, setsituationQuestions] = useState<string[]>([]);
  const [technicalQuestions, settechnicalQuestions] = useState<string[]>([]);

  useEffect(() => {
    if (llmCalled) {
      const regex = /^\*?\s*\[(Background|Situation|Technical)]\s+(.+?)\s*$/gm;

      let match: RegExpExecArray | null;
      type Category = "Background" | "Situation" | "Technical";

      const bgques: string[] = [];
      const sitques: string[] = [];
      const tecques: string[] = [];

      while ((match = regex.exec(llmResponse)) !== null) {
        const category = match[1] as Category;
        const question = match[2].trim();

        switch (category) {
          case "Background":
            bgques.push(question);
            break;
          case "Situation":
            sitques.push(question);
            break;
          case "Technical":
            tecques.push(question);
            break;
        }
      }

      setBackgroundQuestions(bgques);
      setsituationQuestions(sitques);
      settechnicalQuestions(tecques);
    }
  }, [llmResponse, llmCalled]);

  const getLLMResponse = async () => {
    setLLMResponse("Loading...");
    const res = await fetch(
      `http://localhost:8000/api/generate-questions?job_title=${encodeURIComponent(
        selectedOption
      )}`,
      { method: "POST" }
    );

    const data = await res.json();

    const questions = Array.isArray(data) ? data : data.questions;

    setLLMResponse(
      Array.isArray(questions)
        ? questions.join("\n")
        : data.error ?? "No response"
    );

    setLLMCalled(true);
  };

  if (!mounted) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="fixed top-4 right-4 z-50">
        <Suspense fallback={null}>
          <LanguageSwitcherComponent />
        </Suspense>
      </div>

      <h1 className="text-xl font-semibold mb-2">{t("call.title")}</h1>
      <p className="mb-4">{t("call.selectedOption")} {selectedOption}</p>

      <button className="btn btn-primary" onClick={() => getLLMResponse()}>
        {t("call.generateQuestions")}
      </button>

      <div className="tabs tabs-box mt-8">
        <input
          type="radio"
          name="my_tabs_6"
          className="tab"
          aria-label={t("call.background")}
          defaultChecked
        />
        <div className="tab-content bg-base-100 border-base-300 p-6">
          {backgroundQuestions.length === 0 ? (
            <p className="text-sm text-gray-500">{t("call.noBackground")}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {backgroundQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow"
                >
                  <span className="inline-block bg-pink-100 text-pink-700 text-xs font-medium px-2 py-1 rounded-full mb-2">
                    {t("call.background")}
                  </span>
                  <p className="text-sm text-gray-700">{q}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <input
          type="radio"
          name="my_tabs_6"
          className="tab"
          aria-label={t("call.situation")}
        />
        <div className="tab-content bg-base-100 border-base-300 p-6">
          {situationQuestions.length === 0 ? (
            <p className="text-sm text-gray-500">{t("call.noSituation")}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {situationQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow"
                >
                  <span className="inline-block bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full mb-2">
                    {t("call.situation")}
                  </span>
                  <p className="text-sm text-gray-700">{q}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <input
          type="radio"
          name="my_tabs_6"
          className="tab"
          aria-label={t("call.technical")}
        />
        <div className="tab-content bg-base-100 border-base-300 p-6">
          {technicalQuestions.length === 0 ? (
            <p className="text-sm text-gray-500">{t("call.noTechnical")}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {technicalQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow"
                >
                  <span className="inline-block bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded-full mb-2">
                    {t("call.technical")}
                  </span>
                  <p className="text-sm text-gray-700">{q}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function CallPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <CallPageContent />
    </Suspense>
  );
}
