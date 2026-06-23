/**
 * Camada de persistencia local.
 * Estrutura preparada para migracao futura ao Supabase.
 */

import { calcHoursStudied } from './utils.js';

const STORAGE_KEY = 'studyflow_data';
const SESSION_KEY = 'studyflow_session';

const defaultData = () => ({
  currentUserId: null,
  users: [],
  courses: [],
  modules: [],
  lessons: [],
  activities: []
});

const DEMO_USER_IDS = new Set(['user-1', 'user-2', 'user-3', 'user-4']);
const DEMO_EMAIL = 'voce@studyflow.com';

function removeDemoData(data) {
  if (!Array.isArray(data.users)) {
    data.users = [];
    return;
  }
  const demoUserIds = new Set(
    data.users
      .filter(u => DEMO_USER_IDS.has(u.id) && (u.id !== 'user-1' || u.email?.toLowerCase() === DEMO_EMAIL))
      .map(u => u.id)
  );

  if (demoUserIds.size === 0) return;

  data.users = data.users.filter(u => !demoUserIds.has(u.id));
  data.courses = data.courses.filter(c => !demoUserIds.has(c.userId));

  const courseIds = new Set(data.courses.map(c => c.id));
  data.modules = data.modules.filter(m => courseIds.has(m.courseId));

  const moduleIds = new Set(data.modules.map(m => m.id));
  data.lessons = data.lessons.filter(l => moduleIds.has(l.moduleId));
  data.activities = data.activities.filter(a => courseIds.has(a.courseId));

  if (data.financeSettings) data.financeSettings = data.financeSettings.filter(s => !demoUserIds.has(s.userId));
  if (data.financeIncomes) data.financeIncomes = data.financeIncomes.filter(i => !demoUserIds.has(i.userId));
  if (data.financeMonthlyBills) data.financeMonthlyBills = data.financeMonthlyBills.filter(b => !demoUserIds.has(b.userId));
  if (data.financeDebts) data.financeDebts = data.financeDebts.filter(d => !demoUserIds.has(d.userId));
  if (data.financeExpenses) data.financeExpenses = data.financeExpenses.filter(e => !demoUserIds.has(e.userId));
  if (data.financeGoals) data.financeGoals = data.financeGoals.filter(g => !demoUserIds.has(g.userId));

  if (data.currentUserId && demoUserIds.has(data.currentUserId)) {
    data.currentUserId = null;
    setSession({ isLoggedIn: false, userId: null });
  }
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

function migrateData(data) {
  data.users?.forEach(u => {
    if (u.isAccount === undefined) u.isAccount = true;
    if (u.hoursStudied === undefined) u.hoursStudied = 0;
    if (u.lessonsCompleted === undefined) u.lessonsCompleted = 0;
  });

  removeDemoData(data);
  migrateFinanceData(data);
  recalculateAllUsersStats(data);

  return data;
}

export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const data = migrateData(defaultData());
      saveData(data);
      return data;
    }
    const data = migrateData(JSON.parse(raw));
    saveData(data);
    return data;
  } catch {
    const data = migrateData(defaultData());
    saveData(data);
    return data;
  }
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return { isLoggedIn: false, userId: null };
    return JSON.parse(raw);
  } catch {
    return { isLoggedIn: false, userId: null };
  }
}

export function setSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function isLoggedIn() {
  return getSession().isLoggedIn === true;
}

export function loginUser(data, email, password) {
  const user = data.users.find(
    u => u.isAccount && u.email?.toLowerCase() === email.trim().toLowerCase()
  );

  if (!user || user.password !== password) {
    return { success: false, error: 'E-mail ou senha incorretos.' };
  }

  data.currentUserId = user.id;
  saveData(data);
  setSession({ isLoggedIn: true, userId: user.id });
  return { success: true, user };
}

export function registerUser(data, { name, email, password }) {
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

  const emailTaken = data.users.some(
    u => u.isAccount && u.email?.toLowerCase() === trimmedEmail
  );

  if (emailTaken) {
    return { success: false, error: 'Este e-mail ja esta em uso.' };
  }

  const user = {
    id: generateId(),
    name: trimmedName,
    email: trimmedEmail,
    password,
    isAccount: true,
    lessonsCompleted: 0,
    hoursStudied: 0
  };

  data.users.push(user);
  data.currentUserId = user.id;
  saveData(data);
  setSession({ isLoggedIn: true, userId: user.id });
  return { success: true, user };
}

export function logoutUser() {
  setSession({ isLoggedIn: false, userId: null });
}

export function restoreSessionUser(data) {
  const session = getSession();
  if (session.isLoggedIn && session.userId) {
    const user = data.users.find(u => u.id === session.userId && u.isAccount);
    if (user) {
      data.currentUserId = user.id;
      saveData(data);
      return true;
    }
    logoutUser();
  }
  return false;
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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

export function addCourse(data, course) {
  data.courses.push(course);
  saveData(data);
  return course;
}

export function updateCourse(data, courseId, updates) {
  const index = data.courses.findIndex(c => c.id === courseId);
  if (index === -1) return null;
  data.courses[index] = { ...data.courses[index], ...updates };
  saveData(data);
  return data.courses[index];
}

export function deleteCourse(data, courseId) {
  const moduleIds = data.modules.filter(m => m.courseId === courseId).map(m => m.id);
  data.lessons = data.lessons.filter(l => !moduleIds.includes(l.moduleId));
  data.modules = data.modules.filter(m => m.courseId !== courseId);
  data.activities = data.activities.filter(a => a.courseId !== courseId);
  data.courses = data.courses.filter(c => c.id !== courseId);
  recalculateUserLessons(data, data.currentUserId);
  saveData(data);
}

export function addModule(data, module) {
  data.modules.push(module);
  saveData(data);
  return module;
}

export function updateModule(data, moduleId, updates) {
  const index = data.modules.findIndex(m => m.id === moduleId);
  if (index === -1) return null;
  data.modules[index] = { ...data.modules[index], ...updates };
  saveData(data);
  return data.modules[index];
}

export function deleteModule(data, moduleId) {
  data.lessons = data.lessons.filter(l => l.moduleId !== moduleId);
  data.modules = data.modules.filter(m => m.id !== moduleId);
  recalculateUserLessons(data, data.currentUserId);
  saveData(data);
}

export function addLesson(data, lesson) {
  data.lessons.push(lesson);
  saveData(data);
  return lesson;
}

export function updateLesson(data, lessonId, updates) {
  const index = data.lessons.findIndex(l => l.id === lessonId);
  if (index === -1) return null;
  data.lessons[index] = { ...data.lessons[index], ...updates };
  recalculateUserLessons(data, data.currentUserId);
  saveData(data);
  return data.lessons[index];
}

export function deleteLesson(data, lessonId) {
  data.lessons = data.lessons.filter(l => l.id !== lessonId);
  recalculateUserLessons(data, data.currentUserId);
  saveData(data);
}

export function addActivity(data, activity) {
  data.activities.push(activity);
  saveData(data);
  return activity;
}

export function updateActivity(data, activityId, updates) {
  const index = data.activities.findIndex(a => a.id === activityId);
  if (index === -1) return null;
  data.activities[index] = { ...data.activities[index], ...updates };
  saveData(data);
  return data.activities[index];
}

export function deleteActivity(data, activityId) {
  data.activities = data.activities.filter(a => a.id !== activityId);
  saveData(data);
}

export function recalculateUserStats(data, userId) {
  const userIndex = data.users.findIndex(u => u.id === userId);
  if (userIndex === -1) return;

  const userCourses = getCoursesByUser(data, userId);
  let totalLessons = 0;

  userCourses.forEach(course => {
    const lessons = getLessonsByCourse(data, course.id);
    totalLessons += lessons.filter(l => l.completed).length;
  });

  data.users[userIndex].lessonsCompleted = totalLessons;

  if (userCourses.length > 0) {
    data.users[userIndex].hoursStudied = calcHoursStudied(
      userCourses,
      courseId => getLessonsByCourse(data, courseId)
    );
  }
}

export function recalculateAllUsersStats(data) {
  data.users.forEach(user => recalculateUserStats(data, user.id));
}

export function recalculateUserLessons(data, userId) {
  recalculateUserStats(data, userId);
}

export function toggleLesson(data, lessonId) {
  const lesson = getLessonById(data, lessonId);
  if (!lesson) return null;

  const completed = !lesson.completed;
  return updateLesson(data, lessonId, {
    completed,
    completedAt: completed ? new Date().toISOString() : null
  });
}

export function toggleActivity(data, activityId) {
  const activity = getActivityById(data, activityId);
  if (!activity) return null;

  return updateActivity(data, activityId, {
    completed: !activity.completed
  });
}

export function updateUserName(data, userId, name) {
  const index = data.users.findIndex(u => u.id === userId);
  if (index === -1) return null;
  data.users[index].name = name;
  saveData(data);
  return data.users[index];
}

export function updateUserProfile(data, userId, { name, email }) {
  const index = data.users.findIndex(u => u.id === userId);
  if (index === -1) return { success: false, error: 'Usuario nao encontrado.' };

  const trimmedEmail = email.trim().toLowerCase();
  const emailTaken = data.users.some(
    u => u.id !== userId && u.isAccount && u.email?.toLowerCase() === trimmedEmail
  );

  if (emailTaken) {
    return { success: false, error: 'Este e-mail ja esta em uso.' };
  }

  data.users[index].name = name.trim();
  data.users[index].email = trimmedEmail;
  saveData(data);
  return { success: true, user: data.users[index] };
}

export function changeUserPassword(data, userId, currentPassword, newPassword) {
  const index = data.users.findIndex(u => u.id === userId);
  if (index === -1) return { success: false, error: 'Usuario nao encontrado.' };

  const user = data.users[index];
  if (user.password !== currentPassword) {
    return { success: false, error: 'Senha atual incorreta.' };
  }

  if (newPassword.length < 6) {
    return { success: false, error: 'A nova senha deve ter no minimo 6 caracteres.' };
  }

  data.users[index].password = newPassword;
  saveData(data);
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
