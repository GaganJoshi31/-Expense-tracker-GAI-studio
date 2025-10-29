import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
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
import { LoadingSpinner } from './components/LoadingSpinner';
import type { Transaction, Category, TimeFilter, User, ThemeColor, FileStatus, FileParsingStatus } from './types';
import { parseFiles } from './services/parserService';
import * as dbService from './services/dbService';
import * as authService from './services/authService';
import * as logService from './services/logService';
import { categorizeTransaction } from './services/categorizationService';
import { DEFAULT_CATEGORIES } from './constants';
import { generateAndDownloadCsv } from './utils/csvHelper';

type View = 'dashboard' | 'analysis' | 'tax' | 'admin' | 'profile';
type ThemeMode = 'light' | 'dark';

const getInitialTheme = (): ThemeMode => {
    try {
        const theme = localStorage.getItem('themeMode');
        return theme === 'dark' ? 'dark' : 'light';
    } catch (e) {
        console.error('Could not access localStorage for theme, defaulting to light mode.', e);
        return 'light';
    }
};

const App: React.FC = () => {
    // State Management
    // currentUser: undefined = initial loading, null = logged out, User = logged in
    const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [taxTransactions, setTaxTransactions] = useState<Transaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
    const [status, setStatus] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [fileForPassword, setFileForPassword] = useState<File | null>(null);
    const passwordPromiseControls = useRef<{ resolve: (password: string) => void; reject: (reason?: any) => void } | null>(null);
    
    // UI State
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
    const [themeColor, setThemeColor] = useState<ThemeColor>('teal');
    const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);

    // --- Main Application Effects ---

    // 1. Unified Application Initialization
    useEffect(() => {
        const initializeApp = async () => {
            try {
                const userDetails = authService.getCurrentUserDetails();
                if (!userDetails) {
                    setCurrentUser(null); // No user, proceed to login screen
                    return;
                }
                
                // User is logged in, initialize DB and load all data
                await dbService.initDB();
                logService.logInfo(`User ${userDetails.email} logged in.`);
                
                const [storedTransactions, storedTaxTransactions, customCategories] = await Promise.all([
                    dbService.getAllTransactions(),
                    dbService.getAllTaxTransactions(),
                    dbService.getAllCategories()
                ]);

                // Batch state updates after all data is fetched
                setTransactions(storedTransactions);
                setTaxTransactions(storedTaxTransactions);
                
                const combinedCategories = [...new Set([...DEFAULT_CATEGORIES, ...customCategories])];
                setAllCategories(combinedCategories.sort());
                
                if (userDetails.themeColor) {
                    setThemeColor(userDetails.themeColor);
                }

                // Set user to trigger render of the main application
                setCurrentUser(userDetails);

            } catch (err) {
                logService.logError('Critical error during app initialization.', err);
                setError('A critical error occurred. Please refresh the page.');
                setCurrentUser(null); // Force to login screen on any error
            }
        };

        initializeApp();
    }, []); // Empty dependency array ensures this runs only once on mount.

    // 2. Theme Management
    useEffect(() => {
        document.documentElement.classList.toggle('dark', themeMode === 'dark');
        try {
            localStorage.setItem('themeMode', themeMode);
        } catch (e) {
            logService.logWarning('Could not persist theme setting to localStorage.', e);
        }
    }, [themeMode]);

    // 3. Transaction Filtering Logic
    useEffect(() => {
        let filtered = transactions;

        if (activeFilter !== 'all') {
            const filterDate = new Date();
            filterDate.setMonth(filterDate.getMonth() - (activeFilter as number));
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
            filtered = filtered.filter(t => typeFilter === 'income' ? !!t.credit : !!t.debit);
        }

        setFilteredTransactions([...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }, [transactions, activeFilter, searchText, categoryFilter, typeFilter]);
    

    // --- Data Handling & Business Logic ---

    const loadAllData = useCallback(async () => {
        const [stored, tax, customCategories] = await Promise.all([
            dbService.getAllTransactions(),
            dbService.getAllTaxTransactions(),
            dbService.getAllCategories()
        ]);
        setTransactions(stored);
        setTaxTransactions(tax);
        const combined = [...new Set([...DEFAULT_CATEGORIES, ...customCategories])];
        setAllCategories(combined.sort());
        logService.logInfo('All data reloaded successfully.');
    }, []);
    
    const requestPassword = (file: File): Promise<string> => {
        setFileForPassword(file);
        return new Promise<string>((resolve, reject) => {
            passwordPromiseControls.current = { resolve, reject };
        });
    };

    const processFileUploads = async (files: FileList, storageHandler: (newTransactions: Transaction[]) => Promise<void>) => {
        setFileStatuses(Array.from(files).map(f => ({ name: f.name, status: 'parsing', message: 'Starting...' })));
        setStatus(`Parsing ${files.length} file(s)...`);
        setError('');

        const updateStatusCallback = (fileName: string, status: FileParsingStatus, message: string) => {
            setFileStatuses(prev => prev.map(fs => fs.name === fileName ? { ...fs, status, message } : fs));
        };

        try {
            const { transactions: newTransactions, errors } = await parseFiles(files, requestPassword, updateStatusCallback);

            if (errors.length > 0) {
                logService.logError('File parsing failed for some files.', { errors });
            }

            if (newTransactions.length > 0) {
                await storageHandler(newTransactions);
                await loadAllData();
                setStatus(`Successfully added ${newTransactions.length} new transactions.`);
            } else if (errors.length === 0) {
                setStatus('No new transactions found in the uploaded file(s).');
            } else {
                 setStatus('Completed with some errors.');
            }
        } catch (e: any) {
            setError(e.message || 'File processing failed.');
            logService.logError('File processing failed', e);
        } finally {
            setTimeout(() => {
                setStatus('');
                setError('');
            }, 5000);
        }
    };
    
    const runCategorizationRules = async () => {
        const customRules = await dbService.getCustomRules();
        let changed = false;
        const allCurrentTransactions = await dbService.getAllTransactions();
        const updatedTransactions = allCurrentTransactions.map(t => {
            const originalCategory = t.category;
            const newCategory = categorizeTransaction(t, customRules);
            if (originalCategory !== newCategory) {
                changed = true;
                return { ...t, category: newCategory };
            }
            return t;
        });

        if (changed) {
            await dbService.addTransactions(updatedTransactions); // This will overwrite existing ones
            await loadAllData();
            logService.logInfo('Categorization rules re-applied.');
        }
    };

    // --- Event Handlers ---
    
    const handleAuthSuccess = () => {
        const user = authService.getCurrentUserDetails();
        if (user) {
            setCurrentUser(undefined); // Trigger re-initialization
            // A full reload ensures a clean state, especially for the database service
            window.location.reload();
        } else {
            setError("Authentication failed. Please try again.");
            setCurrentUser(null);
        }
    };

    const handleLogout = () => {
        logService.logInfo(`User ${currentUser?.email} logged out.`);
        authService.logout();
        dbService.closeDB();
        setTransactions([]);
        setTaxTransactions([]);
        setCurrentUser(null);
        setView('dashboard');
    };

    const handleReset = async () => {
        if (window.confirm("Are you sure you want to delete ALL data? This action cannot be undone.")) {
            try {
                await dbService.clearAllData();
                await loadAllData();
                logService.logWarning('All user data has been reset.');
            } catch (e) {
                setError('Failed to reset data.');
                logService.logError('Failed to reset data.', e);
            }
        }
    };

    const handleFileUpload = (files: FileList) => processFileUploads(files, dbService.addTransactions);
    const handleTaxFileUpload = (files: FileList) => processFileUploads(files, dbService.addTaxTransactions);
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
    const handleTransactionUpdate = async (updatedTransaction: Transaction) => {
        await dbService.updateTransaction(updatedTransaction);
        await loadAllData();
    };
    const handleCategoriesUpdate = async () => {
        await loadAllData();
        await runCategorizationRules();
    };
    const handleProfileUpdate = (updatedUser: User) => {
        setCurrentUser(updatedUser);
        if (updatedUser.themeColor) setThemeColor(updatedUser.themeColor);
    };
    const toggleTheme = () => setThemeMode(prev => (prev === 'light' ? 'dark' : 'light'));
    const handleDownloadFilteredCsv = () => generateAndDownloadCsv(filteredTransactions, 'filtered_transactions.csv');
    const handleDownloadAllCsv = () => generateAndDownloadCsv(transactions, 'all_transactions.csv');

    // --- Conditional Rendering ---

    if (currentUser === undefined) {
        return <LoadingSpinner />;
    }

    if (!currentUser) {
        return <Auth onAuthSuccess={handleAuthSuccess} themeColor={themeColor} />;
    }

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-200 font-sans">
            <Header onReset={handleReset} currentView={view} onNavigate={setView} onLogout={handleLogout} isAdmin={currentUser.role === 'admin'} themeMode={themeMode} toggleTheme={toggleTheme} themeColor={themeColor} />
            
            <main className="container mx-auto p-4 md:p-8">
                {isRulesModalOpen && <ManageRulesModal onClose={() => setIsRulesModalOpen(false)} onRulesUpdate={runCategorizationRules} allCategories={allCategories} themeColor={themeColor} />}
                {isCategoriesModalOpen && <ManageCategoriesModal onClose={() => setIsCategoriesModalOpen(false)} onUpdate={handleCategoriesUpdate} themeColor={themeColor} />}
                {isAiModalOpen && <AICategorizationModal onClose={() => setIsAiModalOpen(false)} onUpdate={loadAllData} allCategories={allCategories} themeColor={themeColor} />}
                {fileForPassword && <PasswordModal fileName={fileForPassword.name} onSubmit={handlePasswordSubmit} onClose={handlePasswordCancel} themeColor={themeColor} />}
                
                {view === 'dashboard' && (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                            <div className="lg:col-span-1">
                                <FileUpload onUpload={handleFileUpload} disabled={false} themeColor={themeColor} fileStatuses={fileStatuses} />
                            </div>
                            <div className="lg:col-span-2">
                                {(status) && <StatusMessage message={status} />}
                                {error && <StatusMessage message={error} type="error" />}
                                {transactions.length > 0 && <Dashboard transactions={filteredTransactions} allTransactions={transactions} />}
                            </div>
                        </div>

                        {transactions.length > 0 ? (
                            <>
                                <FilterControls activeFilter={activeFilter} onFilterChange={setActiveFilter} onDownload={handleDownloadFilteredCsv} onDownloadAll={handleDownloadAllCsv} searchText={searchText} onSearchChange={setSearchText} categoryFilter={categoryFilter} onCategoryFilterChange={setCategoryFilter} typeFilter={typeFilter} onTypeFilterChange={setTypeFilter} allCategories={allCategories} themeColor={themeColor} />
                                <TransactionList transactions={filteredTransactions} onTransactionUpdate={handleTransactionUpdate} allCategories={allCategories} themeColor={themeColor} />
                            </>
                        ) : (!status && !error && <Welcome themeColor={themeColor} />)}
                    </>
                )}

                {view === 'analysis' && (transactions.length > 0 ? <Analysis transactions={transactions} themeColor={themeColor} themeMode={themeMode} /> : <Welcome themeColor={themeColor} />)}
                {view === 'tax' && <TaxComputation taxTransactions={taxTransactions} allCategories={allCategories} themeColor={themeColor} onUpload={handleTaxFileUpload} disabled={false} fileStatuses={fileStatuses} />}
                {view === 'admin' && currentUser.role === 'admin' && <Admin onAiCategorize={() => setIsAiModalOpen(true)} onManageRules={() => setIsRulesModalOpen(true)} onManageCategories={() => setIsCategoriesModalOpen(true)} themeColor={themeColor} />}
                {view === 'profile' && <Profile user={currentUser} onUpdate={handleProfileUpdate} themeColor={themeColor} />}
            </main>
        </div>
    );
};

export default App;
