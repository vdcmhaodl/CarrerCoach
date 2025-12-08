"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface AnalysisData {
  extracted_role: string;
  skills: string[];
  experience_years: string;
  experience_summary: string;
  education: string;
  strengths: string[];
  weaknesses: string[];
  learning_path: {
    immediate: string[];
    short_term: string[];
    long_term: string[];
  };
  recommended_tasks: string[];
  selectedSkills?: string[];
  selectedTasks?: string[];
}

export default function ResultPage() {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);

  useEffect(() => {
    const data = localStorage.getItem("cvAnalysis");
    if (data) {
      Promise.resolve().then(() => setAnalysis(JSON.parse(data)));
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-linear-to-r from-indigo-500 from-10% via-sky-500 via-30% to-emerald-500 to-90% ">
            Job Analyzing
          </h1>
          <p className="text-gray-600">
            Dựa trên CV của bạn, đây là những gì chúng tôi tìm thấy
          </p>
        </div>

        {analysis ? (
          <div className="space-y-6">
            {/* Role & Experience */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-2xl border border-blue-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <span className="text-lg font-bold text-blue-600">
                  Tổng quan về hồ sơ
                </span>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">
                {analysis.extracted_role}
              </h2>

              <div className="grid grid-cols-2 gap-6 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    Giáo dục
                  </p>
                  <ul className="space-y-1">
                    {analysis.education &&
                    analysis.education !== "Not specified" &&
                    analysis.education.trim() !== "" ? (
                      analysis.education
                        .split(/[,;]|\sand\s/)
                        .map((item: string, idx: number) => (
                          <li key={idx} className="text-base text-gray-700">
                            • {item.trim()}
                          </li>
                        ))
                    ) : (
                      <li className="text-base text-gray-700">
                        Không có thông tin giáo dục!
                      </li>
                    )}
                  </ul>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    Kinh nghiệm
                  </p>
                  <ul className="space-y-1">
                    {analysis.experience_years &&
                    analysis.experience_years !== "Not specified" &&
                    parseInt(analysis.experience_years) > 0 ? (
                      <>
                        <li className="text-base text-gray-700">
                          • {analysis.experience_years}
                        </li>
                        {analysis.experience_summary && (
                          <li className="text-base text-gray-700">
                            • {analysis.experience_summary}
                          </li>
                        )}
                      </>
                    ) : (
                      <li className="text-base text-gray-700">
                        Không có kinh nghiệm làm việc!
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                  />
                </svg>
                <span className="text-lg font-bold text-blue-600">
                  Kỹ năng của bạn
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(analysis.selectedSkills || analysis.skills).map(
                  (skill, idx) => (
                    <span
                      key={idx}
                      className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-medium"
                    >
                      {skill}
                    </span>
                  )
                )}
              </div>
            </div>

            {/* Strengths */}
            <div className="bg-green-50 p-6 rounded-2xl border border-green-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-lg font-bold text-green-600">
                  Điểm mạnh (Ưu điểm)
                </span>
              </div>
              <ul className="space-y-2">
                {analysis.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">•</span>
                    <span className="text-gray-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Weaknesses */}
            <div className="bg-orange-50 p-6 rounded-2xl border border-orange-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <svg
                  className="w-6 h-6 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span className="text-lg font-bold text-orange-600">
                  Những lĩnh vực cần cải thiện (Nhược điểm)
                </span>
              </div>
              <ul className="space-y-2">
                {analysis.weaknesses.map((weakness, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-orange-600 mt-1">•</span>
                    <span className="text-gray-700">{weakness}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Learning Path */}
            <div className="bg-purple-50 p-6 rounded-2xl border border-purple-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
                <span className="text-lg font-bold text-purple-600">
                  Lộ trình học tập được cá nhân hóa
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl">
                  <h4 className="font-bold text-purple-700 mb-2">
                    Ngay lập tức (Bây giờ)
                  </h4>
                  <ul className="space-y-1">
                    {analysis.learning_path.immediate.map((item, idx) => (
                      <li key={idx} className="text-sm text-gray-700">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white p-4 rounded-xl">
                  <h4 className="font-bold text-purple-700 mb-2">
                    Ngắn hạn (3-6 tháng)
                  </h4>
                  <ul className="space-y-1">
                    {analysis.learning_path.short_term.map((item, idx) => (
                      <li key={idx} className="text-sm text-gray-700">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white p-4 rounded-xl">
                  <h4 className="font-bold text-purple-700 mb-2">
                    Dài hạn (6-12 tháng)
                  </h4>
                  <ul className="space-y-1">
                    {analysis.learning_path.long_term.map((item, idx) => (
                      <li key={idx} className="text-sm text-gray-700">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
              <Link
                href="/CareerCoach/start"
                className="btn btn-ghost btn-lg rounded-full"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Bắt đầu lại
              </Link>
              <Link
                href="/InterviewWarmup/start"
                className="btn btn-lg rounded-full"
                style={{
                  backgroundColor: "#9333ea",
                  color: "white",
                  borderColor: "#9333ea",
                }}
              >
                Khởi động phỏng vấn
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </Link>
              <Link
                href="/results"
                className="btn btn-lg rounded-full"
                style={{
                  backgroundColor: "#2563eb",
                  color: "white",
                  borderColor: "#2563eb",
                }}
              >
                Đề xuất
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
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
              Không tìm thấy dữ liệu phân tích.
            </h2>
            <p className="text-gray-600 mb-6">
              Vui lòng tải CV của bạn lên trước để xem kết quả phân tích.
            </p>
            <Link
              href="/CareerCoach/start"
              className="btn btn-primary rounded-full px-8"
            >
              Vào phần Tải lên CV
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
