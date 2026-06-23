/**
 * Calculos e utilitarios do modulo financeiro.
 */

export function getCurrentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value) || 0);
}

export function isBillPaidThisMonth(bill, monthKey = getCurrentMonthKey()) {
  return bill.paid === true && bill.paidMonth === monthKey;
}

export function getIncomesForMonth(incomes, monthKey) {
  return incomes.filter(i => i.date && i.date.startsWith(monthKey));
}

export function getExpensesForMonth(expenses, monthKey) {
  return expenses.filter(e => e.date && e.date.startsWith(monthKey));
}

export function sumAmounts(items) {
  return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

export function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function calcFinanceSummary({
  settings,
  incomes,
  monthlyBills,
  debts,
  expenses,
  monthKey = getCurrentMonthKey()
}) {
  const monthlySalary = Number(settings.monthlySalary) || 0;

  const monthIncomes = getIncomesForMonth(incomes, monthKey);
  const extraIncome = sumAmounts(monthIncomes);
  const totalIncome = monthlySalary + extraIncome;

  const monthExpenses = getExpensesForMonth(expenses, monthKey);
  const expensesTotal = sumAmounts(monthExpenses);

  const billsPaid = monthlyBills.filter(b => isBillPaidThisMonth(b, monthKey));
  const billsUnpaid = monthlyBills.filter(b => !isBillPaidThisMonth(b, monthKey));

  const monthlyBillsTotal = sumAmounts(monthlyBills);
  const paidBillsTotal = sumAmounts(billsPaid);
  const unpaidBillsTotal = sumAmounts(billsUnpaid);

  const superfluousBills = billsUnpaid.filter(b => b.isSuperfluous);
  const essentialBills = billsUnpaid.filter(b => !b.isSuperfluous);
  const superfluousTotal = sumAmounts(superfluousBills);
  const essentialBillsTotal = sumAmounts(essentialBills);

  const unpaidDebts = debts.filter(d => !d.paid);
  const debtsDueThisMonth = unpaidDebts.filter(d => d.dueDate?.startsWith(monthKey));
  const debtsDueTotal = sumAmounts(debtsDueThisMonth);
  const superfluousDebts = unpaidDebts.filter(d => d.isSuperfluous);
  const superfluousDebtsTotal = sumAmounts(superfluousDebts);

  const totalSuperfluous = superfluousTotal + superfluousDebtsTotal;
  const totalCommitted = paidBillsTotal + unpaidBillsTotal + expensesTotal + debtsDueTotal;
  const monthlyBalance = totalIncome - totalCommitted;
  const potentialSavings = monthlyBalance + totalSuperfluous;
  const currentSavings = monthlyBalance;

  return {
    monthKey,
    monthlySalary,
    extraIncome,
    totalIncome,
    expensesTotal,
    monthlyBillsTotal,
    paidBillsTotal,
    unpaidBillsTotal,
    essentialBillsTotal,
    superfluousTotal,
    superfluousBills,
    superfluousDebts,
    superfluousDebtsTotal,
    totalSuperfluous,
    debtsDueThisMonth,
    debtsDueTotal,
    unpaidDebts,
    totalCommitted,
    monthlyBalance,
    potentialSavings,
    currentSavings,
    billsPaid,
    billsUnpaid
  };
}

export function calcGoalProjection(goal, summary) {
  const target = Number(goal.targetAmount) || 0;
  const saved = Number(goal.currentAmount) || 0;
  const remaining = Math.max(0, target - saved);

  if (remaining === 0) {
    return {
      goal,
      remaining: 0,
      monthsNormal: 0,
      monthsOptimized: 0,
      targetDateNormal: new Date(),
      targetDateOptimized: new Date(),
      reached: true
    };
  }

  const monthlyNormal = summary.monthlyBalance;
  const monthlyOptimized = summary.potentialSavings;

  const monthsNormal = monthlyNormal > 0 ? Math.ceil(remaining / monthlyNormal) : null;
  const monthsOptimized = monthlyOptimized > 0 ? Math.ceil(remaining / monthlyOptimized) : null;

  return {
    goal,
    remaining,
    monthsNormal,
    monthsOptimized,
    targetDateNormal: monthsNormal ? addMonths(new Date(), monthsNormal) : null,
    targetDateOptimized: monthsOptimized ? addMonths(new Date(), monthsOptimized) : null,
    reached: false
  };
}

export function renderFinanceChart(summary) {
  const items = [
    { label: 'Receitas', value: summary.totalIncome, color: '#58CC02' },
    { label: 'Essenciais', value: summary.essentialBillsTotal + summary.expensesTotal + summary.debtsDueTotal + summary.paidBillsTotal, color: '#1CB0F6' },
    { label: 'Supérfluas', value: summary.totalSuperfluous, color: '#FF9600' },
    { label: 'Saldo', value: Math.max(0, summary.monthlyBalance), color: '#CE82FF' }
  ];

  const max = Math.max(...items.map(i => i.value), 1);

  const bars = items.map(item => {
    const height = Math.max(4, Math.round((item.value / max) * 100));
    return `
      <div class="finance-chart-bar-group">
        <div class="finance-chart-bar-wrap">
          <div class="finance-chart-bar" style="height: ${height}%; background: ${item.color};" title="${item.label}: ${formatCurrency(item.value)}"></div>
        </div>
        <span class="finance-chart-label">${item.label}</span>
        <span class="finance-chart-value">${formatCurrency(item.value)}</span>
      </div>
    `;
  }).join('');

  return `<div class="finance-chart">${bars}</div>`;
}

export function getFinancialHealthStatus(summary) {
  if (summary.monthlyBalance < 0) {
    return { label: 'Atenção', className: 'health-danger', message: 'Gastos acima da receita este mês.' };
  }
  if (summary.monthlyBalance === 0) {
    return { label: 'No limite', className: 'health-warning', message: 'Receita e gastos estão empatados.' };
  }
  if (summary.totalSuperfluous > 0 && summary.monthlyBalance < summary.totalSuperfluous) {
    return {
      label: 'Pode melhorar',
      className: 'health-warning',
      message: `Cortando supérfluos (${formatCurrency(summary.totalSuperfluous)}), sobra mais para poupar.`
    };
  }
  return { label: 'Saudável', className: 'health-good', message: 'Sobra dinheiro no fim do mês. Continue assim!' };
}
