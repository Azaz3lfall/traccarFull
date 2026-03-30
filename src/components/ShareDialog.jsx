import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

dayjs.extend(localizedFormat);
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors } from '../common/components/ThemeProvider';
import fetchOrThrow from '../common/util/fetchOrThrow';
import parseShareTokenResponseBody from '../common/util/parseShareTokenResponse';
import QRCode from 'react-qr-code';
import { Copy, Check } from 'lucide-react';

const PRESETS = [
  { id: '1h', hours: 1 },
  { id: '2h', hours: 2 },
  { id: '12h', hours: 12 },
  { id: '24h', hours: 24 },
];

function computeExpirationISO(preset, customLocal) {
  if (preset === 'custom') {
    if (!customLocal) return null;
    const d = dayjs(customLocal);
    if (!d.isValid()) return null;
    if (!d.isAfter(dayjs())) return null;
    return d.toISOString();
  }
  const row = PRESETS.find((p) => p.id === preset);
  const hours = row?.hours ?? 24;
  return dayjs().add(hours, 'hour').toISOString();
}

const ShareDialog = ({ open, onClose, deviceId }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { type: 'success'|'error', message: string }
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [durationPreset, setDurationPreset] = useState('24h');
  const [customLocal, setCustomLocal] = useState('');

  const t = useTranslation();
  const colors = useThemeColors();

  const tr = (key, fallback) => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  useEffect(() => {
    if (open) {
      setDurationPreset('24h');
      setCustomLocal(dayjs().add(24, 'hour').format('YYYY-MM-DDTHH:mm'));
    }
  }, [open]);

  const expirationISO = useMemo(
    () => computeExpirationISO(durationPreset, customLocal),
    [durationPreset, customLocal],
  );

  const expirationPreview = useMemo(() => {
    if (!expirationISO) return '';
    return dayjs(expirationISO).format('L LTS');
  }, [expirationISO]);

  const expiresSummaryTemplate = tr(
    'deviceShareExpiresSummary',
    'The link expires on {date}',
  );
  const expiresSummary = expirationPreview
    ? expiresSummaryTemplate.replace(/\{date\}/g, expirationPreview)
    : '';

  const handleShare = async () => {
    if (!deviceId) return;
    if (!expirationISO) return;

    setLoading(true);
    setResult(null);

    try {
      const expirationISOValue = expirationISO;
      
      
      const response = await fetchOrThrow('/api/devices/share', {
        method: 'POST',
        headers: {
          'Accept': '*/*',
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body: new URLSearchParams({
          deviceId: deviceId.toString(),
          expiration: expirationISOValue,
        }),
      });

      if (response.ok) {
        const token = parseShareTokenResponseBody(await response.text());

        // Build share URL with server address and token
        const serverAddress = window.location.origin;
        const url = `${serverAddress}?token=${encodeURIComponent(token)}`;
        
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
    setDurationPreset('24h');
    setCustomLocal(dayjs().add(24, 'hour').format('YYYY-MM-DDTHH:mm'));
    onClose();
  };

  const datetimeMin = dayjs().format('YYYY-MM-DDTHH:mm');

  const chipBase = (active) => ({
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    border: `1px solid ${active ? '#3B82F6' : colors.border}`,
    backgroundColor: active ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
    color: active ? '#3B82F6' : colors.textSecondary,
  });

  const handleCopyUrl = async () => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          const successful = document.execCommand('copy');
          if (successful) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } else {
            throw new Error('Copy command failed');
          }
        } catch (fallbackError) {
          console.error('Fallback copy failed:', fallbackError);
          // Show URL in a prompt as last resort
          prompt('Copy this URL:', shareUrl);
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (error) {
      console.error('Failed to copy URL:', error);
      // Show URL in a prompt as last resort
      prompt('Copy this URL:', shareUrl);
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
              width: '550px',
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
                  margin: '0 0 12px 0',
                  fontSize: '14px',
                  color: colors.textSecondary,
                  lineHeight: '1.5',
                }}>
                  {t('deviceShareConfirm')}
                </p>

                <p style={{
                  margin: '0 0 8px 0',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: colors.text,
                }}>
                  {tr('deviceShareDurationLabel', 'Valid for')}
                </p>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginBottom: '12px',
                }}>
                  {PRESETS.map(({ id, hours }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setDurationPreset(id)}
                      style={chipBase(durationPreset === id)}
                    >
                      {`${hours}h`}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setDurationPreset('custom')}
                    style={chipBase(durationPreset === 'custom')}
                  >
                    {tr('deviceShareDurationCustom', 'Custom')}
                  </button>
                </div>

                {durationPreset === 'custom' && (
                  <div style={{ marginBottom: '12px' }}>
                    <label
                      htmlFor="share-custom-expiry"
                      style={{
                        display: 'block',
                        marginBottom: '6px',
                        fontSize: '13px',
                        color: colors.textSecondary,
                      }}
                    >
                      {tr('deviceShareCustomExpiry', 'Expiration (local time)')}
                    </label>
                    <input
                      id="share-custom-expiry"
                      type="datetime-local"
                      min={datetimeMin}
                      value={customLocal}
                      onChange={(e) => setCustomLocal(e.target.value)}
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: `1px solid ${colors.border}`,
                        backgroundColor: colors.background,
                        color: colors.text,
                        fontSize: '14px',
                      }}
                    />
                  </div>
                )}

                {expiresSummary ? (
                  <p style={{
                    margin: '0 0 20px 0',
                    fontSize: '13px',
                    color: colors.textSecondary,
                    lineHeight: '1.5',
                  }}>
                    {expiresSummary}
                  </p>
                ) : durationPreset === 'custom' ? (
                  <p style={{
                    margin: '0 0 20px 0',
                    fontSize: '13px',
                    color: '#EF4444',
                    lineHeight: '1.5',
                  }}>
                    {tr('deviceShareCustomInvalid', 'Select a future date and time.')}
                  </p>
                ) : null}

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
                    disabled={loading || !expirationISO}
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
                          borderTop: '2px solid #18a9fd',
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
                            backgroundColor: copied ? '#10B981' : 'transparent',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            if (!copied) {
                              e.target.style.backgroundColor = colors.hover;
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!copied) {
                              e.target.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          {copied ? (
                            <Check size={16} color="white" />
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
