import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeColors } from '../common/components/ThemeProvider';
import { Typography, IconButton } from '@mui/material';
import { ChevronLeft as CloseIcon } from 'lucide-react';
import OSPage from '../other/os/OSPage';

const FloatingOSPopover = ({ 
  desktop, 
  isMenuExpanded,
  isVisible,
  onClose
}) => {
  const colors = useThemeColors();

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key="os-popover"
          initial={{ x: -400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -400, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{
            position: 'fixed',
            top: !desktop ? 'auto' : '8px',
            bottom: !desktop ? '0px' : 'auto',
            left: !desktop ? '0px' : (isMenuExpanded ? '200px' : '63px'),
            width: !desktop ? '100vw' : `calc(100vw - ${isMenuExpanded ? '200px' : '63px'} - 10px)`,
            height: !desktop ? '100vh' : 'calc(100vh - 16px)',
            zIndex: 10002,
            pointerEvents: 'auto',
            transition: 'left 0.3s ease'
          }}
        >
          <div style={{
            height: '100%',
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: !desktop ? '0px' : '0px 16px 16px 0px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          }}>
            {/* Header */}
            <div style={{
              padding: '20px',
              borderBottom: `1px solid ${colors.border}`,
              backgroundColor: colors.surface,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: '12px'
            }}>
              <IconButton
                onClick={onClose}
                size="small"
                style={{ color: colors.textSecondary }}
              >
                <CloseIcon size={20} />
              </IconButton>
              <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0, lineHeight: 1.8 }}>
                Gestão de Ordens de Serviço
              </Typography>
            </div>

            {/* Content */}
            <div style={{ 
              flex: 1,
              overflow: 'auto',
              padding: 0
            }}>
              <OSPage />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingOSPopover;

