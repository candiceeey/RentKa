/**
 * RentKa design tokens, taken from docs/prototype.
 * Screens and components read colors, fonts, spacing and shapes from here; nothing is hard-coded per screen.
 * The prototype is light-only, so there is no dark palette.
 */

import '@/global.css';

import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const Colors = {
  /** Cream page background. */
  background: '#FDF5EC',
  /** Cards, sheets, inputs on the cream page. */
  surface: '#FFFFFF',
  /** Inputs on plain forms, inner panels of a card. */
  surfaceMuted: '#F8FAFC',
  text: '#1E293B',
  textSecondary: '#64748B',
  placeholder: '#94A3B8',
  border: '#E2E8F0',

  /** Buttons, titles, links, selected states. */
  primary: '#047857',
  onPrimary: '#FFFFFF',
  /** Dimmed backdrop behind a bottom sheet or dialog. */
  overlay: 'rgba(15, 23, 42, 0.45)',
  /** Translucent white on a green header: the Lender/Borrower switch track. */
  onPrimarySoft: 'rgba(255, 255, 255, 0.2)',
  /** Mint: chips, selected tab pill, soft panels. */
  primarySoft: '#D1FAE5',
  /** Splash and the top of the login screen. */
  brand: '#1B7A4B',
  /** App header in lender view. */
  headerLender: '#005F46',
  /** App header in borrower view. */
  headerBorrower: '#2EA866',

  danger: '#EF4444',
  dangerSoft: '#FEE2E2',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  warningBorder: '#FCD34D',
  info: '#2563EB',
  infoSoft: '#DBEAFE',
  star: '#F59E0B',
} as const;

export type ThemeColor = keyof typeof Colors;

/** Inter, loaded in src/app/_layout.tsx. One family name per weight (Android ignores fontWeight on custom fonts). */
export const Fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/** Text styles used by ThemedText. */
export const Type = {
  /** Big screen titles: "Welcome back!". */
  title: { fontFamily: Fonts.bold, fontSize: 32, lineHeight: 40 },
  /** Screen and section headings. */
  heading: { fontFamily: Fonts.bold, fontSize: 22, lineHeight: 28 },
  /** Card titles. */
  subheading: { fontFamily: Fonts.semibold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: Fonts.regular, fontSize: 16, lineHeight: 24 },
  bodyBold: { fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 24 },
  /** Field labels, chips. */
  label: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20 },
  small: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: Fonts.regular, fontSize: 12, lineHeight: 16 },
} as const satisfies Record<string, TextStyle>;

export type TextType = keyof typeof Type;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  /** Inputs and buttons. */
  md: 14,
  /** Cards. */
  lg: 16,
  /** Header bottom corners, login sheet top corners. */
  xl: 32,
  pill: 999,
} as const;

/** Heights shared by inputs and buttons so forms line up. */
export const ControlHeight = 52;

export const Shadow = {
  card: { elevation: 2, shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  button: { elevation: 4, shadowColor: '#047857', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
} as const satisfies Record<string, ViewStyle>;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
