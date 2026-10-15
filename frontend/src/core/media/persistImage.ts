import RNFS from 'react-native-fs';

/** Fotos da câmera vivem em cache (o SO pode apagar). Copiamos para armazenamento persistente. */
export async function persistImage(sourceUri: string, id: string): Promise<string> {
  const dir = `${RNFS.DocumentDirectoryPath}/contagens`;
  await RNFS.mkdir(dir);
  const dest = `${dir}/${id}.jpg`;
  await RNFS.copyFile(sourceUri.replace('file://', ''), dest);
  return `file://${dest}`;
}
