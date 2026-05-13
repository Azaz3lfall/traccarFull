import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { useDispatch, useSelector, connect } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { devicesActions, sessionActions } from './store';
import { useCatchCallback, useEffectAsync } from './reactHelper';
import alarm from './resources/alarm.mp3';
import { eventsActions } from './store/events';
import useFeatures from './common/util/useFeatures';
import CustomNotificationStack from './components/CustomNotificationStack';
import { useAttributePreference } from './common/util/preferences';
import { handleNativeNotificationListeners, nativePostMessage } from './common/components/NativeInterface';
import fetchOrThrow from './common/util/fetchOrThrow';

const logoutCode = 4000;
const J16_MODEL = 'J16+';

const SocketController = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const authenticated = useSelector((state) => Boolean(state.session.user));
  const includeLogs = useSelector((state) => state.session.includeLogs);
  const positions = useSelector((state) => state.session.positions);
  const devices = useSelector((state) => state.devices.items);

  const socketRef = useRef();
  const handleEventsRef = useRef();
  const j16DoorRef = useRef({}); // deviceId → last boolean state (true=open)

  const [notifications, setNotifications] = useState([]);

  const soundEvents = useAttributePreference('soundEvents', '');
  const soundAlarms = useAttributePreference('soundAlarms', 'sos');
  const visibleEventTypes = useAttributePreference('visibleEventTypes', '');

  const features = useFeatures();

  const handleEvents = useCallback((events) => {
    if (!features.disableEvents) {
      dispatch(eventsActions.add(events));
    }
    if (events.some((e) => soundEvents.includes(e.type)
        || (e.type === 'alarm' && soundAlarms.includes(e.attributes.alarm)))) {
      const audio = new Audio(alarm);
      audio.play().catch((error) => {
        // Silenciosamente ignora erros de autoplay bloqueado pelo navegador
        // O áudio só pode ser reproduzido após interação do usuário
        console.debug('Audio play blocked by browser autoplay policy:', error.message);
      });
    }
    const visibleTypes = visibleEventTypes ? visibleEventTypes.split(',').filter(Boolean) : [];
    setNotifications(prev => {
      const newNotifications = events
        .filter((event) => {
          if (visibleTypes.length === 0) return true;
          return visibleTypes.includes(event.type);
        })
        .map((event) => ({
          id: event.id,
          deviceId: event.deviceId,
          type: event.type,
          attributes: event.attributes,
          eventTime: event.eventTime,
          show: true,
        }));
      if (newNotifications.length === 0) return prev;

      const existingIds = new Set(prev.map(n => n.id));
      const uniqueNewNotifications = newNotifications.filter(n => !existingIds.has(n.id));
      const combined = [...prev, ...uniqueNewNotifications];
      return combined.slice(-10);
    });
  }, [features, dispatch, soundEvents, soundAlarms, visibleEventTypes]);

  useEffect(() => {
    handleEventsRef.current = handleEvents;
  }, [handleEvents]);

  // Monitor door state for all J16+ devices and generate events via handleEvents
  // Monitor J16+ door state and generate events via handleEvents() so they appear
  // in the notification popup just like ignition/alarm events.
  // IMPORTANT: GT06 sends two packet types:
  //   - Status packet (0x94): carries door/io1 attributes → authoritative door state
  //   - GPS packet (0x26):    carries coordinates only, NO door/io1 → must be ignored
  // WebSocket delivers raw positions that bypass our fetch interceptor, so we must
  // check for the presence of door/io1 before updating state.
  useEffect(() => {
    if (!authenticated || !positions || !devices) return;
    Object.values(devices).forEach((device) => {
      if (device.model !== J16_MODEL) return;
      const position = positions[device.id];
      if (!position) return;

      const attrs = position.attributes || {};
      const hasDoor = Object.prototype.hasOwnProperty.call(attrs, 'door');
      const hasIo1 = Object.prototype.hasOwnProperty.call(attrs, 'io1');

      // Skip GPS-only positions that carry no door/io1 data — they would cause
      // a spurious "door closed" event every time a coordinate update arrives.
      if (!hasDoor && !hasIo1) return;

      const isOpen = hasDoor ? attrs.door === true : attrs.io1 === false;
      const last = j16DoorRef.current[device.id];
      if (last === undefined) {
        j16DoorRef.current[device.id] = isOpen;
        dispatch(sessionActions.updateDoorState({ deviceId: device.id, isOpen }));
        return; // seed state on first authoritative packet, no event
      }
      if (last === isOpen) return;
      j16DoorRef.current[device.id] = isOpen;
      dispatch(sessionActions.updateDoorState({ deviceId: device.id, isOpen }));
      const label = isOpen ? '🚨 Porta Aberta' : '✅ Porta Fechada';
      const event = {
        id: Date.now() + device.id,
        deviceId: device.id,
        type: 'alarm',
        eventTime: new Date().toISOString(),
        positionId: position.id,
        attributes: {
          alarm: isOpen ? 'door' : 'doorClosed',
          label,
        },
      };
      handleEventsRef.current([event]);
    });
  }, [positions, devices, authenticated]);

  const connectSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}/api/socket`);
    socketRef.current = socket;

    socket.onopen = () => {
      dispatch(sessionActions.updateSocket(true));
    };

    socket.onclose = async (event) => {
      dispatch(sessionActions.updateSocket(false));
      if (event.code !== logoutCode) {
        try {
          const devicesResponse = await fetch('/api/devices?all=true');
          if (devicesResponse.ok) {
            dispatch(devicesActions.update(await devicesResponse.json()));
          }
          const positionsResponse = await fetch('/api/positions');
          if (positionsResponse.ok) {
            dispatch(sessionActions.updatePositions(await positionsResponse.json()));
          }
          if (devicesResponse.status === 401 || positionsResponse.status === 401) {
            navigate('/login');
          }
        } catch {
          // ignore errors
        }
        setTimeout(connectSocket, 60000);
      }
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.devices) {
        dispatch(devicesActions.update(data.devices));
      }
      if (data.positions) {
        dispatch(sessionActions.updatePositions(data.positions));
      }
      if (data.events) {
        handleEventsRef.current(data.events);
      }
      if (data.logs) {
        dispatch(sessionActions.updateLogs(data.logs));
      }
    };
  };

  useEffect(() => {
    socketRef.current?.send(JSON.stringify({ logs: includeLogs }));
  }, [includeLogs]);

  useEffectAsync(async () => {
    if (authenticated) {
      const response = await fetchOrThrow('/api/devices?all=true');
      dispatch(devicesActions.refresh(await response.json()));
      nativePostMessage('authenticated');
      connectSocket();
      return () => {
        socketRef.current?.close(logoutCode);
      };
    }
    return null;
  }, [authenticated]);

  const handleNativeNotification = useCatchCallback(async (message) => {
    const eventId = message.data.eventId;
    if (eventId) {
      const response = await fetch(`/api/events/${eventId}`);
      if (response.ok) {
        const event = await response.json();
        const eventWithMessage = {
          ...event,
          attributes: { ...event.attributes, message: message.notification.body },
        };
        handleEvents([eventWithMessage]);
      }
    }
  }, [handleEvents]);

  useEffect(() => {
    handleNativeNotificationListeners.add(handleNativeNotification);
    return () => handleNativeNotificationListeners.delete(handleNativeNotification);
  }, [handleNativeNotification]);

  useEffect(() => {
    if (!authenticated) return;
    const reconnectIfNeeded = () => {
      const socket = socketRef.current;
      if (!socket || socket.readyState === WebSocket.CLOSED) {
        connectSocket();
      } else if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.send('{}');
        } catch {
          // test connection
        }
      }
    };
    const onVisibility = () => {
      if (!document.hidden) {
        reconnectIfNeeded();
      }
    };
    window.addEventListener('online', reconnectIfNeeded);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('online', reconnectIfNeeded);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [authenticated]);

  const handleRemoveNotification = (id) => {
    setNotifications(prev => prev.filter((e) => e.id !== id));
  };

  return (
    <CustomNotificationStack 
      notifications={notifications}
      onRemove={handleRemoveNotification}
    />
  );
};

export default connect()(SocketController);
