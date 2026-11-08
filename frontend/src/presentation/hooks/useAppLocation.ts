import { useState, useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export type AppLocation = {
  latitude: number | null;
  longitude: number | null;
  endereco: string | null;
};

export function useAppLocation() {
  const [location, setLocation] = useState<AppLocation>({ latitude: null, longitude: null, endereco: null });

  useEffect(() => {
    async function fetchLocation() {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
      } else {
        Geolocation.requestAuthorization();
      }

      // enableHighAccuracy: false é crucial para funcionar rápido dentro de prédios (usa Wi-Fi/Rede em vez de Satélite)
      Geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          let enderecoFormatado = null;

          try {
            // O Nominatim EXIGE um User-Agent. Sem isso, a API rejeita a conexão do celular.
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
              headers: {
                'User-Agent': 'YoloCounterApp/0.1.1 (suporte@app.com)'
              }
            });
            const data = await res.json();
            if (data && data.display_name) {
              enderecoFormatado = data.display_name;
            }
          } catch (e) {
            console.log('Erro API de endereço:', e);
          }

          setLocation({ latitude, longitude, endereco: enderecoFormatado });
        },
        (error) => console.log('Erro de GPS:', error),
        { enableHighAccuracy: false, timeout: 20000, maximumAge: 10000 }
      );
    }

    fetchLocation();
  }, []);

  return location;
}