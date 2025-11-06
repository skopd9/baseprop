import React, { useState, useEffect } from 'react';
import { ReceiptPercentIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { ExpenseService, Expense } from '../services/ExpenseService';

interface ExpensesSummaryWidgetProps {
  onViewExpenses?: () => void;
}

export const ExpensesSummaryWidget: React.FC<ExpensesSummaryWidgetProps> = ({ onViewExpenses }) => {
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadExpensesSummary();
  }, []);

  const loadExpensesSummary = async () => {
    try {
      const expenses = await ExpenseService.getExpenses();
      
      // Get current month's expenses
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.expenseDate);
        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
      });

      // Get recent expenses (last 5)
      const recent = expenses.slice(0, 5);
      
      setRecentExpenses(recent);
      setMonthlyTotal(monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0));
    } catch (error) {
      console.error('Error loading expenses summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-[400px]">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-[400px]">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <ReceiptPercentIcon className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Expenses</h3>
            <p className="text-sm text-gray-600">This month: £{monthlyTotal.toLocaleString()}</p>
          </div>
        </div>
        {onViewExpenses && (
          <button
            onClick={onViewExpenses}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
          >
            View All
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {recentExpenses.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm mb-3">No expenses recorded yet</p>
          <button
            onClick={onViewExpenses}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Add your first expense →
          </button>
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto pr-2 flex-1 min-h-0">
          <h4 className="text-sm font-medium text-gray-700 flex-shrink-0">Recent Expenses</h4>
          <div className="space-y-2">
            {recentExpenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {expense.description}
                  </p>
                  <p className="text-xs text-gray-500">
                    {expense.category} • {new Date(expense.expenseDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-sm font-semibold text-gray-900 ml-2">
                  £{expense.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
          
          {recentExpenses.length >= 5 && (
            <button
              onClick={onViewExpenses}
              className="w-full text-center text-blue-600 hover:text-blue-700 text-sm font-medium py-2 flex-shrink-0"
            >
              View all expenses →
            </button>
          )}
        </div>
      )}
    </div>
  );
};