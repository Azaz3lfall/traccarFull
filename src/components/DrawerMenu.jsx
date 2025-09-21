import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { 
  Menu, 
  X, 
  Map, 
  List, 
  Settings, 
  Bell, 
  Users, 
  Shield, 
  Calendar,
  BarChart3,
  FileText,
  Wrench,
  LogOut
} from 'lucide-react';
import { useTranslation } from '../common/components/LocalizationProvider';
import { useThemeColors } from '../common/components/ThemeProvider';

const DrawerMenu = ({ 
  isOpen, 
  onClose, 
  onNavigate,
  onEventsClick,
  onDevicesClick,
  onSettingsClick 
}) => {
  const t = useTranslation();
  const colors = useThemeColors();

  const menuItems = [
    {
      id: 'devices',
      label: t('sharedDevices'),
      icon: List,
      action: onDevicesClick
    },
    {
      id: 'map',
      label: t('sharedMap'),
      icon: Map,
      action: () => onNavigate('map')
    },
    {
      id: 'events',
      label: t('sharedEvents'),
      icon: Bell,
      action: onEventsClick
    },
    {
      id: 'users',
      label: t('sharedUsers'),
      icon: Users,
      action: () => onNavigate('users')
    },
    {
      id: 'reports',
      label: t('sharedReports'),
      icon: BarChart3,
      action: () => onNavigate('reports')
    },
    {
      id: 'maintenance',
      label: t('sharedMaintenance'),
      icon: Wrench,
      action: () => onNavigate('maintenance')
    },
    {
      id: 'settings',
      label: t('sharedSettings'),
      icon: Settings,
      action: onSettingsClick
    }
  ];

  const drawerVariants = {
    open: { 
      x: 0, 
      transition: { 
        type: "spring", 
        stiffness: 300, 
        damping: 30 
      } 
    },
    closed: { 
      x: '-100%', 
      transition: { 
        type: "spring", 
        stiffness: 300, 
        damping: 30 
      } 
    }
  };

  const overlayVariants = {
    open: { 
      opacity: 1, 
      pointerEvents: "auto",
      transition: { duration: 0.2 }
    },
    closed: { 
      opacity: 0, 
      pointerEvents: "none",
      transition: { duration: 0.2 }
    }
  };

  
  return (
    <AnimatePresence>
      {isOpen && (
        (() => {
          return true;
        })() &&
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 bg-black/50"
            style={{ zIndex: 10000 }}
            variants={overlayVariants}
            initial="closed"
            animate="open"
            exit="closed"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className="fixed top-0 left-0 h-full w-80"
            style={{ zIndex: 10001 }}
            variants={drawerVariants}
            initial="closed"
            animate="open"
            exit="closed"
          >
            <Card 
              className="h-full w-full rounded-none border-0 shadow-xl"
              style={{
                backgroundColor: colors.surface,
                borderRight: `1px solid ${colors.border}`
              }}
            >
              {/* Header */}
              <div 
                className="flex items-center justify-between p-4 border-b"
                style={{ borderBottomColor: colors.border }}
              >
                <h2 
                  className="text-xl font-semibold"
                  style={{ color: colors.text }}
                >
                  {t('sharedMenu')}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="p-2"
                >
                  <X className="w-5 h-5" style={{ color: colors.text }} />
                </Button>
              </div>

              {/* Menu Items */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {menuItems.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <Button
                        key={item.id}
                        variant="ghost"
                        className="w-full justify-start h-12 px-4"
                        onClick={() => {
                          item.action();
                          onClose();
                        }}
                        style={{
                          color: colors.text,
                          backgroundColor: 'transparent',
                          border: 'none'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = colors.hover;
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = 'transparent';
                        }}
                      >
                        <IconComponent className="w-5 h-5 mr-3" />
                        <span className="text-base">{item.label}</span>
                      </Button>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="mt-8 pt-4 border-t" style={{ borderTopColor: colors.border }}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-12 px-4 text-red-500"
                    onClick={() => {
                      // Handle logout
                      onClose();
                    }}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = colors.hover;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                    }}
                  >
                    <LogOut className="w-5 h-5 mr-3" />
                    <span className="text-base">{t('sharedLogout')}</span>
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default DrawerMenu;
