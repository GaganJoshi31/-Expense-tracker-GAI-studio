import type { Transaction } from '../types';
import * as dbService from './dbService';
import { categorizeTransaction } from './categorizationService';
import * as logService from './logService';

// Inform TypeScript about the global variables from the imported scripts
declare const pdfjsLib: any;
declare const Papa: any;

type UncategorizedTransaction = Omit<Transaction, 'id' | 'category' | 'sourceFile'>;

// Helper to create a unique and deterministic ID for a transaction
const createTransactionId = async (t: Omit<Transaction, 'id'>): Promise<string> => {
    const data = `${t.date}-${t.description}-${t.debit}-${t.credit}-${t.sourceFile}`;
    const encoder = new TextEncoder();
    const buffer = await crypto.subtle.digest('SHA-1', encoder.encode(data));
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
};

const normalizeDate = (dateStr: string): string | null => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    
    // Common date formats (DD/MM/YYYY, DD-MM-YYYY, etc.)
    const standardDateMatch = dateStr.trim().match(/^(?<d>\d{1,2})[./-](?<m>\d{1,2})[./-](?<y>\d{2,4})$/);
    if (standardDateMatch?.groups) {
        let { d, m, y } = standardDateMatch.groups;
        let day = parseInt(d, 10), month = parseInt(m, 10), year = parseInt(y, 10);
        if (year < 100) year += 2000;
        // Handle potential MM/DD/YYYY ambiguity by swapping if month > 12
        if (month > 12 && day <= 12) [day, month] = [month, day];
        if (day > 0 && day <= 31 && month > 0 && month <= 12 && year > 1900) {
            return new Date(Date.UTC(year, month - 1, day)).toISOString().split('T')[0];
        }
    }
    
    // Try parsing with Date.parse as a fallback for other formats (e.g., "01 Jan 2023")
    const parsedDate = Date.parse(dateStr.trim().replace(/(\d+)(st|nd|rd|th)/, '$1')); // remove ordinals
    if (!isNaN(parsedDate)) {
        return new Date(parsedDate).toISOString().split('T')[0];
    }

    return null;
};


const normalizeAmount = (amountStr: string | undefined | null): number | null => {
    if (!amountStr || typeof amountStr !== 'string') return null;
    // Remove currency symbols, commas, and trailing suffixes like DR/CR for parsing
    const cleanedStr = amountStr.trim().replace(/[₹,]/g, '').replace(/\s+(cr|dr)$/i, '');
    if (cleanedStr === '' || cleanedStr === '-') return null;
    const num = parseFloat(cleanedStr);
    return isNaN(num) ? null : Math.abs(num); // always return positive
};

const parseCsv = (file: File): Promise<UncategorizedTransaction[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results: any) => {
                if (results.errors.length) {
                    const criticalError = results.errors.find((e:any) => e.code !== 'UndetectableDelimiter');
                    if(criticalError) {
                        return reject(new Error(`CSV Parsing Error: ${criticalError.message} on row ${criticalError.row}.`));
                    }
                }
                
                const rawHeaders = results.meta.fields;
                if (!rawHeaders) {
                    return reject(new Error('CSV has no headers or is empty.'));
                }

                const MAPPINGS = {
                    date: ['date', 'transaction date', 'txn date', 'value date'],
                    description: ['description', 'narration', 'particulars', 'remarks'],
                    debit: ['debit', 'withdrawal amt.', 'withdrawal', 'dr'],
                    credit: ['credit', 'deposit amt.', 'deposit', 'cr'],
                    amount: ['amount', 'transaction amount'],
                };

                const headerMap: { [key: string]: string } = {};
                for (const key in MAPPINGS) {
                    for (const alias of MAPPINGS[key as keyof typeof MAPPINGS]) {
                        const foundHeader = rawHeaders.find((h: string) => h.toLowerCase().trim().includes(alias));
                        if (foundHeader) {
                            headerMap[key] = foundHeader;
                            break;
                        }
                    }
                }

                if (!headerMap.date || !headerMap.description) {
                    return reject(new Error('Could not find required columns (Date, Description) in CSV.'));
                }
                if (!headerMap.debit && !headerMap.credit && !headerMap.amount) {
                    return reject(new Error('Could not find amount columns (Debit/Credit or Amount) in CSV.'));
                }

                const transactions: UncategorizedTransaction[] = results.data.map((row: any) => {
                    const date = row[headerMap.date];
                    const description = row[headerMap.description];
                    
                    let debit: number | null = null;
                    let credit: number | null = null;

                    if (headerMap.debit || headerMap.credit) {
                        debit = normalizeAmount(row[headerMap.debit]);
                        credit = normalizeAmount(row[headerMap.credit]);
                    } else if (headerMap.amount) {
                        const amountVal = row[headerMap.amount];
                        const amountStr = String(amountVal);
                        const amount = normalizeAmount(amountStr);
                        
                        if(amount !== null) {
                            if (amountStr.includes('-') || amountStr.toLowerCase().includes('dr')) {
                                debit = amount;
                            } else {
                                credit = amount;
                            }
                        }
                    }
                    
                    const normalizedDate = normalizeDate(date);
                    if (!normalizedDate || !description || (debit === null && credit === null)) return null;

                    return {
                        date: normalizedDate,
                        description: description.trim(),
                        debit: debit,
                        credit: credit,
                    };
                }).filter((t:any): t is UncategorizedTransaction => t !== null);
                resolve(transactions);
            },
            error: (error: Error) => reject(new Error(`Could not read CSV file: ${error.message}`)),
        });
    });
};

const parseTextContent = (text: string): UncategorizedTransaction[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return [];
    
    // --- New Table-based Parsing Logic ---

    // 1. Identify Header and Column Positions
    const HEADER_KEYWORDS: { key: keyof UncategorizedTransaction | 'balance', aliases: string[] }[] = [
        { key: 'date', aliases: ['date', 'txn date', 'value date'] },
        { key: 'description', aliases: ['description', 'narration', 'particulars', 'remarks'] },
        { key: 'debit', aliases: ['debit', 'withdrawal', 'dr.'] },
        { key: 'credit', aliases: ['credit', 'deposit', 'cr.'] },
        { key: 'balance', aliases: ['balance'] }
    ];

    let headerRowIndex = -1;
    let columnDefs: { key: string, start: number, end: number }[] = [];

    for (let i = 0; i < Math.min(lines.length, 20); i++) { // Search for header in the first 20 lines
        const lineLower = lines[i].toLowerCase();
        const foundCols: { key: string, index: number }[] = [];
        
        HEADER_KEYWORDS.forEach(kw => {
            for (const alias of kw.aliases) {
                const index = lineLower.indexOf(alias);
                if (index !== -1) {
                    foundCols.push({ key: kw.key, index });
                    break; 
                }
            }
        });

        // A good header has at least date, description, and one amount column
        if (foundCols.some(c => c.key === 'date') && foundCols.some(c => c.key === 'description') && (foundCols.some(c => c.key === 'debit') || foundCols.some(c => c.key === 'credit'))) {
            headerRowIndex = i;
            foundCols.sort((a, b) => a.index - b.index);
            
            for(let j=0; j < foundCols.length; j++) {
                columnDefs.push({
                    key: foundCols[j].key,
                    start: foundCols[j].index,
                    end: j < foundCols.length - 1 ? foundCols[j+1].index : lines[i].length
                });
            }
            break;
        }
    }

    if (headerRowIndex === -1) {
        logService.logWarning("Could not find table headers. Parsing might be inaccurate.");
        return []; // Or fallback to old method if desired, but this is cleaner.
    }

    // 2. Parse Rows based on Column Definitions
    const transactions: UncategorizedTransaction[] = [];
    let currentTransactionLines: string[] = [];
    const dateCol = columnDefs.find(c => c.key === 'date');

    if (!dateCol) {
        logService.logError("Table parser failed: Date column not found.");
        return [];
    }
    
    const processLineBuffer = () => {
        if (currentTransactionLines.length === 0) return;

        const firstLine = currentTransactionLines[0];
        const otherLines = currentTransactionLines.slice(1);
        
        const rowData: { [key: string]: string } = {};
        columnDefs.forEach(col => {
            rowData[col.key] = firstLine.substring(col.start, col.end).trim();
        });

        const date = normalizeDate(rowData.date);
        const debit = normalizeAmount(rowData.debit);
        const credit = normalizeAmount(rowData.credit);
        
        // Combine description from its column and any subsequent non-transaction lines
        let description = (rowData.description || '').trim();
        if (otherLines.length > 0) {
            description += ' ' + otherLines.join(' ').trim();
        }
        description = description.replace(/\s+/g, ' '); // Consolidate whitespace
        
        if (date && description && (debit !== null || credit !== null)) {
            transactions.push({ date, description, debit, credit });
        }
        
        currentTransactionLines = [];
    };

    for (let i = headerRowIndex + 1; i < lines.length; i++) {
        const line = lines[i];
        const potentialDateStr = line.substring(dateCol.start, dateCol.end).trim();

        if (normalizeDate(potentialDateStr)) {
            // This line looks like a new transaction, process the previous buffer
            processLineBuffer();
            currentTransactionLines.push(line);
        } else if (currentTransactionLines.length > 0) {
            // This is likely a continuation of the previous description
            currentTransactionLines.push(line);
        }
    }
    
    // Process the last transaction in the buffer
    processLineBuffer();
    
    return transactions;
};


const parseTxt = async (file: File): Promise<UncategorizedTransaction[]> => {
    try {
        const text = await file.text();
        return parseTextContent(text);
    } catch(e: any) {
        throw new Error(`Failed to read file content: ${e.message}`);
    }
};

const parsePdf = (file: File, requestPassword: (file: File) => Promise<string>): Promise<UncategorizedTransaction[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (event) => {
            if (!event.target?.result) {
                return reject(new Error('Failed to read PDF file.'));
            }
            const typedArray = new Uint8Array(event.target.result as ArrayBuffer);

            const processPdfDoc = async (pdfDoc: any) => {
                let fullText = '';
                for (let i = 1; i <= pdfDoc.numPages; i++) {
                    const page = await pdfDoc.getPage(i);
                    const textContent = await page.getTextContent();
                    // Reconstruct lines based on y-coordinates to handle multi-column layouts
                    const lines = new Map<number, { x: number, str: string }[]>();
                    for (const item of textContent.items) {
                        const y = Math.round(item.transform[5]);
                        if (!lines.has(y)) lines.set(y, []);
                        lines.get(y)!.push({ x: Math.round(item.transform[4]), str: item.str });
                    }
                    const sortedLines = Array.from(lines.entries()).sort((a,b) => b[0] - a[0]);
                    fullText += sortedLines.map(([,textItems]) => textItems.sort((a,b) => a.x - b.x).map(i => i.str).join(' ')).join('\n') + '\n';
                }
                return parseTextContent(fullText);
            };

            try {
                const loadingTask = pdfjsLib.getDocument(typedArray.slice());
                const pdf = await loadingTask.promise;
                resolve(await processPdfDoc(pdf));
            } catch (error: any) {
                if (error.name === 'PasswordException') {
                    try {
                        const password = await requestPassword(file);
                        const passwordLoadingTask = pdfjsLib.getDocument({ data: typedArray, password });
                        const pdf = await passwordLoadingTask.promise;
                        resolve(await processPdfDoc(pdf));
                    } catch(e: any) {
                        if (e.name === 'PasswordException') {
                            reject(new Error('Incorrect password provided.'));
                        } else {
                            reject(e); 
                        }
                    }
                } else {
                    reject(new Error(`Failed to load PDF: ${error.message || 'Unknown error'}`));
                }
            }
        };
        
        reader.onerror = () => reject(new Error('Error reading the file.'));
        reader.readAsArrayBuffer(file);
    });
};

export const parseFiles = async (
    files: FileList,
    requestPassword: (file: File) => Promise<string>
): Promise<Transaction[]> => {
    if (files.length > 5) {
        throw new Error('Please upload a maximum of 5 files at a time.');
    }
    const customRules = await dbService.getCustomRules();
    
    const allFinalTransactions: Transaction[] = [];

    const filePromises = Array.from(files).map(async file => {
        try {
            let rawTransactions: UncategorizedTransaction[] = [];
            const fileExtension = file.name.split('.').pop()?.toLowerCase();

            if (file.type === 'application/pdf' || fileExtension === 'pdf') {
                rawTransactions = await parsePdf(file, requestPassword);
            } else if (file.type === 'text/csv' || fileExtension === 'csv') {
                rawTransactions = await parseCsv(file);
            } else if (file.type === 'text/plain' || fileExtension === 'txt') {
                rawTransactions = await parseTxt(file);
            } else {
                logService.logWarning(`Unsupported file type skipped: ${file.name} (${file.type})`);
                return []; // Skip unsupported files silently
            }

            if (rawTransactions.length === 0) {
                 logService.logWarning(`No transactions found in "${file.name}". The file may be empty or in an unsupported format.`);
                 return []; // Return empty array for this file
            }

            const categorizedTransactions: Omit<Transaction, 'id'>[] = rawTransactions.map(t => ({
                ...t,
                category: categorizeTransaction(t, customRules),
                sourceFile: file.name
            }));

            return await Promise.all(
                categorizedTransactions.map(async t => ({
                    ...t,
                    id: await createTransactionId(t)
                }))
            );

        } catch (error: any) {
            const originalMessage = error.message || 'An unknown parsing error occurred.';
            throw new Error(`Failed to process "${file.name}": ${originalMessage}`);
        }
    });

    const results = await Promise.allSettled(filePromises);
    let firstError: Error | null = null;

    results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
            allFinalTransactions.push(...result.value);
        } else if (result.status === 'rejected' && !firstError) {
            firstError = result.reason;
        }
    });

    if (firstError) {
        throw firstError;
    }
    
    return allFinalTransactions;
};