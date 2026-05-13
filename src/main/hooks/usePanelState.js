import { useState, useCallback, useMemo } from 'react';

export const PANELS = {
  MENU: 'menu',
  DEVICE_LIST: 'deviceList',
  FLEET_LIST: 'fleetList',
  LOGOUT: 'logout',
  EVENTS: 'events',
  MAP_SWITCHER: 'mapSwitcher',
  SEARCH: 'search',
  USER: 'user',
  LANGUAGE: 'language',
  USERS_POPOVER: 'usersPopover',
  COMMANDS: 'commands',
  MAINTENANCE: 'maintenance',
  COMPUTED_ATTRIBUTES: 'computedAttributes',
  CALENDARS: 'calendars',
  DRIVERS: 'drivers',
  GROUPS: 'groups',
  DEVICES: 'devices',
  NOTIFICATIONS: 'notifications',
  REPLAY: 'replay',
  SERVER_DRAWER: 'serverDrawer',
  PREFERENCES_DRAWER: 'preferencesDrawer',
  ANNOUNCEMENT_DRAWER: 'announcementDrawer',
  RESELLER_DRAWER: 'resellerDrawer',
  RESELLERS: 'resellers',
  DATA_ANALYTICS: 'dataAnalytics',
  ROLES: 'roles',
  USERS_MODAL: 'usersModal',
  OCORRENCIAS: 'ocorrencias',
};

export const usePanelState = () => {
  const [openPanels, setOpenPanels] = useState(new Set([PANELS.FLEET_LIST]));
  const [eventsButtonRef, setEventsButtonRef] = useState(null);
  const [mapSwitcherRef, setMapSwitcherRef] = useState(null);
  const [searchRef, setSearchRef] = useState(null);
  const [userRef, setUserRef] = useState(null);
  const [userPopoverRef, setUserPopoverRef] = useState(null);
  const [languageRef, setLanguageRef] = useState(null);

  const open = useCallback((panel) => {
    setOpenPanels((prev) => new Set([...prev, panel]));
  }, []);

  const close = useCallback((panel) => {
    setOpenPanels((prev) => {
      const next = new Set(prev);
      next.delete(panel);
      return next;
    });
  }, []);

  const toggle = useCallback((panel) => {
    setOpenPanels((prev) => {
      const next = new Set(prev);
      if (next.has(panel)) {
        next.delete(panel);
      } else {
        next.add(panel);
      }
      return next;
    });
  }, []);

  const isOpen = useCallback((panel) => openPanels.has(panel), [openPanels]);

  const closeAll = useCallback((...exceptions) => {
    const keep = new Set(exceptions);
    setOpenPanels((prev) => {
      const next = new Set();
      for (const p of prev) {
        if (keep.has(p)) next.add(p);
      }
      return next;
    });
  }, []);

  const refs = useMemo(() => ({
    eventsButtonRef,
    setEventsButtonRef,
    mapSwitcherRef,
    setMapSwitcherRef,
    searchRef,
    setSearchRef,
    userRef,
    setUserRef,
    userPopoverRef,
    setUserPopoverRef,
    languageRef,
    setLanguageRef,
  }), [eventsButtonRef, mapSwitcherRef, searchRef, userRef, userPopoverRef, languageRef]);

  return { open, close, toggle, isOpen, closeAll, openPanels, refs };
};

export default usePanelState;
