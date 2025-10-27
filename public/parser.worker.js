
// This worker handles all heavy file parsing in the background, keeping the UI responsive.

// Load external libraries needed for parsing
importScripts(
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/paparse.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
);

// pdf.js requires its own worker to be configured.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

// --- All helper and parsing functions are now self-contained in this worker ---

const CATEGORY_RULES = [
    { category: 'Salary', keywords: ['salary', 'sal deposit'], type: 'credit' },
    { category: 'Credit Card Bill', keywords: ['credit card', 'cc bill', 'cc payment'], type: 'debit' },
    { category: 'Loan/EMI', keywords: ['emi', 'loan', 'equated monthly'], type: 'debit' },
    { category: 'Petrol', keywords: ['petrol', 'fuel', 'indian oil', 'hpcl', 'bharat petroleum'], type: 'debit' },
    { category: 'Food', keywords: ['zomato', 'swiggy', 'restaurant', 'cafe', 'food', 'dominos', 'pizza hut'], type: 'debit' },
    { category: 'UPI', keywords: ['upi'], type: 'any' },
    { category: 'Transfer', keywords: ['tfr', 'transfer', 'neft', 'rtgs', 'imps'], type: 'any' },
];

const categorizeTransaction = (transaction, customRules) => {
    const description = transaction.description.toLowerCase();
    const customRule = customRules.find(rule => rule.description.toLowerCase() === description);
    if (customRule) return customRule.category;

    for (const rule of CATEGORY_RULES) {
        if (rule.type === 'debit' && transaction.debit === null) continue;
        if (rule.type === 'credit' && transaction.credit === null) continue;
        for (const keyword of rule.keywords) {
            if (description.includes(keyword.toLowerCase())) return rule.category;
        }
    }
    return transaction.credit !== null ? 'Other Income' : 'Other Expense';
};

const createTransactionId = async (t) => {
    const data = `${t.date}-${t.description}-${t.debit}-${t.credit}-${t.sourceFile}`;
    const encoder = new TextEncoder();
    const buffer = await crypto.subtle.digest('SHA-1', encoder.encode(data));
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
};

const normalizeDate = (dateInput) => {
    if (!dateInput) return null;
    if (typeof dateInput === 'number') {
        if (dateInput > 25569) {
            const utc_days = dateInput - 25569;
            const utc_value = utc_days * 86400;
            const date_info = new Date(utc_value * 1000);
            return new Date(date_info.getUTCFullYear(), date_info.getUTCMonth(), date_info.getUTCDate()).toISOString().split('T')[0];
        }
        return null;
    }
    if (typeof dateInput !== 'string') return null;
    const dateStr = dateInput.trim();
    const standardDateMatch = dateStr.match(/^(?<d>\d{1,2})[./-](?<m>\d{1,2})[./-](?<y>\d{2,4})$/);
    if (standardDateMatch?.groups) {
        let { d, m, y } = standardDateMatch.groups;
        let day = parseInt(d, 10), month = parseInt(m, 10), year = parseInt(y, 10);
        if (year < 100) year += 2000;
        if (month > 12 && day <= 12) [day, month] = [month, day];
        if (day > 0 && day <= 31 && month > 0 && month <= 12 && year > 1900) {
            return new Date(Date.UTC(year, month - 1, day)).toISOString().split('T')[0];
        }
    }
    const parsedDate = Date.parse(dateStr.replace(/(\d+)(st|nd|rd|th)/, '$1'));
    if (!isNaN(parsedDate)) return new Date(parsedDate).toISOString().split('T')[0];
    return null;
};

const normalizeAmount = (amountStr) => {
    if (amountStr === null || amountStr === undefined) return null;
    if (typeof amountStr === 'number') return Math.abs(amountStr);
    if (typeof amountStr !== 'string') return null;
    const cleanedStr = amountStr.trim().replace(/[₹,]/g, '').replace(/\s+(cr|dr)$/i, '');
    if (cleanedStr === '' || cleanedStr === '-') return null;
    const num = parseFloat(cleanedStr);
    return isNaN(num) ? null : Math.abs(num);
};

const findHeaders = (data) => {
    const rawHeaders = Array.isArray(data) ? Object.keys(data[0] || {}) : [];
    if (rawHeaders.length === 0) throw new Error('Could not detect any headers.');
    const MAPPINGS = { date: ['date', 'transaction date', 'txn date', 'value date'], description: ['description', 'narration', 'particulars', 'remarks'], debit: ['debit', 'withdrawal amt.', 'withdrawal', 'dr'], credit: ['credit', 'deposit amt.', 'deposit', 'cr'], amount: ['amount', 'transaction amount'] };
    const headerMap = {};
    for (const key in MAPPINGS) {
        for (const alias of MAPPINGS[key]) {
            const foundHeader = rawHeaders.find(h => h.toLowerCase().trim().includes(alias));
            if (foundHeader) {
                headerMap[key] = foundHeader;
                break;
            }
        }
    }
    if (!headerMap.date || !headerMap.description) throw new Error('Could not find required columns (Date, Description).');
    if (!headerMap.debit && !headerMap.credit && !headerMap.amount) throw new Error('Could not find amount columns (Debit/Credit or Amount).');
    return headerMap;
};

const mapRowToTransaction = (row, headerMap) => {
    const date = row[headerMap.date];
    const description = String(row[headerMap.description] || '').trim();
    let debit = null;
    let credit = null;
    if (headerMap.debit || headerMap.credit) {
        debit = normalizeAmount(row[headerMap.debit]);
        credit = normalizeAmount(row[headerMap.credit]);
    } else if (headerMap.amount) {
        const amountVal = row[headerMap.amount];
        const amountStr = String(amountVal);
        const amount = normalizeAmount(amountStr);
        if (amount !== null) {
            if (amountStr.includes('-') || amountStr.toLowerCase().includes('dr')) debit = amount;
            else credit = amount;
        }
    }
    const normalizedDate = normalizeDate(date);
    if (!normalizedDate || !description || (debit === null && credit === null)) return null;
    return { date: normalizedDate, description, debit, credit };
};

const parseCsvOrXlsx = (data) => {
    const headerMap = findHeaders(data);
    return data.map(row => mapRowToTransaction(row, headerMap)).filter(t => t !== null);
};

const parseXlsx = async (file) => {
    try {
        const fileBuffer = await file.arrayBuffer();
        const data = new Uint8Array(fileBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        return parseCsvOrXlsx(jsonData);
    } catch (e) {
        throw new Error(`Failed to process Excel file: ${e.message}`);
    }
};

const parseCsv = async (file) => {
    const fileContent = await file.text();
    return new Promise((resolve, reject) => {
        Papa.parse(fileContent, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    if (results.errors.length) {
                        const criticalError = results.errors.find(e => e.code !== 'UndetectableDelimiter');
                        if (criticalError) {
                            reject(new Error(`CSV Parsing Error: ${criticalError.message} on row ${criticalError.row}.`));
                            return;
                        }
                    }
                    const transactions = parseCsvOrXlsx(results.data);
                    resolve(transactions);
                } catch (e) {
                    reject(e instanceof Error ? e : new Error('An unknown error occurred during CSV processing.'));
                }
            },
            error: (error) => {
                reject(new Error(`Could not parse CSV content: ${error.message}`));
            },
        });
    });
};


const parseTextContent = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return [];
    const HEADER_KEYWORDS = [{ key: 'date', aliases: ['date', 'txn date', 'value date'] }, { key: 'description', aliases: ['description', 'narration', 'particulars', 'remarks'] }, { key: 'debit', aliases: ['debit', 'withdrawal', 'dr.'] }, { key: 'credit', aliases: ['credit', 'deposit', 'cr.'] }, { key: 'balance', aliases: ['balance'] }];
    let headerRowIndex = -1;
    let columnDefs = [];
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
        const lineLower = lines[i].toLowerCase();
        const foundCols = [];
        HEADER_KEYWORDS.forEach(kw => kw.aliases.forEach(alias => {
            const index = lineLower.indexOf(alias);
            if (index !== -1 && !foundCols.some(c => c.key === kw.key)) foundCols.push({ key: kw.key, index });
        }));
        if (foundCols.some(c => c.key === 'date') && foundCols.some(c => c.key === 'description') && (foundCols.some(c => c.key === 'debit') || foundCols.some(c => c.key === 'credit'))) {
            headerRowIndex = i;
            foundCols.sort((a, b) => a.index - b.index);
            columnDefs = foundCols.map((col, j) => ({ key: col.key, start: col.index, end: j < foundCols.length - 1 ? foundCols[j + 1].index : lines[i].length }));
            break;
        }
    }
    if (headerRowIndex === -1) return [];
    const transactions = [];
    const dateCol = columnDefs.find(c => c.key === 'date');
    if (!dateCol) return [];
    let currentTransactionLines = [];
    const processLineBuffer = () => {
        if (currentTransactionLines.length === 0) return;
        const firstLine = currentTransactionLines[0];
        const otherLines = currentTransactionLines.slice(1);
        const rowData = {};
        columnDefs.forEach(col => { rowData[col.key] = firstLine.substring(col.start, col.end).trim(); });
        const date = normalizeDate(rowData.date);
        const debit = normalizeAmount(rowData.debit);
        const credit = normalizeAmount(rowData.credit);
        let description = [rowData.description || '', ...otherLines].join(' ').replace(/\s+/g, ' ').trim();
        if (date && description && (debit !== null || credit !== null)) {
            transactions.push({ date, description, debit, credit });
        }
        currentTransactionLines = [];
    };
    for (let i = headerRowIndex + 1; i < lines.length; i++) {
        const line = lines[i];
        const potentialDateStr = line.substring(dateCol.start, dateCol.end).trim();
        if (normalizeDate(potentialDateStr) && line.length > dateCol.end) {
            processLineBuffer();
            currentTransactionLines.push(line);
        } else if (currentTransactionLines.length > 0) {
            currentTransactionLines.push(line);
        }
    }
    processLineBuffer();
    return transactions;
};

const parseTxt = (file) => file.text().then(parseTextContent);

let passwordPromise = {};
const getPassword = () => {
    self.postMessage({ type: 'password_required' });
    return new Promise((resolve, reject) => {
        passwordPromise.resolve = resolve;
        passwordPromise.reject = reject;
    });
};

const parsePdf = async (file) => {
    const processPdfDoc = async (pdfDoc) => {
        if (!pdfDoc) {
            throw new Error("PDF document object is invalid or missing.");
        }

        const pagePromises = Array.from({ length: pdfDoc.numPages }, (_, i) => pdfDoc.getPage(i + 1));
        const pages = await Promise.all(pagePromises);

        const textContentPromises = pages.map(page => page.getTextContent());
        const allTextContents = await Promise.all(textContentPromises);

        let fullText = '';
        for (const textContent of allTextContents) {
            const lines = new Map();
            textContent.items.forEach(item => {
                const y = Math.round(item.transform[5]);
                if (!lines.has(y)) lines.set(y, []);
                lines.get(y).push({
                    x: item.transform[4],
                    str: item.str,
                    width: item.width
                });
            });

            const sortedLines = Array.from(lines.entries()).sort((a, b) => b[0] - a[0]);

            const reconstructedLines = sortedLines.map(([, items]) => {
                const sortedItems = items.sort((a, b) => a.x - b.x);
                if (sortedItems.length === 0) return '';
                
                let lineText = sortedItems[0].str;
                const spaceWidthThreshold = 2;
                const columnGapThreshold = 10;

                for (let j = 1; j < sortedItems.length; j++) {
                    const prevItem = sortedItems[j - 1];
                    const currentItem = sortedItems[j];
                    
                    const prevItemEnd = prevItem.x + prevItem.width;
                    const gap = currentItem.x - prevItemEnd;
                    
                    if (gap > columnGapThreshold) {
                        lineText += '   ';
                    } else if (gap > spaceWidthThreshold) {
                        lineText += ' ';
                    }
                    
                    lineText += currentItem.str;
                }
                return lineText;
            });
            fullText += reconstructedLines.join('\n') + '\n';
        }
        
        return parseTextContent(fullText);
    };

    const fileBuffer = await file.arrayBuffer();
    const typedArray = new Uint8Array(fileBuffer);

    let pdf;
    try {
        pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
    } catch (error) {
        if (error.name !== 'PasswordException') {
            throw new Error(`Failed to load PDF: ${error.message || 'Unknown error'}`);
        }
        self.postMessage({ type: 'status_update', payload: { status: 'password', message: 'Password required' } });
        try {
            const password = await getPassword();
            self.postMessage({ type: 'status_update', payload: { status: 'parsing', message: 'Password received, parsing...' } });
            pdf = await pdfjsLib.getDocument({ data: typedArray, password }).promise;
        } catch (e) {
            throw new Error(e.name === 'PasswordException' ? 'Incorrect password provided.' : `Failed after password entry: ${e.message}`);
        }
    }
    return await processPdfDoc(pdf);
};


// --- Main Worker Logic ---

self.onmessage = async (event) => {
    // Handle password response from the main thread
    if (event.data.type === 'password_response') {
        if (event.data.error) {
            passwordPromise.reject?.(new Error(event.data.error));
        } else {
            passwordPromise.resolve?.(event.data.password);
        }
        return;
    }

    // Handle initial file processing request
    const { file, customRules } = event.data;
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    try {
        let rawTransactions = [];
        switch (fileExtension) {
            case 'pdf': rawTransactions = await parsePdf(file); break;
            case 'csv': rawTransactions = await parseCsv(file); break;
            case 'txt': rawTransactions = await parseTxt(file); break;
            case 'xlsx': case 'xls': rawTransactions = await parseXlsx(file); break;
            default: throw new Error(`File type ".${fileExtension}" is not supported.`);
        }
        
        if (rawTransactions.length === 0) {
            self.postMessage({ type: 'success', payload: { transactions: [] } });
            return;
        }

        const categorized = rawTransactions.map(t => ({ ...t, category: categorizeTransaction(t, customRules), sourceFile: file.name }));
        const transactionsWithIds = await Promise.all(categorized.map(async t => ({ ...t, id: await createTransactionId(t) })));
        
        self.postMessage({ type: 'success', payload: { transactions: transactionsWithIds } });

    } catch (error) {
        self.postMessage({ type: 'error', payload: { error: error.message } });
    }
};
