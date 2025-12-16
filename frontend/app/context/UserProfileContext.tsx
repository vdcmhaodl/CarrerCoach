"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export interface CVAnalysis {
  extractedSkills: string[];
  experience: string[];
  gaps: string[];
  summary?: string;
}

export interface InterviewSession {
  id: string;
  date: string;
  field: string;
  questions: Array<{
    id: string;
    type: string;
    question: string;
    answer?: string;
    score?: number;
    feedback?: string;
  }>;
  averageScore?: number;
}

export interface JobMatch {
  job_url: string;
  job_name: string;
  company_name: string;
  matchScore: number;
  requiredSkills: string[];
  missingSkills: string[];
  job_description?: string;
  job_requirement?: string;
}

export interface UserProfile {
  // Career Dreamer Data
  role: string;
  organization?: string;
  experienceYears?: number;
  selectedSkills: string[];
  selectedTasks: string[];

  // CV Analysis Results
  cvAnalysis?: CVAnalysis;

  // Interview Warmup Progress
  interviewSessions: InterviewSession[];
  performanceMetrics: {
    averageScore: number;
    skillScores: Record<string, number>;
    improvementAreas: string[];
    sessionsCompleted: number;
  };

  // Job Matching
  matchedJobs: JobMatch[];
  appliedJobs: string[]; // Job URLs

  // Timestamps
  profileCreatedAt: string;
  lastUpdatedAt: string;
}

interface UserProfileContextType {
  profile: UserProfile | null;
  updateProfile: (data: Partial<UserProfile>) => void;
  addInterviewSession: (session: InterviewSession) => void;
  addMatchedJobs: (jobs: JobMatch[]) => void;
  applyToJob: (jobUrl: string) => void;
  clearProfile: () => void;
  isProfileComplete: boolean;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(
  undefined
);

const STORAGE_KEY = "careercoach_user_profile";

const createEmptyProfile = (): UserProfile => ({
  role: "",
  organization: "",
  experienceYears: 0,
  selectedSkills: [],
  selectedTasks: [],
  interviewSessions: [],
  performanceMetrics: {
    averageScore: 0,
    skillScores: {},
    improvementAreas: [],
    sessionsCompleted: 0,
  },
  matchedJobs: [],
  appliedJobs: [],
  profileCreatedAt: new Date().toISOString(),
  lastUpdatedAt: new Date().toISOString(),
});

export const UserProfileProvider = ({ children }: { children: ReactNode }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [mounted, setMounted] = useState(false);

  // Load profile from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setProfile(parsed);
      } else {
        setProfile(createEmptyProfile());
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      setProfile(createEmptyProfile());
    }
    setMounted(true);
  }, []);

  // Save profile to localStorage whenever it changes
  useEffect(() => {
    if (mounted && profile) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      } catch (error) {
        console.error("Error saving profile:", error);
      }
    }
  }, [profile, mounted]);

  const updateProfile = (data: Partial<UserProfile>) => {
    setProfile((prev) => {
      if (!prev) return createEmptyProfile();
      return {
        ...prev,
        ...data,
        lastUpdatedAt: new Date().toISOString(),
      };
    });
  };

  const addInterviewSession = (session: InterviewSession) => {
    setProfile((prev) => {
      if (!prev) return createEmptyProfile();

      const newSessions = [...prev.interviewSessions, session];
      const totalScore = newSessions.reduce(
        (sum, s) => sum + (s.averageScore || 0),
        0
      );
      const avgScore =
        newSessions.length > 0 ? totalScore / newSessions.length : 0;

      return {
        ...prev,
        interviewSessions: newSessions,
        performanceMetrics: {
          ...prev.performanceMetrics,
          averageScore: avgScore,
          sessionsCompleted: newSessions.length,
        },
        lastUpdatedAt: new Date().toISOString(),
      };
    });
  };

  const addMatchedJobs = (jobs: JobMatch[]) => {
    setProfile((prev) => {
      if (!prev) return createEmptyProfile();

      // Merge with existing jobs, avoid duplicates
      const existingUrls = new Set(prev.matchedJobs.map((j) => j.job_url));
      const newJobs = jobs.filter((j) => !existingUrls.has(j.job_url));

      return {
        ...prev,
        matchedJobs: [...prev.matchedJobs, ...newJobs],
        lastUpdatedAt: new Date().toISOString(),
      };
    });
  };

  const applyToJob = (jobUrl: string) => {
    setProfile((prev) => {
      if (!prev) return createEmptyProfile();

      if (!prev.appliedJobs.includes(jobUrl)) {
        return {
          ...prev,
          appliedJobs: [...prev.appliedJobs, jobUrl],
          lastUpdatedAt: new Date().toISOString(),
        };
      }
      return prev;
    });
  };

  const clearProfile = () => {
    const newProfile = createEmptyProfile();
    setProfile(newProfile);
    localStorage.removeItem(STORAGE_KEY);
  };

  const isProfileComplete = !!(
    profile?.role && profile.selectedSkills.length >= 3
  );

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        updateProfile,
        addInterviewSession,
        addMatchedJobs,
        applyToJob,
        clearProfile,
        isProfileComplete,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (!context) {
    return {
      profile: null,
      updateProfile: () => {},
      addInterviewSession: () => {},
      addMatchedJobs: () => {},
      applyToJob: () => {},
      clearProfile: () => {},
      isProfileComplete: false,
    };
  }
  return context;
};
