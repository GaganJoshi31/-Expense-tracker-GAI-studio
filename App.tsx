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
    const [themeMode, setThemeMode] = useState<ThemeMode>(() => (localStorage.getItem('themeMode') as ThemeMode) || 'light');
    const [themeColor, setThemeColor] = useState<ThemeColor>(currentUser?.themeColor || 'teal');
    const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);

    useEffect(() => {
        if (currentUser?.themeColor) setThemeColor(currentUser.themeColor);
    }, [currentUser]);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', themeMode === 'dark');
        localStorage.setItem('themeMode', themeMode);
    }, [themeMode]);

    const toggleTheme = () => setThemeMode(prev => (prev === 'light' ? 'dark' : 'light'));

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

    const requestPassword = (file: File): Promise<string> => {
        setFileForPassword(file);
        return new Promise<string>((resolve, reject) => {
            passwordPromiseControls.current = { resolve, reject };
        });
    };
    
    const processFileUploads = async (files: FileList, storageHandler: (newTransactions: Transaction[]) => Promise<void>, postUploadAction: () => Promise<void>) => {
        setIsLoading(true);
        setError('');
        setStatus(`Parsing ${files.length} file(s)...`);
        logService.logInfo(`Starting upload of ${files.length} file(s).`);
        
        const initialStatuses = Array.from(files).map(file => ({ name: file.name, status: 'parsing', message: 'Parsing...' } as FileStatus));
        setFileStatuses(initialStatuses);
        
        try {
            const results: ParsingResult = await parseFiles(files, requestPassword, (fileName, status, message) => {
                setFileStatuses(prev => prev.map(fs => fs.name === fileName ? { ...fs, status, message } : fs));
            });
            
            if (results.transactions.length > 0) {
                 await storageHandler(results.transactions);
                 setStatus(`Successfully added ${results.transactions.length} new transactions.`);
                 logService.logInfo(`Added ${results.transactions.length} new transactions.`);
                 await postUploadAction();
            } else {
                 setStatus('Processing complete. No new transactions were added.');
            }
            if(results.errors.length > 0){
                setError( `Completed with ${results.errors.length} error(s). Please review file statuses.`);
                results.errors.forEach(err => logService.logError(err.fileName, err.error));
            }

        } catch (e: any) {
            setError(e.message);
            logService.logError('File upload/parsing failed.', e.message);
        } finally {
            setIsLoading(false);
            setTimeout(() => {
                setStatus('');
                setError('');
            }, 8000);
        }
    };

    const handleFileUpload = (files: FileList) => processFileUploads(files, dbService.addTransactions, loadTransactions);
    const handleTaxFileUpload = (files: FileList) => processFileUploads(files, dbService.addTaxTransactions, loadTransactions);

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
        try {
            await dbService.updateTransaction(updatedTransaction);
            setTransactions(prev => prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t));
            logService.logInfo(`Transaction ${updatedTransaction.id} updated.`);
        } catch (e) {
            setError('Failed to update transaction.');
            logService.logError('Transaction update failed.', e);
        }
    };

    const runCategorizationRules = async () => {
        setIsLoading(true);
        setStatus('Re-categorizing transactions based on new rules...');
        logService.logInfo('Starting re-categorization based on rule updates.');
        try {
            const allTrx = await dbService.getAllTransactions();
            const rules = await dbService.getCustomRules();
            const updates = allTrx.map(t => {
                const newCategory = categorizeTransaction(t, rules);
                if (t.category !== newCategory) {
                    return dbService.updateTransactionCategory(t.id, newCategory);
                }
                return Promise.resolve(null);
            }).filter(p => p !== null);

            await Promise.all(updates);
            logService.logInfo('Re-categorization complete.');
        } catch (e) {
            setError('Failed to re-categorize transactions.');
            logService.logError('Re-categorization failed.', e);
        } finally {
            await loadTransactions();
        }
    };
    
    const handleCategoriesUpdate = async () => {
        await loadCategories();
        await runCategorizationRules();
    };

    const handleReset = async () => {
        if (window.confirm('Are you sure you want to delete all data for this user? This action cannot be undone.')) {
            setIsLoading(true);
            setStatus('Deleting all data...');
            logService.logWarning('User initiated data reset.');
            try {
                await dbService.clearAllData();
                setTransactions([]);
                setTaxTransactions([]);
                setAllCategories(DEFAULT_CATEGORIES);
                logService.logWarning('All user data has been deleted.');
            } catch(e) {
                setError('Failed to reset data.');
                logService.logError('Data reset failed.', e);
            } finally {
                setIsLoading(false);
                setStatus('');
            }
        }
    };
    
    const generateAndDownloadCsv = (dataToExport: Transaction[], filename: string) => {
        if (dataToExport.length === 0) return alert("No transactions to download.");
        const csv = Papa.unparse(dataToExport, { columns: ['id', 'date', 'description', 'debit', 'credit', 'category', 'sourceFile'] });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    };

    const handleDownloadFilteredCsv = () => generateAndDownloadCsv(filteredTransactions, `transactions-filtered-${new Date().toISOString().split('T')[0]}.csv`);
    const handleDownloadAllCsv = () => generateAndDownloadCsv(transactions, `transactions-all-${new Date().toISOString().split('T')[0]}.csv`);

    const handleAuthSuccess = () => {
        setCurrentUser(authService.getCurrentUserDetails());
        setView('dashboard');
    };

    const handleLogout = () => {
        logService.logInfo(`User ${currentUser?.email} logged out.`);
        authService.logout();
        dbService.closeDB();
        setCurrentUser(null);
        setTransactions([]);
        setFilteredTransactions([]);
        setTaxTransactions([]);
        setAllCategories(DEFAULT_CATEGORIES);
        setActiveFilter('all');
        setSearchText('');
        setCategoryFilter('all');
        setTypeFilter('all');
        setView('dashboard');
    };

    const handleProfileUpdate = (updatedUser: User) => {
        setCurrentUser(updatedUser);
        if (updatedUser.themeColor) setThemeColor(updatedUser.themeColor);
    };

    if (!currentUser) {
        return <Auth onAuthSuccess={handleAuthSuccess} themeColor={themeColor} />;
    }
    
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
};

export default App;