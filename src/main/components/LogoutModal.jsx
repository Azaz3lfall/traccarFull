import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { useThemeColors } from '../../common/components/ThemeProvider';

const LogoutModal = ({ open, onConfirm, onCancel }) => {
  const t = useTranslation();
  const colors = useThemeColors();

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
            zIndex: 10000,
          }}
          onClick={onCancel}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              backgroundColor: colors.surface,
              borderRadius: '8px',
              padding: '20px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p style={{
              margin: '0 0 20px 0',
              fontSize: '16px',
              color: colors.text,
              lineHeight: '1.5',
            }}>
              {t('confirmQuit')}
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
              <button
                onClick={onCancel}
                style={{
                  padding: '8px 16px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  backgroundColor: colors.secondary,
                  color: colors.text,
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = colors.hover;
                  e.target.style.color = colors.text;
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = colors.secondary;
                  e.target.style.color = colors.text;
                }}
              >
                {t('sharedCancel')}
              </button>
              <button
                onClick={onConfirm}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #FECACA',
                  borderRadius: '6px',
                  backgroundColor: '#FEF2F2',
                  color: '#DC2626',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#FEE2E2';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#FEF2F2';
                }}
              >
                {t('loginLogout')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LogoutModal;
