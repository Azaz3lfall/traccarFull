import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { ThemeProvider, useMediaQuery } from '@mui/material';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import theme from './common/theme';
import { useLocalization } from './common/components/LocalizationProvider';
import { useTheme as useCustomTheme } from './common/components/ThemeProvider';

const cache = {
  ltr: createCache({
    key: 'muiltr',
    stylisPlugins: [prefixer],
  }),
  rtl: createCache({
    key: 'muirtl',
    stylisPlugins: [prefixer, rtlPlugin],
  }),
};

const AppThemeProvider = ({ children }) => {
  const server = useSelector((state) => state.session.server);
  const { direction } = useLocalization();
  const { theme: customTheme } = useCustomTheme();

  // Use our custom theme instead of server's darkMode
  const darkMode = customTheme === 'dark';

  // Create theme instance that updates when custom theme changes
  const themeInstance = useMemo(() => {
    return theme(server, darkMode, direction);
  }, [server, darkMode, direction, customTheme]);

  return (
    <CacheProvider value={cache[direction]}>
      <ThemeProvider theme={themeInstance}>
        {children}
      </ThemeProvider>
    </CacheProvider>
  );
};

export default AppThemeProvider;
