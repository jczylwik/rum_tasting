const STORAGE_KEY = 'rum-tasting-v1';
const PARTICIPANT_SELECTED_KEY = 'rum-tasting-participant-selected';
const API_URL = '/api/state';
const EVENTS_URL = '/api/events';
const FALLBACK_POLL_INTERVAL_MS = 2500;

const catalog = {
  rum: [
    {
      id: 'ron-abuelo',
      name: 'Ron Abuelo 7 Años',
      description: 'Sanft, weich und sehr zugänglich.',
      details: {
        Stil: 'Leichter Column Still',
        Aromen: 'Karamell · Vanille · leichte Süße',
        Charakter: 'Mild · rund · sehr zugänglich',
        Pairing: 'Ungesalzene Nüsse · Brot · Gegrillte Ananas'
      }
    },
    {
      id: 'plantation-barbados',
      name: 'Plantation Barbados 5 Years',
      description: 'Fruchtig, tropisch und leicht.',
      details: {
        Stil: 'Fruchtig · weich · tropisch',
        Aromen: 'Banane · Kokos · Vanille',
        Charakter: 'Ausgewogen · ideal für Einsteiger',
        Pairing: 'Gegrillte Ananas · Geröstete Kokoschips'
      }
    },
    {
      id: 'clement-vsop',
      name: 'Clément VSOP',
      description: 'Elegant, trocken und charaktervoll.',
      details: {
        Stil: 'Rhum Agricole (Zuckerrohrsaft)',
        Aromen: 'Grasig · frisch · Holz · Kräuter',
        Charakter: 'Trocken · elegant · französischer Stil',
        Pairing: 'Dunkle Schokolade · Kokoschips'
      }
    },
    {
      id: 'appleton-12',
      name: 'Appleton Estate 12 Years',
      description: 'Komplex, warm und würzig.',
      details: {
        Stil: 'Eleganter Jamaica-Rum',
        Aromen: 'Orange · Kakao · Gewürze · Eiche',
        Charakter: 'Komplex · warm · edel',
        Pairing: 'Dunkle Schokolade · Kräftigere Zigarren'
      }
    }
  ],
  cigar: [
    {
      id: 'davidoff-signature',
      name: 'Davidoff Signature 2000',
      description: 'Mild und cremig.',
      details: {
        Stärke: 'mild',
        Aromen: 'cremig · nussig',
        Kommentar: 'Sehr elegant, ideal für Einsteiger.'
      }
    },
    {
      id: 'vega-classic',
      name: 'VegaFina Classic Coronita',
      description: 'Ausgewogen und holzig.',
      details: {
        Stärke: 'mild–mittel',
        Aromen: 'holzig · leicht süß',
        Kommentar: 'Ausgewogen, passt zu Barbados & Agricole.'
      }
    },
    {
      id: 'vega-nicaragua',
      name: 'VegaFina Nicaragua',
      description: 'Mittelkräftig und würzig.',
      details: {
        Stärke: 'mittelkräftig',
        Aromen: 'würzig · Kakao',
        Kommentar: 'Mehr Power, ideal zu Appleton.'
      }
    },
    {
      id: 'ashton-heritage',
      name: 'Ashton Heritage Puro Sol',
      description: 'Klassisch, warm und aromatisch.',
      details: {
        Stärke: 'mittelkräftig–kräftig',
        Aromen: 'Holz · Honig · Gewürze',
        Kommentar: 'Warm, klassisch, sehr gutes Pairing zu Jamaica.'
      }
    }
  ]
};

const defaultState = {
  participants: [],
  activeParticipantId: null,
  activeCategory: 'rum',
  activeItemId: null,
  ratings: {},
  ratingEvents: [],
  comments: []
};

let stateSignature = '';
let state = loadState();
let eventSource = null;
let pollTimer = null;
let loadingRemoteState = false;
let isParticipantPanelOpen = !state.activeParticipantId;
let statsFilterItemId = 'all';
let swipeStartX = null;
let swipeStartY = null;
let swipeStartTime = 0;

const SWIPE_MIN_DISTANCE_PX = 48;
const SWIPE_MAX_DURATION_MS = 650;
const SWIPE_MAX_VERTICAL_DRIFT_PX = 42;
const FILTER_ALL = 'all';
const FILTER_ALL_RUM = 'all-rum';
const FILTER_ALL_CIGAR = 'all-cigar';


function buildStateSignature(inputState) {
  return JSON.stringify(inputState);
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : defaultState;
    const hasLocalSelection = localStorage.getItem(PARTICIPANT_SELECTED_KEY) === '1';
    const loaded = {
      ...defaultState,
      ...parsed,
      participants: parsed.participants || [],
      ratings: parsed.ratings || {},
      ratingEvents: parsed.ratingEvents || [],
      comments: parsed.comments || []
    };

    if (!hasLocalSelection) {
      loaded.activeParticipantId = null;
    }

    stateSignature = buildStateSignature(loaded);
    return loaded;
  } catch {
    stateSignature = buildStateSignature(defaultState);
    return defaultState;
  }
}

function hasLocalParticipantSelection() {
  return localStorage.getItem(PARTICIPANT_SELECTED_KEY) === '1';
}

function setLocalParticipantSelection(selected) {
  if (selected) {
    localStorage.setItem(PARTICIPANT_SELECTED_KEY, '1');
  } else {
    localStorage.removeItem(PARTICIPANT_SELECTED_KEY);
  }
}

function persistLocalState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  stateSignature = buildStateSignature(state);
}

function applyRemoteState(remoteState) {
  const merged = {
    ...defaultState,
    ...state,
    participants: remoteState.participants || state.participants || [],
    ratings: remoteState.ratings || state.ratings || {},
    ratingEvents: remoteState.ratingEvents || state.ratingEvents || [],
    comments: remoteState.comments || state.comments || []
  };

  if (merged.activeParticipantId && !merged.participants.some((participant) => participant.id === merged.activeParticipantId)) {
    merged.activeParticipantId = null;
  }

  if (!hasLocalParticipantSelection()) {
    merged.activeParticipantId = null;
  }

  const activeItems = catalog[merged.activeCategory] || [];
  if (!activeItems.some((item) => item.id === merged.activeItemId)) {
    merged.activeItemId = activeItems[0]?.id || null;
  }

  const nextSignature = buildStateSignature(merged);
  if (nextSignature === stateSignature) {
    return;
  }

  state = merged;
  persistLocalState();
  render();
}

async function syncState(partialState) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partialState)
    });
    if (!response.ok) {
      throw new Error('sync failed');
    }
    const serverState = await response.json();
    applyRemoteState(serverState);
  } catch {
    persistLocalState();
  }
}

async function loadRemoteState() {
  if (loadingRemoteState) return;
  loadingRemoteState = true;
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error('load failed');
    }
    const remoteState = await response.json();
    applyRemoteState(remoteState);
  } catch {
    persistLocalState();
  } finally {
    loadingRemoteState = false;
  }
}

function startFallbackPolling() {
  if (pollTimer) return;
  pollTimer = window.setInterval(() => {
    loadRemoteState();
  }, FALLBACK_POLL_INTERVAL_MS);
}

function stopFallbackPolling() {
  if (!pollTimer) return;
  window.clearInterval(pollTimer);
  pollTimer = null;
}

function startRealtimeUpdates() {
  if (!('EventSource' in window)) {
    return;
  }

  eventSource = new EventSource(EVENTS_URL);
  eventSource.onopen = () => {};
  eventSource.onmessage = () => {
    loadRemoteState();
  };
  eventSource.onerror = () => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
}

function setupVisibilityRefresh() {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      loadRemoteState();
    }
  });
}

function createParticipantId(name) {
  return `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString(36)}`;
}

function addParticipant(name) {
  const cleanName = name.trim();
  if (!cleanName) return;

  const existing = state.participants.find((participant) => participant.name.toLowerCase() === cleanName.toLowerCase());
  if (existing) {
    state.activeParticipantId = existing.id;
    setLocalParticipantSelection(true);
    isParticipantPanelOpen = false;
    persistLocalState();
    render();
    syncState({ participants: state.participants, ratings: state.ratings });
    return;
  }

  const participant = { id: createParticipantId(cleanName), name: cleanName };
  state.participants.push(participant);
  state.activeParticipantId = participant.id;
  setLocalParticipantSelection(true);
  state.ratings[participant.id] = {};
  isParticipantPanelOpen = false;
  persistLocalState();
  render();
  syncState({ participants: state.participants, ratings: state.ratings });
}

function setActiveParticipant(id) {
  state.activeParticipantId = id;
  setLocalParticipantSelection(true);
  isParticipantPanelOpen = false;
  persistLocalState();
  render();
}

function removeParticipant(id) {
  state.participants = state.participants.filter((participant) => participant.id !== id);
  delete state.ratings[id];
  if (state.activeParticipantId === id) {
    state.activeParticipantId = state.participants[0]?.id || null;
  }
  if (!state.activeParticipantId) {
    setLocalParticipantSelection(false);
    isParticipantPanelOpen = true;
  }
  persistLocalState();
  render();
  syncState({ participants: state.participants, ratings: state.ratings });
}

function setRating(itemKey, rating) {
  if (!state.activeParticipantId) return;
  if (!state.ratings[state.activeParticipantId]) {
    state.ratings[state.activeParticipantId] = {};
  }
  state.ratings[state.activeParticipantId][itemKey] = rating;
  state.ratingEvents.push({
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    participantId: state.activeParticipantId,
    itemId: itemKey,
    rating,
    timestamp: new Date().toISOString()
  });
  persistLocalState();
  render();
  syncState({ ratings: state.ratings, ratingEvents: state.ratingEvents });
}

function getCommentsForItem(itemId) {
  return (state.comments || [])
    .filter((entry) => entry.itemId === itemId)
    .sort((left, right) => (right.timestamp || '').localeCompare(left.timestamp || ''));
}

function addComment(itemId, text) {
  if (!state.activeParticipantId) return;
  const cleanText = text.trim();
  if (!cleanText) return;

  state.comments.push({
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    itemId,
    participantId: state.activeParticipantId,
    text: cleanText,
    hearts: [],
    timestamp: new Date().toISOString()
  });

  persistLocalState();
  render();
  syncState({ comments: state.comments });
}

function toggleCommentHeart(commentId) {
  if (!state.activeParticipantId) return;

  let changed = false;
  state.comments = (state.comments || []).map((entry) => {
    if (entry.id !== commentId) return entry;
    const hearts = Array.isArray(entry.hearts) ? [...entry.hearts] : [];
    const existingIndex = hearts.indexOf(state.activeParticipantId);
    if (existingIndex >= 0) {
      hearts.splice(existingIndex, 1);
    } else {
      hearts.push(state.activeParticipantId);
    }
    changed = true;
    return { ...entry, hearts };
  });

  if (!changed) return;
  persistLocalState();
  render();
  syncState({ comments: state.comments });
}

function setActiveCategory(category) {
  state.activeCategory = category;
  const items = catalog[category];
  if (!items.some((item) => item.id === state.activeItemId)) {
    state.activeItemId = items[0]?.id || null;
  }
  persistLocalState();
  render();
}

function changeItem(direction) {
  const items = catalog[state.activeCategory];
  if (!items.length) return;
  const currentIndex = items.findIndex((item) => item.id === state.activeItemId);
  const nextIndex = (currentIndex + direction + items.length) % items.length;
  state.activeItemId = items[nextIndex].id;
  persistLocalState();
  render();
}

function getCurrentItem() {
  const items = catalog[state.activeCategory];
  const item = items.find((entry) => entry.id === state.activeItemId) || items[0];
  if (!state.activeItemId && item) {
    state.activeItemId = item.id;
  }
  return item;
}

function getVotesForItem(itemId) {
  return state.participants
    .map((participant) => state.ratings[participant.id]?.[itemId])
    .filter((rating) => typeof rating === 'number');
}

function getAverageForItem(itemId) {
  const value = getAverageNumberForItem(itemId);
  return value === null ? '–' : value.toFixed(1);
}

function getAverageNumberForItem(itemId) {
  const values = getVotesForItem(itemId);
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getAverageForCategory(category) {
  const items = catalog[category] || [];
  const values = items.flatMap((item) => getVotesForItem(item.id));
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function renderAverageStars(value, label) {
  if (value === null) {
    return '<span class="avg-stars-empty">Noch keine Bewertungen</span>';
  }

  const stars = [1, 2, 3, 4, 5].map((index) => {
    const fill = Math.max(0, Math.min(100, Math.round((value - (index - 1)) * 100)));
    return `<span class="avg-star" style="--fill:${fill}%">★</span>`;
  }).join('');

  return `<span class="avg-stars" aria-label="${label}: ${value.toFixed(1)} von 5">${stars}</span>`;
}

function getHistogramForItem(itemId) {
  const values = getVotesForItem(itemId);
  const histogram = [0, 0, 0, 0, 0];
  values.forEach((value) => {
    if (value >= 1 && value <= 5) {
      histogram[value - 1] += 1;
    }
  });
  return histogram;
}

function getOverallHistogram() {
  const allItems = Object.values(catalog).flat();
  const histogram = [0, 0, 0, 0, 0];
  state.participants.forEach((participant) => {
    allItems.forEach((item) => {
      const rating = state.ratings[participant.id]?.[item.id];
      if (typeof rating === 'number') {
        histogram[rating - 1] += 1;
      }
    });
  });
  return histogram;
}

function getOverallAverage() {
  const allItems = Object.values(catalog).flat();
  const values = state.participants.flatMap((participant) => {
    return allItems
      .map((item) => state.ratings[participant.id]?.[item.id])
      .filter((rating) => typeof rating === 'number');
  });
  return values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1) : '–';
}

function getParticipantAverage(participantId) {
  const values = Object.values(state.ratings[participantId] || {}).filter((rating) => typeof rating === 'number');
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatEventTime(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Unbekannt';
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function toggleParticipantPanel() {
  if (!state.activeParticipantId) {
    isParticipantPanelOpen = true;
  } else {
    isParticipantPanelOpen = !isParticipantPanelOpen;
  }
  render();
}

function setupSwipeNavigation() {
  const explorer = document.getElementById('item-explorer');
  if (!explorer) return;

  explorer.addEventListener('touchstart', (event) => {
    if (!event.touches || event.touches.length !== 1) return;
    const touch = event.touches[0];
    swipeStartX = touch.clientX;
    swipeStartY = touch.clientY;
    swipeStartTime = Date.now();
  }, { passive: true });

  explorer.addEventListener('touchend', (event) => {
    if (swipeStartX === null || swipeStartY === null) return;
    const touch = event.changedTouches && event.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - swipeStartX;
    const deltaY = touch.clientY - swipeStartY;
    const elapsed = Date.now() - swipeStartTime;

    swipeStartX = null;
    swipeStartY = null;
    swipeStartTime = 0;

    const isHorizontalSwipe = Math.abs(deltaX) >= SWIPE_MIN_DISTANCE_PX
      && Math.abs(deltaY) <= SWIPE_MAX_VERTICAL_DRIFT_PX
      && Math.abs(deltaX) > Math.abs(deltaY)
      && elapsed <= SWIPE_MAX_DURATION_MS;

    if (!isHorizontalSwipe) return;
    if (!state.activeParticipantId) return;

    if (deltaX < 0) {
      changeItem(1);
    } else {
      changeItem(-1);
    }
  }, { passive: true });
}

function setStatsFilterItem(itemId) {
  const allItems = Object.values(catalog).flat();
  const isCategoryFilter = itemId === FILTER_ALL_RUM || itemId === FILTER_ALL_CIGAR;
  if (itemId !== FILTER_ALL && !isCategoryFilter && !allItems.some((item) => item.id === itemId)) {
    return;
  }
  statsFilterItemId = itemId;
  renderStats();
}

function getFilteredItemIds() {
  if (statsFilterItemId === FILTER_ALL) {
    return Object.values(catalog).flat().map((item) => item.id);
  }

  if (statsFilterItemId === FILTER_ALL_RUM) {
    return catalog.rum.map((item) => item.id);
  }

  if (statsFilterItemId === FILTER_ALL_CIGAR) {
    return catalog.cigar.map((item) => item.id);
  }

  return [statsFilterItemId];
}

function getFilteredHistogram(itemIds) {
  const histogram = [0, 0, 0, 0, 0];
  state.participants.forEach((participant) => {
    itemIds.forEach((itemId) => {
      const rating = state.ratings[participant.id]?.[itemId];
      if (typeof rating === 'number' && rating >= 1 && rating <= 5) {
        histogram[rating - 1] += 1;
      }
    });
  });
  return histogram;
}

function getFilteredAverage(itemIds) {
  const values = state.participants.flatMap((participant) => {
    return itemIds
      .map((itemId) => state.ratings[participant.id]?.[itemId])
      .filter((rating) => typeof rating === 'number');
  });
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function renderParticipantPanelVisibility() {
  const section = document.getElementById('participant-section');
  const button = document.getElementById('active-participant');
  const hasActiveParticipant = Boolean(state.activeParticipantId);
  const isOpen = !hasActiveParticipant || isParticipantPanelOpen;

  section.hidden = hasActiveParticipant && !isOpen;
  section.classList.toggle('collapsed', !isOpen);
  button.setAttribute('aria-expanded', String(isOpen));
}

function renderExperienceVisibility() {
  const section = document.getElementById('experience-section');
  if (!section) return;
  section.hidden = !state.activeParticipantId;
}

function renderParticipants() {
  const container = document.getElementById('participant-list');
  container.innerHTML = '';

  if (!state.participants.length) {
    container.innerHTML = '<p>Noch keine Teilnehmer. Bitte Namen eingeben.</p>';
    return;
  }

  state.participants.forEach((participant) => {
    const chip = document.createElement('div');
    chip.className = `participant-chip ${participant.id === state.activeParticipantId ? 'active' : ''}`;
    chip.innerHTML = `
      <button type="button" data-action="select" data-id="${participant.id}">${participant.name}</button>
      <button type="button" data-action="remove" data-id="${participant.id}" aria-label="Teilnehmer löschen">×</button>
    `;
    container.appendChild(chip);
  });
}

function renderActiveParticipant() {
  const container = document.getElementById('active-participant');
  const summary = document.getElementById('session-summary');

  if (!state.activeParticipantId) {
    container.textContent = 'Aktiver Teilnehmer: noch keiner ausgewählt';
    summary.textContent = `${state.participants.length} Teilnehmer · ${getOverallAverage()}/5 gesamt`;
    renderParticipantPanelVisibility();
    return;
  }

  const current = state.participants.find((participant) => participant.id === state.activeParticipantId);
  container.textContent = `Aktiver Teilnehmer: ${current?.name || 'Unbekannt'}`;
  summary.textContent = `${state.participants.length} Teilnehmer · ${getOverallAverage()}/5 gesamt`;
  renderParticipantPanelVisibility();
}

function renderItemExplorer() {
  const currentItem = getCurrentItem();
  if (!currentItem) {
    document.getElementById('item-explorer').innerHTML = '<p>Keine Einträge vorhanden.</p>';
    return;
  }

  const items = catalog[state.activeCategory];
  const currentIndex = items.findIndex((item) => item.id === currentItem.id) + 1;
  const currentRating = state.activeParticipantId ? state.ratings[state.activeParticipantId]?.[currentItem.id] : null;
  const itemAverageNumber = getAverageNumberForItem(currentItem.id);
  const itemAverage = getAverageForItem(currentItem.id);
  const itemHistogram = getHistogramForItem(currentItem.id);
  const maxValue = Math.max(...itemHistogram, 1);
  const itemComments = getCommentsForItem(currentItem.id);

  document.getElementById('item-explorer').innerHTML = `
    <div class="item-switcher">
      <div class="category-switcher">
        <button type="button" class="category-btn ${state.activeCategory === 'rum' ? 'active' : ''}" data-action="category" data-category="rum">Rums</button>
        <button type="button" class="category-btn ${state.activeCategory === 'cigar' ? 'active' : ''}" data-action="category" data-category="cigar">Zigarren</button>
      </div>
      <div class="pager">
        <button type="button" class="nav-btn" data-action="prev" aria-label="Vorheriges Element">←</button>
        <span>${currentIndex}/${items.length}</span>
        <button type="button" class="nav-btn" data-action="next" aria-label="Nächstes Element">→</button>
      </div>
    </div>

    <article class="item-card">
      <p class="item-badge">${state.activeCategory === 'rum' ? 'Rum' : 'Zigarre'}</p>
      <h3>${currentItem.name}</h3>
      <p class="item-description">${currentItem.description}</p>
      <div class="item-meta">
        ${Object.entries(currentItem.details).map(([label, value]) => `
          <div class="meta-row">
            <span>${label}</span>
            <strong>${value}</strong>
          </div>
        `).join('')}
      </div>

      <div class="rating-box">
        <h4>Bewertung</h4>
        <div class="stars" aria-label="Bewertung für ${currentItem.name}">
          ${[1, 2, 3, 4, 5].map((value) => `
            <button class="star-btn ${currentRating >= value ? 'active' : ''}" type="button" data-item="${currentItem.id}" data-rating="${value}" aria-label="${value} Sterne">★</button>
          `).join('')}
        </div>
        <small>${currentRating ? `Deine Bewertung: ${currentRating}/5` : 'Noch keine Bewertung'}</small>
      </div>

      <div class="item-stats">
        <div class="stat-box">
          <span class="stat-label">Durchschnitt für ${currentItem.name}</span>
          <strong>${itemAverage}/5</strong>
          ${renderAverageStars(itemAverageNumber, `Durchschnitt für ${currentItem.name}`)}
        </div>
        <div class="histogram" aria-label="Histogramm der Bewertungen für ${currentItem.name}">
          ${itemHistogram.map((count, index) => `
            <div class="histogram-row">
              <span>${index + 1}★</span>
              <div class="histogram-bar">
                <div class="histogram-fill" style="width: ${(count / maxValue) * 100}%"></div>
              </div>
              <span>${count}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="comments-box" aria-label="Kommentare für ${currentItem.name}">
        <h4>Kommentare</h4>
        <form id="comment-form" class="comment-form" data-item-id="${currentItem.id}">
          <label class="sr-only" for="comment-input">Kommentar</label>
          <input id="comment-input" name="comment" type="text" maxlength="180" placeholder="Dein Kommentar zu ${currentItem.name}" ${state.activeParticipantId ? '' : 'disabled'} />
          <button type="submit" ${state.activeParticipantId ? '' : 'disabled'}>Senden</button>
        </form>
        ${itemComments.length ? `
          <ul class="comment-list">
            ${itemComments.map((entry) => {
              const participant = state.participants.find((p) => p.id === entry.participantId);
              const heartCount = Array.isArray(entry.hearts) ? entry.hearts.length : 0;
              const didHeart = Array.isArray(entry.hearts) && entry.hearts.includes(state.activeParticipantId);
              return `
                <li class="comment-item">
                  <div class="comment-head">
                    <strong>${participant?.name || 'Unbekannt'}</strong>
                    <span>${formatEventTime(entry.timestamp)}</span>
                  </div>
                  <p>${entry.text}</p>
                  <button type="button" class="comment-heart ${didHeart ? 'active' : ''}" data-action="heart-comment" data-comment-id="${entry.id}" ${state.activeParticipantId ? '' : 'disabled'}>♥ ${heartCount}</button>
                </li>
              `;
            }).join('')}
          </ul>
        ` : '<p class="comment-empty">Noch keine Kommentare.</p>'}
      </div>
    </article>
  `;
}

function renderStats() {
  const overallAverage = getOverallAverage();
  const overallAverageNumber = overallAverage === '–' ? null : Number(overallAverage);
  const mostRated = Object.values(catalog).flat().map((item) => ({
    item,
    votes: getVotesForItem(item.id).length
  })).sort((left, right) => right.votes - left.votes)[0];

  const participantScores = state.participants.map((participant) => ({
    participant,
    average: getParticipantAverage(participant.id)
  })).filter((entry) => entry.average !== null);
  const strictest = participantScores.length
    ? participantScores.reduce((best, current) => (current.average < best.average ? current : best), participantScores[0])
    : null;
  const kindest = participantScores.length
    ? participantScores.reduce((best, current) => (current.average > best.average ? current : best), participantScores[0])
    : null;

  const itemById = Object.values(catalog).flat().reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  const allItems = Object.values(catalog).flat();
  const selectedFilterItem = allItems.find((item) => item.id === statsFilterItemId) || null;
  if (![FILTER_ALL, FILTER_ALL_RUM, FILTER_ALL_CIGAR].includes(statsFilterItemId) && !selectedFilterItem) {
    statsFilterItemId = FILTER_ALL;
  }

  const filteredItemIds = getFilteredItemIds();
  const histogramValues = getFilteredHistogram(filteredItemIds);
  const maxHistogramValue = Math.max(...histogramValues, 1);
  const histogramLabel = statsFilterItemId === FILTER_ALL
    ? 'Histogramm der Gesamtbewertungen'
    : statsFilterItemId === FILTER_ALL_RUM
      ? 'Histogramm aller Rums'
      : statsFilterItemId === FILTER_ALL_CIGAR
        ? 'Histogramm aller Zigarren'
        : `Histogramm fuer ${selectedFilterItem?.name || 'Auswahl'}`;
  const filteredAverageNumber = getFilteredAverage(filteredItemIds);
  const filteredAverageLabel = statsFilterItemId === FILTER_ALL
    ? 'Gesamtdurchschnitt'
    : statsFilterItemId === FILTER_ALL_RUM
      ? 'Durchschnitt aller Rums'
      : statsFilterItemId === FILTER_ALL_CIGAR
        ? 'Durchschnitt aller Zigarren'
        : `Durchschnitt fuer ${selectedFilterItem?.name || 'Auswahl'}`;

  const timelineEntries = [...(state.ratingEvents || [])]
    .slice(-8)
    .reverse()
    .map((event) => {
      const participant = state.participants.find((entry) => entry.id === event.participantId);
      const item = itemById[event.itemId];
      return {
        itemId: event.itemId,
        when: formatEventTime(event.timestamp),
        participantName: participant?.name || 'Unbekannt',
        itemName: item?.name || event.itemId,
        rating: event.rating
      };
    });

  const visibleTimelineEntries = statsFilterItemId === FILTER_ALL
    ? timelineEntries
    : timelineEntries.filter((entry) => filteredItemIds.includes(entry.itemId));

  document.getElementById('stats-panel').innerHTML = `
    <div class="stats-grid">
      <div class="stat-box">
        <span class="stat-label">Gesamtdurchschnitt</span>
        <strong>${overallAverage}/5</strong>
        ${renderAverageStars(overallAverageNumber, 'Gesamtdurchschnitt')}
      </div>
      <div class="stat-box">
        <span class="stat-label">Teilnehmer</span>
        <strong>${state.participants.length}</strong>
      </div>
      <div class="stat-box">
        <span class="stat-label">Beliebteste Auswahl</span>
        <strong>${mostRated?.item.name || 'Noch keine'}</strong>
      </div>
    </div>

    <div class="stats-grid insights-grid">
      <div class="stat-box">
        <span class="stat-label">Strengster Bewerter</span>
        <strong>${strictest ? strictest.participant.name : 'Noch keine Daten'}</strong>
        <small>${strictest ? `${strictest.average.toFixed(1)}/5 im Schnitt` : 'Sobald mehrere Bewertungen vorliegen.'}</small>
      </div>
      <div class="stat-box">
        <span class="stat-label">Größter Genießer</span>
        <strong>${kindest ? kindest.participant.name : 'Noch keine Daten'}</strong>
        <small>${kindest ? `${kindest.average.toFixed(1)}/5 im Schnitt` : 'Sobald mehrere Bewertungen vorliegen.'}</small>
      </div>
    </div>

    <div class="stats-filter-box">
      <label class="stats-filter-label" for="stats-item-filter">Filter</label>
      <select id="stats-item-filter" data-action="stats-filter" class="stats-filter-select">
        <option value="${FILTER_ALL}" ${statsFilterItemId === FILTER_ALL ? 'selected' : ''}>Alle Rums & Zigarren</option>
        <option value="${FILTER_ALL_RUM}" ${statsFilterItemId === FILTER_ALL_RUM ? 'selected' : ''}>Alle Rums</option>
        <option value="${FILTER_ALL_CIGAR}" ${statsFilterItemId === FILTER_ALL_CIGAR ? 'selected' : ''}>Alle Zigarren</option>
        <optgroup label="Rums">
          ${catalog.rum.map((item) => `<option value="${item.id}" ${statsFilterItemId === item.id ? 'selected' : ''}>${item.name}</option>`).join('')}
        </optgroup>
        <optgroup label="Zigarren">
          ${catalog.cigar.map((item) => `<option value="${item.id}" ${statsFilterItemId === item.id ? 'selected' : ''}>${item.name}</option>`).join('')}
        </optgroup>
      </select>
    </div>

    <div class="histogram-summary-grid">
      <div class="histogram" aria-label="${histogramLabel}">
        ${histogramValues.map((count, index) => `
          <div class="histogram-row">
            <span>${index + 1}★</span>
            <div class="histogram-bar">
              <div class="histogram-fill" style="width: ${(count / maxHistogramValue) * 100}%"></div>
            </div>
            <span>${count}</span>
          </div>
        `).join('')}
      </div>

      <div class="stat-box histogram-average-box">
        <span class="stat-label">${filteredAverageLabel}</span>
        <strong>${filteredAverageNumber === null ? '–' : `${filteredAverageNumber.toFixed(1)}/5`}</strong>
        ${renderAverageStars(filteredAverageNumber, filteredAverageLabel)}
      </div>
    </div>

    <div class="timeline-box" aria-label="Timeline der letzten Bewertungen">
      <h4>Timeline</h4>
      ${visibleTimelineEntries.length ? `
        <ul class="timeline-list">
          ${visibleTimelineEntries.map((entry) => `
            <li>
              <span class="timeline-time">${entry.when}</span>
              <span class="timeline-text"><strong>${entry.participantName}</strong> gab <strong>${entry.rating}/5</strong> für ${entry.itemName}</span>
            </li>
          `).join('')}
        </ul>
      ` : '<p class="timeline-empty">Noch keine passenden Bewertungen in der Timeline.</p>'}
    </div>
  `;
}

function render() {
  renderParticipants();
  renderActiveParticipant();
  renderExperienceVisibility();
  if (!state.activeParticipantId) {
    return;
  }
  renderItemExplorer();
  renderStats();
}

function handleParticipantForm(event) {
  event.preventDefault();
  const input = document.getElementById('participant-name');
  addParticipant(input.value);
  input.value = '';
  input.focus();
}

function handleAppClick(event) {
  const button = event.target.closest('button');
  if (!button) return;

  const action = button.dataset.action;
  const id = button.dataset.id;
  const item = button.dataset.item;
  const rating = button.dataset.rating;
  const category = button.dataset.category;

  if (action === 'select') {
    setActiveParticipant(id);
    return;
  }

  if (action === 'remove') {
    removeParticipant(id);
    return;
  }

  if (action === 'prev') {
    changeItem(-1);
    return;
  }

  if (action === 'next') {
    changeItem(1);
    return;
  }

  if (action === 'category') {
    setActiveCategory(category);
    return;
  }

  if (action === 'toggle-participants') {
    toggleParticipantPanel();
    return;
  }

  if (button.classList.contains('star-btn') && item && rating) {
    setRating(item, Number(rating));
    return;
  }

  if (action === 'heart-comment' && button.dataset.commentId) {
    toggleCommentHeart(button.dataset.commentId);
  }
}

function handleDynamicFormSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  if (form.id !== 'comment-form') return;

  event.preventDefault();
  const itemId = form.dataset.itemId;
  const input = form.querySelector('input[name="comment"]');
  if (!(input instanceof HTMLInputElement) || !itemId) return;

  addComment(itemId, input.value);
  input.value = '';
}

function handleAppChange(event) {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) return;

  if (target.dataset.action === 'stats-filter') {
    setStatsFilterItem(target.value);
  }
}

document.getElementById('participant-form').addEventListener('submit', handleParticipantForm);
document.addEventListener('click', handleAppClick);
document.addEventListener('change', handleAppChange);
document.addEventListener('submit', handleDynamicFormSubmit);
setupSwipeNavigation();

render();
loadRemoteState();
startFallbackPolling();
startRealtimeUpdates();
setupVisibilityRefresh();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    let hasReloadedForSw = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hasReloadedForSw) return;
      hasReloadedForSw = true;
      window.location.reload();
    });

    navigator.serviceWorker.register('./sw.js').then((registration) => {
      registration.update().catch(() => {});
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }).catch(() => {});
  });
}
