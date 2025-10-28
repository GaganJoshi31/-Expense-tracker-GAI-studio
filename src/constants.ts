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

export const THEME_CONFIG: Record<ThemeColor, Record<string, string>> = {
    teal: {
        bg50: 'bg-teal-50',
        bg500: 'bg-teal-500',
        bg600: 'bg-teal-600',
        hoverBg600: 'hover:bg-teal-600',
        hoverBg700: 'hover:bg-teal-700',
        text400: 'text-teal-400',
        darkText400: 'dark:text-teal-400',
        text500: 'text-teal-500',
        text600: 'text-teal-600',
        border500: 'border-teal-500',
        hoverBorder400: 'hover:border-teal-400',
        focusRing500: 'focus:ring-teal-500',
        focusBorder500: 'focus:border-teal-500',
        formRadio: 'text-teal-600',
        formCheckbox: 'text-teal-600',
    },
    indigo: {
        bg50: 'bg-indigo-50',
        bg500: 'bg-indigo-500',
        bg600: 'bg-indigo-600',
        hoverBg600: 'hover:bg-indigo-600',
        hoverBg700: 'hover:bg-indigo-700',
        text400: 'text-indigo-400',
        darkText400: 'dark:text-indigo-400',
        text500: 'text-indigo-500',
        text600: 'text-indigo-600',
        border500: 'border-indigo-500',
        hoverBorder400: 'hover:border-indigo-400',
        focusRing500: 'focus:ring-indigo-500',
        focusBorder500: 'focus:border-indigo-500',
        formRadio: 'text-indigo-600',
        formCheckbox: 'text-indigo-600',
    },
    rose: {
        bg50: 'bg-rose-50',
        bg500: 'bg-rose-500',
        bg600: 'bg-rose-600',
        hoverBg600: 'hover:bg-rose-600',
        hoverBg700: 'hover:bg-rose-700',
        text400: 'text-rose-400',
        darkText400: 'dark:text-rose-400',
        text500: 'text-rose-500',
        text600: 'text-rose-600',
        border500: 'border-rose-500',
        hoverBorder400: 'hover:border-rose-400',
        focusRing500: 'focus:ring-rose-500',
        focusBorder500: 'focus:border-rose-500',
        formRadio: 'text-rose-600',
        formCheckbox: 'text-rose-600',
    }
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