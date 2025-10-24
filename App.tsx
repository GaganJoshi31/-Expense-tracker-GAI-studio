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
import type { Transaction, Category, TimeFilter, User, ThemeColor } from './types';
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
    const passwordPromiseControls = useRef<{
        resolve: (password: string) => void;
        reject: (reason?: any) => void;
    } | null>(null);
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
    
    useEffect(() => {
        if (currentUser?.themeColor) {
            setThemeColor(currentUser.themeColor);
        }
    }, [currentUser]);

    useEffect(() => {
        if (themeMode === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('themeMode', themeMode);
    }, [themeMode]);

    const toggleTheme = () => {
        setThemeMode(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    };

    const loadCategories = useCallback(async () => {
        const customCategories = await dbService.getAllCategories();
        const combined = new Set([...DEFAULT_CATEGORIES, ...customCategories]);
        setAllCategories(Array.from(combined).sort());
    }, []);

    const loadTransactions = useCallback(async () => {
        setIsLoading(true);
        setStatus('Loading transactions from local database...');
        try {
            const storedTransactions = await dbService.getAllTransactions();
            const storedTaxTransactions = await dbService.getAllTaxTransactions();
            setTransactions(storedTransactions);
            setTaxTransactions(storedTaxTransactions);
            logService.logInfo('Transactions loaded successfully.');
        } catch (e) {
            setError('Failed to load transactions.');
            console.error(e);
            logService.logError('Failed to load transactions.', e);
        }
        setIsLoading(false);
        setStatus('');
    }, []);
    
    const loadDataForCurrentUser = useCallback(async () => {
        if (!authService.getCurrentUser()) return;
        setIsLoading(true);
        setStatus('Loading user data...');
        try {
             await dbService.initDB();
             await logService.logInfo(`User ${authService.getCurrentUser()} logged in.`);
             setCurrentUser(authService.getCurrentUserDetails());
             await loadTransactions();
             await loadCategories();
        } catch (e) {
            setError('Failed to load user data.');
            console.error(e);
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
    }, [currentUser?.email, loadDataForCurrentUser]); // Depend on email to trigger reload on user switch

    useEffect(() => {
        let newFilteredTransactions = [...transactions];

        // 1. Time filter
        if (activeFilter !== 'all') {
            const now = new Date();
            const filterDate = new Date();
            filterDate.setMonth(now.getMonth() - activeFilter);

            newFilteredTransactions = newFilteredTransactions.filter(
                t => new Date(t.date) >= filterDate
            );
        }
        
        // 2. Search text filter
        if (searchText.trim() !== '') {
            newFilteredTransactions = newFilteredTransactions.filter(t =>
                t.description.toLowerCase().includes(searchText.toLowerCase())
            );
        }

        // 3. Category filter
        if (categoryFilter !== 'all') {
            newFilteredTransactions = newFilteredTransactions.filter(t =>
                t.category === categoryFilter
            );
        }

        // 4. Transaction type filter
        if (typeFilter === 'income') {
            newFilteredTransactions = newFilteredTransactions.filter(t => t.credit !== null && t.credit > 0);
        } else if (typeFilter === 'expense') {
            newFilteredTransactions = newFilteredTransactions.filter(t => t.debit !== null && t.debit > 0);
        }


        newFilteredTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setFilteredTransactions(newFilteredTransactions);
    }, [transactions, activeFilter, searchText, categoryFilter, typeFilter]);

    const requestPassword = (file: File): Promise<string> => {
        setFileForPassword(file);
        return new Promise<string>((resolve, reject) => {
            passwordPromiseControls.current = { resolve, reject };
        });
    };
    
    const genericFileUploadHandler = async (files: FileList, storageHandler: (newTransactions: Transaction[]) => Promise<void>, postUploadAction: () => Promise<void>) => {
        setIsLoading(true);
        setError('');
        setStatus(`Parsing ${files.length} file(s)...`);
        logService.logInfo(`Starting upload of ${files.length} file(s).`);
        try {
            const newTransactions = await parseFiles(files, requestPassword);
            if (newTransactions.length > 0) {
                 await storageHandler(newTransactions);
                 setStatus(`Successfully added ${newTransactions.length} new transactions.`);
                 logService.logInfo(`Added ${newTransactions.length} new transactions.`);
                 await postUploadAction();
            } else {
                setError('No new transactions could be parsed from the selected file(s). Please check the file format and content.');
                logService.logWarning('Upload completed, but no new transactions were parsed.');
            }
        } catch (e: any) {
            setError(e.message);
            console.error(e);
            logService.logError('File upload/parsing failed.', e.message);
        } finally {
            setIsLoading(false);
            setTimeout(() => {
                setStatus('');
                setError('');
            }, 5000);
        }
    };


    const handleFileUpload = async (files: FileList) => {
        await genericFileUploadHandler(files, dbService.addTransactions, loadTransactions);
    };
    
    const handleTaxFileUpload = async (files: FileList) => {
        await genericFileUploadHandler(files, dbService.addTaxTransactions, loadTransactions);
    };

    const handlePasswordSubmit = (password: string) => {
        if (passwordPromiseControls.current) {
            passwordPromiseControls.current.resolve(password);
            passwordPromiseControls.current = null;
            setFileForPassword(null);
        }
    };
    
    const handlePasswordCancel = () => {
        if (passwordPromiseControls.current) {
            passwordPromiseControls.current.reject(new Error('Password prompt cancelled by user.'));
            passwordPromiseControls.current = null;
            setFileForPassword(null);
        }
    };
    
    const handleTransactionUpdate = async (updatedTransaction: Transaction) => {
        try {
            await dbService.updateTransaction(updatedTransaction);
            setTransactions(prev => 
                prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t)
            );
            logService.logInfo(`Transaction ${updatedTransaction.id} updated.`);
        } catch (e) {
            setError('Failed to update transaction.');
            console.error(e);
            logService.logError('Transaction update failed.', e);
        }
    };

    const handleRulesUpdate = async () => {
        setIsLoading(true);
        setStatus('Re-categorizing transactions based on new rules...');
        logService.logInfo('Starting re-categorization based on rule updates.');

        try {
            const allTransactions = await dbService.getAllTransactions();
            const customRules = await dbService.getCustomRules();

            const updatePromises = allTransactions.map(async (t) => {
                const uncategorizedT = {
                    date: t.date,
                    description: t.description,
                    debit: t.debit,
                    credit: t.credit,
                };
                const newCategory = categorizeTransaction(uncategorizedT, customRules);
                if (t.category !== newCategory) {
                    return dbService.updateTransactionCategory(t.id, newCategory);
                }
                return Promise.resolve();
            });

            await Promise.all(updatePromises);
            logService.logInfo('Re-categorization complete.');
        } catch (e) {
            setError('Failed to re-categorize transactions.');
            console.error(e);
            logService.logError('Re-categorization failed.', e);
        } finally {
            await loadTransactions();
        }
    };
    
    const handleCategoriesUpdate = async () => {
        await loadCategories();
        await handleRulesUpdate(); // Re-run categorization in case a deleted category was in use
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
                console.error(e);
                logService.logError('Data reset failed.', e);
            }
            setIsLoading(false);
            setStatus('');
        }
    };

    const generateAndDownloadCsv = (dataToExport: Transaction[], filename: string) => {
        if (dataToExport.length === 0) {
            alert("No transactions to download.");
            return;
        }

        const headers = ['ID', 'Date', 'Description', 'Debit', 'Credit', 'Category', 'Source File'];
        const data = dataToExport.map(t => ({
            'ID': t.id,
            'Date': t.date,
            'Description': t.description,
            'Debit': t.debit ?? '',
            'Credit': t.credit ?? '',
            'Category': t.category,
            'Source File': t.sourceFile
        }));

        const csv = Papa.unparse(data, { columns: headers });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleDownloadFilteredCsv = () => {
        const date = new Date().toISOString().split('T')[0];
        generateAndDownloadCsv(filteredTransactions, `transactions-filtered-${date}.csv`);
    };
    
    const handleDownloadAllCsv = () => {
        const date = new Date().toISOString().split('T')[0];
        generateAndDownloadCsv(transactions, `transactions-all-${date}.csv`);
    };

    const handleAuthSuccess = () => {
        setCurrentUser(authService.getCurrentUserDetails());
        setView('dashboard');
    };

    const handleLogout = () => {
        logService.logInfo(`User ${currentUser?.email} logged out.`);
        authService.logout();
        dbService.closeDB();
        setCurrentUser(null);
        // Reset all data states
        setTransactions([]);
        setFilteredTransactions([]);
        setTaxTransactions([]);
        setAllCategories(DEFAULT_CATEGORIES);
        // Reset filters
        setActiveFilter('all');
        setSearchText('');
        setCategoryFilter('all');
        setTypeFilter('all');
        setView('dashboard');
    };

    const handleProfileUpdate = (updatedUser: User) => {
        setCurrentUser(updatedUser);
        if (updatedUser.themeColor) {
            setThemeColor(updatedUser.themeColor);
        }
    };

    if (!currentUser) {
        return <Auth onAuthSuccess={handleAuthSuccess} themeColor={themeColor} />;
    }
    
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-200 font-sans">
            <Header 
                onReset={handleReset} 
                currentView={view}
                onNavigate={setView}
                onLogout={handleLogout}
                isAdmin={currentUser.role === 'admin'}
                themeMode={themeMode}
                toggleTheme={toggleTheme}
                themeColor={themeColor}
             />
            <main className="container mx-auto p-4 md:p-8">
                {isRulesModalOpen && (
                    <ManageRulesModal 
                        onClose={() => setIsRulesModalOpen(false)} 
                        onRulesUpdate={handleRulesUpdate}
                        allCategories={allCategories}
                        themeColor={themeColor}
                    />
                )}
                {isCategoriesModalOpen && (
                    <ManageCategoriesModal
                        onClose={() => setIsCategoriesModalOpen(false)}
                        onUpdate={handleCategoriesUpdate}
                        themeColor={themeColor}
                    />
                )}
                {isAiModalOpen && (
                    <AICategorizationModal
                        onClose={() => setIsAiModalOpen(false)}
                        onUpdate={loadTransactions}
                        allCategories={allCategories}
                        themeColor={themeColor}
                    />
                )}
                {fileForPassword && (
                    <PasswordModal
                        fileName={fileForPassword.name}
                        onSubmit={handlePasswordSubmit}
                        onClose={handlePasswordCancel}
                        themeColor={themeColor}
                    />
                )}
                
                {view === 'dashboard' && (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                            <div className="lg:col-span-1">
                                <FileUpload onUpload={handleFileUpload} disabled={isLoading} themeColor={themeColor} />
                            </div>
                            <div className="lg:col-span-2">
                                {(isLoading || status) && <StatusMessage message={status || 'Loading...'} />}
                                {error && <StatusMessage message={error} type="error" />}
                                {!isLoading && transactions.length > 0 && <Dashboard transactions={filteredTransactions} />}
                            </div>
                        </div>

                        {transactions.length > 0 ? (
                            <>
                                <FilterControls 
                                    activeFilter={activeFilter} 
                                    onFilterChange={setActiveFilter}
                                    onDownload={handleDownloadFilteredCsv}
                                    onDownloadAll={handleDownloadAllCsv}
                                    searchText={searchText}
                                    onSearchChange={setSearchText}
                                    categoryFilter={categoryFilter}
                                    onCategoryFilterChange={setCategoryFilter}
                                    typeFilter={typeFilter}
                                    onTypeFilterChange={setTypeFilter}
                                    allCategories={allCategories}
                                    themeColor={themeColor}
                                />
                                <TransactionList
                                    transactions={filteredTransactions}
                                    onTransactionUpdate={handleTransactionUpdate}
                                    allCategories={allCategories}
                                    themeColor={themeColor}
                                />
                            </>
                        ) : (
                            !isLoading && !status && !error && <Welcome themeColor={themeColor} />
                        )}
                    </>
                )}

                {view === 'analysis' && (
                     transactions.length > 0 ? (
                        <Analysis transactions={transactions} themeColor={themeColor} themeMode={themeMode} />
                     ) : (
                         !isLoading && <Welcome themeColor={themeColor} />
                     )
                )}

                {view === 'tax' && (
                    <TaxComputation 
                        taxTransactions={taxTransactions} 
                        allCategories={allCategories} 
                        themeColor={themeColor}
                        onUpload={handleTaxFileUpload}
                        disabled={isLoading} 
                    />
                )}

                {view === 'admin' && currentUser.role === 'admin' && (
                    <Admin
                        onAiCategorize={() => setIsAiModalOpen(true)}
                        onManageRules={() => setIsRulesModalOpen(true)}
                        onManageCategories={() => setIsCategoriesModalOpen(true)}
                        themeColor={themeColor}
                    />
                )}

                {view === 'profile' && (
                    <Profile 
                        user={currentUser}
                        onUpdate={handleProfileUpdate}
                        themeColor={themeColor}
                    />
                )}

            </main>
        </div>
    );
};

export default App;