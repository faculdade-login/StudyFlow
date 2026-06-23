/**
 * Leitura e escrita de dados no Supabase.
 */

import { supabase } from './supabase-client.js';
import { calcHoursStudied } from './utils.js';

function mapProfile(row, email = '') {
  return {
    id: row.id,
    name: row.name,
    email,
    isAccount: true,
    lessonsCompleted: row.lessons_completed ?? 0,
    hoursStudied: Number(row.hours_studied ?? 0)
  };
}

function mapCourse(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    platform: row.platform,
    deadline: row.deadline,
    workloadHours: row.workload_hours != null ? Number(row.workload_hours) : null,
    createdAt: row.created_at
  };
}

function mapModule(row) {
  return {
    id: row.id,
    courseId: row.course_id,
    name: row.name,
    order: row.sort_order ?? 0
  };
}

function mapLesson(row) {
  return {
    id: row.id,
    moduleId: row.module_id,
    name: row.name,
    order: row.sort_order ?? 0,
    completed: row.completed ?? false,
    completedAt: row.completed_at
  };
}

function mapActivity(row) {
  return {
    id: row.id,
    courseId: row.course_id,
    name: row.name,
    description: row.description,
    completed: row.completed ?? false,
    createdAt: row.created_at
  };
}

function mapFinanceSettings(row) {
  return {
    userId: row.user_id,
    monthlySalary: Number(row.monthly_salary ?? 0),
    currentSavings: Number(row.current_savings ?? 0)
  };
}

function mapIncome(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    amount: Number(row.amount),
    date: row.date
  };
}

function mapMonthlyBill(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    amount: Number(row.amount),
    dueDay: row.due_day,
    isSuperfluous: row.is_superfluous ?? false,
    paid: row.paid ?? false,
    paidMonth: row.paid_month
  };
}

function mapDebt(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    amount: Number(row.amount),
    dueDate: row.due_date,
    isSuperfluous: row.is_superfluous ?? false,
    paid: row.paid ?? false,
    paidAt: row.paid_at
  };
}

function mapExpense(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    amount: Number(row.amount),
    date: row.date,
    category: row.category
  };
}

function mapGoal(row) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    targetAmount: Number(row.target_amount),
    currentAmount: Number(row.current_amount ?? 0),
    createdAt: row.created_at
  };
}

export async function fetchRankingUsers() {
  const { data, error } = await supabase
    .from('ranking')
    .select('id, name, lessons_completed, hours_studied');

  if (error) throw error;

  return (data ?? []).map(row => mapProfile(row));
}

export async function fetchUserData(userId, email = '') {
  const [
    profileRes,
    coursesRes,
    settingsRes,
    incomesRes,
    billsRes,
    debtsRes,
    expensesRes,
    goalsRes
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('courses').select('*').eq('user_id', userId),
    supabase.from('finance_settings').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('finance_incomes').select('*').eq('user_id', userId),
    supabase.from('finance_monthly_bills').select('*').eq('user_id', userId),
    supabase.from('finance_debts').select('*').eq('user_id', userId),
    supabase.from('finance_expenses').select('*').eq('user_id', userId),
    supabase.from('finance_goals').select('*').eq('user_id', userId)
  ]);

  const errors = [
    profileRes.error,
    coursesRes.error,
    settingsRes.error,
    incomesRes.error,
    billsRes.error,
    debtsRes.error,
    expensesRes.error,
    goalsRes.error
  ].filter(Boolean);

  if (errors.length) throw errors[0];

  const courses = (coursesRes.data ?? []).map(mapCourse);
  const courseIds = courses.map(c => c.id);

  const [modulesRes, activitiesRes] = await Promise.all([
    courseIds.length
      ? supabase.from('modules').select('*').in('course_id', courseIds)
      : Promise.resolve({ data: [], error: null }),
    courseIds.length
      ? supabase.from('activities').select('*').in('course_id', courseIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  if (modulesRes.error) throw modulesRes.error;
  if (activitiesRes.error) throw activitiesRes.error;

  const modules = (modulesRes.data ?? []).map(mapModule);
  const moduleIds = modules.map(m => m.id);

  const lessonsRes = moduleIds.length
    ? await supabase.from('lessons').select('*').in('module_id', moduleIds)
    : { data: [], error: null };

  if (lessonsRes.error) throw lessonsRes.error;

  const profile = profileRes.data
    ? mapProfile(profileRes.data, email)
    : mapProfile({ id: userId, name: 'Usuario', lessons_completed: 0, hours_studied: 0 }, email);

  return {
    currentUserId: userId,
    users: [profile],
    courses,
    modules,
    lessons: (lessonsRes.data ?? []).map(mapLesson),
    activities: (activitiesRes.data ?? []).map(mapActivity),
    financeSettings: settingsRes.data ? [mapFinanceSettings(settingsRes.data)] : [],
    financeIncomes: (incomesRes.data ?? []).map(mapIncome),
    financeMonthlyBills: (billsRes.data ?? []).map(mapMonthlyBill),
    financeDebts: (debtsRes.data ?? []).map(mapDebt),
    financeExpenses: (expensesRes.data ?? []).map(mapExpense),
    financeGoals: (goalsRes.data ?? []).map(mapGoal)
  };
}

export async function syncProfileStats(userId, lessonsCompleted, hoursStudied) {
  const { error } = await supabase
    .from('profiles')
    .update({
      lessons_completed: lessonsCompleted,
      hours_studied: hoursStudied,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (error) throw error;
}

export async function updateProfileName(userId, name) {
  const { error } = await supabase
    .from('profiles')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw error;
}

export async function insertCourse(userId, course) {
  const { data, error } = await supabase
    .from('courses')
    .insert({
      user_id: userId,
      name: course.name,
      description: course.description,
      platform: course.platform,
      deadline: course.deadline || null,
      workload_hours: course.workloadHours
    })
    .select()
    .single();

  if (error) throw error;
  return mapCourse(data);
}

export async function updateCourseRow(courseId, updates) {
  const payload = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.platform !== undefined) payload.platform = updates.platform;
  if (updates.deadline !== undefined) payload.deadline = updates.deadline || null;
  if (updates.workloadHours !== undefined) payload.workload_hours = updates.workloadHours;

  const { error } = await supabase.from('courses').update(payload).eq('id', courseId);
  if (error) throw error;
}

export async function deleteCourseRow(courseId) {
  const { error } = await supabase.from('courses').delete().eq('id', courseId);
  if (error) throw error;
}

export async function insertModule(courseId, module) {
  const { data, error } = await supabase
    .from('modules')
    .insert({ course_id: courseId, name: module.name, sort_order: module.order ?? 0 })
    .select()
    .single();

  if (error) throw error;
  return mapModule(data);
}

export async function updateModuleRow(moduleId, updates) {
  const { error } = await supabase
    .from('modules')
    .update({ name: updates.name })
    .eq('id', moduleId);

  if (error) throw error;
}

export async function deleteModuleRow(moduleId) {
  const { error } = await supabase.from('modules').delete().eq('id', moduleId);
  if (error) throw error;
}

export async function insertLesson(moduleId, lesson) {
  const { data, error } = await supabase
    .from('lessons')
    .insert({
      module_id: moduleId,
      name: lesson.name,
      sort_order: lesson.order ?? 0,
      completed: lesson.completed ?? false,
      completed_at: lesson.completedAt ?? null
    })
    .select()
    .single();

  if (error) throw error;
  return mapLesson(data);
}

export async function insertLessonsBatch(moduleId, lessons) {
  if (!lessons.length) return [];

  const rows = lessons.map((lesson, index) => ({
    module_id: moduleId,
    name: lesson.name,
    sort_order: lesson.order ?? index,
    completed: lesson.completed ?? false,
    completed_at: lesson.completedAt ?? null
  }));

  const { data, error } = await supabase.from('lessons').insert(rows).select();
  if (error) throw error;
  return (data ?? []).map(mapLesson);
}

export async function updateLessonRow(lessonId, updates) {
  const payload = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.completed !== undefined) payload.completed = updates.completed;
  if (updates.completedAt !== undefined) payload.completed_at = updates.completedAt;

  const { error } = await supabase.from('lessons').update(payload).eq('id', lessonId);
  if (error) throw error;
}

export async function deleteLessonRow(lessonId) {
  const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
  if (error) throw error;
}

export async function insertActivity(courseId, activity) {
  const { data, error } = await supabase
    .from('activities')
    .insert({
      course_id: courseId,
      name: activity.name,
      description: activity.description,
      completed: activity.completed ?? false
    })
    .select()
    .single();

  if (error) throw error;
  return mapActivity(data);
}

export async function updateActivityRow(activityId, updates) {
  const payload = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.completed !== undefined) payload.completed = updates.completed;

  const { error } = await supabase.from('activities').update(payload).eq('id', activityId);
  if (error) throw error;
}

export async function deleteActivityRow(activityId) {
  const { error } = await supabase.from('activities').delete().eq('id', activityId);
  if (error) throw error;
}

export async function upsertFinanceSettings(userId, updates) {
  const { error } = await supabase
    .from('finance_settings')
    .upsert({
      user_id: userId,
      monthly_salary: updates.monthlySalary ?? 0,
      current_savings: updates.currentSavings ?? 0,
      updated_at: new Date().toISOString()
    });

  if (error) throw error;
}

export async function insertIncome(userId, income) {
  const { data, error } = await supabase
    .from('finance_incomes')
    .insert({ user_id: userId, name: income.name, amount: income.amount, date: income.date })
    .select()
    .single();

  if (error) throw error;
  return mapIncome(data);
}

export async function updateIncomeRow(incomeId, updates) {
  const { error } = await supabase
    .from('finance_incomes')
    .update({ name: updates.name, amount: updates.amount, date: updates.date })
    .eq('id', incomeId);

  if (error) throw error;
}

export async function deleteIncomeRow(incomeId) {
  const { error } = await supabase.from('finance_incomes').delete().eq('id', incomeId);
  if (error) throw error;
}

export async function insertMonthlyBill(userId, bill) {
  const { data, error } = await supabase
    .from('finance_monthly_bills')
    .insert({
      user_id: userId,
      name: bill.name,
      amount: bill.amount,
      due_day: bill.dueDay,
      is_superfluous: bill.isSuperfluous ?? false,
      paid: bill.paid ?? false,
      paid_month: bill.paidMonth ?? null
    })
    .select()
    .single();

  if (error) throw error;
  return mapMonthlyBill(data);
}

export async function updateMonthlyBillRow(billId, updates) {
  const payload = { ...updates };
  if (payload.dueDay !== undefined) {
    payload.due_day = payload.dueDay;
    delete payload.dueDay;
  }
  if (payload.isSuperfluous !== undefined) {
    payload.is_superfluous = payload.isSuperfluous;
    delete payload.isSuperfluous;
  }
  if (payload.paidMonth !== undefined) {
    payload.paid_month = payload.paidMonth;
    delete payload.paidMonth;
  }

  const { error } = await supabase.from('finance_monthly_bills').update(payload).eq('id', billId);
  if (error) throw error;
}

export async function deleteMonthlyBillRow(billId) {
  const { error } = await supabase.from('finance_monthly_bills').delete().eq('id', billId);
  if (error) throw error;
}

export async function insertDebt(userId, debt) {
  const { data, error } = await supabase
    .from('finance_debts')
    .insert({
      user_id: userId,
      name: debt.name,
      amount: debt.amount,
      due_date: debt.dueDate,
      is_superfluous: debt.isSuperfluous ?? false,
      paid: debt.paid ?? false,
      paid_at: debt.paidAt ?? null
    })
    .select()
    .single();

  if (error) throw error;
  return mapDebt(data);
}

export async function updateDebtRow(debtId, updates) {
  const payload = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.amount !== undefined) payload.amount = updates.amount;
  if (updates.dueDate !== undefined) payload.due_date = updates.dueDate;
  if (updates.isSuperfluous !== undefined) payload.is_superfluous = updates.isSuperfluous;
  if (updates.paid !== undefined) payload.paid = updates.paid;
  if (updates.paidAt !== undefined) payload.paid_at = updates.paidAt;

  const { error } = await supabase.from('finance_debts').update(payload).eq('id', debtId);
  if (error) throw error;
}

export async function deleteDebtRow(debtId) {
  const { error } = await supabase.from('finance_debts').delete().eq('id', debtId);
  if (error) throw error;
}

export async function insertExpense(userId, expense) {
  const { data, error } = await supabase
    .from('finance_expenses')
    .insert({
      user_id: userId,
      name: expense.name,
      amount: expense.amount,
      date: expense.date,
      category: expense.category ?? null
    })
    .select()
    .single();

  if (error) throw error;
  return mapExpense(data);
}

export async function updateExpenseRow(expenseId, updates) {
  const { error } = await supabase
    .from('finance_expenses')
    .update({
      name: updates.name,
      amount: updates.amount,
      date: updates.date,
      category: updates.category ?? null
    })
    .eq('id', expenseId);

  if (error) throw error;
}

export async function deleteExpenseRow(expenseId) {
  const { error } = await supabase.from('finance_expenses').delete().eq('id', expenseId);
  if (error) throw error;
}

export async function insertGoal(userId, goal) {
  const { data, error } = await supabase
    .from('finance_goals')
    .insert({
      user_id: userId,
      name: goal.name,
      target_amount: goal.targetAmount,
      current_amount: goal.currentAmount ?? 0
    })
    .select()
    .single();

  if (error) throw error;
  return mapGoal(data);
}

export async function updateGoalRow(goalId, updates) {
  const payload = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.targetAmount !== undefined) payload.target_amount = updates.targetAmount;
  if (updates.currentAmount !== undefined) payload.current_amount = updates.currentAmount;

  const { error } = await supabase.from('finance_goals').update(payload).eq('id', goalId);
  if (error) throw error;
}

export async function deleteGoalRow(goalId) {
  const { error } = await supabase.from('finance_goals').delete().eq('id', goalId);
  if (error) throw error;
}

export function recalculateAndGetStats(data, userId) {
  const userCourses = data.courses.filter(c => c.userId === userId);
  let totalLessons = 0;

  userCourses.forEach(course => {
    const moduleIds = data.modules.filter(m => m.courseId === course.id).map(m => m.id);
    const lessons = data.lessons.filter(l => moduleIds.includes(l.moduleId));
    totalLessons += lessons.filter(l => l.completed).length;
  });

  const hoursStudied = userCourses.length > 0
    ? calcHoursStudied(userCourses, courseId => {
        const moduleIds = data.modules.filter(m => m.courseId === courseId).map(m => m.id);
        return data.lessons.filter(l => moduleIds.includes(l.moduleId));
      })
    : 0;

  return { lessonsCompleted: totalLessons, hoursStudied };
}
