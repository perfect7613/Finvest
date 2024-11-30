export interface RiskProfile {
    description: string;
    options: string[];
  }
  
  export interface TransactionAnalysis {
    monthly_spending: Record<string, string>;
    savings_potential: string;
    income: string;
    expenses: string;
    expense_ratios: {
      Recommended: Record<string, number>;
      Actual: Record<string, number>;
    };
  }
  
  export interface Transaction {
    date: string;
    amount: number;
    category: string;
    type: 'income' | 'expense';
  }