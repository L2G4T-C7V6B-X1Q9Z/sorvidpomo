import React from 'react';
import { themes, ThemeKey } from '../theme/themes';
import { useTheme } from '../theme/ThemeContext';

type SettingsDialogProps = {
  open: boolean;
  onClose: () => void;
};

export default function SettingsDialog({ open, onClose }: SettingsDialogProps): JSX.Element | null {
  const { theme, setTheme } = useTheme();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-20"
      onClick={onClose}
    >
      <div
        className="bg-white rounded p-4 shadow-md"
        onClick={(e) => e.stopPropagation()}
      >
        <label htmlFor="theme" className="block mb-2 font-semibold">
          Theme
        </label>
        <select
          id="theme"
          className="border rounded p-2 w-full"
          value={theme}
          onChange={(e) => setTheme(e.target.value as ThemeKey)}
        >
          {Object.entries(themes).map(([key, value]) => (
            <option key={key} value={key}>
              {value.name}
            </option>
          ))}
        </select>
        <button
          className="mt-4 px-3 py-1 border rounded"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
