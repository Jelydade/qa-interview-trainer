import './style.css';
import './toggle.css';
import './study-deepening.css';
import { questions, sections } from './questions.js';
import { studyAnswers } from './studyAnswers.js';
import { studyAdditions } from './studyAdditions.js';
import { studyAdditionsFoundations } from './studyAdditionsFoundations.js';
import { studyAdditionsArchitecture } from './studyAdditionsArchitecture.js';
import { studyAdditionsLanguages } from './studyAdditionsLanguages.js';
import { studyAdditionsOopAlgorithms } from './studyAdditionsOopAlgorithms.js';
import { studyAdditionsPython } from './studyAdditionsPython.js';
import { studyAdditionsPythonAdvanced } from './studyAdditionsPythonAdvanced.js';
import { studyAdditionsPytestWeb } from './studyAdditionsPytestWeb.js';
import { studyAdditionsInfrastructure } from './studyAdditionsInfrastructure.js';
import { studyAdditionsAutomation } from './studyAdditionsAutomation.js';
import { studyAdditionsFinal } from './studyAdditionsFinal.js';
import { documentAnswers } from './documentAnswers.js';

const app = document.querySelector('#app');
const ANSWER_PREFERENCE_KEY = 'aqa-trainer.show-answers';
const ORDER_PREFERENCE_KEY = 'aqa-trainer.questions-in-order';
const COMPLETED_QUESTIONS_KEY = 'aqa-trainer.completed-questions';
const REVIEW_PROGRESS_KEY = 'aqa-trainer.review-progress-v1';
const getSavedAnswerPreference = () => {
  try {
    return localStorage.getItem(ANSWER_PREFERENCE_KEY) === 'true';
  } catch {
    return false;
  }
};
const saveAnswerPreference = (value) => {
  try {
    localStorage.setItem(ANSWER_PREFERENCE_KEY, String(value));
  } catch {
    // Приложение остаётся рабочим, если хранилище недоступно.
  }
};
const getSavedOrderPreference = () => {
  try {
    return localStorage.getItem(ORDER_PREFERENCE_KEY) === 'true';
  } catch {
    return false;
  }
};
const saveOrderPreference = (value) => {
  try {
    localStorage.setItem(ORDER_PREFERENCE_KEY, String(value));
  } catch {
    // Приложение остаётся рабочим, если хранилище недоступно.
  }
};
const getSavedReviewProgress = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(REVIEW_PROGRESS_KEY) ?? '{}');
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  } catch {
    return {};
  }
};
const saveReviewProgress = () => {
  try {
    localStorage.setItem(REVIEW_PROGRESS_KEY, JSON.stringify(reviewProgress));
  } catch {
    // Приложение остаётся рабочим, если хранилище недоступно.
  }
};

let activeSection = 'all';
let currentQuestion = null;
let showAnswersByDefault = getSavedAnswerPreference();
let questionsInOrder = getSavedOrderPreference();
let answerVisible = showAnswersByDefault;
let seen = new Set();
let reviewProgress = getSavedReviewProgress();
let reviewMode = false;
let catalogOpen = false;
let catalogSearch = '';

const localDate = (date = new Date()) => {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 10);
};
const dateAfterDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDate(date);
};
const baseQuestions = () => activeSection === 'all' ? questions : questions.filter((item) => item.section === activeSection);
const isDueForReview = (question) => reviewProgress[question.question]?.nextReviewAt <= localDate();
const availableQuestions = () => reviewMode ? baseQuestions().filter(isDueForReview) : baseQuestions();
const completedCount = (pool) => pool.filter((item) => reviewProgress[item.question]?.repetitions > 0).length;
const dueCount = () => questions.filter(isDueForReview).length;
const reviewSchedule = {
  again: { label: 'Не знаю', days: 1 },
  hard: { label: 'Сложно', days: 3 },
  good: { label: 'Знаю', days: null },
};
const scheduleReview = (rating) => {
  const previous = reviewProgress[currentQuestion.question] ?? { intervalDays: 0, repetitions: 0 };
  const nextInterval = rating === 'good'
    ? ([7, 14, 30, 60, 120].find((days) => days > previous.intervalDays) ?? 120)
    : reviewSchedule[rating].days;
  reviewProgress = {
    ...reviewProgress,
    [currentQuestion.question]: {
      nextReviewAt: dateAfterDays(nextInterval),
      intervalDays: nextInterval,
      repetitions: previous.repetitions + 1,
      lastRating: rating,
      reviewedAt: new Date().toISOString(),
    },
  };
  saveReviewProgress();
  if (reviewMode && !availableQuestions().length) {
    reviewMode = false;
    currentQuestion = null;
  }
  nextQuestion();
};

const randomQuestion = () => {
  const pool = availableQuestions();
  const unseen = pool.filter((item) => !seen.has(item.question));
  if (!unseen.length) seen = new Set();
  const source = unseen.length ? unseen : pool;
  currentQuestion = source[Math.floor(Math.random() * source.length)];
  seen.add(currentQuestion.question);
  answerVisible = showAnswersByDefault;
  render();
};

const orderedQuestion = () => {
  const pool = availableQuestions();
  const currentIndex = pool.indexOf(currentQuestion);

  if (currentIndex === -1 || currentIndex === pool.length - 1) {
    if (currentIndex === pool.length - 1) seen = new Set();
    currentQuestion = pool[0];
  } else {
    currentQuestion = pool[currentIndex + 1];
  }

  seen.add(currentQuestion.question);
  answerVisible = showAnswersByDefault;
  render();
};

const nextQuestion = () => (questionsInOrder ? orderedQuestion() : randomQuestion());

const sectionLabel = (id) => sections.find((item) => item.id === id)?.label;
const escapeHtml = (value) => value.replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]);

function render() {
  if (!currentQuestion) {
    const pool = availableQuestions();
    currentQuestion = questionsInOrder ? pool[0] : pool[Math.floor(Math.random() * pool.length)];
  }
  const pool = availableQuestions();
  const completedInPool = completedCount(baseQuestions());
  const questionProgress = reviewProgress[currentQuestion.question];
  const questionCompleted = questionProgress?.repetitions > 0;
  const todayDueCount = dueCount();
  const normalizedSearch = catalogSearch.trim().toLocaleLowerCase('ru-RU');
  const catalogQuestions = pool.filter((item) => !normalizedSearch || item.question.toLocaleLowerCase('ru-RU').includes(normalizedSearch));
  app.innerHTML = `
    <div class="orb orb-one"></div><div class="orb orb-two"></div>
    <section class="shell">
      <header class="header">
        <a class="brand" href="#" aria-label="На главную"><span class="brand-mark">Q</span><span>AQA<span class="muted">.trainer</span></span></a>
        <div class="header-controls">
          <label class="answer-preference" for="answers-toggle"><span>Показывать ответы</span><input id="answers-toggle" type="checkbox" ${showAnswersByDefault ? 'checked' : ''} /><span class="toggle-track" aria-hidden="true"><span class="toggle-thumb"></span></span></label>
          <label class="answer-preference" for="order-toggle"><span>По порядку</span><input id="order-toggle" type="checkbox" ${questionsInOrder ? 'checked' : ''} /><span class="toggle-track" aria-hidden="true"><span class="toggle-thumb"></span></span></label>
          <button class="reset-progress" id="reset-progress" type="button">Сбросить прогресс</button>
          <span class="part">Подготовка к интервью · Части 1–3</span>
        </div>
      </header>
      <div class="intro">
        <p class="eyebrow">AQA Interview Trainer</p>
        <h1>Отвечайте уверенно,<br><em>а не наизусть.</em></h1>
        <p class="lead">Теория тестирования и основы программирования: случайные вопросы, понятные ответы и акценты для интервью.</p>
      </div>
      <nav class="filters" aria-label="Разделы вопросов">
        <button class="filter ${activeSection === 'all' ? 'active' : ''}" data-section="all">Все вопросы <span>${questions.length}</span></button>
        ${sections.map((item) => `<button class="filter ${activeSection === item.id ? 'active' : ''}" data-section="${item.id}">${item.label} <span>${questions.filter((q) => q.section === item.id).length}</span></button>`).join('')}
      </nav>
      <div class="view-switch">
        <div><span class="view-title">${reviewMode ? 'Интервальное повторение' : 'Режим тренировки'}</span><span class="view-description">${reviewMode ? 'Вопросы, которые пора повторить сегодня' : catalogOpen ? 'Выберите вопрос из списка' : questionsInOrder ? 'Следующий вопрос из выбранного раздела — по порядку' : 'Случайный вопрос из выбранного раздела'}</span></div>
        <div class="view-actions"><button class="review-toggle ${reviewMode ? 'active' : ''}" id="review-toggle" type="button">↻ Повторить сегодня <span>${todayDueCount}</span></button><button class="catalog-toggle ${catalogOpen ? 'active' : ''}" id="catalog-toggle" aria-expanded="${catalogOpen}"><span class="catalog-icon">☷</span>${catalogOpen ? 'Вернуться к карточке' : 'Все вопросы'}</button></div>
      </div>
      <section class="catalog ${catalogOpen ? 'open' : ''}" aria-label="Список вопросов">
        <div class="catalog-header"><div><p class="catalog-eyebrow">КАТАЛОГ</p><h2>Все вопросы <span>${pool.length}</span></h2></div><label class="search"><span>⌕</span><input id="catalog-search" type="search" value="${escapeHtml(catalogSearch)}" placeholder="Найти вопрос" aria-label="Поиск вопроса" /></label></div>
        <p class="catalog-result">${catalogQuestions.length === pool.length ? 'Выберите вопрос, чтобы открыть карточку с ответом.' : `Найдено: ${catalogQuestions.length}`}</p>
        <div class="question-list">
          ${catalogQuestions.length ? catalogQuestions.map((item) => {
            const index = questions.indexOf(item);
            const completed = reviewProgress[item.question]?.repetitions > 0;
            return `<button class="question-item ${item === currentQuestion ? 'selected' : ''} ${completed ? 'completed' : ''}" data-question-index="${index}"><span class="list-number">${completed ? '✓' : String(index + 1).padStart(2, '0')}</span><span class="list-question">${item.question}${completed ? '<span class="completed-status">Пройдено</span>' : ''}</span><span class="list-topic ${item.section}">${sectionLabel(item.section)}</span><span class="list-arrow">→</span></button>`;
          }).join('') : '<p class="empty-list">Ничего не найдено. Попробуйте другой запрос.</p>'}
        </div>
      </section>
      <section class="card" aria-live="polite">
        <div class="card-top"><span class="topic ${currentQuestion.section}">${sectionLabel(currentQuestion.section)}</span><span class="counter">${completedInPool} / ${baseQuestions().length} изучено</span></div>
        <p class="question-number">ВОПРОС</p>
        <h2>${currentQuestion.question}</h2>
        <div class="answer ${answerVisible ? 'shown' : ''}">
          <div class="answer-rule"></div>
          <p class="answer-title">Сильный ответ</p>
          ${documentAnswers[currentQuestion.question] ?? currentQuestion.answerHtml ?? studyAnswers[currentQuestion.question] ?? currentQuestion.answer.split('\n\n').map((text) => `<p>${text}</p>`).join('')}
          ${documentAnswers[currentQuestion.question] ? '' : (studyAdditions[currentQuestion.question] ?? studyAdditionsFoundations[currentQuestion.question] ?? studyAdditionsArchitecture[currentQuestion.question] ?? studyAdditionsLanguages[currentQuestion.question] ?? studyAdditionsOopAlgorithms[currentQuestion.question] ?? studyAdditionsPython[currentQuestion.question] ?? studyAdditionsPythonAdvanced[currentQuestion.question] ?? studyAdditionsPytestWeb[currentQuestion.question] ?? studyAdditionsInfrastructure[currentQuestion.question] ?? studyAdditionsAutomation[currentQuestion.question] ?? studyAdditionsFinal[currentQuestion.question] ?? '')}
          <aside><span>✦</span><div><b>На заметку</b><p>${currentQuestion.tip}</p></div></aside>
        </div>
        <div class="actions">
          <button class="secondary" id="answer-button">${answerVisible ? 'Скрыть ответ' : 'Показать ответ'}</button>
          ${answerVisible ? `<div class="review-ratings" aria-label="Оцените, насколько уверенно вы ответили"><span class="review-prompt">Как получилось?</span><button class="rating again" data-rating="again">Не знаю <small>1 день</small></button><button class="rating hard" data-rating="hard">Сложно <small>3 дня</small></button><button class="rating good" data-rating="good">Знаю <small>${questionProgress?.intervalDays ? `→ ${([7, 14, 30, 60, 120].find((days) => days > questionProgress.intervalDays) ?? 120)} дней` : '7 дней'}</small></button></div>` : ''}
          <button class="primary" id="next-button">Следующий вопрос <span>→</span></button>
        </div>
      </section>
      <p class="footer-note">Сначала сформулируйте ответ сами — затем сравните его с подсказкой.</p>
    </section>`;

  document.querySelectorAll('[data-section]').forEach((button) => {
    button.addEventListener('click', () => { activeSection = button.dataset.section; reviewMode = false; seen = new Set(); currentQuestion = null; nextQuestion(); });
  });
  document.querySelector('#answer-button').addEventListener('click', () => { answerVisible = !answerVisible; render(); });
  document.querySelector('#answers-toggle').addEventListener('change', (event) => {
    showAnswersByDefault = event.target.checked;
    saveAnswerPreference(showAnswersByDefault);
    answerVisible = showAnswersByDefault;
    render();
  });
  document.querySelector('#order-toggle').addEventListener('change', (event) => {
    questionsInOrder = event.target.checked;
    saveOrderPreference(questionsInOrder);
    render();
  });
  document.querySelector('#reset-progress').addEventListener('click', () => {
    if (!Object.keys(reviewProgress).length || !window.confirm('Сбросить историю изучения и расписание повторений для всех вопросов? Это действие нельзя отменить.')) return;
    reviewProgress = {};
    try { localStorage.removeItem(COMPLETED_QUESTIONS_KEY); } catch { /* Старые отметки можно безопасно игнорировать. */ }
    saveReviewProgress();
    render();
  });
  document.querySelector('#review-toggle').addEventListener('click', () => {
    const count = dueCount();
    if (!count) {
      window.alert('На сегодня повторений нет. Вернитесь завтра или продолжайте изучать новые вопросы.');
      return;
    }
    reviewMode = !reviewMode;
    catalogOpen = false;
    seen = new Set();
    currentQuestion = null;
    nextQuestion();
  });
  document.querySelectorAll('[data-rating]').forEach((button) => {
    button.addEventListener('click', () => scheduleReview(button.dataset.rating));
  });
  document.querySelector('#next-button').addEventListener('click', nextQuestion);
  document.querySelector('#catalog-toggle').addEventListener('click', () => { catalogOpen = !catalogOpen; render(); });
  document.querySelector('#catalog-search')?.addEventListener('input', (event) => {
    catalogSearch = event.target.value;
    render();
    const input = document.querySelector('#catalog-search');
    input.focus();
    input.setSelectionRange(catalogSearch.length, catalogSearch.length);
  });
  document.querySelectorAll('[data-question-index]').forEach((button) => {
    button.addEventListener('click', () => {
      currentQuestion = questions[Number(button.dataset.questionIndex)];
      seen.add(currentQuestion.question);
      answerVisible = showAnswersByDefault;
      catalogOpen = false;
      render();
      document.querySelector('.card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

render();
