"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/app/context/LanguageContext";
import { useUserProfile, JobMatch } from "@/app/context/UserProfileContext";
import { apiUrl } from "@/app/utils/apiBaseUrl";

export default function JobMatching() {
  const { t } = useLanguage();
  const { profile, addMatchedJobs, applyToJob } = useUserProfile();
  const [matchedJobs, setMatchedJobs] = useState<JobMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobMatch | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchJobMatches = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(apiUrl("/api/recommend-jobs"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: profile?.role || "",
          skills: profile?.selectedSkills || [],
          experience_years: profile?.experienceYears ?? 0,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch job recommendations: ${response.statusText}`
        );
      }

      const data = await response.json();
      const jobs = data.jobs || [];

      setMatchedJobs(jobs);
      addMatchedJobs(jobs);
    } catch (error) {
      console.error("Error fetching job matches:", error);
      setError(error instanceof Error ? error.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [addMatchedJobs, profile]);

  useEffect(() => {
    // Fetch job matches from backend API
    if (profile && profile.selectedSkills.length > 0) {
      fetchJobMatches();
    } else {
      setLoading(false);
    }
  }, [profile, fetchJobMatches]);

  const handleApply = (jobUrl: string) => {
    applyToJob(jobUrl);
    window.open(jobUrl, "_blank");
  };

  const parseJobDescription = (desc: string) => {
    try {
      const parsed = JSON.parse(desc);
      if (parsed.div && parsed.div[0]?.ul && parsed.div[0].ul[0]?.li) {
        return parsed.div[0].ul[0].li
          .slice(0, 5)
          .map((item: string | { _value: string }) =>
            typeof item === "string" ? item : item._value || item
          );
      }
    } catch {
      // If not JSON, return as is
    }
    return [desc.substring(0, 200) + "..."];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="mt-4 text-xl font-semibold">{t("jobs.loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold mb-4 text-error">
            Error Loading Jobs
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={fetchJobMatches} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!profile || !profile.role) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold mb-4">{t("jobs.title")}</h1>
          <p className="text-gray-600 mb-6">
            Please complete your profile first to get personalized job
            recommendations.
          </p>
          <Link href="/CareerCoach/start">
            <button className="btn btn-primary">Complete Profile</button>
          </Link>
        </div>
      </div>
    );
  }

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
            {t("jobs.title")}
          </span>
        </div>
        <div className="navbar-end">
          <Link href="/dashboard">
            <button className="btn btn-ghost">{t("nav.dashboard")}</button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">{t("jobs.subtitle")}</h2>
          <p className="text-gray-600">
            Based on your profile:{" "}
            <span className="font-semibold">{profile.role}</span>
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {profile.selectedSkills
              .slice(0, 5)
              .map((skill: string, idx: number) => (
                <span key={idx} className="badge badge-primary">
                  {skill}
                </span>
              ))}
          </div>
        </div>

        {matchedJobs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-xl text-gray-500">{t("jobs.noJobs")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {matchedJobs.map((job, idx) => (
              <div
                key={idx}
                className="card bg-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => setSelectedJob(job)}
              >
                <div className="card-body">
                  <h3 className="card-title text-lg">{job.job_name}</h3>
                  <p className="text-gray-600 font-semibold">
                    {job.company_name}
                  </p>

                  {/* Match Score Badge */}
                  <div className="badge badge-lg badge-primary mt-2">
                    {job.matchScore}% Match
                  </div>

                  {/* Required Skills */}
                  {job.requiredSkills.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-semibold text-green-600 mb-1">
                        ✓ {t("jobs.requiredSkills")}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {job.requiredSkills
                          .slice(0, 4)
                          .map((skill: string, i: number) => (
                            <span
                              key={i}
                              className="badge badge-success badge-sm"
                            >
                              {skill}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Missing Skills */}
                  {job.missingSkills.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-semibold text-orange-600 mb-1">
                        ! {t("jobs.missingSkills")}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {job.missingSkills
                          .slice(0, 3)
                          .map((skill: string, i: number) => (
                            <span
                              key={i}
                              className="badge badge-warning badge-sm"
                            >
                              {skill}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="card-actions justify-end mt-4">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApply(job.job_url);
                      }}
                    >
                      {profile?.appliedJobs.includes(job.job_url)
                        ? "✓ Applied"
                        : t("jobs.apply")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Job Details Modal */}
      {selectedJob && (
        <div className="modal modal-open" onClick={() => setSelectedJob(null)}>
          <div
            className="modal-box max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-2xl mb-2">{selectedJob.job_name}</h3>
            <p className="text-gray-600 font-semibold mb-4">
              {selectedJob.company_name}
            </p>

            <div className="space-y-4">
              {selectedJob.job_description && (
                <div>
                  <h4 className="font-bold text-lg mb-2">Job Description</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {parseJobDescription(selectedJob.job_description).map(
                      (item: string, i: number) => (
                        <li key={i} className="text-gray-700">
                          {item}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

              {selectedJob.job_requirement && (
                <div>
                  <h4 className="font-bold text-lg mb-2">Requirements</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {parseJobDescription(selectedJob.job_requirement).map(
                      (item: string, i: number) => (
                        <li key={i} className="text-gray-700">
                          {item}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
            </div>

            <div className="modal-action">
              <button className="btn" onClick={() => setSelectedJob(null)}>
                {t("common.close")}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleApply(selectedJob.job_url)}
              >
                {profile?.appliedJobs.includes(selectedJob.job_url)
                  ? "✓ Applied"
                  : t("jobs.apply")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
