const params = new URLSearchParams(window.location.search);
const pageId = params.get("id");

const title = document.querySelector("#page-title");
const transcript = document.querySelector("#transcript");
const audio = document.querySelector("#audio");
const playButton = document.querySelector("#play-button");
const pauseButton = document.querySelector("#pause-button");
const progress = document.querySelector("#progress");
const timeLabel = document.querySelector("#time-label");
const marginaliaLayer = document.querySelector("#marginalia-layer");
const wordSheet = document.querySelector("#word-sheet");
const sheetWord = document.querySelector("#sheet-word");
const sheetContent = document.querySelector("#sheet-content");
const sheetClose = document.querySelector("#sheet-close");
const languageSelect = document.querySelector("#language-select");

let wordSpans = [];
let syncFrame = null;
let marginaliaTimer = null;
let marginaliaShown = false;
let lastAutoScrollAt = 0;
const definitionCache = new Map();

init();

languageSelect.value = localStorage.getItem("readerTargetLanguage") || "Turkish";

async function init() {
  if (!pageId) {
    title.textContent = "Page not found";
    transcript.textContent = "This reading page is missing its ID.";
    return;
  }

  const response = await fetch(`/api/pages/${encodeURIComponent(pageId)}`);
  const page = await response.json();

  if (!response.ok) {
    title.textContent = "Page not found";
    transcript.textContent = page.error || "The reading page could not be loaded.";
    return;
  }

  title.textContent = page.title;
  audio.src = page.audioUrl;
  renderTranscript(page.words);
  playButton.disabled = false;
  pauseButton.disabled = true;
}

function renderTranscript(words) {
  transcript.textContent = "";
  wordSpans = words.map((item, index) => {
    const span = document.createElement("span");
    span.className = "word";
    span.textContent = item.word;
    span.dataset.start = item.start;
    span.dataset.end = item.end;
    span.dataset.index = index;
    span.tabIndex = 0;
    span.setAttribute("role", "button");
    span.addEventListener("click", () => openWordHelp(span));
    span.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openWordHelp(span);
      }
    });
    transcript.append(span);

    if (index < words.length - 1) {
      transcript.append(document.createTextNode(" "));
    }

    return span;
  });
}

playButton.addEventListener("click", async () => {
  await audio.play();
});

sheetClose.addEventListener("click", () => {
  wordSheet.classList.remove("is-open");
});

languageSelect.addEventListener("change", () => {
  localStorage.setItem("readerTargetLanguage", languageSelect.value);
});

pauseButton.addEventListener("click", () => {
  audio.pause();
});

audio.addEventListener("play", () => {
  playButton.disabled = true;
  pauseButton.disabled = false;
  startSyncLoop();
  scheduleMarginalia();
});

audio.addEventListener("pause", () => {
  playButton.disabled = false;
  pauseButton.disabled = true;
  stopSyncLoop();
  clearMarginaliaTimer();
});

audio.addEventListener("timeupdate", syncWords);
audio.addEventListener("ended", () => {
  stopSyncLoop();
  syncWords();
});

function startSyncLoop() {
  stopSyncLoop();

  const tick = () => {
    syncWords();
    syncFrame = requestAnimationFrame(tick);
  };

  syncFrame = requestAnimationFrame(tick);
}

function stopSyncLoop() {
  if (syncFrame !== null) {
    cancelAnimationFrame(syncFrame);
    syncFrame = null;
  }
}

function scheduleMarginalia() {
  if (marginaliaShown) return;

  clearMarginaliaTimer();
  marginaliaTimer = window.setTimeout(() => {
    marginaliaShown = true;
    showMarginalia();
  }, 1000);
}

function clearMarginaliaTimer() {
  if (marginaliaTimer !== null) {
    window.clearTimeout(marginaliaTimer);
    marginaliaTimer = null;
  }
}

function showMarginalia() {
  if (!marginaliaLayer) return;

  const item = document.createElement("div");
  item.className = "marginalia marginalia-letter";
  item.innerHTML = letterDoodleSvg();
  marginaliaLayer.append(item);
  item.addEventListener("animationend", () => item.remove(), { once: true });
}

function letterDoodleSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Ink doodle sealed letter">
      <g fill="none" stroke="#1f1c18" stroke-linecap="round" stroke-linejoin="round">
        <path d="M24.5 42.5c12.5-2.2 63.2-2.1 79.6.4 1.8 10.8 1.4 35.4-.5 46.8-17.1 2.2-61.2 2.5-79.5-.3-1.5-12.6-1.9-34.8.4-46.9z" stroke-width="1.75"/>
        <path d="M26.2 41.1c17.9.8 54.4-1.1 76.3 1.4" stroke-width=".75" opacity=".65"/>
        <path d="M23.1 45.6c-.9 11.1-1 27.8.7 41.1" stroke-width=".75" opacity=".55"/>
        <path d="M105.4 46.4c.8 12.1.3 27.6-1.4 40.8" stroke-width=".75" opacity=".55"/>
        <path d="M27.6 45.2c9.8 7.3 23.7 18.2 36.4 26.7 12.9-8.7 27.2-20.2 37.2-27.1" stroke-width="1.45"/>
        <path d="M29.3 47.4c11.7 9.2 23.2 17.8 34.1 24.9" stroke-width=".7" opacity=".52"/>
        <path d="M98.8 48c-10.2 8.1-21.3 16.3-33.1 24" stroke-width=".7" opacity=".5"/>
        <path d="M27.9 86.5c7.5-6.7 16.8-14.7 27.1-24.2" stroke-width="1.2"/>
        <path d="M100.7 86.9c-7.9-7.1-17.4-15.2-27.4-24.5" stroke-width="1.2"/>
        <path d="M31.4 86.4c7-5.8 14.3-12 22.1-19.3" stroke-width=".65" opacity=".45"/>
        <path d="M97.1 86.1c-6.7-5.7-14.1-12-22.4-19.6" stroke-width=".65" opacity=".45"/>
        <path d="M57.8 70.2c.8-5.8 7.3-9.7 12.2-6.2 4.8 3.4 4.8 11.2-.3 14.6-5.1 3.5-12.7-1.2-11.9-8.4z" fill="#b24a3c" stroke="#1f1c18" stroke-width="1.1"/>
        <path d="M59.2 69.3c1.6-3.9 6.6-6.2 10.1-3.8" stroke-width=".55" opacity=".55"/>
        <path d="M61.5 71.2c2.5 1.8 5.1 1.7 7.4-.2" stroke="#783229" stroke-width=".85"/>
        <path d="M62.8 75.4c1.6.8 3.7.7 5.5-.3" stroke="#783229" stroke-width=".65"/>
        <path d="M38.5 34.1c3.4-2.5 8.1-3.1 12.2-1.1" stroke-width="1.05"/>
        <path d="M41.1 31.1c2.2-.7 4.8-.8 7.1-.1" stroke-width=".55" opacity=".62"/>
        <path d="M80.4 97.9c5.8 2.4 12.1 1.5 17.2-2.4" stroke-width="1.05"/>
        <path d="M84.1 101.5c3.7.8 7.2.1 10.3-1.6" stroke-width=".55" opacity=".62"/>
        <path d="M35.8 55.1l4.1-2.5" stroke-width=".55" opacity=".42"/>
        <path d="M43.5 60.6l3.8-2.4" stroke-width=".55" opacity=".38"/>
        <path d="M88.7 58.7l3.7-2.5" stroke-width=".55" opacity=".36"/>
        <path d="M32.6 76.8l3.1-2.7" stroke-width=".5" opacity=".32"/>
        <path d="M94.2 76.7l-3.1-2.8" stroke-width=".5" opacity=".32"/>
      </g>
    </svg>
  `;
}

function syncWords() {
  const time = audio.currentTime;
  let currentSpan = null;

  wordSpans.forEach((span) => {
    const start = Number(span.dataset.start);
    const end = Number(span.dataset.end);
    const isCurrent = time >= start && time <= end;
    span.classList.toggle("spoken", time >= start);
    span.classList.toggle("current", isCurrent);

    if (isCurrent) {
      currentSpan = span;
    }
  });

  if (currentSpan && !audio.paused) {
    maybeAutoScroll(currentSpan);
  }

  progress.style.width = `${Math.min(100, (time / audio.duration) * 100 || 0)}%`;
  timeLabel.textContent = formatTime(time);
}

function maybeAutoScroll(span) {
  const now = performance.now();
  if (now - lastAutoScrollAt < 900) return;

  const rect = span.getBoundingClientRect();
  const lowerFold = window.innerHeight * 0.68;
  const upperComfort = window.innerHeight * 0.22;

  if (rect.bottom > lowerFold || rect.top < upperComfort) {
    lastAutoScrollAt = now;
    const targetTop = window.scrollY + rect.top - window.innerHeight * 0.42;
    window.scrollTo({
      top: Math.max(0, targetTop),
      behavior: "smooth"
    });
  }
}

async function openWordHelp(span) {
  const word = span.textContent.trim();
  const targetLanguage = languageSelect.value;
  localStorage.setItem("readerTargetLanguage", targetLanguage);
  wordSheet.classList.add("is-open");
  sheetWord.textContent = word;
  sheetContent.innerHTML = "<p>Looking that up...</p>";

  const context = getWordContext(Number(span.dataset.index));
  const cacheKey = `${targetLanguage}:${word}:${context}`;

  if (definitionCache.has(cacheKey)) {
    renderWordHelp(definitionCache.get(cacheKey));
    return;
  }

  try {
    const response = await fetch("/api/define", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ word, context, targetLanguage })
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not load the definition.");
    }

    definitionCache.set(cacheKey, data);
    renderWordHelp(data);
  } catch (error) {
    sheetContent.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
  }
}

function getWordContext(index) {
  const start = Math.max(0, index - 8);
  const end = Math.min(wordSpans.length, index + 9);
  return wordSpans.slice(start, end).map((span) => span.textContent).join(" ");
}

function renderWordHelp(data) {
  sheetContent.innerHTML = `
    <div class="definition-card">
      <p class="definition-line">${escapeHtml(data.definition)}</p>
      <p class="translation-line">${escapeHtml(data.translation)}</p>
      <p class="example-line">${escapeHtml(data.example)}</p>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function formatTime(seconds) {
  const safeSeconds = Number.isFinite(seconds) ? seconds : 0;
  const mins = Math.floor(safeSeconds / 60);
  const secs = Math.floor(safeSeconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}
