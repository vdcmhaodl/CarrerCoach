"use client";

import React, { useState, useEffect } from "react";
import { useLanguageWithMount } from "../../hooks/useLanguageWithMount";
import { lazy, Suspense } from "react";

export const dynamic = 'force-dynamic';

const LanguageSwitcherComponent = lazy(() => import("../../components/LanguageSwitcher").then(mod => ({ default: mod.LanguageSwitcher })));

const MOCK_TASKS = [
  "task.network",
  "task.develop",
  "task.support",
  "task.manage",
  "task.collaborate",
];

const MOCK_SKILLS = [
  "skill.technicalSupport",
  "skill.networkAdmin",
  "skill.systemMaintenance",
  "skill.problemSolving",
  "skill.userTraining",
  "skill.dataManagement",
  "skill.cybersecurity",
  "skill.projectCoordination",
];

export default function Start() {
  const { t, mounted } = useLanguageWithMount();
  const [step, setStep] = useState("intro");
  const [modal, setModel] = useState("model");
  const [role, setRole] = useState("");
  const [org, setOrg] = useState("");
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [cvAdvice, setCvAdvice] = useState<string | null>(null);

  useEffect(() => {
    if (step === "loading") {
      const timer = setTimeout(() => setStep("tasks"), 2000);
      return () => clearTimeout(timer);
    }
    if (step === "analyzing") {
      const timer = setTimeout(() => setStep("advice"), 2000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleTaskToggle = (task: string) => {
    if (selectedTasks.includes(task)) {
      setSelectedTasks(selectedTasks.filter((t) => t !== task));
    } else {
      setSelectedTasks([...selectedTasks, task]);
    }
  };

  const handleSkillToggle = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  if (!mounted) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 max-w-4xl mx-auto transition-all duration-300">
      <div className="fixed top-4 right-4 z-50">
        <Suspense fallback={null}>
          <LanguageSwitcherComponent />
        </Suspense>
      </div>

      {(step === "org" ||
        step === "loading" ||
        step === "tasks" ||
        step === "skills") && (
        <div className="fixed top-10 left-10 md:left-20 text-left transition-all">
          <h3 className="text-2xl md:text-4xl font-bold text-gray-800">
            {role}
          </h3>
          {org && <h4 className="text-xl md:text-2xl text-gray-500">{org}</h4>}
        </div>
      )}

      {step === "intro" && (
        <div className="text-center space-y-6 fade-in">
          <div className="text-6xl animate-bounce">{t("careerStart.greeting")}</div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-800">
            {t("careerStart.intro")}
          </h1>
          <button
            className="btn btn-primary mt-8 btn-lg rounded-full px-12"
            onClick={() => setStep("role")}
          >
            {t("careerStart.letsGo")}
          </button>
        </div>
      )}

      {step === "role" && (
        <div className="w-full max-w-2xl space-y-6">
          <label className="text-3xl md:text-5xl font-bold text-gray-400 block mb-4">
            {t("careerStart.intro")}
          </label>
          <input
            autoFocus
            type="text"
            placeholder={t("careerStart.rolePlaceholder")}
            className="w-full text-4xl md:text-4xl font-bold bg-transparent border-none outline-none placeholder-gray-200 text-gray-800 border-b-2 focus:border-blue-500 transition-colors"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && role && setStep("org")}
          />
          <div className="flex justify-end mt-8">
            <button
              disabled={!role}
              className="btn btn-primary px-10 rounded-full"
              onClick={() => setStep("org")}
            >
              {t("careerStart.next")}
            </button>
          </div>
        </div>
      )}

      {step === "org" && (
        <div className="w-full max-w-2xl space-y-6 pt-20">
          {" "}
          <input
            autoFocus
            type="text"
            placeholder={t("careerStart.orgPlaceholder")}
            className="w-full text-3xl md:text-4xl font-bold bg-transparent border-none outline-none placeholder-gray-200 text-gray-500"
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setStep("loading")}
          />
          <div className="flex gap-4 mt-8">
            <button className="btn btn-ghost" onClick={() => setStep("role")}>
              {t("careerStart.back")}
            </button>
            <button
              className="btn btn-primary px-10 rounded-full"
              onClick={() => setStep("loading")}
            >
              {t("careerStart.next")}
            </button>
          </div>
        </div>
      )}

      {step === "loading" && (
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 mt-4">
            {t("careerStart.generating")}
          </p>
        </div>
      )}

      {step === "tasks" && (
        <div className="w-full pt-32 pb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl text-gray-500">
              {t("careerStart.selectTasks")} {role} {t("careerStart.selectTasksOptional")}
            </h2>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => {
                if (selectedTasks.length === MOCK_TASKS.length) {
                  setSelectedTasks([]);
                } else {
                  setSelectedTasks([...MOCK_TASKS]);
                }
              }}
            >
              {selectedTasks.length === MOCK_TASKS.length ? "Deselect All" : t("careerStart.selectAll")}
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {MOCK_TASKS.map((taskKey, idx) => (
              <div
                key={idx}
                onClick={() => handleTaskToggle(taskKey)}
                className={`p-6 rounded-xl border-2 cursor-pointer transition-all text-lg
                  ${
                    selectedTasks.includes(taskKey)
                      ? "border-blue-500 bg-blue-50 text-blue-900 shadow-md"
                      : "border-gray-100 bg-white hover:border-gray-200 text-gray-600"
                  }`}
              >
                {t(taskKey)}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-8">
            <button className="btn btn-ghost" onClick={() => setStep("org")}>
              {t("careerStart.back")}
            </button>
            <button
              className="btn btn-primary px-10 rounded-full"
              onClick={() => setStep("skills")}
            >
              {t("careerStart.next")}
            </button>
          </div>
        </div>
      )}

      {step === "skills" && (
        <div className="w-full pt-32">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl text-gray-500">
              {t("careerStart.selectSkills")}
            </h2>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => {
                if (selectedSkills.length === MOCK_SKILLS.length) {
                  setSelectedSkills([]);
                } else {
                  setSelectedSkills([...MOCK_SKILLS]);
                }
              }}
            >
              {selectedSkills.length === MOCK_SKILLS.length ? "Deselect All" : t("careerStart.selectAll")}
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {MOCK_SKILLS.map((skillKey, idx) => (
              <button
                key={idx}
                onClick={() => handleSkillToggle(skillKey)}
                className={`px-6 py-3 rounded-full text-lg font-medium transition-all
                   ${
                     selectedSkills.includes(skillKey)
                       ? "bg-green-100 text-green-800 ring-2 ring-green-400"
                       : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                   }`}
              >
                {t(skillKey)}
              </button>
            ))}
            <button className="px-6 py-3 rounded-full border-2 border-dashed border-gray-300 text-gray-400 hover:border-gray-400">
              {t("careerStart.moreSkills")}
            </button>
          </div>
          {selectedSkills.length < 3 && (
            <div className="text-red-500 text-lg font-semibold mt-6 text-center">
              {t("careerStart.skillsWarning")}
            </div>
          )}
          <div className="flex justify-between mt-12">
            <button className="btn btn-ghost" onClick={() => setStep("tasks")}>
              {t("careerStart.back")}
            </button>
            <button
              className="btn btn-primary px-10 rounded-full"
              onClick={() => setStep("result")}
              disabled={selectedSkills.length < 3}
            >
              {t("careerStart.next")}
            </button>
          </div>
        </div>
      )}

      {step === "result" && (
        <div className="flex flex-col w-full h-screen pt-10">
          <div className="bg-gray-50 p-8 rounded-3xl shadow-sm border border-gray-100">
            <div className="badge badge-accent badge-lg mb-4">
              {t("careerStart.identityBadge")}
            </div>
            <p className="text-2xl md:text-3xl leading-relaxed text-gray-700">
              {t("careerStart.identityText")} <span className="font-bold text-indigo-600">{role}</span>{" "}
              {t("careerStart.identityText2")}{" "}
              <span className="font-bold text-emerald-600">
                {selectedSkills.slice(0, 3).map(sk => t(sk)).join(", ")}
              </span>
              ...
            </p>
          </div>
          <div className="mt-8 text-center">
            <button
              className="btn btn-info btn-wide rounded-full text-white text-lg"
              onClick={() => setStep("analyzing")}
            >
              {t("careerStart.explorePaths")}
            </button>
          </div>
        </div>
      )}

      {/* STEP: Analyzing (Loading AI) */}
      {step === "analyzing" && (
        <div className="text-center animate-in fade-in duration-700">
          <span className="loading loading-dots loading-lg text-info"></span>
          <p className="text-3xl font-bold mt-6 animate-pulse text-gray-800">
            {t("careerStart.consulting")}
          </p>
          <p className="text-gray-500 mt-2">
            {t("careerStart.matching")}
          </p>
        </div>
      )}

      {step === "advice" && (
        <div className="w-full pt-32 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">
            {t("careerStart.uploadCV")}
          </h2>
          <p className="text-gray-600 mb-6">
            {t("careerStart.uploadDesc")}
          </p>

          <div className="bg-gray-50 p-8 rounded-3xl shadow-sm border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
            <div className="text-center">
              <div className="text-6xl mb-4">📄</div>
              <input
                type="file"
                id="cv-upload"
                accept=".pdf,.doc,.docx,image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // TODO: Handle file upload and send to backend for analysis
                    console.log("File selected:", file.name);
                    setCvAdvice(
                      "Analyzing your CV... (Backend integration coming soon)"
                    );
                  }
                }}
              />
              <label
                htmlFor="cv-upload"
                className="btn btn-primary btn-lg rounded-full px-12 cursor-pointer"
              >
                {t("careerStart.chooseFile")}
              </label>
              <p className="text-sm text-gray-500 mt-4">
                {t("careerStart.supportedFormats")}
              </p>
            </div>
          </div>

          {cvAdvice && (
            <div className="mt-8 bg-blue-50 p-6 rounded-2xl border border-blue-200">
              <div className="badge badge-info badge-lg mb-3">{t("careerStart.aiAnalysis")}</div>
              <p className="text-lg text-gray-700">{cvAdvice}</p>
            </div>
          )}

          <div className="flex justify-between mt-8">
            <button
              className="btn btn-ghost btn-wide rounded-full text-lg"
              onClick={() => setStep("result")}
            >
              {t("careerStart.back")}
            </button>
            {cvAdvice && (
              <button
                className="btn btn-success btn-wide rounded-full text-lg text-white"
                onClick={() => {
                  // TODO: Navigate to next step or save results
                  alert("CV analysis complete! Ready for interview prep.");
                }}
              >
                {t("careerStart.continue")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
