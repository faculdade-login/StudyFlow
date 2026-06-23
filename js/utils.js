/**
 * Funcoes utilitarias de calculo e formatacao.
 */

export const COURSE_CATEGORIES = [
  'Tecnologia',
  'Design',
  'Idiomas',
  'Negócios',
  'Desenvolvimento Pessoal',
  'Ferramentas e Certificações'
];

const CATEGORY_SLUGS = {
  'Tecnologia': 'tech',
  'Design': 'design',
  'Idiomas': 'languages',
  'Negócios': 'business',
  'Desenvolvimento Pessoal': 'personal',
  'Ferramentas e Certificações': 'tools'
};

export function getCategorySlug(category) {
  return CATEGORY_SLUGS[category] || 'default';
}

export function renderCategoryBadge(category) {
  if (!category) return '';
  const slug = getCategorySlug(category);
  return `<span class="badge badge-category badge-category-${slug}">${escapeHtml(category)}</span>`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR');
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getDeadlineInfo(deadline) {
  if (!deadline) return { days: null, expired: false, label: '', className: '' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadlineDate = new Date(deadline + 'T00:00:00');
  const diffMs = deadlineDate - today;
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return {
      days,
      expired: true,
      label: 'Acesso encerrado',
      className: 'deadline-expired'
    };
  }

  if (days === 0) {
    return {
      days: 0,
      expired: false,
      label: 'Acesso encerra hoje',
      className: 'deadline-warning'
    };
  }

  if (days <= 7) {
    return {
      days,
      expired: false,
      label: `Acesso por mais ${days} dia${days > 1 ? 's' : ''}`,
      className: 'deadline-warning'
    };
  }

  return {
    days,
    expired: false,
    label: `Acesso por mais ${days} dias`,
    className: 'deadline-ok'
  };
}

export function calcProgress(completed, total) {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

export function calcModuleProgress(lessons) {
  const total = lessons.length;
  const completed = lessons.filter(l => l.completed).length;
  return { completed, total, percent: calcProgress(completed, total) };
}

export function calcCourseProgress(lessons) {
  return calcModuleProgress(lessons);
}

/**
 * Estima horas estudadas em um curso dividindo a carga horaria
 * igualmente entre todas as aulas dos modulos.
 * Ex.: 10h no curso, 10 aulas -> 1h por aula; 3 aulas feitas = 3h estimadas.
 */
export function calcCourseEstimatedHours(course, lessons) {
  if (!course.workloadHours || lessons.length === 0) return 0;

  const completed = lessons.filter(l => l.completed).length;
  const hoursPerLesson = course.workloadHours / lessons.length;

  return Math.round(completed * hoursPerLesson * 10) / 10;
}

export function calcHoursStudied(courses, getLessonsFn) {
  let hours = 0;

  courses.forEach(course => {
    const lessons = getLessonsFn(course.id);
    hours += calcCourseEstimatedHours(course, lessons);
  });

  return Math.round(hours * 10) / 10;
}

/**
 * Curso concluido somente quando cada modulo tem ao menos uma aula
 * e todas as aulas de todos os modulos estao completas.
 */
export function isCourseComplete(lessons, modules = null) {
  if (modules && modules.length > 0) {
    return modules.every(module => {
      const moduleLessons = lessons.filter(l => l.moduleId === module.id);
      return moduleLessons.length > 0 && moduleLessons.every(l => l.completed);
    });
  }

  if (lessons.length === 0) return false;
  return lessons.every(l => l.completed);
}

export function generateLessonBatchNames(quantity, baseName = 'Aula') {
  const name = baseName.trim() || 'Aula';
  return Array.from({ length: quantity }, (_, i) => `${i + 1} - ${name}`);
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function formatHours(hours, options = {}) {
  const value = Number(hours) || 0;
  const formatted = `${value % 1 === 0 ? value : value.toFixed(1)}h`;
  return options.estimated ? `~${formatted}` : formatted;
}

export function formatOrdinal(position) {
  const n = Number(position);
  if (!n || n < 1) return '-';
  return `${n}°`;
}

export function getInitials(name) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function renderProgressBar(label, percent, options = {}) {
  const completeClass = percent === 100 ? ' complete' : '';
  const showLabel = options.showLabel !== false;

  return `
    <div class="progress">
      ${showLabel ? `
        <div class="progress-header">
          <span class="progress-label">${escapeHtml(label)}</span>
          <span class="progress-value">${percent}%</span>
        </div>
      ` : ''}
      <div class="progress-bar">
        <div class="progress-fill${completeClass}" style="width: ${percent}%"></div>
      </div>
    </div>
  `;
}
