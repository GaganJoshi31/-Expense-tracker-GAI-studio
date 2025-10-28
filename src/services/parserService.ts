import type { Transaction, ParsingResult, UpdateFileStatusCallback } from '../types';
import * as dbService from './dbService';
import * as logService from './logService';

const processFileWithWorker = (
    file: File, 
    customRules: any[], 
    requestPassword: (file: File) => Promise<string>,
    updateStatus: UpdateFileStatusCallback
): Promise<Transaction[]> => {
    return new Promise((resolve, reject) => {
        // Create a new worker for each file to run in parallel.
        const worker = new Worker('/parser.worker.js');

        worker.onmessage = async (event) => {
            const { type, payload } = event.data;
            switch (type) {
                case 'status_update':
                    updateStatus(file.name, payload.status, payload.message);
                    break;
                case 'password_required':
                    try {
                        const password = await requestPassword(file);
                        worker.postMessage({ type: 'password_response', password });
                    } catch (err: any) {
                        worker.postMessage({ type: 'password_response', error: err.message || 'Password entry cancelled.' });
                    }
                    break;
                case 'success':
                    resolve(payload.transactions);
                    worker.terminate();
                    break;
                case 'error':
                    reject(new Error(payload.error));
                    worker.terminate();
                    break;
            }
        };

        worker.onerror = (err) => {
            reject(new Error(`Worker error for ${file.name}: ${err.message}`));
            worker.terminate();
        };

        // Send the file and rules to the worker to start processing.
        worker.postMessage({ file, customRules });
    });
};


export const parseFiles = async (
    files: FileList,
    requestPassword: (file: File) => Promise<string>,
    updateStatus: UpdateFileStatusCallback
): Promise<ParsingResult> => {
    if (files.length > 5) throw new Error('Please upload a maximum of 5 files at a time.');

    const customRules = await dbService.getCustomRules();
    const finalResult: ParsingResult = { transactions: [], errors: [] };

    const filePromises = Array.from(files).map(file => 
        processFileWithWorker(file, customRules, requestPassword, updateStatus)
            // FIX: Added 'as const' to status properties to enable TypeScript's discriminated union type narrowing.
            // This ensures that 'result.value' is only accessible when status is 'fulfilled', and 'result.reason' when status is 'rejected'.
            .then(transactions => ({ status: 'fulfilled' as const, value: transactions, fileName: file.name }))
            .catch(error => ({ status: 'rejected' as const, reason: error, fileName: file.name }))
    );

    const results = await Promise.all(filePromises);
    
    results.forEach(result => {
        if (result.status === 'fulfilled') {
            if (result.value.length === 0) {
                 logService.logWarning(`No transactions found in "${result.fileName}".`);
                 updateStatus(result.fileName, 'success', 'Parsed, but no new transactions found.');
            } else {
                finalResult.transactions.push(...result.value);
                updateStatus(result.fileName, 'success', `Successfully parsed ${result.value.length} transactions.`);
            }
        } else {
            const errorMessage = result.reason instanceof Error ? result.reason.message : String(result.reason);
            finalResult.errors.push({ fileName: result.fileName, error: errorMessage });
            updateStatus(result.fileName, 'error', errorMessage);
        }
    });
    
    return finalResult;
};