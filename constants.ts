import type { CategoryRule, Category, ThemeColor } from './types';

export const DEFAULT_CATEGORIES: Category[] = [
    'Salary',
    'UPI',
    'Food',
    'Petrol',
    'Loan/EMI',
    'Credit Card Bill',
    'Transfer',
    'Other Income',
    'Other Expense'
];

export const THEME_COLORS: Record<ThemeColor, { main: string, hover: string, focus: string, text: string }> = {
    teal: {
        main: 'bg-teal-600',
        hover: 'hover:bg-teal-700',
        focus: 'focus:ring-teal-500',
        text: 'text-teal-500',
    },
    indigo: {
        main: 'bg-indigo-600',
        hover: 'hover:bg-indigo-700',
        focus: 'focus:ring-indigo-500',
        text: 'text-indigo-500',
    },
    rose: {
        main: 'bg-rose-600',
        hover: 'hover:bg-rose-700',
        focus: 'focus:ring-rose-500',
        text: 'text-rose-500',
    }
};

export const getThemeColor = (theme: ThemeColor, element: 'main' | 'hover' | 'focus' | 'text'): string => {
    return THEME_COLORS[theme][element];
};


export const CATEGORY_COLORS: Record<Category, string> = {
    'Salary': 'bg-green-500',
    'Other Income': 'bg-green-400',
    'UPI': 'bg-sky-500',
    'Food': 'bg-orange-500',
    'Petrol': 'bg-red-500',
    'Loan/EMI': 'bg-amber-600',
    'Credit Card Bill': 'bg-rose-500',
    'Transfer': 'bg-teal-500',
    'Other Expense': 'bg-gray-500',
};

const EXTRA_COLORS = [
    'bg-cyan-500', 'bg-lime-500', 
    'bg-fuchsia-500', 'bg-pink-500', 'bg-violet-500'
];

export const getCategoryColor = (category: Category): string => {
    if (CATEGORY_COLORS[category]) {
        return CATEGORY_COLORS[category];
    }
    // Simple hash function to pick a color for a new category deterministically
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
        hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % EXTRA_COLORS.length);
    return EXTRA_COLORS[index];
};

// New maps and function for Chart.js colors
export const CATEGORY_HEX_COLORS: Record<Category, string> = {
    'Salary': '#22c55e',
    'Other Income': '#4ade80',
    'UPI': '#0ea5e9',
    'Food': '#f97316',
    'Petrol': '#ef4444',
    'Loan/EMI': '#d97706',
    'Credit Card Bill': '#f43f5e',
    'Transfer': '#14b8a6', // Changed from indigo
    'Other Expense': '#6b7280',
};

const EXTRA_HEX_COLORS = [
    '#06b6d4', '#84cc16', 
    '#d946ef', '#ec4899', '#8b5cf6'
];

export const getCategoryHexColor = (category: Category): string => {
    if (CATEGORY_HEX_COLORS[category]) {
        return CATEGORY_HEX_COLORS[category];
    }
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
        hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash % EXTRA_HEX_COLORS.length);
    return EXTRA_HEX_COLORS[index];
};


export const CATEGORY_RULES: CategoryRule[] = [
    { category: 'Salary', keywords: ['salary', 'sal deposit'], type: 'credit' },
    { category: 'Credit Card Bill', keywords: ['credit card', 'cc bill', 'cc payment'], type: 'debit' },
    { category: 'Loan/EMI', keywords: ['emi', 'loan', 'equated monthly'], type: 'debit' },
    { category: 'Petrol', keywords: ['petrol', 'fuel', 'indian oil', 'hpcl', 'bharat petroleum'], type: 'debit' },
    { category: 'Food', keywords: ['zomato', 'swiggy', 'restaurant', 'cafe', 'food', 'dominos', 'pizza hut'], type: 'debit' },
    { category: 'UPI', keywords: ['upi'], type: 'any' },
    { category: 'Transfer', keywords: ['tfr', 'transfer', 'neft', 'rtgs', 'imps'], type: 'any' },
];
