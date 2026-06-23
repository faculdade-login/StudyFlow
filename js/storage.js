/**
 * Camada de persistencia com Supabase.
 */

import { supabase } from './supabase-client.js';
import {
  fetchUserData,
  fetchRankingUsers,
  syncProfileStats,
  updateProfileName,
  insertCourse,
  updateCourseRow,
  deleteCourseRow,
  insertModule,
  updateModuleRow,
  deleteModuleRow,
  insertLesson,
  updateLessonRow,
  deleteLessonRow,
  insertActivity,
  updateActivityRow,
  deleteActivityRow,
  recalculateAndGetStats
} from './supabase-data.js';

let cachedData = defaultData();

function defaultData() {
  return {
    currentUserId: null,
    users: [],
    courses: [],
    modules: [],
    lessons: [],
    activities: [],
    financeSettings: [],
    financeIncomes: [],
    financeMonthlyBills: [],
    financeDebts: [],
    financeExpenses: [],
    financeGoals: []
  };
}

function migrateFinanceData(data) {
  if (!data.financeSettings) data.financeSettings = [];
  if (!data.financeIncomes) data.financeIncomes = [];
  if (!data.financeMonthlyBills) data.financeMonthlyBills = [];
  if (!data.financeDebts) data.financeDebts = [];
  if (!data.financeExpenses) data.financeExpenses = [];
  if (!data.financeGoals) data.financeGoals = [];
  return data;
}

export function loadData() {
  return cachedData;
}

export async function hydrateData(userId, email = '') {
  cachedData = migrateFinanceData(await fetchUserData(userId, email));
  return cachedData;
}

export async function refreshRanking() {
  try {
    cachedData.users = await fetchRankingUsers();
    const user = getCurrentUser(cachedData);
    if (user && !cachedData.users.some(u => u.id === user.id)) {
      cachedData.users.push(user);
    }
  } catch {
    // ranking opcional se a view ainda nao existir
  }
}

export function generateId() {
  return crypto.randomUUID();
}

export function saveData(data) {
  cachedData = data;
}

export function getSession() {
  return { isLoggedIn: !!cachedData.currentUserId, userId: cachedData.currentUserId };
}

export function isLoggedIn() {
  return !!cachedData.currentUserId;
}

function mapAuthError(message) {
  if (!message) return 'Nao foi possivel concluir a operacao.';
  if (message.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (message.includes('User already registered')) return 'Este e-mail ja esta em uso.';
  if (message.includes('Email not confirmed')) {
    return 'E-mail ainda nao confirmado. Desative "Confirm email" no Supabase ou use o link enviado ao seu e-mail.';
  }
  if (message.includes('Email logins are disabled')) {
    return 'Login por e-mail desativado no Supabase. Ative em Authentication → Providers → Email.';
  }
  return message;
}

async function completeAuthAfterSignUp(email, password) {
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (signInError) {
    return { success: false, error: mapAuthError(signInError.message) };
  }

  await hydrateData(signInData.user.id, signInData.user.email ?? email);
  return { success: true, user: getCurrentUser(cachedData) };
}

export async function loginUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password
  });

  if (error) {
    return { success: false, error: mapAuthError(error.message) };
  }

  await hydrateData(data.user.id, data.user.email ?? '');
  return { success: true, user: getCurrentUser(cachedData) };
}

export async function registerUser({ name, email, password }) {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();

  if (!trimmedName) {
    return { success: false, error: 'Informe seu nome.' };
  }

  if (!trimmedEmail) {
    return { success: false, error: 'Informe seu e-mail.' };
  }

  if (password.length < 6) {
    return { success: false, error: 'A senha deve ter no minimo 6 caracteres.' };
  }

  const { data, error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
    options: {
      data: { name: trimmedName },
      emailRedirectTo: `${window.location.origin}/`
    }
  });

  if (error) {
    return { success: false, error: mapAuthError(error.message) };
  }

  if (data.session) {
    await hydrateData(data.user.id, trimmedEmail);
    return { success: true, user: getCurrentUser(cachedData) };
  }

  if (data.user) {
    const result = await completeAuthAfterSignUp(trimmedEmail, password);
    if (!result.success && result.error?.includes('nao confirmado')) {
      return {
        success: false,
        error: 'Conta criada. No Supabase, desative "Confirm email" (Authentication → Providers → Email) e cadastre-se de novo, ou confirme o e-mail e faca login.'
      };
    }
    return result;
  }

  return { success: false, error: 'Nao foi possivel concluir o cadastro.' };
}

export async function logoutUser() {
  await supabase.auth.signOut();
  cachedData = defaultData();
}

export async function restoreSessionUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return false;

  await hydrateData(session.user.id, session.user.email ?? '');
  return true;
}

/** Trata retorno do link de confirmacao de e-mail na URL (#error=... ou sessao). */
export async function handleAuthRedirect() {
  const hash = window.location.hash;
  if (!hash || hash.length <= 1) {
    return { status: 'none' };
  }

  const params = new URLSearchParams(hash.slice(1));
  window.history.replaceState(null, '', window.location.pathname + window.location.search);

  const errorDesc = params.get('error_description');
  const errorCode = params.get('error_code');

  if (errorDesc || params.get('error')) {
    const raw = errorDesc || params.get('error');
    const msg = decodeURIComponent(raw.replace(/\+/g, ' '));
    if (errorCode === 'otp_expired' || /expired|invalid/i.test(msg)) {
      return {
        status: 'error',
        message: 'Link de confirmacao expirado ou ja usado. Faca login com e-mail e senha, ou desative "Confirm email" no Supabase e cadastre-se de novo.'
      };
    }
    return { status: 'error', message: msg };
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    await hydrateData(session.user.id, session.user.email ?? '');
    return { status: 'session' };
  }

  return { status: 'none' };
}

export function getCurrentUser(data) {
  if (!data.currentUserId) return null;
  return data.users.find(u => u.id === data.currentUserId) || null;
}

export function getCoursesByUser(data, userId) {
  return data.courses.filter(c => c.userId === userId);
}

export function getModulesByCourse(data, courseId) {
  return data.modules
    .filter(m => m.courseId === courseId)
    .sort((a, b) => a.order - b.order);
}

export function getLessonsByModule(data, moduleId) {
  return data.lessons
    .filter(l => l.moduleId === moduleId)
    .sort((a, b) => a.order - b.order);
}

export function getLessonsByCourse(data, courseId) {
  const moduleIds = getModulesByCourse(data, courseId).map(m => m.id);
  return data.lessons.filter(l => moduleIds.includes(l.moduleId));
}

export function getActivitiesByCourse(data, courseId) {
  return data.activities
    .filter(a => a.courseId === courseId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getCourseById(data, courseId) {
  return data.courses.find(c => c.id === courseId);
}

export function getModuleById(data, moduleId) {
  return data.modules.find(m => m.id === moduleId);
}

export function getLessonById(data, lessonId) {
  return data.lessons.find(l => l.id === lessonId);
}

export function getActivityById(data, activityId) {
  return data.activities.find(a => a.id === activityId);
}

async function pushUserStats(data, userId) {
  const stats = recalculateAndGetStats(data, userId);
  const userIndex = data.users.findIndex(u => u.id === userId);
  if (userIndex !== -1) {
    data.users[userIndex].lessonsCompleted = stats.lessonsCompleted;
    data.users[userIndex].hoursStudied = stats.hoursStudied;
  }
  await syncProfileStats(userId, stats.lessonsCompleted, stats.hoursStudied);
}

export async function addCourse(data, course) {
  const created = await insertCourse(data.currentUserId, course);
  data.courses.push(created);
  await pushUserStats(data, data.currentUserId);
  return created;
}

export async function updateCourse(data, courseId, updates) {
  const index = data.courses.findIndex(c => c.id === courseId);
  if (index === -1) return null;
  await updateCourseRow(courseId, updates);
  data.courses[index] = { ...data.courses[index], ...updates };
  await pushUserStats(data, data.currentUserId);
  return data.courses[index];
}

export async function deleteCourse(data, courseId) {
  const moduleIds = data.modules.filter(m => m.courseId === courseId).map(m => m.id);
  await deleteCourseRow(courseId);
  data.lessons = data.lessons.filter(l => !moduleIds.includes(l.moduleId));
  data.modules = data.modules.filter(m => m.courseId !== courseId);
  data.activities = data.activities.filter(a => a.courseId !== courseId);
  data.courses = data.courses.filter(c => c.id !== courseId);
  await pushUserStats(data, data.currentUserId);
}

export async function addModule(data, module) {
  const created = await insertModule(module.courseId, module);
  data.modules.push(created);
  return created;
}

export async function updateModule(data, moduleId, updates) {
  const index = data.modules.findIndex(m => m.id === moduleId);
  if (index === -1) return null;
  await updateModuleRow(moduleId, updates);
  data.modules[index] = { ...data.modules[index], ...updates };
  return data.modules[index];
}

export async function deleteModule(data, moduleId) {
  await deleteModuleRow(moduleId);
  data.lessons = data.lessons.filter(l => l.moduleId !== moduleId);
  data.modules = data.modules.filter(m => m.id !== moduleId);
  await pushUserStats(data, data.currentUserId);
}

export async function addLesson(data, lesson) {
  const created = await insertLesson(lesson.moduleId, lesson);
  data.lessons.push(created);
  await pushUserStats(data, data.currentUserId);
  return created;
}

export async function updateLesson(data, lessonId, updates) {
  const index = data.lessons.findIndex(l => l.id === lessonId);
  if (index === -1) return null;
  await updateLessonRow(lessonId, updates);
  data.lessons[index] = { ...data.lessons[index], ...updates };
  await pushUserStats(data, data.currentUserId);
  return data.lessons[index];
}

export async function deleteLesson(data, lessonId) {
  await deleteLessonRow(lessonId);
  data.lessons = data.lessons.filter(l => l.id !== lessonId);
  await pushUserStats(data, data.currentUserId);
}

export async function addActivity(data, activity) {
  const created = await insertActivity(activity.courseId, activity);
  data.activities.push(created);
  return created;
}

export async function updateActivity(data, activityId, updates) {
  const index = data.activities.findIndex(a => a.id === activityId);
  if (index === -1) return null;
  await updateActivityRow(activityId, updates);
  data.activities[index] = { ...data.activities[index], ...updates };
  return data.activities[index];
}

export async function deleteActivity(data, activityId) {
  await deleteActivityRow(activityId);
  data.activities = data.activities.filter(a => a.id !== activityId);
}

export function recalculateUserStats(data, userId) {
  const stats = recalculateAndGetStats(data, userId);
  const userIndex = data.users.findIndex(u => u.id === userId);
  if (userIndex === -1) return;
  data.users[userIndex].lessonsCompleted = stats.lessonsCompleted;
  data.users[userIndex].hoursStudied = stats.hoursStudied;
}

export function recalculateAllUsersStats(data) {
  if (data.currentUserId) {
    recalculateUserStats(data, data.currentUserId);
  }
}

export function recalculateUserLessons(data, userId) {
  recalculateUserStats(data, userId);
}

export async function toggleLesson(data, lessonId) {
  const lesson = getLessonById(data, lessonId);
  if (!lesson) return null;

  const completed = !lesson.completed;
  return updateLesson(data, lessonId, {
    completed,
    completedAt: completed ? new Date().toISOString() : null
  });
}

export async function toggleActivity(data, activityId) {
  const activity = getActivityById(data, activityId);
  if (!activity) return null;

  return updateActivity(data, activityId, {
    completed: !activity.completed
  });
}

export async function updateUserName(data, userId, name) {
  await updateProfileName(userId, name);
  const index = data.users.findIndex(u => u.id === userId);
  if (index === -1) return null;
  data.users[index].name = name;
  return data.users[index];
}

export async function updateUserProfile(data, userId, { name, email }) {
  const trimmedEmail = email.trim().toLowerCase();
  const index = data.users.findIndex(u => u.id === userId);
  if (index === -1) return { success: false, error: 'Usuario nao encontrado.' };

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (profileError) {
    return { success: false, error: profileError.message };
  }

  const { error: emailError } = await supabase.auth.updateUser({ email: trimmedEmail });
  if (emailError) {
    return { success: false, error: mapAuthError(emailError.message) };
  }

  data.users[index].name = name.trim();
  data.users[index].email = trimmedEmail;
  return { success: true, user: data.users[index] };
}

export async function changeUserPassword(data, userId, currentPassword, newPassword) {
  const user = getCurrentUser(data);
  if (!user?.email) {
    return { success: false, error: 'Usuario nao encontrado.' };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword
  });

  if (signInError) {
    return { success: false, error: 'Senha atual incorreta.' };
  }

  if (newPassword.length < 6) {
    return { success: false, error: 'A nova senha deve ter no minimo 6 caracteres.' };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    return { success: false, error: mapAuthError(error.message) };
  }

  return { success: true };
}

export function getRanking(data) {
  return [...data.users]
    .filter(u => u.isAccount)
    .sort((a, b) => {
      const hoursDiff = (b.hoursStudied || 0) - (a.hoursStudied || 0);
      if (hoursDiff !== 0) return hoursDiff;
      return b.lessonsCompleted - a.lessonsCompleted;
    });
}
