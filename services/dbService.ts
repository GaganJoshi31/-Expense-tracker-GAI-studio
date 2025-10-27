import type { Transaction, CustomRule, Category, LogEntry } from '../types';
import { getCurrentUser } from './authService';

const DB_VERSION = 6; // Incremented to add indexes
const TRANSACTIONS_STORE = 'transactions';
const TAX_TRANSACTIONS_STORE = 'tax_transactions';
const CUSTOM_RULES_STORE = 'customRules';
const CATEGORIES_STORE = 'categories';
const LOGS_STORE = 'logs';

let db: IDBDatabase | null = null;
let currentDbName: string | null = null;

export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            return reject('No user is logged in.');
        }

        const dbName = `IntelligentExpenseTrackerDB_${currentUser}`;

        if (db && currentDbName === dbName) {
            return resolve(db);
        }

        if (db) {
            db.close();
            db = null;
        }

        currentDbName = dbName;
        const request = indexedDB.open(dbName, DB_VERSION);

        request.onerror = () => {
            console.error('Database error:', request.error);
            reject('Error opening database');
        };

        request.onsuccess = (event) => {
            db = (event.target as IDBOpenDBRequest).result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const tempDb = (event.target as IDBOpenDBRequest).result;
            
            // FIX: Refactored createStore to accept an options object for more flexibility (e.g., autoIncrement).
            const createStore = (storeName: string, options: IDBObjectStoreParameters, indexes?: { name: string, keyPath: string, options?: IDBIndexParameters }[]) => {
                if (!tempDb.objectStoreNames.contains(storeName)) {
                    const store = tempDb.createObjectStore(storeName, options);
                    indexes?.forEach(idx => store.createIndex(idx.name, idx.keyPath, idx.options));
                }
            };
            
            // FIX: Updated calls to use the new options object format.
            createStore(TRANSACTIONS_STORE, { keyPath: 'id' }, [
                { name: 'date', keyPath: 'date' },
                { name: 'category', keyPath: 'category' }
            ]);
            createStore(TAX_TRANSACTIONS_STORE, { keyPath: 'id' });
            createStore(CUSTOM_RULES_STORE, { keyPath: 'description' });
            createStore(CATEGORIES_STORE, { keyPath: 'name' });
            // FIX: Correctly create the logs store with auto-incrementing IDs.
            createStore(LOGS_STORE, { keyPath: 'id', autoIncrement: true });
        };
    });
};

export const closeDB = (): void => {
    if (db) {
        db.close();
        db = null;
        currentDbName = null;
    }
};

const genericAddTransactions = async (storeName: string, transactions: Transaction[]): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    for (const transaction of transactions) {
        store.put(transaction);
    }

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

const genericGetAllTransactions = async (storeName: string): Promise<Transaction[]> => {
    const db = await initDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as Transaction[]);
        request.onerror = () => reject(request.error);
    });
};

export const addTransactions = (transactions: Transaction[]): Promise<void> => {
    return genericAddTransactions(TRANSACTIONS_STORE, transactions);
};

export const getAllTransactions = (): Promise<Transaction[]> => {
    return genericGetAllTransactions(TRANSACTIONS_STORE);
};

export const addTaxTransactions = (transactions: Transaction[]): Promise<void> => {
    return genericAddTransactions(TAX_TRANSACTIONS_STORE, transactions);
};

export const getAllTaxTransactions = (): Promise<Transaction[]> => {
    return genericGetAllTransactions(TAX_TRANSACTIONS_STORE);
};

export const updateTransaction = async (transaction: Transaction): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction(TRANSACTIONS_STORE, 'readwrite');
    const store = tx.objectStore(TRANSACTIONS_STORE);
    store.put(transaction);

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const updateTransactionCategory = async (transactionId: string, newCategory: Category): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction(TRANSACTIONS_STORE, 'readwrite');
    const store = tx.objectStore(TRANSACTIONS_STORE);
    const request = store.get(transactionId);

    return new Promise((resolve, reject) => {
        request.onsuccess = () => {
            const transaction = request.result;
            if (transaction) {
                transaction.category = newCategory;
                const updateRequest = store.put(transaction);
                updateRequest.onsuccess = () => resolve();
                updateRequest.onerror = () => reject(updateRequest.error);
            } else {
                reject('Transaction not found');
            }
        };
        request.onerror = () => reject(request.error);
    });
};

export const setCustomRule = async (rule: CustomRule): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction(CUSTOM_RULES_STORE, 'readwrite');
    const store = tx.objectStore(CUSTOM_RULES_STORE);
    store.put(rule);

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const getCustomRules = async (): Promise<CustomRule[]> => {
    const db = await initDB();
    const tx = db.transaction(CUSTOM_RULES_STORE, 'readonly');
    const store = tx.objectStore(CUSTOM_RULES_STORE);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as CustomRule[]);
        request.onerror = () => reject(request.error);
    });
};

export const deleteCustomRule = async (description: string): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction(CUSTOM_RULES_STORE, 'readwrite');
    const store = tx.objectStore(CUSTOM_RULES_STORE);
    store.delete(description);

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const addCategory = async (categoryName: string): Promise<void> => {
    const db = await initDB();
    const tx = db.transaction(CATEGORIES_STORE, 'readwrite');
    const store = tx.objectStore(CATEGORIES_STORE);
    store.put({ name: categoryName });

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const getAllCategories = async (): Promise<Category[]> => {
    const db = await initDB();
    const tx = db.transaction(CATEGORIES_STORE, 'readonly');
    const store = tx.objectStore(CATEGORIES_STORE);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve((request.result as {name: string}[]).map(c => c.name));
        request.onerror = () => reject(request.error);
    });
};

export const updateCategory = async (oldName: string, newName: string): Promise<void> => {
    const db = await initDB();
    
    // 1. Update transactions
    const allTransactions = await getAllTransactions();
    const transactionsToUpdate = allTransactions.filter(t => t.category === oldName);
    if (transactionsToUpdate.length > 0) {
        const tx = db.transaction(TRANSACTIONS_STORE, 'readwrite');
        const store = tx.objectStore(TRANSACTIONS_STORE);
        for (const t of transactionsToUpdate) {
            store.put({ ...t, category: newName });
        }
        await new Promise<void>(resolve => tx.oncomplete = () => resolve());
    }

    // 2. Update rules
    const allRules = await getCustomRules();
    const rulesToUpdate = allRules.filter(r => r.category === oldName);
    if (rulesToUpdate.length > 0) {
        const tx = db.transaction(CUSTOM_RULES_STORE, 'readwrite');
        const store = tx.objectStore(CUSTOM_RULES_STORE);
        for (const r of rulesToUpdate) {
            store.put({ ...r, category: newName });
        }
        await new Promise<void>(resolve => tx.oncomplete = () => resolve());
    }

    // 3. Update category name itself
    const tx = db.transaction(CATEGORIES_STORE, 'readwrite');
    const store = tx.objectStore(CATEGORIES_STORE);
    store.delete(oldName);
    store.put({ name: newName });
    await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const deleteCategory = async (categoryName: string): Promise<void> => {
    const db = await initDB();
    const defaultCategory = 'Other Expense';

    // 1. Update transactions using this category
    const allTransactions = await getAllTransactions();
    const transactionsToUpdate = allTransactions.filter(t => t.category === categoryName);
    if (transactionsToUpdate.length > 0) {
        const tx = db.transaction(TRANSACTIONS_STORE, 'readwrite');
        const store = tx.objectStore(TRANSACTIONS_STORE);
        for (const t of transactionsToUpdate) {
            store.put({ ...t, category: defaultCategory });
        }
        await new Promise<void>(resolve => tx.oncomplete = () => resolve());
    }

    // 2. Delete rules that point to this category
    const allRules = await getCustomRules();
    const rulesToDelete = allRules.filter(r => r.category === categoryName);
    if (rulesToDelete.length > 0) {
        const tx = db.transaction(CUSTOM_RULES_STORE, 'readwrite');
        const store = tx.objectStore(CUSTOM_RULES_STORE);
        for (const r of rulesToDelete) {
            store.delete(r.description);
        }
        await new Promise<void>(resolve => tx.oncomplete = () => resolve());
    }

    // 3. Delete category name
    const tx = db.transaction(CATEGORIES_STORE, 'readwrite');
    tx.objectStore(CATEGORIES_STORE).delete(categoryName);
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const addLog = async (log: Omit<LogEntry, 'id'>): Promise<void> => {
    try {
        const db = await initDB();
        const tx = db.transaction(LOGS_STORE, 'readwrite');
        const store = tx.objectStore(LOGS_STORE);
        store.add(log);
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (error) {
        console.error("Failed to write log to DB:", error);
    }
};

export const getLogs = async (): Promise<LogEntry[]> => {
    const db = await initDB();
    const tx = db.transaction(LOGS_STORE, 'readonly');
    const store = tx.objectStore(LOGS_STORE);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result as LogEntry[]);
        request.onerror = () => reject(request.error);
    });
};

export const clearAllData = async (): Promise<void> => {
    const db = await initDB();
    const stores = [TRANSACTIONS_STORE, TAX_TRANSACTIONS_STORE, CUSTOM_RULES_STORE, CATEGORIES_STORE, LOGS_STORE];
    const tx = db.transaction(stores, 'readwrite');
    
    for(const storeName of stores) {
        if(db.objectStoreNames.contains(storeName)) {
           tx.objectStore(storeName).clear();
        }
    }

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};