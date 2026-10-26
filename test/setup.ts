import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';

jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Schrift gilt in Tests als geladen.
jest.mock('@expo-google-fonts/schibsted-grotesk', () => ({
  useFonts: () => [true, null],
  SchibstedGrotesk_400Regular: 1,
  SchibstedGrotesk_500Medium: 2,
  SchibstedGrotesk_600SemiBold: 3,
  SchibstedGrotesk_700Bold: 4,
}));

// Mock-Services ohne Wartezeit
require('@/services/mock/timing').timing.scale = 0;

// Kamera: Berechtigung je Test steuerbar, Aufnahme liefert ein Testbild.
jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  const permission = { current: { granted: true, canAskAgain: true, status: 'granted' } };
  const CameraView = React.forwardRef((props: { onCameraReady?: () => void }, ref: unknown) => {
    React.useImperativeHandle(ref, () => ({
      takePictureAsync: async () => ({ uri: 'file:///test.jpg', width: 1200, height: 900 }),
    }));
    React.useEffect(() => props.onCameraReady?.(), []);
    return React.createElement(View, { testID: 'camera-view' });
  });
  return {
    CameraView,
    __permission: permission,
    useCameraPermissions: () => [
      permission.current,
      jest.fn(async () => permission.current),
      jest.fn(async () => permission.current),
    ],
  };
});

// Lokale Mitteilungen: Erlaubnis und Aufrufe prüfbar
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
}));
