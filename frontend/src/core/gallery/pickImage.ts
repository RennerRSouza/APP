import {launchImageLibrary} from 'react-native-image-picker';

/** Retorna a URI da imagem escolhida ou null se o usuário cancelou. */
export async function pickImage(): Promise<string | null> {
  const res = await launchImageLibrary({mediaType: 'photo', selectionLimit: 1});
  if (res.errorCode) {
    throw new Error(`Falha ao abrir galeria: ${res.errorMessage ?? res.errorCode}`);
  }
  return res.assets?.[0]?.uri ?? null;
}
