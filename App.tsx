import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
// FIX: Removed FileStatus from this import as it's not exported from FileUpload.
import { FileUpload } from './components/FileUpload';
import { Dashboard } from './components/Dashboard';
import { TransactionList } from './components/TransactionList';
import { PasswordModal } from './components/PasswordModal';
import { FilterControls } from './components/FilterControls';
import { Welcome } from './components/Welcome';
import { StatusMessage } from './components/StatusMessage';
import { ManageRulesModal } from './components/ManageRulesModal';
import { ManageCategoriesModal } from './components/ManageCategoriesModal';
import { Analysis } from './components/Analysis';
import { AICategorizationModal } from './components/AICategorizationModal';
import { Admin } from './components/Admin';
import { Auth } from './components/Auth';
import { TaxComputation } from './components/TaxComputation';
import { Profile } from './components/Profile';
// FIX: Added FileStatus to this import from its correct source.
import type { Transaction, Category, TimeFilter, User, ThemeColor, ParsingResult, FileStatus } from './types';
import { parseFiles } from './services/parserService';
import * as dbService from './services/dbService';
import * as authService from './services/authService';
import * as logService from './services/logService';
import { categorizeTransaction } from './services/categorizationService';
import { DEFAULT_CATEGORIES } from './constants';

declare const Papa: any;

type View = 'dashboard' | 'analysis' | 'tax' | 'admin' | 'profile';
type ThemeMode = 'light' | 'dark';

const getInitialTheme = (): ThemeMode => {
    try {
        return (localStorage.getItem('themeMode') as ThemeMode) || 'light';
    } catch (e) {
        console.error('Could not access localStorage for theme, defaulting to light mode.', e);
        return 'light';
    }
};

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(() => authService.getCurrentUserDetails());
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [taxTransactions, setTaxTransactions] = useState<Transaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [status, setStatus] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [fileForPassword, setFileForPassword] = useState<File | null>(null);
    const passwordPromiseControls = useRef<{ resolve: (password: string) => void; reject: (reason?: any) => void } | null>(null);
    const [activeFilter, setActiveFilter] = useState<TimeFilter>('all');
    const [searchText, setSearchText] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
    const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
    const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
    const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [view, setView] = useState<View>('dashboard');
    const [allCategories, setAllCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
    const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialTheme);
    const [themeColor, setThemeColor] = useState<ThemeColor>(currentUser?.themeColor || 'teal');
    const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);

    /*
    // START: Temporarily disabled for debugging
    useEffect(() => {
        if (currentUser?.themeColor) setThemeColor(currentUser.themeColor);
    }, [currentUser]);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', themeMode === 'dark');
        try {
            localStorage.setItem('themeMode', themeMode);
        } catch (e) {
            logService.logWarning('Could not persist theme setting to localStorage.', e);
        }
    }, [themeMode]);

    const loadCategories = useCallback(async () => {
        const customCategories = await dbService.getAllCategories();
        const combined = [...new Set([...DEFAULT_CATEGORIES, ...customCategories])];
        setAllCategories(combined.sort());
    }, []);

    const loadTransactions = useCallback(async () => {
        setIsLoading(true);
        setStatus('Loading transactions from local database...');
        try {
            const [stored, tax] = await Promise.all([
                dbService.getAllTransactions(),
                dbService.getAllTaxTransactions()
            ]);
            setTransactions(stored);
            setTaxTransactions(tax);
            logService.logInfo('Transactions loaded successfully.');
        } catch (e) {
            setError('Failed to load transactions.');
            logService.logError('Failed to load transactions.', e);
        } finally {
            setIsLoading(false);
            setStatus('');
        }
    }, []);

    const loadDataForCurrentUser = useCallback(async () => {
        if (!authService.getCurrentUser()) return;
        setIsLoading(true);
        setStatus('Loading user data...');
        try {
            await dbService.initDB();
            logService.logInfo(`User ${authService.getCurrentUser()} logged in.`);
            setCurrentUser(authService.getCurrentUserDetails());
            await Promise.all([loadTransactions(), loadCategories()]);
        } catch (e) {
            setError('Failed to load user data.');
            logService.logError('Failed to load user data.', e);
        } finally {
            setIsLoading(false);
            setStatus('');
        }
    }, [loadTransactions, loadCategories]);

    useEffect(() => {
        if (currentUser) {
            loadDataForCurrentUser();
        } else {
            setIsLoading(false);
        }
    }, [currentUser?.email]);

    useEffect(() => {
        let filtered = transactions;

        if (activeFilter !== 'all') {
            const filterDate = new Date();
            filterDate.setMonth(filterDate.getMonth() - activeFilter);
            filtered = filtered.filter(t => new Date(t.date) >= filterDate);
        }
        
        if (searchText.trim()) {
            const lowercasedSearch = searchText.toLowerCase();
            filtered = filtered.filter(t => t.description.toLowerCase().includes(lowercasedSearch));
        }

        if (categoryFilter !== 'all') {
            filtered = filtered.filter(t => t.category === categoryFilter);
        }

        if (typeFilter !== 'all') {
            filtered = filtered.filter(t => typeFilter === 'income' ? t.credit : t.debit);
        }

        setFilteredTransactions([...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }, [transactions, activeFilter, searchText, categoryFilter, typeFilter]);
    // END: Temporarily disabled for debugging
    */
    
    // Dummy handlers to satisfy component props during simplification
    const toggleTheme = () => setThemeMode(prev => (prev === 'light' ? 'dark' : 'light'));
    const handleReset = () => {};
    const handleLogout = () => {
        logService.logInfo(`User ${currentUser?.email} logged out.`);
        authService.logout();
        dbService.closeDB();
        setCurrentUser(null);
    };

    const requestPassword = (file: File): Promise<string> => {
        setFileForPassword(file);
        return new Promise<string>((resolve, reject) => {
            passwordPromiseControls.current = { resolve, reject };
        });
    };
    
    const processFileUploads = async (files: FileList, storageHandler: (newTransactions: Transaction[]) => Promise<void>, postUploadAction: () => Promise<void>) => {
        // Dummy implementation for now
    };

    const handleFileUpload = (files: FileList) => {};
    const handleTaxFileUpload = (files: FileList) => {};

    const handlePasswordSubmit = (password: string) => {
        passwordPromiseControls.current?.resolve(password);
        passwordPromiseControls.current = null;
        setFileForPassword(null);
    };
    
    const handlePasswordCancel = () => {
        passwordPromiseControls.current?.reject(new Error('Password prompt cancelled by user.'));
        passwordPromiseControls.current = null;
        setFileForPassword(null);
    };
    
    const handleTransactionUpdate = async (updatedTransaction: Transaction) => {};
    const runCategorizationRules = async () => {};
    const handleCategoriesUpdate = async () => {};
    const generateAndDownloadCsv = (dataToExport: Transaction[], filename: string) => {};
    const handleDownloadFilteredCsv = () => {};
    const handleDownloadAllCsv = () => {};

    const handleAuthSuccess = () => {
        setCurrentUser(authService.getCurrentUserDetails());
        setView('dashboard');
    };

    const handleProfileUpdate = (updatedUser: User) => {
        setCurrentUser(updatedUser);
        if (updatedUser.themeColor) setThemeColor(updatedUser.themeColor);
    };

    if (!currentUser) {
        return <Auth onAuthSuccess={handleAuthSuccess} themeColor={themeColor} />;
    }
    
    // START: Temporarily simplified render for debugging
    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-200 p-8">
            <h1 className="text-2xl font-bold">App Has Rendered</h1>
            <p>Logged in as: {currentUser.email}</p>
            <p>This is a simplified view to isolate a potential crash in a child component or useEffect hook.</p>
            <button onClick={handleLogout} className="mt-4 bg-red-500 text-white font-bold py-2 px-4 rounded">Logout</button>
        </div>
    );
    // END: Temporarily simplified render for debugging

    /*
    // Original Render Tree - Temporarily commented out
    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-200 font-sans">
            <Header onReset={handleReset} currentView={view} onNavigate={setView} onLogout={handleLogout} isAdmin={currentUser.role === 'admin'} themeMode={themeMode} toggleTheme={toggleTheme} themeColor={themeColor} />
            <main className="container mx-auto p-4 md:p-8">
                {isRulesModalOpen && <ManageRulesModal onClose={() => setIsRulesModalOpen(false)} onRulesUpdate={runCategorizationRules} allCategories={allCategories} themeColor={themeColor} />}
                {isCategoriesModalOpen && <ManageCategoriesModal onClose={() => setIsCategoriesModalOpen(false)} onUpdate={handleCategoriesUpdate} themeColor={themeColor} />}
                {isAiModalOpen && <AICategorizationModal onClose={() => setIsAiModalOpen(false)} onUpdate={loadTransactions} allCategories={allCategories} themeColor={themeColor} />}
                {fileForPassword && <PasswordModal fileName={fileForPassword.name} onSubmit={handlePasswordSubmit} onClose={handlePasswordCancel} themeColor={themeColor} />}
                
                {view === 'dashboard' && (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                            <div className="lg:col-span-1">
                                <FileUpload onUpload={handleFileUpload} disabled={isLoading} themeColor={themeColor} fileStatuses={fileStatuses} />
                            </div>
                            <div className="lg:col-span-2">
                                {(isLoading || status) && <StatusMessage message={status || 'Loading...'} />}
                                {error && <StatusMessage message={error} type="error" />}
                                {!isLoading && transactions.length > 0 && <Dashboard transactions={filteredTransactions} allTransactions={transactions} />}
                            </div>
                        </div>

                        {transactions.length > 0 ? (
                            <>
                                <FilterControls activeFilter={activeFilter} onFilterChange={setActiveFilter} onDownload={handleDownloadFilteredCsv} onDownloadAll={handleDownloadAllCsv} searchText={searchText} onSearchChange={setSearchText} categoryFilter={categoryFilter} onCategoryFilterChange={setCategoryFilter} typeFilter={typeFilter} onTypeFilterChange={setTypeFilter} allCategories={allCategories} themeColor={themeColor} />
                                <TransactionList transactions={filteredTransactions} onTransactionUpdate={handleTransactionUpdate} allCategories={allCategories} themeColor={themeColor} />
                            </>
                        ) : (!isLoading && !status && !error && <Welcome themeColor={themeColor} />)}
                    </>
                )}

                {view === 'analysis' && (transactions.length > 0 ? <Analysis transactions={transactions} themeColor={themeColor} themeMode={themeMode} /> : (!isLoading && <Welcome themeColor={themeColor} />))}
                {view === 'tax' && <TaxComputation taxTransactions={taxTransactions} allCategories={allCategories} themeColor={themeColor} onUpload={handleTaxFileUpload} disabled={isLoading} fileStatuses={fileStatuses} setFileStatuses={setFileStatuses} />}
                {view === 'admin' && currentUser.role === 'admin' && <Admin onAiCategorize={() => setIsAiModalOpen(true)} onManageRules={() => setIsRulesModalOpen(true)} onManageCategories={() => setIsCategoriesModalOpen(true)} themeColor={themeColor} />}
                {view === 'profile' && <Profile user={currentUser} onUpdate={handleProfileUpdate} themeColor={themeColor} />}
            </main>
        </div>
    );
    */
};

export default App;
