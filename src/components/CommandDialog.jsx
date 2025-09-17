import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors } from '../common/components/ThemeProvider';
import { devicesActions } from '../store';
import fetchOrThrow from '../common/util/fetchOrThrow';

// Add CSS animation for spinner
const spinnerStyle = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Inject the CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = spinnerStyle;
  document.head.appendChild(style);
}

const CommandDialog = ({ open, onClose, deviceId }) => {
  const [command, setCommand] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { type: 'success'|'error', message: string }
  
  const t = useTranslation();
  const colors = useThemeColors();
  const dispatch = useDispatch();

  const handleSend = async () => {
    if (!command.trim()) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetchOrThrow('/api/commands/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'custom',
          attributes: {
            data: command.trim()
          },
          deviceId: deviceId
        })
      });

      if (response.ok) {
        setResult({ type: 'success', message: t('commandQueued') });
        setCommand('');
      } else {
        const errorData = await response.json();
        setResult({ type: 'error', message: errorData.message || t('commandError') });
      }
    } catch (error) {
      console.error('Command send error:', error);
      setResult({ type: 'error', message: t('commandError') });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCommand('');
    setResult(null);
    setLoading(false);
    onClose();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleSend();
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
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
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          style={{
            backgroundColor: colors.surface,
            borderRadius: '12px',
            padding: '24px',
            minWidth: '320px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
            border: `1px solid ${colors.border}`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {!result ? (
            <>
              <h3 style={{
                margin: '0 0 20px 0',
                fontSize: '18px',
                fontWeight: '600',
                color: colors.text
              }}>
                {t('commandCustom')}
              </h3>
              
              <div style={{ marginBottom: '20px' }}>
                <input
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    backgroundColor: colors.background,
                    color: colors.text,
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={handleClose}
                  disabled={loading}
                  style={{
                    padding: '10px 20px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '8px',
                    backgroundColor: 'transparent',
                    color: colors.textSecondary,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {t('sharedCancel')}
                </button>
                <button
                  onClick={handleSend}
                  disabled={loading || !command.trim()}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: loading ? colors.border : '#3B82F6',
                    color: 'white',
                    cursor: (loading || !command.trim()) ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    opacity: (loading || !command.trim()) ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {loading ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid transparent',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      {t('sharedLoading')}
                    </>
                  ) : (
                    t('commandSend')
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: result.type === 'success' ? '#10B981' : '#EF4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '12px'
                }}>
                  {result.type === 'success' ? (
                    <span style={{ color: 'white', fontSize: '16px' }}>✓</span>
                  ) : (
                    <span style={{ color: 'white', fontSize: '16px' }}>✕</span>
                  )}
                </div>
                <h3 style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: '600',
                  color: colors.text
                }}>
                  {result.type === 'success' ? t('commandSuccess') : t('commandError')}
                </h3>
              </div>
              
              <p style={{
                margin: '0 0 20px 0',
                fontSize: '14px',
                color: colors.textSecondary,
                lineHeight: '1.5'
              }}>
                {result.message}
              </p>

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={handleClose}
                  style={{
                    padding: '10px 20px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: '#3B82F6',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  {t('sharedOk')}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CommandDialog;
