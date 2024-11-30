import { RiskProfile, Transaction, TransactionAnalysis } from "./types";

export class IndianFinvestAdvisor {
    private risk_profiles: Record<string, RiskProfile> = {
      "Conservative": {
        "description": "Low-risk investments suitable for maintaining financial stability",
        "options": [
          "Fixed Deposits (FDs)",
          "Post Office Schemes",
          "Government Bonds",
          "Public Provident Fund (PPF)",
          "Blue-chip Stock SIPs"
        ]
      },
      "Moderate": {
        "description": "Balanced mix of secure and growth-oriented investments",
        "options": [
          "Mutual Funds (Large-cap)",
          "National Pension System (NPS)",
          "Corporate Bonds",
          "REITs",
          "Index Funds"
        ]
      },
      "Aggressive": {
        "description": "Growth-focused investments with higher risk tolerance",
        "options": [
          "Direct Equity",
          "Small & Mid-cap Funds",
          "International Funds",
          "Sectoral Funds",
          "Alternative Investments"
        ]
      }
    };
  
    getCibilRiskProfile(cibilScore: number): string {
      if (cibilScore >= 750) return "Aggressive";
      if (cibilScore >= 650) return "Moderate";
      return "Conservative";
    }
  
    analyzeTransactions(transactions: Transaction[]): TransactionAnalysis {
      const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  
      const monthlySpending = transactions.reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
        return acc;
      }, {} as Record<string, number>);
  
      const formattedSpending = Object.entries(monthlySpending).reduce((acc, [k, v]) => {
        acc[k] = formatCurrency(v);
        return acc;
      }, {} as Record<string, string>);
  
      const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
  
      const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
  
      const savingsPotential = totalIncome - totalExpenses;
  
      const expenseRatios = {
        Recommended: {
          'Housing': 30,
          'Transportation': 15,
          'Food': 20,
          'Utilities': 10,
          'Savings/Investment': 20,
          'Others': 5
        },
        Actual: {} as Record<string, number>
      };
  
      const expenseCategories = [...new Set(transactions
        .filter(t => t.type === 'expense')
        .map(t => t.category))];
  
      expenseCategories.forEach(category => {
        const categoryExpense = transactions
          .filter(t => t.type === 'expense' && t.category === category)
          .reduce((sum, t) => sum + t.amount, 0);
        expenseRatios.Actual[category] = (categoryExpense / totalExpenses) * 100;
      });
  
      return {
        monthly_spending: formattedSpending,
        savings_potential: formatCurrency(savingsPotential),
        income: formatCurrency(totalIncome),
        expenses: formatCurrency(totalExpenses),
        expense_ratios: expenseRatios
      };
    }
  }