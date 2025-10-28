import type { Transaction } from '../types';

export const generateAndDownloadCsv = (dataToExport: Transaction[], filename: string) => {
    if (dataToExport.length === 0) {
        alert("No data available to export.");
        return;
    }
    
    const headers = ['ID', 'Date', 'Description', 'Debit', 'Credit', 'Category', 'Source File'];
    const csvRows = [
        headers.join(','),
        ...dataToExport.map(t => [
            t.id,
            t.date,
            `"${t.description.replace(/"/g, '""')}"`, // Handle quotes in description
            t.debit ?? '',
            t.credit ?? '',
            t.category,
            t.sourceFile
        ].join(','))
    ];
    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};