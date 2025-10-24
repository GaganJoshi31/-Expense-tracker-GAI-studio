import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { Transaction, TimeFilter, Category, ThemeColor } from '../types';
import { getCategoryColor, getCategoryHexColor } from '../constants';

declare const Chart: any;
declare const jspdf: any;
declare const html2canvas: any;

type ThemeMode = 'light' | 'dark';

interface AnalysisProps {
    transactions: Transaction[];
    themeColor: ThemeColor;
    themeMode: ThemeMode;
}

const formatCurrency = (amount: number | null, withSign = false) => {
    if (amount === null) return '₹0.00';
    const options = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    const formatted = `₹${Math.abs(amount).toLocaleString('en-IN', options)}`;
    if (withSign) {
        return amount >= 0 ? `+${formatted}` : `-${formatted}`;
    }
    return formatted;
};

const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('default', { month: 'short', year: 'numeric' });
};

const TIME_FILTERS: { label: string; value: TimeFilter }[] = [
    { label: 'All Time', value: 'all' },
    { label: '1M', value: 1 },
    { label: '3M', value: 3 },
    { label: '6M', value: 6 },
    { label: '1Y', value: 12 },
];

export const Analysis: React.FC<AnalysisProps> = ({ transactions, themeColor, themeMode }) => {
    const monthlyChartRef = useRef<HTMLCanvasElement>(null);
    const categoryChartRef = useRef<HTMLCanvasElement>(null);
    const monthlyChartInstance = useRef<any>(null);
    const categoryChartInstance = useRef<any>(null);
    const analysisContentRef = useRef<HTMLDivElement>(null);

    const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
    const [isPdfDownloading, setIsPdfDownloading] = useState(false);

    const filteredTransactions = useMemo(() => {
        // FIX: Restructure to use an else block for more robust type inference.
        // This helps TypeScript correctly narrow the `timeFilter` type to a number.
        if (timeFilter === 'all') {
            return transactions;
        } else {
            const now = new Date();
            const filterDate = new Date();
            filterDate.setMonth(now.getMonth() - timeFilter);
            return transactions.filter(t => new Date(t.date) >= filterDate);
        }
    }, [transactions, timeFilter]);

    // 1. Overall Summary
    const summary = useMemo(() => {
        const income = filteredTransactions.reduce((sum, t) => sum + (t.credit || 0), 0);
        const expenses = filteredTransactions.reduce((sum, t) => sum + (t.debit || 0), 0);

        const expensesByCategory = filteredTransactions
            .filter(t => t.debit)
            .reduce((acc: Record<string, number>, t) => {
                acc[t.category] = (acc[t.category] || 0) + (t.debit || 0);
                return acc;
            }, {});
        
        // FIX: Cast the result of Object.entries to ensure correct type inference for sort.
        const topCategory = (Object.entries(expensesByCategory) as [string, number][]).sort(([, a], [, b]) => b - a)[0];
        
        const uniqueMonths = new Set(filteredTransactions.map(t => t.date.slice(0, 7))).size;
        const avgMonthlyExpense = uniqueMonths > 0 ? expenses / uniqueMonths : 0;
        
        const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

        return {
            income,
            expenses,
            netFlow: income - expenses,
            topCategory: topCategory ? topCategory[0] : 'N/A',
            avgMonthlyExpense,
            savingsRate,
        };
    }, [filteredTransactions]);

    // 2. Monthly Breakdown data processing
    const monthlyData = useMemo(() => {
        const breakdown: Record<string, { income: number, expenses: number }> = {};
        filteredTransactions.forEach(t => {
            const month = new Date(t.date).toISOString().slice(0, 7); // YYYY-MM
            if (!breakdown[month]) {
                breakdown[month] = { income: 0, expenses: 0 };
            }
            breakdown[month].income += t.credit || 0;
            breakdown[month].expenses += t.debit || 0;
        });
        // FIX: Cast the result of Object.entries to ensure correct type inference for map.
        return (Object.entries(breakdown) as [string, { income: number, expenses: number }][])
            .map(([month, data]) => ({ month, ...data, net: data.income - data.expenses }))
            .sort((a, b) => a.month.localeCompare(b.month)); // Sort chronologically
    }, [filteredTransactions]);

    // 3. Category Breakdown data processing
    const categoryData = useMemo(() => {
        const expensesByCategory = filteredTransactions
            .filter(t => t.debit)
            .reduce((acc: Record<string, number>, t) => {
                acc[t.category] = (acc[t.category] || 0) + (t.debit || 0);
                return acc;
            }, {});
        // FIX: Cast the result of Object.entries to ensure correct type inference for sort.
        return (Object.entries(expensesByCategory) as [string, number][]).sort(([, a], [, b]) => b - a);
    }, [filteredTransactions]);

    const handleDownloadPdf = async () => {
        if (!analysisContentRef.current || typeof jspdf === 'undefined' || typeof html2canvas === 'undefined') {
            console.error("PDF generation prerequisites not met.");
            return;
        }
    
        setIsPdfDownloading(true);
    
        try {
            const { jsPDF } = jspdf;
    
            const canvas = await html2canvas(analysisContentRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: themeMode === 'dark' ? '#0f172a' : '#f8fafc', // slate-900 or slate-50
            });
            
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const imgWidth = pdfWidth - 20; // 10mm margin
            const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
            
            let position = 10;
            const pageRenderHeight = pdfHeight - 20;

            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
            let heightLeft = imgHeight - pageRenderHeight;

            while (heightLeft > 0) {
                position -= pageRenderHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
                heightLeft -= pageRenderHeight;
            }
    
            const date = new Date().toISOString().split('T')[0];
            pdf.save(`financial-analysis-${date}.pdf`);
    
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Sorry, there was an error generating the PDF. Please try again.");
        } finally {
            setIsPdfDownloading(false);
        }
    };
    
    // Effect for Monthly Breakdown Chart
    useEffect(() => {
        if (!monthlyChartRef.current || monthlyData.length === 0) return;
        const ctx = monthlyChartRef.current.getContext('2d');
        if (!ctx) return;
        if (monthlyChartInstance.current) monthlyChartInstance.current.destroy();

        const isDark = themeMode === 'dark';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDark ? '#94a3b8' : '#475569';
        const legendColor = isDark ? '#cbd5e1' : '#334155';
        
        monthlyChartInstance.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthlyData.map(d => formatMonth(d.month)),
                datasets: [
                    { label: 'Income', type: 'bar', data: monthlyData.map(d => d.income), backgroundColor: 'rgba(34, 197, 94, 0.7)', borderColor: 'rgba(34, 197, 94, 1)' },
                    { label: 'Expenses', type: 'bar', data: monthlyData.map(d => d.expenses), backgroundColor: 'rgba(239, 68, 68, 0.7)', borderColor: 'rgba(239, 68, 68, 1)' },
                    { label: 'Net Savings', type: 'line', data: monthlyData.map(d => d.net), borderColor: '#14b8a6', backgroundColor: 'rgba(20, 184, 166, 0.5)', fill: false, tension: 0.1, yAxisID: 'y' }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor } }, x: { ticks: { color: textColor }, grid: { color: gridColor } } }, plugins: { legend: { labels: { color: legendColor } } } }
        });
        return () => { if (monthlyChartInstance.current) monthlyChartInstance.current.destroy(); };
    }, [monthlyData, themeMode]);

    // Effect for Category Breakdown Chart
    useEffect(() => {
        if (!categoryChartRef.current || categoryData.length === 0) return;
        const ctx = categoryChartRef.current.getContext('2d');
        if (!ctx) return;
        if (categoryChartInstance.current) categoryChartInstance.current.destroy();

        categoryChartInstance.current = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categoryData.map(([category]) => category),
                datasets: [{ data: categoryData.map(([, amount]) => amount), backgroundColor: categoryData.map(([category]) => getCategoryHexColor(category as Category)), hoverOffset: 8, borderWidth: 2, borderColor: themeMode === 'dark' ? '#1e293b' : '#ffffff' }]
            },
            options: { responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { display: false } } }
        });
        return () => { if (categoryChartInstance.current) categoryChartInstance.current.destroy(); };
    }, [categoryData, themeMode]);


    return (
        <div className="space-y-8">
             <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                 <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Financial Analysis</h1>
                 <div className="flex items-center space-x-2">
                    <div className="flex space-x-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 rounded-lg">
                        {TIME_FILTERS.map(({ label, value }) => (
                            <button
                                key={value}
                                onClick={() => setTimeFilter(value)}
                                className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
                                    timeFilter === value
                                        ? `bg-${themeColor}-500 text-white shadow`
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={handleDownloadPdf}
                        disabled={isPdfDownloading}
                        className="flex items-center justify-center space-x-2 bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Download Analysis as PDF"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 9.707a1 1 0 011.414 0L9 11.086V3a1 1 0 112 0v8.086l1.293-1.379a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        <span>{isPdfDownloading ? '...' : 'PDF'}</span>
                    </button>
                </div>
            </div>
            
            <div id="analysis-content" ref={analysisContentRef} className="space-y-8 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow"><p className="text-sm text-slate-500 dark:text-slate-400">Total Expenses</p><p className="text-2xl font-semibold text-red-500">{formatCurrency(summary.expenses)}</p></div>
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow"><p className="text-sm text-slate-500 dark:text-slate-400">Avg. Monthly Expense</p><p className="text-2xl font-semibold text-orange-500">{formatCurrency(summary.avgMonthlyExpense)}</p></div>
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow"><p className="text-sm text-slate-500 dark:text-slate-400">Top Spending Category</p><p className={`text-2xl font-semibold text-${themeColor}-500 truncate`}>{summary.topCategory}</p></div>
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow"><p className="text-sm text-slate-500 dark:text-slate-400">Savings Rate</p><p className={`text-2xl font-semibold ${summary.savingsRate >= 0 ? 'text-green-500' : 'text-yellow-500'}`}>{summary.savingsRate.toFixed(1)}%</p></div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-bold mb-4">Monthly Breakdown</h2>
                    {monthlyData.length > 0 ? (
                        <div className="relative h-96">
                            <canvas ref={monthlyChartRef}></canvas>
                        </div>
                    ) : (
                        <p className="text-center p-8 text-slate-500">Not enough data for a monthly breakdown chart.</p>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-bold mb-4">Expense Category Breakdown</h2>
                    {categoryData.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                            <div className="relative h-64 md:h-80">
                                <canvas ref={categoryChartRef}></canvas>
                            </div>
                            <div className="space-y-3 max-h-80 overflow-y-auto">
                                {categoryData.map(([category, amount]) => {
                                    const percentage = summary.expenses > 0 ? (amount / summary.expenses) * 100 : 0;
                                    return (
                                        <div key={category}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{category}</span>
                                                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{formatCurrency(amount)} ({percentage.toFixed(1)}%)</span>
                                            </div>
                                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                                                <div className={`${getCategoryColor(category as Category)} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ) : (
                        <p className="text-slate-500 dark:text-slate-400 text-center py-4">No expense data available for category breakdown.</p>
                    )}
                </div>
            </div>
        </div>
    );
};