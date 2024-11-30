'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Home() {
  const [cibilScore, setCibilScore] = useState(750);
  const [financialGoals, setFinancialGoals] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [advice, setAdvice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('cibilScore', cibilScore.toString());
      formData.append('financialGoals', financialGoals);
      if (file) formData.append('transactionFile', file);

      const response = await fetch('/api/financial-advice', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get financial advice');
      }

      setAdvice(data.advice);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">
              🌟 Finvest - Your Indian AI Financial Advisor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium">CIBIL Score (300-900)</label>
                <Slider
                  value={[cibilScore]}
                  onValueChange={([value]) => setCibilScore(value)}
                  min={300}
                  max={900}
                  step={1}
                  className="w-full"
                />
                <span className="block text-sm text-gray-500 text-right">{cibilScore}</span>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Financial Goals</label>
                <Textarea
                  value={financialGoals}
                  onChange={(e) => setFinancialGoals(e.target.value)}
                  placeholder="E.g., Save for children's education, Buy a house, Plan for retirement"
                  className="w-full"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Transaction History (CSV)</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="whitespace-nowrap"
                    onClick={() => {
                      const sampleData = `date,amount,category,type
2024-01-01,50000,Salary,income
2024-01-02,15000,Housing,expense
2024-01-03,5000,Food,expense
2024-01-04,3000,Transportation,expense
2024-01-05,2000,Utilities,expense`;
                      
                      const blob = new Blob([sampleData], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'sample_transactions.csv';
                      a.click();
                      window.URL.revokeObjectURL(url);
                    }}
                  >
                    Download Sample
                  </Button>
                </div>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>CSV must contain columns: date (YYYY-MM-DD), amount (in INR), category, type (income/expense)</p>
                  <p>Common categories: Housing, Food, Transportation, Utilities, Entertainment, Shopping, Healthcare, Education</p>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? 'Getting Advice...' : 'Get Financial Advice'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {advice && (
          <Card>
            <CardHeader>
              <CardTitle>Your Personalized Financial Advice</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap font-sans">{advice}</pre>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>💡 Important Information</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2">
              <li>CIBIL Score ranges from 300-900</li>
              <li>Higher score indicates better creditworthiness</li>
              <li>Regular monitoring of CIBIL score is recommended</li>
              <li>Keep your transaction history up to date for better advice</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}