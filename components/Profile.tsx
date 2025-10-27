import React, { useState, FormEvent, useEffect } from 'react';
import type { User, ThemeColor } from '../types';
import * as authService from '../services/authService';
import { THEME_CONFIG } from '../constants';

interface ProfileProps {
    user: User;
    onUpdate: (user: User) => void;
    themeColor: ThemeColor;
}

export const Profile: React.FC<ProfileProps> = ({ user, onUpdate, themeColor }) => {
    const [formData, setFormData] = useState({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || '',
        themeColor: user.themeColor || 'teal',
    });
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');
    const theme = THEME_CONFIG[themeColor];

    useEffect(() => {
        setFormData({
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone || '',
            themeColor: user.themeColor || 'teal',
        });
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage('');

        const result = await authService.updateUserDetails({
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            themeColor: formData.themeColor as ThemeColor,
        });
        
        if (result.success && result.user) {
            onUpdate(result.user);
            setMessage('Profile updated successfully!');
        } else {
            setMessage('Failed to update profile.');
        }
        setIsSaving(false);
        setTimeout(() => setMessage(''), 3000);
    };

    const themeOptions: { value: ThemeColor, name: string, color: string }[] = [
        { value: 'teal', name: 'Teal', color: 'bg-teal-500' },
        { value: 'indigo', name: 'Indigo', color: 'bg-indigo-500' },
        { value: 'rose', name: 'Rose', color: 'bg-rose-500' },
    ];
    
    const inputClasses = `input-field mt-1 ${theme.focusRing500} ${theme.focusBorder500}`;

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-6">My Profile</h1>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">First Name</label>
                            <input type="text" name="firstName" id="firstName" value={formData.firstName} onChange={handleChange} required className={inputClasses}/>
                        </div>
                        <div>
                            <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Last Name</label>
                            <input type="text" name="lastName" id="lastName" value={formData.lastName} onChange={handleChange} required className={inputClasses} />
                        </div>
                    </div>

                     <div>
                        <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                        <input type="email" name="email" id="email" value={user.email} disabled className="input-field mt-1 bg-slate-100 dark:bg-slate-700 cursor-not-allowed" />
                    </div>

                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number (Optional)</label>
                        <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} className={inputClasses} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Theme Color</label>
                        <div className="mt-2 flex items-center space-x-4">
                            {themeOptions.map(option => (
                                <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                                    <input type="radio" name="themeColor" value={option.value} checked={formData.themeColor === option.value} onChange={handleChange} className={`form-radio h-4 w-4 ${THEME_CONFIG[option.value].formRadio} ${THEME_CONFIG[option.value].focusRing500}`} />
                                    <span className="flex items-center space-x-1">
                                        <span className={`h-4 w-4 rounded-full ${option.color}`}></span>
                                        <span>{option.name}</span>
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-end space-x-4">
                        {message && <span className="text-sm text-green-600 dark:text-green-400">{message}</span>}
                        <button type="submit" disabled={isSaving} className={`py-2 px-6 rounded-md text-white font-semibold transition-colors disabled:opacity-50 ${theme.bg600} ${theme.hoverBg700}`}>
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
            <style>{`
                .input-field {
                    display: block;
                    width: 100%;
                    padding: 0.5rem 0.75rem;
                    border-width: 1px;
                    border-color: #cbd5e1; /* slate-300 */
                    background-color: #ffffff; /* white */
                    color: #1e293b; /* slate-800 */
                    border-radius: 0.375rem; /* rounded-md */
                    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
                }
                .dark .input-field {
                    border-color: #475569; /* slate-600 */
                    background-color: #334152; /* slate-700 */
                    color: #f1f5f9; /* slate-100 */
                }
                .input-field:focus {
                    outline: 2px solid transparent;
                    outline-offset: 2px;
                    --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
                    --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color);
                    box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
                }
            `}</style>
        </div>
    );
};