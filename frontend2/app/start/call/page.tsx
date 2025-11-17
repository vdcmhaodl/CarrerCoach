"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

const CallPage: React.FC = () => {
  const searchParams = useSearchParams();
  const selectedOption = searchParams.get("selectedOption") || "";
  const [llmResponse, setLLMResponse] = useState<string>("");

  const [llmCalled, setLLMCalled] = useState<boolean>(false);
  const [backgroundQuestions, setBackgroundQuestions] = useState<string[]>([]);
  const [situationQuestions, setsituationQuestions] = useState<string[]>([]);
  const [technicalQuestions, settechnicalQuestions] = useState<string[]>([]);

  const getLLMResponse = async () => {
    setLLMResponse("Loading...");
    const res = await fetch("/api/AIGenerate", {
      method: "POST",
      headers: { "Content-type": "application/json" },
      body: JSON.stringify({ selectedOption }),
    });

    const data = await res.json();
    setLLMResponse(data.text ?? data.error ?? "No response");
    setLLMCalled(true);
  };

  useEffect(() => {
    if (llmCalled) {
      const regex = /^\*\s+\[(Background|Situation|Technical)]\s+(.+?)\s*$/gm;

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

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBackgroundQuestions(bgques);
      setsituationQuestions(sitques);
      settechnicalQuestions(tecques);
    }
  }, [llmResponse, llmCalled]);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-semibold mb-2">Start Call Page</h1>
      <p className="mb-4">Selected Option: {selectedOption}</p>

      <button className="btn btn-primary" onClick={() => getLLMResponse()}>
        Generate questions
      </button>

      <div className="tabs tabs-box mt-8">
        <input
          type="radio"
          name="my_tabs_6"
          className="tab"
          aria-label="Background"
          defaultChecked
        />
        <div className="tab-content bg-base-100 border-base-300 p-6">
          {backgroundQuestions.length === 0 ? (
            <p className="text-sm text-gray-500">No background questions yet</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {backgroundQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow"
                >
                  <span className="inline-block bg-pink-100 text-pink-700 text-xs font-medium px-2 py-1 rounded-full mb-2">
                    Background
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
          aria-label="Situation"
        />
        <div className="tab-content bg-base-100 border-base-300 p-6">
          {situationQuestions.length === 0 ? (
            <p className="text-sm text-gray-500">No situation questions yet</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {situationQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow"
                >
                  <span className="inline-block bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full mb-2">
                    Situational
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
          aria-label="Technical"
        />
        <div className="tab-content bg-base-100 border-base-300 p-6">
          {technicalQuestions.length === 0 ? (
            <p className="text-sm text-gray-500">No technical questions yet</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {technicalQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow"
                >
                  <span className="inline-block bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded-full mb-2">
                    Technical
                  </span>
                  <p className="text-sm text-gray-700">{q}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* <h1>Background</h1>
      <p>{backgroundQuestions.join("\n")}</p>
      <h1>Situation</h1>
      <p>{situationQuestions.join("\n")}</p>
      <h1>Technical</h1>
      <p>{technicalQuestions.join("\n")}</p> */}
    </div>
  );
};

export default CallPage;
