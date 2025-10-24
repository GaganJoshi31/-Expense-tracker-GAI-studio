import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import type { CustomRule, Category, ThemeColor } from '../types';
import * as dbService from '../services/dbService';
import * as logService from '../services/logService';

interface ManageRulesModalProps {
    onClose: () => void;
    onRulesUpdate: () => void;
    allCategories: Category[];
    themeColor: ThemeColor;
}

export const ManageRulesModal: React.FC<ManageRulesModalProps> = ({ onClose, onRulesUpdate, allCategories, themeColor }) => {
    const [rules, setRules] = useState<CustomRule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newRuleDescription, setNewRuleDescription] = useState('');
    const [newRuleCategory, setNewRuleCategory] = useState<Category>(allCategories[0] || '');

    const fetchRules = useCallback(async () => {
        setIsLoading(true);
        const fetchedRules = await dbService.getCustomRules();
        setRules(fetchedRules.sort((a, b) => a.description.localeCompare(b.description)));
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchRules();
    }, [fetchRules]);

    const handleAddRule = async (e: FormEvent) => {
        e.preventDefault();
        const description = newRuleDescription.trim();
        if (!description || !newRuleCategory) {
            alert('Please provide both a description and a category.');
            return;
        }

        const newRule: CustomRule = {
            description,
            category: newRuleCategory,
            source: 'manual',
        };

        await dbService.setCustomRule(newRule);
        logService.logInfo('Manual rule created', newRule);
        setNewRuleDescription('');
        await fetchRules();
        onRulesUpdate();
    };

    const handleDeleteRule = async (description: string) => {
        if (window.confirm(`Are you sure you want to delete the rule for "${description}"?`)) {
            await dbService.deleteCustomRule(description);
            logService.logWarning('Manual rule deleted', { description });
            await fetchRules();
            onRulesUpdate();
        }
    };
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold">Manage Custom Rules</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <form onSubmit={handleAddRule} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg mb-6 flex flex-col md:flex-row items-end gap-4">
                        <div className="flex-grow w-full">
                            <label htmlFor="ruleDesc" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Transaction Description (Exact Match)</label>
                            <input type="text" id="ruleDesc" value={newRuleDescription} onChange={e => setNewRuleDescription(e.target.value)} placeholder="e.g., ZOMATO" required className={`w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-${themeColor}-500 focus:border-${themeColor}-500`} />
                        </div>
                        <div className="w-full md:w-auto">
                            <label htmlFor="ruleCat" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                            <select id="ruleCat" value={newRuleCategory} onChange={e => setNewRuleCategory(e.target.value)} className={`w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-${themeColor}-500 focus:border-${themeColor}-500`}>
                                {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <button type="submit" className={`w-full md:w-auto py-2 px-4 rounded-md bg-${themeColor}-600 hover:bg-${themeColor}-700 text-white font-semibold transition-colors`}>Add Rule</button>
                    </form>

                    <h3 className="text-lg font-semibold mb-2">Existing Rules</h3>
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg">
                        {isLoading ? <p className="p-4 text-center">Loading rules...</p> : rules.length === 0 ? <p className="p-4 text-center text-slate-500 dark:text-slate-400">No custom rules defined yet.</p> : (
                            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                                {rules.map(rule => (
                                    <li key={rule.description} className="p-3 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                        <div>
                                            <p className="font-semibold">{rule.description}</p>
                                            <p className="text-sm text-slate-500">maps to &rarr; <span className={`font-medium text-${themeColor}-600 dark:text-${themeColor}-400`}>{rule.category}</span></p>
                                        </div>
                                         <button onClick={() => handleDeleteRule(rule.description)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600" aria-label="Delete rule">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                 <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 text-right">
                    <button onClick={onClose} className="py-2 px-6 rounded-md bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-800 dark:text-slate-100 font-semibold transition-colors">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};
