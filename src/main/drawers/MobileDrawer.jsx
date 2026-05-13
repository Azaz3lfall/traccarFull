import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { IconButton } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import CropIcon from '@mui/icons-material/Crop';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import HelpIcon from '@mui/icons-material/Help';
import MessageIcon from '@mui/icons-material/Message';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import PaymentIcon from '@mui/icons-material/Payment';
import PeopleIcon from '@mui/icons-material/People';
import SimCardIcon from '@mui/icons-material/SimCard';
import { Truck, Cpu, PieChart, FileText } from 'lucide-react';
import {
  AiOutlineCalendar,
  AiOutlineCloudServer,
  AiOutlineDatabase,
  AiOutlineSend,
  AiOutlineSetting,
  AiOutlineSound,
  AiOutlineTeam,
  AiOutlineUsergroupAdd,
} from 'react-icons/ai';
import { HiMiniCubeTransparent, HiOutlineWrenchScrewdriver } from 'react-icons/hi2';
import { PiMapPinAreaLight, PiSteeringWheelLight } from 'react-icons/pi';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { useThemeColors } from '../../common/components/ThemeProvider';
import { useAdministrator, useManager, useRestriction } from '../../common/util/permissions';
import useFeatures from '../../common/util/useFeatures';
import { useResellerBranding } from '../../common/hooks/useResellerBranding';
import { usePermissions } from '../hooks/usePermissions';

const btnStyle = (colors) => ({
  display: 'flex',
  alignItems: 'center',
  padding: '12px 20px',
  background: 'none',
  border: 'none',
  outline: 'none',
  boxShadow: 'none',
  borderRadius: '0',
  margin: '0',
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  width: '100%',
  textAlign: 'left',
  cursor: 'pointer',
  color: colors.text,
  fontSize: '14px',
  fontWeight: '400',
  transition: 'all 0.2s',
});

const iconStyle = (colors) => ({ fontSize: 18, color: colors.textSecondary, marginRight: '12px' });

const MenuItem = ({ icon, label, onClick, colors }) => (
  <button
    type="button"
    onClick={onClick}
    style={btnStyle(colors)}
    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.menuHover; }}
    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
  >
    {icon}
    {label}
  </button>
);

const MobileDrawer = ({ open, onClose, domainLookupCompleted, handlers }) => {
  const t = useTranslation();
  const colors = useThemeColors();
  const navigate = useNavigate();
  const admin = useAdministrator();
  const manager = useManager();
  const readonly = useRestriction('readonly');
  const disableReports = useRestriction('disableReports');
  const features = useFeatures();
  const { getLogoUrl } = useResellerBranding();

  const user = useSelector((state) => state.session.user);
  const isReseller = useSelector((state) => state.resellers.isReseller);
  const logo = useSelector((state) => state.session.server?.attributes?.logo);
  const logoInverted = useSelector((state) => state.session.server?.attributes?.logoInverted);
  const billingLink = useSelector((state) => state.session.user?.attributes?.billingLink);
  const supportLink = useSelector((state) => state.session.server?.attributes?.support);

  const {
    hasDeviceListPermission,
    hasDevicesPermission,
    hasReportsPermission,
    hasGeofencesPermission,
    hasUsersPermission,
    hasNotificationsPermission,
    hasCalendarsPermission,
    hasDriversPermission,
    hasComputedAttributesPermission,
    hasMaintenancePermission,
    hasGroupsPermission,
    hasSavedCommandsPermission,
    hasAnnouncementPermission,
    hasSettingsPermission,
    hasServerPermission,
    hasResellerPanelPermission,
  } = usePermissions();

  const act = (fn) => () => { fn(); onClose(); };
  const iconSx = iconStyle(colors);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9999,
            }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{
              position: 'fixed',
              top: 0, left: 0,
              width: '280px',
              height: '100vh',
              backgroundColor: colors.surface,
              borderRight: `1px solid ${colors.border}`,
              zIndex: 10000,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '4px 0 20px rgba(0,0,0,0.15)',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px 12px 16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {domainLookupCompleted && (() => {
                  const logoUrl = getLogoUrl() || logo || logoInverted;
                  if (!logoUrl) return null;
                  return (
                    <img
                      src={logoUrl}
                      alt="Server Logo"
                      style={{ maxWidth: '100%', maxHeight: '36px', width: 'auto', height: 'auto', objectFit: 'contain' }}
                    />
                  );
                })()}
              </div>
              <IconButton
                edge="end"
                size="small"
                aria-label="Fechar menu"
                onClick={onClose}
                sx={{ color: colors.textSecondary, flexShrink: 0 }}
              >
                <ChevronLeftIcon />
              </IconButton>
            </div>

            {/* Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

                  <MenuItem icon={<Truck size={18} color={colors.textSecondary} style={{ marginRight: '12px' }} />} label="Lista de Veículos" onClick={act(handlers.showFleetList)} colors={colors} />

                  {hasDeviceListPermission && (
                    <MenuItem icon={<Cpu size={18} color={colors.textSecondary} style={{ marginRight: '12px' }} />} label={t('showHideDevices')} onClick={act(handlers.showDeviceList)} colors={colors} />
                  )}

                  {!disableReports && hasReportsPermission && (
                    <MenuItem icon={<PieChart size={18} color={colors.textSecondary} style={{ marginRight: '12px' }} />} label={t('reportTitle')} onClick={act(handlers.showReports)} colors={colors} />
                  )}

                  {hasGeofencesPermission && (
                    <MenuItem icon={<CropIcon style={iconSx} />} label={t('sharedGeofences')} onClick={act(handlers.showGeofences)} colors={colors} />
                  )}

                  <MenuItem icon={<PaymentIcon style={iconSx} />} label="Gestão" onClick={act(handlers.showGestao)} colors={colors} />

                  {user?.administrator && (
                    <MenuItem icon={<FileText size={18} color={colors.textSecondary} style={{ marginRight: '12px' }} />} label="Ordens de Serviço" onClick={act(handlers.showOs)} colors={colors} />
                  )}

                  {admin && (
                    <MenuItem icon={<PeopleIcon style={iconSx} />} label="Clientes" onClick={act(handlers.showClients)} colors={colors} />
                  )}

                  <MenuItem icon={<DirectionsCarIcon style={iconSx} />} label="Veículos" onClick={act(handlers.showVehicles)} colors={colors} />

                  {!readonly && hasDevicesPermission && admin && (
                    <MenuItem icon={<PiMapPinAreaLight style={iconSx} />} label={t('deviceTitle')} onClick={act(handlers.showDevices)} colors={colors} />
                  )}

                  {manager && hasUsersPermission && (
                    <MenuItem icon={<AiOutlineUsergroupAdd style={iconSx} />} label={t('settingsUsers')} onClick={act(handlers.showUsers)} colors={colors} />
                  )}

                  {!readonly && hasDevicesPermission && admin && (
                    <MenuItem icon={<SimCardIcon style={iconSx} />} label="Simcards" onClick={act(handlers.showChips)} colors={colors} />
                  )}

                  {!readonly && hasDevicesPermission && admin && (
                    <MenuItem icon={<MessageIcon style={iconSx} />} label="Painel SMS" onClick={act(handlers.showSmsTemplates)} colors={colors} />
                  )}

                  {!readonly && hasDevicesPermission && admin && (
                    <MenuItem icon={<PaymentIcon style={iconSx} />} label="Financeiro" onClick={act(handlers.showFinancial)} colors={colors} />
                  )}

                  {!readonly && !admin && (
                    <MenuItem
                      icon={<PaymentIcon style={iconSx} />}
                      label="Meu Financeiro"
                      onClick={() => { handlers.navigateFinanciero?.(); navigate('/meu-financeiro'); onClose(); }}
                      colors={colors}
                    />
                  )}

                  {!readonly && hasNotificationsPermission && (
                    <MenuItem icon={<NotificationsOutlinedIcon style={iconSx} />} label={t('sharedNotifications')} onClick={act(handlers.showNotifications)} colors={colors} />
                  )}

                  {!readonly && !features.disableCalendars && hasCalendarsPermission && (
                    <MenuItem icon={<AiOutlineCalendar style={iconSx} />} label={t('sharedCalendars')} onClick={act(handlers.showCalendars)} colors={colors} />
                  )}

                  {!readonly && !features.disableDrivers && hasDriversPermission && (
                    <MenuItem icon={<PiSteeringWheelLight style={iconSx} />} label={t('sharedDrivers')} onClick={act(handlers.showDrivers)} colors={colors} />
                  )}

                  {!readonly && !features.disableComputedAttributes && hasComputedAttributesPermission && (
                    <MenuItem icon={<AiOutlineDatabase style={iconSx} />} label={t('sharedComputedAttributes')} onClick={act(handlers.showAttributes)} colors={colors} />
                  )}

                  {!readonly && !features.disableMaintenance && hasMaintenancePermission && (
                    <MenuItem icon={<HiOutlineWrenchScrewdriver style={iconSx} />} label={t('sharedMaintenance')} onClick={act(handlers.showMaintenance)} colors={colors} />
                  )}

                  {!readonly && !features.disableGroups && hasGroupsPermission && (
                    <MenuItem icon={<AiOutlineTeam style={iconSx} />} label={t('settingsGroups')} onClick={act(handlers.showGroups)} colors={colors} />
                  )}

                  {manager && hasAnnouncementPermission && (
                    <MenuItem icon={<AiOutlineSound style={iconSx} />} label={t('serverAnnouncement')} onClick={act(handlers.showAnnouncement)} colors={colors} />
                  )}

                  {hasSettingsPermission && (
                    <MenuItem icon={<AiOutlineSetting style={iconSx} />} label={t('settingsTitle')} onClick={act(handlers.showPreferences)} colors={colors} />
                  )}

                  {admin && hasServerPermission && (
                    <MenuItem icon={<AiOutlineCloudServer style={iconSx} />} label={t('settingsServer')} onClick={act(handlers.showServer)} colors={colors} />
                  )}

                  {(admin || isReseller) && hasResellerPanelPermission && (
                    <MenuItem icon={<HiMiniCubeTransparent style={iconSx} />} label={t('resellerPanel')} onClick={act(handlers.showResellers)} colors={colors} />
                  )}

                  {billingLink && (
                    <MenuItem icon={<PaymentIcon style={iconSx} />} label={t('userBilling')} onClick={() => { window.open(billingLink, '_blank'); onClose(); }} colors={colors} />
                  )}

                  {supportLink && (
                    <MenuItem icon={<HelpIcon style={iconSx} />} label={t('settingsSupport')} onClick={() => { window.open(supportLink, '_blank'); onClose(); }} colors={colors} />
                  )}

                  {!readonly && !features.disableSavedCommands && hasSavedCommandsPermission && (
                    <MenuItem icon={<AiOutlineSend style={iconSx} />} label={t('sharedSavedCommands')} onClick={act(handlers.showCommands)} colors={colors} />
                  )}

                </div>
              </div>

              {/* Logout - fixed at bottom */}
              <div style={{ padding: '0', borderTop: `1px solid ${colors.border}` }}>
                <button
                  onClick={() => { handlers.logout?.(); onClose(); }}
                  style={{ ...btnStyle(colors), color: '#EF4444' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.menuHover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <ExitToAppIcon style={{ fontSize: 18, color: '#EF4444', marginRight: '12px' }} />
                  {t('loginLogout')}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileDrawer;
