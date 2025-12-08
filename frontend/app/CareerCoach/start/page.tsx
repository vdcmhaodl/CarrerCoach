"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Start() {
  const router = useRouter();
  const [step, setStep] = useState("upload");
  const [cvText, setCvText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const [extractedTasks, setExtractedTasks] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [manualRole, setManualRole] = useState("");
  const [manualCompany, setManualCompany] = useState("");
  const [manualSkillsInput, setManualSkillsInput] = useState("");

  const handleFileUpload = async (file: File) => {
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("http://localhost:8000/api/upload-cv", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (uploadData.error) {
        alert(`Lỗi: ${uploadData.error}`); // Vietsub
        setAnalyzing(false);
        return;
      }

      setCvText(uploadData.cv_text);

      const analysisRes = await fetch("http://localhost:8000/api/analyze-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cv_text: uploadData.cv_text }),
      });

      const analysisData = await analysisRes.json();
      if (analysisData.error) {
        alert(`Lỗi phân tích: ${analysisData.error}`); // Vietsub
        setAnalyzing(false);
        return;
      }

      setExtractedSkills(analysisData.skills || []);
      setExtractedTasks(analysisData.recommended_tasks || []);
      setAnalysisResult(analysisData);
      setStep("skills");
    } catch (error) {
      console.error("CV Upload Error:", error);
      alert("Tải lên CV thất bại. Vui lòng thử lại."); // Vietsub
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSkillToggle = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleTaskToggle = (task: string) => {
    setSelectedTasks((prev) =>
      prev.includes(task) ? prev.filter((t) => t !== task) : [...prev, task]
    );
  };

  const handleSelectAllSkills = () => {
    if (selectedSkills.length === extractedSkills.length) {
      setSelectedSkills([]);
    } else {
      setSelectedSkills([...extractedSkills]);
    }
  };

  const handleManualInput = () => {
    if (!manualRole) {
      alert("Vui lòng nhập vai trò hiện tại của bạn");
      return;
    }
    const skills = manualSkillsInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s);

    // --- KHU VỰC CẦN SỬA 1: Dữ liệu mặc định khi nhập thủ công ---
    setExtractedSkills(
      skills.length > 0
        ? skills
        : ["Giao tiếp", "Giải quyết vấn đề", "Làm việc nhóm"] // Đã Vietsub
    );
    setExtractedTasks([
      "Quản lý dự án",
      "Hợp tác với đội nhóm",
      "Bàn giao kết quả",
    ]); // Đã Vietsub

    setAnalysisResult({
      extracted_role: manualRole,
      skills: skills,
      experience_years: "Chưa xác định", // Đã Vietsub
      experience_summary: "Nhập thủ công - chưa có CV", // Đã Vietsub
      education: "Chưa xác định", // Đã Vietsub
      strengths: ["Tự chủ động", "Học hỏi nhanh"], // Đã Vietsub
      weaknesses: ["Kinh nghiệm chưa được ghi nhận rõ ràng"], // Đã Vietsub
      learning_path: {
        immediate: ["Xây dựng CV chuyên nghiệp"], // Đã Vietsub
        short_term: ["Lấy các chứng chỉ liên quan"], // Đã Vietsub
        long_term: ["Mở rộng mạng lưới quan hệ"], // Đã Vietsub
      },
      recommended_tasks: ["Quản lý dự án", "Hợp tác với đội nhóm"], // Đã Vietsub
    });
    setStep("skills");
  };

  const handleContinueToResult = () => {
    localStorage.setItem(
      "cvAnalysis",
      JSON.stringify({
        ...analysisResult,
        selectedSkills,
        selectedTasks,
      })
    );
    router.push("/CareerCoach/start/result");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 max-w-4xl mx-auto">
      {step === "upload" && (
        <div className="w-full max-w-3xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-linear-to-r from-indigo-500 from-10% via-sky-500 via-30% to-emerald-500 to-90% mb-4">
              Career Coach
            </h1>
            <p className="text-xl text-gray-600">
              Tải lên CV của bạn hoặc nhập thông tin của bạn theo cách thủ công
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-lg border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
            <div className="text-center">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-400"
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
              <input
                type="file"
                id="cv-upload"
                accept=".pdf,.doc,.docx,image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              <label
                htmlFor="cv-upload"
                className="btn btn-primary btn-lg rounded-full px-12 cursor-pointer"
              >
                Tải CV
              </label>
              <p className="text-sm text-gray-500 mt-4">
                Hỗ trợ: PDF, DOC, DOCX, PNG, JPG
              </p>

              <div className="divider">HOẶC</div>

              <button
                onClick={() => setStep("manual")}
                className="btn btn-outline btn-lg rounded-full px-12"
              >
                Nhập thủ công
              </button>
            </div>
          </div>

          {analyzing && (
            <div className="mt-8 text-center">
              <span className="loading loading-spinner loading-lg text-primary"></span>
              <p className="text-lg text-gray-600 mt-4">
                Đang phân tích CV của bạn bằng AI...
              </p>
            </div>
          )}
        </div>
      )}

      {step === "manual" && (
        <div className="w-full max-w-2xl">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Nhập thông tin của bạn
            </h2>
            <p className="text-gray-600">Điền thông tin chuyên môn của bạn</p>
          </div>

          <div className="space-y-6 bg-white p-8 rounded-2xl shadow-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vị trí hiện tại <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={manualRole}
                onChange={(e) => setManualRole(e.target.value)}
                placeholder="Ví dụ: Kĩ sư phần mềm, Quản lí dự án,..."
                className="input input-bordered w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Công ty (Tùy chọn)
              </label>
              <input
                type="text"
                value={manualCompany}
                onChange={(e) => setManualCompany(e.target.value)}
                placeholder="Ví dụ: Google, Microsoft,..."
                className="input input-bordered w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kỹ năng (Tùy chọn - phân tách bằng dấu phẩy)
              </label>
              <textarea
                value={manualSkillsInput}
                onChange={(e) => setManualSkillsInput(e.target.value)}
                placeholder="Ví dụ: JavaScript, Python, Quản lí dự án,..."
                className="textarea textarea-bordered w-full h-24"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep("upload")}
                className="btn btn-ghost btn-lg rounded-full flex-1"
              >
                Trở về
              </button>
              <button
                onClick={handleManualInput}
                className="btn btn-primary btn-lg rounded-full flex-1"
              >
                Tiếp tục
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "skills" && (
        <div className="w-full pt-20 pb-10">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Chọn kĩ năng của bạn
            </h2>
            <p className="text-gray-600">
              {analysisResult?.experience_summary ===
              "Nhập thủ công - chưa có CV"
                ? "Chọn hoặc thêm các kỹ năng mô tả tốt nhất về bạn."
                : "Chúng tôi đã tìm thấy những kỹ năng này trong CV của bạn. Hãy chọn những kỹ năng bạn muốn làm nổi bật."}
            </p>
          </div>

          <div className="flex justify-between items-center mb-6">
            {/* --- KHU VỰC CẦN SỬA 2: Chữ 'selected' --- */}
            <p className="text-sm text-gray-500">
              Đã chọn {selectedSkills.length} / {extractedSkills.length}
            </p>
            <button
              onClick={handleSelectAllSkills}
              className="btn btn-sm btn-outline"
            >
              {selectedSkills.length === extractedSkills.length
                ? "Bỏ chọn tất cả"
                : "Chọn tất cả"}
            </button>
          </div>

          <div className="flex flex-wrap gap-3 mb-8">
            {extractedSkills.map((skill, idx) => (
              <button
                key={idx}
                onClick={() => handleSkillToggle(skill)}
                className={`px-6 py-3 rounded-full text-lg font-medium transition-all ${
                  selectedSkills.includes(skill)
                    ? "bg-blue-500 text-white ring-2 ring-blue-300"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {skill}
              </button>
            ))}
          </div>

          <button
            onClick={() => setStep("tasks")}
            className="btn btn-lg px-20 py-6 rounded-full w-full text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all text-white border-none bg-gradient-to-r from-indigo-500 from-10% via-sky-500 via-30% to-emerald-500 to-90%"
            disabled={selectedSkills.length === 0}
          >
            Tiếp tục nhiệm vụ
          </button>
        </div>
      )}

      {step === "tasks" && (
        <div className="w-full pt-20 pb-10">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Chọn nhiệm vụ có liên quan
            </h2>
            <p className="text-gray-600">
              Chọn nhiệm vụ phù hợp nhất với kinh nghiệm của bạn (tùy chọn).
            </p>
          </div>

          <div className="flex flex-col gap-3 mb-8">
            {extractedTasks.map((task, idx) => (
              <div
                key={idx}
                onClick={() => handleTaskToggle(task)}
                className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedTasks.includes(task)
                    ? "border-blue-500 bg-blue-50 text-blue-900 shadow-md"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                {task}
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep("skills")}
              className="btn btn-ghost btn-lg rounded-full flex-1"
            >
              Trở về
            </button>
            <button
              onClick={handleContinueToResult}
              className="btn btn-lg px-20 py-6 rounded-full text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all text-white border-none bg-gradient-to-r from-indigo-500 from-10% via-sky-500 via-30% to-emerald-500 to-90%"
            >
              Xem kết quả phân tích
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
