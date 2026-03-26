import React, { useEffect, useRef } from 'react';

interface SiriWaveformProps {
  isActive: boolean;
  amplitude?: number;
  state: 'idle' | 'listening' | 'speaking' | 'processing';
  size?: 'small' | 'medium' | 'large';
}

/**
 * Siri-style organic blob with smooth morphing and colorful gradients
 */
export const SiriWaveform: React.FC<SiriWaveformProps> = ({
  isActive,
  amplitude = 0.5,
  state,
  size = 'medium',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);

  // Size configurations
  const sizeConfig = {
    small: { canvasSize: 180, baseRadius: 40 },
    medium: { canvasSize: 240, baseRadius: 60 },
    large: { canvasSize: 300, baseRadius: 80 },
  };

  const config = sizeConfig[size];

  // Siri blob colors
  const colors = {
    cyan: { r: 0, g: 199, b: 255 },
    blue: { r: 88, g: 86, b: 214 },
    purple: { r: 168, g: 85, b: 247 },
    pink: { r: 236, g: 72, b: 153 },
    orange: { r: 249, g: 115, b: 22 },
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    const size = config.canvasSize;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const centerY = size / 2;

    const draw = () => {
      ctx.clearRect(0, 0, size, size);

      // Draw Siri blob
      drawSiriBlob(ctx, centerX, centerY);

      timeRef.current += isActive ? 0.03 : 0.01;
      animationFrameRef.current = requestAnimationFrame(draw);
    };

    const drawSiriBlob = (ctx: CanvasRenderingContext2D, cx: number, cy: number) => {
      const numPoints = 12;
      const angleStep = (Math.PI * 2) / numPoints;
      const baseRadius = config.baseRadius;
      const morphAmount = isActive ? (amplitude * 30 + 15) : 5;

      // Create path for the blob
      ctx.beginPath();

      for (let i = 0; i <= numPoints; i++) {
        const angle = i * angleStep;

        // Create organic morphing effect with multiple sine waves
        const morph1 = Math.sin(timeRef.current * 2 + i * 0.5) * morphAmount * 0.4;
        const morph2 = Math.sin(timeRef.current * 3 + i * 0.7) * morphAmount * 0.3;
        const morph3 = Math.sin(timeRef.current * 1.5 + i * 0.3) * morphAmount * 0.2;

        const radius = baseRadius + morph1 + morph2 + morph3;

        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          // Use quadratic curves for smooth blob shape
          const prevAngle = (i - 1) * angleStep;
          const prevRadius = baseRadius +
            Math.sin(timeRef.current * 2 + (i - 1) * 0.5) * morphAmount * 0.4 +
            Math.sin(timeRef.current * 3 + (i - 1) * 0.7) * morphAmount * 0.3 +
            Math.sin(timeRef.current * 1.5 + (i - 1) * 0.3) * morphAmount * 0.2;

          const prevX = cx + Math.cos(prevAngle) * prevRadius;
          const prevY = cy + Math.sin(prevAngle) * prevRadius;

          const cpAngle = (prevAngle + angle) / 2;
          const cpRadius = (prevRadius + radius) / 2 + morphAmount * 0.3;
          const cpX = cx + Math.cos(cpAngle) * cpRadius;
          const cpY = cy + Math.sin(cpAngle) * cpRadius;

          ctx.quadraticCurveTo(cpX, cpY, x, y);
        }
      }

      ctx.closePath();

      // Create colorful gradient
      const gradient = ctx.createRadialGradient(
        cx - baseRadius * 0.3, cy - baseRadius * 0.3, 0,
        cx, cy, baseRadius * 1.5
      );

      if (isActive) {
        gradient.addColorStop(0, `rgba(${colors.cyan.r}, ${colors.cyan.g}, ${colors.cyan.b}, 0.9)`);
        gradient.addColorStop(0.2, `rgba(${colors.blue.r}, ${colors.blue.g}, ${colors.blue.b}, 0.8)`);
        gradient.addColorStop(0.5, `rgba(${colors.purple.r}, ${colors.purple.g}, ${colors.purple.b}, 0.85)`);
        gradient.addColorStop(0.75, `rgba(${colors.pink.r}, ${colors.pink.g}, ${colors.pink.b}, 0.8)`);
        gradient.addColorStop(1, `rgba(${colors.orange.r}, ${colors.orange.g}, ${colors.orange.b}, 0.6)`);
      } else {
        gradient.addColorStop(0, `rgba(${colors.purple.r}, ${colors.purple.g}, ${colors.purple.b}, 0.6)`);
        gradient.addColorStop(0.5, `rgba(${colors.blue.r}, ${colors.blue.g}, ${colors.blue.b}, 0.4)`);
        gradient.addColorStop(1, `rgba(${colors.purple.r}, ${colors.purple.g}, ${colors.purple.b}, 0.2)`);
      }

      ctx.fillStyle = gradient;
      ctx.shadowBlur = isActive ? 40 : 20;
      ctx.shadowColor = `rgba(${colors.purple.r}, ${colors.purple.g}, ${colors.purple.b}, 0.8)`;
      ctx.fill();

      // Add inner glow
      if (isActive) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowBlur = 30;
        ctx.shadowColor = `rgba(${colors.cyan.r}, ${colors.cyan.g}, ${colors.cyan.b}, 0.6)`;
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, amplitude, state, config.canvasSize, config.baseRadius]);

  return (
    <div className="siri-waveform-container">
      <canvas
        ref={canvasRef}
        className="siri-waveform-canvas"
        style={{
          display: 'block',
          margin: '0 auto',
        }}
      />
    </div>
  );
};

export default SiriWaveform;
