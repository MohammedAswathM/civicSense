'use client';

import { useState } from 'react';
import { GPS_ACCURACY_REJECT_METRES, GPS_ACCURACY_WARN_METRES } from '@/lib/utils/constants';

export function useLocation() {
  const [gpsWarning, setGpsWarning] = useState('');
  const [gpsError, setGpsError] = useState('');

  function requestLocation() {
    navigator.geolocation.getCurrentPosition((position) => {
      if (position.coords.accuracy > GPS_ACCURACY_WARN_METRES) {
        setGpsWarning('GPS signal weak. For best accuracy, step outdoors and wait 10 seconds.');
      }
      if (position.coords.accuracy > GPS_ACCURACY_REJECT_METRES) {
        setGpsError('Cannot determine location accurately. Please enable GPS or use the map to drop a pin manually.');
      }
    });
  }

  return { gpsWarning, gpsError, requestLocation };
}
