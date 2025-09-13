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
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: '12px 16px 12px 40px',
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  inputFocused: {
    borderColor: colors.primary,
    boxShadow: `0 0 0 2px ${colors.primary}20`,
  },
  icon: {
    position: 'absolute',
    left: '12px',
    color: colors.textSecondary,
    zIndex: 1,
  },
  passwordToggle: {
    position: 'absolute',
    right: '12px',
    color: colors.textSecondary,
    cursor: 'pointer',
    zIndex: 1,
    background: 'none',
    border: 'none',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: colors.text,
    fontSize: '14px',
    fontWeight: '500',
  },
  error: {
    color: colors.error,
    fontSize: '14px',
    marginTop: '8px',
    textAlign: 'center',
  },
  announcement: {
    backgroundColor: colors.infoBackground,
    color: colors.infoText,
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
    textAlign: 'center',
    border: `1px solid ${colors.infoBorder}`,
  },
  qrContainer: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
  qrContent: {
    backgroundColor: colors.surface,
    padding: '24px',
    borderRadius: '12px',
    textAlign: 'center',
    maxWidth: '300px',
    width: '90%',
  },
  languagePopover: {
    position: 'absolute',
    top: '50px',
    right: '0',
    backgroundColor: colors.menuSurface,
    border: `1px solid ${colors.menuBorder}`,
    borderRadius: '8px',
    boxShadow: colors.menuShadow,
    padding: '8px',
    minWidth: '200px',
    zIndex: 1001,
  },
  languageItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    cursor: 'pointer',
    borderRadius: '4px',
    color: colors.menuText,
    fontSize: '14px',
  },
  languageItemHover: {
    backgroundColor: colors.menuHover,
  },
});

const LoginPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const t = useTranslation();
  const colors = useThemeColors();
  const { languages, language, setLocalLanguage } = useLocalization();
  const { theme: currentTheme, setLocalTheme } = useCustomTheme();

  const [email, setEmail] = usePersistedState('email', '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const [showLanguagePopover, setShowLanguagePopover] = useState(false);
  const [languageRef, setLanguageRef] = useState(null);

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
  const emailEnabled = useSelector((state) => state.session.server.emailEnabled);
  const openIdEnabled = useSelector((state) => state.session.server.openIdEnabled);
  const openIdForced = useSelector((state) => state.session.server.openIdEnabled && state.session.server.openIdForce);
  const [codeEnabled, setCodeEnabled] = useState(false);

  const [announcementShown, setAnnouncementShown] = useState(false);
  const announcement = useSelector((state) => state.session.server.announcement);

  const handleThemeToggle = () => {
    setLocalTheme(currentTheme === 'light' ? 'dark' : 'light');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetchOrThrow('/api/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        dispatch(sessionActions.updateServer(data));
        navigate('/');
      } else {
        const data = await response.json();
        setError(data.message || t('loginFailed'));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenIdLogin = () => {
    if (nativeEnvironment) {
      nativePostMessage('openIdLogin');
    } else {
      window.location.href = '/api/openid/login';
    }
  };

  const handleQrLogin = () => {
    if (nativeEnvironment) {
      nativePostMessage('qrLogin');
    } else {
      setShowQr(true);
    }
  };

  const handleCodeLogin = () => {
    if (nativeEnvironment) {
      nativePostMessage('codeLogin');
    } else {
      setCodeEnabled(true);
    }
  };

  const handleCodeSubmit = async (code) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchOrThrow('/api/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        const data = await response.json();
        dispatch(sessionActions.updateServer(data));
        navigate('/');
      } else {
        const data = await response.json();
        setError(data.message || t('loginFailed'));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQrSubmit = async (qrData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchOrThrow('/api/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qr: qrData }),
      });

      if (response.ok) {
        const data = await response.json();
        dispatch(sessionActions.updateServer(data));
        navigate('/');
      } else {
        const data = await response.json();
        setError(data.message || t('loginFailed'));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const listener = (event) => {
      if (event.data.type === 'loginToken') {
        handleCodeSubmit(event.data.token);
      }
    };
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

    document.addEventListener('mousedown', handleClickOutside);
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
              {/* Spacer div to match register page back button space */}
              <div
                style={{
                  position: 'absolute',
                  top: '20px',
                  left: '20px',
                  width: '40px',
                  height: '40px',
                  zIndex: 1,
                  pointerEvents: 'none',
                }}
              />
              
              <div className="flex flex-col w-full" style={{ gap: '20px' }}>
        {!openIdForced && (
          <>
            {error && (
              <div style={styles.error}>
                {error}
              </div>
            )}

            {announcement && !announcementShown && (
              <div style={styles.announcement}>
                <p>{announcement}</p>
                <button
                  onClick={() => setAnnouncementShown(true)}
                  style={{
                    color: colors.primary,
                    textDecoration: 'underline',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                    marginTop: '4px',
                  }}
                >
                  {t('dismiss')}
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={styles.label}>
                  {t('userEmail')}
                </label>
                <div style={styles.inputContainer}>
                  <User size={18} style={styles.icon} />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin"
                    style={styles.input}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={styles.label}>
                  {t('userPassword')}
                </label>
                <div style={styles.inputContainer}>
                  <Key size={18} style={styles.icon} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('userPassword')}
                    style={styles.input}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.passwordToggle}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: colors.primary,
                  color: colors.primaryText,
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                {loading ? t('loginLoading') : t('loginLogin')}
              </Button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {openIdEnabled && (
                <Button
                  onClick={handleOpenIdLogin}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: 'transparent',
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = colors.hover;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  {t('loginOpenId')}
                </Button>
              )}

              {!nativeEnvironment && (
                <Button
                  onClick={handleQrLogin}
                  style={{
                    width: '100%',
                    padding: '12px',
                    backgroundColor: 'transparent',
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = colors.hover;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  {t('loginQr')}
                </Button>
              )}

              <Button
                onClick={handleCodeLogin}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: 'transparent',
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = colors.hover;
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                {t('loginCode')}
              </Button>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => navigate('/register')}
                style={{
                  color: colors.primary,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500',
                  textDecoration: 'underline',
                }}
                onMouseEnter={(e) => {
                  e.target.style.opacity = '0.8';
                }}
                onMouseLeave={(e) => {
                  e.target.style.opacity = '1';
                }}
              >
                {t('loginRegister')}
              </button>
            </div>

            {emailEnabled && (
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={() => navigate('/reset-password')}
                  style={{
                    color: colors.textSecondary,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    textDecoration: 'underline',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.opacity = '0.8';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.opacity = '1';
                  }}
                >
                  {t('loginForgot')}
                </button>
              </div>
            )}
          </>
        )}

        {openIdForced && (
          <div style={{ textAlign: 'center' }}>
            <Button
              onClick={handleOpenIdLogin}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: colors.primary,
                color: colors.primaryText,
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              {t('loginOpenId')}
            </Button>
          </div>
        )}
              </div>
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
              border: `1px solid ${colors.menuBorder}`,
              borderRadius: '8px',
              boxShadow: colors.menuShadow,
              padding: '8px',
              minWidth: '200px',
              zIndex: 1001,
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
                  cursor: 'pointer',
                  borderRadius: '4px',
                  color: colors.menuText,
                  fontSize: '14px',
                  width: '100%',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = colors.menuHover;
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                <ReactCountryFlag
                  countryCode={lang.country}
                  svg
                  style={{
                    width: '1.2em',
                    height: '1.2em',
                    borderRadius: '4px',
                    boxShadow: '0 0 3px rgba(0,0,0,0.3)'
                  }}
                />
                {lang.name}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQr && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.qrContainer}
            onClick={() => setShowQr(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={styles.qrContent}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ marginBottom: '16px', color: colors.text }}>
                {t('loginQr')}
              </h3>
              <p style={{ color: colors.textSecondary, marginBottom: '16px' }}>
                {t('loginQrDescription')}
              </p>
              <button
                onClick={() => setShowQr(false)}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'none',
                  border: 'none',
                  color: colors.textSecondary,
                  cursor: 'pointer',
                  fontSize: '20px'
                }}
              >
                ×
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LoginPage;