import React from 'react';
import { Orb } from 'react-ai-orb';
import { VoiceWaveform } from './VoiceWaveform';

type VoiceState = 'idle' | 'listening' | 'speaking' | 'processing';

interface AnimatedVoiceOrbProps {
  state: VoiceState;
  amplitude?: number;
  frequencyData?: Uint8Array | null;
  size?: 'small' | 'medium' | 'large';
  showWaveform?: boolean;
}

/**
 * Animated voice orb that combines react-ai-orb with custom waveform
 * Manages different animation states (idle, listening, speaking, processing)
 */
export const AnimatedVoiceOrb: React.FC<AnimatedVoiceOrbProps> = ({
  state,
  amplitude = 0,
  frequencyData = null,
  size = 'medium',
  showWaveform = true,
}) => {
  // Get configuration based on state
  const getConfig = () => {
    switch (state) {
      case 'idle':
        return {
          orbSize: size === 'small' ? 0.7 : size === 'medium' ? 1.2 : 1.8,
          animationSpeedBase: 0.5,
          hueRotation: 270, // Purple range
          palette: {
            mainBgStart: '#c4b5fd',
            mainBgEnd: '#a78bfa',
            shadowColor1: '#c4b5fd',
            shadowColor2: '#c4b5fd',
            shadowColor3: '#a78bfa',
            shadowColor4: '#a78bfa',
            shapeAStart: '#ddd6fe',
            shapeAEnd: '#c4b5fd',
            shapeBStart: '#ddd6fe',
            shapeBMiddle: '#c4b5fd',
            shapeBEnd: '#c4b5fd',
            shapeCStart: '#c4b5fd',
            shapeCMiddle: '#a78bfa',
            shapeCEnd: '#a78bfa',
            shapeDStart: '#c4b5fd',
            shapeDMiddle: '#c4b5fd',
            shapeDEnd: '#a78bfa',
          },
          waveformHeight: 80,
          waveformAmplitude: 0.2,
          barCount: 28,
        };

      case 'listening':
        return {
          orbSize: size === 'small' ? 0.8 : size === 'medium' ? 1.4 : 2.0,
          animationSpeedBase: 1.2,
          hueRotation: 270,
          palette: {
            mainBgStart: '#ddd6fe',
            mainBgEnd: '#c4b5fd',
            shadowColor1: '#ddd6fe',
            shadowColor2: '#ddd6fe',
            shadowColor3: '#c4b5fd',
            shadowColor4: '#c4b5fd',
            shapeAStart: '#ede9fe',
            shapeAEnd: '#ddd6fe',
            shapeBStart: '#ddd6fe',
            shapeBMiddle: '#ddd6fe',
            shapeBEnd: '#c4b5fd',
            shapeCStart: '#ddd6fe',
            shapeCMiddle: '#c4b5fd',
            shapeCEnd: '#c4b5fd',
            shapeDStart: '#ddd6fe',
            shapeDMiddle: '#ddd6fe',
            shapeDEnd: '#c4b5fd',
          },
          waveformHeight: 120,
          waveformAmplitude: amplitude,
          barCount: 36,
        };

      case 'speaking':
        return {
          orbSize: size === 'small' ? 0.8 : size === 'medium' ? 1.4 : 2.0,
          animationSpeedBase: 1.5,
          hueRotation: 260,
          palette: {
            mainBgStart: '#c4b5fd',
            mainBgEnd: '#a78bfa',
            shadowColor1: '#c4b5fd',
            shadowColor2: '#c4b5fd',
            shadowColor3: '#a78bfa',
            shadowColor4: '#a78bfa',
            shapeAStart: '#ddd6fe',
            shapeAEnd: '#c4b5fd',
            shapeBStart: '#c4b5fd',
            shapeBMiddle: '#c4b5fd',
            shapeBEnd: '#a78bfa',
            shapeCStart: '#c4b5fd',
            shapeCMiddle: '#a78bfa',
            shapeCEnd: '#a78bfa',
            shapeDStart: '#c4b5fd',
            shapeDMiddle: '#c4b5fd',
            shapeDEnd: '#a78bfa',
          },
          waveformHeight: 120,
          waveformAmplitude: amplitude,
          barCount: 36,
        };

      case 'processing':
        return {
          orbSize: size === 'small' ? 0.8 : size === 'medium' ? 1.3 : 1.9,
          animationSpeedBase: 2.0,
          hueRotation: 280,
          palette: {
            mainBgStart: '#c4b5fd',
            mainBgEnd: '#c4b5fd',
            shadowColor1: '#c4b5fd',
            shadowColor2: '#c4b5fd',
            shadowColor3: '#a78bfa',
            shadowColor4: '#a78bfa',
            shapeAStart: '#c4b5fd',
            shapeAEnd: '#c4b5fd',
            shapeBStart: '#c4b5fd',
            shapeBMiddle: '#a78bfa',
            shapeBEnd: '#a78bfa',
            shapeCStart: '#c4b5fd',
            shapeCMiddle: '#c4b5fd',
            shapeCEnd: '#a78bfa',
            shapeDStart: '#c4b5fd',
            shapeDMiddle: '#a78bfa',
            shapeDEnd: '#a78bfa',
          },
          waveformHeight: 100,
          waveformAmplitude: 0.5,
          barCount: 32,
        };

      default:
        return {
          orbSize: 1,
          animationSpeedBase: 1,
          hueRotation: 270,
          palette: {
            mainBgStart: '#c4b5fd',
            mainBgEnd: '#a78bfa',
            shadowColor1: '#c4b5fd',
            shadowColor2: '#c4b5fd',
            shadowColor3: '#a78bfa',
            shadowColor4: '#a78bfa',
            shapeAStart: '#ddd6fe',
            shapeAEnd: '#c4b5fd',
            shapeBStart: '#ddd6fe',
            shapeBMiddle: '#c4b5fd',
            shapeBEnd: '#c4b5fd',
            shapeCStart: '#c4b5fd',
            shapeCMiddle: '#a78bfa',
            shapeCEnd: '#a78bfa',
            shapeDStart: '#c4b5fd',
            shapeDMiddle: '#c4b5fd',
            shapeDEnd: '#a78bfa',
          },
          waveformHeight: 60,
          waveformAmplitude: 0.2,
          barCount: 24,
        };
    }
  };

  const config = getConfig();

  // Get dimensions based on size
  const getDimensions = () => {
    switch (size) {
      case 'small':
        return { width: 120, height: 120, waveformWidth: 200 };
      case 'medium':
        return { width: 200, height: 200, waveformWidth: 350 };
      case 'large':
        return { width: 200, height: 200, waveformWidth: 400 };
      default:
        return { width: 200, height: 200, waveformWidth: 350 };
    }
  };

  const dimensions = getDimensions();

  return (
    <div className="animated-voice-orb-container flex flex-col items-center justify-center gap-2">
      {/* Animated Orb */}
      <div
        className="orb-wrapper transition-all duration-500 flex justify-center items-center ease-in-out"
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          filter: `drop-shadow(0 0 ${state === 'listening' || state === 'speaking' ? '12px' : '8px'} rgba(168, 85, 247, 0.5))`,
        }}
      >
        <Orb
          palette={config.palette}
          size={config.orbSize}
          animationSpeedBase={config.animationSpeedBase}
          hueRotation={config.hueRotation}
          noShadow={false}
        />
      </div>

      {/* Waveform Visualization */}
      {showWaveform && (state === 'listening' || state === 'speaking') && (
        <div className="waveform-wrapper animate-fade-in">
          <VoiceWaveform
            amplitude={config.waveformAmplitude}
            frequencyData={frequencyData}
            width={dimensions.waveformWidth}
            height={config.waveformHeight}
            barCount={config.barCount}
            barWidth={4}
            barGap={2}
            color={config.palette.mainBgStart}
            glowColor={config.palette.shapeAStart}
            isActive={true}
          />
        </div>
      )}

      {/* Idle state subtle indicator */}
      {state === 'idle' && (
        <div className="text-white/70 text-sm md:text-base font-medium animate-pulse">
          Click to speak
        </div>
      )}

      {/* Processing indicator */}
      {state === 'processing' && (
        <div className="text-purple-400 text-sm md:text-base font-medium animate-pulse">Processing...</div>
      )}

      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.3s ease-in;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .orb-wrapper {
          position: relative;
        }
      `}</style>
    </div>
  );
};

export default AnimatedVoiceOrb;
