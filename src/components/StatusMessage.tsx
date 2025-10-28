import React from 'react';

interface StatusMessageProps {
    message: string;
    type?: 'info' | 'error';
}

export const StatusMessage: React.FC<StatusMessageProps> = ({ message, type = 'info' }) => {
    const isError = type === 'error';

    const bgColor = isError ? 'bg-red-100 dark:bg-red-900/50' : 'bg-blue-100 dark:bg-blue-900/50';
    const textColor = isError ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300';
    const borderColor = isError ? 'border-red-400' : 'border-blue-400';

    return (
        <div 
            className={`p-4 border-l-4 rounded-r-lg ${bgColor} ${borderColor} ${textColor}`}
            role={isError ? 'alert' : 'status'}
        >
            <p className="font-semibold">{message}</p>
        </div>
    );
};