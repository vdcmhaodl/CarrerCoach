"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { parseMarkdown, renderMarkdown } from "@/app/utils/markdownParser";

interface Question {
  id: string;
  category: "Background" | "Situation" | "Technical";
  text: string;
}

// Try to get language from localStorage or context
function getLanguageFromStorage(): string {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('language');
      return stored ? stored : 'en';
    } catch {
      return 'en';
    }
  }
  return 'en';
}

export default function LiveDemoPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isReadingFeedback, setIsReadingFeedback] = useState(false);
  const [isPausedFeedback, setIsPausedFeedback] = useState(false);
  const [isFeedbackCollapsed, setIsFeedbackCollapsed] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState<string>("en");
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    const storedQuestions = localStorage.getItem("interviewQuestions");
    const storedLanguage = getLanguageFromStorage();
    setLanguage(storedLanguage);
    
    if (storedQuestions) {
      try {
        const parsed = JSON.parse(storedQuestions);
        const allQuestions: Question[] = [];
        
        parsed.forEach((q: string, idx: number) => {
          const match = q.match(/^\[(Background|Situation|Technical)\]\s*(.+)$/);
          if (match) {
            allQuestions.push({
              id: `q-${idx}`,
              category: match[1] as "Background" | "Situation" | "Technical",
              text: match[2].trim()
            });
          }
        });
        
        const randomQuestions: Question[] = [];
        const categories = ["Background", "Situation", "Technical"];
        
        categories.forEach(cat => {
          const catQuestions = allQuestions.filter(q => q.category === cat);
          if (catQuestions.length > 0) {
            const randomIdx = Math.floor(Math.random() * catQuestions.length);
            randomQuestions.push(catQuestions[randomIdx]);
          }
        });
        
        const remaining = allQuestions.filter(q => !randomQuestions.includes(q));
        for (let i = 0; i < Math.min(2, remaining.length); i++) {
          const randomIdx = Math.floor(Math.random() * remaining.length);
          randomQuestions.push(remaining.splice(randomIdx, 1)[0]);
        }
        
        setQuestions(randomQuestions.slice(0, 5));
      } catch (e) {
        console.error("Error parsing questions:", e);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (questions.length > 0 && currentQuestion) {
      setTimeout(() => speakQuestion(currentQuestion.text), 500);
    }
  }, [currentQuestionIndex, questions]);

  const speakQuestion = async (text: string) => {
    setIsSpeaking(true);
    
    try {
      const langParam = language === "vi" ? "vi-VN" : "en-US";
      const res = await fetch("http://localhost:8000/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language: langParam }),
      });

      if (!res.ok) {
        throw new Error("Failed to synthesize speech");
      }

      const data = await res.json();
      const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
      
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => setIsSpeaking(false);
      
      await audio.play();
    } catch (error) {
      console.error("Error with Google Cloud TTS, falling back to browser TTS:", error);
      
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        // Set language based on detected language
        utterance.lang = language === "vi" ? 'vi-VN' : 'en-US';
        utterance.rate = 0.80;
        utterance.pitch = 0.9;
        utterance.volume = 1.0;
        
        const voices = window.speechSynthesis.getVoices();
        
        // Select appropriate voice based on language
        let selectedVoice;
        if (language === "vi") {
          selectedVoice = voices.find(voice => 
            voice.lang.startsWith('vi') && 
            (voice.name.includes('Google') || voice.name.includes('Enhanced') || voice.name.includes('Premium'))
          ) || voices.find(voice => voice.lang.startsWith('vi'));
        } else {
          selectedVoice = voices.find(voice => 
            voice.lang.startsWith('en') && 
            (voice.name.includes('Google') || voice.name.includes('Enhanced') || voice.name.includes('Premium'))
          ) || voices.find(voice => voice.lang.startsWith('en-US'));
        }
        
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
        
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        
        window.speechSynthesis.speak(utterance);
      } else {
        setIsSpeaking(false);
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.webm');
        // Add language parameter to the form data
        formData.append('language', language === "vi" ? "vi-VN" : "en-US");

        try {
          const res = await fetch("http://localhost:8000/api/process-voice", {
            method: "POST",
            body: formData,
          });

          const data = await res.json();
          if (data.transcription) {
            setAnswer(prev => prev + " " + data.transcription);
          }
        } catch (error) {
          console.error("Error transcribing audio:", error);
          alert("Failed to transcribe audio. Please try typing instead.");
        }

        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Failed to access microphone. Please check your permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const readFeedbackAloud = async (text: string) => {
    setIsReadingFeedback(true);
    setIsPausedFeedback(false);
    
    try {
      const langParam = language === "vi" ? "vi-VN" : "en-US";
      const res = await fetch("http://localhost:8000/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language: langParam }),
      });

      if (!res.ok) {
        throw new Error("Failed to synthesize speech");
      }

      const data = await res.json();
      const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
      setCurrentAudio(audio);
      
      audio.onended = () => {
        setIsReadingFeedback(false);
        setIsPausedFeedback(false);
      };
      audio.onerror = () => {
        setIsReadingFeedback(false);
        setIsPausedFeedback(false);
      };
      
      await audio.play();
    } catch (error) {
      console.error("Error reading feedback aloud:", error);
      
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language === "vi" ? 'vi-VN' : 'en-US';
        utterance.rate = 0.80;
        utterance.pitch = 0.9;
        utterance.volume = 1.0;
        
        const voices = window.speechSynthesis.getVoices();
        
        let selectedVoice;
        if (language === "vi") {
          selectedVoice = voices.find(voice => voice.lang.startsWith('vi'));
        } else {
          selectedVoice = voices.find(voice => voice.lang.startsWith('en-US'));
        }
        
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
        
        utterance.onend = () => {
          setIsReadingFeedback(false);
          setIsPausedFeedback(false);
        };
        utterance.onerror = () => {
          setIsReadingFeedback(false);
          setIsPausedFeedback(false);
        };
        
        window.speechSynthesis.speak(utterance);
      } else {
        setIsReadingFeedback(false);
      }
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim()) {
      alert("Vui lòng điền câu trả lời!");
      return;
    }

    setIsEvaluating(true);
    try {
      const questionContext = `Câu hỏi: ${currentQuestion.text}\n\nCâu trả lời của tôi: ${answer}`;
      
      const res = await fetch("http://localhost:8000/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: questionContext }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      
      let feedbackText = "";
      let feedbackToRead = "";
      
      if (data.type === "evaluation" && data.feedback) {
        feedbackToRead = data.feedback;
        feedbackText = data.suggested_answer 
          ? `${data.feedback}\n\n**Câu trả lời gợi ý:**\n${data.suggested_answer}`
          : data.feedback;
      } else if (data.type === "general_answer" && data.response) {
        feedbackToRead = data.response;
        feedbackText = data.response;
      } else {
        feedbackToRead = data.feedback || data.response || "Không có phản hồi";
        feedbackText = feedbackToRead;
      }
      
      setFeedback(feedbackText);
      setIsFeedbackCollapsed(false);
      
      // Automatically read only the feedback part aloud (not the suggested answer)
      await new Promise(resolve => setTimeout(resolve, 500));
      await readFeedbackAloud(feedbackToRead.replace(/\*\*/g, '').replace(/\n\n/g, '. '));
    } catch (error) {
      console.error("Error evaluating answer:", error);
      setFeedback("Không thể đánh giá câu trả lời. Vui lòng thử lại.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setAnswer("");
      setFeedback("");
      setIsFeedbackCollapsed(false);
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      window.speechSynthesis.cancel();
      setIsReadingFeedback(false);
      setIsPausedFeedback(false);
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setAnswer("");
      setFeedback("");
      setIsFeedbackCollapsed(false);
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }
      window.speechSynthesis.cancel();
      setIsReadingFeedback(false);
      setIsPausedFeedback(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const categoryColors = {
    Background: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", badge: "badge-error" },
    Situation: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", badge: "badge-info" },
    Technical: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", badge: "badge-success" }
  };
  const categoryLabels = {
    Background: "Nền tảng",
    Situation: "Tình huống",
    Technical: "Chuyên môn"
  };
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="navbar bg-base-100 shadow-sm py-4">
        <div className="navbar-start">
          <Link
            href="/InterviewWarmup/start/call"
            className="btn btn-ghost"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Trở lại Câu hỏi
          </Link>
        </div>

        <div className="navbar-center">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
            Live Demo
          </h1>
        </div>

        <div className="navbar-end">
          <div className="badge badge-lg badge-ghost">
            Câu {currentQuestionIndex + 1}/{questions.length}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-8">
        {isLoading ? (
          <div className="text-center py-20">
            <span className="loading loading-spinner loading-lg text-purple-600"></span>
            <p className="mt-4 text-gray-600">Tạo bộ câu hỏi...</p>
          </div>
        ) : questions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Không có câu hỏi</h2>
            <p className="text-gray-600 mb-6">Vui lòng tạo câu hỏi trước từ trang Phỏng vấn.</p>
            <Link href="/InterviewWarmup/start/call" className="btn btn-primary rounded-full">
              Quay lại trang Phỏng vấn
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Question Card */}
            <div className={`${currentQuestion && categoryColors[currentQuestion.category].bg} ${currentQuestion && categoryColors[currentQuestion.category].border} border-2 rounded-2xl p-8 shadow-lg`}>
              <div className="flex items-center justify-between mb-4">
                <span className={`badge ${currentQuestion && categoryColors[currentQuestion.category].badge} badge-lg`}>
                  {currentQuestion && categoryLabels[currentQuestion.category]}
                </span>
                <button
                  onClick={() => currentQuestion && speakQuestion(currentQuestion.text)}
                  disabled={isSpeaking}
                  className={`btn btn-sm btn-circle ${isSpeaking ? 'btn-primary animate-pulse' : 'btn-ghost'}`}
                  title={isSpeaking ? "Đang đọc..." : "Đọc câu hỏi"}
                >
                  {isSpeaking ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xl font-medium text-gray-800 leading-relaxed">
                {currentQuestion?.text}
              </p>
            </div>

            {/* Answer Input */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700">Câu trả lời của bạn:</label>
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`btn btn-sm ${isRecording ? 'btn-error animate-pulse' : 'btn-primary'} btn-circle`}
                  title={isRecording ? "Dừng ghi âm" : "Bắt đầu nhập giọng nói"}
                >
                  {isRecording ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                  )}
                </button>
              </div>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="textarea textarea-bordered w-full h-32 resize-none"
                placeholder="Nhập câu trả lời hoặc sử dụng giọng nói..."
                disabled={!!feedback}
              />
              {!feedback && (
                <button
                  onClick={submitAnswer}
                  disabled={!answer.trim() || isEvaluating}
                  className="btn btn-primary rounded-full mt-4"
                >
                  {isEvaluating ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Đang đánh giá...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Gửi câu trả lời
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Feedback */}
            {feedback && (
              <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="font-bold text-gray-800 text-lg">Phản hồi từ AI</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        if (isPausedFeedback || !isReadingFeedback) {
                          // Start playing if not playing, or resume if paused
                          if (currentAudio) {
                            currentAudio.play();
                            setIsReadingFeedback(true);
                            setIsPausedFeedback(false);
                          } else {
                            window.speechSynthesis.resume();
                            setIsReadingFeedback(true);
                            setIsPausedFeedback(false);
                          }
                        } else if (isReadingFeedback) {
                          // Pause if playing
                          if (currentAudio) {
                            currentAudio.pause();
                            setIsPausedFeedback(true);
                          } else {
                            window.speechSynthesis.pause();
                            setIsPausedFeedback(true);
                          }
                        }
                      }}
                      disabled={!feedback}
                      className={`p-1 rounded-lg transition-all duration-200 ${
                        feedback
                          ? isReadingFeedback && !isPausedFeedback
                            ? 'bg-purple-600 text-white hover:bg-purple-700'
                            : 'bg-purple-500 text-white hover:bg-purple-600'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                      title={
                        isPausedFeedback
                          ? "Tiếp tục"
                          : isReadingFeedback
                          ? "Tạm dừng"
                          : feedback
                          ? "Đọc"
                          : "Chờ phản hồi..."
                      }
                    >
                      {isReadingFeedback && !isPausedFeedback ? (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        if (currentAudio) {
                          currentAudio.pause();
                          currentAudio.currentTime = 0;
                        }
                        window.speechSynthesis.cancel();
                        setIsReadingFeedback(false);
                        setIsPausedFeedback(false);
                      }}
                      disabled={!isReadingFeedback && !isPausedFeedback}
                      className={`p-1 rounded-lg transition-all duration-200 ${
                        isReadingFeedback || isPausedFeedback
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                      title="Dừng"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 6h12v12H6z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        setIsFeedbackCollapsed(!isFeedbackCollapsed);
                      }}
                      className="ml-2 p-2 hover:bg-purple-200 rounded-lg transition-all duration-200"
                      title={isFeedbackCollapsed ? "Mở rộng" : "Thu gọn"}
                    >
                      <svg
                        className={`w-5 h-5 text-purple-600 transition-transform ${
                          isFeedbackCollapsed ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 14l-7 7m0 0l-7-7m7 7V3"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                {!isFeedbackCollapsed && (
                  <p className="text-gray-700 leading-relaxed mb-4">{renderMarkdown(parseMarkdown(feedback))}</p>
                )}
                <button
                  onClick={() => {
                    setAnswer("");
                    setFeedback("");
                    setIsFeedbackCollapsed(false);
                    if (currentAudio) {
                      currentAudio.pause();
                      currentAudio.currentTime = 0;
                    }
                    window.speechSynthesis.cancel();
                    setIsReadingFeedback(false);
                    setIsPausedFeedback(false);
                  }}
                  className="btn btn-sm btn-ghost"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Thử lại
                </button>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center pt-4">
              <button
                onClick={previousQuestion}
                disabled={currentQuestionIndex === 0}
                className="btn btn-ghost rounded-full"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Trước
              </button>
              
              {currentQuestionIndex === questions.length - 1 ? (
                <Link href="/results" className="btn btn-primary rounded-full">
                  Hoàn thành & Xem Đề xuất
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              ) : (
                <button
                  onClick={nextQuestion}
                  className="btn btn-primary rounded-full"
                >
                  Tiếp
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Features Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <svg className="w-8 h-8 text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h3 className="font-semibold text-gray-800 mb-1">Text-to-Speech</h3>
            <p className="text-sm text-gray-600">Phỏng vấn trực tiếp</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <svg className="w-8 h-8 text-green-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <h3 className="font-semibold text-gray-800 mb-1">Speech-to-Text</h3>
            <p className="text-sm text-gray-600">Trả lời bằng giọng nói của bạn</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <svg className="w-8 h-8 text-purple-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="font-semibold text-gray-800 mb-1">AI Feedback</h3>
            <p className="text-sm text-gray-600">Nhận đánh giá ngay lập tức</p>
          </div>
        </div>
      </div>
    </div>
  );
}
