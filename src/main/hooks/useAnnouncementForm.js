import { useState, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from '../../common/components/LocalizationProvider';
import { useEffectAsync } from '../../reactHelper';
import { prefixString } from '../../common/util/stringUtils';
import fetchOrThrow from '../../common/util/fetchOrThrow';

export const useAnnouncementForm = (showAnnouncementDrawer) => {
  const t = useTranslation();
  const [announcementData, setAnnouncementData] = useState({
    users: [],
    notificator: '',
    message: { subject: '', body: '' },
  });
  const [usersItems, setUsersItems] = useState([]);
  const [notificatorsItems, setNotificatorsItems] = useState([]);
  const [usersAutocompleteOpen, setUsersAutocompleteOpen] = useState(false);
  const [notificatorsAutocompleteOpen, setNotificatorsAutocompleteOpen] = useState(false);
  const [usersInputValue, setUsersInputValue] = useState('');
  const [notificatorsInputValue, setNotificatorsInputValue] = useState('');
  const [usersHighlightedIndex, setUsersHighlightedIndex] = useState(-1);
  const [notificatorsHighlightedIndex, setNotificatorsHighlightedIndex] = useState(-1);
  const usersInputRef = useRef(null);
  const notificatorsInputRef = useRef(null);

  useEffectAsync(async () => {
    if (showAnnouncementDrawer) {
      setAnnouncementData({ users: [], notificator: '', message: { subject: '', body: '' } });
      const response = await fetchOrThrow('/api/users');
      setUsersItems(await response.json());
    }
  }, [showAnnouncementDrawer]);

  useEffectAsync(async () => {
    if (showAnnouncementDrawer) {
      const response = await fetchOrThrow('/api/notifications/notificators?announcement=true');
      setNotificatorsItems(await response.json());
    }
  }, [showAnnouncementDrawer]);

  const filteredUsersOptions = useMemo(() => {
    if (!usersItems) return [];
    if (!usersInputValue) return usersItems;
    return usersItems.filter((item) => item.name.toLowerCase().includes(usersInputValue.toLowerCase()));
  }, [usersItems, usersInputValue]);

  const filteredNotificatorsOptions = useMemo(() => {
    if (!notificatorsItems) return [];
    if (!notificatorsInputValue) return notificatorsItems;
    return notificatorsItems.filter((item) =>
      t(prefixString('notificator', item.type)).toLowerCase().includes(notificatorsInputValue.toLowerCase()),
    );
  }, [notificatorsItems, notificatorsInputValue, t]);

  const handleUsersInputChange = useCallback((event) => {
    setUsersInputValue(event.target.value);
    setUsersAutocompleteOpen(true);
    setUsersHighlightedIndex(-1);
  }, []);

  const handleUsersOptionSelect = useCallback((option) => {
    setAnnouncementData((prev) => {
      const alreadySelected = (prev.users || []).some((u) => u.id === option.id);
      return alreadySelected ? prev : { ...prev, users: [...(prev.users || []), option] };
    });
    setUsersInputValue('');
    setUsersAutocompleteOpen(false);
    setUsersHighlightedIndex(-1);
  }, []);

  const handleUsersRemove = useCallback((userToRemove) => {
    setAnnouncementData((prev) => ({ ...prev, users: (prev.users || []).filter((u) => u.id !== userToRemove.id) }));
  }, []);

  const handleUsersFocus = useCallback(() => {
    setUsersInputValue('');
    setUsersAutocompleteOpen(true);
  }, []);

  const handleUsersBlur = useCallback(() => {
    setTimeout(() => {
      setUsersAutocompleteOpen(false);
      setUsersHighlightedIndex(-1);
    }, 150);
  }, []);

  const handleNotificatorsInputChange = useCallback((event) => {
    setNotificatorsInputValue(event.target.value);
    setNotificatorsAutocompleteOpen(true);
    setNotificatorsHighlightedIndex(-1);
  }, []);

  const handleNotificatorsOptionSelect = useCallback((option) => {
    setAnnouncementData((prev) => ({ ...prev, notificator: option.type }));
    setNotificatorsInputValue(t(prefixString('notificator', option.type)));
    setNotificatorsAutocompleteOpen(false);
    setNotificatorsHighlightedIndex(-1);
  }, [t]);

  const handleNotificatorsFocus = useCallback(() => {
    if (announcementData.notificator) {
      const sel = notificatorsItems.find((item) => item.type === announcementData.notificator);
      setNotificatorsInputValue(sel ? t(prefixString('notificator', sel.type)) : '');
    } else {
      setNotificatorsInputValue('');
    }
    setNotificatorsAutocompleteOpen(true);
  }, [announcementData.notificator, notificatorsItems, t]);

  const handleNotificatorsBlur = useCallback(() => {
    setTimeout(() => {
      setNotificatorsAutocompleteOpen(false);
      setNotificatorsHighlightedIndex(-1);
    }, 150);
  }, []);

  return {
    announcementData,
    setAnnouncementData,
    usersItems,
    notificatorsItems,
    filteredUsersOptions,
    filteredNotificatorsOptions,
    usersAutocompleteOpen,
    setUsersAutocompleteOpen,
    notificatorsAutocompleteOpen,
    setNotificatorsAutocompleteOpen,
    usersInputValue,
    setUsersInputValue,
    notificatorsInputValue,
    setNotificatorsInputValue,
    usersHighlightedIndex,
    setUsersHighlightedIndex,
    notificatorsHighlightedIndex,
    setNotificatorsHighlightedIndex,
    usersInputRef,
    notificatorsInputRef,
    handleUsersInputChange,
    handleUsersOptionSelect,
    handleUsersRemove,
    handleUsersFocus,
    handleUsersBlur,
    handleNotificatorsInputChange,
    handleNotificatorsOptionSelect,
    handleNotificatorsFocus,
    handleNotificatorsBlur,
  };
};

export default useAnnouncementForm;
