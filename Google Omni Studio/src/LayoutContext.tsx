import React, { createContext, useContext } from 'react';

export interface LayoutContextType {
  isMobileView: boolean;
}

export const LayoutContext = createContext<LayoutContextType>({
  isMobileView: false,
});

export const useLayout = () => useContext(LayoutContext);
