import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useAdministrator } from '../../common/util/permissions';

const DEFAULT_PERMISSIONS = {
  reports: true,
  geofences: true,
  settings: true,
  notifications: true,
  account: true,
  devices: true,
  groups: true,
  drivers: true,
  deviceList: true,
  ocorrencias: true,
  calendars: true,
  computedAttributes: true,
  maintenance: true,
  savedCommands: true,
  announcement: true,
  server: true,
  users: true,
  resellerPanel: true,
  dataAnalytics: false,
};

export const usePermissions = () => {
  const admin = useAdministrator();
  const user = useSelector((state) => state.session.user);

  const parsed = useMemo(() => {
    if (!user?.attributes?.accessLevel) return null;
    try {
      return JSON.parse(user.attributes.accessLevel);
    } catch {
      return null;
    }
  }, [user]);

  const check = useMemo(() => (key) => {
    if (admin) return true;
    if (!parsed) return DEFAULT_PERMISSIONS[key] ?? true;
    const val = parsed[key];
    if (val === undefined) return DEFAULT_PERMISSIONS[key] ?? true;
    return val !== false && val === true ? true : val !== false;
  }, [admin, parsed]);

  return useMemo(() => ({
    admin,
    check,
    hasReportsPermission: admin || (parsed ? parsed.reports !== false : DEFAULT_PERMISSIONS.reports),
    hasGeofencesPermission: admin || (parsed ? parsed.geofences !== false : DEFAULT_PERMISSIONS.geofences),
    hasSettingsPermission: admin || (parsed ? parsed.settings !== false : DEFAULT_PERMISSIONS.settings),
    hasNotificationsPermission: admin || (parsed ? parsed.notifications !== false : DEFAULT_PERMISSIONS.notifications),
    hasAccountPermission: admin || (parsed ? parsed.account !== false : DEFAULT_PERMISSIONS.account),
    hasDevicesPermission: admin || (parsed ? parsed.devices !== false : DEFAULT_PERMISSIONS.devices),
    hasGroupsPermission: admin || (parsed ? parsed.groups !== false : DEFAULT_PERMISSIONS.groups),
    hasDriversPermission: admin || (parsed ? parsed.drivers !== false : DEFAULT_PERMISSIONS.drivers),
    hasDeviceListPermission: admin || (parsed ? parsed.deviceList !== false : DEFAULT_PERMISSIONS.deviceList),
    hasOcorrenciasPermission: admin || (parsed ? parsed.ocorrencias !== false : DEFAULT_PERMISSIONS.ocorrencias),
    hasCalendarsPermission: admin || (parsed ? parsed.calendars !== false : DEFAULT_PERMISSIONS.calendars),
    hasComputedAttributesPermission: admin || (parsed ? parsed.computedAttributes !== false : DEFAULT_PERMISSIONS.computedAttributes),
    hasMaintenancePermission: admin || (parsed ? parsed.maintenance !== false : DEFAULT_PERMISSIONS.maintenance),
    hasSavedCommandsPermission: admin || (parsed ? parsed.savedCommands !== false : DEFAULT_PERMISSIONS.savedCommands),
    hasAnnouncementPermission: admin || (parsed ? parsed.announcement !== false : DEFAULT_PERMISSIONS.announcement),
    hasServerPermission: admin || (parsed ? parsed.server !== false : DEFAULT_PERMISSIONS.server),
    hasUsersPermission: admin || (parsed ? parsed.users !== false : DEFAULT_PERMISSIONS.users),
    hasResellerPanelPermission: admin || (parsed ? parsed.resellerPanel !== false : DEFAULT_PERMISSIONS.resellerPanel),
    hasDataAnalyticsPermission: parsed ? parsed.dataAnalytics === true : DEFAULT_PERMISSIONS.dataAnalytics,
  }), [admin, parsed, check]);
};

export default usePermissions;
