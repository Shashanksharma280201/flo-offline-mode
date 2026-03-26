import React, { createContext, useContext, useState, ReactNode } from 'react';

interface VoiceAssistantContextType {
  isCenterMode: boolean;
  openCenterMode: () => void;
  closeCenterMode: () => void;
}

const VoiceAssistantContext = createContext<VoiceAssistantContextType | undefined>(undefined);

export const VoiceAssistantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isCenterMode, setIsCenterMode] = useState(false);

  const openCenterMode = () => setIsCenterMode(true);
  const closeCenterMode = () => setIsCenterMode(false);

  return (
    <VoiceAssistantContext.Provider value={{ isCenterMode, openCenterMode, closeCenterMode }}>
      {children}
    </VoiceAssistantContext.Provider>
  );
};

export const useVoiceAssistant = () => {
  const context = useContext(VoiceAssistantContext);
  if (!context) {
    throw new Error('useVoiceAssistant must be used within VoiceAssistantProvider');
  }
  return context;
};
