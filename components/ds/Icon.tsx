import {
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  CircleUser,
  FolderOpen,
  House,
  Mic,
  MicOff,
  Pencil,
  Minus,
  PhoneOff,
  Plus,
  Search,
  TriangleAlert,
  Video,
  VideoOff,
  X,
} from 'lucide-react-native';

import { View } from 'react-native';

import { useTheme, type ThemeColors } from '@/theme';

// Kleines Lucide-Set, vermerkt in design-system/README.md (Iconography).
const icons = {
  back: ChevronLeft,
  forward: ChevronRight,
  expand: ChevronDown,
  /** Aufklappen und Zuklappen einer Kachel (Entscheidung 38) */
  open: Plus,
  shut: Minus,
  close: X,
  check: Check,
  warning: TriangleAlert,
  devices: House,
  cases: FolderOpen,
  profile: CircleUser,
  camera: Camera,
  mic: Mic,
  micOff: MicOff,
  video: Video,
  videoOff: VideoOff,
  hangUp: PhoneOff,
  search: Search,
  add: Plus,
  edit: Pencil,
  /** Senden im Eingabefeld des Gesprächs */
  send: ArrowUp,
} as const;

export type IconName = keyof typeof icons;

interface IconProps {
  name: IconName;
  size?: number;
  color?: keyof ThemeColors;
  strokeWidth?: number;
}

/** Dekoratives Icon. Die Bedeutung trägt immer ein Text oder ein Label am Bedienteil. */
export function Icon({ name, size = 20, color = 'textStrong', strokeWidth = 2 }: IconProps) {
  const theme = useTheme();
  const Component = icons[name];
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={{ width: size, height: size }}
    >
      <Component size={size} color={theme.colors[color]} strokeWidth={strokeWidth} />
    </View>
  );
}
