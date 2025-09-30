import './debug-keys'; // Debug tool for empty keys
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { CssBaseline, StyledEngineProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import store from './store';
import { LocalizationProvider } from './common/components/LocalizationProvider';
import { ThemeProvider } from './common/components/ThemeProvider';
import ErrorHandler from './common/components/ErrorHandler';
import Navigation from './Navigation';
import preloadImages from './map/core/preloadImages';
import NativeInterface from './common/components/NativeInterface';
import ServerProvider from './ServerProvider';
import ErrorBoundary from './ErrorBoundary';
import AppThemeProvider from './AppThemeProvider';
import ProgressTracker from './common/util/ProgressTracker';
import './index.css';

// Initialize progress tracker
const progressTracker = new ProgressTracker();

preloadImages();

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

// Update progress when React starts rendering
progressTracker.setProgress(70, 'Rendering interface...');

const root = createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <LocalizationProvider>
          <ThemeProvider>
            <StyledEngineProvider injectFirst>
              <AppThemeProvider>
                <CssBaseline />
                <ServerProvider>
                  <BrowserRouter>
                    <Navigation />
                  </BrowserRouter>
                  <ErrorHandler />
                  <NativeInterface />
                </ServerProvider>
              </AppThemeProvider>
            </StyledEngineProvider>
          </ThemeProvider>
        </LocalizationProvider>
      </Provider>
    </QueryClientProvider>
  </ErrorBoundary>,
);

// Update progress when React finishes rendering
setTimeout(() => {
  progressTracker.setProgress(90, 'Finalizing...');
  // Complete after a short delay
  setTimeout(() => {
    progressTracker.complete();
  }, 500);
}, 100);
