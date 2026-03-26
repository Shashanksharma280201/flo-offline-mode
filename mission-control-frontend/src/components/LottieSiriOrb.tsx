import React, { useState, useEffect, useRef } from 'react';
import Lottie from 'lottie-react';

type VoiceState = 'idle' | 'listening' | 'speaking' | 'processing';

interface LottieSiriOrbProps {
  state: VoiceState;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Siri animation using Lottie JSON from LottieFiles
 * Direct Siri-style blob animation with smooth morphing
 */
export const LottieSiriOrb: React.FC<LottieSiriOrbProps> = ({
  state,
  size = 'medium',
}) => {
  const [animationData, setAnimationData] = useState<any>(null);
  const lottieRef = useRef<any>(null);

  // Size configurations - responsive for mobile and desktop
  const sizeConfig = {
    small: {
      mobile: { width: 50, height: 50 },
      desktop: { width: 60, height: 60 }
    },
    medium: {
      mobile: { width: 60, height: 60 },
      desktop: { width: 80, height: 80 }
    },
    large: {
      mobile: { width: 70, height: 70 },
      desktop: { width: 100, height: 100 }
    },
  };

  // Use mobile size for screens < 768px (Tailwind md breakpoint)
  const isMobile = window.innerWidth < 768;
  const dimensions = isMobile ? sizeConfig[size].mobile : sizeConfig[size].desktop;

  // Animation speed based on state
  const getSpeed = () => {
    switch (state) {
      case 'listening':
        return 1.5;
      case 'speaking':
        return 1.8;
      case 'processing':
        return 2.0;
      case 'idle':
      default:
        return 0.8;
    }
  };

  // Control animation speed based on state
  useEffect(() => {
    if (lottieRef.current) {
      lottieRef.current.setSpeed(getSpeed());
    }
  }, [state]);

  // Load Lottie animation JSON
  useEffect(() => {
    fetch('https://assets-v2.lottiefiles.com/a/dd486eee-2495-11ee-be26-97f1ce792863/sDXFcergUz.json')
      .then(response => response.json())
      .then(data => setAnimationData(data))
      .catch(error => console.error('Error loading Lottie animation:', error));
  }, []);

  if (!animationData) {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
        }}
      >
        <div className="animate-pulse text-purple-300">Loading...</div>
      </div>
    );
  }

  return (
    <div className="lottie-siri-orb-container flex flex-col items-end justify-center gap-1.5">
      {/* Lottie Animation */}
      <div
        className="lottie-wrapper transition-all duration-500 ease-in-out"
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          filter: `drop-shadow(0 0 ${state === 'listening' || state === 'speaking' ? '8px' : '4px'} rgba(196, 181, 253, 0.5))`,
        }}
      >
        <Lottie
          lottieRef={lottieRef}
          animationData={animationData}
          loop={true}
          autoplay={true}
          style={{
            width: '100%',
            height: '100%',
          }}
        />
      </div>

      {/* Idle state subtle indicator */}
      {state === 'idle' && (
        <div className="text-white/70 text-[10px] md:text-xs font-medium animate-pulse whitespace-nowrap">
          Click to speak
        </div>
      )}

      {/* Processing indicator */}
      {state === 'processing' && (
        <div className="text-purple-300 text-[10px] md:text-xs font-medium animate-pulse whitespace-nowrap">
          Processing...
        </div>
      )}
    </div>
  );
};

export default LottieSiriOrb;
