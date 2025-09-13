import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useRef, useEffect, useState } from 'react';
import { Sun, Moon, QrCode, Lock, ChevronLeft } from 'lucide-react';
import ReactCountryFlag from 'react-country-flag';
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
            onClick={() => {/* QR Code functionality */}}
            title="QR Code"
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
    </>
  );
};

export default AuthTransition;
