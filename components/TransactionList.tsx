import React, { useState, useMemo } from 'react';
import type { Transaction, Category, ThemeColor } from '../types';
import { getCategoryColor } from '../constants';

interface TransactionListProps {
    transactions: Transaction[];
    onTransactionUpdate: (transaction: Transaction) => void;
    allCategories: Category[];
    themeColor: ThemeColor;
}

const ITEMS_PER_PAGE = 15;

const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const EditRow: React.FC<{
    transaction: Transaction;
    onSave: (updated: Transaction) => void;
    onCancel: () => void;
    allCategories: Category[];
    themeColor: ThemeColor;
}> = ({ transaction, onSave, onCancel, allCategories, themeColor }) => {
    const [editFormData, setEditFormData] = useState<Transaction>({ ...transaction });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let newFormData = { ...editFormData, [name]: value };

        if (name === 'debit' || name === 'credit') {
            const amount = value === '' ? null : parseFloat(value);
            const otherField = name === 'debit' ? 'credit' : 'debit';
            newFormData = { ...newFormData, [name]: amount, [otherField]: null };
        }
        setEditFormData(newFormData);
    };

    const handleSave = () => {
        if (window.confirm('Are you sure you want to save these changes?')) {
            onSave(editFormData);
        }
    };

    return (
        <tr className="bg-slate-50 dark:bg-slate-700/50">
            <td className="px-6 py-2 whitespace-nowrap">{new Date(transaction.date).toLocaleDateString('en-GB')}</td>
            <td className="px-6 py-2"><input type="text" name="description" value={editFormData.description} onChange={handleInputChange} className={`input-field-sm focus:ring-${themeColor}-500 focus:border-${themeColor}-500`} /></td>
            <td className="px-6 py-2"><input type="number" name="debit" value={editFormData.debit ?? ''} onChange={handleInputChange} className={`input-field-sm text-right focus:ring-${themeColor}-500 focus:border-${themeColor}-500`} placeholder="0.00"/></td>
            <td className="px-6 py-2"><input type="number" name="credit" value={editFormData.credit ?? ''} onChange={handleInputChange} className={`input-field-sm text-right focus:ring-${themeColor}-500 focus:border-${themeColor}-500`} placeholder="0.00"/></td>
            <td className="px-6 py-2">
                <select name="category" value={editFormData.category} onChange={handleInputChange} className={`input-field-sm focus:ring-${themeColor}-500 focus:border-${themeColor}-500`}>
                    {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </td>
            <td className="px-6 py-2 text-center">
                <div className="flex items-center justify-center space-x-2">
                    <button onClick={handleSave} className="p-2 rounded-full hover:bg-green-100 dark:hover:bg-green-900" title="Save"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></button>
                    <button onClick={onCancel} className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900" title="Cancel"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                </div>
            </td>
        </tr>
    );
};

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, onTransactionUpdate, allCategories, themeColor }) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const paginatedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return transactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [transactions, currentPage]);

    const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };
    
    // Reset to page 1 when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [transactions]);
    
    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                        <tr>
                            <th scope="col" className="px-6 py-3">Date</th>
                            <th scope="col" className="px-6 py-3">Description</th>
                            <th scope="col" className="px-6 py-3 text-right">Debit</th>
                            <th scope="col" className="px-6 py-3 text-right">Credit</th>
                            <th scope="col" className="px-6 py-3">Category</th>
                            <th scope="col" className="px-6 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedTransactions.map(t => (
                            editingId === t.id ? (
                                <EditRow key={t.id} transaction={t} onSave={onTransactionUpdate} onCancel={() => setEditingId(null)} allCategories={allCategories} themeColor={themeColor} />
                            ) : (
                                <tr key={t.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600/20 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">{new Date(t.date).toLocaleDateString('en-GB')}</td>
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{t.description}</td>
                                    <td className="px-6 py-4 text-right text-red-500 font-mono">{formatCurrency(t.debit)}</td>
                                    <td className="px-6 py-4 text-right text-green-500 font-mono">{formatCurrency(t.credit)}</td>
                                    <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getCategoryColor(t.category)}`}>{t.category}</span></td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => setEditingId(t.id)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600" title="Edit transaction"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500 dark:text-slate-400" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                                    </td>
                                </tr>
                            )
                        ))}
                    </tbody>
                </table>
                 <style>{`
                    .input-field-sm{width:100%;min-width:100px;padding:.25rem .5rem;font-size:.875rem;line-height:1.25rem;background-color:#fff;color:#1e293b;border:1px solid #cbd5e1;border-radius:.375rem}.dark .input-field-sm{background-color:#334152;color:#f1f5f9;border-color:#475569}.input-field-sm:focus{outline:0}
                `}</style>
            </div>
             {transactions.length === 0 && <p className="text-center p-8 text-slate-500">No transactions match the current filter.</p>}
             {totalPages > 1 && (
                <div className="px-6 py-3 flex items-center justify-between border-t dark:border-slate-700">
                    <span className="text-sm text-slate-500">Page {currentPage} of {totalPages}</span>
                    <div className="flex items-center space-x-2">
                        <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        </button>
                        <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                        </button>
                    </div>
                </div>
             )}
        </div>
    );
};