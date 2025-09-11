import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { 
  Home, 
  Map, 
  BarChart3, 
  Settings, 
  Users,
  FileText,
  Calendar,
  Bell
} from 'lucide-react';
import { cn } from '../lib/utils';

const ModernBottomMenu = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/reports', icon: BarChart3, label: 'Reports' },
    { path: '/settings', icon: Settings, label: 'Settings' },
    { path: '/geofences', icon: Map, label: 'Geofences' },
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t"
    >
      <div className="flex items-center justify-around px-4 py-2 max-w-md mx-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <motion.div
              key={item.path}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center space-y-1 h-auto py-2 px-3",
                  active && "text-primary"
                )}
              >
                <Icon className={cn(
                  "w-5 h-5",
                  active && "text-primary"
                )} />
                <span className={cn(
                  "text-xs font-medium",
                  active && "text-primary"
                )}>
                  {item.label}
                </span>
              </Button>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default ModernBottomMenu;

