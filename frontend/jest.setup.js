/* eslint-env jest */

jest.mock('react-native-vision-camera', () => ({
  Camera: () => null,
  useCameraDevice: jest.fn(() => ({id: 'back'})),
  useCameraPermission: jest.fn(() => ({
    hasPermission: true,
    requestPermission: jest.fn().mockResolvedValue(true),
  })),
}));

jest.mock('react-native-fast-tflite', () => ({
  loadTensorflowModel: jest.fn().mockResolvedValue({
    runSync: jest.fn(() => []),
  }),
}));

jest.mock('@op-engineering/op-sqlite', () => ({
  open: jest.fn(() => ({
    execute: jest.fn().mockResolvedValue({rows: {_array: []}}),
    executeAsync: jest.fn().mockResolvedValue({rows: {_array: []}}),
    close: jest.fn(),
  })),
}));

jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
  requestAuthorization: jest.fn(),
}));

jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    GestureHandlerRootView: View,
    GestureDetector: View,
    Gesture: {
      Pinch: () => ({onUpdate: () => ({onEnd: () => ({})})}),
      Pan: () => ({onUpdate: () => ({onEnd: () => ({})})}),
      Tap: () => ({onEnd: () => ({})}),
      Simultaneous: () => ({}),
      Exclusive: () => ({}),
    },
  };
});