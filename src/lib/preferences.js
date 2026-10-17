import { createContext, useContext } from 'react';
export const ThemeContext = createContext({ mode: 'system', setMode: () => {} });
export const useTheme = () => useContext(ThemeContext);
