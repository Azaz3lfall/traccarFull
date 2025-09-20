import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme as useCustomTheme, useThemeColors } from './common/components/ThemeProvider';
import { useLocalization, useTranslation } from './common/components/LocalizationProvider';
import { useSelector } from 'react-redux';
import { Sun, Moon } from 'lucide-react';
import ReactCountryFlag from 'react-country-flag';
import { AnimatePresence, motion } from 'framer-motion';

const BriefingPage = () => {
  const navigate = useNavigate();
  const t = useTranslation();
  const colors = useThemeColors();
  const { theme: currentTheme, setLocalTheme } = useCustomTheme();
  const { languages, language, setLocalLanguage } = useLocalization();
  
  // Get logo from Redux store
  const logo = useSelector((state) => state.session.server?.attributes?.logo);
  const logoInverted = useSelector((state) => state.session.server?.attributes?.logoInverted);
  const logoUrl = logo || logoInverted;
  const [showLanguagePopover, setShowLanguagePopover] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const languageRef = useRef(null);

  const languageList = Object.entries(languages).map((values) => ({ 
    code: values[0], 
    country: values[1].country, 
    name: values[1].name 
  }));

  const handleThemeToggle = () => {
    setLocalTheme(currentTheme === 'light' ? 'dark' : 'light');
  };

  const handleLanguageChange = (langCode) => {
    setLocalLanguage(langCode);
    setShowLanguagePopover(false);
  };

  const handleLogin = () => {
    navigate('/login');
  };

  // Close language popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (languageRef.current && !languageRef.current.contains(event.target)) {
        setShowLanguagePopover(false);
      }
    };

    if (showLanguagePopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLanguagePopover]);

  const navigationItems = [
    { id: 'home', label: 'Home', href: '#home' },
    { id: 'features', label: 'Features', href: '#features' },
    { id: 'contact', label: 'Contact', href: '#contact' }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.background,
      color: colors.text
    }}>
      <style>{`
        @media (min-width: 768px) {
          .desktop-nav { display: flex !important; }
          .mobile-hamburger { display: none !important; }
          .mobile-menu { display: none !important; }
        }
        @media (max-width: 767px) {
          .desktop-nav { display: none !important; }
          .mobile-hamburger { display: flex !important; }
        }
      `}</style>
      {/* Language Popover Backdrop */}
      {showLanguagePopover && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            backgroundColor: 'transparent'
          }}
          onClick={() => setShowLanguagePopover(false)}
        />
      )}

      {/* Fixed Top Bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
        boxShadow: colors.shadow,
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          position: 'relative',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 16px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Left Side - Logo */}
          <div style={{ 
            flex: '0 0 auto',
            display: 'flex',
            alignItems: 'center',
            height: '100%'
          }}>
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="Server Logo" 
                style={{ 
                  maxWidth: '120px',
                  maxHeight: '40px',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain'
                }}
              />
            ) : (
              <div style={{
                fontSize: '18px',
                fontWeight: '600',
                color: colors.text,
                padding: '0 8px'
              }}>
                Traccar
              </div>
            )}
          </div>

          {/* Middle - Navigation (Desktop) */}
          <nav style={{
            alignItems: 'center',
            gap: '32px'
          }} className="desktop-nav">
            {navigationItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                style={{
                  color: colors.text,
                  textDecoration: 'none',
                  fontSize: '16px',
                  fontWeight: '500',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = colors.hover;
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Right Side - Controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flex: '0 0 auto'
          }}>
            {/* Language Switcher */}
            <div ref={languageRef} style={{ position: 'relative', display: 'inline-block' }}>
              <button
                onClick={() => setShowLanguagePopover(!showLanguagePopover)}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <ReactCountryFlag
                  countryCode={languageList.find(lang => lang.code === language)?.country || 'US'}
                  svg
                  style={{ width: '20px', height: '16px' }}
                />
              </button>

              {/* Language Popover */}
              <AnimatePresence>
                {showLanguagePopover && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '8px',
                      backgroundColor: colors.surface,
                      border: `1px solid ${colors.border}`,
                      borderRadius: '8px',
                      boxShadow: colors.shadow,
                      minWidth: '200px',
                      maxHeight: '300px',
                      overflowY: 'auto',
                      zIndex: 1001,
                      // Ensure it doesn't go off-screen on mobile
                      maxWidth: 'calc(100vw - 32px)',
                      transform: 'translateX(0)'
                    }} className="md:max-w-none">
                  {languageList.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: 'none',
                        backgroundColor: language === lang.code ? colors.hover : 'transparent',
                        color: colors.text,
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <ReactCountryFlag
                        countryCode={lang.country}
                        svg
                        style={{ width: '16px', height: '12px' }}
                      />
                      <span>{lang.name}</span>
                    </button>
                  ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme Switcher */}
            <button
              onClick={handleThemeToggle}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: colors.textSecondary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              {currentTheme === 'dark' ? (
                <Sun size={20} />
              ) : (
                <Moon size={20} />
              )}
            </button>

            {/* Login Button */}
            <button
              onClick={handleLogin}
              style={{
                padding: '8px 16px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: '#0f78ab',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
            >
              {t('loginLogin')}
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                color: colors.textSecondary,
                cursor: 'pointer',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              className="mobile-hamburger"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: colors.surface,
                padding: '16px',
                zIndex: 1000
              }} className="mobile-menu">
            {navigationItems.map((item) => (
              <a
                key={item.id}
                href={item.href}
                style={{
                  display: 'block',
                  color: colors.text,
                  textDecoration: 'none',
                  fontSize: '16px',
                  fontWeight: '500',
                  padding: '12px 0'
                }}
                onClick={() => setShowMobileMenu(false)}
              >
                {item.label}
              </a>
            ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content - Full Screen Hero Section */}
      <div style={{
        height: '100vh', // Full viewport height
        width: '100vw',
        backgroundColor: colors.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 20px',
        boxSizing: 'border-box'
      }}>
        <div className="text-center max-md:max-w-sm" style={{ maxWidth: '900px', margin: '0 auto', padding: '0 20px' }}>
          <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold leading-tight" style={{ color: colors.text }}>
            The most complete and advanced Traccar customization available, every feature, every language, fully implemented.
          </h1>
          <p className="mt-4 sm:mt-6 text-sm sm:text-base md:text-xl" style={{ color: colors.textSecondary }}>
            Take your tracking business to the next level with a Global fully integrated, performance-optimized, modern Traccar web solution.
          </p>
          <button
            onClick={() => {/* TODO: Add quote functionality */}}
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: '#0f78ab',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s',
              marginTop: '24px'
            }}
          >
            Get a Quote
          </button>
        </div>
      </div>
    </div>
  );
};

export default BriefingPage;
