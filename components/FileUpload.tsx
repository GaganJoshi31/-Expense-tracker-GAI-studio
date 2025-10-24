import React, { useState, useCallback } from 'react';
import type { ThemeColor } from '../types';

interface FileUploadProps {
    onUpload: (files: FileList) => void;
    disabled: boolean;
    themeColor: ThemeColor;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onUpload, disabled, themeColor }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) {
            setIsDragging(true);
        }
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
        }
    };

    return (
        <div 
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ease-in-out
                ${isDragging ? `border-${themeColor}-500 bg-${themeColor}-50 dark:bg-slate-800` : 'border-slate-300 dark:border-slate-600'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : `hover:border-${themeColor}-400`}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            aria-disabled={disabled}
        >
            <input
                type="file"
                multiple
                accept=".pdf,.csv,.txt"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleChange}
                disabled={disabled}
                aria-label="Upload bank statements"
            />
            <div className="flex flex-col items-center justify-center space-y-4 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-slate-500 dark:text-slate-400">
                    <span className={`font-semibold text-${themeColor}-600 dark:text-${themeColor}-400`}>Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Up to 5 files (PDF, CSV, or TXT)</p>
            </div>
        </div>
    );
};
