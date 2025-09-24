import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface SelectionContextValue {
  selectedWordId: string | null;
  setSelectedWordId: (wordId: string | null) => void;
}

const SelectionContext = createContext<SelectionContextValue | undefined>(undefined);

interface SelectionProviderProps {
  children: ReactNode;
  initialWordId?: string | null;
}

export function SelectionProvider({ children, initialWordId = null }: SelectionProviderProps) {
  const [selectedWordId, setSelectedWordId] = useState<string | null>(initialWordId);

  const value = useMemo(
    () => ({
      selectedWordId,
      setSelectedWordId,
    }),
    [selectedWordId],
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useSelection() {
  const context = useContext(SelectionContext);

  if (!context) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }

  return context;
}
