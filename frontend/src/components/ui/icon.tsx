import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AndroidName = Extract<SymbolViewProps['name'], object>['android'];

export type IconProps = {
  /** Material Symbols name, for example "arrow_back". */
  name: NonNullable<AndroidName>;
  size?: number;
  themeColor?: ThemeColor;
};

export function Icon({ name, size = 24, themeColor = 'text' }: IconProps) {
  const theme = useTheme();

  return <SymbolView name={{ android: name }} size={size} tintColor={theme[themeColor]} />;
}
