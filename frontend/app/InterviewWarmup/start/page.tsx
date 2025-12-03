"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface AnalysisData {
  extracted_role: string;
  skills: string[];
  selectedSkills?: string[];
}

export default function Start() {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [customField, setCustomField] = useState("");
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  useEffect(() => {
    const data = localStorage.getItem("cvAnalysis");
    if (data) {
      setAnalysis(JSON.parse(data));
    }
  }, []);

  useEffect(() => {
    if (isGeneratingQuestions) {
      // Redirect to call page after 500ms to start loading
      const timer = setTimeout(() => {
        window.location.href = "/InterviewWarmup/start/call";
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isGeneratingQuestions]);

  const handleStart = () => {
    const field = customField || analysis?.extracted_role || "General";
    const skills = analysis?.selectedSkills || analysis?.skills || [];

    localStorage.setItem(
      "interviewContext",
      JSON.stringify({
        field,
        role: analysis?.extracted_role || field,
        skills,
      })
    );

    setIsGeneratingQuestions(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="btn btn-ghost mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 mb-2">
            Interview Warmup
          </h1>
          <p className="text-gray-600 text-lg">
            Practice interview questions based on your profile
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-lg">
          {analysis ? (
            <div className="space-y-6">
              <div className="bg-purple-50 p-6 rounded-xl border border-purple-200">
                <div className="badge badge-primary badge-lg mb-3">
                  Your Profile
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  {analysis.extracted_role}
                </h3>
                <div className="flex flex-wrap gap-2 mt-4">
                  {(analysis.selectedSkills || analysis.skills)
                    .slice(0, 5)
                    .map((skill, idx) => (
                      <span key={idx} className="badge badge-outline">
                        {skill}
                      </span>
                    ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customize field (optional):
                </label>
                <input
                  type="text"
                  value={customField}
                  onChange={(e) => setCustomField(e.target.value)}
                  placeholder={`Default: ${analysis.extracted_role}`}
                  className="input input-bordered w-full"
                />
              </div>

              {isGeneratingQuestions ? (
                <div className="text-center py-8">
                  <div className="relative inline-flex">
                    <span className="loading loading-spinner loading-lg text-purple-600"></span>
                  </div>
                  <p className="text-lg font-medium text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 mt-4">
                    Generating interview questions...
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleStart}
                  className="btn btn-lg btn-block rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-0 text-white font-semibold text-lg"
                  style={{background: 'linear-gradient(135deg, #9333ea 0%, #6366f1 100%)'}}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start Interview Practice
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg
                className="w-24 h-24 mx-auto mb-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h2 className="text-2xl font-bold text-gray-700 mb-2">
                No Profile Found
              </h2>
              <p className="text-gray-600 mb-6">
                Please complete Phase 1 (Career Dreamer) first to get
                personalized interview questions.
              </p>
              <div className="space-y-4">
                <Link
                  href="/CareerCoach/start"
                  className="btn btn-primary btn-block"
                >
                  Go to Phase 1
                </Link>
                <div className="divider">OR</div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter a field to practice:
                  </label>
                  <input
                    type="text"
                    value={customField}
                    onChange={(e) => setCustomField(e.target.value)}
                    placeholder="e.g., Software Engineer, Marketing Manager"
                    className="input input-bordered w-full mb-4"
                  />
                  {isGeneratingQuestions ? (
                    <div className="text-center py-4">
                      <span className="loading loading-spinner loading-md text-primary"></span>
                      <p className="text-sm text-gray-600 mt-2">
                        Generating questions...
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={handleStart}
                      className="btn btn-outline btn-block"
                    >
                      Start with Custom Field
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
