import { render, screen } from '@testing-library/react-native';

import Index from '@/app/index';
import { de } from '@/i18n/de';

test('Startseite zeigt die Wortmarke', async () => {
  await render(<Index />);
  expect(screen.getByText(de.app.name)).toBeTruthy();
});
