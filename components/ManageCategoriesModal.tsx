import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import type { Category, ThemeColor } from '../types';
import * as dbService from '../services/dbService';
import { DEFAULT_CATEGORIES, THEME_CONFIG } from '../constants';

interface ManageCategoriesModalProps {
    onClose: () => void;
    onUpdate: () => void;
    themeColor: ThemeColor;
}

export const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({ onClose, onUpdate, themeColor }) => {
    const [customCategories, setCustomCategories] = useState<Category[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [editingValue, setEditingValue] = useState('');
    const theme = THEME_CONFIG[themeColor];

    const fetchCategories = useCallback(async () => {
        setIsLoading(true);
        const fetchedCustom = await dbService.getAllCategories();
        setCustomCategories(fetchedCustom.sort());
        setAllCategories([...DEFAULT_CATEGORIES, ...fetchedCustom].sort());
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const handleAddCategory = async (e: FormEvent) => {
        e.preventDefault();
        const trimmedName = newCategoryName.trim();
        if (!trimmedName) {
            alert('Category name cannot be empty.');
            return;
        }
        if (allCategories.some(c => c.toLowerCase() === trimmedName.toLowerCase())) {
            alert('This category already exists.');
            return;
        }
        await dbService.addCategory(trimmedName);
        setNewCategoryName('');
        await fetchCategories();
        onUpdate();
    };

    const handleDeleteCategory = async (categoryName: string) => {
        if (window.confirm(`Are you sure you want to delete "${categoryName}"? This will reassign its transactions to 'Other Expense' and remove any associated rules.`)) {
            await dbService.deleteCategory(categoryName);
            await fetchCategories();
            onUpdate();
        }
    };

    const handleEditClick = (category: Category) => {
        setEditingCategory(category);
        setEditingValue(category);
    };

    const handleCancelEdit = () => {
        setEditingCategory(null);
        setEditingValue('');
    };

    const handleUpdateCategory = async (e: FormEvent) => {
        e.preventDefault();
        const oldName = editingCategory;
        const newName = editingValue.trim();

        if (!oldName) return;

        if (!newName) {
            alert('Category name cannot be empty.');
            return;
        }
        if (oldName.toLowerCase() === newName.toLowerCase()) {
            handleCancelEdit();
            return;
        }
        if (allCategories.some(c => c.toLowerCase() === newName.toLowerCase() && c.toLowerCase() !== oldName.toLowerCase())) {
            alert('This category name already exists.');
            return;
        }

        await dbService.updateCategory(oldName, newName);
        await fetchCategories();
        onUpdate();
        handleCancelEdit();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold">Manage Categories</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <form onSubmit={handleAddCategory} className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg mb-6 flex items-end gap-4">
                        <div className="flex-grow">
                            <label htmlFor="newCategory" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New Category Name</label>
                            <input type="text" id="newCategory" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="e.g., Groceries" required className={`w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none ${theme.focusRing500} ${theme.focusBorder500}`} />
                        </div>
                        <button type="submit" className={`py-2 px-4 rounded-md ${theme.bg600} ${theme.hoverBg700} text-white font-semibold transition-colors`}>Add</button>
                    </form>

                    <h3 className="text-lg font-semibold mb-2">Existing Categories</h3>
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg">
                        {isLoading ? <p className="p-4 text-center">Loading categories...</p> : allCategories.length === 0 ? <p className="p-4 text-center text-slate-500 dark:text-slate-400">No categories found.</p> : (
                            <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                                {allCategories.map(cat => {
                                    const isDefault = DEFAULT_CATEGORIES.includes(cat);
                                    const isEditing = editingCategory === cat;

                                    return (
                                        <li key={cat} className="p-3 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                            {isEditing ? (
                                                <form onSubmit={handleUpdateCategory} className="flex-grow flex items-center gap-2">
                                                    <input type="text" value={editingValue} onChange={e => setEditingValue(e.target.value)} className={`flex-grow px-2 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none ${theme.focusRing500} ${theme.focusBorder500}`} autoFocus />
                                                    <button type="submit" className="p-2 rounded-full hover:bg-green-100 dark:hover:bg-green-900/50" aria-label="Update category"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg></button>
                                                    <button type="button" onClick={handleCancelEdit} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600" aria-label="Cancel edit"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                                                </form>
                                            ) : (
                                                <>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-semibold">{cat}</p>
                                                        {isDefault && <span className="text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">Default</span>}
                                                    </div>
                                                    {!isDefault && (
                                                        <div className="flex items-center space-x-2">
                                                            <button onClick={() => handleEditClick(cat)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600" aria-label="Edit category"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600 dark:text-slate-300" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                                                            <button onClick={() => handleDeleteCategory(cat)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600" aria-label="Delete category"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 text-right">
                    <button onClick={onClose} className="py-2 px-6 rounded-md bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-800 dark:text-slate-100 font-semibold transition-colors">Done</button>
                </div>
            </div>
        </div>
    );
};