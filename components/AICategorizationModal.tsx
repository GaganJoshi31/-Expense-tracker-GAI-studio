import React, { useState, useEffect } from 'react';
import type { Transaction, Category, ThemeColor } from '../types';
import * as dbService from '../services/dbService';
import { suggestCategories, CategorizationSuggestion } from '../services/aiService';

interface AICategorizationModalProps {
    onClose: () => void;
    onUpdate: () => void;
    allCategories: Category[];
    themeColor: ThemeColor;
}

export const AICategorizationModal: React.FC<AICategorizationModalProps> = ({ onClose, onUpdate, allCategories, themeColor }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [suggestions, setSuggestions] = useState<Map<string, CategorizationSuggestion>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchTransactions = async () => {
            setIsLoading(true);
            const all = await dbService.getAllTransactions();
            const filtered = all.filter(t => t.category === 'Other Expense' || t.category === 'Other Income');
            setTransactions(filtered);
            setIsLoading(false);
        };
        fetchTransactions();
    }, []);

    const handleGetSuggestions = async () => {
        setIsSuggesting(true);
        setError('');
        try {
            const results = await suggestCategories(transactions, allCategories);
            const newSuggestions = new Map<string, CategorizationSuggestion>();
            results.forEach(s => {
                if(allCategories.includes(s.suggestedCategory)) {
                    newSuggestions.set(s.id, s)
                }
            });
            setSuggestions(newSuggestions);
        } catch (e: any) {
            setError(e.message || 'Failed to get suggestions.');
        } finally {
            setIsSuggesting(false);
        }
    };
    
    const handleApplySuggestion = async (transaction: Transaction, suggestion: CategorizationSuggestion) => {
        if (!transaction) return;
        
        await dbService.updateTransactionCategory(transaction.id, suggestion.suggestedCategory);
        await dbService.setCustomRule({
            description: transaction.description,
            category: suggestion.suggestedCategory,
            source: 'ai_suggestion'
        });

        setTransactions(prev => prev.filter(t => t.id !== transaction.id));
        setSuggestions(prev => {
            const newMap = new Map(prev);
            newMap.delete(transaction.id);
            return newMap;
        });
        onUpdate();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold">AI-Powered Categorization</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {error && <div className="p-3 mb-4 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md" role="alert">{error}</div>}
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                        <p className="text-slate-600 dark:text-slate-300">Review transactions in 'Other' categories and use AI to suggest better ones.</p>
                        <button onClick={handleGetSuggestions} disabled={isSuggesting || transactions.length === 0}
                            className={`bg-${themeColor}-600 hover:bg-${themeColor}-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2`}>
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            <span>{isSuggesting ? 'Thinking...' : 'Get Suggestions'}</span>
                        </button>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg">
                       {isLoading ? (
                           <p className="p-4 text-center">Loading transactions...</p>
                       ) : transactions.length === 0 ? (
                           <p className="p-4 text-center text-slate-500 dark:text-slate-400">No transactions need categorization.</p>
                       ) : (
                           <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                                {transactions.map(t => {
                                    const suggestion = suggestions.get(t.id);
                                    return (
                                    <li key={t.id} className="p-3">
                                        <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
                                            <div>
                                                <p className="font-semibold">{t.description}</p>
                                                <p className="text-sm text-slate-500">{new Date(t.date).toLocaleDateString('en-GB')}</p>
                                            </div>
                                            {suggestion ? (
                                                <div className="text-left md:text-right flex items-center gap-4">
                                                    <div className="flex-grow">
                                                        <p className={`font-semibold text-${themeColor}-500`}>{suggestion.suggestedCategory}</p>
                                                        <p className="text-xs text-slate-400 italic">"{suggestion.reasoning}"</p>
                                                    </div>
                                                    <button onClick={() => handleApplySuggestion(t, suggestion)} className="text-sm bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-2 rounded whitespace-nowrap">
                                                        Apply &amp; Rule
                                                    </button>
                                                </div>
                                            ) : (
                                                 <p className="text-sm text-slate-400 font-medium bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">{t.category}</p>
                                            )}
                                        </div>
                                    </li>
                                )})}
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
