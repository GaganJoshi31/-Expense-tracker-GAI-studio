export type Category = string;

export interface Transaction {
    id: string;
    date: string;
    description: string;
    debit: number | null;
    credit: number | null;
    category: Category;
    sourceFile: string;
}

export type UncategorizedTransaction = Omit<Transaction, 'id' | 'category' | 'sourceFile'>;

export interface CategoryRule {
    category: Category;
    keywords: string[];
    type: 'debit' | 'credit' | 'any';
}

export interface CustomRule {
    description: string;
    category: Category;
    source: 'manual' | 'ai_suggestion';
}

export type TimeFilter = 'all' | 1 | 3 | 6 | 12; // 1 month, 3 months, etc.

export type ThemeColor = 'teal' | 'indigo' | 'rose';

export interface User {
    email: string;
    firstName: string;
    lastName: string;
    gender: string;
    purpose:string;
    role: 'user' | 'admin';
    phone?: string;
    themeColor?: ThemeColor;
}

export type LogLevel = 'INFO' | 'WARNING' | 'ERROR';

export interface LogEntry {
    id: number;
    timestamp: string;
    level: LogLevel;
    message: string;
    details?: any;
}

// Types for the enhanced file parser
export type FileParsingStatus = 'parsing' | 'password' | 'success' | 'error';

export interface FileStatus {
    name: string;
    status: FileParsingStatus;
    message: string;
}

export interface ParsingError {
    fileName: string;
    error: string;
}

export interface ParsingResult {
    transactions: Transaction[];
    errors: ParsingError[];
}

export type UpdateFileStatusCallback = (fileName: string, status: FileParsingStatus, message: string) => void;

export interface CategorizationSuggestion {
    id: string;
    suggestedCategory: Category;
    reasoning: string;
}