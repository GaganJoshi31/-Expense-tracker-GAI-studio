import React from 'react';
import { ThemeToggle } from './ThemeToggle';
import type { ThemeColor } from '../types';

type View = 'dashboard' | 'analysis' | 'tax' | 'admin' | 'profile';
type ThemeMode = 'light' | 'dark';

interface HeaderProps {
    onReset: () => void;
    currentView: View;
    onNavigate: (view: View) => void;
    onLogout: () => void;
    isAdmin: boolean;
    themeMode: ThemeMode;
    toggleTheme: () => void;
    themeColor: ThemeColor;
}

export const Header: React.FC<HeaderProps> = ({ onReset, currentView, onNavigate, onLogout, isAdmin, themeMode, toggleTheme, themeColor }) => {
    
    const navButtonClasses = (view: View) => 
        `px-4 py-2 rounded-md font-semibold transition-colors ${
            currentView === view 
            ? `bg-${themeColor}-500 text-white` 
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`;

    return (
        <header className="bg-white dark:bg-slate-800 shadow-md sticky top-0 z-40">
            <div className="container mx-auto p-4 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                     <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 text-${themeColor}-500`} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h12v4a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 6a2 2 0 00-2 2v2a2 2 0 002 2h12a2 2 0 002-2v-2a2 2 0 00-2-2H4z" clipRule="evenodd" />
                    </svg>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">
                        Expense Tracker
                    </h1>
                    <nav className="ml-4 hidden md:flex items-center space-x-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
                        <button onClick={() => onNavigate('dashboard')} className={navButtonClasses('dashboard')}>Dashboard</button>
                        <button onClick={() => onNavigate('analysis')} className={navButtonClasses('analysis')}>Analysis</button>
                        <button onClick={() => onNavigate('tax')} className={navButtonClasses('tax')}>Tax</button>
                        {isAdmin && <button onClick={() => onNavigate('admin')} className={navButtonClasses('admin')}>Admin</button>}
                    </nav>
                </div>
                <div className="flex items-center space-x-2 md:space-x-4">
                    <ThemeToggle themeMode={themeMode} toggleTheme={toggleTheme} themeColor={themeColor} />
                    <button
                        onClick={() => onNavigate('profile')}
                        className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold py-2 px-2 rounded-lg transition-colors"
                        title="My Profile"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                    </button>
                    <button
                        onClick={onReset}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-2 rounded-lg transition-colors"
                        title="Reset all data"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                    </button>
                    <button
                        onClick={onLogout}
                        className="bg-slate-500 hover:bg-slate-600 text-white font-bold py-2 px-2 rounded-lg transition-colors"
                        title="Logout"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>
             <nav className="md:hidden flex items-center justify-center space-x-2 p-2 bg-slate-100 dark:bg-slate-900">
                <button onClick={() => onNavigate('dashboard')} className={navButtonClasses('dashboard')}>Dashboard</button>
                <button onClick={() => onNavigate('analysis')} className={navButtonClasses('analysis')}>Analysis</button>
                <button onClick={() => onNavigate('tax')} className={navButtonClasses('tax')}>Tax</button>
                {isAdmin && <button onClick={() => onNavigate('admin')} className={navButtonClasses('admin')}>Admin</button>}
                 <button onClick={() => onNavigate('profile')} className={navButtonClasses('profile')}>Profile</button>
            </nav>
        </header>
    );
};