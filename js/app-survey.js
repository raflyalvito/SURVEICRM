/**
 * SURVEICRM - Public Respondent Survey Controller
 * Mengelola pemuatan survei untuk publik, render form pertanyaan,
 * pertanyaan lanjutan (follow-up) per opsi pilihan ganda,
 * validasi NIM (anti-duplikat), validasi kelengkapan jawaban wajib,
 * dan submit ke Firebase Firestore / LocalStorage.
 */

document.addEventListener("DOMContentLoaded", async () => {
  const loadingEl = document.getElementById("survey-loading");
  const errorEl = document.getElementById("survey-error");
  const errorMsgEl = document.getElementById("error-message");
  const formEl = document.getElementById("survey-form");
  const successEl = document.getElementById("survey-success");
  const blockedEl = document.getElementById("survey-blocked");
  const blockedNimEl = document.getElementById("blocked-nim");

  const titleEl = document.getElementById("survey-display-title");
  const descEl = document.getElementById("survey-display-desc");
  const questionsContainer = document.getElementById(
    "survey-questions-container",
  );
  const submitBtn = document.getElementById("btn-submit-survey");
  const nimInput = document.getElementById("input-nim");
  const progressBar = document.getElementById("survey-progress-bar");
  const progressFill = document.getElementById("progress-fill");

  const urlParams = new URLSearchParams(window.location.search);
  let surveyId = urlParams.get("id");

  let surveyData = null;
  const userAnswers = {};

  // =============================================
  // 1. MUAT DATA SURVEI
  // =============================================
  try {
    if (!surveyId) {
      const allSurveys = await window.SurveyDB.getSurveys();
      if (allSurveys && allSurveys.length > 0) {
        surveyId = allSurveys[0].id;
      } else {
        surveyId = "srv_contoh_crm";
      }
    }

    surveyData = await window.SurveyDB.getSurveyById(surveyId);

    if (!surveyData) {
      const fallbackList = await window.SurveyDB.getSurveys();
      if (fallbackList && fallbackList.length > 0) {
        surveyData = fallbackList[0];
        surveyId = surveyData.id;
      }
    }

    if (!surveyData) {
      loadingEl.classList.add("hidden");
      errorMsgEl.textContent =
        "Belum ada survei yang aktif. Silakan buat survei terlebih dahulu di Dashboard Admin.";
      errorEl.classList.remove("hidden");
      return;
    }

    // Render header survei
    document.title = `${surveyData.title} — SURVEICRM`;
    titleEl.textContent = surveyData.title;
    descEl.textContent =
      surveyData.description ||
      "Silakan lengkapi kuesioner berikut sesuai dengan pengalaman dan penilaian Anda.";

    const questions = surveyData.questions || [];
    renderQuestions(questions);
    updateProgress(questions);

    loadingEl.classList.add("hidden");
    formEl.classList.remove("hidden");
    progressBar.style.display = "block";
  } catch (err) {
    console.error(err);
    loadingEl.classList.add("hidden");
    errorMsgEl.textContent =
      "Terjadi kesalahan saat memuat survei: " + err.message;
    errorEl.classList.remove("hidden");
  }

  // =============================================
  // 2. RENDER PERTANYAAN
  // =============================================
  function renderQuestions(questions) {
    questionsContainer.innerHTML = "";

    questions.forEach((q, index) => {
      const qCard = document.createElement("div");
      qCard.className = "q-card";
      qCard.id = `q-card-${q.id}`;
      qCard.dataset.qid = q.id;

      let qHtml = `
        <div class="flex items-start gap-3 mb-4">
          <div class="q-number">${index + 1}</div>
          <div class="flex-1 pt-0.5">
            <h3 class="text-sm sm:text-base font-bold text-slate-800 leading-snug">
              ${escapeHtml(q.title)}
              ${q.required ? '<span class="text-rose-500 font-black ml-1">*</span>' : '<span class="text-xs text-slate-400 font-normal ml-2">(opsional)</span>'}
            </h3>
          </div>
        </div>
      `;

      if (q.type === "choice") {
        qHtml += `<div class="space-y-2">`;
        (q.options || []).forEach((opt, optIdx) => {
          qHtml += `
            <div
              class="choice-option"
              id="choice-${q.id}-${optIdx}"
              onclick="selectChoice('${q.id}', '${escapeAttr(opt)}', ${optIdx})"
              tabindex="0"
              role="radio"
              aria-checked="false"
            >
              <div class="choice-dot" id="dot-${q.id}-${optIdx}"></div>
              <span class="text-sm font-medium text-slate-700 flex-1">${escapeHtml(opt)}</span>
            </div>
          `;
        });
        qHtml += `</div>`;

        // Pertanyaan lanjutan (follow-up) yang menempel ke opsi tertentu —
        // tersembunyi secara default, baru muncul kalau opsi terkait dipilih.
        if (q.followUps) {
          Object.keys(q.followUps).forEach((optIdxKey) => {
            const fu = q.followUps[optIdxKey];
            if (!fu || !fu.title) return;
            qHtml += `
              <div
                class="followup-block hidden-branch"
                id="followup-${q.id}-${optIdxKey}"
                data-fu-id="${fu.id}"
              >
                <p class="text-sm font-semibold text-slate-700 mb-2">
                  ${escapeHtml(fu.title)}
                  ${fu.required ? '<span class="text-rose-500 font-black ml-1">*</span>' : '<span class="text-xs text-slate-400 font-normal ml-2">(opsional)</span>'}
                </p>
                <textarea
                  rows="3"
                  placeholder="Tulis jawaban Anda di sini..."
                  oninput="updateFollowUpAnswer('${fu.id}', this.value)"
                  class="text-input"
                ></textarea>
              </div>
            `;
          });
        }
      } else if (q.type === "scale") {
        const emojiMap = { 1: "😞", 2: "🙁", 3: "😐", 4: "🙂", 5: "😄" };
        qHtml += `
          <div class="space-y-3 pt-1">
            <div class="grid grid-cols-5 gap-2">
              ${[1, 2, 3, 4, 5]
                .map(
                  (num) => `
                <button
                  type="button"
                  id="scale-${q.id}-${num}"
                  data-scale-btn="${q.id}"
                  data-val="${num}"
                  onclick="selectScale('${q.id}', ${num})"
                  class="scale-btn"
                >
                  <span class="text-lg mb-0.5">${emojiMap[num]}</span>
                  <span class="text-base font-black">${num}</span>
                </button>
              `,
                )
                .join("")}
            </div>
            <div class="flex justify-between text-xs text-slate-400 font-semibold px-1">
              <span>⬅️ ${escapeHtml(q.minLabel || "Sangat Tidak Puas")}</span>
              <span>${escapeHtml(q.maxLabel || "Sangat Puas")} ➡️</span>
            </div>
          </div>
        `;
      } else if (q.type === "text") {
        qHtml += `
          <textarea
            rows="4"
            placeholder="Tulis tanggapan atau saran Anda di sini..."
            oninput="updateTextAnswer('${q.id}', this.value)"
            class="text-input mt-1"
          ></textarea>
        `;
      }

      qCard.innerHTML = qHtml;
      questionsContainer.appendChild(qCard);
    });
  }

  // =============================================
  // 2b. PERTANYAAN LANJUTAN (FOLLOW-UP) PER OPSI
  // =============================================

  // Kumpulkan follow-up yang SEDANG relevan berdasarkan opsi yang sudah dipilih responden saat ini.
  function getActiveFollowUps() {
    const result = [];
    (surveyData.questions || []).forEach((q) => {
      if (q.type !== "choice" || !q.followUps) return;
      const selectedVal = userAnswers[q.id];
      if (selectedVal === undefined) return;
      const selectedIdx = (q.options || []).indexOf(selectedVal);
      const fu = q.followUps[selectedIdx];
      if (fu) result.push({ ...fu, parentQId: q.id, optIdx: selectedIdx });
    });
    return result;
  }

  // Tampilkan follow-up milik opsi yang baru dipilih, sembunyikan follow-up opsi lain
  // di pertanyaan yang sama, dan bersihkan jawaban follow-up yang jadi tidak relevan lagi.
  function syncFollowUpsForQuestion(q, selectedIdx) {
    if (!q.followUps) return;
    Object.keys(q.followUps).forEach((optIdxKey) => {
      const fu = q.followUps[optIdxKey];
      if (!fu) return;
      const block = document.getElementById(`followup-${q.id}-${optIdxKey}`);
      if (!block) return;

      if (parseInt(optIdxKey, 10) === selectedIdx) {
        block.classList.remove("hidden-branch");
      } else {
        block.classList.add("hidden-branch");
        block.classList.remove("error-state");
        if (userAnswers[fu.id] !== undefined) {
          delete userAnswers[fu.id];
          const textarea = block.querySelector("textarea");
          if (textarea) textarea.value = "";
        }
      }
    });
  }

  // =============================================
  // 3. EVENT HANDLERS JAWABAN
  // =============================================
  window.selectChoice = function (qId, val, selectedIdx) {
    userAnswers[qId] = val;
    clearErrorCard(qId);

    // Visual update: clear all, mark selected
    const q = (surveyData.questions || []).find((q) => q.id === qId);
    if (!q) return;
    (q.options || []).forEach((_, idx) => {
      const el = document.getElementById(`choice-${qId}-${idx}`);
      if (el) {
        el.classList.remove("selected");
        el.setAttribute("aria-checked", "false");
      }
    });
    const selectedEl = document.getElementById(`choice-${qId}-${selectedIdx}`);
    if (selectedEl) {
      selectedEl.classList.add("selected");
      selectedEl.setAttribute("aria-checked", "true");
    }

    // Munculkan/sembunyikan pertanyaan lanjutan sesuai opsi yang baru dipilih
    syncFollowUpsForQuestion(q, selectedIdx);
    updateProgress(surveyData.questions || []);
  };

  window.selectScale = function (qId, num) {
    userAnswers[qId] = num.toString();
    clearErrorCard(qId);
    updateProgress(surveyData.questions || []);

    // Visual: reset all scale buttons for this qId, then mark active
    document
      .querySelectorAll(`button[data-scale-btn="${qId}"]`)
      .forEach((btn) => {
        btn.classList.remove("active");
      });
    const activeBtn = document.getElementById(`scale-${qId}-${num}`);
    if (activeBtn) activeBtn.classList.add("active");
  };

  window.updateTextAnswer = function (qId, val) {
    userAnswers[qId] = val.trim();
    if (val.trim()) clearErrorCard(qId);
    updateProgress(surveyData.questions || []);
  };

  window.updateFollowUpAnswer = function (fuId, val) {
    userAnswers[fuId] = val.trim();
    const block = document.querySelector(`[data-fu-id="${fuId}"]`);
    if (block && val.trim()) block.classList.remove("error-state");
    updateProgress(surveyData.questions || []);
  };

  function clearErrorCard(qId) {
    const card = document.getElementById(`q-card-${qId}`);
    if (card) card.classList.remove("error-state");
  }

  function highlightErrorCard(qId) {
    const card = document.getElementById(`q-card-${qId}`);
    if (card) {
      card.classList.add("error-state");
      card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function highlightFollowUpError(fu) {
    const block = document.getElementById(
      `followup-${fu.parentQId}-${fu.optIdx}`,
    );
    if (block) {
      block.classList.add("error-state");
      block.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function updateProgress(questions) {
    if (!progressFill || questions.length === 0) return;

    const requiredMain = questions.filter((q) => q.required);
    const activeFollowUps = getActiveFollowUps();
    const requiredFollowUps = activeFollowUps.filter((fu) => fu.required);

    const totalRequired = requiredMain.length + requiredFollowUps.length;
    if (totalRequired === 0) return;

    const answeredMain = requiredMain.filter(
      (q) => userAnswers[q.id] && userAnswers[q.id] !== "",
    ).length;
    const answeredFollowUps = requiredFollowUps.filter(
      (fu) => userAnswers[fu.id] && userAnswers[fu.id] !== "",
    ).length;

    const pct = Math.round(
      ((answeredMain + answeredFollowUps) / totalRequired) * 100,
    );
    progressFill.style.width = pct + "%";
  }

  // =============================================
  // 4. NIM INPUT — Only digits
  // =============================================
  nimInput.addEventListener("input", () => {
    // Strip non-digit characters
    nimInput.value = nimInput.value.replace(/\D/g, "");
  });

  // =============================================
  // 5. FORM SUBMIT — Validasi NIM + Duplikat + Jawaban
  // =============================================
  formEl.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nim = nimInput.value.trim();

    // Validasi NIM
    if (!nim) {
      nimInput.focus();
      nimInput.style.borderColor = "rgba(248,113,113,0.8)";
      nimInput.style.boxShadow = "0 0 0 4px rgba(248,113,113,0.25)";
      window.UI.showToast(
        "NIM wajib diisi sebelum mengirim jawaban!",
        "warning",
      );
      nimInput.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!/^\d+$/.test(nim)) {
      nimInput.focus();
      window.UI.showToast("NIM hanya boleh berisi angka!", "warning");
      return;
    }
    if (nim.length < 5) {
      nimInput.focus();
      window.UI.showToast("NIM terlalu pendek, periksa kembali!", "warning");
      return;
    }

    // Reset NIM input style
    nimInput.style.borderColor = "";
    nimInput.style.boxShadow = "";

    // Validasi pertanyaan wajib (pertanyaan utama)
    const questions = surveyData.questions || [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (q.required) {
        const val = userAnswers[q.id];
        if (!val || val === "") {
          highlightErrorCard(q.id);
          window.UI.showToast(`Pertanyaan ${i + 1} wajib diisi!`, "warning");
          return;
        }
      }
    }

    // Validasi pertanyaan lanjutan (follow-up) yang sedang tampil & wajib diisi
    const activeFollowUps = getActiveFollowUps();
    for (const fu of activeFollowUps) {
      if (fu.required) {
        const fuVal = userAnswers[fu.id];
        if (!fuVal || fuVal === "") {
          highlightFollowUpError(fu);
          window.UI.showToast(
            `Pertanyaan lanjutan "${fu.title}" wajib diisi!`,
            "warning",
          );
          return;
        }
      }
    }

    // Ubah tombol → loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
      <span>Memeriksa NIM...</span>
    `;

    try {
      // Cek duplikasi NIM
      const nimExists = await window.SurveyDB.checkNIMExists(surveyId, nim);
      if (nimExists) {
        // Tampilkan layar blokir
        blockedNimEl.textContent = nim;
        formEl.classList.add("hidden");
        blockedEl.classList.remove("hidden");
        progressBar.style.display = "none";
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      // Update label tombol → mengirim
      submitBtn.innerHTML = `
        <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
        <span>Mengirim Jawaban...</span>
      `;

      // Submit dengan NIM (userAnswers sudah otomatis hanya berisi jawaban yang relevan,
      // karena follow-up yang disembunyikan langsung dihapus dari objek ini)
      await window.SurveyDB.submitResponse(surveyId, userAnswers, nim);

      // Tampilkan layar sukses
      formEl.classList.add("hidden");
      successEl.classList.remove("hidden");
      progressFill.style.width = "100%";
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      window.UI.showToast("Gagal mengirim jawaban: " + err.message, "error");
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Kirim Jawaban Saya</span><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>`;
    }
  });

  // =============================================
  // HELPERS
  // =============================================
  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[m],
    );
  }
  function escapeAttr(str) {
    if (!str) return "";
    return str.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
});
