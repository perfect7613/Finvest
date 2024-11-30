import { NextRequest, NextResponse } from 'next/server';
import { IndianFinvestAdvisor } from '@/lib/financial-advisor';
import { Transaction } from '@/lib/types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { validateAndParseCSV } from '@/lib/csv-utils';

import Papa from 'papaparse';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

function validateAndTransformCSV(csvText: string): Transaction[] {
  const parseResult = Papa.parse(csvText, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim().toLowerCase(),
  });

  if (parseResult.errors.length > 0) {
    throw new Error(`CSV parsing error: ${parseResult.errors[0].message}`);
  }

  const data = parseResult.data;

  // Validate file is not empty
  if (data.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Check required columns
  const requiredColumns = ['date', 'amount', 'category', 'type'];
  const firstRow = data[0] as any;
  const missingColumns = requiredColumns.filter(col => !(col in firstRow));
  
  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
  }

  // Validate and transform each row
  return data.map((row: any, index: number) => {
    const rowNumber = index + 2;

    // Validate date
    const dateStr = row.date;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error(
        `Invalid date format at row ${rowNumber}: ${dateStr}. Use YYYY-MM-DD format.`
      );
    }

    // Validate amount
    if (typeof row.amount !== 'number' || isNaN(row.amount) || row.amount <= 0) {
      throw new Error(
        `Invalid amount at row ${rowNumber}: ${row.amount}. Amount must be a positive number.`
      );
    }

    // Validate type
    const type = row.type?.toLowerCase();
    if (!['income', 'expense'].includes(type)) {
      throw new Error(
        `Invalid type at row ${rowNumber}: "${row.type}". Must be either 'income' or 'expense'.`
      );
    }

    // Validate category
    if (!row.category || typeof row.category !== 'string' || !row.category.trim()) {
      throw new Error(
        `Invalid category at row ${rowNumber}: "${row.category}". Category cannot be empty.`
      );
    }

    return {
      date: date.toISOString().split('T')[0],
      amount: row.amount,
      category: row.category.trim(),
      type: type as 'income' | 'expense'
    };
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const cibilScore = Number(formData.get('cibilScore'));
    const financialGoals = formData.get('financialGoals') as string;
    const file = formData.get('transactionFile') as File;

    // Validate basic inputs
    if (!cibilScore || cibilScore < 300 || cibilScore > 900) {
      return NextResponse.json({ 
        error: "Please enter a valid CIBIL score between 300 and 900." 
      }, { status: 400 });
    }

    if (!financialGoals?.trim()) {
      return NextResponse.json({ 
        error: "Please enter your financial goals." 
      }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ 
        error: "Please upload a transaction file." 
      }, { status: 400 });
    }

    // Read file contents
    const fileContents = await file.text();
    
    // Parse and validate CSV
    let transactions: Transaction[];
    try {
      transactions = validateAndTransformCSV(fileContents);
    } catch (error) {
      console.error('CSV Processing Error:', error);
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : 'Failed to process CSV file'
      }, { status: 400 });
    }

    const advisor = new IndianFinvestAdvisor();
    const analysis = advisor.analyzeTransactions(transactions);
    const riskProfile = advisor.getCibilRiskProfile(cibilScore);

    const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
    
    const prompt = `Act as an experienced Indian financial advisor and provide personalized advice based on:
    
    CIBIL Score: ${cibilScore}
    Risk Profile: ${riskProfile}
    Financial Goals: ${financialGoals}
    Monthly Income: ${analysis.income}
    Monthly Expenses: ${analysis.expenses}
    Monthly Savings Potential: ${analysis.savings_potential}
    
    Format your response as follows:
    
    1. CREDIT PROFILE ANALYSIS
    • Credit Score Status
    • Improvement Steps
    • Credit Management
    
    2. INVESTMENT STRATEGY
    • Recommended Portfolio
    • Tax-Saving Options
    • Investment Timeline
    
    3. FINANCIAL GOALS PLANNING
    • Short-term Goals (0-2 years)
    • Medium-term Goals (2-5 years)
    • Long-term Goals (5+ years)
    
    4. RISK MANAGEMENT
    • Insurance Needs
    • Emergency Fund
    • Debt Management
    
    5. ACTION ITEMS
    • Immediate Steps (Next 30 days)
    • Short-term Actions (Next 3-6 months)
    • Regular Review Points`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const cleanedResponse = text
      .replace(/\*\*/g, '')
      .replace(/\* \*/g, '•')
      .replace(/:\*\*/g, ':');

    const sections = cleanedResponse.split('\n\n');
    const formattedSections = sections
      .filter(section => section.trim())
      .map(section => section.replace(/•/g, '\n  •'));

    const finalResponse = formattedSections.join('\n\n');

    return NextResponse.json({ advice: finalResponse });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: "An error occurred while processing your request." }, { status: 500 });
  }
}