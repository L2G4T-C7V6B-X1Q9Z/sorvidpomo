import React from 'react';
import { themes, ThemeKey } from '../theme/themes';
import { useTheme } from '../theme/ThemeContext';

export default function SettingsDialog(): JSX.Element {
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-4">
      <label htmlFor="theme" className="block mb-2 font-semibold">
        Theme
      </label>
      <select
        id="theme"
        className="border rounded p-2"
        value={theme}
        onChange={(e) => setTheme(e.target.value as ThemeKey)}
      >
        {Object.entries(themes).map(([key, value]) => (
          <option key={key} value={key}>
            {value.name}
          </option>
        ))}
      </select>
    </div>
  );
}
