import React, { createContext, useContext, useEffect, useState, PropsWithChildren } from 'react';
import { themes, ThemeKey } from './themes';

type ThemeContextType = {
  theme: ThemeKey;
  setTheme: (t: ThemeKey) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'default',
  setTheme: () => {}
});

export function ThemeProvider({ children }: PropsWithChildren): JSX.Element {
  const [theme, setTheme] = useState<ThemeKey>('default');

  useEffect(() => {
    const base = 'antialiased';
    const cls = themes[theme].classes;
    document.body.className = `${base} ${cls}`;
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
