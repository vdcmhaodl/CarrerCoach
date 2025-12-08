"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "../context/LanguageContext";
import { useUserProfile } from "../context/UserProfileContext";

export default function Dashboard() {
  const { t, language } = useLanguage();
  const { profile } = useUserProfile();

  if (!profile || !profile.role) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold mb-4">{t("dashboard.title")}</h1>
          <p className="text-gray-600 mb-6">
            Please complete your profile first to access the dashboard.
          </p>
          <Link href="/CareerCoach/start">
            <button className="btn btn-primary">Complete Profile</button>
          </Link>
        </div>
      </div>
    );
  }

  const stats = {
    sessionsCompleted: profile.performanceMetrics.sessionsCompleted,
    averageScore: Math.round(profile.performanceMetrics.averageScore),
    skillsImproved: profile.performanceMetrics.improvementAreas.length,
    jobsApplied: profile.appliedJobs.length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="navbar bg-base-100 shadow-sm">
        <div className="navbar-start">
          <Link href="/" className="btn btn-ghost text-xl">
            {t("nav.back")}
          </Link>
        </div>
        <div className="navbar-center">
          <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
            {t("dashboard.title")}
          </span>
        </div>
        <div className="navbar-end">
          <Link href="/jobs">
            <button className="btn btn-ghost">{t("nav.jobs")}</button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            {t("dashboard.welcome")},{" "}
            <span className="text-primary">{profile.role}</span>!
          </h1>
          <p className="text-gray-600">
            {profile.organization && `at ${profile.organization}`}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="stat bg-white shadow-lg rounded-xl">
            <div className="stat-figure text-primary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="inline-block w-8 h-8 stroke-current"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
            </div>
            <div className="stat-title">{t("dashboard.sessionsCompleted")}</div>
            <div className="stat-value text-primary">
              {stats.sessionsCompleted}
            </div>
          </div>

          <div className="stat bg-white shadow-lg rounded-xl">
            <div className="stat-figure text-secondary">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="inline-block w-8 h-8 stroke-current"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                ></path>
              </svg>
            </div>
            <div className="stat-title">{t("dashboard.averageScore")}</div>
            <div className="stat-value text-secondary">
              {stats.averageScore}%
            </div>
          </div>

          <div className="stat bg-white shadow-lg rounded-xl">
            <div className="stat-figure text-accent">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="inline-block w-8 h-8 stroke-current"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                ></path>
              </svg>
            </div>
            <div className="stat-title">{t("dashboard.skillsImproved")}</div>
            <div className="stat-value text-accent">{stats.skillsImproved}</div>
          </div>

          <div className="stat bg-white shadow-lg rounded-xl">
            <div className="stat-figure text-info">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="inline-block w-8 h-8 stroke-current"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                ></path>
              </svg>
            </div>
            <div className="stat-title">{t("dashboard.jobsApplied")}</div>
            <div className="stat-value text-info">{stats.jobsApplied}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Overview Card */}
          <div className="card bg-white shadow-lg">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">
                {t("dashboard.profile")}
              </h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-600 mb-2">Role</h3>
                  <p className="text-lg">{profile.role}</p>
                  {profile.organization && (
                    <p className="text-gray-500">{profile.organization}</p>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-gray-600 mb-2">
                    Skills ({profile.selectedSkills.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.selectedSkills.map((skill, idx) => (
                      <span key={idx} className="badge badge-primary badge-lg">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {profile.selectedTasks.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-600 mb-2">
                      Key Tasks ({profile.selectedTasks.length})
                    </h3>
                    <ul className="list-disc list-inside space-y-1">
                      {profile.selectedTasks.slice(0, 3).map((task, idx) => (
                        <li key={idx} className="text-sm text-gray-700">
                          {task}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="card-actions justify-end mt-4">
                  <Link href="/CareerCoach/start">
                    <button className="btn btn-outline btn-sm">
                      Edit Profile
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Interview Sessions Card */}
          <div className="card bg-white shadow-lg">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">
                {t("dashboard.interviews")}
              </h2>

              {profile.interviewSessions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">
                    No interview sessions yet
                  </p>
                  <Link href="/InterviewWarmup/start">
                    <button className="btn btn-primary">Start Practice</button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {profile.interviewSessions
                    .slice(-5)
                    .reverse()
                    .map((session, idx) => (
                      <div
                        key={session.id}
                        className="p-4 bg-slate-50 rounded-lg"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{session.field}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(session.date).toLocaleDateString(
                                language
                              )}
                            </p>
                            <p className="text-xs text-gray-400">
                              {session.questions.length} questions
                            </p>
                          </div>
                          {session.averageScore !== undefined && (
                            <div className="badge badge-success badge-lg">
                              {Math.round(session.averageScore)}%
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                  <Link href="/InterviewWarmup/start">
                    <button className="btn btn-primary btn-block mt-4">
                      New Session
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Job Applications Card */}
          <div className="card bg-white shadow-lg">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">
                {t("dashboard.jobs")}
              </h2>

              {profile.matchedJobs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No job matches yet</p>
                  <Link href="/jobs">
                    <button className="btn btn-primary">Find Jobs</button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-3">
                    {profile.matchedJobs.length} jobs matched |{" "}
                    {profile.appliedJobs.length} applied
                  </p>

                  {profile.matchedJobs.slice(0, 5).map((job, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <p className="font-semibold text-sm line-clamp-1">
                            {job.job_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {job.company_name}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`badge badge-sm ${
                              job.matchScore >= 70
                                ? "badge-success"
                                : job.matchScore >= 50
                                ? "badge-warning"
                                : "badge-info"
                            }`}
                          >
                            {job.matchScore}%
                          </span>
                          {profile.appliedJobs.includes(job.job_url) && (
                            <span className="badge badge-sm badge-primary">
                              Applied
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <Link href="/jobs">
                    <button className="btn btn-outline btn-block mt-4">
                      View All Jobs
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Learning Path Card */}
          <div className="card bg-white shadow-lg">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">
                {t("dashboard.learning")}
              </h2>

              {profile.cvAnalysis?.gaps &&
              profile.cvAnalysis.gaps.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-3">
                    Areas to improve based on your profile and job matches:
                  </p>

                  <ul className="space-y-2">
                    {profile.cvAnalysis.gaps.slice(0, 5).map((gap, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-warning">⚠</span>
                        <span className="text-sm">{gap}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4">
                    <Link href="/learning">
                      <button className="btn btn-primary btn-block">
                        View Learning Path
                      </button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">
                    Complete your profile analysis to get personalized learning
                    recommendations
                  </p>
                  <Link href="/CareerCoach/start">
                    <button className="btn btn-primary">Analyze Profile</button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
