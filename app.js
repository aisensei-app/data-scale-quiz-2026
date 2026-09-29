(() => {
  const root = document.querySelector('#app');
  const $ = (selector) => document.querySelector(selector);
  const shuffle = (items) => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  const escapeHtml = (value) => String(value)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

  const secondsPerQuestion = 10;
  const questionsPerScale = 3;
  const scaleNames = ['名義尺度', '順序尺度', '間隔尺度', '比率尺度'];
  const scaleHelp = {
    名義尺度: { summary: '同じか違うかを区別する尺度', example: '例：所属学部、通学手段' },
    順序尺度: { summary: '順番や大小を比べられる尺度', example: '例：満足度、希望順位' },
    間隔尺度: { summary: '差に意味がある尺度', example: '例：摂氏温度、西暦年' },
    比率尺度: { summary: '差と比の両方に意味がある尺度', example: '例：身長、時間、冊数' }
  };
  let game = [];
  let answers = [];
  let index = 0;
  let timer;
  let advancing = false;

  function track(eventName, parameters = {}) {
    if (typeof window.gtag === 'function') window.gtag('event', eventName, parameters);
  }

  function renderTable(question) {
    const header = question.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('');
    const body = question.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('');
    return `<div class="table-wrap"><table class="data-table"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function top() {
    clearInterval(timer);
    window.scrollTo(0, 0);
    root.innerHTML = `<section class="card top-card"><div class="pin-mark" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg></div><p class="eyebrow">DATA SCALE QUIZ</p><h1>データを見て、<br>尺度を見きわめよう。</h1><p class="lead">変数名だけでなく、データの定義と実際の値を確認して答えます。</p><div class="scale-list" aria-label="4つの尺度">${scaleNames.map((name) => `<button type="button" class="scale-help" data-scale="${name}" aria-pressed="false"><span>${name.replace('尺度', '')}</span><b aria-hidden="true">?</b><span class="sr-only">の説明を見る</span></button>`).join('')}</div><div class="scale-help-panel" id="scale-help-panel" aria-live="polite" hidden></div><button class="primary" data-action="start">クイズを始める</button><p class="rule">全12問 ・ 1問10秒 ・ 選択肢はA〜Dで固定</p></section>`;
    root.querySelectorAll('.scale-help').forEach((button) => {
      button.addEventListener('click', () => showScaleHelp(button));
    });
  }

  function showScaleHelp(button) {
    const scaleName = button.dataset.scale;
    const help = scaleHelp[scaleName];
    const panel = document.querySelector('#scale-help-panel');
    document.querySelectorAll('.scale-help').forEach((item) => {
      const selected = item === button;
      item.classList.toggle('selected', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    panel.innerHTML = `<strong>${escapeHtml(scaleName)}</strong><span>${escapeHtml(help.summary)}</span><small>${escapeHtml(help.example)}</small>`;
    panel.hidden = false;
  }

  function countdown() {
    let n = 3;
    root.innerHTML = `<section class="countdown"><div class="count-circle" id="number">${n}</div><p>データの意味に注目しよう。</p></section>`;
    const countdownTimer = setInterval(() => {
      n--;
      const number = $('#number');
      if (n > 0) number.textContent = n;
      else {
        clearInterval(countdownTimer);
        number.textContent = 'START';
        number.classList.add('start-word');
        setTimeout(begin, 580);
      }
    }, 750);
  }

  function begin() {
    const selectedQuestions = scaleNames.flatMap((scaleName) =>
      shuffle(window.RAPID_QUIZ_QUESTIONS.filter((question) => question.x === scaleName)).slice(0, questionsPerScale)
    );
    game = shuffle(selectedQuestions).map((question) => ({ ...question, a: [...question.a] }));
    answers = Array(game.length).fill(null);
    index = 0;
    showQuestion();
  }

  function showQuestion() {
    clearInterval(timer);
    advancing = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const question = game[index];
    root.innerHTML = `<section class="game-card slide-in"><div class="game-head"><span class="tag">${escapeHtml(question.c)}</span><strong>${index + 1}<i> / ${game.length}</i></strong></div><div class="timer-track"><div id="timer-bar"></div></div><p class="timer-copy">のこり <b id="seconds">${secondsPerQuestion.toFixed(1)}</b> 秒</p><p class="question-kicker">データ名</p><h2>${escapeHtml(question.title)}</h2><p class="definition">${escapeHtml(question.d)}</p>${renderTable(question)}<h3 class="question-prompt">${escapeHtml(question.q)}</h3><div class="choices">${question.a.map((answer, choiceIndex) => `<button class="choice" data-choice="${choiceIndex}" aria-pressed="false"><span class="choice-letter">${['A', 'B', 'C', 'D'][choiceIndex]}</span><span>${escapeHtml(answer)}</span></button>`).join('')}</div><button class="answer-button" data-action="submit" disabled>この回答に決める</button><p class="hint">選択肢を選んでから、回答ボタンを押してください。</p></section>`;

    const started = performance.now();
    timer = setInterval(() => {
      const remain = Math.max(0, secondsPerQuestion * 1000 - (performance.now() - started));
      const fraction = remain / (secondsPerQuestion * 1000);
      $('#timer-bar').style.width = `${fraction * 100}%`;
      $('#seconds').textContent = (remain / 1000).toFixed(1);
      if (fraction < 0.34) $('#timer-bar').classList.add('is-low');
      if (!remain) next();
    }, 50);
  }

  function next() {
    if (advancing) return;
    advancing = true;
    clearInterval(timer);
    const question = game[index];
    const answer = answers[index];
    track('quiz_answer', {
      question_number: index + 1,
      question_category: question.c,
      answered: answer !== null,
      correct: answer === question.x
    });
    index++;
    if (index === game.length) results();
    else {
      root.classList.add('slide-out');
      setTimeout(() => {
        root.classList.remove('slide-out');
        showQuestion();
      }, 220);
    }
  }

  function messageFor(score) {
    const rate = score / game.length;
    if (rate === 1) return { heading: 'Perfect!', lead: '4つの尺度をすべて見きわめました。' };
    if (rate >= 0.75) return { heading: 'ナイス！', lead: 'データの意味をよく確認できています。' };
    if (rate >= 0.5) return { heading: 'いい感じ！', lead: '解説で判断のポイントを確かめましょう。' };
    return { heading: 'もう一度挑戦！', lead: '「同じ・大小・差・比」の順に考えてみましょう。' };
  }

  function launchConfetti() {
    const colors = ['#30a3b3', '#f19a60', '#3fb87f', '#f2c94c', '#eb5757', '#276877'];
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 90; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      const size = 6 + Math.random() * 7;
      piece.style.left = `${Math.random() * 100}vw`;
      piece.style.background = colors[i % colors.length];
      piece.style.width = `${size}px`;
      piece.style.height = `${size * 1.5}px`;
      piece.style.borderRadius = Math.random() < 0.5 ? '50%' : '2px';
      piece.style.animationDuration = `${2.4 + Math.random() * 1.8}s`;
      piece.style.animationDelay = `${Math.random() * 0.7}s`;
      piece.style.setProperty('--rot', `${Math.random() * 720 - 360}deg`);
      fragment.appendChild(piece);
    }
    document.body.appendChild(fragment);
    setTimeout(() => document.querySelectorAll('.confetti-piece').forEach((piece) => piece.remove()), 4600);
  }

  function results() {
    window.scrollTo(0, 0);
    const score = game.reduce((total, question, questionIndex) => total + (answers[questionIndex] === question.x), 0);
    const perfect = score === game.length;
    const message = messageFor(score);
    track('quiz_complete', { score, question_count: game.length, perfect });
    root.innerHTML = `<section class="card result-card"><p class="eyebrow">RESULT</p><h1>${message.heading}</h1><div class="score"><strong>${score}</strong><span>/ ${game.length}</span></div><p class="lead">${message.lead}</p><div class="answers"><h3>答え合わせ</h3>${game.map((question, questionIndex) => {
      const correct = answers[questionIndex] === question.x;
      const given = answers[questionIndex] ?? '時間切れ';
      return `<article><b class="${correct ? 'ok' : 'no'}">${correct ? '○' : '×'}</b><div><p>${escapeHtml(question.title)}</p><small>あなたの回答：${escapeHtml(given)}<br>正解：<strong>${escapeHtml(question.x)}</strong></small><details><summary>解説を見る</summary><p>${escapeHtml(question.e)}</p></details></div></article>`;
    }).join('')}</div><button class="secondary" data-action="home">もう一度挑戦する</button></section>`;
    if (perfect) launchConfetti();
  }

  root.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || !root.contains(button)) return;
    if (button.classList.contains('scale-help')) return;
    if (button.dataset.action === 'start') {
      track('quiz_start', { question_count: scaleNames.length * questionsPerScale });
      countdown();
      return;
    }
    if (button.dataset.action === 'home') {
      top();
      return;
    }
    if (button.dataset.action === 'submit') {
      next();
      return;
    }
    if (!button.classList.contains('choice')) return;
    const question = game[index];
    const choiceIndex = Number(button.dataset.choice);
    answers[index] = question.a[choiceIndex];
    document.querySelectorAll('.choice').forEach((choice) => {
      const selected = choice === button;
      choice.classList.toggle('selected', selected);
      choice.setAttribute('aria-pressed', String(selected));
    });
    document.querySelector('[data-action="submit"]').disabled = false;
  });

  top();
})();
