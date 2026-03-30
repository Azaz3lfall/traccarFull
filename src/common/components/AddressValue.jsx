import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from '@mui/material';
import { useTranslation } from './LocalizationProvider';
import { useCatch } from '../../reactHelper';
import fetchOrThrow from '../util/fetchOrThrow';
import { reverseGeocode } from '../util/formatter';

const AddressValue = ({ latitude, longitude, originalAddress }) => {
  const t = useTranslation();

  const addressEnabled = useSelector((state) => state.session.server.geocoderEnabled);

  const [address, setAddress] = useState();
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    setAddress(originalAddress);
  }, [latitude, longitude, originalAddress]);

  // Auto-resolve address if not present
  useEffect(() => {
    if (!originalAddress && latitude && longitude && addressEnabled && !isResolving) {
      setIsResolving(true);
      reverseGeocode(latitude, longitude)
        .then((resolvedAddr) => {
          if (resolvedAddr) {
            setAddress(resolvedAddr);
          }
          setIsResolving(false);
        })
        .catch(() => {
          setIsResolving(false);
        });
    }
  }, [latitude, longitude, originalAddress, addressEnabled, isResolving]);

  const showAddress = useCatch(async (event) => {
    event.preventDefault();
    setIsResolving(true);
    try {
      // Try custom Nominatim server first
      const resolvedAddr = await reverseGeocode(latitude, longitude);
      if (resolvedAddr) {
        setAddress(resolvedAddr);
        setIsResolving(false);
        return;
      }
      
      // Fallback to Traccar geocoding API
      const query = new URLSearchParams({ latitude, longitude });
      const response = await fetchOrThrow(`/api/server/geocode?${query.toString()}`);
      setAddress(await response.text());
    } catch (error) {
      console.warn('Geocoding failed:', error);
    } finally {
      setIsResolving(false);
    }
  });

  if (address) {
    return address;
  }
  if (isResolving) {
    return t('sharedLoading');
  }
  if (addressEnabled) {
    return (<Link href="#" onClick={showAddress}>{t('sharedShowAddress')}</Link>);
  }
  return '';
};

export default AddressValue;
