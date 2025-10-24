import React from 'react';
import type { ThemeColor } from '../types';

type ThemeMode = 'light' | 'dark';

interface ThemeToggleProps {
  themeMode: ThemeMode;
  toggleTheme: () => void;
  themeColor: ThemeColor;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ themeMode, toggleTheme, themeColor }) => {
  return (
    <button
      onClick={toggleTheme}
      className={`w-14 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeColor}-500`}
      title={`Switch to ${themeMode === 'light' ? 'dark' : 'light'} mode`}
      aria-pressed={themeMode === 'dark'}
    >
      <span
        className={`${
          themeMode === 'dark' ? 'translate-x-6' : 'translate-x-0'
        } w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ease-in-out flex items-center justify-center`}
      >
        {themeMode === 'dark' ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 14.95a1 1 0 010-1.414l.707-.707a1 1 0 111.414 1.414l-.707.707a1 1 0 01-1.414 0zM3 11a1 1 0 100-2H2a1 1 0 100 2h1z" clipRule="evenodd" />
          </svg>
        )}
      </span>
    </button>
  );
};
