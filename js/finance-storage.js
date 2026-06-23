/**
 * Persistencia financeira — dados privados por usuario (userId).
 */

import { generateId, saveData } from './storage.js';

export function getFinanceSettings(data, userId) {
  let settings = data.financeSettings.find(s => s.userId === userId);
  if (!settings) {
    settings = { userId, monthlySalary: 0, currentSavings: 0 };
    data.financeSettings.push(settings);
    saveData(data);
  }
  return settings;
}

export function updateFinanceSettings(data, userId, updates) {
  const settings = getFinanceSettings(data, userId);
  Object.assign(settings, updates);
  saveData(data);
  return settings;
}

function filterByUser(items, userId) {
  return items.filter(item => item.userId === userId);
}

export function getIncomesByUser(data, userId) {
  return filterByUser(data.financeIncomes, userId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function getMonthlyBillsByUser(data, userId) {
  return filterByUser(data.financeMonthlyBills, userId)
    .sort((a, b) => a.dueDay - b.dueDay);
}

export function getDebtsByUser(data, userId) {
  return filterByUser(data.financeDebts, userId)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
}

export function getExpensesByUser(data, userId) {
  return filterByUser(data.financeExpenses, userId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function getGoalsByUser(data, userId) {
  return filterByUser(data.financeGoals, userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function addIncome(data, income) {
  data.financeIncomes.push(income);
  saveData(data);
  return income;
}

export function updateIncome(data, incomeId, updates) {
  const index = data.financeIncomes.findIndex(i => i.id === incomeId);
  if (index === -1) return null;
  data.financeIncomes[index] = { ...data.financeIncomes[index], ...updates };
  saveData(data);
  return data.financeIncomes[index];
}

export function deleteIncome(data, incomeId) {
  data.financeIncomes = data.financeIncomes.filter(i => i.id !== incomeId);
  saveData(data);
}

export function addMonthlyBill(data, bill) {
  data.financeMonthlyBills.push(bill);
  saveData(data);
  return bill;
}

export function updateMonthlyBill(data, billId, updates) {
  const index = data.financeMonthlyBills.findIndex(b => b.id === billId);
  if (index === -1) return null;
  data.financeMonthlyBills[index] = { ...data.financeMonthlyBills[index], ...updates };
  saveData(data);
  return data.financeMonthlyBills[index];
}

export function deleteMonthlyBill(data, billId) {
  data.financeMonthlyBills = data.financeMonthlyBills.filter(b => b.id !== billId);
  saveData(data);
}

export function toggleMonthlyBillPaid(data, billId, monthKey) {
  const bill = data.financeMonthlyBills.find(b => b.id === billId);
  if (!bill) return null;

  if (bill.paidMonth === monthKey && bill.paid) {
    bill.paid = false;
    bill.paidMonth = null;
  } else {
    bill.paid = true;
    bill.paidMonth = monthKey;
  }

  saveData(data);
  return bill;
}

export function addDebt(data, debt) {
  data.financeDebts.push(debt);
  saveData(data);
  return debt;
}

export function updateDebt(data, debtId, updates) {
  const index = data.financeDebts.findIndex(d => d.id === debtId);
  if (index === -1) return null;
  data.financeDebts[index] = { ...data.financeDebts[index], ...updates };
  saveData(data);
  return data.financeDebts[index];
}

export function deleteDebt(data, debtId) {
  data.financeDebts = data.financeDebts.filter(d => d.id !== debtId);
  saveData(data);
}

export function toggleDebtPaid(data, debtId) {
  const debt = data.financeDebts.find(d => d.id === debtId);
  if (!debt) return null;
  debt.paid = !debt.paid;
  debt.paidAt = debt.paid ? new Date().toISOString() : null;
  saveData(data);
  return debt;
}

export function addExpense(data, expense) {
  data.financeExpenses.push(expense);
  saveData(data);
  return expense;
}

export function updateExpense(data, expenseId, updates) {
  const index = data.financeExpenses.findIndex(e => e.id === expenseId);
  if (index === -1) return null;
  data.financeExpenses[index] = { ...data.financeExpenses[index], ...updates };
  saveData(data);
  return data.financeExpenses[index];
}

export function deleteExpense(data, expenseId) {
  data.financeExpenses = data.financeExpenses.filter(e => e.id !== expenseId);
  saveData(data);
}

export function addGoal(data, goal) {
  data.financeGoals.push(goal);
  saveData(data);
  return goal;
}

export function updateGoal(data, goalId, updates) {
  const index = data.financeGoals.findIndex(g => g.id === goalId);
  if (index === -1) return null;
  data.financeGoals[index] = { ...data.financeGoals[index], ...updates };
  saveData(data);
  return data.financeGoals[index];
}

export function deleteGoal(data, goalId) {
  data.financeGoals = data.financeGoals.filter(g => g.id !== goalId);
  saveData(data);
}
