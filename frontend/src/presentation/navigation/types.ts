export type RootStackParamList = {
  Home: undefined;
  Camera: undefined;
  Resultado: { 
    imageUri: string;
    cameraPitch?: number | null;
    cameraRoll?: number | null;
  };
  Historico: undefined;
};