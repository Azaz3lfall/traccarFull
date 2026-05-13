import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import fetchOrThrow from '../../common/util/fetchOrThrow';

export const useServerData = ({ showServerDrawer, showAnnouncementDrawer, onServerSaved, onAnnouncementSent }) => {
  const [serverData, setServerData] = useState(null);

  const { data: serverQueryData } = useQuery({
    queryKey: ['server'],
    queryFn: async () => {
      const response = await fetch('/api/server');
      return response.json();
    },
    enabled: showServerDrawer,
  });

  const { data: timezones = [] } = useQuery({
    queryKey: ['timezones'],
    queryFn: async () => {
      const response = await fetchOrThrow('/api/server/timezones');
      return response.json();
    },
    enabled: showServerDrawer,
  });

  useEffect(() => {
    if (serverQueryData) {
      setServerData(serverQueryData);
    }
  }, [serverQueryData]);

  const updateServerMutation = useMutation({
    mutationFn: async (data) => {
      await fetchOrThrow('/api/server', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      if (onServerSaved) onServerSaved();
    },
  });

  const sendAnnouncementMutation = useMutation({
    mutationFn: async (data) => {
      const query = new URLSearchParams();
      data.users.forEach((u) => query.append('userId', u.id));
      await fetchOrThrow(`/api/notifications/send/${data.notificator}?${query.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.message),
      });
    },
    onSuccess: () => {
      if (onAnnouncementSent) onAnnouncementSent();
    },
  });

  return {
    serverData,
    setServerData,
    timezones,
    updateServerMutation,
    sendAnnouncementMutation,
  };
};

export default useServerData;
