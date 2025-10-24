import React from 'react';
import type { ThemeColor } from '../types';

interface WelcomeProps {
    themeColor: ThemeColor;
}

export const Welcome: React.FC<WelcomeProps> = ({ themeColor }) => {
    return (
        <div className="text-center p-10 md:p-20 bg-white dark:bg-slate-800 rounded-lg shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className={`mx-auto h-16 w-16 text-${themeColor}-400 mb-4`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">Welcome to Your Expense Tracker</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
                Get started by uploading your bank statements. Drag and drop PDF, CSV, or TXT files into the box above.
                All your data is processed and stored securely on your own device.
            </p>
        </div>
    );
};
