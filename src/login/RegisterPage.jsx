import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, User, Key, Mail, Shield, Sun, Moon, QrCode, Lock } from 'lucide-react';
import ReactCountryFlag from 'react-country-flag';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/button';
import LoginLayout from './LoginLayout';
import LogoImage from './LogoImage';
import { useTranslation, useLocalization } from '../common/components/LocalizationProvider';
import { snackBarDurationShortMs } from '../common/util/duration';
import { useEffectAsync } from '../reactHelper';
import { sessionActions } from '../store';
import { useTheme as useCustomTheme, useThemeColors } from '../common/components/ThemeProvider';
import fetchOrThrow from '../common/util/fetchOrThrow';

const RegisterPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const t = useTranslation();
  const colors = useThemeColors();
  const { languages, language, setLocalLanguage } = useLocalization();
  const { theme: currentTheme, setLocalTheme } = useCustomTheme();

  const server = useSelector((state) => state.session.server);
  const totpForce = useSelector((state) => state.session.server.attributes.totpForce);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpKey, setTotpKey] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [showLanguagePopover, setShowLanguagePopover] = useState(false);
  const [languageRef, setLanguageRef] = useState(null);

  useEffectAsync(async () => {
    if (totpForce) {
      const response = await fetchOrThrow('/api/users/totp', { method: 'POST' });
      setTotpKey(await response.text());
    }
  }, [totpForce, setTotpKey]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await fetchOrThrow('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, totpKey }),
      });
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Registration error:', error);
    }
  };

  const handleThemeToggle = () => {
    setLocalTheme(currentTheme === 'light' ? 'dark' : 'light');
  };

  const languageList = Object.entries(languages).map((values) => ({ code: values[0], country: values[1].country, name: values[1].name }));

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
    const buttons = document.querySelectorAll('[data-control-button]');
    buttons.forEach(button => {
      if (button) {
        button.style.backgroundColor = 'transparent';
      }
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
  });

  const styles = getStyles(colors);
  const languageEnabled = useSelector((state) => {
    const attributes = state.session.server.attributes;
    return !attributes.language && !attributes['ui.disableLoginLanguage'];
  });
  const changeEnabled = useSelector((state) => !state.session.server.attributes.disableChange);
  const nativeEnvironment = useSelector((state) => state.session.server.nativeEnvironment);

  return (
    <>
      {/* Control Bar */}
      <div style={styles.options}>
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

      <LoginLayout>
        {/* Back button outside animation */}
        {!server.newServer && (
        <button
          onClick={() => navigate('/login')}
          style={{
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
          }}
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
        
        <motion.div
          key="register"
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
        <div className="w-full">
          <label style={{ display: 'block', marginBottom: '8px', color: colors.text, fontSize: '14px', fontWeight: '500' }}>
            {t('sharedName')}
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
              type="text"
              name="name"
              value={name}
              autoComplete="name"
              autoFocus
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter your name"
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
            {t('userEmail')}
          </label>
          <div style={styles.inputContainer}>
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
              type="password"
              name="password"
              value={password}
              autoComplete="new-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
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
        {totpForce && (
          <div className="w-full">
            <label style={{ display: 'block', marginBottom: '8px', color: colors.text, fontSize: '14px', fontWeight: '500' }}>
              {t('loginTotpKey')}
            </label>
            <div style={styles.inputContainer}>
              <Shield
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
                type="text"
                name="totpKey"
                value={totpKey || ''}
                readOnly
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
                  margin: 0,
                  opacity: 0.7
                }}
              />
            </div>
          </div>
        )}
        <Button
          onClick={handleSubmit}
          type="submit"
          disabled={!name || !password || !(server.newServer || /(.+)@(.+)\.(.{2,})/.test(email))}
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
          {t('loginRegister')}
        </Button>
      </div>

      {/* Success message */}
      {snackbarOpen && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: colors.surface,
          padding: '15px 20px',
          borderRadius: '8px',
          boxShadow: colors.menuShadow,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span style={{ color: colors.text }}>{t('loginCreated')}</span>
          <button
            onClick={() => {
              dispatch(sessionActions.updateServer({ ...server, newServer: false }));
              navigate('/login');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: colors.textSecondary,
              cursor: 'pointer',
              fontSize: '18px',
            }}
          >
            ×
          </button>
        </div>
        )}
        </motion.div>

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
    </LoginLayout>
    </>
  );
};

export default RegisterPage;
