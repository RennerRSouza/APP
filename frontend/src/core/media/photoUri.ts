export const toFileUri = (path: string): string => (path.startsWith('file://') ? path : `file://${path}`);
