import * as dbService from './dbService';
import type { LogLevel, LogEntry } from '../types';

const log = (level: LogLevel, message: string, details?: any) => {
    // Sanitize details to prevent large objects from being stored
    let sanitizedDetails = details;
    if (details instanceof Error) {
        sanitizedDetails = { message: details.message, stack: details.stack };
    }
    
    const entry: Omit<LogEntry, 'id' | 'timestamp'> & { timestamp: Date } = {
        timestamp: new Date(),
        level,
        message,
        details: sanitizedDetails ? JSON.stringify(sanitizedDetails, Object.getOwnPropertyNames(sanitizedDetails)) : undefined
    };

    // Fire-and-forget logging to not block the main thread
    dbService.addLog(entry as any).catch(err => {
        console.error("Failed to write log to IndexedDB:", err);
    });
};

export const logInfo = (message: string, details?: any) => {
    console.log(`[INFO] ${message}`, details || '');
    log('INFO', message, details);
};

export const logWarning = (message: string, details?: any) => {
    console.warn(`[WARNING] ${message}`, details || '');
    log('WARNING', message, details);
};

export const logError = (message: string, details?: any) => {
    console.error(`[ERROR] ${message}`, details || '');
    log('ERROR', message, details);
};
