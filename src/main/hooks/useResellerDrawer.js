import { useState, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import fetchOrThrow from '../../common/util/fetchOrThrow';

export const useResellerDrawer = ({ open, onClose }) => {
  const user = useSelector((state) => state.session.user);

  const [resellerData, setResellerData] = useState({
    currentDomain: window.location.hostname,
    parentUserId: '',
    parentUser: '',
    parentEmail: '',
    resellerId: '',
    resellerUser: '',
    resellerEmail: '',
    companyName: '',
    logo: '',
    url: '',
    whatsapp: '',
    billingEmail: '',
    supportEmail: '',
    resellerLimit: '',
    deviceLimit: '',
    userLimit: '',
  });
  const [resellerErrors, setResellerErrors] = useState([]);
  const [resellerUsers, setResellerUsers] = useState([]);
  const [resellerUsersLoading, setResellerUsersLoading] = useState(false);
  const [resellerUsersError, setResellerUsersError] = useState(null);
  const [resellerUsersFetched, setResellerUsersFetched] = useState(false);
  const [resellerAutocompleteOpen, setResellerAutocompleteOpen] = useState(false);

  useEffect(() => {
    if (open && user) {
      setResellerData((prev) => ({
        ...prev,
        currentDomain: window.location.hostname,
        parentUserId: user.id || '',
        parentUser: user.name || '',
        parentEmail: user.email || '',
      }));
      setResellerErrors([]);
    }
  }, [open, user]);

  const handleResellerFieldChange = (field, value) => {
    setResellerData((prev) => ({ ...prev, [field]: value }));
    if (resellerErrors.length > 0) setResellerErrors([]);
  };

  const debouncedFetchResellerUsers = useCallback(() => {
    const timeoutId = setTimeout(async () => {
      if (resellerUsersFetched) return;
      setResellerUsersLoading(true);
      setResellerUsersError(null);
      try {
        const response = await fetch('/api/users', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Failed to fetch users');
        const data = await response.json();
        setResellerUsers(data || []);
        setResellerUsersFetched(true);
        setTimeout(() => {
          setResellerAutocompleteOpen(true);
          setTimeout(() => {
            const input = document.querySelector('input[aria-autocomplete="list"]');
            if (input) input.focus();
          }, 100);
        }, 0);
      } catch (error) {
        setResellerUsersError(error.message);
      } finally {
        setResellerUsersLoading(false);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [resellerUsersFetched]);

  const fetchResellerUsers = () => {
    if (!resellerUsersFetched) debouncedFetchResellerUsers();
  };

  const handleResellerFileUpload = useCallback(async (payload) => {
    try {
      const jsonString = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      let appUrl = payload.appUrl || 'unknown';
      if (appUrl !== 'unknown') {
        appUrl = appUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      }
      const filename = `${appUrl}_${payload.resellerId || 'unknown'}_${payload.parentUserId || 'unknown'}.json`;
      const file = new File([blob], filename, { type: 'application/json' });
      await fetchOrThrow(`/api/server/file/${filename}`, { method: 'POST', body: file });
      onClose();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Reseller file upload failed:', error);
    }
  }, [onClose]);

  return {
    user,
    resellerData,
    setResellerData,
    resellerErrors,
    setResellerErrors,
    resellerUsers,
    resellerUsersLoading,
    resellerUsersError,
    resellerAutocompleteOpen,
    setResellerAutocompleteOpen,
    fetchResellerUsers,
    handleResellerFieldChange,
    handleResellerFileUpload,
  };
};
