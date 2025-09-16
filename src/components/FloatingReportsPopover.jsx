import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors } from '../common/components/ThemeProvider';
import { Card } from './ui/card';
import { Typography, IconButton } from '@mui/material';
import { X as CloseIcon } from 'lucide-react';

const FloatingReportsPopover = ({ 
  desktop, 
  isVisible,
  onClose
}) => {
  const t = useTranslation();
  const colors = useThemeColors();

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          key="reports-popover"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '400px',
            maxHeight: '60vh',
            zIndex: 10000,
            pointerEvents: 'auto'
          }}
        >
          <Card style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{
              padding: '20px',
              borderBottom: `1px solid ${colors.border}`,
              backgroundColor: colors.surface,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <Typography variant="h6" style={{ color: colors.text, fontWeight: '600', margin: 0, lineHeight: 1.8 }}>
                {t('reportTitle')}
              </Typography>
              <IconButton
                onClick={onClose}
                size="small"
                style={{ color: colors.textSecondary }}
              >
                <CloseIcon size={20} />
              </IconButton>
            </div>

            {/* Content */}
            <div style={{ 
              padding: '20px',
              minHeight: '200px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Typography variant="body1" style={{ color: colors.textSecondary, textAlign: 'center' }}>
                {t('sharedComingSoon')}
              </Typography>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingReportsPopover;
