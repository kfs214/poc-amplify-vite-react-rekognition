import { createContext, useContext, useState, ReactNode } from 'react';

interface PoCContextType {
  profileImageKey: string | null;
  livenessImageKey: string | null;
  setProfileImageKey: (key: string | null) => void;
  setLivenessImageKey: (key: string | null) => void;
}

const PoCContext = createContext<PoCContextType | undefined>(undefined);

export function PoCContextProvider({ children }: { children: ReactNode }) {
  const [profileImageKey, setProfileImageKey] = useState<string | null>(null);
  const [livenessImageKey, setLivenessImageKey] = useState<string | null>(null);

  return (
    <PoCContext.Provider
      value={{
        profileImageKey,
        livenessImageKey,
        setProfileImageKey,
        setLivenessImageKey,
      }}
    >
      {children}
    </PoCContext.Provider>
  );
}

export function usePoCContext() {
  const context = useContext(PoCContext);
  if (context === undefined) {
    throw new Error('usePoCContext must be used within a PoCContextProvider');
  }
  return context;
}

