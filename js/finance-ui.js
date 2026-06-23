/**
 * Interface do modulo financeiro.
 */

import { generateId } from './storage.js';
import {
  getFinanceSettings,
  updateFinanceSettings,
  getIncomesByUser,
  getMonthlyBillsByUser,
  getDebtsByUser,
  getExpensesByUser,
  getGoalsByUser,
  addIncome,
  updateIncome,
  deleteIncome,
  addMonthlyBill,
  updateMonthlyBill,
  deleteMonthlyBill,
  toggleMonthlyBillPaid,
  addDebt,
  updateDebt,
  deleteDebt,
  toggleDebtPaid,
  addExpense,
  updateExpense,
  deleteExpense,
  addGoal,
  updateGoal,
  deleteGoal
} from './finance-storage.js';

import {
  formatCurrency,
  getCurrentMonthKey,
  isBillPaidThisMonth,
  calcFinanceSummary,
  calcGoalProjection,
  renderFinanceChart,
  getFinancialHealthStatus,
  formatMonthLabel
} from './finance.js';

import { escapeHtml, formatDate } from './utils.js';

export function renderFinancePage(data, userId, selectedTab = 'overview') {
  const settings = getFinanceSettings(data, userId);
  const incomes = getIncomesByUser(data, userId);
  const monthlyBills = getMonthlyBillsByUser(data, userId);
  const debts = getDebtsByUser(data, userId);
  const expenses = getExpensesByUser(data, userId);
  const goals = getGoalsByUser(data, userId);
  const monthKey = getCurrentMonthKey();

  const summary = calcFinanceSummary({
    settings,
    incomes,
    monthlyBills,
    debts,
    expenses,
    monthKey
  });

  const health = getFinancialHealthStatus(summary);

  return `
    <div class="finance-header">
      <div>
        <h2>Finanças</h2>
        <p class="section-subtitle finance-privacy">Dados privados — só você vê estas informações.</p>
      </div>
    </div>

    <div class="finance-tabs">
      <button class="tab ${selectedTab === 'overview' ? 'active' : ''}" data-action="finance-tab" data-tab="overview">Visão Geral</button>
      <button class="tab ${selectedTab === 'bills' ? 'active' : ''}" data-action="finance-tab" data-tab="bills">Contas Mensais</button>
      <button class="tab ${selectedTab === 'debts' ? 'active' : ''}" data-action="finance-tab" data-tab="debts">Dívidas</button>
      <button class="tab ${selectedTab === 'incomes' ? 'active' : ''}" data-action="finance-tab" data-tab="incomes">Receitas</button>
      <button class="tab ${selectedTab === 'expenses' ? 'active' : ''}" data-action="finance-tab" data-tab="expenses">Gastos</button>
      <button class="tab ${selectedTab === 'goals' ? 'active' : ''}" data-action="finance-tab" data-tab="goals">Objetivos</button>
    </div>

    ${selectedTab === 'overview' ? renderFinanceOverview(settings, summary, health, goals) : ''}
    ${selectedTab === 'bills' ? renderMonthlyBills(monthlyBills, monthKey) : ''}
    ${selectedTab === 'debts' ? renderDebts(debts) : ''}
    ${selectedTab === 'incomes' ? renderIncomes(settings, incomes, monthKey) : ''}
    ${selectedTab === 'expenses' ? renderExpenses(expenses, monthKey) : ''}
    ${selectedTab === 'goals' ? renderGoals(goals, summary) : ''}
  `;
}

function renderFinanceOverview(settings, summary, health, goals) {
  return `
    <div class="finance-health-card ${health.className}">
      <div class="finance-health-label">${health.label}</div>
      <p>${health.message}</p>
    </div>

    <div class="stats-grid finance-stats">
      <div class="stat-card success">
        <div class="stat-label">Receita do Mês</div>
        <div class="stat-value finance-stat">${formatCurrency(summary.totalIncome)}</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-label">Gastos do Mês</div>
        <div class="stat-value finance-stat">${formatCurrency(summary.totalCommitted)}</div>
      </div>
      <div class="stat-card ${summary.monthlyBalance >= 0 ? 'accent' : 'danger'}">
        <div class="stat-label">Saldo do Mês</div>
        <div class="stat-value finance-stat">${formatCurrency(summary.monthlyBalance)}</div>
      </div>
      <div class="stat-card purple">
        <div class="stat-label">Poupança Atual</div>
        <div class="stat-value finance-stat">${formatCurrency(summary.currentSavings)}</div>
      </div>
    </div>

    <div class="card finance-card">
      <div class="card-header">
        <span class="card-title">Fluxo de ${formatMonthLabel(summary.monthKey)}</span>
      </div>
      <div class="card-body">
        ${renderFinanceChart(summary)}
        <div class="finance-chart-legend">
          <span>Salário: ${formatCurrency(summary.monthlySalary)}</span>
          <span>Extras: ${formatCurrency(summary.extraIncome)}</span>
          <span>Supérfluos: ${formatCurrency(summary.totalSuperfluous)}</span>
        </div>
      </div>
    </div>

    <div class="card finance-card">
      <div class="card-header">
        <span class="card-title">Salário Fixo</span>
        <button class="btn btn-secondary btn-sm" data-action="edit-salary">Editar</button>
      </div>
      <div class="card-body">
        <div class="finance-salary-display">
          <span class="finance-salary-amount">${formatCurrency(settings.monthlySalary)}</span>
          <span class="finance-salary-hint">/ mês</span>
        </div>
        <button class="btn btn-ghost btn-sm" data-action="edit-savings">Poupança atual: ${formatCurrency(settings.currentSavings)}</button>
      </div>
    </div>

    ${summary.totalSuperfluous > 0 ? `
      <div class="card finance-card finance-superfluous-card">
        <div class="card-header">
          <span class="card-title">Gastos Supérfluos</span>
        </div>
        <div class="card-body">
          <p class="finance-superfluous-total">Você pode economizar <strong>${formatCurrency(summary.totalSuperfluous)}</strong>/mês</p>
          <ul class="finance-superfluous-list">
            ${summary.superfluousBills.map(b => `<li>${escapeHtml(b.name)} — ${formatCurrency(b.amount)}</li>`).join('')}
            ${summary.superfluousDebts.map(d => `<li>${escapeHtml(d.name)} — ${formatCurrency(d.amount)}</li>`).join('')}
          </ul>
        </div>
      </div>
    ` : ''}

    ${goals.length > 0 ? `
      <div class="card finance-card">
        <div class="card-header">
          <span class="card-title">Resumo dos Objetivos</span>
          <button class="btn btn-ghost btn-sm" data-action="finance-tab" data-tab="goals">Ver todos</button>
        </div>
        <div class="card-body">
          ${goals.slice(0, 2).map(g => renderGoalCard(g, summary)).join('')}
        </div>
      </div>
    ` : `
      <div class="card finance-card">
        <div class="card-body">
          <div class="empty-state finance-empty">
            <p>Defina um objetivo financeiro para ver projeções.</p>
            <button class="btn btn-primary btn-sm" data-action="new-goal">Criar objetivo</button>
          </div>
        </div>
      </div>
    `}
  `;
}

function renderMonthlyBills(bills, monthKey) {
  return `
    <div class="section-header">
      <h3>Contas Mensais</h3>
      <button class="btn btn-primary btn-sm" data-action="new-monthly-bill">Nova conta</button>
    </div>
    <p class="section-subtitle">Contas que se repetem todo mês. Marque como pago quando quitar.</p>
    ${bills.length === 0 ? `
      <div class="empty-state"><p>Nenhuma conta mensal cadastrada.</p></div>
    ` : `
      <div class="finance-list">
        ${bills.map(bill => {
          const paid = isBillPaidThisMonth(bill, monthKey);
          return `
            <div class="finance-item ${paid ? 'paid' : ''} ${bill.isSuperfluous ? 'superfluous' : ''}">
              <button class="finance-check ${paid ? 'checked' : ''}" data-action="toggle-bill-paid" data-bill-id="${bill.id}" aria-label="${paid ? 'Marcar como não pago' : 'Marcar como pago'}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
              <div class="finance-item-body">
                <div class="finance-item-title">${escapeHtml(bill.name)}</div>
                <div class="finance-item-meta">
                  <span>Vence dia ${bill.dueDay}</span>
                  ${bill.isSuperfluous ? '<span class="badge badge-superfluous">Supérfluo</span>' : ''}
                  <span class="finance-item-amount">${formatCurrency(bill.amount)}</span>
                </div>
              </div>
              <div class="finance-item-actions">
                <button class="btn-icon" data-action="edit-monthly-bill" data-bill-id="${bill.id}" aria-label="Editar">✎</button>
                <button class="btn-icon danger" data-action="delete-monthly-bill" data-bill-id="${bill.id}" aria-label="Excluir">×</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `}
  `;
}

function renderDebts(debts) {
  const unpaid = debts.filter(d => !d.paid);
  const paid = debts.filter(d => d.paid);

  return `
    <div class="section-header">
      <h3>Dívidas Avulsas</h3>
      <button class="btn btn-primary btn-sm" data-action="new-debt">Nova dívida</button>
    </div>
    <p class="section-subtitle">Parcelas únicas ou dívidas que não se repetem mensalmente.</p>
    ${debts.length === 0 ? `
      <div class="empty-state"><p>Nenhuma dívida cadastrada.</p></div>
    ` : `
      ${unpaid.length > 0 ? `<h4 class="finance-section-title">Pendentes</h4><div class="finance-list">${unpaid.map(d => renderDebtItem(d)).join('')}</div>` : ''}
      ${paid.length > 0 ? `<h4 class="finance-section-title">Pagas</h4><div class="finance-list">${paid.map(d => renderDebtItem(d)).join('')}</div>` : ''}
    `}
  `;
}

function renderDebtItem(debt) {
  return `
    <div class="finance-item ${debt.paid ? 'paid' : ''} ${debt.isSuperfluous ? 'superfluous' : ''}">
      <button class="finance-check ${debt.paid ? 'checked' : ''}" data-action="toggle-debt-paid" data-debt-id="${debt.id}" aria-label="Alternar pago">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
      </button>
      <div class="finance-item-body">
        <div class="finance-item-title">${escapeHtml(debt.name)}</div>
        <div class="finance-item-meta">
          <span>Pagamento: ${formatDate(debt.dueDate)}</span>
          ${debt.isSuperfluous ? '<span class="badge badge-superfluous">Supérfluo</span>' : ''}
          <span class="finance-item-amount">${formatCurrency(debt.amount)}</span>
        </div>
      </div>
      <div class="finance-item-actions">
        <button class="btn-icon" data-action="edit-debt" data-debt-id="${debt.id}">✎</button>
        <button class="btn-icon danger" data-action="delete-debt" data-debt-id="${debt.id}">×</button>
      </div>
    </div>
  `;
}

function renderIncomes(settings, incomes, monthKey) {
  const monthIncomes = incomes.filter(i => i.date?.startsWith(monthKey));

  return `
    <div class="section-header">
      <h3>Receitas</h3>
      <button class="btn btn-primary btn-sm" data-action="new-income">Nova receita</button>
    </div>
    <div class="card finance-card finance-inline-card">
      <div class="card-body">
        <div class="finance-inline-row">
          <span>Salário fixo</span>
          <strong>${formatCurrency(settings.monthlySalary)}</strong>
          <button class="btn btn-ghost btn-sm" data-action="edit-salary">Editar</button>
        </div>
      </div>
    </div>
    <p class="section-subtitle">Recebimentos extras além do salário em ${formatMonthLabel(monthKey)}.</p>
    ${monthIncomes.length === 0 ? `
      <div class="empty-state"><p>Nenhuma receita extra este mês.</p></div>
    ` : `
      <div class="finance-list">
        ${monthIncomes.map(income => `
          <div class="finance-item income">
            <div class="finance-item-body">
              <div class="finance-item-title">${escapeHtml(income.name)}</div>
              <div class="finance-item-meta">
                <span>${formatDate(income.date)}</span>
                <span class="finance-item-amount positive">${formatCurrency(income.amount)}</span>
              </div>
            </div>
            <div class="finance-item-actions">
              <button class="btn-icon" data-action="edit-income" data-income-id="${income.id}">✎</button>
              <button class="btn-icon danger" data-action="delete-income" data-income-id="${income.id}">×</button>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}

function renderExpenses(expenses, monthKey) {
  const monthExpenses = expenses.filter(e => e.date?.startsWith(monthKey));

  return `
    <div class="section-header">
      <h3>Gastos</h3>
      <button class="btn btn-primary btn-sm" data-action="new-expense">Novo gasto</button>
    </div>
    <p class="section-subtitle">Despesas avulsas de ${formatMonthLabel(monthKey)}.</p>
    ${monthExpenses.length === 0 ? `
      <div class="empty-state"><p>Nenhum gasto registrado este mês.</p></div>
    ` : `
      <div class="finance-list">
        ${monthExpenses.map(expense => `
          <div class="finance-item">
            <div class="finance-item-body">
              <div class="finance-item-title">${escapeHtml(expense.name)}</div>
              <div class="finance-item-meta">
                <span>${formatDate(expense.date)}</span>
                ${expense.category ? `<span>${escapeHtml(expense.category)}</span>` : ''}
                <span class="finance-item-amount">${formatCurrency(expense.amount)}</span>
              </div>
            </div>
            <div class="finance-item-actions">
              <button class="btn-icon" data-action="edit-expense" data-expense-id="${expense.id}">✎</button>
              <button class="btn-icon danger" data-action="delete-expense" data-expense-id="${expense.id}">×</button>
            </div>
          </div>
        `).join('')}
      </div>
    `}
  `;
}

function renderGoals(goals, summary) {
  return `
    <div class="section-header">
      <h3>Objetivos Financeiros</h3>
      <button class="btn btn-primary btn-sm" data-action="new-goal">Novo objetivo</button>
    </div>
    <p class="section-subtitle">Veja em quanto tempo alcança cada meta com base no seu saldo mensal.</p>
    ${goals.length === 0 ? `
      <div class="empty-state">
        <p>Ex.: guardar R$ 10.000 para uma viagem.</p>
        <button class="btn btn-primary" data-action="new-goal">Criar objetivo</button>
      </div>
    ` : goals.map(g => renderGoalCard(g, summary)).join('')}
  `;
}

function renderGoalCard(goal, summary) {
  const projection = calcGoalProjection(goal, summary);
  const target = Number(goal.targetAmount) || 0;
  const saved = Number(goal.currentAmount) || 0;
  const percent = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;

  return `
    <div class="finance-goal-card">
      <div class="finance-goal-header">
        <h4>${escapeHtml(goal.name)}</h4>
        <div class="finance-item-actions">
          <button class="btn-icon" data-action="edit-goal" data-goal-id="${goal.id}">✎</button>
          <button class="btn-icon danger" data-action="delete-goal" data-goal-id="${goal.id}">×</button>
        </div>
      </div>
      <div class="finance-goal-progress">
        <div class="finance-goal-amounts">
          <span>${formatCurrency(saved)}</span>
          <span>de ${formatCurrency(target)}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill${percent === 100 ? ' complete' : ''}" style="width: ${percent}%"></div>
        </div>
        <span class="finance-goal-percent">${percent}%</span>
      </div>
      ${projection.reached ? `
        <p class="finance-goal-projection success">Objetivo alcançado!</p>
      ` : `
        <div class="finance-goal-projection">
          <p><strong>Faltam:</strong> ${formatCurrency(projection.remaining)}</p>
          ${projection.monthsNormal != null ? `
            <p>Ritmo atual: <strong>${projection.monthsNormal} mes${projection.monthsNormal !== 1 ? 'es' : ''}</strong>
            ${projection.targetDateNormal ? `(~${projection.targetDateNormal.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })})` : ''}</p>
          ` : '<p class="finance-goal-warning">Saldo mensal negativo — ajuste gastos para projetar prazo.</p>'}
          ${projection.monthsOptimized != null && summary.totalSuperfluous > 0 && projection.monthsOptimized < (projection.monthsNormal || Infinity) ? `
            <p class="finance-goal-optimized">Sem supérfluos: <strong>${projection.monthsOptimized} mes${projection.monthsOptimized !== 1 ? 'es' : ''}</strong>
            ${projection.targetDateOptimized ? `(~${projection.targetDateOptimized.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })})` : ''}
            — economize ${formatCurrency(summary.totalSuperfluous)}/mês</p>
          ` : ''}
        </div>
      `}
    </div>
  `;
}

/* ---- Formularios ---- */

export function salaryForm(settings) {
  return `
    <form id="modal-form">
      <div class="form-group">
        <label>Salário fixo mensal <span class="required">*</span></label>
        <input type="number" class="form-input" name="monthlySalary" min="0" step="0.01" required value="${settings.monthlySalary || ''}" placeholder="Ex: 3500">
      </div>
    </form>
  `;
}

export function savingsForm(settings) {
  return `
    <form id="modal-form">
      <div class="form-group">
        <label>Quanto você já tem guardado</label>
        <input type="number" class="form-input" name="currentSavings" min="0" step="0.01" required value="${settings.currentSavings || ''}" placeholder="Ex: 1500">
        <p class="form-hint">Usado para acompanhar sua reserva e objetivos.</p>
      </div>
    </form>
  `;
}

export function monthlyBillForm(bill = null) {
  return `
    <form id="modal-form">
      <div class="form-group">
        <label>Nome da conta <span class="required">*</span></label>
        <input type="text" class="form-input" name="name" required value="${bill ? escapeHtml(bill.name) : ''}" placeholder="Ex: Aluguel, Netflix">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Valor (R$) <span class="required">*</span></label>
          <input type="number" class="form-input" name="amount" min="0" step="0.01" required value="${bill ? bill.amount : ''}" placeholder="Ex: 1200">
        </div>
        <div class="form-group">
          <label>Dia do vencimento <span class="required">*</span></label>
          <input type="number" class="form-input" name="dueDay" min="1" max="31" required value="${bill ? bill.dueDay : ''}" placeholder="Ex: 10">
        </div>
      </div>
      <div class="form-group">
        <label class="finance-checkbox-label">
          <input type="checkbox" name="isSuperfluous" ${bill?.isSuperfluous ? 'checked' : ''}>
          Marcar como gasto supérfluo (não essencial)
        </label>
      </div>
    </form>
  `;
}

export function debtForm(debt = null) {
  return `
    <form id="modal-form">
      <div class="form-group">
        <label>Nome da dívida <span class="required">*</span></label>
        <input type="text" class="form-input" name="name" required value="${debt ? escapeHtml(debt.name) : ''}" placeholder="Ex: Cartão, Empréstimo">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Valor (R$) <span class="required">*</span></label>
          <input type="number" class="form-input" name="amount" min="0" step="0.01" required value="${debt ? debt.amount : ''}">
        </div>
        <div class="form-group">
          <label>Data de pagamento <span class="required">*</span></label>
          <input type="date" class="form-input" name="dueDate" required value="${debt?.dueDate || ''}">
        </div>
      </div>
      <div class="form-group">
        <label class="finance-checkbox-label">
          <input type="checkbox" name="isSuperfluous" ${debt?.isSuperfluous ? 'checked' : ''}>
          Marcar como gasto supérfluo
        </label>
      </div>
    </form>
  `;
}

export function incomeForm(income = null) {
  return `
    <form id="modal-form">
      <div class="form-group">
        <label>Descrição <span class="required">*</span></label>
        <input type="text" class="form-input" name="name" required value="${income ? escapeHtml(income.name) : ''}" placeholder="Ex: Freelance, Bônus">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Valor (R$) <span class="required">*</span></label>
          <input type="number" class="form-input" name="amount" min="0" step="0.01" required value="${income ? income.amount : ''}">
        </div>
        <div class="form-group">
          <label>Data do recebimento <span class="required">*</span></label>
          <input type="date" class="form-input" name="date" required value="${income?.date || new Date().toISOString().slice(0, 10)}">
        </div>
      </div>
    </form>
  `;
}

export function expenseForm(expense = null) {
  return `
    <form id="modal-form">
      <div class="form-group">
        <label>Descrição <span class="required">*</span></label>
        <input type="text" class="form-input" name="name" required value="${expense ? escapeHtml(expense.name) : ''}" placeholder="Ex: Mercado, Transporte">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Valor (R$) <span class="required">*</span></label>
          <input type="number" class="form-input" name="amount" min="0" step="0.01" required value="${expense ? expense.amount : ''}">
        </div>
        <div class="form-group">
          <label>Data <span class="required">*</span></label>
          <input type="date" class="form-input" name="date" required value="${expense?.date || new Date().toISOString().slice(0, 10)}">
        </div>
      </div>
      <div class="form-group">
        <label>Categoria (opcional)</label>
        <input type="text" class="form-input" name="category" value="${expense ? escapeHtml(expense.category || '') : ''}" placeholder="Ex: Alimentação">
      </div>
    </form>
  `;
}

export function goalForm(goal = null) {
  return `
    <form id="modal-form">
      <div class="form-group">
        <label>Nome do objetivo <span class="required">*</span></label>
        <input type="text" class="form-input" name="name" required value="${goal ? escapeHtml(goal.name) : ''}" placeholder="Ex: Reserva de emergência">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Meta (R$) <span class="required">*</span></label>
          <input type="number" class="form-input" name="targetAmount" min="0" step="0.01" required value="${goal ? goal.targetAmount : ''}" placeholder="Ex: 10000">
        </div>
        <div class="form-group">
          <label>Já guardado (R$)</label>
          <input type="number" class="form-input" name="currentAmount" min="0" step="0.01" value="${goal ? goal.currentAmount : 0}">
        </div>
      </div>
    </form>
  `;
}

/* ---- Handlers de persistencia ---- */

export function handleSaveSalary(data, userId) {
  const form = document.getElementById('modal-form');
  if (!form.reportValidity()) return false;
  const monthlySalary = parseFloat(form.querySelector('[name="monthlySalary"]').value) || 0;
  updateFinanceSettings(data, userId, { monthlySalary });
  return true;
}

export function handleSaveSavings(data, userId) {
  const form = document.getElementById('modal-form');
  if (!form.reportValidity()) return false;
  const currentSavings = parseFloat(form.querySelector('[name="currentSavings"]').value) || 0;
  updateFinanceSettings(data, userId, { currentSavings });
  return true;
}

export function handleSaveMonthlyBill(data, userId, billId = null) {
  const form = document.getElementById('modal-form');
  if (!form.reportValidity()) return false;

  const payload = {
    name: form.querySelector('[name="name"]').value.trim(),
    amount: parseFloat(form.querySelector('[name="amount"]').value) || 0,
    dueDay: parseInt(form.querySelector('[name="dueDay"]').value, 10),
    isSuperfluous: form.querySelector('[name="isSuperfluous"]').checked
  };

  if (billId) {
    updateMonthlyBill(data, billId, payload);
  } else {
    addMonthlyBill(data, {
      id: generateId(),
      userId,
      ...payload,
      paid: false,
      paidMonth: null
    });
  }
  return true;
}

export function handleSaveDebt(data, userId, debtId = null) {
  const form = document.getElementById('modal-form');
  if (!form.reportValidity()) return false;

  const payload = {
    name: form.querySelector('[name="name"]').value.trim(),
    amount: parseFloat(form.querySelector('[name="amount"]').value) || 0,
    dueDate: form.querySelector('[name="dueDate"]').value,
    isSuperfluous: form.querySelector('[name="isSuperfluous"]').checked
  };

  if (debtId) {
    updateDebt(data, debtId, payload);
  } else {
    addDebt(data, {
      id: generateId(),
      userId,
      ...payload,
      paid: false,
      paidAt: null
    });
  }
  return true;
}

export function handleSaveIncome(data, userId, incomeId = null) {
  const form = document.getElementById('modal-form');
  if (!form.reportValidity()) return false;

  const payload = {
    name: form.querySelector('[name="name"]').value.trim(),
    amount: parseFloat(form.querySelector('[name="amount"]').value) || 0,
    date: form.querySelector('[name="date"]').value
  };

  if (incomeId) {
    updateIncome(data, incomeId, payload);
  } else {
    addIncome(data, { id: generateId(), userId, ...payload });
  }
  return true;
}

export function handleSaveExpense(data, userId, expenseId = null) {
  const form = document.getElementById('modal-form');
  if (!form.reportValidity()) return false;

  const payload = {
    name: form.querySelector('[name="name"]').value.trim(),
    amount: parseFloat(form.querySelector('[name="amount"]').value) || 0,
    date: form.querySelector('[name="date"]').value,
    category: form.querySelector('[name="category"]').value.trim() || null
  };

  if (expenseId) {
    updateExpense(data, expenseId, payload);
  } else {
    addExpense(data, { id: generateId(), userId, ...payload });
  }
  return true;
}

export function handleSaveGoal(data, userId, goalId = null) {
  const form = document.getElementById('modal-form');
  if (!form.reportValidity()) return false;

  const payload = {
    name: form.querySelector('[name="name"]').value.trim(),
    targetAmount: parseFloat(form.querySelector('[name="targetAmount"]').value) || 0,
    currentAmount: parseFloat(form.querySelector('[name="currentAmount"]').value) || 0
  };

  if (goalId) {
    updateGoal(data, goalId, payload);
  } else {
    addGoal(data, {
      id: generateId(),
      userId,
      ...payload,
      createdAt: new Date().toISOString()
    });
  }
  return true;
}

export {
  getFinanceSettings,
  getMonthlyBillsByUser,
  getDebtsByUser,
  getIncomesByUser,
  getExpensesByUser,
  getGoalsByUser,
  toggleMonthlyBillPaid,
  toggleDebtPaid,
  deleteMonthlyBill,
  deleteDebt,
  deleteIncome,
  deleteExpense,
  deleteGoal
};
