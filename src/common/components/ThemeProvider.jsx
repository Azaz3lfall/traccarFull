import {
  createContext, useContext, useEffect, useMemo,
} from 'react';
import { useSelector } from 'react-redux';
import usePersistedState from '../util/usePersistedState';

const themes = {
  dark: {
    name: 'Dark',
    colors: {
      primary: '#1F2937',
      secondary: '#374151',
      background: '#111827',
      surface: '#1F2937',
      text: '#F9FAFB',
      textSecondary: '#9CA3AF',
      border: '#374151',
      hover: '#374151',
      shadow: 'rgba(0, 0, 0, 0.3)',
      // Menu and control bar specific colors (always dark)
      menuSurface: '#1F2937',
      menuText: '#F9FAFB',
      menuTextSecondary: '#9CA3AF',
      menuHover: '#374151',
      menuBorder: '#374151',
      menuShadow: 'rgba(0, 0, 0, 0.3)',
      // Avatar specific colors
      avatarBackground: '#FFFFFF',
      // Badge specific colors
      badgeText: '#FFFFFF',
    }
  },
  light: {
    name: 'Light',
    colors: {
      primary: '#FFFFFF',
      secondary: '#F3F4F6',
      background: '#F9FAFB',
      surface: '#FFFFFF',
      text: '#1F2937',
      textSecondary: '#6B7280',
      border: '#E5E7EB',
      hover: '#F3F4F6',
      shadow: 'rgba(0, 0, 0, 0.15)',
      // Menu and control bar specific colors (always dark)
      menuSurface: '#1F2937',
      menuText: '#F9FAFB',
      menuTextSecondary: '#9CA3AF',
      menuHover: '#374151',
      menuBorder: '#374151',
      menuShadow: 'rgba(0, 0, 0, 0.3)',
      // Avatar specific colors
      avatarBackground: '#FFFFFF',
      // Badge specific colors
      badgeText: '#FFFFFF',
    }
  }
};

const getDefaultTheme = () => {
  // Check if user has a system preference for dark mode
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

const ThemeContext = createContext({
  themes,
  theme: 'light',
  setLocalTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const remoteTheme = useSelector((state) => {
    const serverTheme = state.session.server?.attributes?.theme;
    const userTheme = state.session.user?.attributes?.theme;
    const targetTheme = userTheme || serverTheme;
    return (targetTheme && targetTheme in themes) ? targetTheme : null;
  });

  const [localTheme, setLocalTheme] = usePersistedState('theme', getDefaultTheme());

  const theme = remoteTheme || localTheme;

  const value = useMemo(
    () => ({ themes, theme, setLocalTheme }),
    [themes, theme, setLocalTheme],
  );

  useEffect(() => {
    // Apply theme to document root for CSS variables
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themes[theme].colors.primary);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export const useThemeColors = () => {
  const context = useContext(ThemeContext);
  return context.themes[context.theme].colors;
};
