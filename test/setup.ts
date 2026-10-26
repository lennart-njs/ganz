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
