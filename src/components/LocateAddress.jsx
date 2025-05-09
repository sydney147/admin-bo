import { useEffect, useRef, useState } from 'react';
import './LocateAddress.css';

export default function LocateAddress() {
  const mapRef = useRef(null);
  const [address, setAddress] = useState('');
  const [map, setMap] = useState(null);
  const [marker, setMarker] = useState(null);

  useEffect(() => {
    const waitForGoogle = setInterval(() => {
      if (window.google) {
        clearInterval(waitForGoogle);
        initMap();
      }
    }, 100);
  }, []);

  const initMap = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLatLng = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };

        const mapObj = new window.google.maps.Map(mapRef.current, {
          center: userLatLng,
          zoom: 15,
        });

        const markerObj = new window.google.maps.Marker({
          position: userLatLng,
          map: mapObj,
          draggable: true,
        });

        getAddressFromLatLng(userLatLng);

        markerObj.addListener('dragend', () => {
          const newPos = markerObj.getPosition();
          getAddressFromLatLng({ lat: newPos.lat(), lng: newPos.lng() });
        });

        mapObj.addListener('click', (e) => {
          const clickedPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          markerObj.setPosition(clickedPos);
          getAddressFromLatLng(clickedPos);
        });

        setMap(mapObj);
        setMarker(markerObj);
      },
      () => alert('Could not access your location.')
    );
  };

  const recenterToCurrentLocation = () => {
    if (!map || !marker) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLatLng = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        map.setCenter(userLatLng);
        marker.setPosition(userLatLng);
        getAddressFromLatLng(userLatLng);
      },
      () => alert('Could not access your location.')
    );
  };

  const getAddressFromLatLng = (latLng) => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: latLng }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const fullAddress = results[0].formatted_address;
        const cleanAddress = fullAddress.replace(/^[^,]+\+[^,]+,\s*/, '');
        setAddress(cleanAddress);
      }
    });
  };

  const confirmAddress = () => {
    if (!address) return;
    window.opener.postMessage({ address }, '*');
    window.close();
  };

  return (
    <div className="locate-address-container">
      <div ref={mapRef} className="map-area"></div>
      <div className="controls-area">
        <strong>Selected Address:</strong>
        <div className="address-display">
          <input type="text" value={address} readOnly />
        </div>
        <button className="locate-button" onClick={recenterToCurrentLocation}>
          📍 Locate My Location
        </button>
        <button className="confirm-button" onClick={confirmAddress}>
          Use this address
        </button>
      </div>
    </div>
  );
}
