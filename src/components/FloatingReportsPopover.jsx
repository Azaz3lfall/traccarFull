import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors } from '../common/components/ThemeProvider';
import { Card } from './ui/card';
import { Typography, IconButton } from '@mui/material';
import { ChevronLeft as CloseIcon } from 'lucide-react';

const FloatingReportsPopover = ({ 
  desktop, 
  isMenuExpanded,
  isDeviceListVisible,
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
          initial={{ scale: 0.8, opacity: 0, x: '-50%', y: '-50%' }}
          animate={{ scale: 1, opacity: 1, x: '-50%', y: '-50%' }}
          exit={{ scale: 0.8, opacity: 0, x: '-50%', y: '-50%' }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            width: '90vw',
            height: '90vh',
            zIndex: 10000,
            pointerEvents: 'auto'
          }}
        >
          <Card style={{
            height: '100%',
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column'
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
                {t('reportTitle')}
              </Typography>
            </div>

            {/* Content */}
            <div style={{ 
              padding: '20px',
              flex: 1,
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
