export type Theme = {
  name: string;
  classes: string;
};

export const themes: Record<string, Theme> = {
  default: {
    name: 'Default',
    classes: 'bg-white text-gray-900'
  },
  highContrast: {
    name: 'High Contrast',
    classes: 'bg-black text-yellow-300'
  },
  pastel: {
    name: 'Pastel',
    classes: 'bg-pink-100 text-gray-800'
  }
};

export type ThemeKey = keyof typeof themes;
