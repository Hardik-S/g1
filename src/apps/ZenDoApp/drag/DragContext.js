import React, { createContext, useContext } from 'react';
import useDragController from './useDragController';

const DragContext = createContext(null);

export const DragProvider = ({ children }) => {
  const controller = useDragController();
  return (
    <DragContext.Provider value={controller}>
      {children}
    </DragContext.Provider>
  );
};

export const useDragContext = () => {
  const value = useContext(DragContext);
  if (!value) {
    throw new Error('useDragContext must be used within a DragProvider');
  }
  return value;
};

export default DragContext;
