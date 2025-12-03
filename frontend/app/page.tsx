"use client";

import { useState, useEffect } from "react";

export default function HomePage() {
  const fields: string[] = [
    "Software Engineer",
    "Data Scientist",
    "Product Manager",
    "UX Designer",
    "Business Analyst",
  ];

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

  return (
    <div className="flex flex-col bg-slate-100">
      <div className="navbar bg-base-100 shadow-sm">
        <div className="navbar-start" />

        <div className="navbar-center">
          <a className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-indigo-500 from-10% via-sky-500 via-30% to-emerald-500 to-90%">
            Career Coach
          </a>
        </div>

        <div className="navbar-end">
          <ul className="menu menu-horizontal px-1"></ul>
        </div>
      </div>
      <div className="flex flex-col grid-rows-5 gap-2.5 h-screen place-items-center">
        <h1 className="text-6xl font-semibold w-full text-center mt-40">
          <span className="text-transparent bg-clip-text bg-linear-to-r from-indigo-500 from-10% via-sky-500 via-30% to-emerald-500 to-90%">
            Career Coach
          </span>
        </h1>
        <h2 className="w-full text-center text-gray-600 font-semibold text-2xl mt-8">
          A quick way to prepare for your next interview in{" "}
          <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-cyan-600 transition-all duration-500">
            {currentField}
          </span>
        </h2>
        <p className="w-full text-center text-gray-500 text-lg mt-4 max-w-2xl px-4">
          Upload your CV, get personalized feedback, and find jobs that match
          your skills
        </p>
        <a href="/CareerCoach/start" className="mt-8">
          <button className="btn btn-lg px-20 py-6 rounded-full text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all text-white border-none bg-gradient-to-r from-indigo-500 from-10% via-sky-500 via-30% to-emerald-500 to-90%">
            Start Your Journey
          </button>
        </a>

        {/* <div className="mt-12 flex gap-6">
          <a
            href="/InterviewWarmup/start"
            className="text-gray-600 hover:text-indigo-600 transition-colors"
          >
            Or try Interview Warmup →
          </a>
        </div> */}
      </div>
    </div>
  );
}
