import React from 'react';
import type { TimeFilter, Category, ThemeColor } from '../types';

interface FilterControlsProps {
    activeFilter: TimeFilter;
    onFilterChange: (filter: TimeFilter) => void;
    onDownload: () => void;
    onDownloadAll: () => void;
    searchText: string;
    onSearchChange: (text: string) => void;
    categoryFilter: Category | 'all';
    onCategoryFilterChange: (category: Category | 'all') => void;
    typeFilter: 'all' | 'income' | 'expense';
    onTypeFilterChange: (type: 'all' | 'income' | 'expense') => void;
    allCategories: Category[];
    themeColor: ThemeColor;
}

const TIME_FILTERS: { label: string; value: TimeFilter }[] = [
    { label: 'All Time', value: 'all' },
    { label: '1M', value: 1 },
    { label: '3M', value: 3 },
    { label: '6M', value: 6 },
    { label: '1Y', value: 12 },
];

export const FilterControls: React.FC<FilterControlsProps> = ({
    activeFilter, onFilterChange, onDownload, onDownloadAll,
    searchText, onSearchChange, categoryFilter, onCategoryFilterChange,
    typeFilter, onTypeFilterChange, allCategories, themeColor
}) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 mb-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                {/* Search Input */}
                <div className="lg:col-span-2">
                    <label htmlFor="search-description" className="sr-only">Search Description</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                        </div>
                        <input
                            type="text"
                            id="search-description"
                            value={searchText}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Search by description..."
                            className={`w-full pl-10 pr-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-${themeColor}-500 focus:border-${themeColor}-500`}
                        />
                    </div>
                </div>

                {/* Category Select */}
                <div>
                    <label htmlFor="category-filter" className="sr-only">Filter by Category</label>
                    <select
                        id="category-filter"
                        value={categoryFilter}
                        onChange={(e) => onCategoryFilterChange(e.target.value as Category | 'all')}
                        className={`w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-${themeColor}-500 focus:border-${themeColor}-500`}
                    >
                        <option value="all">All Categories</option>
                        {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>

                {/* Type Select */}
                <div>
                    <label htmlFor="type-filter" className="sr-only">Filter by Type</label>
                    <select
                        id="type-filter"
                        value={typeFilter}
                        onChange={(e) => onTypeFilterChange(e.target.value as 'all' | 'income' | 'expense')}
                        className={`w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-${themeColor}-500 focus:border-${themeColor}-500`}
                    >
                        <option value="all">All Types</option>
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                    </select>
                </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center space-x-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Period:</span>
                    <div className="flex space-x-1 bg-slate-200 dark:bg-slate-700 p-1 rounded-lg">
                        {TIME_FILTERS.map(({ label, value }) => (
                            <button
                                key={value}
                                onClick={() => onFilterChange(value)}
                                className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
                                    activeFilter === value
                                        ? `bg-${themeColor}-500 text-white shadow`
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                    <button
                        onClick={onDownload}
                        className={`w-full sm:w-auto flex items-center justify-center space-x-2 bg-${themeColor}-500 hover:bg-${themeColor}-600 text-white font-bold py-2 px-4 rounded-lg transition-colors`}
                        title="Download filtered transactions as CSV"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 9.707a1 1 0 011.414 0L9 11.086V3a1 1 0 112 0v8.086l1.293-1.379a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        <span>Download Filtered</span>
                    </button>
                     <button
                        onClick={onDownloadAll}
                        className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                        title="Download all transactions as CSV"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 9.707a1 1 0 011.414 0L9 11.086V3a1 1 0 112 0v8.086l1.293-1.379a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        <span>Download All</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
