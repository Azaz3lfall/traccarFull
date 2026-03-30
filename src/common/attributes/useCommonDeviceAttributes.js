import { useMemo } from 'react';

export default (t) => useMemo(() => ({
  speedLimit: {
    name: t('attributeSpeedLimit'),
    type: 'number',
    subtype: 'speed',
  },
  ktag_hashedKey: {
    name: t('attributeKtagHashedKey'),
    type: 'string',
  },
  ktag_privateKey: {
    name: t('attributeKtagPrivateKey'),
    type: 'string',
  },
  fuelDropThreshold: {
    name: t('attributeFuelDropThreshold'),
    type: 'number',
  },
  fuelIncreaseThreshold: {
    name: t('attributeFuelIncreaseThreshold'),
    type: 'number',
  },
  'report.ignoreOdometer': {
    name: t('attributeReportIgnoreOdometer'),
    type: 'boolean',
  },
  deviceInactivityStart: {
    name: t('attributeDeviceInactivityStart'),
    type: 'number',
  },
  deviceInactivityPeriod: {
    name: t('attributeDeviceInactivityPeriod'),
    type: 'number',
  },
  notificationTokens: {
    name: t('attributeNotificationTokens'),
    type: 'string',
  },
}), [t]);
