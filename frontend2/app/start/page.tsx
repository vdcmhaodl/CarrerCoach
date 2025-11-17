"use client";

import { useState } from "react";
// import { GoogleGenAI } from "@google/genai";

// const ai = new GoogleGenAI({
//   apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY,
// });

export default function Start() {
  const fields: string[] = [
    "Data Science",
    "Machine Learning",
    "Computer Systems",
    "Computer Science",
  ];

  const [selectedOption, setSelectedOption] = useState<string>("");
  const selectAction = (action: string) => {
    setSelectedOption(() => {
      console.log("Selected option:", action);
      return action;
    });
  };

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
        <div className="navbar-start"></div>

        <div className="navbar-center">
          <a className="text-xl text-transparent bg-clip-text bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500">
            coach warmup
          </a>
        </div>

        <div className="navbar-end">
          <ul className="menu menu-horizontal px-1">
            <li>
              <a>Link</a>
            </li>
            <li>
              <details>
                <summary>Parent</summary>
                <ul className="bg-base-100 rounded-t-none p-2">
                  <li>
                    <a>Link 1</a>
                  </li>
                  <li>
                    <a>Link 2</a>
                  </li>
                </ul>
              </details>
            </li>
          </ul>
        </div>
      </div>

      <div className="min-h-screen bg-slate-50">
        <div className="w-full max-w-xl mx-auto px-6 pt-16">
          {/* <h1 className="w-fit mx-auto text-2xl font-semibold mb-4 text-transparent bg-clip-text bg-linear-to-r from-indigo-500 via-purple-500 to-pink-500">
            coach warmup
          </h1> */}

          <h1 className="text-center text-slate-700 text-2xl font-sans">
            What field do you want to practice for?
          </h1>

          <div className="space-y-3 mt-20">
            {fields.map((field: string, idx: number) => (
              <label
                key={idx}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow transition"
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="radio-1"
                    className="radio"
                    value={field}
                    onChange={(e) => selectAction(e.currentTarget.value)}
                  />
                  <span className="text-slate-800">{field}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="mt-6 flex gap-3 justify-center">
            <a
              href={`/start/call?selectedOption=${selectedOption}`}
              className="w-full"
            >
              <button className="btn btn-primary w-full">Start</button>
            </a>
          </div>

          {/* <p className="mt-4 text-center">{llmResponse}</p> */}
        </div>
      </div>
    </div>
  );
}
