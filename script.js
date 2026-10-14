/**
 * CONNECTIONS — BOTANICAL CANNABIS-INSPIRED EDITION
 * Features:
 * - Authoritative UK London Clock System (NTP/HTTP Date + Monotonic Drift)
 * - Exact Fixed-Asset Cannabis Leaf Silhouette Vector Floating Layer
 * - Unified Centered Menu Hierarchy: Top Home + Dynamic Title, 4 Main Actions, 3 Centered Utilities
 * - Content-First Right-to-Left Sliding How to Play Panel (Zero Vertical Motion)
 * - Instant First-Tap Tile Selection & Highlight (No DOM Destruction on Tap)
 * - Required Manual Selection & Submission of All 4 Groups (No Auto-Complete)
 * - Defensive Local Storage & Single-Tap Zero-Lag Touch Architecture
 */

(function () {
  'use strict';

  // Application Configuration
  const STORAGE_KEY = 'cannaconnections_app_state_v2';
  const MAX_MISTAKES = 4;
  const CANONICAL_TIMEZONE = 'Europe/London';
  const LEVEL_EMOJIS = { 1: '🟨', 2: '🟩', 3: '🟦', 4: '🟪' };
  const HOME_PLACEHOLDER_URL = 'https://tileworksgamesstudio.github.io/CannaGames-Home/';

  // EXACT REQUIRED CANNABIS LEAF SVG AS SPECIFIED
  const EXACT_CANNABIS_LEAF_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 546" width="512" height="546">
  <g fill="#2e7d32">
    <!-- Center / Main Leaf Blade -->
    <path d="M256,20 C240,100 245,180 256,260 C267,180 272,100 256,20 Z" />
    <!-- Upper Side Lobes -->
    <path d="M256,260 C210,140 140,100 80,110 C140,160 200,230 256,260 Z" />
    <path d="M256,260 C302,140 372,100 432,110 C372,160 312,230 256,260 Z" />
    <!-- Middle Side Lobes -->
    <path d="M256,260 C180,200 100,210 50,250 C110,280 180,290 256,260 Z" />
    <path d="M256,260 C332,200 412,210 462,250 C402,280 332,290 256,260 Z" />
    <!-- Lower Side Lobes -->
    <path d="M256,260 C190,270 130,310 90,360 C140,360 200,340 256,260 Z" />
    <path d="M256,260 C322,270 382,310 422,360 C372,360 312,340 256,260 Z" />
    <!-- Stem / Petiole -->
    <path d="M246,260 L246,510 L266,510 L266,260 Z" />
  </g>
</svg>`;

  // ==========================================================================
  // 1. RELIABLE AUTHORITATIVE RELEASE CLOCK
  // ==========================================================================
  const ReleaseClock = {
    monotonicOffsetMs: null,
    isAuthoritative: false,
    syncInProgress: false,
    lastSyncTime: 0,
    listeners: [],

    onSync(cb) {
      if (typeof cb === 'function') {
        this.listeners.push(cb);
        if (this.isAuthoritative) cb();
      }
    },

    notify() {
      this.listeners.forEach(fn => {
        try { fn(); } catch (e) { console.error('Sync listener error:', e); }
      });
    },

    async synchronize() {
      if (this.syncInProgress) return;
      this.syncInProgress = true;
      let utcEpochMs = null;
      let reqStart = performance.now();

      // Step 1: Query same-origin HEAD Date header
      try {
        const bust = '?t=' + Date.now();
        const res = await fetch(window.location.pathname + bust, {
          method: 'HEAD',
          cache: 'no-store'
        });
        if (res.ok) {
          const dateHdr = res.headers.get('date');
          if (dateHdr) {
            const parsed = Date.parse(dateHdr);
            if (!isNaN(parsed)) {
              const latency = (performance.now() - reqStart) / 2;
              utcEpochMs = parsed + latency;
            }
          }
        }
      } catch (e) {}

      // Step 2: Fallback to open NTP-backed endpoint
      if (!utcEpochMs) {
        try {
          reqStart = performance.now();
          const res = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC', {
            cache: 'no-store',
            headers: { 'Accept': 'application/json' }
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.unixtime) {
              const latency = (performance.now() - reqStart) / 2;
              utcEpochMs = (data.unixtime * 1000) + latency;
            }
          }
        } catch (e) {}
      }

      // Step 3: Establish monotonic offset
      if (utcEpochMs) {
        this.monotonicOffsetMs = utcEpochMs - performance.now();
        this.isAuthoritative = true;
        this.lastSyncTime = performance.now();
        try {
          sessionStorage.setItem('clk_drift_ref', String(utcEpochMs - Date.now()));
        } catch (e) {}
      } else {
        let savedDrift = 0;
        try {
          const raw = sessionStorage.getItem('clk_drift_ref');
          if (raw) savedDrift = parseFloat(raw) || 0;
        } catch (e) {}
        this.monotonicOffsetMs = (Date.now() + savedDrift) - performance.now();
        this.isAuthoritative = false;
      }

      this.syncInProgress = false;
      this.notify();
    },

    getAuthoritativeDate() {
      if (this.monotonicOffsetMs === null) return new Date();
      return new Date(performance.now() + this.monotonicOffsetMs);
    },

    getCurrentReleaseDateString() {
      const now = this.getAuthoritativeDate();
      try {
        const fmt = new Intl.DateTimeFormat('en-CA', {
          timeZone: CANONICAL_TIMEZONE,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        return fmt.format(now);
      } catch (e) {
        return now.toISOString().slice(0, 10);
      }
    }
  };

  // ==========================================================================
  // 2. RUNTIME STATE & DEFENSIVE STORAGE
  // ==========================================================================
  let puzzles = [];
  let todayPuzzle = null;
  let activePuzzle = null;
  let isArchiveMode = false;

  let unsolvedWords = [];
  let selectedWords = [];
  let solvedCategories = [];
  let mistakesRemaining = MAX_MISTAKES;
  let guessHistory = [];
  let isComplete = false;
  let isWon = false;

  function loadStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && typeof data === 'object') {
          return {
            stats: data.stats || { played: 0, won: 0, streak: 0, maxStreak: 0 },
            games: data.games || {},
            settings: Object.assign({ bgAnimation: true }, data.settings)
          };
        }
      }
    } catch (e) {}
    return {
      stats: { played: 0, won: 0, streak: 0, maxStreak: 0 },
      games: {},
      settings: { bgAnimation: true }
    };
  }

  function saveStorage(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function getSavedGame(date) {
    return loadStorage().games[date] || null;
  }

  function saveActiveGame() {
    if (!activePuzzle) return;
    const store = loadStorage();
    const existing = store.games[activePuzzle.date] || {};

    store.games[activePuzzle.date] = {
      solvedLevels: solvedCategories.map(c => c.level),
      unsolvedWords: [...unsolvedWords],
      mistakesRemaining: mistakesRemaining,
      guessHistory: [...guessHistory],
      isComplete: isComplete,
      isWon: isWon,
      recorded: existing.recorded || false
    };

    if (isComplete && !existing.recorded && !isArchiveMode) {
      store.stats.played++;
      if (isWon) {
        store.stats.won++;
        store.stats.streak++;
        if (store.stats.streak > store.stats.maxStreak) {
          store.stats.maxStreak = store.stats.streak;
        }
      } else {
        store.stats.streak = 0;
      }
      store.games[activePuzzle.date].recorded = true;
    }

    saveStorage(store);
  }

  // ==========================================================================
  // 3. AMBIENT BACKGROUND ICON SYSTEM
  // ==========================================================================
  const AmbientSystem = {
    layer: null,
    elements: [],
    depthLayers: [
      { depth: 'depth-bg', count: 5, minDur: 30, maxDur: 44 },
      { depth: 'depth-mid', count: 4, minDur: 22, maxDur: 30 },
      { depth: 'depth-fg', count: 3, minDur: 16, maxDur: 24 }
    ],

    init() {
      this.layer = document.getElementById('ambient-icons-layer');
      if (!this.layer) return;

      this.depthLayers.forEach(cfg => {
        for (let i = 0; i < cfg.count; i++) {
          const el = document.createElement('span');
          el.className = `ambient-icon ${cfg.depth}`;
          el.innerHTML = EXACT_CANNABIS_LEAF_SVG;
          el.style.left = `${Math.floor(Math.random() * 90) + 5}%`;

          const dur = (Math.random() * (cfg.maxDur - cfg.minDur) + cfg.minDur).toFixed(1);
          const delay = (Math.random() * -cfg.maxDur).toFixed(1);
          el.style.animationDuration = `${dur}s`;
          el.style.animationDelay = `${delay}s`;

          this.layer.appendChild(el);
          this.elements.push(el);
        }
      });

      this.updateState();
    },

    updateState() {
      const store = loadStorage();
      const enabled = store.settings.bgAnimation;
      this.elements.forEach(el => {
        el.classList.toggle('ambient-moving', enabled);
      });
    }
  };

  // ==========================================================================
  // 4. SCREEN NAVIGATION & HOW TO PLAY
  // ==========================================================================
  const screens = {
    menu: document.getElementById('screen-menu'),
    game: document.getElementById('screen-game'),
    vault: document.getElementById('screen-vault'),
    settings: document.getElementById('screen-settings')
  };

  const dom = {
    toast: document.getElementById('toast'),
    appTitle: document.getElementById('app-title'),
    btnPlayGame: document.getElementById('btn-play-game'),
    btnPlayTitle: document.getElementById('btn-play-title'),
    menuPuzzleDate: document.getElementById('menu-puzzle-date'),
    menuPlayStatus: document.getElementById('menu-play-status'),
    btnOpenVault: document.getElementById('btn-open-vault'),
    btnOpenSettings: document.getElementById('btn-open-settings'),
    btnOpenHowToPlay: document.getElementById('btn-open-howtoplay'),
    btnOpenStats: document.getElementById('btn-open-stats'),
    btnShareGame: document.getElementById('btn-share-game'),
    btnReservedPlus: document.getElementById('btn-reserved-plus'),
    btnGameBack: document.getElementById('btn-game-back'),
    btnVaultBack: document.getElementById('btn-vault-back'),
    btnSettingsBack: document.getElementById('btn-settings-back'),
    gamePuzzleTitle: document.getElementById('game-puzzle-title'),
    solvedStack: document.getElementById('solved-stack'),
    grid: document.getElementById('grid'),
    mistakeDots: document.getElementById('mistake-dots'),
    btnShuffle: document.getElementById('btn-shuffle'),
    btnDeselect: document.getElementById('btn-deselect'),
    btnSubmit: document.getElementById('btn-submit'),
    vaultList: document.getElementById('vault-list'),
    btnToggleAnim: document.getElementById('btn-toggle-animation'),
    liveIndicator: document.getElementById('live-time-indicator'),
    howToBackdrop: document.getElementById('howtoplay-backdrop'),
    howToWrapper: document.getElementById('howtoplay-wrapper'),
    howToPanel: document.getElementById('panel-howtoplay'),
    btnCloseHowTo: document.getElementById('btn-close-howtoplay'),
    btnCloseHowToIcon: document.getElementById('btn-close-howtoplay-icon'),
    modalStats: document.getElementById('modal-stats'),
    modalResult: document.getElementById('modal-result'),
    statPlayed: document.getElementById('stat-played'),
    statWinPct: document.getElementById('stat-win-pct'),
    statStreak: document.getElementById('stat-streak'),
    statMaxStreak: document.getElementById('stat-max-streak'),
    resultMsg: document.getElementById('result-msg'),
    resultGrid: document.getElementById('result-grid'),
    btnShareResult: document.getElementById('btn-share-result'),
    btnResultMenu: document.getElementById('btn-result-menu')
  };

  function showScreen(name) {
    Object.keys(screens).forEach(key => {
      screens[key].classList.toggle('hidden', key !== name);
    });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  let isPanelAnimating = false;
  function openHowToPlay() {
    if (isPanelAnimating) return;
    isPanelAnimating = true;

    dom.howToBackdrop.classList.remove('hidden');
    dom.howToWrapper.classList.remove('hidden');

    void dom.howToPanel.offsetWidth;

    dom.howToBackdrop.classList.add('visible');
    dom.howToPanel.classList.add('panel-open');

    setTimeout(() => {
      isPanelAnimating = false;
      dom.btnCloseHowTo.focus();
    }, 450);
  }

  function closeHowToPlay() {
    if (isPanelAnimating) return;
    isPanelAnimating = true;

    dom.howToPanel.classList.remove('panel-open');
    dom.howToBackdrop.classList.remove('visible');

    setTimeout(() => {
      dom.howToWrapper.classList.add('hidden');
      dom.howToBackdrop.classList.add('hidden');
      isPanelAnimating = false;
      dom.btnOpenHowToPlay.focus();
    }, 450);
  }

  function showModal(modal) {
    modal.classList.remove('hidden');
  }

  function closeModal(modal) {
    modal.classList.add('hidden');
  }

  let toastTimer = null;
  function showToast(msg) {
    dom.toast.textContent = msg;
    dom.toast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => dom.toast.classList.add('hidden'), 2200);
  }

  // ==========================================================================
  // 5. CSV PARSING & DATA EXTRACTION
  // ==========================================================================
  function parseCSV(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') { cell += '"'; i++; }
          else { inQuotes = false; }
        } else { cell += c; }
      } else {
        if (c === '"') { inQuotes = true; }
        else if (c === ',') { row.push(cell.trim()); cell = ''; }
        else if (c === '\n' || c === '\r') {
          row.push(cell.trim());
          if (row.some(v => v !== '')) rows.push(row);
          row = []; cell = '';
          if (c === '\r' && text[i + 1] === '\n') i++;
        } else { cell += c; }
      }
    }
    if (cell || row.length > 0) {
      row.push(cell.trim());
      if (row.some(v => v !== '')) rows.push(row);
    }
    return rows;
  }

  function loadPuzzleData(rows) {
    if (!Array.isArray(rows) || rows.length < 2) return [];
    const list = [];

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (r.length < 9) continue;
      const date = r[0].trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

      const categories = [];
      for (let c = 0; c < 4; c++) {
        const catName = r[1 + c * 2];
        const rawWords = r[2 + c * 2];
        if (!catName || !rawWords) continue;
        const items = rawWords.split(/[,;]/).map(w => w.trim()).filter(Boolean);
        if (items.length === 4) {
          categories.push({ name: catName.trim(), level: c + 1, items });
        }
      }
      if (categories.length === 4) {
        list.push({ date, categories });
      }
    }
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }

  // ==========================================================================
  // 6. GAMEPLAY ENGINE (SINGLE TAP, ZERO LAG & NO 4TH GROUP AUTO-COMPLETE)
  // ==========================================================================
  function startPuzzle(puzzle, isArchive) {
    if (!puzzle) return;
    activePuzzle = puzzle;
    isArchiveMode = isArchive;
    dom.gamePuzzleTitle.textContent = isArchive ? `Vault: ${puzzle.date}` : `Daily: ${puzzle.date}`;
    selectedWords = [];
    dom.solvedStack.innerHTML = '';

    const saved = getSavedGame(puzzle.date);
    if (saved) {
      solvedCategories = (saved.solvedLevels || []).map(l => puzzle.categories.find(c => c.level === l)).filter(Boolean);
      unsolvedWords = Array.isArray(saved.unsolvedWords) ? [...saved.unsolvedWords] : [];
      mistakesRemaining = typeof saved.mistakesRemaining === 'number' ? saved.mistakesRemaining : MAX_MISTAKES;
      guessHistory = Array.isArray(saved.guessHistory) ? [...saved.guessHistory] : [];
      isComplete = Boolean(saved.isComplete);
      isWon = Boolean(saved.isWon);
    } else {
      solvedCategories = [];
      mistakesRemaining = MAX_MISTAKES;
      guessHistory = [];
      isComplete = false;
      isWon = false;

      const all = [];
      puzzle.categories.forEach(c => c.items.forEach(it => all.push(it)));
      shuffleArray(all);
      unsolvedWords = all;
    }

    renderSolvedStack();
    renderGridTiles();
    updateMistakeDots();
    updateControls();
    showScreen('game');
  }

  function renderSolvedStack() {
    const renderedLevels = Array.from(dom.solvedStack.children).map(el => parseInt(el.getAttribute('data-level'), 10));
    const targetLevels = solvedCategories.map(c => c.level);

    const isPrefix = renderedLevels.length <= targetLevels.length &&
      renderedLevels.every((lvl, i) => lvl === targetLevels[i]);

    if (!isPrefix) {
      dom.solvedStack.innerHTML = '';
      renderedLevels.length = 0;
    }

    const existingSet = new Set(renderedLevels);
    solvedCategories.forEach(cat => {
      if (!existingSet.has(cat.level)) {
        const banner = document.createElement('div');
        banner.className = `solved-banner cat-${cat.level}`;
        banner.setAttribute('data-level', cat.level);
        banner.innerHTML = `
          <span class="banner-level-tag">Level ${cat.level}</span>
          <span class="banner-name">${escapeHTML(cat.name)}</span>
          <span class="banner-items">${cat.items.map(escapeHTML).join(', ')}</span>
        `;
        dom.solvedStack.appendChild(banner);
      }
    });
  }

  function renderGridTiles() {
    dom.grid.innerHTML = '';
    unsolvedWords.forEach(word => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'tile';
      tile.setAttribute('data-word', word);

      const isSelected = selectedWords.includes(word);
      if (isSelected) tile.classList.add('selected');
      if (isComplete) tile.disabled = true;

      tile.textContent = word;
      tile.setAttribute('aria-pressed', isSelected ? 'true' : 'false');

      // Fast single-tap listener: updates tile element immediately without wiping the DOM
      tile.addEventListener('click', (e) => {
        e.preventDefault();
        toggleTile(word, tile);
      });

      dom.grid.appendChild(tile);
    });
  }

  function updateMistakeDots() {
    const dots = dom.mistakeDots.querySelectorAll('.dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('filled', i < mistakesRemaining);
    });
    dom.mistakeDots.setAttribute('aria-label', `${mistakesRemaining} attempts left`);
  }

  // Instant in-place toggle: Highlights immediately on first tap
  function toggleTile(word, tileElement) {
    if (isComplete) return;

    const idx = selectedWords.indexOf(word);
    if (idx > -1) {
      selectedWords.splice(idx, 1);
      if (tileElement) {
        tileElement.classList.remove('selected');
        tileElement.setAttribute('aria-pressed', 'false');
      }
    } else {
      if (selectedWords.length >= 4) return;
      selectedWords.push(word);
      if (tileElement) {
        tileElement.classList.add('selected');
        tileElement.setAttribute('aria-pressed', 'true');
      }
    }

    updateControls();
  }

  function updateControls() {
    const len = selectedWords.length;
    dom.btnSubmit.disabled = len !== 4 || isComplete;
    dom.btnDeselect.disabled = len === 0 || isComplete;
    dom.btnShuffle.disabled = unsolvedWords.length <= 1 || isComplete;
  }

  function deselectAll() {
    selectedWords = [];
    const tiles = dom.grid.querySelectorAll('.tile');
    tiles.forEach(tile => {
      tile.classList.remove('selected');
      tile.setAttribute('aria-pressed', 'false');
    });
    updateControls();
  }

  function shuffleTiles() {
    if (isComplete || unsolvedWords.length <= 1) return;
    shuffleArray(unsolvedWords);
    renderGridTiles();
  }

  function submitGuess() {
    if (selectedWords.length !== 4 || isComplete) return;

    const guessKey = [...selectedWords].sort().join('|');
    const already = guessHistory.some(g => [...g].sort().join('|') === guessKey);
    if (already) {
      showToast('Already guessed');
      return;
    }

    guessHistory.push([...selectedWords]);

    let matchedCat = null;
    for (const cat of activePuzzle.categories) {
      if (solvedCategories.includes(cat)) continue;
      const count = selectedWords.filter(w => cat.items.includes(w)).length;
      if (count === 4) {
        matchedCat = cat;
        break;
      }
    }

    if (matchedCat) {
      solvedCategories.push(matchedCat);
      unsolvedWords = unsolvedWords.filter(w => !matchedCat.items.includes(w));
      selectedWords = [];

      renderSolvedStack();

      // Check if all 4 categories have now been manually submitted and solved
      if (solvedCategories.length === 4) {
        isComplete = true;
        isWon = true;
        renderGridTiles();
        finishGame();
      } else {
        // Categories 1, 2, or 3 solved: Keep remaining tiles active for manual selection
        saveActiveGame();
        renderGridTiles();
        updateControls();
      }
    } else {
      mistakesRemaining--;
      updateMistakeDots();

      const isOneAway = activePuzzle.categories.some(cat => {
        if (solvedCategories.includes(cat)) return false;
        return selectedWords.filter(w => cat.items.includes(w)).length === 3;
      });
      if (isOneAway) showToast('One away...');

      const domSelected = dom.grid.querySelectorAll('.tile.selected');
      domSelected.forEach(t => t.classList.add('shake'));
      setTimeout(() => domSelected.forEach(t => t.classList.remove('shake')), 320);

      if (mistakesRemaining <= 0) {
        isComplete = true;
        isWon = false;
        setTimeout(() => {
          solvedCategories = [...activePuzzle.categories];
          unsolvedWords = [];
          selectedWords = [];
          renderSolvedStack();
          renderGridTiles();
          finishGame();
        }, 400);
      } else {
        saveActiveGame();
        updateControls();
      }
    }
  }

  function finishGame() {
    saveActiveGame();
    updateMistakeDots();
    updateControls();
    updateMenuStatus();
    setTimeout(showResultModal, 450);
  }

  function showResultModal() {
    dom.resultMsg.textContent = isWon ? 'Splendid! Puzzle Solved.' : 'Revealed. Better luck next time!';
    dom.resultGrid.innerHTML = '';

    const wordLevelMap = {};
    activePuzzle.categories.forEach(c => {
      c.items.forEach(w => { wordLevelMap[w] = c.level; });
    });

    guessHistory.forEach(guess => {
      const line = guess.map(w => LEVEL_EMOJIS[wordLevelMap[w]] || '⬜').join('');
      const div = document.createElement('div');
      div.textContent = line;
      dom.resultGrid.appendChild(div);
    });

    showModal(dom.modalResult);
  }

  // ==========================================================================
  // 7. SHARE & UTILITIES
  // ==========================================================================
  async function shareGeneralGame() {
    const shareData = {
      title: 'Connections',
      text: 'Play Connections — Find groups of four items that share a common connection.',
      url: window.location.href.split('#')[0]
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (e) {}
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareData.url).then(() => {
        showToast('Game link copied to clipboard');
      }).catch(() => {
        showToast('Link ready to share');
      });
    } else {
      showToast('Game ready to share');
    }
  }

  function shareResultGrid() {
    const wordLevelMap = {};
    activePuzzle.categories.forEach(c => {
      c.items.forEach(w => { wordLevelMap[w] = c.level; });
    });

    const lines = guessHistory.map(g =>
      g.map(w => LEVEL_EMOJIS[wordLevelMap[w]] || '⬜').join('')
    );

    const text = `Connections\nPuzzle: ${activePuzzle.date}\n${lines.join('\n')}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast('Result copied to clipboard'));
    } else {
      showToast('Result copied');
    }
  }

  // ==========================================================================
  // 8. VAULT ARCHIVE & SETTINGS
  // ==========================================================================
  function refreshDailyReleaseState() {
    if (!puzzles || puzzles.length === 0) return;
    const authorDate = ReleaseClock.getCurrentReleaseDateString();
    dom.liveIndicator.textContent = ReleaseClock.isAuthoritative ? 'UK Daily' : 'UK (Local)';

    const released = puzzles.filter(p => p.date <= authorDate);
    todayPuzzle = puzzles.find(p => p.date === authorDate);
    if (!todayPuzzle) {
      todayPuzzle = released.length > 0 ? released[released.length - 1] : puzzles[0];
    }

    dom.btnPlayTitle.textContent = 'Play Connections';
    dom.menuPuzzleDate.textContent = todayPuzzle.date;
    updateMenuStatus();
  }

  function updateMenuStatus() {
    if (!todayPuzzle) return;
    const saved = getSavedGame(todayPuzzle.date);

    if (!saved) {
      dom.menuPlayStatus.textContent = 'Ready';
    } else if (saved.isComplete) {
      dom.menuPlayStatus.textContent = saved.isWon ? 'Solved' : 'Revealed';
    } else {
      const count = (saved.solvedLevels || []).length;
      dom.menuPlayStatus.textContent = `${count}/4 Solved`;
    }
  }

  function renderVault() {
    dom.vaultList.innerHTML = '';
    const authorDate = ReleaseClock.getCurrentReleaseDateString();
    const archive = puzzles.filter(p => p.date < authorDate || (todayPuzzle && p.date !== todayPuzzle.date && p.date <= authorDate));

    if (archive.length === 0) {
      dom.vaultList.innerHTML = '<p class="vault-instructions">No previous puzzles currently in archive.</p>';
      return;
    }

    archive.slice().reverse().forEach(p => {
      const item = document.createElement('div');
      item.className = 'vault-card-item';
      item.setAttribute('role', 'button');
      item.tabIndex = 0;

      const saved = getSavedGame(p.date);
      let badge = '<span class="badge-tag unplayed">Unplayed</span>';
      if (saved && saved.isComplete) {
        badge = saved.isWon
          ? '<span class="badge-tag won">Solved</span>'
          : '<span class="badge-tag revealed">Revealed</span>';
      }

      item.innerHTML = `<span>${escapeHTML(p.date)}</span>${badge}`;
      const playArchive = () => startPuzzle(p, true);
      item.addEventListener('click', playArchive);
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          playArchive();
        }
      });
      dom.vaultList.appendChild(item);
    });
  }

  function renderStats() {
    const stats = loadStorage().stats;
    dom.statPlayed.textContent = stats.played;
    dom.statWinPct.textContent = stats.played > 0 ? `${Math.round((stats.won / stats.played) * 100)}%` : '0%';
    dom.statStreak.textContent = stats.streak;
    dom.statMaxStreak.textContent = stats.maxStreak;
  }

  function toggleAnimationSetting() {
    const store = loadStorage();
    store.settings.bgAnimation = !store.settings.bgAnimation;
    saveStorage(store);
    updateAnimationUI();
    AmbientSystem.updateState();
  }

  function updateAnimationUI() {
    const enabled = loadStorage().settings.bgAnimation;
    dom.btnToggleAnim.setAttribute('aria-checked', enabled ? 'true' : 'false');
    dom.btnToggleAnim.querySelector('.toggle-label').textContent = enabled ? 'On' : 'Off';
    dom.btnToggleAnim.classList.toggle('off', !enabled);
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ==========================================================================
  // 9. INITIALIZATION & EVENT BINDINGS
  // ==========================================================================
  async function init() {
    dom.btnReservedPlus.setAttribute('href', HOME_PLACEHOLDER_URL);

    AmbientSystem.init();
    updateAnimationUI();

    await ReleaseClock.synchronize();

    try {
      const res = await fetch('puzzles.csv', { cache: 'no-cache' });
      if (!res.ok) throw new Error('Failed to load puzzles.csv');
      const csv = await res.text();
      puzzles = loadPuzzleData(parseCSV(csv));
    } catch (e) {
      dom.menuPuzzleDate.textContent = 'Offline';
      dom.menuPlayStatus.textContent = 'Catalog Error';
      dom.btnPlayGame.disabled = true;
      return;
    }

    if (puzzles.length === 0) {
      dom.menuPuzzleDate.textContent = 'Unavailable';
      dom.menuPlayStatus.textContent = 'Empty Data';
      dom.btnPlayGame.disabled = true;
      return;
    }

    refreshDailyReleaseState();
    ReleaseClock.onSync(refreshDailyReleaseState);

    bindEvents();
    showScreen('menu');
  }

  function bindEvents() {
    dom.btnPlayGame.addEventListener('click', () => startPuzzle(todayPuzzle, false));

    dom.btnOpenVault.addEventListener('click', () => {
      renderVault();
      showScreen('vault');
    });

    dom.btnOpenSettings.addEventListener('click', () => {
      updateAnimationUI();
      showScreen('settings');
    });

    dom.btnOpenHowToPlay.addEventListener('click', openHowToPlay);

    dom.btnOpenStats.addEventListener('click', () => {
      renderStats();
      showModal(dom.modalStats);
    });

    dom.btnShareGame.addEventListener('click', shareGeneralGame);

    dom.btnReservedPlus.addEventListener('click', () => {
      showToast('Reserved for future features');
    });

    dom.btnGameBack.addEventListener('click', () => {
      updateMenuStatus();
      showScreen('menu');
    });

    dom.btnVaultBack.addEventListener('click', () => {
      updateMenuStatus();
      showScreen('menu');
    });

    dom.btnSettingsBack.addEventListener('click', () => {
      updateMenuStatus();
      showScreen('menu');
    });

    dom.btnShuffle.addEventListener('click', shuffleTiles);
    dom.btnDeselect.addEventListener('click', deselectAll);
    dom.btnSubmit.addEventListener('click', submitGuess);

    dom.btnCloseHowTo.addEventListener('click', closeHowToPlay);
    dom.btnCloseHowToIcon.addEventListener('click', closeHowToPlay);
    dom.howToBackdrop.addEventListener('click', closeHowToPlay);

    dom.btnToggleAnim.addEventListener('click', toggleAnimationSetting);

    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-close');
        const modal = document.getElementById(id);
        if (modal) closeModal(modal);
      });
    });

    dom.btnShareResult.addEventListener('click', shareResultGrid);
    dom.btnResultMenu.addEventListener('click', () => {
      closeModal(dom.modalResult);
      updateMenuStatus();
      showScreen('menu');
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeHowToPlay();
        const activeModal = document.querySelector('.modal-backdrop:not(.hidden)');
        if (activeModal) closeModal(activeModal);
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (performance.now() - ReleaseClock.lastSyncTime > 900000) {
          ReleaseClock.synchronize();
        } else {
          refreshDailyReleaseState();
        }
      }
    });

    window.addEventListener('online', () => {
      ReleaseClock.synchronize();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();