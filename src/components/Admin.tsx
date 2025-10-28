import React, { useState, useEffect, useMemo } from 'react';
import type { LogEntry, CustomRule, ThemeColor } from '../types';
import * as dbService from '../services/dbService';
import { THEME_CONFIG } from '../constants';

interface AdminProps {
    onAiCategorize: () => void;
    onManageRules: () => void;
    onManageCategories: () => void;
    themeColor: ThemeColor;
}

type AdminTab = 'tools' | 'logs' | 'analysis';

const LogViewer: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            setIsLoading(false);
            const storedLogs = await dbService.getLogs();
            setLogs(storedLogs.sort((a, b) => b.id - a.id)); // Show newest first
            setIsLoading(false);
        };
        fetchLogs();
    }, []);

    const levelColorMap: Record<LogEntry['level'], string> = {
        INFO: 'text-sky-500',
        WARNING: 'text-amber-500',
        ERROR: 'text-red-500',
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Application Event Logs</h2>
            <div className="overflow-x-auto max-h-[500px] border border-slate-200 dark:border-slate-700 rounded-md">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-100 dark:bg-slate-700 dark:text-slate-300 sticky top-0">
                        <tr>
                            <th scope="col" className="px-4 py-2">Timestamp</th>
                            <th scope="col" className="px-4 py-2">Level</th>
                            <th scope="col" className="px-4 py-2">Message</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {isLoading ? (
                           <tr><td colSpan={3} className="text-center p-4">Loading logs...</td></tr>
                        ) : logs.length === 0 ? (
                           <tr><td colSpan={3} className="text-center p-4">No logs found.</td></tr>
                        ) : (
                            logs.map(log => (
                                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <td className="px-4 py-2 whitespace-nowrap font-mono text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                                    <td className={`px-4 py-2 font-bold ${levelColorMap[log.level]}`}>{log.level}</td>
                                    <td className="px-4 py-2">{log.message}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
};

const TrainingAnalysis: React.FC<{ themeColor: ThemeColor }> = ({ themeColor }) => {
    const [rules, setRules] = useState<CustomRule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const theme = THEME_CONFIG[themeColor];

    useEffect(() => {
        const fetchRules = async () => {
            setIsLoading(true);
            const allRules = await dbService.getCustomRules();
            setRules(allRules);
            setIsLoading(false);
        };
        fetchRules();
    }, []);

    const stats = useMemo(() => {
        const total = rules.length;
        const ai = rules.filter(r => r.source === 'ai_suggestion').length;
        const manual = total - ai;
        const aiPercentage = total > 0 ? (ai / total) * 100 : 0;
        const manualPercentage = 100 - aiPercentage;
        return { 
            total, 
            ai, 
            manual, 
            aiPercentage, 
            manualPercentage,
            aiPercentageFixed: aiPercentage.toFixed(1),
            manualPercentageFixed: manualPercentage.toFixed(1)
        };
    }, [rules]);
    
    const themeClassMap = {
        teal: { bgLight: 'bg-teal-100', darkBg: 'dark:bg-teal-900/50', text: 'text-teal-900', darkText: 'dark:text-teal-200', textLight: 'text-teal-800', darkTextLight: 'dark:text-teal-300' },
        indigo: { bgLight: 'bg-indigo-100', darkBg: 'dark:bg-indigo-900/50', text: 'text-indigo-900', darkText: 'dark:text-indigo-200', textLight: 'text-indigo-800', darkTextLight: 'dark:text-indigo-300' },
        rose: { bgLight: 'bg-rose-100', darkBg: 'dark:bg-rose-900/50', text: 'text-rose-900', darkText: 'dark:text-rose-200', textLight: 'text-rose-800', darkTextLight: 'dark:text-rose-300' },
    };

    if (isLoading) {
        return <div className="p-6 text-center">Loading analysis data...</div>
    }
    
    const currentTheme = themeClassMap[themeColor];

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">AI Training and Rule Analysis</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-lg text-center">
                    <p className="text-sm text-slate-500">Total Rules</p>
                    <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <div className={`p-4 ${currentTheme.bgLight} ${currentTheme.darkBg} rounded-lg text-center`}>
                    <p className={`text-sm ${currentTheme.textLight} ${currentTheme.darkTextLight}`}>Created by AI</p>
                    <p className={`text-3xl font-bold ${currentTheme.text} ${currentTheme.darkText}`}>{stats.ai}</p>
                </div>
                <div className="p-4 bg-sky-100 dark:bg-sky-900/50 rounded-lg text-center">
                    <p className="text-sm text-sky-800 dark:text-sky-300">Created Manually</p>
                    <p className="text-3xl font-bold text-sky-900 dark:text-sky-200">{stats.manual}</p>
                </div>
            </div>
            <div>
                <h3 className="text-lg font-semibold mb-2">Rule Source Breakdown</h3>
                <div className="w-full bg-sky-200 dark:bg-sky-800 rounded-full h-6 flex overflow-hidden">
                    <div className={`${theme.bg500} h-6 flex items-center justify-center text-white text-sm font-semibold`} style={{ width: `${stats.aiPercentage}%` }} title={`AI: ${stats.aiPercentageFixed}%`}>
                       {stats.ai > 0 && <span>AI</span>}
                    </div>
                     <div className="bg-sky-500 h-6 flex items-center justify-center text-white text-sm font-semibold`} style={{ width: `${stats.manualPercentage}%` }} title={`Manual: ${stats.manualPercentageFixed}%`}>
                       {stats.manual > 0 && <span>Manual</span>}
                    </div>
                </div>
                <p className="text-center mt-2 text-slate-500">
                    <strong>{stats.aiPercentageFixed}%</strong> of your automated categorization rules came from AI suggestions.
                </p>
            </div>
        </div>
    );
};

export const Admin: React.FC<AdminProps> = ({ onAiCategorize, onManageRules, onManageCategories, themeColor }) => {
    const [activeTab, setActiveTab] = useState<AdminTab>('tools');
    const theme = THEME_CONFIG[themeColor];
    
    const tabButtonClasses = (tab: AdminTab) =>
        `px-4 py-2 font-semibold rounded-md transition-colors ${
            activeTab === tab 
            ? `${theme.bg500} text-white` 
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Admin Panel</h1>
                <p className="mt-1 text-slate-500 dark:text-slate-400">Manage the application's data, logging, and categorization logic.</p>
            </div>

            <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="flex space-x-2" aria-label="Tabs">
                    <button onClick={() => setActiveTab('tools')} className={tabButtonClasses('tools')}>Tools</button>
                    <button onClick={() => setActiveTab('logs')} className={tabButtonClasses('logs')}>Event Logs</button>
                    <button onClick={() => setActiveTab('analysis')} className={tabButtonClasses('analysis')}>AI Training Analysis</button>
                </nav>
            </div>

            <div>
                {activeTab === 'tools' && (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 flex flex-col items-start">
                            <div className={`flex-shrink-0 ${theme.bg500} p-3 rounded-lg`}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            </div>
                            <h2 className="text-xl font-bold mt-4">AI-Powered Categorization</h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-2 mb-4 flex-grow">
                                Review 'Other' categories and let AI suggest better ones. This also creates new rules.
                            </p>
                            <button onClick={onAiCategorize} className={`${theme.bg500} ${theme.hoverBg600} text-white font-bold py-2 px-4 rounded-lg transition-colors w-full md:w-auto`}>
                                Start AI Review
                            </button>
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 flex flex-col items-start">
                            <div className="flex-shrink-0 bg-slate-600 p-3 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01-.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
                            </div>
                            <h2 className="text-xl font-bold mt-4">Manage Custom Rules</h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-2 mb-4 flex-grow">
                                Manually create, edit, or delete rules that assign categories based on transaction descriptions.
                            </p>
                            <button onClick={onManageRules} className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg transition-colors w-full md:w-auto">
                            Manage Rules
                            </button>
                        </div>
                         <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 flex flex-col items-start">
                            <div className="flex-shrink-0 bg-slate-600 p-3 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor"><path d="M17.408 8.366A5.502 5.502 0 0012.5 3a5.5 5.5 0 00-5.408 7.366l-6.73 6.73A.75.75 0 001 17.75h1.25a.75.75 0 000-1.5H3.06l6.19-6.19a3.502 3.502 0 115.5 0l6.19 6.19h-.81a.75.75 0 100 1.5H19a.75.75 0 00.658-.352.75.75 0 00-.016-.76l-6.73-6.73zM12.5 9a2 2 0 100-4 2 2 0 000 4z" /></svg>
                            </div>
                            <h2 className="text-xl font-bold mt-4">Manage Categories</h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-2 mb-4 flex-grow">
                                Add, rename, or delete the transaction categories available for classification.
                            </p>
                            <button onClick={onManageCategories} className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg transition-colors w-full md:w-auto">
                            Manage Categories
                            </button>
                        </div>
                    </div>
                )}
                {activeTab === 'logs' && <LogViewer />}
                {activeTab === 'analysis' && <TrainingAnalysis themeColor={themeColor} />}
            </div>
        </div>
    );
};