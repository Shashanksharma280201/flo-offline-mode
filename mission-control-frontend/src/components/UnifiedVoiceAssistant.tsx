import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { getAuthHeader } from "@/features/auth/authService";
import { LottieSiriOrb } from "./LottieSiriOrb";
import { useAudioAnalyzer } from "@/hooks/useAudioAnalyzer";

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
  needsInput?: boolean;
  disambiguationData?: {
    type: string;
    query: string;
    options: Array<{
      number: number;
      name: string;
      id?: string;
      status?: string;
    }>;
    message: string;
  };
  confirmationData?: {
    action: string;
    entity: string;
    message: string;
  };
  error?: string;
}

export const UnifiedVoiceAssistant: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [conversationId, setConversationId] = useState<string>("");
  const [showResponse, setShowResponse] = useState(false);

  // Disambiguation state
  const [disambiguationData, setDisambiguationData] = useState<any>(null);
  const [disambiguationDialogOpen, setDisambiguationDialogOpen] = useState(false);

  // Confirmation state
  const [confirmationData, setConfirmationData] = useState<any>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const isCancelledRef = useRef<boolean>(false);
  const navigate = useNavigate();

  // Audio analyzer for waveform visualization
  const { amplitude, frequencyData, startAnalysis, stopAnalysis } = useAudioAnalyzer();

  // Text-to-speech function
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 0.9;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setShowResponse(true);
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        // Hide response after 3 seconds
        setTimeout(() => {
          if (!disambiguationDialogOpen && !confirmDialogOpen) {
            setShowResponse(false);
            setTranscription("");
            setAiResponse("");
          }
        }, 3000);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setShowResponse(false);
      };

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

      // Store stream reference
      mediaStreamRef.current = stream;

      // Start audio analysis for visualization
      startAnalysis(stream);

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

        // Stop audio analysis
        stopAnalysis();

        // Stop media stream
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }

        // Only send audio if not cancelled
        if (!isCancelledRef.current) {
          sendAudio(audioBlob);
        } else {
          // Reset cancelled flag for next recording
          isCancelledRef.current = false;
        }
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
  const stopRecording = (cancelled: boolean = false) => {
    // Set cancelled flag if user cancelled
    if (cancelled) {
      isCancelledRef.current = true;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    // Stop audio analysis
    stopAnalysis();

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  // Send audio to backend
  const sendAudio = async (blob: Blob, convId?: string) => {
    if (!blob) return;

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append("audio", blob, "voice-command.webm");

      // Add conversation ID for multi-turn dialogs
      if (convId) {
        formData.append("conversationId", convId);
      }

      const response = await axios.post(
        "/api/v1/ai-agent/command",
        formData,
        {
          headers: {
            ...getAuthHeader(),
            "Content-Type": "multipart/form-data"
          }
        }
      );

      const data = response.data as AIResponse;

      setTranscription(data.transcription);
      setAiResponse(data.response);

      // Store conversation ID for follow-ups
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      // Speak the response
      speak(data.response);

      // Handle navigation
      if (data.navigation) {
        // Check if it's analytics navigation with params
        if (data.navigation.path === '/analytics' && (data.navigation.params || (data.navigation as any).analyticsParams)) {
          // Use analyticsParams if available, otherwise fall back to params
          const analyticsParams = (data.navigation as any).analyticsParams || data.navigation.params;

          console.log('=== ANALYTICS NAVIGATION WITH PARAMS ===');
          console.log('Analytics Params:', analyticsParams);

          // Navigate to analytics page FIRST
          navigate('/analytics');

          // Then dispatch event AFTER navigation (with delay to ensure page is mounted)
          setTimeout(() => {
            console.log('=== DISPATCHING ANALYTICS EVENT AFTER NAVIGATION ===');
            window.dispatchEvent(new CustomEvent('analytics-navigate', {
              detail: analyticsParams
            }));
          }, 800);
        }
        // Check if it's leads analytics navigation with params
        else if (data.navigation.path === '/leads/analytics' && data.navigation.params) {
          // Dispatch leads analytics navigation event with params
          window.dispatchEvent(new CustomEvent('leads-analytics-navigate', {
            detail: data.navigation.params
          }));

          // Navigate to leads analytics page
          setTimeout(() => {
            navigate('/leads/analytics');
          }, 500);
        }
        else {
          // Regular navigation
          setTimeout(() => {
            navigate(data.navigation!.path, {
              state: data.navigation!.params
            });
          }, 1500);
        }
      }
      // AUTO-NAVIGATION: If no explicit navigation but data functions were executed, auto-navigate to relevant page
      else if (data.executedFunctions && data.executedFunctions.length > 0) {
        // Define function-to-page mapping
        const functionPageMap: { [key: string]: string } = {
          searchLeads: '/leads',
          getLeadDetails: '/leads',
          getLeadsByStage: '/leads',
          getLeadsByProduct: '/leads',
          getTotalACV: '/leads',
          getTotalTCV: '/leads',
          searchRobots: '/robots',
          getRobotDetails: '/robots',
          listRobots: '/robots',
          getRobotsByFleet: '/robots',
          getRobotsByStatus: '/robots',
          searchIssues: '/issues',
          getIssueDetails: '/issues',
          listIssues: '/issues',
          getIssuesByDateRange: '/issues',
          searchOperators: '/operators',
          getOperatorDetails: '/operators',
          listOperators: '/operators',
          searchClients: '/clients',
          getClientDetails: '/clients',
          listClients: '/clients',
          listPathMaps: '/path-maps',
          getPathMapDetails: '/path-maps',
          getMissionsInPathMap: '/missions',
          getTripAnalytics: '/analytics',
          getTopPerformers: '/analytics',
          getFleetOverview: '/analytics',
        };

        // Check if any executed function maps to a page
        for (const execFunc of data.executedFunctions) {
          const targetPage = functionPageMap[execFunc.function];
          if (targetPage) {
            console.log(`=== AUTO-NAVIGATION: ${execFunc.function} → ${targetPage} ===`);

            // For analytics page, navigate first, then dispatch event
            if (targetPage === '/analytics') {
              // Navigate immediately
              navigate(targetPage);

              // Dispatch event after navigation with delay to ensure page is mounted
              setTimeout(() => {
                console.log('=== AUTO-NAV: DISPATCHING ANALYTICS EVENT ===');
                console.log('Function result:', execFunc.result);

                // Extract parameters from the function arguments (period, robotId, etc.)
                const analyticsParams = execFunc.arguments || {};
                window.dispatchEvent(new CustomEvent('analytics-navigate', {
                  detail: analyticsParams
                }));
              }, 800);
            } else {
              // For other pages, navigate with delay
              setTimeout(() => {
                navigate(targetPage);
              }, 1500);
            }
            break; // Only navigate to the first matching page
          }
        }
      }

      // Highlight data elements if present
      if (data.dataHighlights && Object.keys(data.dataHighlights).length > 0) {
        highlightDataElements(data.dataHighlights);
      }

      // Handle mission execution (dispatch to Autonomy Agent)
      if (data.missionExecution) {
        console.log("Mission execution data received:", data.missionExecution);

        // Dispatch custom event for mission execution
        // This can be picked up by ExecuteMissionViaVoice or other mission components
        window.dispatchEvent(new CustomEvent('mission-execution-requested', {
          detail: data.missionExecution
        }));

        // Note: The Master Agent should not typically return mission execution data
        // This is handled by the Autonomy Agent (ExecuteMissionViaVoice)
        // But we keep this here for compatibility if backend sends it
        console.warn("Mission execution data received from Master Agent - should use Autonomy Agent instead");
      }

      // Handle disambiguation
      if (data.needsInput && data.disambiguationData) {
        setDisambiguationData(data.disambiguationData);
        setDisambiguationDialogOpen(true);
        return;
      }

      // Handle confirmation
      if (data.needsInput && data.confirmationData) {
        setConfirmationData(data.confirmationData);
        setConfirmDialogOpen(true);
        return;
      }

    } catch (error: any) {
      console.error("Error processing voice command:", error);

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

  // Highlight data elements on the page (Master Agent)
  const highlightDataElements = (highlights: any) => {
    sessionStorage.setItem('ai-highlights', JSON.stringify(highlights));
    window.dispatchEvent(new CustomEvent('ai-highlight', { detail: highlights }));
  };

  // Handle disambiguation choice (Autonomy Agent)
  const handleDisambiguationChoice = async (choiceName: string) => {
    setDisambiguationDialogOpen(false);

    // Speak the choice as a text command
    const choiceText = choiceName;
    const choiceBlob = await textToAudioBlob(choiceText);

    if (choiceBlob) {
      sendAudio(choiceBlob, conversationId);
    }
  };

  // Handle confirmation (Autonomy Agent)
  const handleConfirmation = async (confirmed: boolean) => {
    setConfirmDialogOpen(false);

    const confirmText = confirmed ? "yes confirm" : "no cancel";
    const confirmBlob = await textToAudioBlob(confirmText);

    if (confirmBlob) {
      sendAudio(confirmBlob, conversationId);
    }
  };

  // Convert text to audio blob (for follow-up commands)
  const textToAudioBlob = async (text: string): Promise<Blob | null> => {
    // For now, just create a dummy blob - in production you'd use TTS or user would speak
    // This is a workaround for testing
    return new Blob([text], { type: 'text/plain' });
  };

  // Toggle recording
  const handleOrbClick = () => {
    if (isRecording) {
      stopRecording();
    } else if (!isProcessing && !isSpeaking) {
      startRecording();
    }
  };

  const getAgentColor = () => {
    return "from-purple-500 via-violet-500 to-indigo-500";
  };

  // Determine current voice state for animation
  const getVoiceState = (): 'idle' | 'listening' | 'speaking' | 'processing' => {
    if (isRecording) return 'listening';
    if (isSpeaking) return 'speaking';
    if (isProcessing) return 'processing';
    return 'idle';
  };

  // Determine if orb should be expanded
  const isActive = isRecording || isProcessing || isSpeaking;

  // Handle Escape key to cancel/close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isRecording) {
          stopRecording(true);
        }
        if (isSpeaking) {
          stopSpeaking();
        }
        if (showResponse) {
          setShowResponse(false);
          setTranscription("");
          setAiResponse("");
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isRecording, isSpeaking, showResponse]);

  return (
    <>
      {/* Background Blur Overlay - Only when active */}
      {isActive && (
        <div
          className="fixed inset-0 bg-gradient-to-tl from-black/50 via-black/25 to-transparent backdrop-blur-sm z-40 transition-all duration-500"
          onClick={() => {
            if (isRecording) stopRecording(true);
            if (isSpeaking) stopSpeaking();
          }}
        />
      )}

      {/* Voice Assistant - Bottom Left */}
      <div className="fixed bottom-3 left-3 md:bottom-4 md:left-4 z-50">
        <div className="relative">
          {/* Response Bubble - Shows above the orb */}
          {showResponse && (aiResponse || transcription) && (
            <div
              className="absolute bottom-full left-0 mb-3 md:mb-4 animate-slide-up w-[85vw] md:w-[600px] lg:w-[700px]"
            >
            <div className="bg-gradient-to-br from-slate-900/95 via-purple-950/95 to-slate-900/95 border border-purple-500/40 rounded-2xl px-3 py-2 md:px-4 md:py-2.5 shadow-2xl backdrop-blur-xl relative ring-1 ring-purple-500/20">
              {/* Close button */}
              <button
                onClick={() => {
                  setShowResponse(false);
                  setTranscription("");
                  setAiResponse("");
                  stopSpeaking();
                }}
                className="absolute top-2 right-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full p-1 transition-all"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>

              {transcription && (
                <div className="mb-2 pr-6">
                  <p className="text-purple-300 text-xs font-semibold mb-1">You said:</p>
                  <p className="text-white/90 text-xs leading-relaxed">{transcription}</p>
                </div>
              )}
              {aiResponse && (
                <div className="pr-6">
                  <p className="text-emerald-300 text-xs font-semibold mb-1">AI:</p>
                  <p className="text-white text-xs leading-relaxed">{aiResponse}</p>
                </div>
              )}
              {/* Pointer arrow */}
              <div className="absolute bottom-0 left-6 translate-y-1/2">
                <div className="w-3 h-3 bg-slate-900 border-r border-b border-purple-500/40 transform rotate-45 ring-1 ring-purple-500/20" />
              </div>
            </div>
            </div>
          )}

          {/* Status Text - Shows during recording/processing */}
          {isActive && !showResponse && (
            <div className="absolute bottom-full left-0 mb-3 md:mb-4 animate-slide-up flex flex-col items-start gap-1.5 md:gap-2">
              <div className="bg-slate-900/95 border border-purple-500/40 rounded-lg md:rounded-xl px-3 py-1.5 md:px-4 md:py-2 backdrop-blur-xl shadow-xl ring-1 ring-purple-500/20">
                <p className={`text-[10px] md:text-xs font-semibold whitespace-nowrap ${
                  isRecording ? 'text-red-400' :
                  isProcessing ? 'text-violet-400' :
                  'text-purple-400'
                }`}>
                  {isRecording && 'Listening...'}
                  {isProcessing && 'Processing...'}
                  {isSpeaking && 'Speaking...'}
                </p>
              </div>
              {(isRecording || isSpeaking) && (
                <button
                  onClick={() => {
                    if (isRecording) stopRecording(true);
                    if (isSpeaking) stopSpeaking();
                  }}
                  className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/60 hover:border-red-500 text-red-300 hover:text-red-200 px-2.5 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg text-[10px] md:text-xs font-semibold transition-all backdrop-blur-xl shadow-lg ring-1 ring-red-500/30 hover:scale-105"
                >
                  Cancel
                </button>
              )}
            </div>
          )}

          {/* Lottie Siri Voice Assistant */}
          <button
            onClick={handleOrbClick}
            className={`group relative transition-all duration-300 ${isActive ? 'scale-110' : 'hover:scale-105 active:scale-95'}`}
            style={{
              animation: !isActive ? 'float 2s ease-in-out infinite' : 'none'
            }}
            title="AI Voice Assistant - Click to talk"
            disabled={isProcessing}
          >
            <LottieSiriOrb
              state={getVoiceState()}
              size="large"
            />
          </button>
        </div>
      </div>

      {/* Disambiguation Dialog */}
      {disambiguationDialogOpen && disambiguationData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-purple-500/30 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Choose Option</h3>
            <p className="text-white/70 mb-6">{disambiguationData.message}</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {disambiguationData.options.map((option: any) => (
                <button
                  key={option.number}
                  onClick={() => handleDisambiguationChoice(option.name)}
                  className="w-full flex items-center justify-between p-3 rounded-md border border-slate-700 bg-slate-900 hover:bg-purple-600/20 hover:border-purple-600 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">
                      {option.number}
                    </span>
                    <span className="text-sm font-medium text-white">{option.name}</span>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setDisambiguationDialogOpen(false)}
              className="mt-4 w-full px-4 py-2 bg-white/10 hover:bg-white/20 rounded-md text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialogOpen && confirmationData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-purple-500/30 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Action</h3>
            <p className="text-white/70 mb-6">{confirmationData.message}</p>
            <div className="flex gap-4">
              <button
                onClick={() => handleConfirmation(true)}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md text-white font-semibold transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => handleConfirmation(false)}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-md text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
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

        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 40px 10px rgba(139, 92, 246, 0.6);
          }
          50% {
            box-shadow: 0 0 60px 20px rgba(139, 92, 246, 0.8);
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

        .animate-slide-up {
          animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </>
  );
};

export default UnifiedVoiceAssistant;
