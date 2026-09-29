import './style.css';
import './toggle.css';
import { questions, sections } from './questions.js';
import { studyAnswers } from './studyAnswers.js';

const app = document.querySelector('#app');
const ANSWER_PREFERENCE_KEY = 'aqa-trainer.show-answers';
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

let activeSection = 'all';
let currentQuestion = null;
let showAnswersByDefault = getSavedAnswerPreference();
let answerVisible = showAnswersByDefault;
let seen = new Set();
let catalogOpen = false;
let catalogSearch = '';

const availableQuestions = () =>
  activeSection === 'all' ? questions : questions.filter((item) => item.section === activeSection);

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

const sectionLabel = (id) => sections.find((item) => item.id === id)?.label;
const escapeHtml = (value) => value.replace(/[&<>"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[character]);

function render() {
  if (!currentQuestion) currentQuestion = availableQuestions()[Math.floor(Math.random() * availableQuestions().length)];
  const pool = availableQuestions();
  const normalizedSearch = catalogSearch.trim().toLocaleLowerCase('ru-RU');
  const catalogQuestions = pool.filter((item) => !normalizedSearch || item.question.toLocaleLowerCase('ru-RU').includes(normalizedSearch));
  app.innerHTML = `
    <div class="orb orb-one"></div><div class="orb orb-two"></div>
    <section class="shell">
      <header class="header">
        <a class="brand" href="#" aria-label="На главную"><span class="brand-mark">Q</span><span>AQA<span class="muted">.trainer</span></span></a>
        <div class="header-controls">
          <label class="answer-preference" for="answers-toggle"><span>Показывать ответы</span><input id="answers-toggle" type="checkbox" ${showAnswersByDefault ? 'checked' : ''} /><span class="toggle-track" aria-hidden="true"><span class="toggle-thumb"></span></span></label>
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
        <div><span class="view-title">Режим тренировки</span><span class="view-description">${catalogOpen ? 'Выберите вопрос из списка' : 'Случайный вопрос из выбранного раздела'}</span></div>
        <button class="catalog-toggle ${catalogOpen ? 'active' : ''}" id="catalog-toggle" aria-expanded="${catalogOpen}"><span class="catalog-icon">☷</span>${catalogOpen ? 'Вернуться к карточке' : 'Все вопросы'}</button>
      </div>
      <section class="catalog ${catalogOpen ? 'open' : ''}" aria-label="Список вопросов">
        <div class="catalog-header"><div><p class="catalog-eyebrow">КАТАЛОГ</p><h2>Все вопросы <span>${pool.length}</span></h2></div><label class="search"><span>⌕</span><input id="catalog-search" type="search" value="${escapeHtml(catalogSearch)}" placeholder="Найти вопрос" aria-label="Поиск вопроса" /></label></div>
        <p class="catalog-result">${catalogQuestions.length === pool.length ? 'Выберите вопрос, чтобы открыть карточку с ответом.' : `Найдено: ${catalogQuestions.length}`}</p>
        <div class="question-list">
          ${catalogQuestions.length ? catalogQuestions.map((item) => {
            const index = questions.indexOf(item);
            return `<button class="question-item ${item === currentQuestion ? 'selected' : ''}" data-question-index="${index}"><span class="list-number">${String(index + 1).padStart(2, '0')}</span><span class="list-question">${item.question}</span><span class="list-topic ${item.section}">${sectionLabel(item.section)}</span><span class="list-arrow">→</span></button>`;
          }).join('') : '<p class="empty-list">Ничего не найдено. Попробуйте другой запрос.</p>'}
        </div>
      </section>
      <section class="card" aria-live="polite">
        <div class="card-top"><span class="topic ${currentQuestion.section}">${sectionLabel(currentQuestion.section)}</span><span class="counter">${seen.size} / ${pool.length} просмотрено</span></div>
        <p class="question-number">ВОПРОС</p>
        <h2>${currentQuestion.question}</h2>
        <div class="answer ${answerVisible ? 'shown' : ''}">
          <div class="answer-rule"></div>
          <p class="answer-title">Сильный ответ</p>
          ${currentQuestion.answerHtml ?? studyAnswers[currentQuestion.question] ?? currentQuestion.answer.split('\n\n').map((text) => `<p>${text}</p>`).join('')}
          <aside><span>✦</span><div><b>На заметку</b><p>${currentQuestion.tip}</p></div></aside>
        </div>
        <div class="actions">
          <button class="secondary" id="answer-button">${answerVisible ? 'Скрыть ответ' : 'Показать ответ'}</button>
          <button class="primary" id="next-button">Следующий вопрос <span>→</span></button>
        </div>
      </section>
      <p class="footer-note">Сначала сформулируйте ответ сами — затем сравните его с подсказкой.</p>
    </section>`;

  document.querySelectorAll('[data-section]').forEach((button) => {
    button.addEventListener('click', () => { activeSection = button.dataset.section; seen = new Set(); currentQuestion = null; randomQuestion(); });
  });
  document.querySelector('#answer-button').addEventListener('click', () => { answerVisible = !answerVisible; render(); });
  document.querySelector('#answers-toggle').addEventListener('change', (event) => {
    showAnswersByDefault = event.target.checked;
    saveAnswerPreference(showAnswersByDefault);
    answerVisible = showAnswersByDefault;
    render();
  });
  document.querySelector('#next-button').addEventListener('click', randomQuestion);
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
