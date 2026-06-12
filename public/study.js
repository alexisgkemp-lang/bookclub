const card = document.querySelector("#study-card");
const rail = document.querySelector("#completed-rail");
const POP_SOUND_URL = "https://e49244684ffd034d2ec271223c658585.cdn.bubble.io/f1753721037111x794578362377195800/bom.mp3?_gl=1*1gpks1d*_gcl_au*MTI4NDIwMjMwNy4xNzc3NDY5NDQ1*_ga*NzIyNDM0ODQzLjE3MDc4MzE0MjA.*_ga_BFPVR2DEE2*czE3ODExMDA3MTAkbzUyNSRnMSR0MTc4MTEwMDc0NyRqMjMkbDAkaDA.";
const WRONG_SOUND_URL = "https://e49244684ffd034d2ec271223c658585.cdn.bubble.io/f1752833892392x611473553873437300/wrong%20vibrate.mp3?_gl=1*1ak2r8k*_gcl_au*MTI4NDIwMjMwNy4xNzc3NDY5NDQ1*_ga*NzIyNDM0ODQzLjE3MDc4MzE0MjA.*_ga_BFPVR2DEE2*czE3ODExMDA3MTAkbzUyNSRnMSR0MTc4MTEwMDg1NiRqNjAkbDAkaDA.";
const RAIL_SOUND_URL = "https://e49244684ffd034d2ec271223c658585.cdn.bubble.io/f1752833911059x497045793586862850/click.mp3?_gl=1*12rq75e*_gcl_au*MTI4NDIwMjMwNy4xNzc3NDY5NDQ1*_ga*NzIyNDM0ODQzLjE3MDc4MzE0MjA.*_ga_BFPVR2DEE2*czE3ODExMDA3MTAkbzUyNSRnMSR0MTc4MTEwMTgwMSRqNTIkbDAkaDA.";
const languages = ["Turkish", "Spanish", "French", "Italian", "German", "Portuguese", "Arabic", "Chinese", "Japanese", "Korean", "Polish", "Russian"];

const items = [
  {
    mood: "calm",
    before: "I like the idea of therapy. I can talk about my feelings and",
    target: "untangle",
    after: "my thoughts.",
    keyPhrase: "untangle",
    helperWords: [],
    choices: ["untangle", "distangle"],
    explanation: "Untangle usually means separating threads or knots. We also use it for thoughts, feelings, and problems when they feel mixed together.",
    translations: {
      Turkish: "Terapi fikrini seviyorum. Duygularim hakkinda konusabilir ve dusuncelerimi netlestirebilirim.",
      Spanish: "Me gusta la idea de la terapia. Puedo hablar de mis sentimientos y aclarar mis pensamientos.",
      French: "J'aime l'idee de la therapie. Je peux parler de mes sentiments et clarifier mes pensees.",
      Italian: "Mi piace l'idea della terapia. Posso parlare dei miei sentimenti e mettere ordine nei miei pensieri."
    }
  },
  {
    mood: "warm",
    before: "She",
    target: "giggles",
    after: "when she's nervous. It isn't because she's being rude.",
    keyPhrase: "giggles",
    helperWords: ["nervous"],
    choices: ["giggles", "laughs loudly", "shouts"],
    explanation: "Giggle is a small, light laugh. The clue is nervous: this is not a loud laugh, but a little laugh caused by emotion.",
    translations: {
      Turkish: "Gergin oldugunda kikirdar. Bu kaba davrandigi icin degil.",
      Spanish: "Se rie bajito cuando esta nerviosa. No es porque este siendo maleducada.",
      French: "Elle rit doucement quand elle est nerveuse. Ce n'est pas parce qu'elle est impolie.",
      Italian: "Ridacchia quando e nervosa. Non e perche si comporta in modo scortese."
    }
  },
  {
    mood: "bright",
    before: "Returning things",
    target: "takes",
    after: "even more of your precious time, doesn't it?",
    keyPhrase: "take time",
    helperWords: ["time"],
    choices: ["takes", "uses", "wants"],
    explanation: "Take time is the natural collocation. We say returning things takes time, not uses time.",
    translations: {
      Turkish: "Bir seyleri iade etmek degerli zamanindan daha da fazla alir.",
      Spanish: "Devolver cosas te quita aun mas de tu valioso tiempo.",
      French: "Renvoyer des articles prend encore plus de ton temps precieux.",
      Italian: "Restituire le cose richiede ancora piu del tuo tempo prezioso."
    }
  }
];

let index = 0;
let selected = false;
let syncTimer = null;
let speech = null;
let muted = false;
let popSound = null;
let wrongSound = null;
let railSound = null;
let studyAudio = null;
const speechCache = new Map(Object.entries(window.STUDY_SPEECH_CACHE || {}));
const studyHelpCache = new Map();

renderRailSlots();
renderCard();

function renderCard(delayMood = false) {
  selected = false;
  stopPlayback();
  document.body.classList.remove("is-complete");

  const item = items[index];
  if (delayMood) {
    window.setTimeout(() => {
      document.body.dataset.mood = item.mood;
    }, 180);
  } else {
    document.body.dataset.mood = item.mood;
  }

  card.className = "study-card is-entering";
  card.innerHTML = `
    <div class="sentence-wrap">
      <div class="icon-row${muted ? " is-muted-visible" : ""}"${muted ? "" : " hidden"}>
        <button type="button" data-action="replay" aria-label="Replay sentence" title="Replay">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v6h6" />
          </svg>
        </button>
        <button type="button" data-action="meaning" aria-label="Check meaning" title="Meaning">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9.3 9a2.7 2.7 0 1 1 4.9 1.6c-.8.8-2.2 1.1-2.2 2.5" />
            <path d="M12 17.2h.01" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </button>
        <button type="button" data-action="mute" class="${muted ? "is-muted" : ""}" aria-label="${muted ? "Unmute audio" : "Mute audio"}" title="${muted ? "Unmute" : "Mute"}">
          ${renderMuteIcon()}
        </button>
      </div>
      <p class="sentence" id="sentence">
        ${renderWords(item.before, item.helperWords)}
        <span class="gap" aria-label="missing phrase"><span></span></span>
        ${renderWords(item.after, item.helperWords)}
      </p>
    </div>
    <div class="choice-row" role="group" aria-label="Choose the best answer">
      ${item.choices.map((choice) => `<button type="button">${escapeHtml(choice)}</button>`).join("")}
    </div>
    <section class="meaning-panel" id="meaning-panel" hidden>
      <div class="meaning-panel-handle"></div>
      <button type="button" class="sheet-close" data-action="close-meaning" aria-label="Close meaning">&times;</button>
      <div class="study-help-content">
        <p class="study-explanation">${renderExplanation(item)}</p>
      </div>
      <div class="meaning-panel-top">
        <div class="language-pill">
          <span aria-hidden="true">Translation</span>
          <select class="language-select" data-action="language" aria-label="Translation language">
            ${languages.map((language) => `<option>${escapeHtml(language)}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="study-help-content study-translation-content">
        <p class="sentence-translation">${escapeHtml(getTranslation(item))}</p>
      </div>
    </section>
  `;

  card.querySelectorAll(".choice-row button").forEach((button) => {
    button.addEventListener("click", () => choose(button, item));
  });

  card.querySelector("[data-action='replay']").addEventListener("click", () => playSentence(item));
  card.querySelector("[data-action='meaning']").addEventListener("click", () => {
    const panel = card.querySelector("#meaning-panel");
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      loadStudyHelp(item);
    }
  });
  card.querySelector("[data-action='close-meaning']").addEventListener("click", () => {
    card.querySelector("#meaning-panel").hidden = true;
  });
  const languageSelect = card.querySelector("[data-action='language']");
  languageSelect.value = getTargetLanguage();
  languageSelect.addEventListener("change", () => {
    localStorage.setItem("studyTargetLanguage", languageSelect.value);
    card.querySelector(".sentence-translation").textContent = getTranslation(item, languageSelect.value);
    loadStudyHelp(item, { force: true });
  });
  card.querySelector("[data-action='mute']").addEventListener("click", (event) => {
    muted = !muted;
    updateMuteButton(event.currentTarget);
    const controls = card.querySelector(".icon-row");
    if (controls && !card.classList.contains("is-answered")) {
      controls.hidden = !muted;
      controls.classList.toggle("is-muted-visible", muted);
    }
  });

  window.requestAnimationFrame(() => {
    card.classList.remove("is-entering");
  });
}

function choose(button, item) {
  if (selected) return;

  const isCorrect = button.textContent.trim() === item.target;
  const choices = card.querySelectorAll(".choice-row button");
  const choiceRow = card.querySelector(".choice-row");

  if (!isCorrect) {
    button.disabled = true;
    button.classList.add("is-wrong");
    wrongAnswerFeedback();
    return;
  }

  selected = true;

  choices.forEach((choice) => {
    choice.disabled = true;
    choice.classList.toggle("is-correct", choice.textContent.trim() === item.target);
  });

  const gap = card.querySelector(".gap");
  gap.innerHTML = `<span>${escapeHtml(item.target)}</span>`;
  gap.classList.add("is-filled");
  gap.dataset.role = "target";
  card.classList.add("is-answered");
  playPopSound();

  choiceRow.innerHTML = `<button type="button" class="next-button" data-action="next">Ok got it</button>`;
  choiceRow.querySelector("[data-action='next']").addEventListener("click", nextCard);

  window.setTimeout(() => playSentence(item, { revealControls: true }), 420);
}

async function nextCard() {
  stopPlayback();
  hideCompletionControls();

  const nextItem = items[index + 1];
  document.body.dataset.mood = nextItem ? nextItem.mood : "complete";

  card.classList.add("is-handover");
  await resolveSentenceToRail();
  fillRailSlot(items[index]);
  playRailSound();
  await wait(430);
  card.classList.add("is-entering");

  window.setTimeout(() => {
    index += 1;

    if (index >= items.length) {
      renderComplete();
    } else {
      renderCard();
    }
  }, 190);
}

function renderComplete() {
  stopPlayback();
  document.body.dataset.mood = "complete";
  document.body.classList.add("is-complete");
  card.className = "study-card complete-card";
  card.innerHTML = `
    <h2>Nice work</h2>
    <p>You practised three language scenes. The useful chunks are waiting in the rail.</p>
    <button type="button" class="restart-button">Practise again</button>
  `;
  card.querySelector(".restart-button").addEventListener("click", () => {
    index = 0;
    renderRailSlots();
    renderCard();
  });
}

function renderRailSlots() {
  rail.textContent = "";
  items.forEach(() => {
    const slot = document.createElement("div");
    slot.className = "rail-slot";
    rail.append(slot);
  });
}

function fillRailSlot(item) {
  const slot = rail.children[index];
  if (!slot) return;

  slot.className = "rail-slot is-filled";
  slot.innerHTML = `<span class="rail-word">${escapeHtml(item.target)}</span>`;
  slot.title = item.meaning;
}

async function resolveSentenceToRail() {
  const sentence = card.querySelector(".sentence");
  if (!sentence) return;

  sentence.classList.add("is-travelling");
  await wait(360);
}

function playSentence(item, options = {}) {
  stopPlayback();

  const sentence = `${item.before} ${item.target} ${item.after}`.replace(/\s+/g, " ").trim();

  playElevenSentence(sentence, options).catch(() => {
    playBrowserSentence(sentence, options);
  });
}

async function playElevenSentence(sentence, options = {}) {
  const speech = await getStudySpeech(sentence);
  if (!speech?.audioUrl || !Array.isArray(speech.words)) {
    throw new Error("Study speech was not available.");
  }

  const words = card.querySelectorAll(".sentence-word, .gap");
  words.forEach((word) => word.classList.remove("is-speaking", "has-spoken"));

  if (!studyAudio) {
    studyAudio = new Audio();
  }

  studyAudio.pause();
  studyAudio.src = speech.audioUrl;
  studyAudio.currentTime = 0;
  studyAudio.muted = muted;

  await studyAudio.play();

  const tick = () => {
    const time = studyAudio.currentTime;
    let activeIndex = -1;

    speech.words.forEach((word, wordIndex) => {
      if (time >= Number(word.start) && time <= Number(word.end)) {
        activeIndex = wordIndex;
      }
    });

    words.forEach((word, wordIndex) => {
      const timing = speech.words[wordIndex];
      const start = timing ? Number(timing.start) : Number.POSITIVE_INFINITY;
      word.classList.toggle("is-speaking", wordIndex === activeIndex);
      word.classList.toggle("has-spoken", time >= start);
    });

    if (studyAudio.ended || studyAudio.paused) {
      stopSyncOnly();
      words.forEach((word) => word.classList.add("has-spoken"));
      if (options.revealControls) revealControls();
      return;
    }

    syncTimer = window.setTimeout(tick, 45);
  };

  tick();
}

async function getStudySpeech(sentence) {
  if (speechCache.has(sentence)) {
    return speechCache.get(sentence);
  }

  const response = await fetch("/api/study-speech", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: sentence })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Could not load study audio.");
  }

  speechCache.set(sentence, data);
  return data;
}

function playBrowserSentence(sentence, options = {}) {
  const words = card.querySelectorAll(".sentence-word, .gap");

  if (!muted && "speechSynthesis" in window) {
    speech = new SpeechSynthesisUtterance(sentence);
    speech.rate = 0.86;
    speech.pitch = 1;
    speechSynthesis.speak(speech);
  }

  words.forEach((word) => word.classList.remove("is-speaking", "has-spoken"));

  const interval = Math.max(190, Math.min(360, 4200 / Math.max(words.length, 1)));
  let current = 0;

  const tick = () => {
    words.forEach((word, wordIndex) => {
      word.classList.toggle("is-speaking", wordIndex === current);
      word.classList.toggle("has-spoken", wordIndex < current);
    });

    current += 1;

    if (current > words.length) {
      stopSyncOnly();
      words.forEach((word) => word.classList.add("has-spoken"));
      if (options.revealControls) {
        revealControls();
      }
      return;
    }

    syncTimer = window.setTimeout(tick, interval);
  };

  tick();
}

function revealControls() {
  const controls = card.querySelector(".icon-row");
  if (!controls) return;

  const muteButton = controls.querySelector("[data-action='mute']");
  if (muteButton) {
    updateMuteButton(muteButton);
  }
  controls.classList.remove("is-muted-visible");

  window.setTimeout(() => {
    if (controls.isConnected && card.classList.contains("is-answered") && !card.classList.contains("is-handover")) {
      controls.hidden = false;
    }
  }, 420);
}

function hideCompletionControls() {
  const controls = card.querySelector(".icon-row");
  const panel = card.querySelector("#meaning-panel");

  if (controls) {
    controls.hidden = true;
  }

  if (panel) {
    panel.hidden = true;
  }
}

function updateMuteButton(button) {
  button.classList.toggle("is-muted", muted);
  button.setAttribute("aria-label", muted ? "Unmute audio" : "Mute audio");
  button.setAttribute("title", muted ? "Unmute" : "Mute");
  button.innerHTML = renderMuteIcon();
}

function stopPlayback() {
  stopSyncOnly();

  if (studyAudio) {
    studyAudio.pause();
  }

  if ("speechSynthesis" in window) {
    speechSynthesis.cancel();
  }
}

function wrongAnswerFeedback() {
  const sentence = card.querySelector(".sentence");
  if (!sentence) return;

  sentence.classList.remove("is-wrong");
  void sentence.offsetWidth;
  sentence.classList.add("is-wrong");

  if ("vibrate" in navigator) {
    navigator.vibrate([18, 26, 18]);
  }

  playWrongSound();
}

function playPopSound() {
  popSound = playUiSound(popSound, POP_SOUND_URL, 0.38);
}

function playWrongSound() {
  wrongSound = playUiSound(wrongSound, WRONG_SOUND_URL, 0.5);
}

function playRailSound() {
  railSound = playUiSound(railSound, RAIL_SOUND_URL, 0.34);
}

function playUiSound(sound, url, volume) {
  if (muted) return sound;

  try {
    const audio = sound || new Audio(url);
    audio.preload = "auto";
    audio.volume = volume;
    audio.currentTime = 0;
    audio.play().catch(() => {});
    return audio;
  } catch {
    return sound;
  }
}

function stopSyncOnly() {
  if (syncTimer !== null) {
    window.clearTimeout(syncTimer);
    syncTimer = null;
  }

  card.querySelectorAll(".sentence-word, .gap").forEach((word) => {
    word.classList.remove("is-speaking");
  });
}

function renderWords(text, helperWords = []) {
  const helpers = new Set(helperWords.map(normaliseWord));

  return text
    .split(/(\s+)/)
    .map((part) => {
      if (!part.trim()) return part;
      const role = helpers.has(normaliseWord(part)) ? ' data-role="helper"' : "";
      return `<span class="sentence-word"${role}>${escapeHtml(part)}</span>`;
    })
    .join("");
}

function renderExplanation(item) {
  const escaped = escapeHtml(item.explanation);
  const target = escapeHtml(item.keyPhrase || item.target);
  const pattern = new RegExp(`\\b${escapeRegExp(target)}\\b`, "i");

  return escaped.replace(pattern, (match) => `<strong>${match}</strong>`);
}

async function loadStudyHelp(item, options = {}) {
  const language = getTargetLanguage();
  const cacheKey = `${index}:${language}`;

  if (!options.force && studyHelpCache.has(cacheKey)) {
    renderStudyHelp(item, studyHelpCache.get(cacheKey));
    return;
  }

  try {
    const sentence = `${item.before} ${item.target} ${item.after}`.replace(/\s+/g, " ").trim();
    const response = await fetch("/api/study-help", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sentence,
        target: item.target,
        keyPhrase: item.keyPhrase || item.target,
        choices: item.choices,
        helperWords: item.helperWords,
        targetLanguage: language
      })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Study help failed.");
    }

    studyHelpCache.set(cacheKey, data);
    renderStudyHelp(item, data);
  } catch {
    renderStudyHelp(item, {
      keyPhrase: item.keyPhrase || item.target,
      whyItMatters: item.explanation,
      translation: getTranslation(item, language)
    });
  }
}

function renderStudyHelp(item, help) {
  const explanation = card.querySelector(".study-explanation");
  const translation = card.querySelector(".sentence-translation");

  if (explanation) {
    explanation.innerHTML = renderHighlightedText(help.whyItMatters || item.explanation, help.keyPhrase || item.keyPhrase || item.target);
  }

  if (translation) {
    translation.textContent = help.translation || getTranslation(item);
  }
}

function renderHighlightedText(text, keyPhrase) {
  const escaped = escapeHtml(text);
  const phrase = String(keyPhrase || "").trim();

  if (!phrase) {
    return escaped;
  }

  const pattern = new RegExp(`\\b${escapeRegExp(escapeHtml(phrase))}\\b`, "i");
  return escaped.replace(pattern, (match) => `<strong>${match}</strong>`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normaliseWord(value) {
  return String(value).toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
}

function getTargetLanguage() {
  return localStorage.getItem("studyTargetLanguage") || localStorage.getItem("readerTargetLanguage") || "Turkish";
}

function getTranslation(item, language = getTargetLanguage()) {
  return item.translations?.[language] || item.translations?.Turkish || "";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function renderMuteIcon() {
  if (muted) {
    return `
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        <path d="m22 9-6 6" />
        <path d="m16 9 6 6" />
      </svg>
    `;
  }

  return `
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 6a9 9 0 0 1 0 12" />
    </svg>
  `;
}
