(function () {
  /* --------------------------------------------------------
     mor-blogger-embeds — tap-to-build.js
     Tap word tiles to assemble a correct answer.

     HOW TO USE IN A BLOGGER POST (HTML view):
     -------------------------------------------
     1. Add a <div class="mor-tap-to-build"> with your
        questions as a data-questions attribute.
     2. Load this script after it.

     <div class="mor-tap-to-build" data-questions='[
       {
         "prompt": "Put the sentence in the correct order:",
         "phrase": "The cat sat on the mat.",
         "answer": ["The", "cat", "sat", "on", "the", "mat."],
         "distractors": ["dog", "ran", "under", "a"]
       },
       {
         "prompt": "Translate into English:",
         "phrase": "Мама здесь.",
         "answer": ["Mom", "is", "here"],
         "distractors": ["and", "am", "Katya", "thank you"]
       }
     ]'></div>
     <script src="https://mor-blogger-embeds.pages.dev/tap-to-build/tap-to-build.js"><\/script>

     FIELDS:
       prompt      — instruction shown above the phrase
       phrase      — the word, sentence, or prompt to respond to
       answer      — correct words IN ORDER, each as a separate string
       distractors — wrong tiles to pad the choices with (aim for 3-5)

     EXPORT FORMAT (downloaded as .json on completion):
     {
       "embed": "tap-to-build",
       "source": "https://yourblog.com/your-post",
       "date": "2026-05-02",
       "results": [
         { "phrase": "Мама здесь.", "correct": true, "attempts": 1 },
         { "phrase": "она", "correct": false, "attempts": 2 }
       ]
     }
  -------------------------------------------------------- */

  const SOUND_BASE = 'https://mor-blogger-embeds.pages.dev/tap-to-build/tap-to-build-sound-effects/';

  const SOUNDS = {
    tileTap:      'TileTap.wav',
    tileDeselect: 'TileDeselect.wav',
    correct:      'CorrectAnswer.wav',
    wrong:        'WrongAnswer.wav',
    progressTick: 'ProgressTick.wav',
    complete:     'LessonComplete.wav',
  };

  const audioCache = {};

  function loadSounds() {
    Object.entries(SOUNDS).forEach(([key, file]) => {
      const audio = new Audio(SOUND_BASE + file);
      audio.preload = 'auto';
      audioCache[key] = audio;
    });
  }

  function playSound(key) {
    const audio = audioCache[key];
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;600&family=DM+Sans:wght@400;500;600&display=swap');
    .mor-ttb-wrap{font-family:'DM Sans',sans-serif;max-width:580px;margin:0 auto;padding:1.5rem 1rem;box-sizing:border-box;}
    .mor-ttb-progress-bar{height:12px;background:#e8e5df;border-radius:99px;overflow:hidden;margin-bottom:1.25rem;}
    .mor-ttb-progress-fill{height:100%;background:#a78a4d;border-radius:99px;transition:width 0.4s ease;}
    .mor-ttb-status{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem;}
    .mor-ttb-lives{display:flex;align-items:center;gap:6px;font-size:14px;font-weight:500;color:#666;}
    .mor-ttb-heart{color:#c0392b;font-size:16px;}
    .mor-ttb-counter{font-size:13px;font-weight:500;color:#999;}
    .mor-ttb-label{font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#999;margin-bottom:0.5rem;}
    .mor-ttb-question{font-family:'Lora',serif;font-size:1.4rem;font-weight:600;color:#1a1a1a;margin-bottom:1.5rem;line-height:1.4;}
    .mor-ttb-answer-zone{min-height:56px;border-bottom:2px solid #ccc;margin-bottom:1.5rem;display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;padding-bottom:8px;}
    .mor-ttb-answer-zone.correct{border-color:#a78a4d;}
    .mor-ttb-answer-zone.wrong{border-color:#c0392b;}
    .mor-ttb-placeholder{font-size:14px;color:#aaa;font-style:italic;align-self:center;}
    .mor-ttb-tiles{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:1.75rem;}
    .mor-ttb-tile{padding:8px 14px;border:1.5px solid #ccc;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;background:#fff;color:#1a1a1a;transition:background 0.15s,transform 0.1s,opacity 0.15s;user-select:none;}
    .mor-ttb-tile:hover{background:#f5f3ef;}
    .mor-ttb-tile:active{transform:scale(0.96);}
    .mor-ttb-tile.used{opacity:0;pointer-events:none;}
    .mor-ttb-selected{padding:7px 14px;border:1.5px solid #999;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;background:#f5f3ef;color:#1a1a1a;transition:background 0.15s,transform 0.1s;}
    .mor-ttb-selected:hover{background:#ebe8e2;}
    .mor-ttb-btn{width:100%;padding:14px;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:600;cursor:pointer;border:none;transition:background 0.15s,transform 0.1s;}
    .mor-ttb-btn:active{transform:scale(0.98);}
    .mor-ttb-btn-check{background:#a78a4d;color:#fff;}
    .mor-ttb-btn-check:disabled{background:#e8e5df;color:#aaa;cursor:default;}
    .mor-ttb-btn-next{background:#2d6a4f;color:#fff;}
    .mor-ttb-feedback{padding:14px 16px;border-radius:10px;margin-bottom:1rem;font-size:14px;font-weight:500;}
    .mor-ttb-feedback.correct{background:#eaf3de;color:#27500a;border:1px solid #c0dd97;}
    .mor-ttb-feedback.wrong{background:#fcebeb;color:#501313;border:1px solid #f09595;}
    .mor-ttb-done{text-align:center;padding:2rem 1rem;}
    .mor-ttb-done-title{font-family:'Lora',serif;font-size:1.8rem;font-weight:600;color:#1a1a1a;margin-bottom:0.5rem;}
    .mor-ttb-done-sub{color:#666;font-size:14px;margin-bottom:1.5rem;}
    .mor-ttb-score{font-size:2.5rem;font-weight:700;color:#a78a4d;margin-bottom:1rem;}
    .mor-ttb-done-btns{display:flex;flex-direction:column;gap:10px;align-items:center;}
    .mor-ttb-btn-export{background:#2d6a4f;color:#fff;border:none;padding:12px 28px;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;cursor:pointer;}
    .mor-ttb-btn-export:active{transform:scale(0.98);}
    .mor-ttb-btn-restart{background:#f5f3ef;color:#1a1a1a;border:1.5px solid #ccc;padding:12px 28px;border-radius:10px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;cursor:pointer;}
  `;

  function injectStyles() {
    if (document.getElementById('mor-ttb-styles')) return;
    const style = document.createElement('style');
    style.id = 'mor-ttb-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function shuffle(arr) {
    return [...arr].sort(() => Math.random() - 0.5);
  }

  function initTapToBuild(container) {
    let questions;
    try {
      questions = JSON.parse(container.dataset.questions);
    } catch (e) {
      container.textContent = 'mor-tap-to-build: invalid data-questions JSON.';
      return;
    }

    let qi = 0, selected = [], lives = 5, correct = 0, state = 'answering';
    let currentTiles = [], usedIndices = new Set();
    const results = questions.map(q => ({ phrase: q.phrase, correct: false, attempts: 0 }));

    function makeTiles() {
      return shuffle([...questions[qi].answer, ...questions[qi].distractors]);
    }

    function exportResults() {
      const data = {
        embed: 'tap-to-build',
        source: window.location.href,
        date: new Date().toISOString().slice(0, 10),
        results: results
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mor-results-' + data.date + '.json';
      a.click();
      URL.revokeObjectURL(url);
    }

    function render() {
      if (qi >= questions.length) {
        playSound('complete');
        container.innerHTML = `<div class="mor-ttb-wrap"><div class="mor-ttb-done">
          <div class="mor-ttb-score">${correct}/${questions.length}</div>
          <div class="mor-ttb-done-title">Lesson complete</div>
          <div class="mor-ttb-done-sub">${correct === questions.length ? 'Perfect score!' : correct > questions.length / 2 ? 'Good work.' : 'Keep practising.'}</div>
          <div class="mor-ttb-done-btns">
            <button class="mor-ttb-btn-export" id="mor-ttb-export">Download results</button>
            <button class="mor-ttb-btn-restart" id="mor-ttb-restart">Try again</button>
          </div>
        </div></div>`;
        container.querySelector('#mor-ttb-export').onclick = exportResults;
        container.querySelector('#mor-ttb-restart').onclick = restart;
        return;
      }

      const q = questions[qi];
      const pct = Math.round((qi / questions.length) * 100);
      const remaining = questions.length - qi;
      const hearts = Array.from({ length: 5 }, (_, i) =>
        `<span class="mor-ttb-heart">${i < lives ? '♥' : '♡'}</span>`).join('');
      const answerHtml = selected.length
        ? selected.map((w, i) => `<span class="mor-ttb-selected" data-deselect="${i}">${w}</span>`).join('')
        : `<span class="mor-ttb-placeholder">Tap the words</span>`;
      const tilesHtml = currentTiles.map((w, i) =>
        `<span class="mor-ttb-tile${usedIndices.has(i) ? ' used' : ''}" data-tile="${i}">${w}</span>`).join('');
      const zoneClass = state === 'correct' ? 'correct' : state === 'wrong' ? 'wrong' : '';
      const feedbackHtml = state === 'correct'
        ? `<div class="mor-ttb-feedback correct">Correct!</div>`
        : state === 'wrong'
        ? `<div class="mor-ttb-feedback wrong">Correct answer: ${q.answer.join(' ')}</div>`
        : '';
      const btnHtml = state === 'answering'
        ? `<button class="mor-ttb-btn mor-ttb-btn-check" id="mor-ttb-check" ${selected.length === 0 ? 'disabled' : ''}>Check</button>`
        : `<button class="mor-ttb-btn mor-ttb-btn-next" id="mor-ttb-next">Continue</button>`;

      container.innerHTML = `<div class="mor-ttb-wrap">
        <div class="mor-ttb-progress-bar"><div class="mor-ttb-progress-fill" style="width:${pct}%"></div></div>
        <div class="mor-ttb-status">
          <div class="mor-ttb-lives">${hearts} ${lives}</div>
          <div class="mor-ttb-counter">${remaining} question${remaining === 1 ? '' : 's'} left</div>
        </div>
        <div class="mor-ttb-label">${q.prompt}</div>
        <div class="mor-ttb-question">${q.phrase}</div>
        <div class="mor-ttb-answer-zone ${zoneClass}">${answerHtml}</div>
        <div class="mor-ttb-tiles">${tilesHtml}</div>
        ${feedbackHtml}${btnHtml}
      </div>`;

      container.querySelectorAll('[data-tile]').forEach(el => {
        el.onclick = () => selectTile(parseInt(el.dataset.tile));
      });
      container.querySelectorAll('[data-deselect]').forEach(el => {
        el.onclick = () => deselect(parseInt(el.dataset.deselect));
      });
      const checkBtn = container.querySelector('#mor-ttb-check');
      if (checkBtn) checkBtn.onclick = check;
      const nextBtn = container.querySelector('#mor-ttb-next');
      if (nextBtn) nextBtn.onclick = next;
    }

    function selectTile(i) {
      if (state !== 'answering' || usedIndices.has(i)) return;
      usedIndices.add(i);
      selected.push(currentTiles[i]);
      playSound('tileTap');
      render();
    }

    function deselect(i) {
      if (state !== 'answering') return;
      const word = selected[i];
      selected.splice(i, 1);
      const tileIdx = [...usedIndices].find(ti => currentTiles[ti] === word);
      usedIndices.delete(tileIdx);
      playSound('tileDeselect');
      render();
    }

    function check() {
      const q = questions[qi];
      results[qi].attempts += 1;
      if (selected.join(' ') === q.answer.join(' ')) {
        state = 'correct';
        correct++;
        results[qi].correct = true;
        playSound('correct');
      } else {
        state = 'wrong';
        lives = Math.max(0, lives - 1);
        playSound('wrong');
      }
      render();
    }

    function next() {
      qi++; state = 'answering'; selected = []; usedIndices.clear();
      if (qi < questions.length) {
        currentTiles = makeTiles();
        playSound('progressTick');
      }
      render();
    }

    function restart() {
      qi = 0; lives = 5; correct = 0; state = 'answering'; selected = []; usedIndices.clear();
      results.forEach(r => { r.correct = false; r.attempts = 0; });
      currentTiles = makeTiles();
      render();
    }

    currentTiles = makeTiles();
    render();
  }

  function init() {
    injectStyles();
    loadSounds();
    document.querySelectorAll('.mor-tap-to-build[data-questions]').forEach(initTapToBuild);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
