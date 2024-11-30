import Papa from 'papaparse';
import { Transaction } from './types';

export class CSVValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CSVValidationError';
  }
}

export async function validateAndParseCSV(file: File): Promise<Transaction[]> {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new CSVValidationError('No file provided'));
      return;
    }

    // Convert File to text directly
    const text = Buffer.from(file.stream() as any).toString('utf-8');
    
    Papa.parse(text, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim().toLowerCase(),
      complete: (results) => {
        try {
          const transactions = validateAndTransformData(results.data);
          resolve(transactions);
        } catch (error) {
          reject(error);
        }
      },
      error: (error: any) => {
        reject(new CSVValidationError(`CSV parsing error: ${error.message}`));
      }
    });
  });
}

function validateAndTransformData(data: any[]): Transaction[] {
  // Validate file is not empty
  if (data.length === 0) {
    throw new CSVValidationError('CSV file is empty');
  }

  // Check required columns
  const requiredColumns = ['date', 'amount', 'category', 'type'];
  const firstRow = data[0];
  const missingColumns = requiredColumns.filter(col => !(col in firstRow));
  
  if (missingColumns.length > 0) {
    throw new CSVValidationError(
      `Missing required columns: ${missingColumns.join(', ')}`
    );
  }

  // Validate and transform each row
  return data.map((row, index) => {
    const rowNumber = index + 2; // +2 because of 0-based index and header row

    // Validate date
    const dateStr = row.date;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new CSVValidationError(
        `Invalid date format at row ${rowNumber}: ${dateStr}. Use YYYY-MM-DD format.`
      );
    }

    // Validate amount
    if (typeof row.amount !== 'number' || isNaN(row.amount) || row.amount <= 0) {
      throw new CSVValidationError(
        `Invalid amount at row ${rowNumber}: ${row.amount}. Amount must be a positive number.`
      );
    }

    // Validate type
    const type = row.type?.toLowerCase();
    if (!['income', 'expense'].includes(type)) {
      throw new CSVValidationError(
        `Invalid type at row ${rowNumber}: "${row.type}". Must be either 'income' or 'expense'.`
      );
    }

    // Validate category
    if (!row.category || typeof row.category !== 'string' || !row.category.trim()) {
      throw new CSVValidationError(
        `Invalid category at row ${rowNumber}: "${row.category}". Category cannot be empty.`
      );
    }

    // Transform and return valid transaction
    return {
      date: date.toISOString().split('T')[0],
      amount: row.amount,
      category: row.category.trim(),
      type: type as 'income' | 'expense'
    };
  });
}