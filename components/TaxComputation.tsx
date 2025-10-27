import React, { useState, useMemo, useEffect } from 'react';
import type { Transaction, Category, ThemeColor, FileStatus } from '../types';
import { FileUpload } from './FileUpload';
import { StatusMessage } from './StatusMessage';

interface TaxComputationProps {
    taxTransactions: Transaction[];
    allCategories: Category[];
    themeColor: ThemeColor;
    onUpload: (files: FileList) => Promise<void>;
    disabled: boolean;
    fileStatuses: FileStatus[];
    setFileStatuses: React.Dispatch<React.SetStateAction<FileStatus[]>>;
}

const formatCurrency = (amount: number | null) => {
    if (amount === null) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// FIX: Replaced the buggy useLocalStorage implementation with a correct one using useEffect.
// This fixes the type error by providing a standard React state setter and prevents stale state issues.
const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(error);
            return initialValue;
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem(key, JSON.stringify(storedValue));
        } catch (error) {
            console.error(error);
        }
    }, [key, storedValue]);

    return [storedValue, setStoredValue];
};

export const TaxComputation: React.FC<TaxComputationProps> = ({ taxTransactions, allCategories, themeColor, onUpload, disabled, fileStatuses, setFileStatuses }) => {
    const [deductibleCategories, setDeductibleCategories] = useLocalStorage<string[]>('deductibleCategories', []);
    const [annualIncome, setAnnualIncome] = useLocalStorage<number>('annualIncome', 0);
    const [status, setStatus] = useState<string>('');
    const [error, setError] = useState<string>('');

    const handleFileUpload = async (files: FileList) => {
        setStatus(`Uploading ${files.length} file(s) for tax analysis...`);
        setError('');
        try {
            await onUpload(files);
            setStatus('Tax documents processed successfully.');
        } catch (e: any) {
            setError(e.message || 'Upload failed.');
        } finally {
            setTimeout(() => {
                setStatus('');
                setError('');
            }, 5000);
        }
    };

    const handleCategoryToggle = (category: Category) => {
        setDeductibleCategories(prev =>
            prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
        );
    };

    const deductibleTransactions = useMemo(() => {
        const categorySet = new Set(deductibleCategories);
        return taxTransactions
            .filter(t => t.debit && categorySet.has(t.category))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [taxTransactions, deductibleCategories]);

    const totalDeductions = useMemo(() => deductibleTransactions.reduce((sum, t) => sum + (t.debit || 0), 0), [deductibleTransactions]);
    const taxableIncome = useMemo(() => Math.max(0, (Number(annualIncome) || 0) - totalDeductions), [annualIncome, totalDeductions]);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Tax Computation</h1>
                <p className="mt-1 text-slate-500 dark:text-slate-400">Upload tax-related documents and select expense categories to calculate potential deductions.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1 space-y-6">
                    <FileUpload onUpload={handleFileUpload} disabled={disabled} themeColor={themeColor} fileStatuses={fileStatuses} />
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
                        <h2 className="text-xl font-bold mb-4">Select Deductible Categories</h2>
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                            {allCategories.filter(c => !['Salary', 'Other Income'].includes(c)).map(cat => (
                                <label key={cat} className="flex items-center space-x-3 cursor-pointer p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700/50">
                                    <input type="checkbox" checked={deductibleCategories.includes(cat)} onChange={() => handleCategoryToggle(cat)} className={`h-4 w-4 rounded border-gray-300 text-${themeColor}-600 focus:ring-${themeColor}-500`} />
                                    <span className="text-slate-700 dark:text-slate-300">{cat}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
                        <h2 className="text-xl font-bold mb-4">Deduction Calculator</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label htmlFor="annualIncome" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Your Annual Income</label>
                                <input type="number" id="annualIncome" value={annualIncome} onChange={e => setAnnualIncome(Number(e.target.value))} placeholder="e.g., 1000000" className={`mt-1 w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-${themeColor}-500 focus:border-${themeColor}-500`} />
                            </div>
                            <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-lg"><p className="text-sm text-red-800 dark:text-red-300">Total Deductions</p><p className="text-2xl font-semibold text-red-900 dark:text-red-200">{formatCurrency(totalDeductions)}</p></div>
                            <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-lg"><p className="text-sm text-green-800 dark:text-green-300">Taxable Income</p><p className="text-2xl font-semibold text-green-900 dark:text-green-200">{formatCurrency(taxableIncome)}</p></div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700"><h2 className="text-xl font-bold">Deductible Transactions from Tax Documents</h2></div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                                    <tr><th scope="col" className="px-6 py-3">Date</th><th scope="col" className="px-6 py-3">Description</th><th scope="col" className="px-6 py-3">Category</th><th scope="col" className="px-6 py-3 text-right">Amount</th></tr>
                                </thead>
                                <tbody>
                                    {deductibleTransactions.map(t => (
                                        <tr key={t.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600/20">
                                            <td className="px-6 py-4 whitespace-nowrap">{new Date(t.date).toLocaleDateString('en-GB')}</td>
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{t.description}</td>
                                            <td className="px-6 py-4">{t.category}</td>
                                            <td className="px-6 py-4 text-right text-red-500 font-mono">{formatCurrency(t.debit)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {taxTransactions.length === 0 ? <p className="text-center p-8 text-slate-500">Upload tax documents to begin.</p> : deductibleTransactions.length === 0 && <p className="text-center p-8 text-slate-500">No transactions match the selected deductible categories.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};