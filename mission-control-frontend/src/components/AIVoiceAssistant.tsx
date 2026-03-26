import React, { useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Mic, X, Loader2 } from "lucide-react";
import { getAuthHeader } from "@/features/auth/authService";

interface AIResponse {
  success: boolean;
  transcription: string;
  response: string;
  executedFunctions: Array<{
    function: string;
    arguments: any;
    result: any;
  }>;
  navigation: {
    page: string;
    path: string;
    params?: any;
  } | null;
  dataHighlights: any;
  missionExecution: any;
  conversationId: string;
  error?: string;
}

export const AIVoiceAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const navigate = useNavigate();

  // Text-to-speech function
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        // Reset after speaking
        setTimeout(() => {
          setTranscription("");
          setAiResponse("");
        }, 2000);
      };
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  // Stop text-to-speech
  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Start audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());

        // Auto-send after recording stops
        sendAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTranscription("");
      setAiResponse("");

    } catch (error: any) {
      console.error("Error starting recording:", error);
      setAiResponse(`Could not access microphone: ${error.message}`);
    }
  };

  // Stop audio recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Send audio to backend
  const sendAudio = async (blob: Blob) => {
    if (!blob) return;

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append("audio", blob, "voice-command.webm");

      const response = await axios.post<AIResponse>(
        "/api/v1/ai-agent/command",
        formData,
        {
          headers: {
            ...getAuthHeader(),
            "Content-Type": "multipart/form-data"
          }
        }
      );

      const data = response.data;

      setTranscription(data.transcription);
      setAiResponse(data.response);

      // Speak the response
      speak(data.response);

      // Handle navigation
      if (data.navigation) {
        setTimeout(() => {
          navigate(data.navigation!.path, {
            state: data.navigation!.params
          });
        }, 1500);
      }

      // Highlight data elements if present
      if (data.dataHighlights && Object.keys(data.dataHighlights).length > 0) {
        highlightDataElements(data.dataHighlights);
      }

    } catch (error: any) {
      console.error("Error processing voice command:", error);
      console.error("Error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });

      let errorMessage = "Failed to process command";

      if (error.response?.status === 401) {
        errorMessage = "Authentication failed. Please log in again.";
      } else if (error.response?.status === 500) {
        errorMessage = "Server error. OpenAI API might not be configured.";
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setAiResponse(`Error: ${errorMessage}`);
      speak(errorMessage);
    } finally {
      setIsProcessing(false);
      setAudioBlob(null);
    }
  };

  // Highlight data elements on the page
  const highlightDataElements = (highlights: any) => {
    sessionStorage.setItem('ai-highlights', JSON.stringify(highlights));
    window.dispatchEvent(new CustomEvent('ai-highlight', { detail: highlights }));
  };

  // Toggle recording
  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Close and cleanup
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    stopSpeaking();
    stopRecording();
    setIsOpen(false);
    setTranscription("");
    setAiResponse("");
    setAudioBlob(null);
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-8 right-8 z-50 w-20 h-20 bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 text-white rounded-full shadow-2xl hover:shadow-emerald-500/50 transition-all duration-500 flex items-center justify-center group hover:scale-110"
          style={{
            animation: 'float 3s ease-in-out infinite'
          }}
          title="AI Voice Assistant"
        >
          <Mic className="w-9 h-9 group-hover:scale-110 transition-transform drop-shadow-lg" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-500/30 via-green-500/30 to-teal-500/30 blur-xl animate-pulse" />
        </button>
      )}

      {/* AI Voice Interface */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
          onClick={(e) => {
            // Close when clicking the backdrop
            if (e.target === e.currentTarget) {
              handleClose(e);
            }
          }}
        >
          <div className="relative w-full max-w-3xl mx-4 bg-gradient-to-br from-slate-900 via-emerald-950/40 to-slate-900 rounded-3xl shadow-2xl border border-emerald-500/30 overflow-hidden">
            {/* Animated Background Blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-3xl"
                style={{ animation: 'pulse-blob 4s ease-in-out infinite' }}
              />
              <div
                className="absolute top-1/4 left-1/4 w-64 h-64 bg-green-500/15 rounded-full blur-3xl"
                style={{ animation: 'pulse-blob 5s ease-in-out infinite 1s' }}
              />
              <div
                className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-teal-500/15 rounded-full blur-3xl"
                style={{ animation: 'pulse-blob 6s ease-in-out infinite 2s' }}
              />
            </div>

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-6 right-6 z-20 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all hover:scale-110"
              title="Close"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center px-8 py-16">

              {/* Title */}
              <div className="mb-16 text-center">
                <h2 className="text-4xl font-bold text-white mb-3 tracking-wide">AI Voice Assistant</h2>
                <p className="text-emerald-300 text-base">Speak naturally, I'll help you navigate</p>
              </div>

              {/* Central Orb Container */}
              <div className="relative mb-16" style={{ width: '300px', height: '300px' }}>

                {/* Outer Ring - Animated */}
                <div
                  className={`absolute inset-0 rounded-full transition-all duration-500 ${
                    isRecording
                      ? "bg-red-500/30"
                      : isSpeaking
                      ? "bg-emerald-500/30"
                      : isProcessing
                      ? "bg-green-500/20"
                      : "bg-emerald-500/10"
                  }`}
                  style={{
                    animation: isRecording
                      ? 'ping-slow 1.5s ease-out infinite'
                      : isSpeaking
                      ? 'pulse-ring 2s ease-in-out infinite'
                      : 'none'
                  }}
                />

                {/* Middle Ring */}
                <div
                  className={`absolute inset-0 m-8 rounded-full transition-all duration-500 ${
                    isRecording
                      ? "bg-red-500/40"
                      : isSpeaking
                      ? "bg-emerald-500/40"
                      : isProcessing
                      ? "bg-green-500/30"
                      : "bg-emerald-500/20"
                  }`}
                  style={{
                    animation: isRecording || isSpeaking ? 'pulse-ring 1.5s ease-in-out infinite 0.3s' : 'none'
                  }}
                />

                {/* Inner Orb - Interactive */}
                <div
                  className={`absolute inset-0 m-16 rounded-full flex items-center justify-center transition-all duration-500 cursor-pointer ${
                    isRecording
                      ? "bg-gradient-to-br from-red-500 to-rose-600 shadow-2xl shadow-red-500/60 scale-105"
                      : isSpeaking
                      ? "bg-gradient-to-br from-emerald-400 to-teal-500 shadow-2xl shadow-emerald-500/60"
                      : isProcessing
                      ? "bg-gradient-to-br from-green-500 to-emerald-600 shadow-2xl shadow-green-500/60"
                      : "bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 shadow-2xl shadow-emerald-500/60 hover:scale-105 hover:shadow-emerald-400/70"
                  }`}
                  onClick={!isProcessing && !isSpeaking ? handleMicClick : undefined}
                  style={{
                    animation: isSpeaking ? 'pulse-glow 1.5s ease-in-out infinite' : 'none'
                  }}
                >
                  {isProcessing ? (
                    <Loader2 className="w-24 h-24 text-white animate-spin" />
                  ) : (
                    <Mic className={`text-white transition-all drop-shadow-lg ${
                      isRecording ? "w-28 h-28 animate-pulse" : "w-24 h-24"
                    }`} />
                  )}

                  {/* Sound Wave Rings */}
                  {(isRecording || isSpeaking) && (
                    <>
                      <div
                        className="absolute w-full h-1 bg-white/40 rounded-full"
                        style={{ animation: 'wave-expand 1.5s ease-in-out infinite' }}
                      />
                      <div
                        className="absolute w-full h-1 bg-white/30 rounded-full"
                        style={{ animation: 'wave-expand 1.5s ease-in-out infinite 0.3s' }}
                      />
                      <div
                        className="absolute w-full h-1 bg-white/20 rounded-full"
                        style={{ animation: 'wave-expand 1.5s ease-in-out infinite 0.6s' }}
                      />
                    </>
                  )}
                </div>
              </div>

              {/* Status Text Area */}
              <div className="text-center mb-8 min-h-[140px] max-w-2xl px-4">
                {isRecording && (
                  <div className="animate-fade-in">
                    <p className="text-red-400 text-2xl font-bold mb-3 animate-pulse">Listening...</p>
                    <p className="text-white/70 text-base">Speak your command now</p>
                  </div>
                )}

                {isProcessing && (
                  <div className="animate-fade-in">
                    <p className="text-green-400 text-2xl font-bold mb-3">Processing...</p>
                    <p className="text-white/70 text-base">Understanding your request</p>
                  </div>
                )}

                {isSpeaking && aiResponse && (
                  <div className="animate-fade-in">
                    <p className="text-emerald-400 text-2xl font-bold mb-4 animate-pulse">Speaking...</p>
                    <p className="text-white text-lg leading-relaxed">{aiResponse}</p>
                  </div>
                )}

                {!isRecording && !isProcessing && !isSpeaking && (
                  <div className="animate-fade-in">
                    <p className="text-white/90 text-xl font-semibold mb-4">
                      {transcription || "Tap the orb to speak"}
                    </p>
                    {aiResponse && (
                      <p className="text-emerald-300 text-lg leading-relaxed">{aiResponse}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Example Commands */}
              {!isRecording && !isProcessing && !isSpeaking && !transcription && (
                <div className="text-center space-y-3 animate-fade-in">
                  <p className="text-white/50 text-sm font-medium">Try saying:</p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    <span className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-emerald-200 text-sm hover:bg-emerald-500/30 transition-colors">
                      "Show me all robots"
                    </span>
                    <span className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-emerald-200 text-sm hover:bg-emerald-500/30 transition-colors">
                      "List operators"
                    </span>
                    <span className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-emerald-200 text-sm hover:bg-emerald-500/30 transition-colors">
                      "Send MMR-31 to kitchen"
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Accent Line */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500" />
          </div>
        </div>
      )}

      {/* Custom Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes pulse-blob {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.3;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 0.5;
          }
        }

        @keyframes ping-slow {
          75%, 100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        @keyframes pulse-ring {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.8;
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 40px 10px rgba(16, 185, 129, 0.6);
          }
          50% {
            box-shadow: 0 0 60px 20px rgba(16, 185, 129, 0.8);
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes wave-expand {
          0% {
            transform: scaleX(0);
            opacity: 0.6;
          }
          50% {
            transform: scaleX(1.2);
            opacity: 0.3;
          }
          100% {
            transform: scaleX(0);
            opacity: 0;
          }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </>
  );
};

export default AIVoiceAssistant;
