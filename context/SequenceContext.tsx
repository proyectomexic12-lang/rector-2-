import React, { createContext, useContext, useState, ReactNode } from 'react';
import { DidacticSequence, SequenceInput } from '../types';

interface SequenceContextType {
  input: SequenceInput;
  setInput: React.Dispatch<React.SetStateAction<SequenceInput>>;
  sequence: DidacticSequence | null;
  setSequence: React.Dispatch<React.SetStateAction<DidacticSequence | null>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

const initialInput: SequenceInput = {
  grado: '',
  area: '',
  tema: '',
  dba: '',
  sesiones: 0,
  ejeCrese: '',
};

const SequenceContext = createContext<SequenceContextType | undefined>(undefined);

export const SequenceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [input, setInput] = useState<SequenceInput>(initialInput);
  const [sequence, setSequence] = useState<DidacticSequence | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <SequenceContext.Provider value={{ input, setInput, sequence, setSequence, isLoading, setIsLoading, error, setError }}>
      {children}
    </SequenceContext.Provider>
  );
};

export const useSequence = () => {
  const context = useContext(SequenceContext);
  if (context === undefined) {
    throw new Error('useSequence must be used within a SequenceProvider');
  }
  return context;
};
