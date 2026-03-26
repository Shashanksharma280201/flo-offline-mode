import { useEffect, useRef, useState, useCallback } from 'react';

interface AudioAnalyzerState {
  amplitude: number;
  frequencyData: Uint8Array | null;
  isActive: boolean;
}

interface UseAudioAnalyzerReturn extends AudioAnalyzerState {
  startAnalysis: (stream: MediaStream) => void;
  stopAnalysis: () => void;
  connectToAudioElement: (audioElement: HTMLAudioElement) => void;
}

/**
 * Custom hook for real-time audio analysis using Web Audio API
 * Provides amplitude and frequency data for visual animations
 */
export const useAudioAnalyzer = (): UseAudioAnalyzerReturn => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null>(null);

  const [state, setState] = useState<AudioAnalyzerState>({
    amplitude: 0,
    frequencyData: null,
    isActive: false,
  });

  /**
   * Cleanup function to stop analysis and close audio context
   */
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch (e) {
        // Already disconnected
      }
      sourceNodeRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    dataArrayRef.current = null;

    setState({
      amplitude: 0,
      frequencyData: null,
      isActive: false,
    });
  }, []);

  /**
   * Animation loop to continuously analyze audio
   */
  const analyze = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current) return;

    // Get time-domain data (waveform)
    // @ts-ignore - TypeScript false positive: Web Audio API accepts Uint8Array with ArrayBufferLike
    analyserRef.current.getByteTimeDomainData(dataArrayRef.current);

    // Calculate average amplitude (0-1 range)
    let sum = 0;
    for (let i = 0; i < dataArrayRef.current.length; i++) {
      const amplitude = Math.abs(dataArrayRef.current[i] - 128);
      sum += amplitude;
    }
    const avgAmplitude = (sum / dataArrayRef.current.length) / 128; // Normalize to 0-1

    // Get frequency data for more detailed visualizations
    const frequencyData = new Uint8Array(analyserRef.current.frequencyBinCount);
    // @ts-ignore - TypeScript false positive: Web Audio API accepts Uint8Array with ArrayBufferLike
    analyserRef.current.getByteFrequencyData(frequencyData);

    setState(prev => ({
      ...prev,
      amplitude: avgAmplitude,
      frequencyData: frequencyData,
    }));

    // Continue animation loop
    animationFrameRef.current = requestAnimationFrame(analyze);
  }, []);

  /**
   * Start analyzing audio from a MediaStream (microphone)
   */
  const startAnalysis = useCallback((stream: MediaStream) => {
    try {
      // Cleanup previous analysis
      cleanup();

      // Create Audio Context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Create Analyser Node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048; // Higher = more detail, lower = better performance
      analyser.smoothingTimeConstant = 0.8; // 0-1, higher = smoother
      analyserRef.current = analyser;

      // Create data array for waveform
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      dataArrayRef.current = dataArray;

      // Connect microphone stream to analyser
      const source = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = source;
      source.connect(analyser);

      setState(prev => ({ ...prev, isActive: true }));

      // Start animation loop
      analyze();
    } catch (error) {
      console.error('Error starting audio analysis:', error);
      cleanup();
    }
  }, [cleanup, analyze]);

  /**
   * Connect to an HTML audio element for TTS visualization
   */
  const connectToAudioElement = useCallback((audioElement: HTMLAudioElement) => {
    try {
      // Cleanup previous analysis
      cleanup();

      // Create Audio Context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Create Analyser Node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      // Create data array
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      dataArrayRef.current = dataArray;

      // Connect audio element to analyser
      const source = audioContext.createMediaElementSource(audioElement);
      sourceNodeRef.current = source;
      source.connect(analyser);
      analyser.connect(audioContext.destination); // Important: connect to speakers!

      setState(prev => ({ ...prev, isActive: true }));

      // Start animation loop
      analyze();
    } catch (error) {
      console.error('Error connecting to audio element:', error);
      cleanup();
    }
  }, [cleanup, analyze]);

  /**
   * Stop audio analysis
   */
  const stopAnalysis = useCallback(() => {
    cleanup();
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    ...state,
    startAnalysis,
    stopAnalysis,
    connectToAudioElement,
  };
};
