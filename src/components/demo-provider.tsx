'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface DemoContextType {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  setDemoMode: (val: boolean) => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('atlasburn_demo_mode');
    if (saved === 'true') {
      setIsDemoMode(true);
    }
  }, []);

  const toggleDemoMode = () => {
    setIsDemoMode((prev) => {
      const newVal = !prev;
      localStorage.setItem('atlasburn_demo_mode', String(newVal));
      return newVal;
    });
  };

  const setDemoMode = (val: boolean) => {
    setIsDemoMode(val);
    localStorage.setItem('atlasburn_demo_mode', String(val));
  };

  return (
    <DemoContext.Provider value={{ isDemoMode, toggleDemoMode, setDemoMode }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemoMode() {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemoMode must be used within a DemoProvider');
  }
  return context;
}
