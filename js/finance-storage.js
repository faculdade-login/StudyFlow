/**
 * Persistencia financeira — Supabase (privado por usuario).
 */

import {
  upsertFinanceSettings,
  insertIncome,
  updateIncomeRow,
  deleteIncomeRow,
  insertMonthlyBill,
  updateMonthlyBillRow,
  deleteMonthlyBillRow,
  insertDebt,
  updateDebtRow,
  deleteDebtRow,
  insertExpense,
  updateExpenseRow,
  deleteExpenseRow,
  insertGoal,
  updateGoalRow,
  deleteGoalRow
} from './supabase-data.js';

export function getFinanceSettings(data, userId) {
  let settings = data.financeSettings.find(s => s.userId === userId);
  if (!settings) {
    settings = { userId, monthlySalary: 0, currentSavings: 0 };
    data.financeSettings.push(settings);
  }
  return settings;
}

export async function updateFinanceSettings(data, userId, updates) {
  const settings = getFinanceSettings(data, userId);
  Object.assign(settings, updates);
  await upsertFinanceSettings(userId, settings);
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

export async function addIncome(data, income) {
  const created = await insertIncome(data.currentUserId, income);
  data.financeIncomes.push(created);
  return created;
}

export async function updateIncome(data, incomeId, updates) {
  const index = data.financeIncomes.findIndex(i => i.id === incomeId);
  if (index === -1) return null;
  await updateIncomeRow(incomeId, updates);
  data.financeIncomes[index] = { ...data.financeIncomes[index], ...updates };
  return data.financeIncomes[index];
}

export async function deleteIncome(data, incomeId) {
  await deleteIncomeRow(incomeId);
  data.financeIncomes = data.financeIncomes.filter(i => i.id !== incomeId);
}

export async function addMonthlyBill(data, bill) {
  const created = await insertMonthlyBill(data.currentUserId, bill);
  data.financeMonthlyBills.push(created);
  return created;
}

export async function updateMonthlyBill(data, billId, updates) {
  const index = data.financeMonthlyBills.findIndex(b => b.id === billId);
  if (index === -1) return null;
  await updateMonthlyBillRow(billId, updates);
  data.financeMonthlyBills[index] = { ...data.financeMonthlyBills[index], ...updates };
  return data.financeMonthlyBills[index];
}

export async function deleteMonthlyBill(data, billId) {
  await deleteMonthlyBillRow(billId);
  data.financeMonthlyBills = data.financeMonthlyBills.filter(b => b.id !== billId);
}

export async function toggleMonthlyBillPaid(data, billId, monthKey) {
  const bill = data.financeMonthlyBills.find(b => b.id === billId);
  if (!bill) return null;

  if (bill.paidMonth === monthKey && bill.paid) {
    bill.paid = false;
    bill.paidMonth = null;
  } else {
    bill.paid = true;
    bill.paidMonth = monthKey;
  }

  await updateMonthlyBillRow(billId, { paid: bill.paid, paidMonth: bill.paidMonth });
  return bill;
}

export async function addDebt(data, debt) {
  const created = await insertDebt(data.currentUserId, debt);
  data.financeDebts.push(created);
  return created;
}

export async function updateDebt(data, debtId, updates) {
  const index = data.financeDebts.findIndex(d => d.id === debtId);
  if (index === -1) return null;
  await updateDebtRow(debtId, updates);
  data.financeDebts[index] = { ...data.financeDebts[index], ...updates };
  return data.financeDebts[index];
}

export async function deleteDebt(data, debtId) {
  await deleteDebtRow(debtId);
  data.financeDebts = data.financeDebts.filter(d => d.id !== debtId);
}

export async function toggleDebtPaid(data, debtId) {
  const debt = data.financeDebts.find(d => d.id === debtId);
  if (!debt) return null;
  debt.paid = !debt.paid;
  debt.paidAt = debt.paid ? new Date().toISOString() : null;
  await updateDebtRow(debtId, { paid: debt.paid, paidAt: debt.paidAt });
  return debt;
}

export async function addExpense(data, expense) {
  const created = await insertExpense(data.currentUserId, expense);
  data.financeExpenses.push(created);
  return created;
}

export async function updateExpense(data, expenseId, updates) {
  const index = data.financeExpenses.findIndex(e => e.id === expenseId);
  if (index === -1) return null;
  await updateExpenseRow(expenseId, updates);
  data.financeExpenses[index] = { ...data.financeExpenses[index], ...updates };
  return data.financeExpenses[index];
}

export async function deleteExpense(data, expenseId) {
  await deleteExpenseRow(expenseId);
  data.financeExpenses = data.financeExpenses.filter(e => e.id !== expenseId);
}

export async function addGoal(data, goal) {
  const created = await insertGoal(data.currentUserId, goal);
  data.financeGoals.push(created);
  return created;
}

export async function updateGoal(data, goalId, updates) {
  const index = data.financeGoals.findIndex(g => g.id === goalId);
  if (index === -1) return null;
  await updateGoalRow(goalId, updates);
  data.financeGoals[index] = { ...data.financeGoals[index], ...updates };
  return data.financeGoals[index];
}

export async function deleteGoal(data, goalId) {
  await deleteGoalRow(goalId);
  data.financeGoals = data.financeGoals.filter(g => g.id !== goalId);
}
