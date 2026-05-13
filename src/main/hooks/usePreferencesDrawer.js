import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { useCatch, useEffectAsync } from '../../reactHelper';
import fetchOrThrow from '../../common/util/fetchOrThrow';
import { sessionActions } from '../../store';

export const usePreferencesDrawer = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.session.user);

  const [preferencesAttributes, setPreferencesAttributes] = useState({});
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [notificationTypes, setNotificationTypes] = useState([]);
  const [token, setToken] = useState(null);
  const [tokenExpiration, setTokenExpiration] = useState(
    dayjs().add(1, 'week').locale('en').format('YYYY-MM-DD'),
  );

  useEffect(() => {
    if (open && user) {
      setPreferencesAttributes(user.attributes || {});
    }
  }, [open, user]);

  useEffectAsync(async () => {
    if (open && notificationTypes.length === 0) {
      const response = await fetchOrThrow('/api/notifications/types');
      setNotificationTypes(await response.json());
    }
  }, [open]);

  const generateToken = useCatch(async () => {
    const expiration = dayjs(tokenExpiration, 'YYYY-MM-DD').toISOString();
    const response = await fetchOrThrow('/api/session/token', {
      method: 'POST',
      body: new URLSearchParams(`expiration=${expiration}`),
    });
    setToken(await response.text());
  });

  const handlePreferencesSave = useCatch(async () => {
    setPreferencesSaving(true);
    try {
      const response = await fetchOrThrow(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...user, attributes: preferencesAttributes }),
      });
      dispatch(sessionActions.updateUser(await response.json()));
      onClose();
    } finally {
      setPreferencesSaving(false);
    }
  });

  const handleReboot = useCatch(async () => {
    const response = await fetch('/api/server/reboot', { method: 'POST' });
    throw Error(response.statusText);
  });

  return {
    preferencesAttributes,
    setPreferencesAttributes,
    preferencesSaving,
    notificationTypes,
    token,
    setToken,
    tokenExpiration,
    setTokenExpiration,
    generateToken,
    handlePreferencesSave,
    handleReboot,
  };
};
