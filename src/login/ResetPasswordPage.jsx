import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Mail, Key, Sun, Moon, QrCode, Lock } from 'lucide-react';
import ReactCountryFlag from 'react-country-flag';
import LoginLayout from './LoginLayout';
import { useTranslation, useLocalization } from '../common/components/LocalizationProvider';
import { snackBarDurationShortMs } from '../common/util/duration';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { useThemeColors, useTheme } from '../common/components/ThemeProvider';
import { Button } from '../components/ui/button';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const t = useTranslation();
  const colors = useThemeColors();
  const { language, setLanguage } = useLocalization();
  const { theme: currentTheme, setLocalTheme } = useTheme();
  const dispatch = useDispatch();

  const [searchParams] = useSearchParams();
  const token = searchParams.get('passwordReset');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [showLanguagePopover, setShowLanguagePopover] = useState(false);
  const [languageRef, setLanguageRef] = useState(null);

  const server = useSelector((state) => state.session.server);
  const changeEnabled = useSelector((state) => !state.session.server.attributes.disableChange);
  const nativeEnvironment = useSelector((state) => state.session.server.nativeEnvironment);
  const languageEnabled = useSelector((state) => state.session.server.attributes.languageEnabled);

  const languageList = [
    { code: 'en', name: 'English', country: 'US' },
    { code: 'es', name: 'Español', country: 'ES' },
    { code: 'fr', name: 'Français', country: 'FR' },
    { code: 'de', name: 'Deutsch', country: 'DE' },
    { code: 'it', name: 'Italiano', country: 'IT' },
    { code: 'pt', name: 'Português', country: 'PT' },
    { code: 'ru', name: 'Русский', country: 'RU' },
    { code: 'zh', name: '中文', country: 'CN' },
    { code: 'ja', name: '日本語', country: 'JP' },
    { code: 'ko', name: '한국어', country: 'KR' },
  ];

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      if (!token) {
        await fetchOrThrow('/api/password/reset', {
          method: 'POST',
          body: new URLSearchParams(`email=${encodeURIComponent(email)}`),
        });
      } else {
        await fetchOrThrow('/api/password/update', {
          method: 'POST',
          body: new URLSearchParams(`token=${encodeURIComponent(token)}&password=${encodeURIComponent(password)}`),
        });
      }
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Password reset error:', error);
    }
  };

  const handleThemeToggle = () => {
    setLocalTheme(currentTheme === 'light' ? 'dark' : 'light');
  };

  // Close language popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showLanguagePopover && languageRef && !languageRef.contains(event.target)) {
        setShowLanguagePopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLanguagePopover, languageRef]);

  // Reset button hover states when theme changes
  useEffect(() => {
    const buttons = document.querySelectorAll('[data-control-button]');
    buttons.forEach(button => {
      button.style.backgroundColor = 'transparent';
    });
  }, [currentTheme]);

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
      transition: 'all 0.2s ease',
      outline: 'none',
    },
    languageMenu: {
      position: 'fixed',
      top: '50px',
      right: '8px',
      minWidth: '180px',
      maxHeight: '300px',
      overflowY: 'auto',
      backgroundColor: colors.menuSurface,
      border: `1px solid ${colors.menuBorder}`,
      borderRadius: '8px',
      boxShadow: colors.menuShadow,
      zIndex: 1001,
    },
    languageItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      cursor: 'pointer',
      border: 'none',
      backgroundColor: 'transparent',
      color: colors.menuText,
      width: '100%',
      textAlign: 'left',
      fontSize: '14px',
      transition: 'background-color 0.2s ease',
    },
    backButton: {
      position: 'absolute',
      top: '20px',
      left: '20px',
      zIndex: 30,
      width: '40px',
      height: '40px',
      borderRadius: '8px',
      backgroundColor: colors.surface,
      border: `1px solid ${colors.border}`,
      color: colors.text,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      transition: 'all 0.2s ease',
    },
    inputContainer: {
      position: 'relative',
    },
    input: {
      width: '100%',
      padding: '12px 16px 12px 40px',
      backgroundColor: colors.secondary,
      border: `1px solid ${colors.border}`,
      borderRadius: '8px',
      color: colors.text,
      fontSize: '14px',
      outline: 'none',
      transition: 'all 0.2s ease',
      boxSizing: 'border-box',
    },
    inputIcon: {
      position: 'absolute',
      left: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: colors.textSecondary,
      width: '16px',
      height: '16px',
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontSize: '14px',
      fontWeight: '500',
      color: colors.text,
    },
    extraContainer: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      width: '100%',
    },
  });

  const styles = getStyles(colors);

  return (
    <>
      <div style={{
        ...styles.options,
        // Force theme colors for debugging
        backgroundColor: colors.menuSurface,
        border: `1px solid ${colors.menuBorder}`,
        boxShadow: colors.menuShadow,
      }}>
        {nativeEnvironment && changeEnabled && (
          <button 
            data-control-button
            style={styles.iconButton}
            onClick={() => navigate('/change-server')}
              title={`${t('settingsServer')}: ${window.location.hostname}`}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = colors.menuHover;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
            onMouseDown={(e) => {
              e.target.style.backgroundColor = colors.menuHover;
            }}
            onMouseUp={(e) => {
              e.target.style.backgroundColor = colors.menuHover;
            }}
            onFocus={(e) => {
              e.target.style.backgroundColor = colors.menuHover;
            }}
            onBlur={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
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
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = colors.menuHover;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
            onMouseDown={(e) => {
              e.target.style.backgroundColor = colors.menuHover;
            }}
            onMouseUp={(e) => {
              e.target.style.backgroundColor = colors.menuHover;
            }}
            onFocus={(e) => {
              e.target.style.backgroundColor = colors.menuHover;
            }}
            onBlur={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            <QrCode size={18} />
          </button>
        )}
        {languageEnabled && (
          <button
            data-control-button
            ref={setLanguageRef}
            style={styles.iconButton}
            onClick={() => setShowLanguagePopover(!showLanguagePopover)}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = colors.menuHover;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
            onMouseDown={(e) => {
              e.target.style.backgroundColor = colors.menuHover;
            }}
            onMouseUp={(e) => {
              e.target.style.backgroundColor = colors.menuHover;
            }}
            onFocus={(e) => {
              e.target.style.backgroundColor = colors.menuHover;
            }}
            onBlur={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
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
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = colors.menuHover;
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}
          onMouseDown={(e) => {
            e.target.style.backgroundColor = colors.menuHover;
          }}
          onMouseUp={(e) => {
            e.target.style.backgroundColor = colors.menuHover;
          }}
          onFocus={(e) => {
            e.target.style.backgroundColor = colors.menuHover;
          }}
          onBlur={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}
        >
          {currentTheme === 'dark' ? (
            <Sun size={18} />
          ) : (
            <Moon size={18} />
          )}
        </button>
      </div>

      {/* Language Popover */}
      <AnimatePresence>
        {showLanguagePopover && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={styles.languageMenu}
          >
            {languageList.map((lang) => (
              <button
                key={lang.code}
                style={{
                  ...styles.languageItem,
                  backgroundColor: language === lang.code ? colors.menuHover : 'transparent',
                }}
                onClick={() => {
                  setLanguage(lang.code);
                  setShowLanguagePopover(false);
                }}
                onMouseEnter={(e) => {
                  if (language !== lang.code) {
                    e.target.style.backgroundColor = colors.menuHover;
                  }
                }}
                onMouseLeave={(e) => {
                  if (language !== lang.code) {
                    e.target.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <ReactCountryFlag
                  countryCode={lang.country}
                  svg
                  style={{ width: '1.5em', height: '1.5em' }}
                />
                <span>{lang.name}</span>
                {language === lang.code && (
                  <span style={{ marginLeft: 'auto', color: colors.menuText }}>✓</span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <LoginLayout>
        {/* Back Button */}
        <button
          style={styles.backButton}
          onClick={() => navigate('/login')}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = colors.hover;
            e.target.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = colors.surface;
            e.target.style.transform = 'translateY(0)';
          }}
        >
          <ChevronLeft size={20} />
        </button>

        {/* Form Content */}
      <div className="flex flex-col w-full" style={{ gap: '20px' }}>
        {!token ? (
          <div style={styles.inputContainer}>
            <label style={styles.label}>{t('userEmail')}</label>
            <Mail
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: colors.textSecondary,
                zIndex: 1
              }}
            />
            <input
              type="email"
              name="email"
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              style={styles.input}
              required
            />
          </div>
        ) : (
          <div style={styles.inputContainer}>
            <label style={styles.label}>{t('userPassword')}</label>
            <Key
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '52%',
                transform: 'translateY(-50%)',
                color: colors.textSecondary,
                zIndex: 1
              }}
            />
            <input
              type="password"
              name="password"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              style={styles.input}
              required
            />
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={!/(.+)@(.+)\.(.{2,})/.test(email) && !password}
          style={{
            width: '100%',
            height: '40px',
            backgroundColor: colors.primary,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            opacity: (!/(.+)@(.+)\.(.{2,})/.test(email) && !password) ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (!(!/(.+)@(.+)\.(.{2,})/.test(email) && !password)) {
              e.target.style.backgroundColor = colors.hover;
            }
          }}
          onMouseLeave={(e) => {
            if (!(!/(.+)@(.+)\.(.{2,})/.test(email) && !password)) {
              e.target.style.backgroundColor = colors.primary;
            }
          }}
        >
          {t('loginReset')}
        </Button>
      </div>

      {/* Success Message */}
      {snackbarOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: colors.surface,
            color: colors.text,
            padding: '12px 24px',
            borderRadius: '8px',
            boxShadow: colors.shadow,
            zIndex: 10002,
          }}
        >
          {!token ? t('loginResetSuccess') : t('loginUpdateSuccess')}
        </div>
      )}
      </LoginLayout>
    </>
  );
};

export default ResetPasswordPage;
