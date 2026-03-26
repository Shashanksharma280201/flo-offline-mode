import { useState, useRef, useEffect } from "react";
import {
    MdMic,
    MdStop,
    MdDelete,
    MdUploadFile,
    MdSend,
    MdClose,
    MdPlayArrow,
    MdPause,
    MdDownload
} from "react-icons/md";
import { toast } from "react-toastify";
import axios from "axios";
import { getAuthHeader } from "@/features/auth/authService";

interface AudioRecorderProps {
    onRecordingComplete: (audioData: string, duration: number) => void;
    onTranscriptionComplete?: (transcription: string) => void;
    existingAudio?: string;
    onClearAudio?: () => void;
    enableTranscription?: boolean; // Make transcription optional
    allowFileUpload?: boolean; // Allow audio/document upload
    onFileUpload?: (
        fileData: string,
        fileName: string,
        fileType: string
    ) => void;
}

export const AudioRecorder = ({
    onRecordingComplete,
    onTranscriptionComplete,
    existingAudio,
    onClearAudio,
    enableTranscription = true,
    allowFileUpload = false,
    onFileUpload
}: AudioRecorderProps) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioURL, setAudioURL] = useState(existingAudio || "");
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [shouldTranscribe, setShouldTranscribe] =
        useState(enableTranscription);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (existingAudio) {
            setAudioURL(existingAudio);
        }
    }, [existingAudio]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true
            });
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: "audio/webm"
            });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, {
                    type: "audio/webm"
                });
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = async () => {
                    const base64 = reader.result as string;
                    setAudioURL(base64);
                    onRecordingComplete(base64, recordingTime);

                    // Auto-transcribe only if enabled and callback provided
                    if (
                        shouldTranscribe &&
                        onTranscriptionComplete &&
                        enableTranscription
                    ) {
                        await transcribeAudio(base64);
                    }
                };
                stream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            // Start timer
            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => {
                    if (prev >= 120) {
                        // Max 2 minutes
                        stopRecording();
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000);
        } catch (error) {
            toast.error("Microphone access denied");
            console.error("Recording error:", error);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }
    };

    const transcribeAudio = async (audioData: string) => {
        setIsTranscribing(true);
        try {
            const response = await axios.post(
                "/api/v1/transcription/transcribe",
                { audioData },
                {
                    headers: getAuthHeader()
                }
            );

            if (response.data?.text && onTranscriptionComplete) {
                onTranscriptionComplete(response.data.text);
                toast.success("Audio transcribed successfully!");
            }
        } catch (error: any) {
            console.error("Transcription error:", error);
            toast.error(
                error.response?.data?.message || "Failed to transcribe audio"
            );
        } finally {
            setIsTranscribing(false);
        }
    };

    const clearRecording = () => {
        setAudioURL("");
        setRecordingTime(0);
        if (onClearAudio) onClearAudio();
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Comprehensive file type validation for all platforms
        const allowedTypes = [
            // Audio formats (iOS, Android, Desktop)
            "audio/",
            // Video formats (for voice notes on some platforms)
            "video/",
            // Image formats (all platforms)
            "image/",
            // Documents - PDF
            "application/pdf",
            // Documents - Microsoft Office
            "application/msword", // .doc
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
            "application/vnd.ms-excel", // .xls
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
            "application/vnd.ms-powerpoint", // .ppt
            "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
            // Text files
            "text/plain", // .txt
            "text/csv", // .csv
            // Archives
            "application/zip", // .zip
            "application/x-rar-compressed", // .rar
            "application/x-7z-compressed", // .7z
            // Other common types
            "application/octet-stream" // Generic binary (fallback for some platforms)
        ];

        const isAllowedType = allowedTypes.some(
            (type) => file.type.startsWith(type) || file.type === type
        );

        // Additional check for file extensions (iOS/Android sometimes don't provide correct MIME types)
        const allowedExtensions = [
            ".mp3",
            ".wav",
            ".m4a",
            ".aac",
            ".ogg",
            ".webm",
            ".opus",
            ".flac",
            ".mp4",
            ".mov",
            ".avi",
            ".jpg",
            ".jpeg",
            ".png",
            ".gif",
            ".webp",
            ".heic",
            ".heif",
            ".pdf",
            ".doc",
            ".docx",
            ".xls",
            ".xlsx",
            ".ppt",
            ".pptx",
            ".txt",
            ".csv",
            ".zip",
            ".rar",
            ".7z"
        ];

        const fileExtension = file.name
            .toLowerCase()
            .substring(file.name.lastIndexOf("."));
        const hasValidExtension = allowedExtensions.includes(fileExtension);

        if (!isAllowedType && !hasValidExtension) {
            toast.error(
                "File type not supported. Please upload audio, video, documents, or images."
            );
            return;
        }

        // Check file size (max 25MB for better mobile support)
        if (file.size > 25 * 1024 * 1024) {
            toast.error("File size must be less than 25MB");
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => {
            const base64 = reader.result as string;

            // Determine file type
            const isAudio =
                file.type.startsWith("audio/") ||
                [
                    ".mp3",
                    ".wav",
                    ".m4a",
                    ".aac",
                    ".ogg",
                    ".webm",
                    ".opus",
                    ".flac"
                ].includes(fileExtension);

            if (isAudio) {
                // For audio files, use the existing audio handler
                setAudioURL(base64);
                onRecordingComplete(base64, 0);
                toast.success("Audio file uploaded successfully!");
            } else if (onFileUpload) {
                // For documents/images/videos, use the file upload callback
                onFileUpload(
                    base64,
                    file.name,
                    file.type || "application/octet-stream"
                );
                toast.success(`${file.name} uploaded successfully!`);
            }
        };

        reader.onerror = () => {
            toast.error("Failed to read file");
        };

        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div className="flex flex-col gap-2">
            {/* Initial State - Mic and Upload buttons */}
            {!audioURL && !isRecording && (
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={startRecording}
                        className="group flex items-center gap-2 rounded-full bg-primary600 px-4 py-2 text-black transition-all hover:bg-primary700"
                        title="Record audio"
                    >
                        <MdMic className="h-5 w-5" />
                        <span className="text-sm font-medium">Record</span>
                    </button>

                    {allowFileUpload && (
                        <>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="audio/*,video/*,image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-shrink-0 rounded-full border border-border p-2 text-white hover:bg-backgroundGray/30"
                                title="Upload file"
                            >
                                <MdUploadFile className="h-5 w-5" />
                            </button>
                        </>
                    )}

                    {enableTranscription && onTranscriptionComplete && (
                        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-400">
                            <input
                                type="checkbox"
                                checked={shouldTranscribe}
                                onChange={(e) =>
                                    setShouldTranscribe(e.target.checked)
                                }
                                className="cursor-pointer rounded border-gray-600 bg-transparent"
                            />
                            <span className="whitespace-nowrap">
                                Auto-transcribe
                            </span>
                        </label>
                    )}
                </div>
            )}

            {/* Recording State - WhatsApp Style */}
            {isRecording && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-3 sm:gap-3 sm:px-4">
                    <div className="flex flex-shrink-0 items-center gap-2">
                        <div className="relative flex h-8 w-8 items-center justify-center sm:h-10 sm:w-10">
                            <div className="absolute h-full w-full animate-ping rounded-full bg-red-500 opacity-20"></div>
                            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-red-500 sm:h-10 sm:w-10">
                                <MdMic className="h-4 w-4 text-white sm:h-5 sm:w-5" />
                            </div>
                        </div>
                    </div>

                    {/* Waveform Animation */}
                    <div className="flex flex-1 items-center gap-0.5 overflow-hidden sm:gap-1">
                        {[...Array(20)].map((_, i) => (
                            <div
                                key={i}
                                className="w-0.5 animate-pulse rounded-full bg-red-500 sm:w-1"
                                style={{
                                    height: `${Math.random() * 24 + 8}px`,
                                    animationDelay: `${i * 0.1}s`,
                                    animationDuration: "0.8s"
                                }}
                            />
                        ))}
                    </div>

                    <span className="min-w-[2.5rem] flex-shrink-0 font-mono text-xs font-semibold text-red-500 sm:min-w-[3rem] sm:text-sm">
                        {formatTime(recordingTime)}
                    </span>

                    <button
                        type="button"
                        onClick={stopRecording}
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600 sm:h-10 sm:w-10"
                        title="Stop recording"
                    >
                        <MdStop className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                </div>
            )}

            {/* Audio Preview - WhatsApp Style */}
            {audioURL && !isRecording && (
                <div className="flex items-center gap-2 rounded-lg border border-primary600/30 bg-primary600/10 px-3 py-3 sm:gap-3 sm:px-4">
                    {isTranscribing ? (
                        <div className="flex flex-1 items-center gap-2">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary600 border-t-transparent sm:h-8 sm:w-8"></div>
                            <span className="text-xs font-medium text-primary600 sm:text-sm">
                                Transcribing audio...
                            </span>
                        </div>
                    ) : (
                        <>
                            <WhatsAppAudioPlayer
                                audioURL={audioURL}
                                duration={recordingTime}
                            />

                            <button
                                type="button"
                                onClick={clearRecording}
                                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border text-white transition-colors hover:border-red-500 hover:bg-red-500/20 sm:h-10 sm:w-10"
                                title="Delete recording"
                            >
                                <MdDelete className="h-4 w-4 sm:h-5 sm:w-5" />
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

// WhatsApp-style audio player component
const WhatsAppAudioPlayer = ({
    audioURL,
    duration
}: {
    audioURL: string;
    duration: number;
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(duration);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => setAudioDuration(audio.duration);
        const handleEnded = () => setIsPlaying(false);

        audio.addEventListener("timeupdate", updateTime);
        audio.addEventListener("loadedmetadata", updateDuration);
        audio.addEventListener("ended", handleEnded);

        return () => {
            audio.removeEventListener("timeupdate", updateTime);
            audio.removeEventListener("loadedmetadata", updateDuration);
            audio.removeEventListener("ended", handleEnded);
        };
    }, []);

    const togglePlayPause = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
        setIsPlaying(!isPlaying);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const handleDownload = () => {
        const link = document.createElement("a");
        link.href = audioURL;
        link.download = `audio-${Date.now()}.webm`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const progress =
        audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

    return (
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <audio ref={audioRef} src={audioURL} />

            <button
                type="button"
                onClick={togglePlayPause}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary600 text-black transition-colors hover:bg-primary700 sm:h-10 sm:w-10"
            >
                {isPlaying ? (
                    <MdPause className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                    <MdPlayArrow className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
            </button>

            <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:gap-1">
                <div className="relative h-1 w-full overflow-hidden rounded-full bg-primary600/20">
                    <div
                        className="absolute h-full bg-primary600 transition-all duration-100"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <span className="truncate font-mono text-[10px] text-gray-400 sm:text-xs">
                    {formatTime(currentTime)} / {formatTime(audioDuration)}
                </span>
            </div>

            <button
                type="button"
                onClick={handleDownload}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border text-white transition-colors hover:border-primary600 hover:bg-primary600/20 sm:h-10 sm:w-10"
                title="Download audio"
            >
                <MdDownload className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
        </div>
    );
};
