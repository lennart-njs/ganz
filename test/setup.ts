import mockSafeAreaContext from 'react-native-safe-area-context/jest/mock';

import { timing } from '@/services/mock/timing';

jest.mock('react-native-safe-area-context', () => mockSafeAreaContext);

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
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
timing.scale = 0;

// Kamera: Berechtigung je Test steuerbar, Aufnahme liefert ein Testbild.
jest.mock('expo-camera', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const permission = { current: { granted: true, canAskAgain: true, status: 'granted' } };
  const CameraView = React.forwardRef(function CameraView(
    { onCameraReady }: { onCameraReady?: () => void },
    ref: React.Ref<unknown>,
  ) {
    React.useImperativeHandle(ref, () => ({
      takePictureAsync: async () => ({ uri: 'file:///test.jpg', width: 1200, height: 900 }),
    }));
    // Nur beim Einhängen melden, wie die echte Kamera. Die Ref hält den neuesten Callback.
    const ready = React.useRef(onCameraReady);
    ready.current = onCameraReady;
    React.useEffect(() => ready.current?.(), []);
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
