const story = document.querySelector("#story");
const statusText = document.querySelector("#status");
const progressFill = document.querySelector("#progress-fill");
const stickerStage = document.querySelector("#sticker-stage");

const beats = [
  {
    mood: "browse",
    sticker: "cards",
    before: "Do you buy your clothes online? It is probably quicker than going around the shops, but you can still",
    after: "a lot of time clicking through websites and comparing offers.",
    answer: "spend",
    options: ["spend", "pass", "use"]
  },
  {
    mood: "tailor",
    sticker: "tape",
    before: "Some people are old school. I doubt many people actually go to a tailor these days, but I know people who prefer",
    after: "buy clothes online because they cannot check the quality.",
    answer: "not to",
    options: ["not to", "doesn't", "don't"]
  },
  {
    mood: "returns",
    sticker: "parcel",
    before: "Because returning things",
    after: "even more of your precious time, doesn't it?",
    answer: "takes",
    options: ["takes", "uses", "wants"]
  },
  {
    mood: "shopper",
    sticker: "bag",
    before: "Perhaps the answer to all this stress is a personal shopper. I wouldn't mind",
    after: "a personal shopper to whisk me around the shops, give me style advice and of course carry my bags.",
    answer: "having",
    options: ["having", "have", "to have"]
  }
];

let currentBeat = 0;

renderBeat(0);
updateProgress();

function renderBeat(index) {
  const beat = beats[index];
  document.body.dataset.mood = beat.mood;

  const block = document.createElement("section");
  block.className = "bite-block is-active";
  block.innerHTML = `
    <p>
      ${escapeHtml(beat.before)}
      <span class="blank" aria-label="missing word">____</span>
      ${escapeHtml(beat.after)}
    </p>
    <div class="choices" role="group" aria-label="Choose the best word">
      ${beat.options.map((option) => `<button type="button">${escapeHtml(option)}</button>`).join("")}
    </div>
  `;

  block.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => chooseAnswer(button, block, beat));
  });

  story.append(block);
  block.scrollIntoView({ behavior: "smooth", block: "center" });
}

function chooseAnswer(button, block, beat) {
  const selected = button.textContent.trim();
  const isCorrect = selected === beat.answer;

  block.querySelectorAll("button").forEach((item) => {
    item.disabled = true;
    item.classList.toggle("is-correct", item.textContent.trim() === beat.answer);
    item.classList.toggle("is-wrong", item === button && !isCorrect);
  });

  if (!isCorrect) {
    statusText.textContent = "Almost. Watch the phrase and try the next one.";
  } else {
    statusText.textContent = "Nice. The story continues.";
  }

  block.querySelector(".blank").textContent = beat.answer;
  block.classList.remove("is-active");
  block.classList.add(isCorrect ? "is-complete" : "is-revealed");
  floatSticker(beat.sticker);

  window.setTimeout(() => {
    currentBeat += 1;
    updateProgress();

    if (currentBeat < beats.length) {
      renderBeat(currentBeat);
      statusText.textContent = "Choose the best word to continue.";
    } else {
      renderFinish();
    }
  }, isCorrect ? 900 : 1250);
}

function renderFinish() {
  document.body.dataset.mood = "finish";
  const finish = document.createElement("section");
  finish.className = "review-card";
  finish.innerHTML = `
    <h2>Today&apos;s useful patterns</h2>
    <p><strong>spend time</strong> doing something</p>
    <p><strong>prefer not to</strong> do something</p>
    <p><strong>takes time</strong></p>
    <p><strong>wouldn&apos;t mind having</strong></p>
  `;
  story.append(finish);
  finish.scrollIntoView({ behavior: "smooth", block: "center" });
  statusText.textContent = "Daily bite complete.";
}

function updateProgress() {
  progressFill.style.width = `${Math.round((currentBeat / beats.length) * 100)}%`;
}

function floatSticker(type) {
  const sticker = document.createElement("div");
  sticker.className = `sticker sticker-${type}`;
  sticker.innerHTML = stickerSvg(type);
  stickerStage.append(sticker);
}

function stickerSvg(type) {
  const stickers = {
    cards: `<svg viewBox="0 0 160 150" role="img" aria-label="shopping cards">
      <g fill="none" stroke="#1d1b19" stroke-width="2" stroke-linejoin="round">
        <rect x="16" y="34" width="82" height="104" rx="4" fill="#f7b8c8" transform="rotate(-7 57 86)"/>
        <rect x="58" y="14" width="86" height="112" rx="4" fill="#ffe16b" transform="rotate(6 101 70)"/>
        <path d="M72 45h54M71 35h13m8 0h13m8 0h13" />
        <path d="M84 60h28v34H84z" fill="#74b4ff"/>
        <path d="M51 60h26v45H51z" fill="#31b86b"/>
        <path d="M35 126h18m48-12h28" />
      </g>
    </svg>`,
    tape: `<svg viewBox="0 0 160 150" role="img" aria-label="tailor tape">
      <g fill="none" stroke="#191817" stroke-width="2.2" stroke-linecap="round">
        <path d="M24 104c34-70 80-84 102-48 22 37-50 65-76 36-20-22 17-48 43-37" stroke="#f2c84b" stroke-width="18"/>
        <path d="M24 104c34-70 80-84 102-48 22 37-50 65-76 36-20-22 17-48 43-37"/>
        <path d="M43 77l9 5m9-18l8 6m13-13l5 8m17 0l-4 9m-13 24l-8-4m-16-4l-8-4"/>
      </g>
    </svg>`,
    parcel: `<svg viewBox="0 0 160 150" role="img" aria-label="return parcel">
      <g stroke="#1b1a18" stroke-linejoin="round" stroke-width="2">
        <path d="M38 38l78-12 18 85-78 13z" fill="#dfe8f0"/>
        <path d="M49 49l54-8 5 31-54 8z" fill="#fff"/>
        <path d="M60 58h34M62 68h42M66 95h45"/>
        <path d="M114 83c-12-3-25 1-32 12" fill="none"/>
        <path d="M81 95l13 3-6-12" fill="none"/>
      </g>
    </svg>`,
    bag: `<svg viewBox="0 0 160 150" role="img" aria-label="shopping bag">
      <g stroke="#191817" stroke-width="2" stroke-linejoin="round">
        <path d="M40 49h76l-7 83H49z" fill="#20b36a"/>
        <path d="M60 52c0-22 41-22 41 0" fill="none"/>
        <path d="M55 76h49M58 96h42" />
        <path d="M111 63l16-10 10 18-19 8z" fill="#ff8da1"/>
      </g>
    </svg>`
  };
  return stickers[type] || stickers.cards;
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
