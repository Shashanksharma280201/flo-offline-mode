import React, { useEffect, useRef } from 'react';

interface VoiceWaveformProps {
  amplitude: number;
  frequencyData?: Uint8Array | null;
  width?: number;
  height?: number;
  barCount?: number;
  barWidth?: number;
  barGap?: number;
  color?: string;
  glowColor?: string;
  isActive?: boolean;
}

/**
 * Canvas-based audio waveform visualization
 * Renders animated bars that react to audio amplitude
 */
export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
  amplitude,
  frequencyData,
  width = 300,
  height = 150,
  barCount = 32,
  barWidth = 4,
  barGap = 2,
  color = '#a855f7',
  glowColor = '#a855f7',
  isActive = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size (accounting for device pixel ratio)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const draw = () => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      if (!isActive) {
        return;
      }

      // Calculate bar dimensions
      const totalBarWidth = barWidth + barGap;
      const centerX = width / 2;
      const startX = centerX - (barCount * totalBarWidth) / 2;

      // Create gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, color);
      gradient.addColorStop(1, 'rgba(196, 181, 253, 0.3)');

      ctx.fillStyle = gradient;
      ctx.shadowBlur = 10;
      ctx.shadowColor = glowColor;

      // Draw bars
      for (let i = 0; i < barCount; i++) {
        // Calculate bar height based on frequency data or amplitude
        let barHeight;

        if (frequencyData && frequencyData.length > 0) {
          // Use frequency data for more detailed visualization
          const index = Math.floor((i / barCount) * frequencyData.length);
          const value = frequencyData[index] || 0;
          barHeight = (value / 255) * height * 0.8;
        } else {
          // Use amplitude with some variation
          const variation = Math.sin((i / barCount) * Math.PI * 2 + Date.now() / 500) * 0.3 + 0.7;
          barHeight = amplitude * height * 0.6 * variation;
        }

        // Minimum height for visual effect
        const minHeight = 4;
        barHeight = Math.max(barHeight, minHeight);

        // Position bars
        const x = startX + i * totalBarWidth;
        const y = (height - barHeight) / 2;

        // Draw rounded rectangle
        const radius = barWidth / 2;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, radius);
        ctx.fill();
      }

      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(draw);
    };

    // Start animation
    draw();

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [amplitude, frequencyData, width, height, barCount, barWidth, barGap, color, glowColor, isActive]);

  return (
    <canvas
      ref={canvasRef}
      className="voice-waveform"
      style={{
        display: 'block',
        margin: '0 auto',
      }}
    />
  );
};

export default VoiceWaveform;
