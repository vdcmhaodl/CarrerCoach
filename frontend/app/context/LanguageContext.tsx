"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "vi";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    "nav.warmup": "Interview Warmup",
    "nav.career": "Career Coach",
    "nav.back": "Back",
    
    // Home page
    "home.title": "interview",
    "home.titleHighlight": "warmup",
    "home.subtitle": "A quick way to prepare for your next interview in",
    "home.description": "Practice key questions, get insights about answers, and get more comfortable interviewing.",
    "home.button": "Start practicing",
    
    // Career Coach landing
    "career.title": "career",
    "career.highlight": "dreamer",
    "career.subtitle": "A playful way to explore career possibilities with AI",
    "career.button": "Start",
    
    // Career Coach Start page
    "careerStart.greeting": "👋",
    "careerStart.intro": "To start, share a current or previous role:",
    "careerStart.letsGo": "Let's go",
    "careerStart.rolePlaceholder": "e.g. Software Engineer",
    "careerStart.orgPlaceholder": "Organization/Company (optional)",
    "careerStart.next": "Next",
    "careerStart.back": "Back",
    "careerStart.generating": "✨ Generating insights...",
    "careerStart.selectTasks": "Select all the tasks you performed as a(n)",
    "careerStart.selectTasksOptional": "(optional).",
    "careerStart.selectSkills": "Select at least 3 skills that apply to you.",
    "careerStart.selectAll": "Select All",
    "careerStart.moreSkills": "More skills +",
    "careerStart.skillsWarning": "Please select at least 3 skills to continue.",
    "careerStart.identityBadge": "CAREER IDENTITY STATEMENT",
    "careerStart.identityText": "I am an",
    "careerStart.identityText2": "professional dedicated to maintaining robust technological infrastructures. My core strengths lie in",
    "careerStart.explorePaths": "Explore paths 🚀",
    "careerStart.consulting": "Consulting AI Expert...",
    "careerStart.matching": "Matching your profile with top industry standards",
    "careerStart.uploadCV": "Upload Your CV for Analysis",
    "careerStart.uploadDesc": "Upload your CV and we'll analyze it to provide personalized career advice and interview preparation.",
    "careerStart.chooseFile": "Choose CV File",
    "careerStart.supportedFormats": "Supported formats: PDF, DOC, DOCX, PNG, JPG",
    "careerStart.aiAnalysis": "AI Analysis",
    "careerStart.continue": "Continue",
    
    // Interview Warmup Start
    "warmupStart.question": "What field do you want to practice for?",
    "warmupStart.start": "Start",
    
    // Interview Call page
    "call.title": "Start Call Page",
    "call.selectedOption": "Selected Option:",
    "call.generateQuestions": "Generate questions",
    "call.background": "Background",
    "call.situation": "Situation",
    "call.technical": "Technical",
    "call.noBackground": "No background questions yet",
    "call.noSituation": "No situation questions yet",
    "call.noTechnical": "No technical questions yet",
    
    // Fields
    "field.dataScience": "Data Science",
    "field.machineLearning": "Machine Learning",
    "field.computerSystems": "Computer Systems",
    "field.computerScience": "Computer Science",
    
    // Skills
    "skill.technicalSupport": "Technical Support",
    "skill.networkAdmin": "Network Administration",
    "skill.systemMaintenance": "System Maintenance",
    "skill.problemSolving": "Problem Solving",
    "skill.userTraining": "User Training",
    "skill.dataManagement": "Data Management",
    "skill.cybersecurity": "Cybersecurity Awareness",
    "skill.projectCoordination": "Project Coordination",
    
    // Tasks
    "task.network": "Maintain and troubleshoot network infrastructure.",
    "task.develop": "Develop and implement software solutions.",
    "task.support": "Provide technical support and guidance to end-users.",
    "task.manage": "Manage and secure IT assets and data.",
    "task.collaborate": "Collaborate with stakeholders to understand technology needs.",
    
    // Language
    "lang.en": "English",
    "lang.vi": "Tiếng Việt",
  },
  vi: {
    // Navigation
    "nav.warmup": "Interview Warmup",
    "nav.career": "Career Coach",
    "nav.back": "Quay lại",
    
    // Home page
    "home.title": "luyện tập",
    "home.titleHighlight": "phỏng vấn",
    "home.subtitle": "Một cách nhanh chóng để chuẩn bị cho cuộc phỏng vấn tiếp theo của bạn trong lĩnh vực",
    "home.description": "Luyện tập các câu hỏi chính, nhận được thông tin chi tiết về câu trả lời, và thoải mái hơn khi phỏng vấn.",
    "home.button": "Bắt đầu luyện tập",
    
    // Career Coach landing
    "career.title": "career",
    "career.highlight": "dreamer",
    "career.subtitle": "Một cách thú vị để khám phá khả năng nghề nghiệp với AI",
    "career.button": "Bắt đầu",
    
    // Career Coach Start page
    "careerStart.greeting": "👋",
    "careerStart.intro": "Để bắt đầu, hãy chia sẻ vai trò hiện tại hoặc trước đây của bạn:",
    "careerStart.letsGo": "Bắt đầu thôi",
    "careerStart.rolePlaceholder": "ví dụ: Kỹ sư phần mềm",
    "careerStart.orgPlaceholder": "Tổ chức/Công ty (tùy chọn)",
    "careerStart.next": "Tiếp theo",
    "careerStart.back": "Quay lại",
    "careerStart.generating": "✨ Đang tạo thông tin chi tiết...",
    "careerStart.selectTasks": "Chọn tất cả các nhiệm vụ bạn đã thực hiện với tư cách là",
    "careerStart.selectTasksOptional": "(tùy chọn).",
    "careerStart.selectSkills": "Chọn ít nhất 3 kỹ năng áp dụng cho bạn.",
    "careerStart.selectAll": "Chọn tất cả",
    "careerStart.moreSkills": "Thêm kỹ năng +",
    "careerStart.skillsWarning": "Vui lòng chọn ít nhất 3 kỹ năng để tiếp tục.",
    "careerStart.identityBadge": "TUYÊN BỐ ĐỊNH DANH NGHỀ NGHIỆP",
    "careerStart.identityText": "Tôi là một chuyên gia",
    "careerStart.identityText2": "dành riêng cho việc duy trì cơ sở hạ tầng công nghệ vững mạnh. Điểm mạnh cốt lõi của tôi nằm ở",
    "careerStart.explorePaths": "Khám phá con đường 🚀",
    "careerStart.consulting": "Đang tư vấn chuyên gia AI...",
    "careerStart.matching": "Đang khớp hồ sơ của bạn với tiêu chuẩn ngành hàng đầu",
    "careerStart.uploadCV": "Tải lên CV của bạn để phân tích",
    "careerStart.uploadDesc": "Tải lên CV của bạn và chúng tôi sẽ phân tích để cung cấp lời khuyên nghề nghiệp và chuẩn bị phỏng vấn được cá nhân hóa.",
    "careerStart.chooseFile": "Chọn tệp CV",
    "careerStart.supportedFormats": "Định dạng hỗ trợ: PDF, DOC, DOCX, PNG, JPG",
    "careerStart.aiAnalysis": "Phân tích AI",
    "careerStart.continue": "Tiếp tục",
    
    // Interview Warmup Start
    "warmupStart.question": "Bạn muốn luyện tập cho lĩnh vực nào?",
    "warmupStart.start": "Bắt đầu",
    
    // Interview Call page
    "call.title": "Trang bắt đầu cuộc gọi",
    "call.selectedOption": "Tùy chọn đã chọn:",
    "call.generateQuestions": "Tạo câu hỏi",
    "call.background": "Nền tảng",
    "call.situation": "Tình huống",
    "call.technical": "Kỹ thuật",
    "call.noBackground": "Chưa có câu hỏi nền tảng",
    "call.noSituation": "Chưa có câu hỏi tình huống",
    "call.noTechnical": "Chưa có câu hỏi kỹ thuật",
    
    // Fields
    "field.dataScience": "Khoa học dữ liệu",
    "field.machineLearning": "Học máy",
    "field.computerSystems": "Hệ thống máy tính",
    "field.computerScience": "Khoa học máy tính",
    
    // Skills
    "skill.technicalSupport": "Hỗ trợ kỹ thuật",
    "skill.networkAdmin": "Quản trị mạng",
    "skill.systemMaintenance": "Bảo trì hệ thống",
    "skill.problemSolving": "Giải quyết vấn đề",
    "skill.userTraining": "Đào tạo người dùng",
    "skill.dataManagement": "Quản lý dữ liệu",
    "skill.cybersecurity": "Nhận thức an ninh mạng",
    "skill.projectCoordination": "Phối hợp dự án",
    
    // Tasks
    "task.network": "Bảo trì và khắc phục sự cố cơ sở hạ tầng mạng.",
    "task.develop": "Phát triển và triển khai các giải pháp phần mềm.",
    "task.support": "Cung cấp hỗ trợ kỹ thuật và hướng dẫn cho người dùng cuối.",
    "task.manage": "Quản lý và bảo mật tài sản và dữ liệu CNTT.",
    "task.collaborate": "Hợp tác với các bên liên quan để hiểu nhu cầu công nghệ.",
    
    // Language
    "lang.en": "English",
    "lang.vi": "Tiếng Việt",
  },
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load language preference from localStorage
    const savedLanguage = localStorage.getItem("language") as Language | null;
    if (savedLanguage && (savedLanguage === "en" || savedLanguage === "vi")) {
      setLanguageState(savedLanguage);
    }
    setMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  // Always render with context, but use default values before mount
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Return default values instead of throwing during SSR
    return {
      language: "en" as Language,
      setLanguage: () => {},
      t: (key: string) => translations["en"][key] || key,
    };
  }
  return context;
};
