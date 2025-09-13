import { useEffect, useState } from 'react';
import ReactCountryFlag from 'react-country-flag';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/button';
import {
  Sun, Moon, Eye, EyeOff, Lock, QrCode, User, Key
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { sessionActions } from '../store';
import { useLocalization, useTranslation } from '../common/components/LocalizationProvider';
import { useTheme as useCustomTheme, useThemeColors } from '../common/components/ThemeProvider';
import LoginLayout from './LoginLayout';
import LogoImage from './LogoImage';
import usePersistedState from '../common/util/usePersistedState';
import {
  generateLoginToken, handleLoginTokenListeners, nativeEnvironment, nativePostMessage,
} from '../common/components/NativeInterface';
import fetchOrThrow from '../common/util/fetchOrThrow';

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
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '32px 0',
  },
  extraContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: '32px',
    marginTop: '16px',
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
  inputContainer: {
    position: 'relative',
  },
  passwordToggle: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    color: colors.menuTextSecondary,
    cursor: 'pointer',
    fontSize: '16px',
  },
  errorMessage: {
    color: '#EF4444',
    fontSize: '14px',
    textAlign: 'center',
  },
  link: {
    background: 'none',
    border: 'none',
    color: '#3B82F6',
    cursor: 'pointer',
    fontSize: '14px',
  },
});

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const t = useTranslation();

  const { languages, language, setLocalLanguage } = useLocalization();
  const { theme: currentTheme, setLocalTheme } = useCustomTheme();
  const colors = useThemeColors();
  
  const styles = getStyles(colors);
  const languageList = Object.entries(languages).map((values) => ({ code: values[0], country: values[1].country, name: values[1].name }));

  const [failed, setFailed] = useState(false);

  const [email, setEmail] = usePersistedState('loginEmail', '');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showLanguagePopover, setShowLanguagePopover] = useState(false);
  const [languageRef, setLanguageRef] = useState(null);

  const registrationEnabled = useSelector((state) => state.session.server.registration);
  const languageEnabled = useSelector((state) => {
    const attributes = state.session.server.attributes;
    return !attributes.language && !attributes['ui.disableLoginLanguage'];
  });
  const changeEnabled = useSelector((state) => !state.session.server.attributes.disableChange);
  const emailEnabled = useSelector((state) => state.session.server.emailEnabled);
  const openIdEnabled = useSelector((state) => state.session.server.openIdEnabled);
  const openIdForced = useSelector((state) => state.session.server.openIdEnabled && state.session.server.openIdForce);
  const [codeEnabled, setCodeEnabled] = useState(false);

  const [announcementShown, setAnnouncementShown] = useState(false);
  const announcement = useSelector((state) => state.session.server.announcement);

  const handlePasswordLogin = async (event) => {
    event.preventDefault();
    setFailed(false);
    try {
      const query = `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
      const response = await fetch('/api/session', {
        method: 'POST',
        body: new URLSearchParams(code.length ? `${query}&code=${code}` : query),
      });
      if (response.ok) {
        const user = await response.json();
        generateLoginToken();
        dispatch(sessionActions.updateUser(user));
        const target = window.sessionStorage.getItem('postLogin') || '/';
        window.sessionStorage.removeItem('postLogin');
        navigate(target, { replace: true });
      } else if (response.status === 401 && response.headers.get('WWW-Authenticate') === 'TOTP') {
        setCodeEnabled(true);
      } else {
        throw Error(await response.text());
      }
    } catch {
      setFailed(true);
      setPassword('');
    }
  };

  const handleTokenLogin = async (token) => {
    try {
    const response = await fetchOrThrow(`/api/session?token=${encodeURIComponent(token)}`);
    const user = await response.json();
    dispatch(sessionActions.updateUser(user));
    navigate('/');
    } catch (error) {
      console.error('Token login error:', error);
    }
  };

  const handleOpenIdLogin = () => {
    document.location = '/api/session/openid/auth';
  };

  const handleThemeToggle = () => {
    setLocalTheme(currentTheme === 'light' ? 'dark' : 'light');
  };

  useEffect(() => nativePostMessage('authentication'), []);

  useEffect(() => {
    const listener = (token) => handleTokenLogin(token);
    handleLoginTokenListeners.add(listener);
    return () => handleLoginTokenListeners.delete(listener);
  }, []);

  useEffect(() => {
    if (window.localStorage.getItem('hostname') !== window.location.hostname) {
      window.localStorage.setItem('hostname', window.location.hostname);
    }
  }, []);

  // Close language popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (languageRef && !languageRef.contains(event.target)) {
        setShowLanguagePopover(false);
      }
    };

    if (showLanguagePopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLanguagePopover, languageRef]);

  // Reset button hover states when theme changes
  useEffect(() => {
    // Reset all control bar buttons to transparent background
    const buttons = document.querySelectorAll('[data-control-button]');
    buttons.forEach(button => {
      if (button) {
        button.style.backgroundColor = 'transparent';
      }
    });
  }, [currentTheme]);

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
            onClick={() => setShowQr(true)}
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
            title="Language"
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
            <LoginLayout>
              <motion.div
                key="login"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }}
                style={{ width: '100%', height: '100%' }}
              >
                {/* Logo */}
                <div className="flex justify-center" style={{ marginTop: '20px', marginBottom: '30px' }}>
                  <LogoImage color={colors.primary} />
                </div>
                
                <div className="flex flex-col w-full" style={{ gap: '20px' }}>
        {!openIdForced && (
          <>
            <div className="w-full">
              <label style={{ display: 'block', marginBottom: '8px', color: colors.text, fontSize: '14px', fontWeight: '500' }}>
                {t('userEmail')}
              </label>
              <div style={styles.inputContainer}>
                <User 
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
                autoFocus={!email}
                onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  style={{
                    width: '100%',
                    padding: '12px 16px 12px 40px',
                    backgroundColor: colors.secondary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    color: colors.text,
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    margin: 0
                  }}
                />
              </div>
            </div>
            <div className="w-full">
              <label style={{ display: 'block', marginBottom: '8px', color: colors.text, fontSize: '14px', fontWeight: '500' }}>
                {t('userPassword')}
              </label>
              <div style={styles.inputContainer}>
                <Key 
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
                  type={showPassword ? 'text' : 'password'}
              name="password"
              value={password}
              autoComplete="current-password"
              autoFocus={!!email}
              onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{
                    width: '100%',
                    padding: '12px 40px 12px 40px',
                    backgroundColor: colors.secondary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    color: colors.text,
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    margin: 0
                  }}
                />
                <button
                  type="button"
                        onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: colors.menuTextSecondary,
                    cursor: 'pointer',
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    zIndex: 1
                  }}
                >
                  {showPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
            </div>
            {codeEnabled && (
              <div className="w-full">
                <label style={{ display: 'block', marginBottom: '8px', color: colors.text, fontSize: '14px', fontWeight: '500' }}>
                  {t('loginTotpCode')}
                </label>
                <input
                  type="number"
                name="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter TOTP code"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: colors.secondary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    color: colors.text,
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    margin: 0
                  }}
                />
              </div>
            )}
            {failed && (
              <div style={styles.errorMessage}>
                Invalid username or password
              </div>
            )}
            <Button
              onClick={handlePasswordLogin}
              type="submit"
              disabled={!email || !password || (codeEnabled && !code)}
              className="w-full mt-5"
              style={{
                backgroundColor: colors.primary,
                color: colors.text,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '500',
                height: '48px',
                transition: 'all 0.2s ease',
                boxShadow: colors.shadow,
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = colors.hover;
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = colors.primary;
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = colors.shadow;
              }}
            >
              {t('loginLogin')}
            </Button>
          </>
        )}
        {openIdEnabled && (
          <Button
            onClick={() => handleOpenIdLogin()}
            className="w-full mt-5"
            style={{
              backgroundColor: colors.secondary,
              color: colors.text,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '500',
              height: '48px',
              transition: 'all 0.2s ease',
              boxShadow: colors.shadow,
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = colors.hover;
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = colors.secondary;
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = colors.shadow;
            }}
          >
            {t('loginOpenId')}
          </Button>
        )}
        {!openIdForced && (
          <div style={{ ...styles.extraContainer, marginBottom: '40px' }}>
            {registrationEnabled && (
              <Button
                variant="ghost"
                onClick={() => navigate('/register')}
                className="text-sm font-medium"
                style={{
                  color: '#3B82F6',
                  backgroundColor: 'transparent',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = colors.hover;
                  e.target.style.color = '#2563EB';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#3B82F6';
                }}
              >
                {t('loginRegister')}
              </Button>
            )}
            {emailEnabled && (
              <Button
                variant="ghost"
                onClick={() => navigate('/reset-password')}
                className="text-sm font-medium"
                style={{
                  color: '#3B82F6',
                  backgroundColor: 'transparent',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = colors.hover;
                  e.target.style.color = '#2563EB';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#3B82F6';
                }}
              >
                {t('loginReset')}
              </Button>
            )}
          </div>
        )}
      </div>
        {showQr && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}>
            <div style={{
              backgroundColor: '#1F2937',
              padding: '24px',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <h3 style={{ color: '#F9FAFB', marginBottom: '16px' }}>QR Code</h3>
              <p style={{ color: '#9CA3AF', marginBottom: '16px' }}>QR Code functionality would go here</p>
              <button
                onClick={() => setShowQr(false)}
                style={{
                  background: '#3B82F6',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
        {announcement && !announcementShown && (
          <div style={{
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            right: '20px',
            backgroundColor: '#1F2937',
            color: '#F9FAFB',
            padding: '16px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10000
          }}>
            <span>{announcement}</span>
            <button
              onClick={() => setAnnouncementShown(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#9CA3AF',
                cursor: 'pointer',
                fontSize: '20px'
              }}
            >
              ×
            </button>
          </div>
        )}
              </motion.div>
      </LoginLayout>
      
      {/* Language Popover */}
      <AnimatePresence>
        {showLanguagePopover && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{
              position: 'fixed',
              top: '50px',
              right: '8px',
              backgroundColor: colors.menuSurface,
              borderRadius: '12px',
              boxShadow: colors.menuShadow,
              border: `1px solid ${colors.menuBorder}`,
              padding: '8px',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              minWidth: '180px',
              maxHeight: '300px',
              overflowY: 'auto',
            }}
          >
            {languageList.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLocalLanguage(lang.code);
                  setShowLanguagePopover(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: language === lang.code ? colors.menuHover : 'transparent',
                  color: colors.menuText,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = colors.menuHover;
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
                  style={{
                    width: '1.5em',
                    height: '1.5em',
                    borderRadius: '4px',
                    boxShadow: '0 0 3px rgba(0,0,0,0.3)'
                  }}
                />
                <span>{lang.name}</span>
                {language === lang.code && (
                  <span style={{ marginLeft: 'auto', color: colors.menuText }}>✔</span>
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LoginPage;
