import React from 'react';
import type { Transaction } from '../types';
import { getCategoryColor } from '../constants';

interface DashboardProps {
    transactions: Transaction[];
}

// A simple utility to format currency
const formatCurrency = (amount: number | null) => {
    if (amount === null) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const Dashboard: React.FC<DashboardProps> = ({ transactions }) => {
    const totalIncome = transactions.reduce((sum, t) => sum + (t.credit || 0), 0);
    const totalExpenses = transactions.reduce((sum, t) => sum + (t.debit || 0), 0);
    const netFlow = totalIncome - totalExpenses;

    const expensesByCategory = transactions
        .filter(t => t.debit)
        .reduce((acc: Record<string, number>, t) => {
            acc[t.category] = (acc[t.category] || 0) + (t.debit || 0);
            return acc;
        }, {});
        
    // FIX: Cast the result of Object.entries to ensure correct type inference for sort and map.
    const sortedCategories = (Object.entries(expensesByCategory) as [string, number][]).sort(([, a], [, b]) => b - a);

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg h-full">
            <h2 className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-100">Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-green-100 dark:bg-green-900/50 rounded-lg">
                    <p className="text-sm text-green-800 dark:text-green-300">Total Income</p>
                    <p className="text-2xl font-semibold text-green-900 dark:text-green-200">{formatCurrency(totalIncome)}</p>
                </div>
                <div className="p-4 bg-red-100 dark:bg-red-900/50 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-300">Total Expenses</p>
                    <p className="text-2xl font-semibold text-red-900 dark:text-red-200">{formatCurrency(totalExpenses)}</p>
                </div>
                <div className={`p-4 rounded-lg ${netFlow >= 0 ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-yellow-100 dark:bg-yellow-900/50'}`}>
                    <p className={`text-sm ${netFlow >= 0 ? 'text-blue-800 dark:text-blue-300' : 'text-yellow-800 dark:text-yellow-300'}`}>Net Flow</p>
                    <p className={`text-2xl font-semibold ${netFlow >= 0 ? 'text-blue-900 dark:text-blue-200' : 'text-yellow-900 dark:text-yellow-200'}`}>{formatCurrency(netFlow)}</p>
                </div>
            </div>
            
            <div>
                <h3 className="text-xl font-semibold mb-3 text-slate-700 dark:text-slate-200">Expense Breakdown</h3>
                <div className="space-y-3">
                    {sortedCategories.length > 0 ? sortedCategories.map(([category, amount]) => {
                        const widthPercentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
                        return (
                            <div key={category}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{category}</span>
                                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{formatCurrency(amount)}</span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                                    <div
                                        className={`${getCategoryColor(category)} h-2.5 rounded-full`}
                                        style={{ width: `${widthPercentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        );
                    }) : (
                        <p className="text-slate-500 dark:text-slate-400 text-center py-4">No expense data available.</p>
                    )}
                </div>
            </div>
        </div>
    );
};