import React, { useState, FormEvent } from 'react';
import type { ThemeColor } from '../types';

interface PasswordModalProps {
    fileName: string;
    onSubmit: (password: string) => void;
    onClose: () => void;
    themeColor: ThemeColor;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({ fileName, onSubmit, onClose, themeColor }) => {
    const [password, setPassword] = useState('');

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onSubmit(password);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Password Required</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <p className="mb-4 text-slate-600 dark:text-slate-300">
                    The file <span className={`font-semibold text-${themeColor}-500`}>{fileName}</span> is password-protected. Please enter the password to proceed.
                </p>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="password" className="sr-only">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-${themeColor}-500 focus:border-${themeColor}-500`}
                            placeholder="Enter PDF password"
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 rounded-md bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-800 dark:text-slate-100 font-semibold transition-colors">
                            Cancel
                        </button>
                        <button type="submit" className={`py-2 px-4 rounded-md bg-${themeColor}-600 hover:bg-${themeColor}-700 text-white font-semibold transition-colors`}>
                            Submit
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
