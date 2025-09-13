import { useState } from 'react';
import ReactCountryFlag from 'react-country-flag';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/button';
import {
  Sun, Moon, Eye, EyeOff, ChevronLeft, User, Mail, Key
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { sessionActions } from '../store';
import { useLocalization, useTranslation } from '../common/components/LocalizationProvider';
import { useTheme as useCustomTheme, useThemeColors } from '../common/components/ThemeProvider';
import LoginLayout from './LoginLayout';
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
  backButton: {
    position: 'absolute',
    bottom: '20px',
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
  success: {
    color: colors.success,
    fontSize: '16px',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: '16px',
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

const RegisterPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const t = useTranslation();
  const colors = useThemeColors();
  const { languages, language, setLocalLanguage } = useLocalization();
  const { theme: currentTheme, setLocalTheme } = useCustomTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
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
  const nativeEnvironment = useSelector((state) => state.session.server.nativeEnvironment);
  const emailEnabled = useSelector((state) => state.session.server.emailEnabled);
  const server = useSelector((state) => state.session.server);

  const handleThemeToggle = () => {
    setLocalTheme(currentTheme === 'light' ? 'dark' : 'light');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError(t('errorPasswordMismatch'));
      setLoading(false);
      return;
    }

    try {
      const response = await fetchOrThrow('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        const data = await response.json();
        setError(data.message || t('registerFailed'));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Close language popover when clicking outside
  const handleClickOutside = (event) => {
    if (languageRef && !languageRef.contains(event.target)) {
      setShowLanguagePopover(false);
    }
  };

  if (success) {
    return (
      <>
        <div style={{
          ...styles.options,
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
          <div style={{ textAlign: 'center' }}>
            <div style={styles.success}>
              {t('registerSuccess')}
            </div>
            <p style={{ color: colors.textSecondary }}>
              {t('registerRedirect')}
            </p>
          </div>
        </LoginLayout>
      </>
    );
  }

  const styles = getStyles(colors);

  return (
    <>
      <div style={{
        ...styles.options,
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
        <div className="flex flex-col w-full" style={{ gap: '20px' }}>
          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={styles.label}>
                {t('userName')}
              </label>
              <div style={styles.inputContainer}>
                <User size={18} style={styles.icon} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('userName')}
                  style={styles.input}
                  required
                />
              </div>
            </div>

            <div>
              <label style={styles.label}>
                {t('userEmail')}
              </label>
              <div style={styles.inputContainer}>
                <Mail size={18} style={styles.icon} />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('userEmail')}
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

            <div>
              <label style={styles.label}>
                {t('userConfirmPassword')}
              </label>
              <div style={styles.inputContainer}>
                <Key size={18} style={styles.icon} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('userConfirmPassword')}
                  style={styles.input}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.passwordToggle}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
              {loading ? t('registerLoading') : t('registerRegister')}
            </Button>
          </form>

          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => navigate('/login')}
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
              {t('registerLogin')}
            </button>
          </div>
        </div>

        {/* Back button */}
        {!server.newServer && (
          <button
            onClick={() => navigate('/login')}
            style={styles.backButton}
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
        )}
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
    </>
  );
};

export default RegisterPage;