'use client';

import { useState } from 'react';
import { GPS_ACCURACY_REJECT_METRES, GPS_ACCURACY_WARN_METRES } from '@/lib/utils/constants';

export default function LocationPicker() {
  const [message, setMessage] = useState('Location not set');

  function useGps() {
    if (!navigator.geolocation) {
      setMessage('GPS is unavailable. Drop the pin manually.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (position.coords.accuracy > GPS_ACCURACY_REJECT_METRES) {
          setMessage('Cannot determine location accurately. Please enable GPS or use manual pin drop.');
        } else if (position.coords.accuracy > GPS_ACCURACY_WARN_METRES) {
          setMessage('GPS signal weak. For best accuracy, step outdoors and wait 10 seconds.');
        } else {
          setMessage(`Location confirmed: ${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`);
        }
      },
      () => setMessage('GPS permission was not granted. Drop the pin manually.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold">Location</h2>
      <p data-testid="location-confirmed" className="mt-3 rounded border border-gray-200 bg-gray-50 p-3 text-sm">{message}</p>
      <button data-testid="use-gps" type="button" onClick={useGps} className="mt-4 rounded-md bg-civic-blue px-4 py-2 font-semibold text-white">Use GPS</button>
    </div>
  );
}
