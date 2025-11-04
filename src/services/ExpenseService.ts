import { supabase } from '../lib/supabase';

export interface Expense {
  id: string;
  organizationId: string | null;
  userId: string | null;
  propertyId: string | null;
  category: string;
  subcategory?: string;
  description: string;
  amount: number;
  expenseDate: string;
  paymentMethod?: string;
  receiptUrl?: string;
  isTaxDeductible: boolean;
  vendorName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseData {
  organizationId: string;
  userId: string;
  propertyId?: string | null;
  category: string;
  subcategory?: string;
  description: string;
  amount: number;
  expenseDate: string;
  paymentMethod?: string;
  receiptUrl?: string;
  isTaxDeductible?: boolean;
  vendorName?: string;
  notes?: string;
}

export const EXPENSE_CATEGORIES = [
  'Maintenance',
  'Insurance', 
  'Council Tax',
  'Mortgage',
  'Legal',
  'Marketing',
  'Utilities',
  'Capex',
  'Professional Services',
  'Other'
] as const;

export const PAYMENT_METHODS = [
  'Cash',
  'Bank Transfer',
  'Credit Card',
  'Debit Card',
  'Cheque',
  'Direct Debit',
  'Other'
] as const;

export class ExpenseService {
  static async getExpenses(): Promise<Expense[]> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (error) {
        console.error('Error fetching expenses:', error);
        return [];
      }

      return data?.map(this.transformExpenseFromDB) || [];
    } catch (error) {
      console.error('Error in getExpenses:', error);
      return [];
    }
  }

  static async getExpensesByProperty(propertyId: string): Promise<Expense[]> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('property_id', propertyId)
        .order('expense_date', { ascending: false });

      if (error) {
        console.error('Error fetching property expenses:', error);
        return [];
      }

      return data?.map(this.transformExpenseFromDB) || [];
    } catch (error) {
      console.error('Error in getExpensesByProperty:', error);
      return [];
    }
  }

  static async createExpense(expenseData: CreateExpenseData): Promise<Expense | null> {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert([{
          organization_id: expenseData.organizationId,
          user_id: expenseData.userId,
          property_id: expenseData.propertyId || null,
          category: expenseData.category,
          subcategory: expenseData.subcategory || null,
          description: expenseData.description,
          amount: expenseData.amount,
          expense_date: expenseData.expenseDate,
          payment_method: expenseData.paymentMethod || null,
          receipt_url: expenseData.receiptUrl || null,
          is_tax_deductible: expenseData.isTaxDeductible ?? true,
          vendor_name: expenseData.vendorName || null,
          notes: expenseData.notes || null
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating expense:', error);
        return null;
      }

      return this.transformExpenseFromDB(data);
    } catch (error) {
      console.error('Error in createExpense:', error);
      return null;
    }
  }

  static async updateExpense(id: string, expenseData: Partial<CreateExpenseData>): Promise<Expense | null> {
    try {
      const updateData: any = {};
      
      if (expenseData.propertyId !== undefined) updateData.property_id = expenseData.propertyId;
      if (expenseData.category) updateData.category = expenseData.category;
      if (expenseData.subcategory !== undefined) updateData.subcategory = expenseData.subcategory;
      if (expenseData.description) updateData.description = expenseData.description;
      if (expenseData.amount !== undefined) updateData.amount = expenseData.amount;
      if (expenseData.expenseDate) updateData.expense_date = expenseData.expenseDate;
      if (expenseData.paymentMethod !== undefined) updateData.payment_method = expenseData.paymentMethod;
      if (expenseData.receiptUrl !== undefined) updateData.receipt_url = expenseData.receiptUrl;
      if (expenseData.isTaxDeductible !== undefined) updateData.is_tax_deductible = expenseData.isTaxDeductible;
      if (expenseData.vendorName !== undefined) updateData.vendor_name = expenseData.vendorName;
      if (expenseData.notes !== undefined) updateData.notes = expenseData.notes;

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('expenses')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating expense:', error);
        return null;
      }

      return this.transformExpenseFromDB(data);
    } catch (error) {
      console.error('Error in updateExpense:', error);
      return null;
    }
  }

  static async deleteExpense(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting expense:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteExpense:', error);
      return false;
    }
  }

  static async getExpensesSummary(year?: number): Promise<{
    totalExpenses: number;
    taxDeductibleExpenses: number;
    expensesByCategory: Record<string, number>;
    expensesByMonth: Record<string, number>;
  }> {
    try {
      let query = supabase.from('expenses').select('*');
      
      if (year) {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;
        query = query.gte('expense_date', startDate).lte('expense_date', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching expenses summary:', error);
        return {
          totalExpenses: 0,
          taxDeductibleExpenses: 0,
          expensesByCategory: {},
          expensesByMonth: {}
        };
      }

      const expenses = data || [];
      
      const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
      const taxDeductibleExpenses = expenses
        .filter(expense => expense.is_tax_deductible)
        .reduce((sum, expense) => sum + Number(expense.amount), 0);

      const expensesByCategory: Record<string, number> = {};
      const expensesByMonth: Record<string, number> = {};

      expenses.forEach(expense => {
        // Category breakdown
        const category = expense.category;
        expensesByCategory[category] = (expensesByCategory[category] || 0) + Number(expense.amount);

        // Monthly breakdown
        const month = new Date(expense.expense_date).toLocaleString('default', { month: 'long', year: 'numeric' });
        expensesByMonth[month] = (expensesByMonth[month] || 0) + Number(expense.amount);
      });

      return {
        totalExpenses,
        taxDeductibleExpenses,
        expensesByCategory,
        expensesByMonth
      };
    } catch (error) {
      console.error('Error in getExpensesSummary:', error);
      return {
        totalExpenses: 0,
        taxDeductibleExpenses: 0,
        expensesByCategory: {},
        expensesByMonth: {}
      };
    }
  }

  private static transformExpenseFromDB(dbExpense: any): Expense {
    return {
      id: dbExpense.id,
      organizationId: dbExpense.organization_id,
      userId: dbExpense.user_id,
      propertyId: dbExpense.property_id,
      category: dbExpense.category,
      subcategory: dbExpense.subcategory,
      description: dbExpense.description,
      amount: Number(dbExpense.amount),
      expenseDate: dbExpense.expense_date,
      paymentMethod: dbExpense.payment_method,
      receiptUrl: dbExpense.receipt_url,
      isTaxDeductible: dbExpense.is_tax_deductible,
      vendorName: dbExpense.vendor_name,
      notes: dbExpense.notes,
      createdAt: dbExpense.created_at,
      updatedAt: dbExpense.updated_at
    };
  }
}