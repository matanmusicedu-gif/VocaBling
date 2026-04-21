/* ========================================
   VocaBling — app.js
   Vanilla JS, no frameworks
   ======================================== */

'use strict';

// ============================================================
// CONSTANTS & CONFIG
// ============================================================

const STORAGE_KEYS = {
  WORDS:   'vocabling_words',
  STREAK:  'vocabling_streak',
  WOTD:    'vocabling_wordofday',
  THEME:   'vocabling_theme',
};

const VERSION = '1.0.0';

const PRESET_TAGS = ['adjective', 'noun', 'verb', 'adverb', 'formal', 'casual', 'academic', 'idiom', 'phrasal'];

const TAG_COLORS = {
  adjective: '#6C63FF',
  noun:      '#FF6584',
  verb:      '#43D9AD',
  adverb:    '#FFD93D',
  formal:    '#5B8DEF',
  casual:    '#FF9F43',
  academic:  '#A29BFE',
  idiom:     '#FD79A8',
  phrasal:   '#00B894',
  default:   '#6C63FF',
};

const SAMPLE_WORDS = [
  {
    word: 'ebullient',
    hebrew: 'נלהב',
    definition: 'Cheerful and full of energy',
    example: 'She was so ebullient that everyone around her smiled.',
    tags: ['adjective', 'formal'],
  },
  {
    word: 'ephemeral',
    hebrew: 'ארעי',
    definition: 'Lasting for a very short time',
    example: 'The ephemeral beauty of cherry blossoms makes them all the more precious.',
    tags: ['adjective', 'formal'],
  },
  {
    word: 'serendipity',
    hebrew: 'מציאה מקרית',
    definition: 'The occurrence of events by chance in a happy or beneficial way',
    example: 'Finding that old friend at the café was pure serendipity.',
    tags: ['noun'],
  },
  {
    word: 'resilient',
    hebrew: 'עמיד',
    definition: 'Able to recover quickly from difficulties; tough',
    example: 'Children are remarkably resilient and can adapt to change easily.',
    tags: ['adjective'],
  },
  {
    word: 'meticulous',
    hebrew: 'קפדן',
    definition: 'Showing great attention to detail; very careful and precise',
    example: 'She was meticulous in her research, checking every source twice.',
    tags: ['adjective', 'formal'],
  },
];

const QUIZ_SESSION_LENGTH = 10;

const CONFETTI_COLORS = ['#6C63FF', '#FF6584', '#43D9AD', '#FFD93D', '#FF9F43', '#FD79A8'];

// ============================================================
// STATE
// ============================================================

let state = {
  currentScreen: 'home',
  previousScreen: 'home',
  words: [],
  streak: { lastDate: null, count: 0 },
  wotd: { date: null, wordId: null },
  theme: 'dark',
  // Add / Edit
  editingWordId: null,
  selectedTags: [],
  // Word Bank
  searchQuery: '',
  activeFilter: 'all',
  // Word Detail
  detailWordId: null,
  // Quiz
  quizMode: 'flashcard',
  quizWords: [],
  quizIndex: 0,
  quizScore: 0,
  quizStreak: 0,
  quizAnswered: false,
  quizFlipped: false,
  quizSessionDone: false,
};

// ============================================================
// STORAGE HELPERS
// ============================================================

function loadWords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WORDS);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveWords(words) {
  localStorage.setItem(STORAGE_KEYS.WORDS, JSON.stringify(words));
}

function loadStreak() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STREAK);
    return raw ? JSON.parse(raw) : { lastDate: null, count: 0 };
  } catch { return { lastDate: null, count: 0 }; }
}

function saveStreak(streak) {
  localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(streak));
}

function loadWotd() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WOTD);
    return raw ? JSON.parse(raw) : { date: null, wordId: null };
  } catch { return { date: null, wordId: null }; }
}

function saveWotd(wotd) {
  localStorage.setItem(STORAGE_KEYS.WOTD, JSON.stringify(wotd));
}

// ============================================================
// UTILITY
// ============================================================

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clamp(n, min, max) { return Math.min(Math.max(n, min), max); }

// ============================================================
// THEME
// ============================================================

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const toggle = document.getElementById('theme-toggle');
  if (toggle) toggle.classList.toggle('on', theme === 'dark');
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem(STORAGE_KEYS.THEME, state.theme);
  applyTheme(state.theme);
}

// ============================================================
// STREAK LOGIC
// ============================================================

function updateStreak() {
  const t = today();
  const s = state.streak;
  if (s.lastDate === t) return; // already updated today
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);
  if (s.lastDate === yStr) {
    s.count += 1;
  } else if (s.lastDate !== t) {
    s.count = 1;
  }
  s.lastDate = t;
  saveStreak(s);
}

// ============================================================
// WORD OF THE DAY
// ============================================================

function getWotd() {
  const t = today();
  let wotd = state.wotd;
  if (wotd.date === t && state.words.find(w => w.id === wotd.wordId)) {
    return state.words.find(w => w.id === wotd.wordId);
  }
  if (state.words.length === 0) return null;
  const word = state.words[Math.floor(Math.random() * state.words.length)];
  state.wotd = { date: t, wordId: word.id };
  saveWotd(state.wotd);
  return word;
}

// ============================================================
// INIT
// ============================================================

function init() {
  // Load data
  const stored = loadWords();
  if (stored && stored.length > 0) {
    state.words = stored;
  } else {
    // Pre-populate sample words
    state.words = SAMPLE_WORDS.map(w => ({
      id: uuid(),
      word: w.word,
      hebrew: w.hebrew,
      definition: w.definition,
      example: w.example,
      tags: w.tags,
      addedAt: new Date().toISOString(),
      lastPracticed: null,
      correctCount: 0,
      incorrectCount: 0,
    }));
    saveWords(state.words);
  }

  state.streak = loadStreak();
  state.wotd   = loadWotd();
  state.theme  = localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
  applyTheme(state.theme);
  updateStreak();

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  // Bind UI
  bindNav();
  bindHomeButtons();
  bindAddForm();
  bindWordsScreen();
  bindDetailScreen();
  bindPracticeScreen();
  bindSettingsScreen();

  // Render initial screen
  renderHome();
  setupPresetTags();
}

// ============================================================
// NAVIGATION
// ============================================================

function showScreen(name, pushPrev = true) {
  if (pushPrev && name !== state.currentScreen) {
    state.previousScreen = state.currentScreen;
  }
  state.currentScreen = name;

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${name}`).classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.screen === name);
  });

  // Run screen-specific render
  if (name === 'home')     renderHome();
  if (name === 'words')    renderWordBank();
  if (name === 'practice') renderPractice();
  if (name === 'settings') renderSettings();
}

function goBack() {
  showScreen(state.previousScreen, false);
}

function bindNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showScreen(btn.dataset.screen));
  });
}

// ============================================================
// HOME SCREEN
// ============================================================

function renderHome() {
  const words = state.words;

  // Stats
  document.getElementById('home-word-count').textContent = words.length;
  document.getElementById('home-streak').textContent = state.streak.count;
  const mastered = words.filter(w => w.correctCount >= 5).length;
  document.getElementById('home-mastered').textContent = mastered;

  // Word of the Day
  const wotd = getWotd();
  if (wotd) {
    document.getElementById('wotd-word').textContent = wotd.word;
    document.getElementById('wotd-hebrew').textContent = wotd.hebrew;
    document.getElementById('wotd-def').textContent = wotd.definition || 'No definition yet.';
    document.getElementById('wotd-card').style.cursor = 'pointer';
    document.getElementById('wotd-card').onclick = () => openWordDetail(wotd.id);
  } else {
    document.getElementById('wotd-word').textContent = '—';
    document.getElementById('wotd-hebrew').textContent = '—';
    document.getElementById('wotd-def').textContent = 'Add some words to see your Word of the Day!';
    document.getElementById('wotd-card').onclick = null;
  }
}

function bindHomeButtons() {
  document.getElementById('btn-add-home').addEventListener('click', () => openAddScreen());
  document.getElementById('btn-practice-home').addEventListener('click', () => showScreen('practice'));
  document.getElementById('btn-words-home').addEventListener('click', () => showScreen('words'));
}

// ============================================================
// ADD / EDIT WORD SCREEN
// ============================================================

function setupPresetTags() {
  const container = document.getElementById('preset-tags');
  container.innerHTML = '';
  PRESET_TAGS.forEach(tag => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tag-chip';
    btn.textContent = tag;
    btn.dataset.tag = tag;
    btn.addEventListener('click', () => togglePresetTag(tag, btn));
    container.appendChild(btn);
  });
}

function togglePresetTag(tag, btn) {
  if (state.selectedTags.includes(tag)) {
    state.selectedTags = state.selectedTags.filter(t => t !== tag);
    btn.classList.remove('selected');
  } else {
    state.selectedTags.push(tag);
    btn.classList.add('selected');
  }
  renderSelectedTags();
}

function renderSelectedTags() {
  const container = document.getElementById('selected-tags-display');
  container.innerHTML = '';
  state.selectedTags.forEach(tag => {
    if (PRESET_TAGS.includes(tag)) return; // shown in preset row
    const chip = document.createElement('span');
    chip.className = 'tag-chip selected';
    chip.innerHTML = `${tag} <span class="remove-tag" data-tag="${tag}">✕</span>`;
    chip.querySelector('.remove-tag').addEventListener('click', () => {
      state.selectedTags = state.selectedTags.filter(t => t !== tag);
      renderSelectedTags();
    });
    container.appendChild(chip);
  });
}

function openAddScreen(wordId = null) {
  state.editingWordId = wordId;
  state.selectedTags = [];

  // Reset form
  document.getElementById('add-word-form').reset();
  document.getElementById('edit-word-id').value = wordId || '';

  // Reset preset tag UI
  document.querySelectorAll('#preset-tags .tag-chip').forEach(b => b.classList.remove('selected'));
  document.getElementById('selected-tags-display').innerHTML = '';

  if (wordId) {
    // Edit mode — populate form
    const word = state.words.find(w => w.id === wordId);
    if (!word) return;
    document.getElementById('add-screen-title').textContent = 'Edit Word';
    document.getElementById('btn-save-word').textContent = '💾 Save Changes';
    document.getElementById('input-english').value    = word.word;
    document.getElementById('input-hebrew').value     = word.hebrew;
    document.getElementById('input-definition').value = word.definition || '';
    document.getElementById('input-example').value    = word.example || '';

    state.selectedTags = [...(word.tags || [])];
    state.selectedTags.forEach(tag => {
      const btn = document.querySelector(`#preset-tags .tag-chip[data-tag="${tag}"]`);
      if (btn) btn.classList.add('selected');
    });
    renderSelectedTags();
  } else {
    document.getElementById('add-screen-title').textContent = 'Add New Word';
    document.getElementById('btn-save-word').textContent = '💾 Save Word';
  }

  showScreen('add', true);
}

function bindAddForm() {
  document.getElementById('add-back').addEventListener('click', goBack);

  document.getElementById('btn-add-tag').addEventListener('click', () => {
    const input = document.getElementById('input-custom-tag');
    const tag = input.value.trim().toLowerCase();
    if (!tag) return;
    if (!state.selectedTags.includes(tag)) {
      state.selectedTags.push(tag);
      renderSelectedTags();
    }
    input.value = '';
  });

  document.getElementById('input-custom-tag').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('btn-add-tag').click();
    }
  });

  document.getElementById('add-word-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveWord();
  });
}

function saveWord() {
  const english = document.getElementById('input-english').value.trim();
  const hebrew  = document.getElementById('input-hebrew').value.trim();
  if (!english || !hebrew) {
    showToast('Please fill in the English word and Hebrew translation!', 'error');
    return;
  }

  const editId = state.editingWordId;

  if (editId) {
    // Update existing
    const idx = state.words.findIndex(w => w.id === editId);
    if (idx > -1) {
      state.words[idx] = {
        ...state.words[idx],
        word:       english,
        hebrew:     hebrew,
        definition: document.getElementById('input-definition').value.trim(),
        example:    document.getElementById('input-example').value.trim(),
        tags:       [...state.selectedTags],
      };
    }
    saveWords(state.words);
    showToast('Word updated! ✨', 'success');
    // Bounce button
    const btn = document.getElementById('btn-save-word');
    btn.classList.add('bounce-anim');
    setTimeout(() => btn.classList.remove('bounce-anim'), 400);
    setTimeout(() => {
      openWordDetail(editId);
    }, 350);
  } else {
    // Create new
    const word = {
      id:             uuid(),
      word:           english,
      hebrew:         hebrew,
      definition:     document.getElementById('input-definition').value.trim(),
      example:        document.getElementById('input-example').value.trim(),
      tags:           [...state.selectedTags],
      addedAt:        new Date().toISOString(),
      lastPracticed:  null,
      correctCount:   0,
      incorrectCount: 0,
    };
    state.words.unshift(word);
    saveWords(state.words);
    showToast('Word added! 🎉', 'success');

    // Bounce save button
    const btn = document.getElementById('btn-save-word');
    btn.classList.add('bounce-anim');
    setTimeout(() => btn.classList.remove('bounce-anim'), 400);

    // Reset form for next word
    document.getElementById('add-word-form').reset();
    state.selectedTags = [];
    document.querySelectorAll('#preset-tags .tag-chip').forEach(b => b.classList.remove('selected'));
    document.getElementById('selected-tags-display').innerHTML = '';
  }
}

// ============================================================
// WORD BANK SCREEN
// ============================================================

function renderWordBank() {
  renderFilterChips();
  renderWordList();
}

function renderFilterChips() {
  const container = document.getElementById('filter-chips');
  // Collect all tags
  const allTags = new Set();
  state.words.forEach(w => (w.tags || []).forEach(t => allTags.add(t)));

  container.innerHTML = '';
  // "All" chip
  const allChip = document.createElement('button');
  allChip.className = `filter-chip${state.activeFilter === 'all' ? ' active' : ''}`;
  allChip.dataset.tag = 'all';
  allChip.textContent = 'All';
  allChip.addEventListener('click', () => { state.activeFilter = 'all'; renderWordBank(); });
  container.appendChild(allChip);

  allTags.forEach(tag => {
    const chip = document.createElement('button');
    chip.className = `filter-chip${state.activeFilter === tag ? ' active' : ''}`;
    chip.dataset.tag = tag;
    chip.textContent = tag;
    chip.addEventListener('click', () => { state.activeFilter = tag; renderWordBank(); });
    container.appendChild(chip);
  });
}

function getFilteredWords() {
  let words = [...state.words];
  const q = state.searchQuery.toLowerCase();
  if (q) {
    words = words.filter(w =>
      w.word.toLowerCase().includes(q) ||
      w.hebrew.includes(q) ||
      (w.definition || '').toLowerCase().includes(q)
    );
  }
  if (state.activeFilter !== 'all') {
    words = words.filter(w => (w.tags || []).includes(state.activeFilter));
  }
  return words;
}

function renderWordList() {
  const container = document.getElementById('words-list');
  const words = getFilteredWords();

  if (words.length === 0) {
    const isSearching = state.searchQuery || state.activeFilter !== 'all';
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-emoji">${isSearching ? '🔍' : '📭'}</div>
        <div class="empty-title">${isSearching ? 'No matches found' : 'Your word bank is empty!'}</div>
        <div class="empty-sub">${isSearching ? 'Try a different search or filter.' : 'Start building your vocabulary by adding your first word.'}</div>
        ${!isSearching ? `<button class="btn-cta" id="empty-add-btn">➕ Add First Word</button>` : ''}
      </div>`;
    document.getElementById('empty-add-btn')?.addEventListener('click', () => openAddScreen());
    return;
  }

  const isFiltered = state.searchQuery || state.activeFilter !== 'all';

  container.innerHTML = '';
  words.forEach((word, i) => {
    const card = document.createElement('div');
    card.className = 'word-card';
    card.dataset.wordId = word.id;
    card.style.animationDelay = `${i * 30}ms`;
    if (!isFiltered) card.setAttribute('draggable', 'true');

    const color = TAG_COLORS[(word.tags || [])[0]] || TAG_COLORS.default;
    const tagsHTML = (word.tags || []).map(t =>
      `<span class="mini-tag" style="background:${TAG_COLORS[t] || TAG_COLORS.default}22;color:${TAG_COLORS[t] || TAG_COLORS.default}">${t}</span>`
    ).join('');

    card.innerHTML = `
      ${!isFiltered ? `<div class="drag-handle" title="Drag to reorder">⠿</div>` : ''}
      <div class="word-card-accent" style="background:${color}"></div>
      <div class="word-card-body">
        <div class="word-card-english">${escapeHtml(word.word)}</div>
        <div class="word-card-hebrew">${escapeHtml(word.hebrew)}</div>
        ${tagsHTML ? `<div class="word-card-tags">${tagsHTML}</div>` : ''}
      </div>
      <button class="btn-word-delete" data-id="${escapeHtml(word.id)}" title="Delete word">🗑️</button>`;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.drag-handle') || e.target.closest('.btn-word-delete')) return;
      openWordDetail(word.id);
    });

    card.querySelector('.btn-word-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      showConfirmModal('🗑️', 'Delete Word?',
        `Delete "${word.word}"? This can't be undone.`, 'Delete',
        () => {
          state.words = state.words.filter(w => w.id !== word.id);
          saveWords(state.words);
          showToast('Word deleted.', 'info');
          renderWordBank();
        }
      );
    });

    container.appendChild(card);
  });

  if (!isFiltered) enableDragSort(container);
}

function bindWordsScreen() {
  document.getElementById('words-search').addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderWordList();
  });
}

function enableDragSort(container) {
  let dragging = null;

  // --- Mouse / desktop drag ---
  container.addEventListener('dragstart', (e) => {
    const handle = e.target.closest('.drag-handle');
    if (!handle) { e.preventDefault(); return; }
    dragging = handle.closest('.word-card');
    setTimeout(() => dragging?.classList.add('dragging'), 0);
    e.dataTransfer.effectAllowed = 'move';
  });

  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!dragging) return;
    const target = e.target.closest('.word-card:not(.dragging)');
    if (!target) return;
    const rect = target.getBoundingClientRect();
    if (e.clientY < rect.top + rect.height / 2) {
      container.insertBefore(dragging, target);
    } else {
      container.insertBefore(dragging, target.nextSibling);
    }
  });

  container.addEventListener('dragend', () => {
    if (!dragging) return;
    dragging.classList.remove('dragging');
    persistDOMOrder(container);
    dragging = null;
  });

  // --- Touch / mobile drag ---
  let touchDragging = null;

  container.querySelectorAll('.drag-handle').forEach(handle => {
    handle.addEventListener('touchstart', (e) => {
      touchDragging = handle.closest('.word-card');
      touchDragging.classList.add('dragging');
    }, { passive: true });

    handle.addEventListener('touchmove', (e) => {
      if (!touchDragging) return;
      e.preventDefault();
      const touch = e.touches[0];
      const cards = [...container.querySelectorAll('.word-card:not(.dragging)')];
      let insertBefore = null;
      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        if (touch.clientY < rect.top + rect.height / 2) { insertBefore = card; break; }
      }
      if (insertBefore) container.insertBefore(touchDragging, insertBefore);
      else container.appendChild(touchDragging);
    }, { passive: false });

    handle.addEventListener('touchend', () => {
      if (!touchDragging) return;
      touchDragging.classList.remove('dragging');
      persistDOMOrder(container);
      touchDragging = null;
    });
  });
}

function persistDOMOrder(container) {
  const newOrder = [...container.querySelectorAll('.word-card')].map(c => c.dataset.wordId);
  state.words = newOrder.map(id => state.words.find(w => w.id === id)).filter(Boolean);
  saveWords(state.words);
}

// ============================================================
// WORD DETAIL SCREEN
// ============================================================

function openWordDetail(wordId) {
  state.detailWordId = wordId;
  state.previousScreen = state.currentScreen;
  renderWordDetail();
  showScreen('detail', false);
}

function renderWordDetail() {
  const word = state.words.find(w => w.id === state.detailWordId);
  if (!word) { goBack(); return; }

  document.getElementById('detail-english').textContent  = word.word;
  document.getElementById('detail-hebrew').textContent   = word.hebrew;
  document.getElementById('detail-correct').textContent  = word.correctCount;
  document.getElementById('detail-incorrect').textContent = word.incorrectCount;

  const total = word.correctCount + word.incorrectCount;
  document.getElementById('detail-accuracy').textContent =
    total > 0 ? Math.round((word.correctCount / total) * 100) + '%' : '—';

  // Tags
  const tagsEl = document.getElementById('detail-tags');
  tagsEl.innerHTML = (word.tags || []).map(t =>
    `<span class="detail-tag" style="background:${TAG_COLORS[t] || TAG_COLORS.default}33;border-color:${TAG_COLORS[t] || TAG_COLORS.default}66">${t}</span>`
  ).join('');

  // Definition
  const defSec = document.getElementById('detail-def-section');
  const defEl  = document.getElementById('detail-definition');
  if (word.definition) {
    defEl.textContent = word.definition;
    defSec.style.display = '';
  } else {
    defSec.style.display = 'none';
  }

  // Example
  const exSec = document.getElementById('detail-ex-section');
  const exEl  = document.getElementById('detail-example');
  if (word.example) {
    exEl.textContent = `"${word.example}"`;
    exSec.style.display = '';
  } else {
    exSec.style.display = 'none';
  }

  // Added date
  document.getElementById('detail-added').textContent = formatDate(word.addedAt);
}

function bindDetailScreen() {
  document.getElementById('detail-back').addEventListener('click', goBack);

  document.getElementById('btn-edit-header').addEventListener('click', () => openAddScreen(state.detailWordId));
  document.getElementById('btn-edit-word').addEventListener('click', () => openAddScreen(state.detailWordId));

  document.getElementById('btn-practice-this').addEventListener('click', () => {
    // Start practice with this word (flash card mode)
    state.quizMode = 'flashcard';
    startQuizSession([state.words.find(w => w.id === state.detailWordId)].filter(Boolean));
    showScreen('practice');
  });

  document.getElementById('btn-delete-word').addEventListener('click', () => {
    const word = state.words.find(w => w.id === state.detailWordId);
    if (!word) return;
    showConfirmModal(
      '🗑️',
      'Delete Word?',
      `This will permanently delete "${word.word}". This can't be undone.`,
      'Delete',
      () => {
        state.words = state.words.filter(w => w.id !== state.detailWordId);
        saveWords(state.words);
        showToast('Word deleted.', 'info');
        goBack();
      }
    );
  });
}

// ============================================================
// PRACTICE / QUIZ SCREEN
// ============================================================

function bindPracticeScreen() {
  document.getElementById('practice-back').addEventListener('click', () => {
    state.previousScreen = 'home';
    goBack();
  });

  document.getElementById('mode-switcher').addEventListener('click', (e) => {
    const btn = e.target.closest('.mode-btn');
    if (!btn) return;
    state.quizMode = btn.dataset.mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    startQuizSession();
  });
}

function renderPractice() {
  // Update mode switcher UI
  document.querySelectorAll('.mode-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === state.quizMode);
  });
  startQuizSession();
}

function startQuizSession(forcedWords = null) {
  if (state.words.length === 0) {
    renderNoWordsState();
    return;
  }

  const pool = forcedWords || shuffle(state.words).slice(0, QUIZ_SESSION_LENGTH);
  state.quizWords     = pool;
  state.quizIndex     = 0;
  state.quizScore     = 0;
  state.quizStreak    = 0;
  state.quizAnswered  = false;
  state.quizFlipped   = false;
  state.quizSessionDone = false;

  updateQuizProgress();
  renderQuizQuestion();
}

function renderNoWordsState() {
  document.getElementById('quiz-progress-wrap').classList.add('hidden');
  document.getElementById('quiz-area').innerHTML = `
    <div class="practice-no-words">
      <div style="font-size:4rem">📭</div>
      <div style="font-size:1.2rem;font-weight:900;color:var(--text)">No words to practice!</div>
      <div style="font-size:.9rem;color:var(--text-muted);font-weight:600;line-height:1.5">
        Add some words to your Word Bank first.
      </div>
      <button class="btn-cta" id="practice-add-words-btn">➕ Add Words</button>
    </div>`;
  document.getElementById('practice-add-words-btn').addEventListener('click', () => openAddScreen());
}

function updateQuizProgress() {
  const total = state.quizWords.length;
  const current = state.quizIndex;
  document.getElementById('quiz-progress-wrap').classList.remove('hidden');
  document.getElementById('quiz-q-num').textContent = `Question ${Math.min(current + 1, total)} of ${total}`;
  document.getElementById('quiz-score-display').textContent = `Score: ${state.quizScore}`;
  document.getElementById('quiz-progress-fill').style.width = `${(current / total) * 100}%`;
  document.getElementById('quiz-streak-num').textContent = state.quizStreak;
}

function renderQuizQuestion() {
  if (state.quizIndex >= state.quizWords.length) {
    showResults();
    return;
  }

  state.quizAnswered = false;
  state.quizFlipped  = false;
  updateQuizProgress();

  const mode = state.quizMode;
  if (mode === 'flashcard') renderFlashcard();
  else if (mode === 'mc')   renderMultipleChoice();
  else if (mode === 'fitb') renderFillInTheBlank();
}

// --- FLASHCARD ---
function renderFlashcard() {
  const word = state.quizWords[state.quizIndex];
  const area = document.getElementById('quiz-area');

  area.innerHTML = `
    <div class="flashcard-scene" id="flashcard-scene">
      <div class="flashcard-inner">
        <div class="flashcard-face flashcard-front">
          <div class="flashcard-hint">English Word</div>
          <div class="flashcard-word">${escapeHtml(word.word)}</div>
          <div class="flashcard-hint" style="margin-top:8px;font-size:.68rem;">Tap to reveal ↓</div>
        </div>
        <div class="flashcard-face flashcard-back">
          <div class="flashcard-hint">Hebrew</div>
          <div class="flashcard-hebrew">${escapeHtml(word.hebrew)}</div>
          ${word.definition ? `<div class="flashcard-definition">${escapeHtml(word.definition)}</div>` : ''}
        </div>
      </div>
    </div>
    <div class="flashcard-nav" id="fc-nav" style="display:none">
      <button class="btn-fc unknown" id="fc-unknown">❌ Still learning</button>
      <button class="btn-fc know" id="fc-know">✓ Got it!</button>
    </div>`;

  document.getElementById('flashcard-scene').addEventListener('click', flipFlashcard);
}

function flipFlashcard() {
  if (state.quizFlipped) return;
  state.quizFlipped = true;
  document.getElementById('flashcard-scene').classList.add('flipped');
  document.getElementById('fc-nav').style.display = 'flex';

  document.getElementById('fc-know').addEventListener('click', () => {
    recordAnswer(true);
    advanceQuiz(true);
  });
  document.getElementById('fc-unknown').addEventListener('click', () => {
    recordAnswer(false);
    advanceQuiz(false);
  });
}

// --- MULTIPLE CHOICE ---
function renderMultipleChoice() {
  const word = state.quizWords[state.quizIndex];
  const area = document.getElementById('quiz-area');

  // Build 4 options: correct + 3 random wrong
  const otherWords = state.words.filter(w => w.id !== word.id);
  const wrongOptions = shuffle(otherWords).slice(0, 3).map(w => w.hebrew);
  const options = shuffle([word.hebrew, ...wrongOptions]);

  area.innerHTML = `
    <div class="mc-question-label">What is the Hebrew translation?</div>
    <div class="mc-word">${escapeHtml(word.word)}</div>
    ${word.definition ? `<div class="mc-instruction">${escapeHtml(word.definition)}</div>` : ''}
    <div class="mc-options" id="mc-options">
      ${options.map((opt, i) => `
        <button class="mc-option" data-idx="${i}" data-value="${escapeHtml(opt)}">${escapeHtml(opt)}</button>
      `).join('')}
    </div>
    <button class="btn-next-q hidden" id="mc-next-btn">Next →</button>`;

  document.getElementById('mc-options').addEventListener('click', (e) => {
    const btn = e.target.closest('.mc-option');
    if (!btn || state.quizAnswered) return;
    state.quizAnswered = true;

    const chosen  = btn.dataset.value;
    const correct = chosen === word.hebrew;

    // Mark all options
    document.querySelectorAll('.mc-option').forEach(b => {
      b.disabled = true;
      if (b.dataset.value === word.hebrew) b.classList.add('correct');
    });
    if (!correct) btn.classList.add('wrong');

    recordAnswer(correct);
    if (correct) spawnConfetti();

    document.getElementById('mc-next-btn').classList.remove('hidden');
    document.getElementById('mc-next-btn').addEventListener('click', () => advanceQuiz(correct));
  });
}

// --- FILL IN THE BLANK ---
function renderFillInTheBlank() {
  const word = state.quizWords[state.quizIndex];
  const area = document.getElementById('quiz-area');

  // Build sentence — blank out the word
  let sentence = word.example || `The word is ___.`;
  const regex = new RegExp(`\\b${word.word}\\b`, 'i');
  const blanked = sentence.replace(regex, '<span class="blank">_____</span>');

  area.innerHTML = `
    <div class="mc-question-label">Fill in the blank</div>
    <div class="fitb-sentence">${blanked}</div>
    <div style="font-size:.8rem;color:var(--text-muted);text-align:center;font-weight:600;">
      Hebrew hint: <span style="color:var(--coral);font-weight:800;">${escapeHtml(word.hebrew)}</span>
    </div>
    <div class="fitb-input-row">
      <input class="fitb-input" type="text" id="fitb-input" placeholder="Type the missing word..."
        autocapitalize="none" autocorrect="off" spellcheck="false" />
      <button class="btn-submit-fitb" id="fitb-submit">→</button>
    </div>
    <div id="fitb-feedback" style="text-align:center;font-size:.9rem;font-weight:700;min-height:24px;"></div>
    <button class="btn-next-q hidden" id="fitb-next-btn">Next →</button>`;

  const inputEl = document.getElementById('fitb-input');
  inputEl.focus();

  function submitFitb() {
    if (state.quizAnswered) return;
    const answer = inputEl.value.trim().toLowerCase();
    const correct = answer === word.word.toLowerCase();
    state.quizAnswered = true;
    inputEl.disabled = true;
    document.getElementById('fitb-submit').disabled = true;

    if (correct) {
      inputEl.classList.add('correct');
      document.getElementById('fitb-feedback').innerHTML =
        `<span style="color:var(--green)">✓ Correct! 🎉</span>`;
      spawnConfetti();
    } else {
      inputEl.classList.add('wrong');
      document.getElementById('fitb-feedback').innerHTML =
        `<span style="color:var(--red)">✗ The answer was "<strong>${escapeHtml(word.word)}</strong>"</span>`;
    }

    recordAnswer(correct);
    document.getElementById('fitb-next-btn').classList.remove('hidden');
    document.getElementById('fitb-next-btn').addEventListener('click', () => advanceQuiz(correct));
  }

  document.getElementById('fitb-submit').addEventListener('click', submitFitb);
  inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitFitb(); });
}

// --- QUIZ HELPERS ---
function recordAnswer(correct) {
  const word = state.quizWords[state.quizIndex];
  const idx  = state.words.findIndex(w => w.id === word.id);
  if (idx > -1) {
    if (correct) {
      state.words[idx].correctCount += 1;
      state.quizScore  += 1;
      state.quizStreak += 1;
    } else {
      state.words[idx].incorrectCount += 1;
      state.quizStreak = 0;
    }
    state.words[idx].lastPracticed = new Date().toISOString();
    saveWords(state.words);
    updateQuizProgress();
  }
}

function advanceQuiz(wasCorrect) {
  state.quizIndex += 1;
  if (state.quizIndex >= state.quizWords.length) {
    showResults();
  } else {
    renderQuizQuestion();
  }
}

// --- RESULTS ---
function showResults() {
  const total   = state.quizWords.length;
  const score   = state.quizScore;
  const pct     = Math.round((score / total) * 100);
  const stars   = pct >= 90 ? 3 : pct >= 60 ? 2 : 1;
  const messages = [
    'Keep going — practice makes perfect! 💪',
    'Good effort! You\'re getting there! 🌟',
    'Great job! You\'re on fire! 🔥',
  ];
  const msg = messages[stars - 1];

  const overlay = document.createElement('div');
  overlay.className = 'results-overlay';
  overlay.id = 'results-overlay';
  overlay.innerHTML = `
    <div class="results-sheet">
      <div class="results-title">Session Complete! 🎉</div>
      <div class="results-stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      <div class="results-score">${score}<span> / ${total}</span></div>
      <div class="results-message">${msg}</div>
      <div class="results-btns">
        <button class="btn-try-again" id="results-retry">🔄 Try Again</button>
        <button class="btn-done-quiz" id="results-done">✓ Done</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  if (stars >= 2) spawnConfetti(60);

  document.getElementById('results-retry').addEventListener('click', () => {
    overlay.remove();
    startQuizSession();
  });
  document.getElementById('results-done').addEventListener('click', () => {
    overlay.remove();
    showScreen('home');
  });
}

// ============================================================
// SETTINGS SCREEN
// ============================================================

function renderSettings() {
  document.getElementById('settings-word-count').textContent = state.words.length;
  const totalCorrect = state.words.reduce((s, w) => s + w.correctCount, 0);
  document.getElementById('settings-correct-count').textContent = totalCorrect;
  document.getElementById('settings-streak').textContent = `${state.streak.count} days`;
  const toggle = document.getElementById('theme-toggle');
  if (toggle) toggle.classList.toggle('on', state.theme === 'dark');
}

function bindSettingsScreen() {
  document.getElementById('settings-theme').addEventListener('click', toggleTheme);
  document.getElementById('settings-export').addEventListener('click', exportWords);
  document.getElementById('settings-import').addEventListener('click', () => {
    document.getElementById('import-file-input').click();
  });
  document.getElementById('import-file-input').addEventListener('change', importWords);
  document.getElementById('settings-clear').addEventListener('click', () => {
    showConfirmModal(
      '⚠️',
      'Clear All Data?',
      'This will permanently delete all your words and reset the app. This cannot be undone.',
      'Clear Everything',
      () => {
        localStorage.removeItem(STORAGE_KEYS.WORDS);
        localStorage.removeItem(STORAGE_KEYS.STREAK);
        localStorage.removeItem(STORAGE_KEYS.WOTD);
        state.words = [];
        state.streak = { lastDate: null, count: 0 };
        state.wotd   = { date: null, wordId: null };
        showToast('All data cleared.', 'info');
        showScreen('home');
      }
    );
  });
}

function exportWords() {
  if (state.words.length === 0) {
    showToast('No words to export!', 'error');
    return;
  }
  const data = JSON.stringify(state.words, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `vocabling-export-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`Exported ${state.words.length} words! 📤`, 'success');
}

function importWords(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const imported = JSON.parse(ev.target.result);
      if (!Array.isArray(imported)) throw new Error('Invalid format');
      let added = 0;
      imported.forEach(w => {
        if (w.word && w.hebrew) {
          const existing = state.words.find(ex => ex.word.toLowerCase() === w.word.toLowerCase());
          if (!existing) {
            state.words.push({
              id:             w.id || uuid(),
              word:           w.word,
              hebrew:         w.hebrew,
              definition:     w.definition || '',
              example:        w.example || '',
              tags:           w.tags || [],
              addedAt:        w.addedAt || new Date().toISOString(),
              lastPracticed:  w.lastPracticed || null,
              correctCount:   w.correctCount || 0,
              incorrectCount: w.incorrectCount || 0,
            });
            added++;
          }
        }
      });
      saveWords(state.words);
      showToast(`Imported ${added} new word${added !== 1 ? 's' : ''}! 📥`, 'success');
      renderSettings();
    } catch (err) {
      showToast('Invalid JSON file. Please check the format.', 'error');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
}

// ============================================================
// MODAL
// ============================================================

function showConfirmModal(icon, title, body, confirmText, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'confirm-modal';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-icon">${icon}</div>
      <div class="modal-title">${title}</div>
      <div class="modal-body">${body}</div>
      <div class="modal-btns">
        <button class="modal-btn-cancel" id="modal-cancel">Cancel</button>
        <button class="modal-btn-confirm" id="modal-confirm">${confirmText}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  document.getElementById('modal-cancel').addEventListener('click', () => overlay.remove());
  document.getElementById('modal-confirm').addEventListener('click', () => {
    overlay.remove();
    onConfirm();
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

// ============================================================
// TOAST
// ============================================================

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut .3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

// ============================================================
// CONFETTI
// ============================================================

function spawnConfetti(count = 30) {
  const centerX = window.innerWidth / 2;
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    const tx = (Math.random() - 0.5) * window.innerWidth * 1.2;
    const delay = Math.random() * 0.4;
    const dur = 0.9 + Math.random() * 0.7;
    piece.style.cssText = `
      background: ${color};
      left: ${centerX + (Math.random() - 0.5) * 200}px;
      top: ${window.innerHeight * 0.3}px;
      --tx: ${tx}px;
      --dur: ${dur}s;
      --delay: ${delay}s;
      width: ${6 + Math.random() * 8}px;
      height: ${6 + Math.random() * 8}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
    `;
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), (dur + delay + 0.2) * 1000);
  }
}

// ============================================================
// SECURITY HELPER
// ============================================================

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================
// PWA INSTALL PROMPT
// ============================================================

let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  // Could show a custom install button here
});

// ============================================================
// BOOT
// ============================================================

document.addEventListener('DOMContentLoaded', init);
