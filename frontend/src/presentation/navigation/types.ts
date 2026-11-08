export type RootStackParamList = {
  Home: undefined;
  Camera: undefined;
  Resultado: { 
    imageUri: string;
    cameraPitch?: number | null;
    cameraRoll?: number | null;
    latitude?: number | null;
    longitude?: number | null;
    endereco?: string | null;
  };
  Historico: undefined;
};