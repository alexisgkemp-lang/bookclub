(function () {
  var params = new URLSearchParams(window.location.search);
  var contactId = params.get("contact_id") || "";

  // ── Config ──
  var EVENT_TIME_ISO = "2026-06-17T19:00:00+01:00";
  var WHATSAPP_PHONE = "447765921595";
  var WHATSAPP_MSG = "Hi Alex, I'd like to know more about your speaking lessons";

  // ── Timezone ──
  try {
    var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      var localTime = new Date(EVENT_TIME_ISO).toLocaleTimeString("en-GB", {
        timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true
      });
      var tzShort = tz.split("/").pop().replace(/_/g, " ");
      document.getElementById("event-tz-display").textContent =
        "Your local time: " + localTime + " (" + tzShort + ")";
    }
  } catch (e) {
    document.getElementById("event-tz-display").textContent = "Check your local time zone.";
  }

  // ── Helpers ──
  function scrollToSection(id) {
    var el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }

  async function saveResponse(data) {
    if (!contactId) return;
    try {
      await fetch("/api/welcome/respond", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contact_id: contactId, ...data })
      });
    } catch (e) {}
  }

  function getTimezone() {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ""; }
    catch (e) { return ""; }
  }

  // ── Fetch poll counts ──
  var ALL_SLOTS = [
    "mon_morning","mon_afternoon","mon_evening",
    "tue_morning","tue_afternoon","tue_evening",
    "wed_morning","wed_afternoon","wed_evening",
    "thu_morning","thu_afternoon","thu_evening",
    "fri_morning","fri_afternoon","fri_evening",
    "sat_morning"
  ];

  async function loadPollCounts() {
    try {
      var res = await fetch("/api/welcome/time-poll");
      var data = await res.json();
      var counts = data.counts || {};
      ALL_SLOTS.forEach(function (key) {
        var el = document.getElementById("count-" + key);
        if (el) el.textContent = counts[key] || 0;
      });
    } catch (e) {}
  }
  loadPollCounts();

  // ── Meetup RSVP ──
  window.handleCanMake = function () {
    var btn = document.querySelector("#rsvp-section .btn-primary");
    btn.classList.add("selected");
    btn.textContent = "You're in";
    saveResponse({
      event_id: "meetup-2026-06-17",
      event_status: "can_make_main_event",
      booked_at: new Date().toISOString(),
      timezone: getTimezone()
    });
    setTimeout(function () { scrollToSection("section-reading"); }, 600);
  };

  // ── Poll sheet ──
  window.openPollSheet = function () {
    document.getElementById("poll-sheet").classList.add("is-open");
    loadPollCounts();
  };

  var selectedSlots = [];

  window.toggleSlot = function (el) {
    var slot = el.dataset.slot;
    el.classList.toggle("selected");
    if (selectedSlots.includes(slot)) {
      selectedSlots = selectedSlots.filter(function (s) { return s !== slot; });
    } else {
      selectedSlots.push(slot);
    }
    var doneBtn = document.querySelector(".btn-vote-done");
    if (selectedSlots.length > 0) {
      doneBtn.classList.add("is-active");
    } else {
      doneBtn.classList.remove("is-active");
    }
  };

  window.submitVote = function () {
    if (selectedSlots.length === 0) return;
    var btn = document.querySelector(".btn-vote-done");
    btn.classList.add("selected");
    btn.textContent = "Done";
    saveResponse({
      event_id: "meetup-2026-06-17",
      event_status: "prefers_another_time",
      available_slots: selectedSlots,
      timezone: getTimezone(),
      submitted_at: new Date().toISOString()
    });
    loadPollCounts();
    setTimeout(function () {
      document.getElementById("poll-sheet").classList.remove("is-open");
      scrollToSection("section-reading");
    }, 400);
  };

  window.handleSkip = function () {
    var btn = document.querySelector(".btn-skip");
    btn.classList.add("selected");
    btn.textContent = "Skipped";
    saveResponse({
      event_id: "meetup-2026-06-17",
      event_status: "skipped_time_poll",
      available_slots: [],
      timezone: getTimezone(),
      submitted_at: new Date().toISOString()
    });
    setTimeout(function () {
      document.getElementById("poll-sheet").classList.remove("is-open");
      scrollToSection("section-reading");
    }, 400);
  };

  // ── Genre chips ──
  var selectedGenres = [];

  window.toggleGenreChip = function (el) {
    el.classList.toggle("selected");
    var val = el.dataset.value;
    if (selectedGenres.includes(val)) {
      selectedGenres = selectedGenres.filter(function (g) { return g !== val; });
    } else {
      selectedGenres.push(val);
    }
    saveResponse({
      story_preferences: selectedGenres,
      updated_at: new Date().toISOString()
    });
  };

  window.handleDone = function () {
    var btn = document.querySelector(".btn-done");
    btn.classList.add("selected");
    btn.textContent = "Done";
    saveResponse({
      story_preferences: selectedGenres,
      updated_at: new Date().toISOString()
    });
    setTimeout(function () { scrollToSection("section-speaking"); }, 400);
  };

  // ── Speaking / WhatsApp ──
  window.handleWhatsApp = function (e) {
    e.preventDefault();
    saveResponse({
      speaking_interest: true,
      speaking_clicked_at: new Date().toISOString(),
      source: "welcome_page"
    });
    window.open("https://wa.me/" + WHATSAPP_PHONE + "?text=" + encodeURIComponent(WHATSAPP_MSG), "_blank");
  };

  window.handleEmail = function () {
    var btn = document.querySelector(".btn-email");
    var btnText = document.querySelector(".btn-email-text");
    navigator.clipboard.writeText("alex@atomic.community").then(function () {
      btn.classList.add("copied");
      btnText.textContent = "Copied!";
      setTimeout(function () {
        btn.classList.remove("copied");
        btnText.textContent = "alex@atomic.community";
      }, 2000);
    });
    saveResponse({
      speaking_interest: true,
      speaking_clicked_at: new Date().toISOString(),
      source: "welcome_page"
    });
  };
})();