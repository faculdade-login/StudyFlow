/**
 * StudyFlow - Aplicacao principal
 */

import {
  loadData,
  getCurrentUser,
  getCoursesByUser,
  getModulesByCourse,
  getLessonsByModule,
  getLessonsByCourse,
  getActivitiesByCourse,
  getCourseById,
  addCourse,
  updateCourse,
  deleteCourse,
  addModule,
  updateModule,
  deleteModule,
  addLesson,
  addLessonsBatch,
  updateLesson,
  deleteLesson,
  addActivity,
  updateActivity,
  deleteActivity,
  toggleLesson,
  toggleActivity,
  updateUserName,
  updateUserProfile,
  changeUserPassword,
  loginUser,
  registerUser,
  logoutUser,
  restoreSessionUser,
  handleAuthRedirect,
  refreshRanking,
  getRanking,
  recalculateUserLessons,
  recalculateAllUsersStats,
  registerSyncLifecycle,
} from './storage.js';

import {
  formatDate,
  formatDateTime,
  getDeadlineInfo,
  calcModuleProgress,
  calcCourseProgress,
  calcHoursStudied,
  isCourseComplete,
  generateLessonBatchNames,
  escapeHtml,
  getInitials,
  formatHours,
  formatOrdinal,
  calcCourseEstimatedHours,
  renderProgressBar
} from './utils.js';

import {
  renderFinancePage,
  getFinanceSettings,
  getMonthlyBillsByUser,
  getDebtsByUser,
  getIncomesByUser,
  getExpensesByUser,
  getGoalsByUser,
  salaryForm,
  monthlyBillForm,
  debtForm,
  incomeForm,
  expenseForm,
  goalForm,
  handleSaveSalary,
  handleSaveMonthlyBill,
  handleSaveDebt,
  handleSaveIncome,
  handleSaveExpense,
  handleSaveGoal,
  toggleMonthlyBillPaid,
  toggleDebtPaid,
  deleteMonthlyBill,
  deleteDebt,
  deleteIncome,
  deleteExpense,
  deleteGoal
} from './finance-ui.js';

import { getCurrentMonthKey } from './finance.js';

let data = loadData();
let currentView = 'dashboard';
let selectedCourseId = null;
let selectedTab = 'modules';
let selectedFinanceTab = 'overview';
let financeTabsScrollLeft = 0;
let confirmResolver = null;

const content = document.getElementById('content');
const pageTitle = document.getElementById('page-title');
const userInfo = document.getElementById('user-info');
const topbarStats = document.getElementById('topbar-stats');
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalFooter = document.getElementById('modal-footer');
const authScreen = document.getElementById('auth-screen');
const appEl = document.getElementById('app');
const authError = document.getElementById('auth-error');
const registerError = document.getElementById('register-error');
const authLoginPanel = document.getElementById('auth-login');
const authRegisterPanel = document.getElementById('auth-register');
const topbarProfile = document.getElementById('topbar-profile');

function scrollToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
}

async function refresh() {
  data = loadData();
  recalculateUserLessons(data, data.currentUserId);
  await refreshRanking();
  renderUserInfo();
  renderTopbarStats();
  render();
}

async function runAction(action) {
  try {
    await action();
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Erro ao salvar dados.', 'error');
  }
}

let loadingToast = null;

function showLoadingToast(message = 'Aguarde, salvando...') {
  hideLoadingToast();
  const container = document.getElementById('toast-container');
  loadingToast = document.createElement('div');
  loadingToast.className = 'toast loading';
  loadingToast.innerHTML = `<span class="toast-spinner" aria-hidden="true"></span>${escapeHtml(message)}`;
  container.appendChild(loadingToast);
}

function hideLoadingToast() {
  if (loadingToast) {
    loadingToast.remove();
    loadingToast = null;
  }
}

async function runSaveAction(action, trigger = null) {
  const btn = trigger?.closest?.('button') || trigger;
  const originalText = btn?.textContent?.trim();

  showLoadingToast('Aguarde, salvando...');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Salvando...';
  }

  try {
    await action();
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Erro ao salvar dados.', 'error');
  } finally {
    hideLoadingToast();
    if (btn) {
      btn.disabled = false;
      if (originalText) btn.textContent = originalText;
    }
  }
}

function setActiveNav(view) {
  document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === view);
  });
}

function renderUserInfo() {
  const user = getCurrentUser(data);
  const html = `
    <div class="user-avatar">${getInitials(user.name)}</div>
    <div class="user-details">
      <div class="user-name">${escapeHtml(user.name)}</div>
      <div class="user-stats">${user.lessonsCompleted} aulas</div>
    </div>
    <span class="user-chevron" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
    </span>
  `;

  userInfo.className = 'user-info user-info-btn';
  userInfo.innerHTML = html;
  userInfo.setAttribute('role', 'button');
  userInfo.setAttribute('tabindex', '0');
  userInfo.setAttribute('aria-label', 'Abrir perfil');

  topbarProfile.innerHTML = `<span class="user-avatar">${getInitials(user.name)}</span>`;
}

function renderTopbarStats() {
  const user = getCurrentUser(data);

  topbarStats.innerHTML = `
    <div class="stat-pill stat-pill-xp" title="Aulas concluidas">
      <span class="stat-pill-icon">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      </span>
      ${user.lessonsCompleted}
    </div>
    <div class="stat-pill stat-pill-hours" title="Horas estudadas (estimativa)">
      <span class="stat-pill-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      </span>
      ${formatHours(user.hoursStudied, { estimated: true })}
    </div>
  `;
}

function render() {
  switch (currentView) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'courses':
      renderCourses();
      break;
    case 'course-detail':
      renderCourseDetail();
      break;
    case 'ranking':
      renderRanking();
      break;
    case 'finance':
      renderFinance();
      break;
  }
}

function renderDashboard() {
  pageTitle.textContent = 'Dashboard';
  const user = getCurrentUser(data);
  const courses = getCoursesByUser(data, user.id);

  let inProgress = 0;
  let completed = 0;
  let totalLessonsCompleted = 0;
  let totalLessons = 0;

  courses.forEach(course => {
    const modules = getModulesByCourse(data, course.id);
    const lessons = getLessonsByCourse(data, course.id);
    totalLessons += lessons.length;
    totalLessonsCompleted += lessons.filter(l => l.completed).length;

    if (modules.length === 0 || lessons.length === 0) return;
    if (isCourseComplete(lessons, modules)) {
      completed++;
    } else {
      inProgress++;
    }
  });

  const ranking = getRanking(data);
  const userPosition = ranking.findIndex(u => u.id === user.id) + 1;

  content.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card accent">
        <div class="stat-label">Total de Cursos</div>
        <div class="stat-value">${courses.length}</div>
      </div>
      <div class="stat-card yellow">
        <div class="stat-label">Em Andamento</div>
        <div class="stat-value">${inProgress}</div>
      </div>
      <div class="stat-card success">
        <div class="stat-label">Concluidos</div>
        <div class="stat-value">${completed}</div>
      </div>
      <div class="stat-card accent">
        <div class="stat-label">Aulas Concluidas</div>
        <div class="stat-value">${totalLessonsCompleted}</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-label">Horas Estudadas (estimativa)</div>
        <div class="stat-value">${formatHours(user.hoursStudied, { estimated: true })}</div>
      </div>
      <div class="stat-card purple">
        <div class="stat-label">Sua Posicao no Ranking</div>
        <div class="stat-value">${formatOrdinal(userPosition)}</div>
      </div>
    </div>

    <div class="card" style="margin-bottom: 2rem;">
      <div class="card-header">
        <span class="card-title">Cursos Recentes</span>
        <button class="btn btn-primary btn-sm" data-action="new-course">Novo Curso</button>
      </div>
      <div class="card-body">
        ${courses.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            </div>
            <h3>Nenhum curso cadastrado</h3>
            <p>Comece adicionando seu primeiro curso de estudos.</p>
            <div class="empty-state-actions">
              <button class="btn btn-primary" data-action="new-course">Cadastrar Curso</button>
            </div>
          </div>
        ` : renderCourseCards(courses.slice(0, 5))}
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Top Ranking</span>
        <button class="btn btn-ghost btn-sm" data-action="go-ranking">Ver completo</button>
      </div>
      <div class="card-body">
        ${renderRankingList(ranking.slice(0, 5), user.id)}
      </div>
    </div>
  `;
}

function renderCourses() {
  pageTitle.textContent = 'Cursos';
  const user = getCurrentUser(data);
  const courses = getCoursesByUser(data, user.id);

  content.innerHTML = `
    <div class="section-header">
      <h2>Meus Cursos</h2>
      <button class="btn btn-primary" data-action="new-course">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Novo Curso
      </button>
    </div>
    ${courses.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        </div>
        <h3>Nenhum curso cadastrado</h3>
        <p>Cadastre cursos, modulos e aulas para acompanhar seu progresso.</p>
        <div class="empty-state-actions">
          <button class="btn btn-primary" data-action="new-course">Cadastrar Curso</button>
        </div>
      </div>
    ` : `<div class="course-grid">${renderCourseCards(courses)}</div>`}
  `;
}

function renderCourseCards(courses) {
  return courses.map(course => {
    const modules = getModulesByCourse(data, course.id);
    const lessons = getLessonsByCourse(data, course.id);
    const { percent } = calcCourseProgress(lessons);
    const deadline = getDeadlineInfo(course.deadline);
    const complete = isCourseComplete(lessons, modules);

    return `
      <div class="course-card" data-action="open-course" data-course-id="${course.id}">
        <div class="course-card-header">
          <span class="course-name">${escapeHtml(course.name)}</span>
          ${course.platform ? `<span class="course-platform">${escapeHtml(course.platform)}</span>` : ''}
        </div>
        ${course.description ? `<p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.75rem;">${escapeHtml(course.description)}</p>` : ''}
        ${course.deadline || course.workloadHours ? `
        <div class="course-meta">
          ${course.deadline ? `<span>Acesso até: ${formatDate(course.deadline)}</span>` : ''}
          ${course.deadline && deadline.label ? `<span class="${deadline.className}">${deadline.label}</span>` : ''}
          ${course.workloadHours ? `<span>${course.workloadHours}h</span>` : ''}
        </div>
        ` : ''}
        ${renderProgressBar(course.name, percent, { showLabel: false })}
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem;">
          <span class="badge ${complete ? 'badge-complete' : 'badge-progress'}">${complete ? 'Concluido' : percent + '%'}</span>
          ${course.deadline && deadline.expired ? '<span class="badge badge-expired">Acesso encerrado</span>' : ''}
        </div>
      </div>
    `;
  }).join('');
}

function renderCourseDetail() {
  const course = getCourseById(data, selectedCourseId);
  if (!course) {
    currentView = 'courses';
    render();
    return;
  }

  pageTitle.textContent = course.name;
  setActiveNav('courses');
  const lessons = getLessonsByCourse(data, course.id);
  const { percent } = calcCourseProgress(lessons);
  const deadline = getDeadlineInfo(course.deadline);
  const modules = getModulesByCourse(data, course.id);

  content.innerHTML = `
    <button class="back-link" data-action="back-courses">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      Voltar para Cursos
    </button>

    <div class="course-detail-header">
      <h2>${escapeHtml(course.name)}</h2>
      ${course.description ? `<p class="course-description">${escapeHtml(course.description)}</p>` : ''}
      ${course.deadline || course.workloadHours || course.platform ? `
      <div class="deadline-info ${deadline.expired ? 'expired' : ''}">
        ${course.deadline ? `<span>Acesso à plataforma até: <strong>${formatDate(course.deadline)}</strong></span>` : ''}
        ${course.deadline ? `<span class="${deadline.className}">${deadline.expired ? 'Acesso encerrado' : deadline.label}</span>` : ''}
        ${course.workloadHours ? `<span>Carga horaria: ${course.workloadHours}h</span>` : ''}
        ${course.platform ? `<span>Plataforma: ${escapeHtml(course.platform)}</span>` : ''}
      </div>
      ` : ''}
      ${renderProgressBar('Progresso do Curso', percent)}
      <div class="course-actions">
        <button class="btn btn-secondary btn-sm" data-action="edit-course" data-course-id="${course.id}">Editar Curso</button>
        <button class="btn btn-danger btn-sm" data-action="delete-course" data-course-id="${course.id}">Excluir Curso</button>
      </div>
    </div>

    <div class="tabs">
      <button class="tab ${selectedTab === 'modules' ? 'active' : ''}" data-action="switch-tab" data-tab="modules">Modulos e Aulas</button>
      <button class="tab ${selectedTab === 'activities' ? 'active' : ''}" data-action="switch-tab" data-tab="activities">Atividades Extras</button>
    </div>

    ${selectedTab === 'modules' ? renderModulesTab(course, modules) : renderActivitiesTab(course)}
  `;
}

function renderModulesTab(course, modules) {
  return `
    <div class="section-header">
      <h2>Modulos</h2>
      <button class="btn btn-primary btn-sm" data-action="new-module" data-course-id="${course.id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Novo Modulo
      </button>
    </div>
    ${modules.length === 0 ? `
      <div class="empty-state">
        <h3>Nenhum modulo cadastrado</h3>
        <p>Adicione modulos para organizar as aulas do curso.</p>
        <button class="btn btn-primary" data-action="new-module" data-course-id="${course.id}">Adicionar Modulo</button>
      </div>
    ` : `
      <div class="module-list">
        ${modules.map(module => renderModuleCard(module)).join('')}
      </div>
    `}
  `;
}

function renderModuleCard(module) {
  const lessons = getLessonsByModule(data, module.id);
  const { percent } = calcModuleProgress(lessons);

  return `
    <div class="module-card">
      <div class="module-header">
        <span class="module-title">${escapeHtml(module.name)}</span>
        <div class="module-actions">
          <button class="btn-icon" data-action="edit-module" data-module-id="${module.id}" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon" data-action="delete-module" data-module-id="${module.id}" title="Excluir">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
      <div class="module-body">
        ${renderProgressBar(module.name, percent)}
        <div class="lesson-list" style="margin-top: 1rem;">
          ${lessons.map(lesson => `
            <div class="lesson-item ${lesson.completed ? 'completed' : ''}">
              <input type="checkbox" class="lesson-checkbox" data-action="toggle-lesson" data-lesson-id="${lesson.id}" ${lesson.completed ? 'checked' : ''}>
              <span class="lesson-name">${escapeHtml(lesson.name)}</span>
              <button class="btn-icon" data-action="delete-lesson" data-lesson-id="${lesson.id}" title="Excluir">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-ghost btn-sm" style="margin-top: 0.75rem;" data-action="new-lesson" data-module-id="${module.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Adicionar Aula
        </button>
      </div>
    </div>
  `;
}

function renderActivitiesTab(course) {
  const activities = getActivitiesByCourse(data, course.id);

  return `
    <div class="section-header">
      <h2>Atividades Extras</h2>
      <button class="btn btn-primary btn-sm" data-action="new-activity" data-course-id="${course.id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Nova Atividade
      </button>
    </div>
    ${activities.length === 0 ? `
      <div class="empty-state">
        <h3>Nenhuma atividade cadastrada</h3>
        <p>Adicione atividades complementares como flashcards, revisoes e exercicios.</p>
        <button class="btn btn-primary" data-action="new-activity" data-course-id="${course.id}">Adicionar Atividade</button>
      </div>
    ` : `
      <div class="activity-list">
        ${activities.map(activity => `
          <div class="activity-item">
            <input type="checkbox" class="lesson-checkbox" data-action="toggle-activity" data-activity-id="${activity.id}" ${activity.completed ? 'checked' : ''}>
            <div class="activity-content">
              <div class="activity-name ${activity.completed ? 'completed' : ''}" style="${activity.completed ? 'text-decoration: line-through; color: var(--text-secondary);' : ''}">${escapeHtml(activity.name)}</div>
              ${activity.description ? `<div class="activity-description">${escapeHtml(activity.description)}</div>` : ''}
              <div class="activity-date">Criada em ${formatDateTime(activity.createdAt)}</div>
            </div>
            <div class="activity-actions">
              <button class="btn-icon" data-action="edit-activity" data-activity-id="${activity.id}" title="Editar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-icon" data-action="delete-activity" data-activity-id="${activity.id}" title="Excluir">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}

function renderRanking() {
  pageTitle.textContent = 'Ranking';
  const user = getCurrentUser(data);
  const ranking = getRanking(data);

  content.innerHTML = `
    <div class="section-header">
      <h2>Ranking de Estudantes</h2>
    </div>
    <p class="section-subtitle">
      Classificacao por horas estudadas estimadas. A carga horaria do curso e dividida igualmente entre as aulas dos modulos.
    </p>
    ${renderRankingList(ranking, user.id, true)}
  `;
}

function bindFinanceTabsScroll() {
  const tabs = content.querySelector('#finance-tabs');
  if (!tabs) return;

  tabs.scrollLeft = financeTabsScrollLeft;
  tabs.addEventListener('scroll', () => {
    financeTabsScrollLeft = tabs.scrollLeft;
  }, { passive: true });
}

function renderFinance() {
  const tabsEl = content.querySelector('#finance-tabs');
  if (tabsEl) {
    financeTabsScrollLeft = tabsEl.scrollLeft;
  }

  pageTitle.textContent = 'Finanças';
  const user = getCurrentUser(data);
  content.innerHTML = renderFinancePage(data, user.id, selectedFinanceTab);
  bindFinanceTabsScroll();
}

function openSalaryModal() {
  const user = getCurrentUser(data);
  const settings = getFinanceSettings(data, user.id);
  showModal('Salário Fixo', salaryForm(settings), `
    <button class="btn btn-secondary" data-action="close-modal">Cancelar</button>
    <button class="btn btn-primary" data-action="save-salary">Salvar</button>
  `);
}

function openMonthlyBillModal(billId = null) {
  const user = getCurrentUser(data);
  const bill = billId ? getMonthlyBillsByUser(data, user.id).find(b => b.id === billId) : null;
  showModal(bill ? 'Editar Conta Mensal' : 'Nova Conta Mensal', monthlyBillForm(bill), `
    <button class="btn btn-secondary" data-action="close-modal">Cancelar</button>
    <button class="btn btn-primary" data-action="save-monthly-bill" data-bill-id="${billId || ''}">Salvar</button>
  `);
}

function openDebtModal(debtId = null) {
  const user = getCurrentUser(data);
  const debt = debtId ? getDebtsByUser(data, user.id).find(d => d.id === debtId) : null;
  showModal(debt ? 'Editar Dívida' : 'Nova Dívida', debtForm(debt), `
    <button class="btn btn-secondary" data-action="close-modal">Cancelar</button>
    <button class="btn btn-primary" data-action="save-debt" data-debt-id="${debtId || ''}">Salvar</button>
  `);
}

function openIncomeModal(incomeId = null) {
  const user = getCurrentUser(data);
  const income = incomeId ? getIncomesByUser(data, user.id).find(i => i.id === incomeId) : null;
  showModal(income ? 'Editar Receita' : 'Nova Receita', incomeForm(income), `
    <button class="btn btn-secondary" data-action="close-modal">Cancelar</button>
    <button class="btn btn-primary" data-action="save-income" data-income-id="${incomeId || ''}">Salvar</button>
  `);
}

function openExpenseModal(expenseId = null) {
  const user = getCurrentUser(data);
  const expense = expenseId ? getExpensesByUser(data, user.id).find(e => e.id === expenseId) : null;
  showModal(expense ? 'Editar Gasto' : 'Novo Gasto', expenseForm(expense), `
    <button class="btn btn-secondary" data-action="close-modal">Cancelar</button>
    <button class="btn btn-primary" data-action="save-expense" data-expense-id="${expenseId || ''}">Salvar</button>
  `);
}

function openGoalModal(goalId = null) {
  const user = getCurrentUser(data);
  const goal = goalId ? getGoalsByUser(data, user.id).find(g => g.id === goalId) : null;
  showModal(goal ? 'Editar Objetivo' : 'Novo Objetivo', goalForm(goal), `
    <button class="btn btn-secondary" data-action="close-modal">Cancelar</button>
    <button class="btn btn-primary" data-action="save-goal" data-goal-id="${goalId || ''}">Salvar</button>
  `);
}

function renderRankingList(ranking, currentUserId, showAll = false) {
  const list = showAll ? ranking : ranking;

  if (list.length === 0) {
    return '<div class="empty-state"><p>Nenhum dado de ranking disponivel.</p></div>';
  }

  return `
    <div class="ranking-list">
      ${list.map((user, index) => `
        <div
          class="ranking-item ${user.id === currentUserId ? 'current-user' : ''}"
          data-action="show-ranking-user"
          data-user-id="${user.id}"
          role="button"
          tabindex="0"
          aria-label="Ver cursos de ${escapeHtml(user.name)}"
        >
          <div class="ranking-position">${index + 1}</div>
          <div class="ranking-name">${escapeHtml(user.name)}${user.id === currentUserId ? ' (você)' : ''}</div>
          <div class="ranking-score">
            <strong>${formatHours(user.hoursStudied, { estimated: true })}</strong>
            <span class="ranking-lessons">${user.lessonsCompleted} aulas</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderRankingCourseCards(courses) {
  return courses.map(course => {
    const modules = getModulesByCourse(data, course.id);
    const lessons = getLessonsByCourse(data, course.id);
    const { percent, completed, total } = calcCourseProgress(lessons);
    const complete = isCourseComplete(lessons, modules);
    const estimatedHours = calcCourseEstimatedHours(course, lessons);

    return `
      <div class="ranking-course-card">
        <div class="course-card-header">
          <span class="course-name">${escapeHtml(course.name)}</span>
          ${course.platform ? `<span class="course-platform">${escapeHtml(course.platform)}</span>` : ''}
        </div>
        ${course.description ? `<p class="ranking-course-description">${escapeHtml(course.description)}</p>` : ''}
        ${renderProgressBar(course.name, percent, { showLabel: false })}
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem;">
          <span class="badge ${complete ? 'badge-complete' : 'badge-progress'}">${complete ? 'Concluido' : percent + '%'}</span>
          <span class="ranking-course-hours">
            ${course.workloadHours && total > 0
              ? `${formatHours(estimatedHours, { estimated: true })} de ${course.workloadHours}h · ${completed}/${total} aulas`
              : course.workloadHours
                ? `${course.workloadHours}h`
                : `${completed}/${total} aulas`}
          </span>
        </div>
      </div>
    `;
  }).join('');
}

function openRankingUserCoursesModal(userId) {
  const user = data.users.find(u => u.id === userId);
  if (!user) return;

  const courses = getCoursesByUser(data, userId);
  const isCurrentUser = userId === getCurrentUser(data).id;

  const bodyHtml = courses.length === 0
    ? `
      <div class="empty-state ranking-courses-empty">
        <p>${isCurrentUser
          ? 'Voce ainda nao cadastrou nenhum curso.'
          : `${escapeHtml(user.name)} ainda nao tem cursos cadastrados.`}</p>
        ${isCurrentUser ? '<button class="btn btn-primary btn-sm" data-action="ranking-go-courses">Cadastrar curso</button>' : ''}
      </div>
    `
    : `
      <p class="ranking-courses-subtitle">
        ${courses.length} curso${courses.length !== 1 ? 's' : ''} em andamento
      </p>
      <div class="ranking-courses-list">
        ${renderRankingCourseCards(courses)}
      </div>
    `;

  showModal(
    `Cursos de ${user.name}`,
    bodyHtml,
    '<button class="btn btn-secondary" data-action="close-modal">Fechar</button>'
  );
}

function showModal(title, bodyHtml, footerHtml, options = {}) {
  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHtml;
  modalFooter.innerHTML = footerHtml;
  const modal = document.getElementById('modal');
  modal.classList.toggle('modal-profile', !!options.profile);
  modal.classList.toggle('modal-confirm', !!options.confirm);
  modalOverlay.hidden = false;
}

function closeModal() {
  modalOverlay.hidden = true;
  modalBody.innerHTML = '';
  modalFooter.innerHTML = '';
  const modal = document.getElementById('modal');
  modal.classList.remove('modal-profile', 'modal-confirm');
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function showConfirm(message, options = {}) {
  const {
    title = 'Confirmar',
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    danger = true
  } = options;

  return new Promise(resolve => {
    confirmResolver = resolve;
    showModal(
      title,
      `<p class="confirm-message">${escapeHtml(message)}</p>`,
      `
        <button class="btn btn-secondary" data-action="confirm-cancel">${escapeHtml(cancelLabel)}</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="confirm-ok">${escapeHtml(confirmLabel)}</button>
      `,
      { confirm: true }
    );
  });
}

function resolveConfirm(confirmed) {
  if (confirmResolver) {
    confirmResolver(confirmed);
    confirmResolver = null;
  }
  closeModal();
}

function courseForm(course = null) {
  return `
    <form id="modal-form">
      <div class="form-group">
        <label>Nome do Curso <span class="required">*</span></label>
        <input type="text" class="form-input" name="name" required value="${course ? escapeHtml(course.name) : ''}" placeholder="Ex: JavaScript Completo">
      </div>
      <div class="form-group">
        <label>Descricao</label>
        <textarea class="form-textarea" name="description" placeholder="Descricao opcional do curso">${course ? escapeHtml(course.description || '') : ''}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Plataforma</label>
          <input type="text" class="form-input" name="platform" value="${course ? escapeHtml(course.platform || '') : ''}" placeholder="Ex: Udemy, Alura">
        </div>
        <div class="form-group">
          <label>Carga Horaria (horas)</label>
          <input type="number" class="form-input" name="workloadHours" min="0" step="0.5" value="${course ? course.workloadHours || '' : ''}" placeholder="Ex: 74">
          <p class="form-hint">Usada para estimar horas estudadas: divide-se igualmente entre as aulas dos modulos.</p>
        </div>
      </div>
      <div class="form-group">
        <label>Encerramento do acesso à plataforma</label>
        <input type="date" class="form-input" name="deadline" value="${course?.deadline || ''}">
        <p class="form-hint">Data em que o acesso ao curso na plataforma expira (nao e a meta de conclusao).</p>
      </div>
    </form>
  `;
}

function moduleForm(module = null) {
  return `
    <form id="modal-form">
      <div class="form-group">
        <label>Nome do Modulo <span class="required">*</span></label>
        <input type="text" class="form-input" name="name" required value="${module ? escapeHtml(module.name) : ''}" placeholder="Ex: Modulo 1 - Introducao">
      </div>
    </form>
  `;
}

function lessonForm(lesson = null) {
  return `
    <form id="modal-form">
      <div class="form-group">
        <label>Modo de criacao</label>
        <div class="form-radio-group">
          <label class="form-radio">
            <input type="radio" name="mode" value="single" checked>
            Aula unica
          </label>
          <label class="form-radio">
            <input type="radio" name="mode" value="batch">
            Criar em lote
          </label>
        </div>
      </div>
      <div id="lesson-single-fields">
        <div class="form-group">
          <label>Nome da Aula <span class="required">*</span></label>
          <input type="text" class="form-input" name="name" value="${lesson ? escapeHtml(lesson.name) : ''}" placeholder="Ex: Variaveis e Tipos de Dados">
        </div>
      </div>
      <div id="lesson-batch-fields" hidden>
        <div class="form-group">
          <label>Quantidade de aulas <span class="required">*</span></label>
          <input type="number" class="form-input" name="quantity" min="1" max="100" value="10" placeholder="Ex: 10">
        </div>
        <div class="form-group">
          <label>Nome base</label>
          <input type="text" class="form-input" name="baseName" value="Aula" placeholder="Aula">
          <p class="form-input">Ex.: 10 gera "1 - Aula", "2 - Aula", "3 - Aula"...</p>
        </div>
        <div class="batch-preview" id="batch-preview" aria-live="polite"></div>
      </div>
    </form>
  `;
}

function setupLessonFormListeners() {
  const form = document.getElementById('modal-form');
  if (!form) return;

  const singleFields = document.getElementById('lesson-single-fields');
  const batchFields = document.getElementById('lesson-batch-fields');
  const preview = document.getElementById('batch-preview');
  const nameInput = form.querySelector('[name="name"]');

  function updateBatchPreview() {
    const quantity = Math.min(100, Math.max(1, parseInt(form.querySelector('[name="quantity"]').value, 10) || 0));
    const baseName = form.querySelector('[name="baseName"]').value.trim() || 'Aula';
    const names = generateLessonBatchNames(quantity, baseName);
    const shown = names.slice(0, 3);
    const suffix = names.length > 3 ? `<br>... e mais ${names.length - 3} aula${names.length - 3 > 1 ? 's' : ''}` : '';

    preview.innerHTML = `
      <span class="batch-preview-label">Pre-visualizacao:</span>
      ${shown.map(n => escapeHtml(n)).join('<br>')}${suffix}
    `;
  }

  function syncMode() {
    const isBatch = form.querySelector('[name="mode"]:checked')?.value === 'batch';
    singleFields.hidden = isBatch;
    batchFields.hidden = !isBatch;
    nameInput.required = !isBatch;
    if (isBatch) updateBatchPreview();
  }

  form.querySelectorAll('[name="mode"]').forEach(radio => {
    radio.addEventListener('change', syncMode);
  });
  form.querySelector('[name="quantity"]').addEventListener('input', updateBatchPreview);
  form.querySelector('[name="baseName"]').addEventListener('input', updateBatchPreview);
  syncMode();
}

function activityForm(activity = null) {
  return `
    <form id="modal-form">
      <div class="form-group">
        <label>Nome da Atividade <span class="required">*</span></label>
        <input type="text" class="form-input" name="name" required value="${activity ? escapeHtml(activity.name) : ''}" placeholder="Ex: Fazer Flashcards">
      </div>
      <div class="form-group">
        <label>Descricao</label>
        <textarea class="form-textarea" name="description" placeholder="Descricao opcional">${activity ? escapeHtml(activity.description || '') : ''}</textarea>
      </div>
    </form>
  `;
}

function openProfileModal() {
  const user = getCurrentUser(data);

  showModal('Meu Perfil', `
    <div class="profile-hero">
      <div class="profile-avatar-large">${getInitials(user.name)}</div>
      <h3 class="profile-name">${escapeHtml(user.name)}</h3>
      <p class="profile-email">${escapeHtml(user.email || '')}</p>
      <div class="profile-stats-row">
        <span class="profile-stat">${formatHours(user.hoursStudied, { estimated: true })} estimadas</span>
        <span class="profile-stat">${user.lessonsCompleted} aulas</span>
      </div>
    </div>

    <div class="profile-section">
      <h4 class="profile-section-title">Dados pessoais</h4>
      <form id="profile-form">
        <div class="form-group">
          <label>Nome</label>
          <input type="text" class="form-input" name="name" required value="${escapeHtml(user.name)}" placeholder="Seu nome">
        </div>
        <div class="form-group">
          <label>E-mail</label>
          <input type="email" class="form-input" name="email" required value="${escapeHtml(user.email || '')}" placeholder="seu@email.com" autocomplete="email">
        </div>
      </form>
    </div>

    <div class="profile-section">
      <h4 class="profile-section-title">Alterar senha</h4>
      <form id="password-form">
        <div class="form-group">
          <label>Senha atual</label>
          <input type="password" class="form-input" name="currentPassword" placeholder="Senha atual" autocomplete="current-password">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Nova senha</label>
            <input type="password" class="form-input" name="newPassword" placeholder="Min. 6 caracteres" minlength="6" autocomplete="new-password">
          </div>
          <div class="form-group">
            <label>Confirmar senha</label>
            <input type="password" class="form-input" name="confirmPassword" placeholder="Repita a senha" minlength="6" autocomplete="new-password">
          </div>
        </div>
      </form>
    </div>

    <p class="profile-error" id="profile-error" hidden></p>
  `, `
    <button class="btn btn-primary" data-action="save-profile">Salvar dados</button>
    <button class="btn btn-secondary" data-action="save-password">Alterar senha</button>
    <button class="btn btn-danger btn-block profile-logout" data-action="logout">Sair da conta</button>
  `, { profile: true });
}

async function handleSaveProfile() {
  const form = document.getElementById('profile-form');
  if (!form.reportValidity()) return;

  const user = getCurrentUser(data);
  const formData = new FormData(form);
  const result = await updateUserProfile(data, user.id, {
    name: formData.get('name'),
    email: formData.get('email')
  });

  const errorEl = document.getElementById('profile-error');
  if (!result.success) {
    errorEl.textContent = result.error;
    errorEl.hidden = false;
    return;
  }

  errorEl.hidden = true;
  showToast('Perfil atualizado');
  closeModal();
  await refresh();
}

async function handleSavePassword() {
  const form = document.getElementById('password-form');
  const current = form.querySelector('[name="currentPassword"]').value;
  const newPass = form.querySelector('[name="newPassword"]').value;
  const confirm = form.querySelector('[name="confirmPassword"]').value;
  const errorEl = document.getElementById('profile-error');

  if (!current || !newPass || !confirm) {
    errorEl.textContent = 'Preencha todos os campos de senha.';
    errorEl.hidden = false;
    return;
  }

  if (newPass !== confirm) {
    errorEl.textContent = 'As senhas nao coincidem.';
    errorEl.hidden = false;
    return;
  }

  const user = getCurrentUser(data);
  const result = await changeUserPassword(data, user.id, current, newPass);

  if (!result.success) {
    errorEl.textContent = result.error;
    errorEl.hidden = false;
    return;
  }

  errorEl.hidden = true;
  form.reset();
  showToast('Senha alterada com sucesso');
}

async function handleLogout() {
  const confirmed = await showConfirm('Deseja sair da sua conta?', {
    title: 'Sair da conta',
    confirmLabel: 'Sair',
    danger: false
  });
  if (!confirmed) return;
  await logoutUser();
  closeModal();
  showAuthScreen(true);
}

function showAuthMode(mode = 'login') {
  const isLogin = mode === 'login';
  authLoginPanel.hidden = !isLogin;
  authRegisterPanel.hidden = isLogin;
  authError.hidden = true;
  registerError.hidden = true;
  if (isLogin) {
    document.getElementById('login-form').reset();
  } else {
    document.getElementById('register-form').reset();
  }
}

function showAuthScreen(show) {
  authScreen.hidden = !show;
  appEl.hidden = show;
  if (show) {
    showAuthMode('login');
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);

  try {
    const result = await loginUser(formData.get('email'), formData.get('password'));

    if (!result.success) {
      authError.textContent = result.error;
      authError.hidden = false;
      return;
    }

    authError.hidden = true;
    data = loadData();
    showAuthScreen(false);
    setupEventListeners();
    await bootstrapApp();
    scrollToTop();
  } catch (err) {
    authError.textContent = err.message || 'Erro ao entrar.';
    authError.hidden = false;
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const password = formData.get('password');
  const confirmPassword = formData.get('confirmPassword');

  if (password !== confirmPassword) {
    registerError.textContent = 'As senhas nao coincidem.';
    registerError.hidden = false;
    return;
  }

  try {
    const result = await registerUser({
      name: formData.get('name'),
      email: formData.get('email'),
      password
    });

    if (!result.success) {
      registerError.textContent = result.error;
      registerError.hidden = false;
      return;
    }

    registerError.hidden = true;
    data = loadData();
    showAuthScreen(false);
    setupEventListeners();
    await bootstrapApp();
    scrollToTop();
  } catch (err) {
    registerError.textContent = err.message || 'Erro ao cadastrar.';
    registerError.hidden = false;
  }
}

function openNewCourseModal() {
  showModal('Novo Curso', courseForm(), `
    <button class="btn btn-secondary" data-action="close-modal">Cancelar</button>
    <button class="btn btn-primary" data-action="save-course">Salvar</button>
  `);
}

function openEditCourseModal(courseId) {
  const course = getCourseById(data, courseId);
  if (!course) return;

  showModal('Editar Curso', courseForm(course), `
    <button class="btn btn-secondary" data-action="close-modal">Cancelar</button>
    <button class="btn btn-primary" data-action="save-course" data-course-id="${courseId}">Salvar</button>
  `);
}

function openNewModuleModal(courseId) {
  showModal('Novo Modulo', moduleForm(), `
    <button class="btn btn-secondary" data-action="close-modal">Cancelar</button>
    <button class="btn btn-primary" data-action="save-module" data-course-id="${courseId}">Salvar</button>
  `);
}

function openEditModuleModal(moduleId) {
  const module = data.modules.find(m => m.id === moduleId);
  if (!module) return;

  showModal('Editar Modulo', moduleForm(module), `
    <button class="btn btn-secondary" data-action="close-modal">Cancelar</button>
    <button class="btn btn-primary" data-action="save-module" data-module-id="${moduleId}">Salvar</button>
  `);
}

function openNewLessonModal(moduleId) {
  showModal('Nova Aula', lessonForm(), `
    <button class="btn btn-secondary" data-action="close-modal">Cancelar</button>
    <button class="btn btn-primary" data-action="save-lesson" data-module-id="${moduleId}">Salvar</button>
  `);
  setupLessonFormListeners();
}

function openNewActivityModal(courseId) {
  showModal('Nova Atividade', activityForm(), `
    <button class="btn btn-secondary" data-action="close-modal">Cancelar</button>
    <button class="btn btn-primary" data-action="save-activity" data-course-id="${courseId}">Salvar</button>
  `);
}

function openEditActivityModal(activityId) {
  const activity = data.activities.find(a => a.id === activityId);
  if (!activity) return;

  showModal('Editar Atividade', activityForm(activity), `
    <button class="btn btn-secondary" data-action="close-modal">Cancelar</button>
    <button class="btn btn-primary" data-action="save-activity" data-activity-id="${activityId}">Salvar</button>
  `);
}

async function handleSaveCourse(courseId = null) {
  const form = document.getElementById('modal-form');
  if (!form.reportValidity()) return;

  const formData = new FormData(form);
  const courseData = {
    name: formData.get('name').trim(),
    description: formData.get('description').trim() || null,
    platform: formData.get('platform').trim() || null,
    workloadHours: formData.get('workloadHours') ? parseFloat(formData.get('workloadHours')) : null,
    deadline: formData.get('deadline')?.toString().trim() || null
  };

  if (courseId) {
    await updateCourse(data, courseId, courseData);
    showToast('Curso atualizado com sucesso');
  } else {
    await addCourse(data, courseData);
    showToast('Curso cadastrado com sucesso');
  }

  closeModal();
  await refresh();
}

async function handleSaveModule(courseId, moduleId = null) {
  const form = document.getElementById('modal-form');
  if (!form.reportValidity()) return;

  const name = form.querySelector('[name="name"]').value.trim();

  if (moduleId) {
    await updateModule(data, moduleId, { name });
    showToast('Modulo atualizado');
  } else {
    const modules = getModulesByCourse(data, courseId);
    await addModule(data, { courseId, name, order: modules.length });
    showToast('Modulo adicionado');
  }

  closeModal();
  await refresh();
}

async function handleSaveLesson(moduleId) {
  const form = document.getElementById('modal-form');
  const mode = form.querySelector('[name="mode"]:checked')?.value || 'single';

  if (mode === 'batch') {
    const quantity = parseInt(form.querySelector('[name="quantity"]').value, 10);
    const baseName = form.querySelector('[name="baseName"]').value.trim() || 'Aula';

    if (!quantity || quantity < 1 || quantity > 100) {
      showToast('Informe uma quantidade entre 1 e 100.', 'error');
      return;
    }

    let lessons = getLessonsByModule(data, moduleId);
    const names = generateLessonBatchNames(quantity, baseName);
    const startOrder = lessons.length;

    await addLessonsBatch(data, moduleId, names.map((name, index) => ({
      name,
      order: startOrder + index,
      completed: false,
      completedAt: null
    })));

    closeModal();
    showToast(`${quantity} aulas criadas`);
    await refresh();
    return;
  }

  if (!form.reportValidity()) return;

  const name = form.querySelector('[name="name"]').value.trim();
  const lessons = getLessonsByModule(data, moduleId);

  await addLesson(data, {
    moduleId,
    name,
    order: lessons.length,
    completed: false,
    completedAt: null
  });

  closeModal();
  showToast('Aula adicionada');
  await refresh();
}

async function handleSaveActivity(courseId, activityId = null) {
  const form = document.getElementById('modal-form');
  if (!form.reportValidity()) return;

  const formData = new FormData(form);
  const activityData = {
    name: formData.get('name').trim(),
    description: formData.get('description').trim() || null
  };

  if (activityId) {
    await updateActivity(data, activityId, activityData);
    showToast('Atividade atualizada');
  } else {
    await addActivity(data, {
      courseId,
      ...activityData,
      completed: false,
      createdAt: new Date().toISOString()
    });
    showToast('Atividade adicionada');
  }

  closeModal();
  await refresh();
}

async function handleContentClick(e) {
  const target = e.target.closest('[data-action]');
  if (!target) return;

  const action = target.dataset.action;

  switch (action) {
    case 'new-course':
      openNewCourseModal();
      break;
    case 'open-course':
      selectedCourseId = target.dataset.courseId;
      selectedTab = 'modules';
      currentView = 'course-detail';
      render();
      break;
    case 'back-courses':
      currentView = 'courses';
      selectedCourseId = null;
      render();
      break;
    case 'edit-course':
      openEditCourseModal(target.dataset.courseId);
      break;
    case 'delete-course': {
      const confirmed = await showConfirm(
        'Tem certeza que deseja excluir este curso? Todos os modulos, aulas e atividades serao removidos.',
        { title: 'Excluir curso', confirmLabel: 'Excluir' }
      );
      if (confirmed) {
        await runAction(async () => {
          await deleteCourse(data, target.dataset.courseId);
          currentView = 'courses';
          selectedCourseId = null;
          showToast('Curso excluido');
          await refresh();
        });
      }
      break;
    }
    case 'switch-tab':
      selectedTab = target.dataset.tab;
      render();
      break;
    case 'new-module':
      openNewModuleModal(target.dataset.courseId);
      break;
    case 'edit-module':
      openEditModuleModal(target.dataset.moduleId);
      break;
    case 'delete-module': {
      const confirmed = await showConfirm(
        'Excluir este modulo e todas as suas aulas?',
        { title: 'Excluir modulo', confirmLabel: 'Excluir' }
      );
      if (confirmed) {
        await runAction(async () => {
          await deleteModule(data, target.dataset.moduleId);
          showToast('Modulo excluido');
          await refresh();
        });
      }
      break;
    }
    case 'new-lesson':
      openNewLessonModal(target.dataset.moduleId);
      break;
    case 'toggle-lesson':
      await runAction(async () => {
        await toggleLesson(data, target.dataset.lessonId);
        await refresh();
      });
      break;
    case 'delete-lesson': {
      const confirmed = await showConfirm('Excluir esta aula?', {
        title: 'Excluir aula',
        confirmLabel: 'Excluir'
      });
      if (confirmed) {
        await runAction(async () => {
          await deleteLesson(data, target.dataset.lessonId);
          showToast('Aula excluida');
          await refresh();
        });
      }
      break;
    }
    case 'new-activity':
      openNewActivityModal(target.dataset.courseId);
      break;
    case 'edit-activity':
      openEditActivityModal(target.dataset.activityId);
      break;
    case 'toggle-activity':
      await runAction(async () => {
        await toggleActivity(data, target.dataset.activityId);
        await refresh();
      });
      break;
    case 'delete-activity': {
      const confirmed = await showConfirm('Excluir esta atividade?', {
        title: 'Excluir atividade',
        confirmLabel: 'Excluir'
      });
      if (confirmed) {
        await runAction(async () => {
          await deleteActivity(data, target.dataset.activityId);
          showToast('Atividade excluida');
          await refresh();
        });
      }
      break;
    }
    case 'go-ranking':
      currentView = 'ranking';
      setActiveNav('ranking');
      await refreshRanking();
      render();
      break;
    case 'show-ranking-user':
      openRankingUserCoursesModal(target.dataset.userId);
      break;
    case 'ranking-go-courses':
      closeModal();
      currentView = 'courses';
      setActiveNav('courses');
      render();
      break;
    case 'finance-tab':
      selectedFinanceTab = target.dataset.tab;
      render();
      break;
    case 'edit-salary':
      openSalaryModal();
      break;
    case 'new-monthly-bill':
      openMonthlyBillModal();
      break;
    case 'edit-monthly-bill':
      openMonthlyBillModal(target.dataset.billId);
      break;
    case 'save-monthly-bill':
      await runSaveAction(async () => {
        if (await handleSaveMonthlyBill(data, getCurrentUser(data).id, target.dataset.billId || null)) {
          closeModal();
          showToast('Conta salva');
          render();
        }
      }, target);
      break;
    case 'toggle-bill-paid':
      await runAction(async () => {
        await toggleMonthlyBillPaid(data, target.dataset.billId, getCurrentMonthKey());
        render();
      });
      break;
    case 'delete-monthly-bill': {
      const confirmed = await showConfirm('Excluir esta conta mensal?', {
        title: 'Excluir conta',
        confirmLabel: 'Excluir'
      });
      if (confirmed) {
        await runAction(async () => {
          await deleteMonthlyBill(data, target.dataset.billId);
          showToast('Conta excluida');
          render();
        });
      }
      break;
    }
    case 'new-debt':
      openDebtModal();
      break;
    case 'edit-debt':
      openDebtModal(target.dataset.debtId);
      break;
    case 'save-debt':
      await runSaveAction(async () => {
        if (await handleSaveDebt(data, getCurrentUser(data).id, target.dataset.debtId || null)) {
          closeModal();
          showToast('Divida salva');
          render();
        }
      }, target);
      break;
    case 'toggle-debt-paid':
      await runAction(async () => {
        await toggleDebtPaid(data, target.dataset.debtId);
        render();
      });
      break;
    case 'delete-debt': {
      const confirmed = await showConfirm('Excluir esta divida?', {
        title: 'Excluir divida',
        confirmLabel: 'Excluir'
      });
      if (confirmed) {
        await runAction(async () => {
          await deleteDebt(data, target.dataset.debtId);
          showToast('Divida excluida');
          render();
        });
      }
      break;
    }
    case 'new-income':
      openIncomeModal();
      break;
    case 'edit-income':
      openIncomeModal(target.dataset.incomeId);
      break;
    case 'save-income':
      await runSaveAction(async () => {
        if (await handleSaveIncome(data, getCurrentUser(data).id, target.dataset.incomeId || null)) {
          closeModal();
          showToast('Receita salva');
          render();
        }
      }, target);
      break;
    case 'delete-income': {
      const confirmed = await showConfirm('Excluir esta receita?', {
        title: 'Excluir receita',
        confirmLabel: 'Excluir'
      });
      if (confirmed) {
        await runAction(async () => {
          await deleteIncome(data, target.dataset.incomeId);
          showToast('Receita excluida');
          render();
        });
      }
      break;
    }
    case 'new-expense':
      openExpenseModal();
      break;
    case 'edit-expense':
      openExpenseModal(target.dataset.expenseId);
      break;
    case 'save-expense':
      await runSaveAction(async () => {
        if (await handleSaveExpense(data, getCurrentUser(data).id, target.dataset.expenseId || null)) {
          closeModal();
          showToast('Gasto salvo');
          render();
        }
      }, target);
      break;
    case 'delete-expense': {
      const confirmed = await showConfirm('Excluir este gasto?', {
        title: 'Excluir gasto',
        confirmLabel: 'Excluir'
      });
      if (confirmed) {
        await runAction(async () => {
          await deleteExpense(data, target.dataset.expenseId);
          showToast('Gasto excluido');
          render();
        });
      }
      break;
    }
    case 'new-goal':
      openGoalModal();
      break;
    case 'edit-goal':
      openGoalModal(target.dataset.goalId);
      break;
    case 'save-goal':
      await runSaveAction(async () => {
        if (await handleSaveGoal(data, getCurrentUser(data).id, target.dataset.goalId || null)) {
          closeModal();
          showToast('Objetivo salvo');
          render();
        }
      }, target);
      break;
    case 'delete-goal': {
      const confirmed = await showConfirm('Excluir este objetivo?', {
        title: 'Excluir objetivo',
        confirmLabel: 'Excluir'
      });
      if (confirmed) {
        await runAction(async () => {
          await deleteGoal(data, target.dataset.goalId);
          showToast('Objetivo excluido');
          render();
        });
      }
      break;
    }
    case 'save-salary':
      await runSaveAction(async () => {
        if (await handleSaveSalary(data, getCurrentUser(data).id)) {
          closeModal();
          showToast('Salario atualizado');
          render();
        }
      }, target);
      break;
    case 'confirm-ok':
      resolveConfirm(true);
      break;
    case 'confirm-cancel':
      resolveConfirm(false);
      break;
    case 'close-modal':
      if (confirmResolver) {
        resolveConfirm(false);
      } else {
        closeModal();
      }
      break;
    case 'save-course':
      await runSaveAction(() => handleSaveCourse(target.dataset.courseId || null), target);
      break;
    case 'save-module':
      await runSaveAction(() => handleSaveModule(target.dataset.courseId, target.dataset.moduleId || null), target);
      break;
    case 'save-lesson':
      await runSaveAction(() => handleSaveLesson(target.dataset.moduleId), target);
      break;
    case 'save-activity':
      await runSaveAction(() => handleSaveActivity(target.dataset.courseId, target.dataset.activityId || null), target);
      break;
    case 'open-profile':
      openProfileModal();
      break;
    case 'save-profile':
      await runSaveAction(handleSaveProfile, target);
      break;
    case 'save-password':
      await runSaveAction(handleSavePassword, target);
      break;
    case 'logout':
      await handleLogout();
      break;
  }
}

async function handleNavClick(e) {
  const btn = e.target.closest('.nav-item, .bottom-nav-item');
  if (!btn) return;

  setActiveNav(btn.dataset.view);
  currentView = btn.dataset.view;
  selectedCourseId = null;

  if (currentView === 'ranking') {
    await refreshRanking();
  }

  render();
}

function setupEventListeners() {
  if (setupEventListeners.initialized) return;
  setupEventListeners.initialized = true;

  content.addEventListener('click', handleContentClick);
  content.addEventListener('keydown', e => {
    const item = e.target.closest('[data-action="show-ranking-user"]');
    if (!item) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openRankingUserCoursesModal(item.dataset.userId);
    }
  });
  userInfo.addEventListener('click', () => openProfileModal());
  userInfo.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openProfileModal();
    }
  });
  topbarProfile.addEventListener('click', () => openProfileModal());

  modalOverlay.addEventListener('click', e => {
    if (e.target === modalOverlay) {
      if (confirmResolver) {
        resolveConfirm(false);
      } else {
        closeModal();
      }
    }
    handleContentClick(e);
  });

  document.querySelector('.sidebar-nav').addEventListener('click', handleNavClick);
  document.getElementById('bottom-nav').addEventListener('click', handleNavClick);
  document.getElementById('modal-close').addEventListener('click', () => {
    if (confirmResolver) {
      resolveConfirm(false);
    } else {
      closeModal();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modalOverlay.hidden) {
      if (confirmResolver) {
        resolveConfirm(false);
      } else {
        closeModal();
      }
    }
  });
}

async function bootstrapApp() {
  recalculateAllUsersStats(data);
  await refreshRanking({ force: true });
  renderUserInfo();
  renderTopbarStats();
  render();
}

async function init() {
  registerSyncLifecycle();
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('register-form').addEventListener('submit', handleRegister);
  document.getElementById('show-register').addEventListener('click', () => showAuthMode('register'));
  document.getElementById('show-login').addEventListener('click', () => showAuthMode('login'));

  try {
    const redirect = await handleAuthRedirect();
    if (redirect.status === 'session') {
      data = loadData();
      showAuthScreen(false);
      setupEventListeners();
      await bootstrapApp();
      scrollToTop();
      showToast('E-mail confirmado! Bem-vindo.');
      return;
    }
    if (redirect.status === 'error') {
      showAuthScreen(true);
      authError.textContent = redirect.message;
      authError.hidden = false;
      return;
    }

    const restored = await restoreSessionUser();
    if (!restored) {
      showAuthScreen(true);
      return;
    }

    data = loadData();
    showAuthScreen(false);
    setupEventListeners();
    await bootstrapApp();
    scrollToTop();
  } catch (err) {
    console.error(err);
    showAuthScreen(true);
  }
}

init();
