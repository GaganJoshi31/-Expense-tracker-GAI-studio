import React, { useState, useCallback } from 'react';
import type { ThemeColor, FileStatus } from '../types';

interface FileUploadProps {
    onUpload: (files: FileList) => void;
    disabled: boolean;
    themeColor: ThemeColor;
    fileStatuses: FileStatus[];
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUpload, disabled, themeColor, fileStatuses }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) setIsDragging(true);
    }, [disabled]);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && !disabled) {
            onUpload(e.dataTransfer.files);
            e.dataTransfer.clearData();
        }
    }, [onUpload, disabled]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0 && !disabled) {
            onUpload(e.target.files);
            // Reset input value to allow re-uploading the same file
            e.target.value = '';
        }
    };
    
    const statusIconMap: Record<FileStatus['status'], React.ReactNode> = {
        parsing: <svg className="h-5 w-5 text-blue-500 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>,
        password: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L4.257 19.743A1 1 0 112.84 18.33l10.486-6.054A6 6 0 0118 8zm-6-3a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>,
        success: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>,
        error: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>,
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-lg space-y-4">
            <div 
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ease-in-out
                    ${isDragging ? `border-${themeColor}-500 bg-${themeColor}-50 dark:bg-slate-800/50` : 'border-slate-300 dark:border-slate-600'}
                    ${disabled ? 'opacity-50 cursor-not-allowed' : `hover:border-${themeColor}-400`}`}
                onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}
                aria-disabled={disabled}
            >
                <input
                    type="file" multiple accept=".pdf,.csv,.txt,.xlsx,.xls"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleChange} disabled={disabled} aria-label="Upload bank statements"
                />
                <div className="flex flex-col items-center justify-center space-y-4 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    <p className="text-slate-500 dark:text-slate-400">
                        <span className={`font-semibold text-${themeColor}-600 dark:text-${themeColor}-400`}>Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">PDF, CSV, XLSX, or TXT (max 5)</p>
                </div>
            </div>

            {fileStatuses.length > 0 && (
                <div className="space-y-2 pt-2">
                    <h3 className="font-semibold text-sm">Upload Status:</h3>
                    <ul className="space-y-1 max-h-40 overflow-y-auto">
                        {fileStatuses.map(file => (
                            <li key={file.name} className="flex items-center space-x-3 text-sm p-2 bg-slate-100 dark:bg-slate-700/50 rounded-md">
                                <span className="flex-shrink-0">{statusIconMap[file.status]}</span>
                                <div className="flex-grow min-w-0">
                                    <p className="truncate font-medium">{file.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{file.message}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};