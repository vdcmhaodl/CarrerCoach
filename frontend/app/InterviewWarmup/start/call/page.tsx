"use client";

import React from "react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { parseMarkdown, renderMarkdown } from "@/app/utils/markdownParser";

interface InterviewContext {
  field: string;
  role: string;
  skills: string[];
}

const CallPage: React.FC = () => {
  const [context, setContext] = useState<InterviewContext | null>(null);
  const [llmResponse, setLLMResponse] = useState<string>("");
  const [llmCalled, setLLMCalled] = useState<boolean>(false);
  const [backgroundQuestions, setBackgroundQuestions] = useState<string[]>([]);
  const [situationQuestions, setsituationQuestions] = useState<string[]>([]);
  const [technicalQuestions, settechnicalQuestions] = useState<string[]>([]);

  // Speech-to-text state
  const [isRecording, setIsRecording] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [language, setLanguage] = useState<string>("en");

  useEffect(() => {
    const data = localStorage.getItem("interviewContext");
    const storedLanguage = localStorage.getItem("language") || "en";
    setLanguage(storedLanguage);
    
    if (data) {
      const parsedContext = JSON.parse(data);
      setContext(parsedContext);
      // Tự động tạo câu hỏi khi trang được tải
      if (!llmCalled) {
        setTimeout(() => {
          generateQuestions(parsedContext);
        }, 500);
      }
    } else {
      setContext({ field: "Chung", role: "Chuyên nghiệp", skills: [] });
    }
  }, []);

  // Lưu câu trả lời cho mỗi câu hỏi
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  // Lưu phản hồi của AI cho mỗi câu hỏi
  const [feedback, setFeedback] = useState<{
    [key: string]: { advice: string; suggested_answer?: string };
  }>({});
  // Theo dõi câu hỏi nào đang được đánh giá
  const [evaluating, setEvaluating] = useState<{ [key: string]: boolean }>({});
  // Theo dõi câu hỏi nào có feedback bị thu gọn
  const [collapsedFeedback, setCollapsedFeedback] = useState<{ [key: string]: boolean }>({});

  const handleAnswerChange = (
    category: string,
    index: number,
    value: string
  ) => {
    const key = `${category}-${index}`;
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmitAnswer = async (
    category: string,
    index: number,
    question: string
  ) => {
    const key = `${category}-${index}`;
    const answer = answers[key];

    if (!answer || answer.trim() === "") {
      alert("Vui lòng nhập câu trả lời trước khi gửi!");
      return;
    }

    setEvaluating((prev) => ({ ...prev, [key]: true }));

    try {
      const questionContext = `Câu hỏi phỏng vấn: ${question}\n\nCâu trả lời của tôi: ${answer}\n\nVui lòng đánh giá câu trả lời của tôi cho câu hỏi phỏng vấn này.`;

      console.log(`Sending feedback request for ${key}...`);

      const res = await fetch("http://localhost:8000/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: questionContext }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      console.log(`Feedback response for ${key}:`, data);

      if (data.type === "evaluation" && data.feedback) {
        console.log(`Setting evaluation feedback for ${key}`);
        setFeedback((prev) => {
          const updated = {
            ...prev,
            [key]: {
              advice: data.feedback || "Không có phản hồi",
              suggested_answer: data.suggested_answer,
            },
          };
          console.log(`Feedback state updated:`, updated);
          return updated;
        });
      } else if (data.response) {
        console.log(`Setting general answer for ${key}`);
        setFeedback((prev) => {
          const updated = {
            ...prev,
            [key]: {
              advice:
                data.response ||
                "Vui lòng cung cấp câu trả lời chi tiết hơn cho câu hỏi phỏng vấn này.",
            },
          };
          console.log(`Feedback state updated:`, updated);
          return updated;
        });
      } else {
        console.warn(`Unexpected response format for ${key}:`, data);
        setFeedback((prev) => ({
          ...prev,
          [key]: {
            advice: "Không thể đánh giá. Vui lòng thử lại.",
          },
        }));
      }
    } catch (error) {
      console.error("Error evaluating answer:", error);
      alert("Đánh giá thất bại. Vui lòng thử lại.");
    } finally {
      setEvaluating((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleVoiceInput = async (category: string, index: number) => {
    const key = `${category}-${index}`;

    if (isRecording[key]) {
      // Dừng ghi âm
      if (mediaRecorder) {
        mediaRecorder.stop();
      }
      setIsRecording((prev) => ({ ...prev, [key]: false }));
      return;
    }

    try {
      // Bắt đầu ghi âm với cài đặt tối ưu
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        },
      });

      const options: MediaRecorderOptions = {
        mimeType: "audio/webm;codecs=opus",
      };
      const recorder = new MediaRecorder(stream, options);
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, {
          type: "audio/webm;codecs=opus",
        });

        console.log(`Audio recorded: ${audioBlob.size} bytes`);

        if (audioBlob.size < 1000) {
          alert("Bản ghi quá ngắn. Vui lòng nói ít nhất 1 giây.");
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const formData = new FormData();
        formData.append("audio", audioBlob, "audio.webm");
        // Add language parameter
        formData.append("language", language === "vi" ? "vi-VN" : "en-US");

        try {
          const res = await fetch("http://localhost:8000/api/process-voice", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const errorData = await res.json();
            console.error("Transcription error:", errorData);
            alert(
              `Lỗi chuyển đổi âm thanh: ${
                errorData.error || "Lỗi không xác định"
              }`
            );
            return;
          }

          const data = await res.json();
          if (data.transcription && data.transcription.trim()) {
            setAnswers((prev) => ({
              ...prev,
              [key]: (prev[key] || "") + " " + data.transcription,
            }));
          } else {
            alert("Không phát hiện giọng nói. Vui lòng nói rõ hơn.");
          }
        } catch (error) {
          console.error("Error transcribing audio:", error);
          alert(
            "Lỗi kết nối khi xử lý âm thanh. Vui lòng kiểm tra mạng và thử lại."
          );
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording((prev) => ({ ...prev, [key]: true }));
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.");
    }
  };

  const generateQuestions = async (contextData: InterviewContext) => {
    setLLMResponse("Đang tải...");
    try {
      const res = await fetch("http://localhost:8000/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field: contextData.field,
          role: contextData.role,
          skills: contextData.skills,
        }),
      });

      const data = await res.json();
      const questions = Array.isArray(data) ? data : data.questions;

      if (Array.isArray(questions)) {
        // Lưu câu hỏi vào localStorage cho live demo
        localStorage.setItem("interviewQuestions", JSON.stringify(questions));
        setLLMResponse(questions.join("\n"));
      } else {
        setLLMResponse(data.error ?? "Không có phản hồi");
      }

      setLLMCalled(true);
    } catch (error) {
      console.error("Error generating questions:", error);
      setLLMResponse("Lỗi khi tạo câu hỏi. Vui lòng thử lại.");
      setLLMCalled(true);
    }
  };

  const getLLMResponse = async () => {
    if (!context) return;
    generateQuestions(context);
  };

  useEffect(() => {
    if (llmCalled) {
      // Regex này phải giữ nguyên tiếng Anh vì Backend trả về tag [Background]...
      const regex = /^\*?\s*\[(Background|Situation|Technical)]\s+(.+?)\s*$/gm;

      let match: RegExpExecArray | null;
      type Category = "Background" | "Situation" | "Technical";

      const bgques: string[] = [];
      const sitques: string[] = [];
      const tecques: string[] = [];

      while ((match = regex.exec(llmResponse)) !== null) {
        const category = match[1] as Category;
        const question = match[2].trim();

        switch (category) {
          case "Background":
            bgques.push(question);
            break;
          case "Situation":
            sitques.push(question);
            break;
          case "Technical":
            tecques.push(question);
            break;
        }
      }

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBackgroundQuestions(bgques);
      setsituationQuestions(sitques);
      settechnicalQuestions(tecques);
    }
  }, [llmResponse, llmCalled]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-100">
      <div className="navbar bg-base-100 shadow-sm py-4 min-h-24">
        <div className="navbar-start">
          <div className="flex flex-col gap-1">
            <Link
              href="/"
              className="btn btn-ghost text-sm h-auto py-2 text-black hover:text-black"
            >
              <svg
                className="w-4 h-4"
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
              Về trang chủ
            </Link>
          </div>
        </div>

        <div className="navbar-center">
          {!llmCalled ? (
            <div className="text-center py-2">
              <span className="loading loading-spinner loading-md text-purple-600"></span>
              <p className="text-lg font-medium text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 mt-2">
                Đang tạo câu hỏi...
              </p>
            </div>
          ) : (
            <Link
              href="/InterviewWarmup/start/call/livedemo"
              className="btn btn-lg rounded-full border-0 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
              style={{
                background: "linear-gradient(135deg, #9333ea 0%, #6366f1 100%)",
              }}
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
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Live Demo
            </Link>
          )}
        </div>

        <div className="navbar-end">
          <Link
            href="/results"
            className="btn btn-lg rounded-full"
            style={{
              backgroundColor: "#2563eb",
              color: "white",
              borderColor: "#2563eb",
            }}
          >
            Xem Đề xuất
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

      <div className="w-full max-w-6xl mx-auto">
        <div className="tabs tabs-box tabs-border mt-8">
          <input
            type="radio"
            name="my_tabs_6"
            className="tab h-12 text-base font-medium text-gray-500 aria-checked:text-indigo-600 aria-checked:border-indigo-600"
            aria-label="Nền tảng"
            defaultChecked
          />
          <div className="tab-content p-6 w-full bg-transparent border-none">
            {backgroundQuestions.length === 0 ? (
              <p className="text-sm text-gray-500">
                Chưa có câu hỏi nền tảng nào
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {backgroundQuestions.map((q, idx) => {
                  const key = `Background-${idx}`;
                  const hasAnswer = answers[key]?.trim().length > 0;
                  const hasFeedback = feedback[key];
                  const isEvaluating = evaluating[key];

                  return (
                    <div
                      key={idx}
                      className="bg-linear-to-br from-red-50 to-red-50 rounded-2xl p-6 border border-red-200 shadow-sm"
                    >
                      <div className="flex items-start gap-3 mb-4">
                        <span className="inline-flex items-center justify-center w-10 h-10 bg-red-500 text-white text-base font-bold rounded-full shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <span className="inline-block bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full mb-2">
                            Nền tảng
                          </span>
                          <p className="text-base text-gray-800 font-medium leading-relaxed">
                            {q}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Câu trả lời của bạn:
                        </label>
                        <div className="relative">
                          <textarea
                            className="w-full px-4 py-3 pr-12 rounded-lg border border-red-200 focus:border-red-400 focus:ring-2 focus:ring-red-200 outline-none transition-all resize-none"
                            rows={4}
                            placeholder="Nhập câu trả lời hoặc dùng giọng nói..."
                            value={answers[key] || ""}
                            onChange={(e) =>
                              handleAnswerChange(
                                "Background",
                                idx,
                                e.target.value
                              )
                            }
                            disabled={!!hasFeedback}
                          />
                          <button
                            className={`absolute right-2 bottom-2 p-2 rounded-full transition-all ${
                              isRecording[key]
                                ? "bg-red-500 text-white animate-pulse"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                            onClick={() => handleVoiceInput("Background", idx)}
                            disabled={!!hasFeedback}
                            title={
                              isRecording[key] ? "Dừng ghi âm" : "Bắt đầu nói"
                            }
                          >
                            {isRecording[key] ? (
                              <svg
                                className="w-5 h-5"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M6 6h12v12H6z" />
                              </svg>
                            ) : (
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
                                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>

                      {!hasFeedback && (
                        <button
                          className="mt-3 btn btn-primary btn-sm"
                          onClick={() =>
                            handleSubmitAnswer("Background", idx, q)
                          }
                          disabled={!hasAnswer || isEvaluating}
                        >
                          {isEvaluating ? (
                            <>
                              <span className="loading loading-spinner loading-sm"></span>
                              Đang đánh giá...
                            </>
                          ) : (
                            "Gửi câu trả lời"
                          )}
                        </button>
                      )}

                      {hasFeedback && (
                        <div className="mt-4 bg-white rounded-lg p-4 border-l-4 border-red-500">
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <svg
                                className="w-6 h-6 text-red-500"
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
                              <h4 className="font-semibold text-gray-800">
                                Đánh giá từ AI
                              </h4>
                            </div>
                            <button
                              onClick={() => {
                                setCollapsedFeedback((prev) => ({
                                  ...prev,
                                  [key]: !prev[key],
                                }));
                              }}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                              title={collapsedFeedback[key] ? "Mở rộng" : "Thu gọn"}
                            >
                              <svg
                                className={`w-5 h-5 text-gray-500 transition-transform ${
                                  collapsedFeedback[key] ? "rotate-180" : ""
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
                          {!collapsedFeedback[key] && (
                            <>
                              <p className="text-sm text-gray-700 leading-relaxed mb-3">
                                {renderMarkdown(parseMarkdown(feedback[key].advice))}
                              </p>
                              {feedback[key].suggested_answer && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <p className="text-xs font-semibold text-gray-600 mb-2">
                                    Câu trả lời gợi ý:
                                  </p>
                                  <p className="text-sm text-gray-600 leading-relaxed italic">
                                    {renderMarkdown(parseMarkdown(feedback[key].suggested_answer))}
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                          <button
                            className="mt-3 text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                            onClick={() => {
                              setAnswers((prev) => ({ ...prev, [key]: "" }));
                              setFeedback((prev) => {
                                const newFeedback = { ...prev };
                                delete newFeedback[key];
                                return newFeedback;
                              });
                              setCollapsedFeedback((prev) => {
                                const newCollapsed = { ...prev };
                                delete newCollapsed[key];
                                return newCollapsed;
                              });
                            }}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                              />
                            </svg>
                            Thử lại
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <input
            type="radio"
            name="my_tabs_6"
            className="tab h-12 text-base font-medium text-gray-500 aria-checked:text-indigo-600 aria-checked:border-indigo-600"
            aria-label="Tình huống"
          />
          <div className="tab-content p-6 w-full bg-transparent border-none">
            {situationQuestions.length === 0 ? (
              <p className="text-sm text-gray-500">
                Chưa có câu hỏi tình huống nào
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {situationQuestions.map((q, idx) => {
                  const key = `Situation-${idx}`;
                  const hasAnswer = answers[key]?.trim().length > 0;
                  const hasFeedback = feedback[key];
                  const isEvaluating = evaluating[key];

                  return (
                    <div
                      key={idx}
                      className="bg-linear-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border border-blue-200 shadow-sm"
                    >
                      <div className="flex items-start gap-3 mb-4">
                        <span className="inline-flex items-center justify-center w-10 h-10 bg-blue-500 text-white text-base font-bold rounded-full shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-2">
                            Tình huống
                          </span>
                          <p className="text-base text-gray-800 font-medium leading-relaxed">
                            {q}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Câu trả lời của bạn:
                        </label>
                        <div className="relative">
                          <textarea
                            className="w-full px-4 py-3 pr-12 rounded-lg border border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none"
                            rows={4}
                            placeholder="Nhập câu trả lời hoặc dùng giọng nói..."
                            value={answers[key] || ""}
                            onChange={(e) =>
                              handleAnswerChange(
                                "Situation",
                                idx,
                                e.target.value
                              )
                            }
                            disabled={!!hasFeedback}
                          />
                          <button
                            className={`absolute right-2 bottom-2 p-2 rounded-full transition-all ${
                              isRecording[key]
                                ? "bg-red-500 text-white animate-pulse"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                            onClick={() => handleVoiceInput("Situation", idx)}
                            disabled={!!hasFeedback}
                            title={
                              isRecording[key] ? "Dừng ghi âm" : "Bắt đầu nói"
                            }
                          >
                            {isRecording[key] ? (
                              <svg
                                className="w-5 h-5"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M6 6h12v12H6z" />
                              </svg>
                            ) : (
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
                                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>

                      {!hasFeedback && (
                        <button
                          className="mt-3 btn btn-primary btn-sm"
                          onClick={() =>
                            handleSubmitAnswer("Situation", idx, q)
                          }
                          disabled={!hasAnswer || isEvaluating}
                        >
                          {isEvaluating ? (
                            <>
                              <span className="loading loading-spinner loading-sm"></span>
                              Đang đánh giá...
                            </>
                          ) : (
                            "Gửi câu trả lời"
                          )}
                        </button>
                      )}

                      {hasFeedback && (
                        <div className="mt-4 bg-white rounded-lg p-4 border-l-4 border-blue-500">
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <svg
                                className="w-6 h-6 text-blue-500"
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
                              <h4 className="font-semibold text-gray-800">
                                Đánh giá từ AI
                              </h4>
                            </div>
                            <button
                              onClick={() => {
                                setCollapsedFeedback((prev) => ({
                                  ...prev,
                                  [key]: !prev[key],
                                }));
                              }}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                              title={collapsedFeedback[key] ? "Mở rộng" : "Thu gọn"}
                            >
                              <svg
                                className={`w-5 h-5 text-gray-500 transition-transform ${
                                  collapsedFeedback[key] ? "rotate-180" : ""
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
                          {!collapsedFeedback[key] && (
                            <>
                              <p className="text-sm text-gray-700 leading-relaxed mb-3">
                                {renderMarkdown(parseMarkdown(feedback[key].advice))}
                              </p>
                              {feedback[key].suggested_answer && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <p className="text-xs font-semibold text-gray-600 mb-2">
                                    Câu trả lời gợi ý:
                                  </p>
                                  <p className="text-sm text-gray-600 leading-relaxed italic">
                                    {renderMarkdown(parseMarkdown(feedback[key].suggested_answer))}
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                          <button
                            className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                            onClick={() => {
                              setAnswers((prev) => ({ ...prev, [key]: "" }));
                              setFeedback((prev) => {
                                const newFeedback = { ...prev };
                                delete newFeedback[key];
                                return newFeedback;
                              });
                              setCollapsedFeedback((prev) => {
                                const newCollapsed = { ...prev };
                                delete newCollapsed[key];
                                return newCollapsed;
                              });
                            }}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                              />
                            </svg>
                            Thử lại
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <input
            type="radio"
            name="my_tabs_6"
            className="tab h-12 text-base font-medium text-gray-500 aria-checked:text-indigo-600 aria-checked:border-indigo-600"
            aria-label="Chuyên môn"
          />
          <div className="tab-content p-6 w-full bg-transparent border-none">
            {technicalQuestions.length === 0 ? (
              <p className="text-sm text-gray-500">
                Chưa có câu hỏi chuyên môn nào
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {technicalQuestions.map((q, idx) => {
                  const key = `Technical-${idx}`;
                  const hasAnswer = answers[key]?.trim().length > 0;
                  const hasFeedback = feedback[key];
                  const isEvaluating = evaluating[key];

                  return (
                    <div
                      key={idx}
                      className="bg-linear-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200 shadow-sm"
                    >
                      <div className="flex items-start gap-3 mb-4">
                        <span className="inline-flex items-center justify-center w-10 h-10 bg-green-500 text-white text-base font-bold rounded-full shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full mb-2">
                            Chuyên môn
                          </span>
                          <p className="text-base text-gray-800 font-medium leading-relaxed">
                            {q}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Câu trả lời của bạn:
                        </label>
                        <div className="relative">
                          <textarea
                            className="w-full px-4 py-3 pr-12 rounded-lg border border-green-200 focus:border-green-400 focus:ring-2 focus:ring-green-200 outline-none transition-all resize-none"
                            rows={4}
                            placeholder="Nhập câu trả lời hoặc dùng giọng nói..."
                            value={answers[key] || ""}
                            onChange={(e) =>
                              handleAnswerChange(
                                "Technical",
                                idx,
                                e.target.value
                              )
                            }
                            disabled={!!hasFeedback}
                          />
                          <button
                            className={`absolute right-2 bottom-2 p-2 rounded-full transition-all ${
                              isRecording[key]
                                ? "bg-red-500 text-white animate-pulse"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                            onClick={() => handleVoiceInput("Technical", idx)}
                            disabled={!!hasFeedback}
                            title={
                              isRecording[key] ? "Dừng ghi âm" : "Bắt đầu nói"
                            }
                          >
                            {isRecording[key] ? (
                              <svg
                                className="w-5 h-5"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M6 6h12v12H6z" />
                              </svg>
                            ) : (
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
                                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>

                      {!hasFeedback && (
                        <button
                          className="mt-3 btn btn-primary btn-sm"
                          onClick={() =>
                            handleSubmitAnswer("Technical", idx, q)
                          }
                          disabled={!hasAnswer || isEvaluating}
                        >
                          {isEvaluating ? (
                            <>
                              <span className="loading loading-spinner loading-sm"></span>
                              Đang đánh giá...
                            </>
                          ) : (
                            "Gửi câu trả lời"
                          )}
                        </button>
                      )}

                      {hasFeedback && (
                        <div className="mt-4 bg-white rounded-lg p-4 border-l-4 border-green-500">
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <svg
                                className="w-6 h-6 text-green-500"
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
                              <h4 className="font-semibold text-gray-800">
                                Đánh giá từ AI
                              </h4>
                            </div>
                            <button
                              onClick={() => {
                                setCollapsedFeedback((prev) => ({
                                  ...prev,
                                  [key]: !prev[key],
                                }));
                              }}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                              title={collapsedFeedback[key] ? "Mở rộng" : "Thu gọn"}
                            >
                              <svg
                                className={`w-5 h-5 text-gray-500 transition-transform ${
                                  collapsedFeedback[key] ? "rotate-180" : ""
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
                          {!collapsedFeedback[key] && (
                            <>
                              <p className="text-sm text-gray-700 leading-relaxed mb-3">
                                {renderMarkdown(parseMarkdown(feedback[key].advice))}
                              </p>
                              {feedback[key].suggested_answer && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <p className="text-xs font-semibold text-gray-600 mb-2">
                                    Câu trả lời gợi ý:
                                  </p>
                                  <p className="text-sm text-gray-600 leading-relaxed italic">
                                    {renderMarkdown(parseMarkdown(feedback[key].suggested_answer))}
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                          <button
                            className="mt-3 text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                            onClick={() => {
                              setAnswers((prev) => ({ ...prev, [key]: "" }));
                              setFeedback((prev) => {
                                const newFeedback = { ...prev };
                                delete newFeedback[key];
                                return newFeedback;
                              });
                              setCollapsedFeedback((prev) => {
                                const newCollapsed = { ...prev };
                                delete newCollapsed[key];
                                return newCollapsed;
                              });
                            }}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                              />
                            </svg>
                            Thử lại
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallPage;
