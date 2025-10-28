import React, { useMemo, useRef, useEffect } from 'react';
import type { Transaction } from '../types';
import { getCategoryColor } from '../constants';

declare const Chart: any;

const formatCurrency = (amount: number | null) => {
    if (amount === null) return '₹0.00';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const Dashboard: React.FC<{ transactions: Transaction[], allTransactions: Transaction[] }> = ({ transactions, allTransactions }) => {
    const dailyTrendChartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<any>(null);

    const summary = useMemo(() => {
        const income = transactions.reduce((sum, t) => sum + (t.credit || 0), 0);
        const expenses = transactions.reduce((sum, t) => sum + (t.debit || 0), 0);
        return { income, expenses, netFlow: income - expenses };
    }, [transactions]);

    const expensesByCategory = useMemo(() => {
        const categoryMap: Record<string, number> = {};
        transactions.forEach(t => {
            if (t.debit) {
                categoryMap[t.category] = (categoryMap[t.category] || 0) + t.debit;
            }
        });
        return Object.entries(categoryMap).sort(([, a], [, b]) => b - a);
    }, [transactions]);

    const dailyTrendData = useMemo(() => {
        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);

        const recentTransactions = allTransactions.filter(t => new Date(t.date) >= last30Days);
        
        const trend: Record<string, { income: number, expenses: number }> = {};
        for (let i = 0; i < 30; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            trend[key] = { income: 0, expenses: 0 };
        }

        recentTransactions.forEach(t => {
            const key = new Date(t.date).toISOString().split('T')[0];
            if (trend[key]) {
                trend[key].income += t.credit || 0;
                trend[key].expenses += t.debit || 0;
            }
        });

        return Object.entries(trend).sort((a, b) => a[0].localeCompare(b[0]));
    }, [allTransactions]);

    useEffect(() => {
        if (!dailyTrendChartRef.current || dailyTrendData.length === 0) return;
        const ctx = dailyTrendChartRef.current.getContext('2d');
        if (!ctx) return;
        
        if (chartInstance.current) chartInstance.current.destroy();

        const isDark = document.documentElement.classList.contains('dark');
        
        chartInstance.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dailyTrendData.map(([date]) => new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })),
                datasets: [
                    { label: 'Income', data: dailyTrendData.map(([, data]) => data.income), borderColor: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.1)', fill: true, tension: 0.3, pointRadius: 0 },
                    { label: 'Expenses', data: dailyTrendData.map(([, data]) => data.expenses), borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, tension: 0.3, pointRadius: 0 },
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { display: false }, x: { ticks: { color: isDark ? '#94a3b8' : '#475569', maxRotation: 0, autoSkipPadding: 10 }, grid: { display: false } } }, plugins: { legend: { display: false } } }
        });

        return () => chartInstance.current?.destroy();
    }, [dailyTrendData]);

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg h-full space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Filtered Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-100 dark:bg-green-900/50 rounded-lg"><p className="text-sm text-green-800 dark:text-green-300">Total Income</p><p className="text-2xl font-semibold text-green-900 dark:text-green-200">{formatCurrency(summary.income)}</p></div>
                <div className="p-4 bg-red-100 dark:bg-red-900/50 rounded-lg"><p className="text-sm text-red-800 dark:text-red-300">Total Expenses</p><p className="text-2xl font-semibold text-red-900 dark:text-red-200">{formatCurrency(summary.expenses)}</p></div>
                <div className={`p-4 rounded-lg ${summary.netFlow >= 0 ? 'bg-sky-100 dark:bg-sky-900/50' : 'bg-amber-100 dark:bg-amber-900/50'}`}><p className={`text-sm ${summary.netFlow >= 0 ? 'text-sky-800 dark:text-sky-300' : 'text-amber-800 dark:text-amber-300'}`}>Net Flow</p><p className={`text-2xl font-semibold ${summary.netFlow >= 0 ? 'text-sky-900 dark:text-sky-200' : 'text-amber-900 dark:text-amber-200'}`}>{formatCurrency(summary.netFlow)}</p></div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-xl font-semibold mb-3 text-slate-700 dark:text-slate-200">Expense Breakdown</h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {expensesByCategory.length > 0 ? expensesByCategory.map(([category, amount]) => (
                            <div key={category}>
                                <div className="flex justify-between items-center mb-1 text-sm"><span className="font-medium text-slate-600 dark:text-slate-300">{category}</span><span className="font-mono text-slate-500">{formatCurrency(amount)}</span></div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2"><div className={`${getCategoryColor(category)} h-2 rounded-full`} style={{ width: `${summary.expenses > 0 ? (amount / summary.expenses) * 100 : 0}%` }}></div></div>
                            </div>
                        )) : <p className="text-slate-500 dark:text-slate-400 text-center py-4">No expense data for this period.</p>}
                    </div>
                </div>
                 <div>
                    <h3 className="text-xl font-semibold mb-3 text-slate-700 dark:text-slate-200">Daily Trend (Last 30 Days)</h3>
                    <div className="h-60 relative">
                        <canvas ref={dailyTrendChartRef}></canvas>
                    </div>
                </div>
            </div>
        </div>
    );
};