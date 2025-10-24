import type { Transaction, Category, CategoryRule, CustomRule } from '../types';
import { CATEGORY_RULES } from '../constants';

type UncategorizedTransaction = Omit<Transaction, 'id' | 'category' | 'sourceFile'>;

export const categorizeTransaction = (
    transaction: UncategorizedTransaction,
    customRules: CustomRule[]
): Category => {
    const description = transaction.description.toLowerCase();
    
    // 1. Check custom rules (exact match, case-insensitive)
    const customRule = customRules.find(rule => rule.description.toLowerCase() === description);
    if (customRule) {
        return customRule.category;
    }

    // 2. Check predefined category rules (keyword match)
    for (const rule of CATEGORY_RULES) {
        if (rule.type === 'debit' && transaction.debit === null) continue;
        if (rule.type === 'credit' && transaction.credit === null) continue;
        
        for (const keyword of rule.keywords) {
            if (description.includes(keyword.toLowerCase())) {
                return rule.category;
            }
        }
    }

    // 3. Default category based on transaction type
    if (transaction.credit !== null) {
        return 'Other Income';
    }

    return 'Other Expense';
};
