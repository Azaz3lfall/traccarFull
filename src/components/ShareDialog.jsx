import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors } from '../common/components/ThemeProvider';
import fetchOrThrow from '../common/util/fetchOrThrow';
import QRCode from 'react-qr-code';
import { Copy, Check } from 'lucide-react';

const ShareDialog = ({ open, onClose, deviceId }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { type: 'success'|'error', message: string }
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  
  const t = useTranslation();
  const colors = useThemeColors();

  const handleShare = async () => {
    if (!deviceId) return;
    
    setLoading(true);
    setResult(null);
    
    try {
      // Calculate expiration date (current time + 24 hours)
      const expiration = new Date();
      expiration.setHours(expiration.getHours() + 24);
      const expirationISO = expiration.toISOString();
      
      console.log('Sharing device:', { deviceId, expiration: expirationISO });
      
      const response = await fetchOrThrow('/api/devices/share', {
        method: 'POST',
        headers: {
          'Accept': '*/*',
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body: new URLSearchParams({
          deviceId: deviceId.toString(),
          expiration: expirationISO
        })
      });

      if (response.ok) {
        const responseText = await response.text();
        console.log('Share response:', responseText);
        
        // Build share URL with server address and token
        const serverAddress = window.location.origin;
        const url = `${serverAddress}?token=${responseText}`;
        console.log('Share URL:', url);
        
        setShareUrl(url);
        setResult({ type: 'success', message: t('deviceShared') });
      } else {
        const errorText = await response.text();
        console.error('Share error:', errorText);
        setResult({ type: 'error', message: t('deviceShareError') });
      }
    } catch (error) {
      console.error('Share request error:', error);
      setResult({ type: 'error', message: t('deviceShareError') });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setLoading(false);
    setShareUrl('');
    setCopied(false);
    onClose();
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
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
            zIndex: 10000
          }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              backgroundColor: colors.surface,
              borderRadius: '12px',
              padding: '24px',
              width: '300px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
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
                  {t('deviceShare')}
                </h3>
                
                <p style={{
                  margin: '0 0 20px 0',
                  fontSize: '14px',
                  color: colors.textSecondary,
                  lineHeight: '1.5'
                }}>
                  {t('deviceShareConfirm')}
                </p>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between'
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
                    onClick={handleShare}
                    disabled={loading}
                    style={{
                      padding: '10px 20px',
                      border: `1px solid #3B82F6`,
                      borderRadius: '8px',
                      backgroundColor: 'transparent',
                      color: '#3B82F6',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      opacity: loading ? 0.6 : 1,
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
                          borderTop: '2px solid #3B82F6',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }} />
                        {t('sharedLoading')}
                      </>
                    ) : (
                      t('deviceShare')
                    )}
                  </button>
                </div>
              </>
            ) : (
              <motion.div
                key="result"
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {result.type === 'success' ? (
                  <>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '20px'
                    }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: '#10B981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '12px'
                      }}>
                        <span style={{ color: 'white', fontSize: '16px' }}>✓</span>
                      </div>
                      <h3 style={{
                        margin: 0,
                        fontSize: '18px',
                        fontWeight: '600',
                        color: colors.text
                      }}>
                        {t('deviceShared')}
                      </h3>
                    </div>

                    {/* QR Code */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: '20px',
                      width: '200px',
                      height: '200px',
                      margin: '0 auto 20px auto',
                      padding: '16px',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`
                    }}>
                      <QRCode
                        value={shareUrl}
                        size={150}
                        style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                      />
                    </div>

                    {/* Share URL */}
                    <div style={{
                      marginBottom: '20px'
                    }}>
                      <p style={{
                        margin: '0 0 8px 0',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: colors.text
                      }}>
                        {t('deviceShareUrl')}:
                      </p>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        backgroundColor: colors.background,
                        borderRadius: '6px',
                        border: `1px solid ${colors.border}`
                      }}>
                        <span style={{
                          flex: 1,
                          fontSize: '12px',
                          color: colors.textSecondary,
                          wordBreak: 'break-all',
                          fontFamily: 'monospace'
                        }}>
                          {shareUrl}
                        </span>
                        <button
                          onClick={handleCopyUrl}
                          style={{
                            padding: '4px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = colors.hover;
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                          }}
                        >
                          {copied ? (
                            <Check size={16} color={colors.textSecondary} />
                          ) : (
                            <Copy size={16} color={colors.textSecondary} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-end'
                    }}>
                      <button
                        onClick={handleClose}
                        style={{
                          padding: '10px 20px',
                          border: `1px solid #3B82F6`,
                          borderRadius: '8px',
                          backgroundColor: 'transparent',
                          color: '#3B82F6',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                      >
                        {t('sharedOk')}
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
                        backgroundColor: '#EF4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '12px'
                      }}>
                        <span style={{ color: 'white', fontSize: '16px' }}>✕</span>
                      </div>
                      <h3 style={{
                        margin: 0,
                        fontSize: '18px',
                        fontWeight: '600',
                        color: colors.text
                      }}>
                        {t('deviceShareError')}
                      </h3>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-end'
                    }}>
                      <button
                        onClick={handleClose}
                        style={{
                          padding: '10px 20px',
                          border: `1px solid #3B82F6`,
                          borderRadius: '8px',
                          backgroundColor: 'transparent',
                          color: '#3B82F6',
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
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ShareDialog;
