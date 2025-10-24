import React, { useState, FormEvent } from 'react';
import * as authService from '../services/authService';
import type { ThemeColor } from '../types';

interface AuthProps {
    onAuthSuccess: () => void;
    themeColor: ThemeColor;
}

type AuthView = 'login' | 'signup';
type LoginMethod = 'password' | 'otp';

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess, themeColor }) => {
    const [view, setView] = useState<AuthView>('login');
    const [loginMethod, setLoginMethod] = useState<LoginMethod>('password');
    const [otpStep, setOtpStep] = useState<'enter_email' | 'enter_otp'>('enter_email');
    
    // Common fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');

    // Signup specific fields
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [gender, setGender] = useState('');
    const [purpose, setPurpose] = useState('');

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleLoginSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        const result = await authService.login(email, password);
        if (result.success) {
            onAuthSuccess();
        } else {
            setError(result.message);
        }
        setIsLoading(false);
    };

    const handleOtpRequest = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setIsLoading(true);
        const result = await authService.requestOtp(email);
        if(result.success) {
            setMessage('A mock OTP has been generated. Check the alert.');
            setOtpStep('enter_otp');
        } else {
            setError(result.message);
        }
        setIsLoading(false);
    };
    
    const handleOtpLoginSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        const result = await authService.loginWithOtp(email, otp);
        if (result.success) {
            onAuthSuccess();
        } else {
            setError(result.message);
        }
        setIsLoading(false);
    };

    const handleSignupSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        const result = await authService.signup(email, password, firstName, lastName, gender, purpose);
        if (result.success) {
            onAuthSuccess();
        } else {
            setError(result.message);
        }
        setIsLoading(false);
    };

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setFirstName('');
        setLastName('');
        setGender('');
        setPurpose('');
        setOtp('');
        setError('');
        setMessage('');
        setOtpStep('enter_email');
    };

    const renderLoginForm = () => (
        <>
            <div className="flex border-b border-slate-200 dark:border-slate-700">
                <button onClick={() => setLoginMethod('password')} className={`flex-1 py-2 text-sm font-medium ${loginMethod === 'password' ? `border-b-2 border-${themeColor}-500 text-${themeColor}-600 dark:text-${themeColor}-400` : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                    Password
                </button>
                <button onClick={() => setLoginMethod('otp')} className={`flex-1 py-2 text-sm font-medium ${loginMethod === 'otp' ? `border-b-2 border-${themeColor}-500 text-${themeColor}-600 dark:text-${themeColor}-400` : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                    OTP
                </button>
            </div>
            {loginMethod === 'password' ? (
                <form className="mt-8 space-y-6" onSubmit={handleLoginSubmit}>
                    <input name="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className={`input-field focus:ring-${themeColor}-500 focus:border-${themeColor}-500`} placeholder="Email address"/>
                    <input name="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className={`input-field focus:ring-${themeColor}-500 focus:border-${themeColor}-500`} placeholder="Password"/>
                     <button type="submit" disabled={isLoading} className={`submit-button bg-${themeColor}-600 hover:bg-${themeColor}-700 focus:ring-${themeColor}-500`}>
                        {isLoading ? 'Processing...' : 'Sign in'}
                    </button>
                </form>
            ) : (
                otpStep === 'enter_email' ? (
                    <form className="mt-8 space-y-6" onSubmit={handleOtpRequest}>
                        <p className="text-center text-sm text-slate-500">Enter your email to receive a one-time password.</p>
                        <input name="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className={`input-field focus:ring-${themeColor}-500 focus:border-${themeColor}-500`} placeholder="Email address" autoFocus/>
                        <button type="submit" disabled={isLoading} className={`submit-button bg-${themeColor}-600 hover:bg-${themeColor}-700 focus:ring-${themeColor}-500`}>
                            {isLoading ? 'Sending...' : 'Send OTP'}
                        </button>
                    </form>
                ) : (
                     <form className="mt-8 space-y-6" onSubmit={handleOtpLoginSubmit}>
                         <p className="text-center text-sm text-slate-500">An OTP has been sent to {email}.</p>
                        <input name="otp" type="text" inputMode="numeric" required value={otp} onChange={e => setOtp(e.target.value)} className={`input-field focus:ring-${themeColor}-500 focus:border-${themeColor}-500`} placeholder="One-Time Password" autoFocus/>
                        <button type="submit" disabled={isLoading} className={`submit-button bg-${themeColor}-600 hover:bg-${themeColor}-700 focus:ring-${themeColor}-500`}>
                            {isLoading ? 'Verifying...' : 'Sign In with OTP'}
                        </button>
                        <button type="button" onClick={() => setOtpStep('enter_email')} className="text-center text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 w-full">
                            Use a different email
                        </button>
                    </form>
                )
            )}
        </>
    );

    const renderSignupForm = () => (
         <form className="mt-8 space-y-6" onSubmit={handleSignupSubmit}>
            <div className="rounded-md shadow-sm space-y-4">
                <div className="flex space-x-4">
                    <input name="firstName" type="text" required value={firstName} onChange={e => setFirstName(e.target.value)} className={`input-field focus:ring-${themeColor}-500 focus:border-${themeColor}-500`} placeholder="First Name"/>
                    <input name="lastName" type="text" required value={lastName} onChange={e => setLastName(e.target.value)} className={`input-field focus:ring-${themeColor}-500 focus:border-${themeColor}-500`} placeholder="Last Name"/>
                </div>
                <select name="gender" required value={gender} onChange={e => setGender(e.target.value)} className={`input-field focus:ring-${themeColor}-500 focus:border-${themeColor}-500`}>
                    <option value="" disabled>Select Gender...</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                    <option>Prefer not to say</option>
                </select>
                <input name="purpose" type="text" required value={purpose} onChange={e => setPurpose(e.target.value)} className={`input-field focus:ring-${themeColor}-500 focus:border-${themeColor}-500`} placeholder="Purpose for using app"/>
                <input name="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className={`input-field focus:ring-${themeColor}-500 focus:border-${themeColor}-500`} placeholder="Email address"/>
                <input name="password" type="password" autoComplete="new-password" required value={password} onChange={e => setPassword(e.target.value)} className={`input-field focus:ring-${themeColor}-500 focus:border-${themeColor}-500`} placeholder="Password"/>
            </div>
            <button type="submit" disabled={isLoading} className={`submit-button bg-${themeColor}-600 hover:bg-${themeColor}-700 focus:ring-${themeColor}-500`}>
                {isLoading ? 'Processing...' : 'Sign up'}
            </button>
        </form>
    );

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 py-12">
            <style>{`
                .input-field {
                    appearance: none;
                    position: relative;
                    display: block;
                    width: 100%;
                    padding: 0.75rem;
                    border-width: 1px;
                    border-color: #d1d5db; /* slate-300 */
                    background-color: #ffffff; /* white */
                    placeholder-color: #6b7280; /* slate-500 */
                    color: #111827; /* slate-900 */
                    border-radius: 0.375rem; /* rounded-md */
                }
                .dark .input-field {
                    border-color: #4b5563; /* slate-600 */
                    background-color: #374151; /* slate-700 */
                    placeholder-color: #9ca3af; /* slate-400 */
                    color: #ffffff; /* white */
                }
                .input-field:focus {
                    outline: none;
                }
                .submit-button {
                    position: relative;
                    width: 100%;
                    display: flex;
                    justify-content: center;
                    padding: 0.5rem 1rem;
                    border-width: 1px;
                    border-color: transparent;
                    font-size: 0.875rem;
                    line-height: 1.25rem;
                    font-weight: 500;
                    border-radius: 0.375rem;
                    color: #ffffff;
                }
                .submit-button:focus {
                     outline: none;
                     box-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);
                     --tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);
                     --tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);
                     box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);
                     --tw-ring-offset-width: 2px;
                }
                .submit-button:disabled {
                    opacity: 0.5;
                }

            `}</style>
            <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-slate-800 rounded-lg shadow-lg">
                <div>
                    <h2 className="text-center text-3xl font-extrabold text-slate-900 dark:text-white">
                        {view === 'login' ? 'Sign in to your account' : 'Create a new account'}
                    </h2>
                </div>
                
                {error && <p className="text-center text-red-500 text-sm">{error}</p>}
                {message && <p className="text-center text-green-500 text-sm">{message}</p>}

                {view === 'login' ? renderLoginForm() : renderSignupForm()}

                <div className="text-sm text-center">
                    <button onClick={() => { setView(view === 'login' ? 'signup' : 'login'); resetForm(); }} className={`font-medium text-${themeColor}-600 hover:text-${themeColor}-500`}>
                        {view === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                    </button>
                </div>
            </div>
        </div>
    );
};
