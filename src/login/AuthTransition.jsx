import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useRef, useEffect, useState } from 'react';
import { Sun, Moon, QrCode, Lock, ChevronLeft, X, Copy, Check } from 'lucide-react';
import ReactCountryFlag from 'react-country-flag';
import QRCode from 'react-qr-code';
import { useLocalization, useTranslation } from '../common/components/LocalizationProvider';
import { useTheme as useCustomTheme, useThemeColors } from '../common/components/ThemeProvider';
import LoginLayout from './LoginLayout';

const getPageVariants = (pathname, direction) => {
  // Determine animation direction based on navigation flow
  let enterX, exitX;
  
  if (direction === 'forward') {
    // Forward navigation: login -> register (everything moves right)
    enterX = 30;  // Enter from right
    exitX = 30;   // Exit to right
  } else {
    // Backward navigation: register -> login (everything moves left)
    enterX = -30; // Enter from left
    exitX = -30;  // Exit to left
  }
  
  return {
    initial: {
      opacity: 0,
      x: enterX,
      scale: 0.98,
    },
    in: {
      opacity: 1,
      x: 0,
      scale: 1,
    },
    out: {
      opacity: 0,
      x: exitX,
      scale: 0.98,
    }
  };
};

const contentTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.3
};

const AuthTransition = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const t = useTranslation();
  const colors = useThemeColors();
  const { languages, language, setLocalLanguage } = useLocalization();
  const { theme: currentTheme, setLocalTheme } = useCustomTheme();
  
  const [direction, setDirection] = useState('forward');
  const [showQrCode, setShowQrCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const prevPathname = useRef(location.pathname);

  const languageList = Object.entries(languages).map((values) => ({ 
    code: values[0], 
    country: values[1].country, 
    name: values[1].name 
  }));

  const languageEnabled = useSelector((state) => {
    const attributes = state.session.server.attributes;
    return !attributes.language && !attributes['ui.disableLoginLanguage'];
  });
  const changeEnabled = useSelector((state) => !state.session.server.attributes.disableChange);
  const nativeEnvironment = useSelector((state) => state.session.server.nativeEnvironment);
  const server = useSelector((state) => state.session.server);

  const handleThemeToggle = () => {
    setLocalTheme(currentTheme === 'light' ? 'dark' : 'light');
  };

  // Get the current server URL
  const getServerUrl = () => {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    // If we're in development, use the proxy URL
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${protocol}//${hostname}:${port}`;
    }
    
    // For production, use the current URL
    return `${protocol}//${hostname}${port ? ':' + port : ''}`;
  };

  const serverUrl = getServerUrl();

  const handleQrCodeClick = () => {
    setShowQrCode(true);
    setCopied(false);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(serverUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  // Track navigation direction
  useEffect(() => {
    const currentPath = location.pathname;
    const previousPath = prevPathname.current;
    
    if (previousPath !== currentPath) {
      // Determine direction based on navigation flow
      if ((previousPath === '/login' && currentPath === '/register') || 
          (previousPath === '/reset-password' && currentPath === '/login')) {
        setDirection('forward');
      } else if ((previousPath === '/register' && currentPath === '/login') ||
                 (previousPath === '/login' && currentPath === '/reset-password')) {
        setDirection('backward');
      }
      
      prevPathname.current = currentPath;
    }
  }, [location.pathname]);

  const getStyles = (colors) => ({
    options: {
      position: 'fixed',
      top: '8px',
      right: '8px',
      display: 'flex',
      flexDirection: 'row',
      gap: '8px',
      zIndex: 1000,
      backgroundColor: colors.menuSurface,
      backdropFilter: 'blur(10px)',
      borderRadius: '12px',
      padding: '8px',
      boxShadow: colors.menuShadow,
      border: `1px solid ${colors.menuBorder}`,
    },
    iconButton: {
      width: '34px',
      height: '34px',
      borderRadius: '8px',
      border: 'none',
      backgroundColor: 'transparent',
      color: colors.menuText,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s',
      position: 'relative',
      outline: 'none !important',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      MozUserSelect: 'none',
      msUserSelect: 'none',
      boxShadow: 'none !important'
    },
  });

  const styles = getStyles(colors);

  return (
    <>
      {/* Control Bar - Fixed outside of animation */}
      <div style={styles.options}>
        {nativeEnvironment && changeEnabled && (
          <button 
            data-control-button
            style={styles.iconButton}
            onClick={() => navigate('/change-server')}
            title={`${t('settingsServer')}: ${window.location.hostname}`}
            onMouseEnter={(e) => { e.target.style.backgroundColor = colors.menuHover; }}
            onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; }}
            onMouseDown={(e) => { e.target.style.backgroundColor = colors.menuHover; }}
            onMouseUp={(e) => { e.target.style.backgroundColor = colors.menuHover; }}
            onFocus={(e) => { e.target.style.backgroundColor = colors.menuHover; }}
            onBlur={(e) => { e.target.style.backgroundColor = 'transparent'; }}
          >
            <Lock size={18} />
          </button>
        )}
        {!nativeEnvironment && (
          <button 
            data-control-button
            style={styles.iconButton}
            onClick={handleQrCodeClick}
            title="Show QR Code"
            onMouseEnter={(e) => { e.target.style.backgroundColor = colors.menuHover; }}
            onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; }}
            onMouseDown={(e) => { e.target.style.backgroundColor = colors.menuHover; }}
            onMouseUp={(e) => { e.target.style.backgroundColor = colors.menuHover; }}
            onFocus={(e) => { e.target.style.backgroundColor = colors.menuHover; }}
            onBlur={(e) => { e.target.style.backgroundColor = 'transparent'; }}
          >
            <QrCode size={18} />
          </button>
        )}
        {languageEnabled && (
          <button 
            data-control-button
            style={styles.iconButton}
            onClick={() => {/* Language functionality */}}
            title="Language"
            onMouseEnter={(e) => { e.target.style.backgroundColor = colors.menuHover; }}
            onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; }}
            onMouseDown={(e) => { e.target.style.backgroundColor = colors.menuHover; }}
            onMouseUp={(e) => { e.target.style.backgroundColor = colors.menuHover; }}
            onFocus={(e) => { e.target.style.backgroundColor = colors.menuHover; }}
            onBlur={(e) => { e.target.style.backgroundColor = 'transparent'; }}
          >
            <ReactCountryFlag
              countryCode={languageList.find(lang => lang.code === language)?.country || 'US'}
              svg
              style={{
                width: '1.2em',
                height: '1.2em',
                borderRadius: '4px',
                boxShadow: '0 0 3px rgba(0,0,0,0.3)'
              }}
            />
          </button>
        )}
        <button 
          data-control-button
          style={styles.iconButton}
          onClick={handleThemeToggle}
          title={currentTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          onMouseEnter={(e) => { e.target.style.backgroundColor = colors.menuHover; }}
          onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; }}
          onMouseDown={(e) => { e.target.style.backgroundColor = colors.menuHover; }}
          onMouseUp={(e) => { e.target.style.backgroundColor = colors.menuHover; }}
          onFocus={(e) => { e.target.style.backgroundColor = colors.menuHover; }}
          onBlur={(e) => { e.target.style.backgroundColor = 'transparent'; }}
        >
          {currentTheme === 'dark' ? (
            <Sun size={18} />
          ) : (
            <Moon size={18} />
          )}
        </button>
      </div>

      {children}

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQrCode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '20px'
            }}
            onClick={() => setShowQrCode(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              style={{
                backgroundColor: colors.surface,
                borderRadius: '16px',
                padding: '24px',
                maxWidth: '400px',
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: `1px solid ${colors.border}`
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setShowQrCode(false)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => { e.target.style.backgroundColor = colors.hover; }}
                onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; }}
              >
                <X size={20} />
              </button>

              {/* Title */}
              <h3 style={{
                margin: '0 0 16px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: colors.text
              }}>
                {t('settingsServer')} QR Code
              </h3>

              {/* QR Code */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '16px',
                padding: '16px',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: `1px solid ${colors.border}`
              }}>
                <QRCode
                  value={serverUrl}
                  size={200}
                  style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                />
              </div>

              {/* Server URL */}
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: colors.secondary,
                borderRadius: '8px',
                border: `1px solid ${colors.border}`
              }}>
                <p style={{
                  margin: '0 0 8px 0',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: colors.textSecondary
                }}>
                  {t('serverUrl')}
                </p>
                <p style={{
                  margin: 0,
                  fontSize: '12px',
                  color: colors.text,
                  wordBreak: 'break-all',
                  fontFamily: 'monospace'
                }}>
                  {serverUrl}
                </p>
              </div>

              {/* Copy button */}
              <button
                onClick={handleCopyUrl}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: copied ? '#10B981' : colors.primary,
                  color: copied ? 'white' : (colors.primary === '#FFFFFF' ? '#1F2937' : 'white'),
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!copied) {
                    e.target.style.backgroundColor = colors.primaryHover || colors.primary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!copied) {
                    e.target.style.backgroundColor = colors.primary;
                  }
                }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? t('copied') : t('copyUrl')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AuthTransition;
