import { useState, useEffect, useRef } from 'react';
import { useTheme as useCustomTheme, useThemeColors } from './common/components/ThemeProvider';
import { useLocalization } from './common/components/LocalizationProvider';
import LogoImage from './login/LogoImage';
import { Sun, Moon } from 'lucide-react';
import ReactCountryFlag from 'react-country-flag';

const BriefingPage = () => {
  const colors = useThemeColors();
  const { theme: currentTheme, setLocalTheme } = useCustomTheme();
  const { languages, language, setLocalLanguage } = useLocalization();
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
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 16px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Left Side - Logo */}
          <div style={{ flex: '0 0 auto' }}>
            <LogoImage />
          </div>

          {/* Middle - Navigation (Desktop) */}
          <nav style={{
            display: 'none',
            alignItems: 'center',
            gap: '32px'
          }} className="md:flex">
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
            <div ref={languageRef} style={{ position: 'relative' }}>
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
              {showLanguagePopover && (
                <div style={{
                  position: 'fixed',
                  top: '72px', // 64px (header height) + 8px margin
                  right: '16px',
                  left: '16px', // Full width on mobile
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  boxShadow: colors.shadow,
                  minWidth: '200px',
                  maxWidth: '300px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  zIndex: 1001,
                  margin: '0 auto' // Center on larger screens
                }} className="md:left-auto md:max-w-none">
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
                </div>
              )}
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              className="md:hidden"
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
        {showMobileMenu && (
          <div style={{
            display: 'block',
            backgroundColor: colors.surface,
            borderTop: `1px solid ${colors.border}`,
            padding: '16px'
          }} className="md:hidden">
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
                  padding: '12px 0',
                  borderBottom: `1px solid ${colors.border}`
                }}
                onClick={() => setShowMobileMenu(false)}
              >
                {item.label}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{ paddingTop: '64px' }}>
        <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: colors.background }}>
          <div className="text-center">
            <h1 className="text-4xl font-bold" style={{ color: colors.text }}>Briefing</h1>
            <p className="mt-4 text-lg" style={{ color: colors.textSecondary }}>
              Welcome to the briefing page
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BriefingPage;
