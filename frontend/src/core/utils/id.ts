/** ID suficientemente único p/ sync idempotente. Trocar por UUID v4 se adicionar `react-native-get-random-values`. */
export const gerarId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
