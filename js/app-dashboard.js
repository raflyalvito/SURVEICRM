/**
 * SURVEICRM - Executive Analytics Dashboard & Studio Controller
 * Mengelola tab navigasi, Chart.js analitik CRM real-time, live smartphone preview,
 * dan modal interaktif.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Elements Tab Navigation
  const viewAnalytics = document.getElementById("view-analytics");
  const viewSurveys = document.getElementById("view-surveys");
  const viewBuilder = document.getElementById("view-builder");

  const tabBtnAnalytics = document.getElementById("tab-btn-analytics");
  const tabBtnSurveys = document.getElementById("tab-btn-surveys");
  const tabBtnBuilder = document.getElementById("tab-btn-builder");
  const tabBadgeCount = document.getElementById("tab-badge-count");

  // Elements Status & Analytics
  const connectionBadge = document.getElementById("connection-status-badge");
  const surveyFilterSelect = document.getElementById("analytics-survey-filter");
  const btnExportAnalyticsCsv = document.getElementById(
    "btn-export-analytics-csv",
  );

  // KPI Elements
  const kpiTotalRespondents = document.getElementById("kpi-total-respondents");
  const kpiCsatScore = document.getElementById("kpi-csat-score");
  const kpiCsatBadge = document.getElementById("kpi-csat-badge");
  const kpiNpsScore = document.getElementById("kpi-nps-score");
  const kpiNpsDetail = document.getElementById("kpi-nps-detail");
  const kpiCompletionRate = document.getElementById("kpi-completion-rate");

  const npsPctPromoters = document.getElementById("nps-pct-promoters");
  const npsBarPromoters = document.getElementById("nps-bar-promoters");
  const npsPctPassives = document.getElementById("nps-pct-passives");
  const npsBarPassives = document.getElementById("nps-bar-passives");
  const npsPctDetractors = document.getElementById("nps-pct-detractors");
  const npsBarDetractors = document.getElementById("nps-bar-detractors");
  const recentFeedContainer = document.getElementById("analytics-recent-feed");
  const csatLegendContainer = document.getElementById("csat-doughnut-legend");

  // Elements Surveys List View
  const surveysListContainer = document.getElementById(
    "surveys-list-container",
  );
  const btnRefreshSurveys = document.getElementById("btn-refresh-surveys");

  // Elements Builder & Phone Preview
  const inputDashTitle = document.getElementById("dash-survey-title");
  const inputDashDesc = document.getElementById("dash-survey-desc");
  const questionsContainer = document.getElementById(
    "dash-questions-container",
  );
  const phonePreviewScreen = document.getElementById("phone-preview-screen");
  const btnDashAddChoice = document.getElementById("btn-dash-add-choice");
  const btnDashAddScale = document.getElementById("btn-dash-add-scale");
  const btnDashAddText = document.getElementById("btn-dash-add-text");
  const btnDashPublish = document.getElementById("btn-dash-publish");
  const btnResetBuilder = document.getElementById("btn-reset-builder");

  // Elements Modal Isi Survei Langsung
  const modalFill = document.getElementById("modal-fill-survey");
  const fillTitle = document.getElementById("modal-fill-survey-title");
  const fillDesc = document.getElementById("modal-fill-survey-desc");
  const fillQuestionsContainer = document.getElementById(
    "modal-fill-questions-container",
  );
  const fillForm = document.getElementById("modal-fill-form");
  const btnCloseFill = document.getElementById("btn-close-fill-modal");
  const btnCancelFill = document.getElementById("btn-cancel-fill");
  const btnSubmitFill = document.getElementById("btn-submit-fill");

  // Elements Modal Sukses Publikasi
  const modalSuccess = document.getElementById("modal-publish-success");
  const publishedTitle = document.getElementById("published-survey-title");
  const publishedUrlInput = document.getElementById("published-survey-url");
  const btnCopyPublished = document.getElementById("btn-copy-published-url");
  const btnWhatsAppPublished = document.getElementById(
    "btn-whatsapp-published",
  );
  const btnClosePublishModal = document.getElementById(
    "btn-close-publish-modal",
  );

  // Elements Modal Firebase Config
  const modalConfig = document.getElementById("modal-firebase-config");
  const btnOpenConfig = document.getElementById("btn-open-config");
  const btnCloseConfig = document.getElementById("btn-close-config-modal");
  const btnCancelConfig = document.getElementById("btn-cancel-config");
  const formConfig = document.getElementById("form-firebase-config");
  const btnResetDemo = document.getElementById("btn-reset-demo");
  const inputApiKey = document.getElementById("cfg-apiKey");
  const inputProjectId = document.getElementById("cfg-projectId");
  const inputAuthDomain = document.getElementById("cfg-authDomain");
  const inputStorageBucket = document.getElementById("cfg-storageBucket");
  const inputAppId = document.getElementById("cfg-appId");

  // =========================================================================
  // STATE MANAGEMENT
  // =========================================================================
  let loadedSurveys = [];
  let allResponsesMap = {}; // { [surveyId]: responseArray }
  let currentFillingSurvey = null;
  let currentFillingAnswers = {};

  // Chart instances
  let timelineChartInstance = null;
  let csatChartInstance = null;
  let aspectsChartInstance = null;

  // Builder Questions State
  let builderQuestions = [
    {
      id: "q_" + Date.now() + "_1",
      type: "scale",
      title:
        "Seberapa puas Anda dengan kualitas layanan pelanggan kami secara keseluruhan?",
      required: true,
      minLabel: "Sangat Tidak Puas",
      maxLabel: "Sangat Puas",
    },
    {
      id: "q_" + Date.now() + "_2",
      type: "choice",
      title:
        "Fasilitas atau channel layanan mana yang paling sering Anda gunakan?",
      required: true,
      options: [
        "Layanan Chat WhatsApp",
        "Pemesanan Online",
        "Layanan Telepon",
        "Kunjungan Langsung",
      ],
    },
    {
      id: "q_" + Date.now() + "_3",
      type: "text",
      title:
        "Berikan kritik atau saran Anda untuk peningkatan mutu pelayanan kami ke depan:",
      required: false,
    },
  ];

  // =========================================================================
  // TAB NAVIGATION CONTROLLER
  // =========================================================================
  window.switchTab = function (tabName) {
    viewAnalytics.classList.add("hidden");
    viewSurveys.classList.add("hidden");
    viewBuilder.classList.add("hidden");

    tabBtnAnalytics.classList.remove("active");
    tabBtnSurveys.classList.remove("active");
    tabBtnBuilder.classList.remove("active");

    if (tabName === "analytics") {
      viewAnalytics.classList.remove("hidden");
      tabBtnAnalytics.classList.add("active");
      loadAnalyticsData();
    } else if (tabName === "surveys") {
      viewSurveys.classList.remove("hidden");
      tabBtnSurveys.classList.add("active");
      renderSurveysList();
    } else if (tabName === "builder") {
      viewBuilder.classList.remove("hidden");
      tabBtnBuilder.classList.add("active");
      renderBuilderQuestions();
      updatePhonePreview();
    }
  };

  // =========================================================================
  // KONEKSI STATUS FIREBASE
  // =========================================================================
  function updateConnectionStatus() {
    const isConfigured = window.SurveyDB.isConfigured();
    const config = window.SurveyDB.getConfig();

    if (isConfigured && window.SurveyDB.isFirebaseActive) {
      connectionBadge.innerHTML = `
        <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Firebase Cloud (${config.projectId})</span>
        </div>
      `;
    } else {
      connectionBadge.innerHTML = `
        <button id="btn-badge-setup" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition cursor-pointer shadow-sm">
          <span class="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>Mode Demo (Lokal) &bull; Hubungkan Cloud</span>
        </button>
      `;
      const badgeBtn = document.getElementById("btn-badge-setup");
      if (badgeBtn) badgeBtn.addEventListener("click", openConfigModal);
    }
  }

  // =========================================================================
  // LOAD DATA UTAMA
  // =========================================================================
  async function loadAllInitialData() {
    updateConnectionStatus();

    try {
      loadedSurveys = await window.SurveyDB.getSurveys();
      tabBadgeCount.textContent = loadedSurveys.length;

      // Update Filter Dropdown di Analitik
      updateSurveyFilterOptions();

      // Ambil respons tiap survei
      for (const s of loadedSurveys) {
        allResponsesMap[s.id] = await window.SurveyDB.getResponses(s.id);
      }

      // Render tab analitik
      loadAnalyticsData();
    } catch (err) {
      console.error("Error load initial data:", err);
    }
  }

  function updateSurveyFilterOptions() {
    const currentVal = surveyFilterSelect.value;
    surveyFilterSelect.innerHTML =
      '<option value="all">Semua Survei (Agregat CRM)</option>';
    loadedSurveys.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent =
        s.title.length > 35 ? s.title.substring(0, 35) + "..." : s.title;
      surveyFilterSelect.appendChild(opt);
    });
    if (currentVal && loadedSurveys.some((s) => s.id === currentVal)) {
      surveyFilterSelect.value = currentVal;
    }
  }

  surveyFilterSelect.addEventListener("change", () => {
    loadAnalyticsData();
  });

  // =========================================================================
  // KALKULASI & RENDERING ANALITIK CRM
  // =========================================================================
  window.loadAnalyticsData = function () {
    const filterId = surveyFilterSelect.value;

    let targetSurveys = loadedSurveys;
    if (filterId !== "all") {
      targetSurveys = loadedSurveys.filter((s) => s.id === filterId);
    }

    // Kumpulkan seluruh respons target
    let targetResponses = [];
    targetSurveys.forEach((s) => {
      const resps = allResponsesMap[s.id] || [];
      resps.forEach((r) => {
        targetResponses.push({ ...r, surveyTitle: s.title });
      });
    });

    // Urutkan waktu pengisian descending
    targetResponses.sort(
      (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt),
    );

    // 1. KPI Total Responden
    kpiTotalRespondents.textContent = targetResponses.length;

    // 2. CSAT & NPS Calculation
    let totalScore = 0;
    let scoreCount = 0;
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let promoters = 0;
    let passives = 0;
    let detractors = 0;

    // Skor per pertanyaan skala untuk Bar Chart
    const scaleAspectsMap = {}; // { [qTitle]: { total: 0, count: 0 } }

    targetSurveys.forEach((survey) => {
      const questions = survey.questions || [];
      const resps = allResponsesMap[survey.id] || [];

      questions
        .filter((q) => q.type === "scale")
        .forEach((q) => {
          if (!scaleAspectsMap[q.title]) {
            scaleAspectsMap[q.title] = { total: 0, count: 0 };
          }

          resps.forEach((r) => {
            const ans = r.answers ? r.answers[q.id] : null;
            if (ans) {
              const num = parseInt(ans, 10);
              if (num >= 1 && num <= 5) {
                totalScore += num;
                scoreCount++;
                ratingDistribution[num] = (ratingDistribution[num] || 0) + 1;

                scaleAspectsMap[q.title].total += num;
                scaleAspectsMap[q.title].count += 1;

                if (num === 5) promoters++;
                else if (num === 4) passives++;
                else detractors++;
              }
            }
          });
        });
    });

    // Hitung Rata-Rata CSAT
    const avgCsat =
      scoreCount > 0 ? (totalScore / scoreCount).toFixed(1) : "0.0";
    kpiCsatScore.textContent = avgCsat;

    if (scoreCount > 0) {
      if (avgCsat >= 4.5) {
        kpiCsatBadge.textContent = "🌟 Sangat Puas";
        kpiCsatBadge.className =
          "inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200";
      } else if (avgCsat >= 3.5) {
        kpiCsatBadge.textContent = "👍 Puas / Baik";
        kpiCsatBadge.className =
          "inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200";
      } else if (avgCsat >= 2.5) {
        kpiCsatBadge.textContent = "😐 Netral";
        kpiCsatBadge.className =
          "inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200";
      } else {
        kpiCsatBadge.textContent = "⚠️ Perlu Evaluasi";
        kpiCsatBadge.className =
          "inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200";
      }
    } else {
      kpiCsatBadge.textContent = "Belum Ada Data";
    }

    // Hitung NPS
    const totalNpsVotes = promoters + passives + detractors;
    if (totalNpsVotes > 0) {
      const pPct = Math.round((promoters / totalNpsVotes) * 100);
      const paPct = Math.round((passives / totalNpsVotes) * 100);
      const dPct = Math.round((detractors / totalNpsVotes) * 100);
      const npsVal = pPct - dPct;

      kpiNpsScore.textContent = (npsVal > 0 ? "+" : "") + npsVal;
      kpiNpsDetail.textContent = `${pPct}% Promoters (${promoters} resp)`;

      npsPctPromoters.textContent = `${pPct}% (${promoters})`;
      npsBarPromoters.style.width = `${pPct}%`;

      npsPctPassives.textContent = `${paPct}% (${passives})`;
      npsBarPassives.style.width = `${paPct}%`;

      npsPctDetractors.textContent = `${dPct}% (${detractors})`;
      npsBarDetractors.style.width = `${dPct}%`;
    } else {
      kpiNpsScore.textContent = "+0";
      kpiNpsDetail.textContent = "Belum ada responden";
      npsPctPromoters.textContent = "0%";
      npsBarPromoters.style.width = "0%";
      npsPctPassives.textContent = "0%";
      npsBarPassives.style.width = "0%";
      npsPctDetractors.textContent = "0%";
      npsBarDetractors.style.width = "0%";
    }

    // 3. Render Chart.js
    renderTimelineChart(targetResponses);
    renderCsatDoughnutChart(ratingDistribution);
    renderAspectsBarChart(scaleAspectsMap);

    // 4. Render Live Recent Feed
    renderRecentFeed(targetResponses);
  };

  // --- Chart 1: Timeline Aktivitas (Area Line Chart) ---
  function renderTimelineChart(responses) {
    const canvas = document.getElementById("chart-timeline-responses");
    if (!canvas) return;

    if (timelineChartInstance) timelineChartInstance.destroy();

    // Kelompokkan 7 titik waktu / jam / tanggal
    const dateCounts = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });
      dateCounts[key] = 0;
    }

    responses.forEach((r) => {
      const d = new Date(r.submittedAt);
      const key = d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });
      if (dateCounts[key] !== undefined) {
        dateCounts[key]++;
      }
    });

    const labels = Object.keys(dateCounts);
    const dataVals = Object.values(dateCounts);

    // Fallback jika semua data nol
    if (dataVals.every((v) => v === 0) && responses.length > 0) {
      labels[labels.length - 1] = "Hari ini";
      dataVals[dataVals.length - 1] = responses.length;
    }

    timelineChartInstance = new Chart(canvas, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Responden Masuk",
            data: dataVals,
            borderColor: "#6366f1",
            backgroundColor: "rgba(99, 102, 241, 0.12)",
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: "#4f46e5",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            pointRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            padding: 10,
            backgroundColor: "#0f172a",
            titleFont: { family: "Plus Jakarta Sans", weight: "bold" },
            bodyFont: { family: "Plus Jakarta Sans" },
          },
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 },
          },
        },
      },
    });
  }

  // --- Chart 2: CSAT Doughnut Chart ---
  function renderCsatDoughnutChart(distribution) {
    const canvas = document.getElementById("chart-csat-doughnut");
    if (!canvas) return;

    if (csatChartInstance) csatChartInstance.destroy();

    const data = [
      distribution[5] || 0,
      distribution[4] || 0,
      distribution[3] || 0,
      distribution[2] || 0,
      distribution[1] || 0,
    ];

    const hasData = data.some((v) => v > 0);
    const finalData = hasData ? data : [1, 1, 1, 1, 1];
    const bgColors = hasData
      ? ["#10b981", "#6366f1", "#3b82f6", "#f59e0b", "#f43f5e"]
      : ["#e2e8f0", "#cbd5e1", "#94a3b8", "#cbd5e1", "#e2e8f0"];

    csatChartInstance = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: [
          "Bintang 5 (Sangat Puas)",
          "Bintang 4 (Puas)",
          "Bintang 3 (Cukup)",
          "Bintang 2 (Kurang)",
          "Bintang 1 (Sangat Buruk)",
        ],
        datasets: [
          {
            data: finalData,
            backgroundColor: bgColors,
            borderWidth: 2,
            borderColor: "#ffffff",
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "72%",
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: hasData,
            backgroundColor: "#0f172a",
            bodyFont: { family: "Plus Jakarta Sans" },
          },
        },
      },
    });

    // Render legend visual
    csatLegendContainer.innerHTML = `
      <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span><span>5: ${distribution[5] || 0} suara</span></div>
      <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-indigo-500"></span><span>4: ${distribution[4] || 0} suara</span></div>
      <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span><span>3: ${distribution[3] || 0} suara</span></div>
      <div class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span><span>2: ${distribution[2] || 0} suara</span></div>
    `;
  }

  // --- Chart 3: Aspects Bar Chart ---
  function renderAspectsBarChart(aspectsMap) {
    const canvas = document.getElementById("chart-aspects-bar");
    if (!canvas) return;

    if (aspectsChartInstance) aspectsChartInstance.destroy();

    const rawLabels = Object.keys(aspectsMap);
    const labels = rawLabels.map((l) =>
      l.length > 28 ? l.substring(0, 28) + "..." : l,
    );
    const dataVals = rawLabels.map((l) => {
      const item = aspectsMap[l];
      return item.count > 0 ? (item.total / item.count).toFixed(1) : 0;
    });

    if (labels.length === 0) {
      labels.push("Belum ada butir pertanyaan skala");
      dataVals.push(0);
    }

    aspectsChartInstance = new Chart(canvas, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Skor Rata-Rata (1 - 5)",
            data: dataVals,
            backgroundColor: "#4f46e5",
            borderRadius: 8,
            barThickness: 24,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#0f172a",
            bodyFont: { family: "Plus Jakarta Sans", weight: "bold" },
          },
        },
        scales: {
          x: {
            min: 0,
            max: 5,
            ticks: { stepSize: 1 },
          },
          y: { grid: { display: false } },
        },
      },
    });
  }

  // --- Live Stream Feed ---
  function renderRecentFeed(responses) {
    recentFeedContainer.innerHTML = "";

    if (responses.length === 0) {
      recentFeedContainer.innerHTML = `
        <div class="py-8 text-center text-slate-400 text-xs">
          Belum ada respon yang masuk. Coba klik <b>"Isi Survei"</b> untuk mencoba kuesioner Anda.
        </div>
      `;
      return;
    }

    responses.slice(0, 8).forEach((r) => {
      const item = document.createElement("div");
      item.className = "py-3 flex items-start justify-between gap-4";

      // Ringkasan isi jawaban
      let textFeedback = "";
      if (r.answers) {
        for (const key in r.answers) {
          const val = r.answers[key];
          if (typeof val === "string" && val.length > 4 && isNaN(val)) {
            textFeedback = `"${val}"`;
            break;
          }
        }
      }

      item.innerHTML = `
        <div class="flex items-start gap-3">
          <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
            ${r.id ? r.id.substring(5, 7).toUpperCase() : "RP"}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="font-bold text-xs text-slate-900">${escapeHtml(r.surveyTitle || "Kuesioner")}</span>
              <span class="text-[10px] text-slate-400 font-mono">#${r.id ? r.id.substring(0, 10) : ""}</span>
            </div>
            <p class="text-xs text-slate-600 mt-0.5 line-clamp-1">${textFeedback ? escapeHtml(textFeedback) : "Jawaban tersimpan lengkap."}</p>
          </div>
        </div>

        <div class="text-right shrink-0">
          <span class="text-[11px] font-semibold text-slate-400 block">${window.UI.formatDate(r.submittedAt)}</span>
        </div>
      `;
      recentFeedContainer.appendChild(item);
    });
  }

  // Export Analytics ke Excel (.xlsx) — dua sheet: Ringkasan KPI & Data Mentah per responden
  btnExportAnalyticsCsv.addEventListener("click", async () => {
    const filterId = surveyFilterSelect.value;
    const targetSurveys =
      filterId === "all"
        ? loadedSurveys
        : loadedSurveys.filter((s) => s.id === filterId);

    let targetResponses = [];
    targetSurveys.forEach((s) => {
      const resps = allResponsesMap[s.id] || [];
      resps.forEach((r) =>
        targetResponses.push({
          ...r,
          surveyTitle: s.title,
          surveyQuestions: s.questions || [],
        }),
      );
    });

    if (targetResponses.length === 0) {
      window.UI.showToast("Belum ada data respons untuk diekspor.", "warning");
      return;
    }

    if (typeof ExcelJS === "undefined") {
      window.UI.showToast(
        "Library ExcelJS gagal dimuat. Cek koneksi internet lalu coba lagi.",
        "warning",
      );
      return;
    }

    targetResponses.sort(
      (a, b) => new Date(b.submittedAt) - new Date(a.submittedAt),
    );

    try {
      // Karena mode "Semua Survei" bisa menggabungkan beberapa kuesioner berbeda,
      // kumpulkan dulu daftar unik judul pertanyaan (union) sebagai kolom bersama
      const questionTitles = [];
      const questionTypeByTitle = {};
      targetSurveys.forEach((s) => {
        (s.questions || []).forEach((q) => {
          if (!questionTitles.includes(q.title)) {
            questionTitles.push(q.title);
            questionTypeByTitle[q.title] = q.type;
          }
        });
      });

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "SURVEICRM";
      workbook.created = new Date();

      // ================= SHEET 1: RINGKASAN =================
      const summarySheet = workbook.addWorksheet("Ringkasan");
      summarySheet.mergeCells("A1:B1");
      const summaryTitleCell = summarySheet.getCell("A1");
      summaryTitleCell.value = "Ringkasan Analitik CRM — SURVEICRM";
      summaryTitleCell.font = {
        bold: true,
        size: 14,
        color: { argb: "FF1E1B4B" },
      };
      summarySheet.getRow(1).height = 26;

      summarySheet.mergeCells("A2:B2");
      const scopeCell = summarySheet.getCell("A2");
      scopeCell.value =
        filterId === "all"
          ? `Cakupan: Semua survei (${targetSurveys.length} kuesioner)`
          : `Cakupan: ${targetSurveys[0] ? targetSurveys[0].title : "-"}`;
      scopeCell.font = { italic: true, size: 10, color: { argb: "FF64748B" } };
      summarySheet.getRow(3).height = 8;

      const summaryRows = [
        ["Total Responden", kpiTotalRespondents.textContent],
        ["Skor CSAT Rata-Rata (skala 1-5)", kpiCsatScore.textContent],
        ["Status Kepuasan (CSAT)", kpiCsatBadge.textContent],
        ["Net Promoter Score (NPS)", kpiNpsScore.textContent],
        ["Detail NPS", kpiNpsDetail.textContent],
        ["Jumlah Survei Tercakup", targetSurveys.length],
        [
          "Tanggal & Waktu Ekspor",
          window.UI.formatDate(new Date().toISOString()),
        ],
      ];

      let sr = 4;
      summaryRows.forEach(([label, val]) => {
        const labelCell = summarySheet.getCell(sr, 1);
        labelCell.value = label;
        labelCell.font = { bold: true, color: { argb: "FF334155" } };
        labelCell.border = borderThin();
        labelCell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
        labelCell.alignment = { vertical: "middle" };

        const valCell = summarySheet.getCell(sr, 2);
        valCell.value = val;
        valCell.border = borderThin();
        valCell.alignment = { vertical: "middle" };
        sr++;
      });
      summarySheet.getColumn(1).width = 32;
      summarySheet.getColumn(2).width = 38;

      // ================= SHEET 2: DATA MENTAH =================
      const columns = [
        { header: "No", width: 6 },
        { header: "Survei", width: 28 },
        { header: "ID Responden", width: 22 },
        { header: "Waktu Pengisian", width: 20 },
      ];
      questionTitles.forEach((t) => columns.push({ header: t, width: 32 }));
      const totalCols = columns.length;

      const dataSheet = workbook.addWorksheet("Data Mentah", {
        views: [{ state: "frozen", ySplit: 1 }],
      });

      const headerRow = dataSheet.getRow(1);
      columns.forEach((col, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = col.header;
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4F46E5" },
        };
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
        cell.border = borderThin();
        dataSheet.getColumn(i + 1).width = col.width;
      });
      headerRow.height = 30;

      targetResponses.forEach((r, idx) => {
        const row = dataSheet.getRow(idx + 2);
        row.getCell(1).value = idx + 1;
        row.getCell(2).value = r.surveyTitle;
        row.getCell(3).value = r.id || "-";
        row.getCell(4).value = window.UI.formatDate(r.submittedAt);

        // Petakan judul pertanyaan -> id pertanyaan milik survei asal respons ini
        const titleToId = {};
        (r.surveyQuestions || []).forEach((q) => {
          titleToId[q.title] = q.id;
        });

        questionTitles.forEach((title, qi) => {
          const cell = row.getCell(5 + qi);
          const qId = titleToId[title];
          const rawVal = qId ? (r.answers ? r.answers[qId] : null) : null;

          if (!qId) {
            cell.value = ""; // Survei ini memang tidak punya pertanyaan tersebut
          } else if (
            questionTypeByTitle[title] === "scale" &&
            rawVal !== null &&
            rawVal !== undefined &&
            rawVal !== ""
          ) {
            cell.value = Number(rawVal);
            cell.alignment = { horizontal: "center", vertical: "middle" };
          } else {
            cell.value =
              rawVal !== null && rawVal !== undefined && rawVal !== ""
                ? rawVal
                : "-";
            cell.alignment = {
              horizontal: "left",
              vertical: "middle",
              wrapText: true,
            };
          }
        });

        const isEven = idx % 2 === 1;
        row.eachCell({ includeEmpty: true }, (cell, colNum) => {
          cell.border = borderThin();
          if (colNum === 1 || colNum === 4)
            cell.alignment = { horizontal: "center", vertical: "middle" };
          if (isEven)
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF8FAFC" },
            };
        });
      });

      dataSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: totalCols },
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `SURVEICRM_Analisis_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      window.UI.showToast(
        "Laporan analisis Excel (.xlsx) berhasil diunduh!",
        "success",
      );
    } catch (err) {
      console.error("Gagal membuat file Excel:", err);
      window.UI.showToast(
        "Gagal membuat file Excel: " + err.message,
        "warning",
      );
    }
  });

  // Helper: border tipis standar untuk sel tabel Excel
  function borderThin() {
    const style = { style: "thin", color: { argb: "FFE2E8F0" } };
    return { top: style, left: style, bottom: style, right: style };
  }

  // =========================================================================
  // VIEW 2: KUESIONER SAYA (SURVEYS LIST)
  // =========================================================================
  function renderSurveysList() {
    surveysListContainer.innerHTML = "";

    if (loadedSurveys.length === 0) {
      surveysListContainer.innerHTML = `
        <div class="col-span-full bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
          <div class="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            📋
          </div>
          <h3 class="text-lg font-black text-slate-800 mb-1">Belum Ada Kuesioner</h3>
          <p class="text-xs text-slate-500 max-w-sm mx-auto mb-6">Mulai buat pertanyaan survei CRM Anda sekarang dengan bantuan studio live preview.</p>
          <button onclick="switchTab('builder')" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition">
            Buat Survei Sekarang
          </button>
        </div>
      `;
      return;
    }

    surveysListContainer.innerHTML = loadedSurveys
      .map((survey) => {
        const qCount = survey.questions ? survey.questions.length : 0;
        const rCount = (allResponsesMap[survey.id] || []).length;
        const dateStr = window.UI.formatDate(survey.createdAt);

        return `
        <div class="glass-card rounded-3xl p-6 shadow-sm hover-lift flex flex-col justify-between relative overflow-hidden group">
          <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

          <div>
            <div class="flex items-start justify-between gap-2 mb-3">
              <span class="text-[11px] font-bold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
                ${dateStr}
              </span>
              <span class="text-[11px] font-black px-2.5 py-1 rounded-full ${rCount > 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-500"}">
                ${rCount} Responden
              </span>
            </div>

            <h3 class="text-base font-black text-slate-900 line-clamp-2 mb-1.5 group-hover:text-indigo-600 transition">
              ${escapeHtml(survey.title)}
            </h3>

            <p class="text-xs text-slate-500 line-clamp-2 mb-4">
              ${survey.description ? escapeHtml(survey.description) : "Tidak ada deskripsi."}
            </p>

            <div class="flex items-center gap-3 text-xs text-slate-500 mb-5">
              <span class="flex items-center gap-1 font-bold bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                <svg class="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                ${qCount} Pertanyaan
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="space-y-2 pt-4 border-t border-slate-100">
            <div class="grid grid-cols-2 gap-2">
              <button 
                onclick="openFillSurveyModal('${survey.id}')"
                class="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 rounded-xl shadow-sm transition"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                Isi Survei
              </button>

              <a 
                href="results.html?id=${survey.id}"
                class="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                Hasil Detail
              </a>
            </div>

            <div class="flex items-center gap-1.5 pt-1">
              <button 
                onclick="copySurveyLink('${survey.id}')"
                class="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                Salin Link
              </button>

              <button 
                onclick="shareToWhatsApp('${escapeAttr(survey.title)}', '${survey.id}')"
                class="p-1.5 text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                title="Bagikan ke WhatsApp"
              >
                <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
              </button>

              <button 
                onclick="deleteSurveyConfirm('${survey.id}', '${escapeAttr(survey.title)}')"
                class="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-lg transition"
                title="Hapus"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          </div>
        </div>
      `;
      })
      .join("");
  }

  // =========================================================================
  // VIEW 3: STUDIO PEMBUAT SURVEI & LIVE SMARTPHONE PREVIEW
  // =========================================================================
  function renderBuilderQuestions() {
    questionsContainer.innerHTML = "";

    if (builderQuestions.length === 0) {
      questionsContainer.innerHTML = `
        <div class="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
          Belum ada butir pertanyaan. Tambahkan melalui tombol di bawah.
        </div>
      `;
      return;
    }

    builderQuestions.forEach((q, index) => {
      const qCard = document.createElement("div");
      qCard.className =
        "bg-slate-50/90 rounded-2xl border border-slate-200 p-4 space-y-3 relative";

      let typeBadge = "";
      if (q.type === "choice") {
        typeBadge =
          '<span class="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">Pilihan Ganda</span>';
      } else if (q.type === "scale") {
        typeBadge =
          '<span class="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">Skala 1–5</span>';
      } else {
        typeBadge =
          '<span class="text-[10px] font-bold px-2 py-0.5 bg-sky-100 text-sky-700 rounded-full">Teks Esai</span>';
      }

      let inner = `
        <div class="flex items-center justify-between pb-2 border-b border-slate-200">
          <div class="flex items-center gap-2">
            <span class="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
              ${index + 1}
            </span>
            ${typeBadge}
          </div>

          <div class="flex items-center gap-1">
            <button type="button" onclick="moveBuilderQ(${index}, -1)" ${index === 0 ? 'disabled class="p-1 text-slate-300"' : 'class="p-1 text-slate-400 hover:text-slate-600"'}>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg>
            </button>
            <button type="button" onclick="moveBuilderQ(${index}, 1)" ${index === builderQuestions.length - 1 ? 'disabled class="p-1 text-slate-300"' : 'class="p-1 text-slate-400 hover:text-slate-600"'}>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            <button type="button" onclick="deleteBuilderQ(${index})" class="p-1 text-slate-400 hover:text-rose-600 ml-1">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          </div>
        </div>

        <div>
          <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Pertanyaan *</label>
          <input 
            type="text" 
            value="${escapeAttr(q.title)}" 
            oninput="updateBuilderQTitle(${index}, this.value)"
            class="w-full px-3 py-2 bg-white text-xs font-bold text-slate-800 border border-slate-200 rounded-xl focus-glow"
            placeholder="Tulis butir pertanyaan..."
          >
        </div>
      `;

      if (q.type === "choice") {
        inner += `
          <div class="space-y-1.5 pt-1">
            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pilihan Opsi</label>
            ${(q.options || [])
              .map(
                (opt, optIdx) => `
              <div class="flex items-center gap-1.5">
                <span class="w-3 h-3 rounded-full border border-slate-300 shrink-0"></span>
                <input 
                  type="text" 
                  value="${escapeAttr(opt)}"
                  oninput="updateBuilderQOption(${index}, ${optIdx}, this.value)"
                  class="flex-1 px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus-glow"
                >
                <button type="button" onclick="deleteBuilderQOption(${index}, ${optIdx})" class="p-1 text-slate-400 hover:text-rose-500">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            `,
              )
              .join("")}
            <button type="button" onclick="addBuilderQOption(${index})" class="text-xs font-bold text-indigo-600 hover:text-indigo-800 pt-1 flex items-center gap-1">
              + Tambah Opsi
            </button>
          </div>
        `;
      } else if (q.type === "scale") {
        inner += `
          <div class="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label class="block text-[10px] font-semibold text-slate-400 mb-0.5">Label Nilai 1 (Min)</label>
              <input type="text" value="${escapeAttr(q.minLabel || "Sangat Tidak Puas")}" oninput="updateBuilderQScale(${index}, 'minLabel', this.value)" class="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg">
            </div>
            <div>
              <label class="block text-[10px] font-semibold text-slate-400 mb-0.5">Label Nilai 5 (Max)</label>
              <input type="text" value="${escapeAttr(q.maxLabel || "Sangat Puas")}" oninput="updateBuilderQScale(${index}, 'maxLabel', this.value)" class="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg">
            </div>
          </div>
        `;
      }

      inner += `
        <div class="pt-2 flex items-center justify-between border-t border-slate-200">
          <label class="inline-flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" ${q.required ? "checked" : ""} onchange="updateBuilderQRequired(${index}, this.checked)" class="w-3.5 h-3.5 text-indigo-600 rounded">
            <span class="text-xs font-bold text-slate-600">Wajib diisi responden</span>
          </label>
        </div>
      `;

      qCard.innerHTML = inner;
      questionsContainer.appendChild(qCard);
    });
  }

  // Update Live Smartphone Preview
  function updatePhonePreview() {
    const title = inputDashTitle.value.trim() || "Judul Survei Anda";
    const desc =
      inputDashDesc.value.trim() ||
      "Deskripsi atau petunjuk pengisian kuesioner Anda...";

    let html = `
      <!-- Phone Header -->
      <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
        <div class="flex items-center gap-1.5">
          <div class="w-5 h-5 rounded-md bg-indigo-600 text-white font-black text-[10px] flex items-center justify-center">S</div>
          <span class="font-black text-xs text-slate-900">SURVEI<span class="text-indigo-600">CRM</span></span>
        </div>
        <span class="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-full">Responden</span>
      </div>

      <!-- Survey Card Preview -->
      <div class="bg-white rounded-2xl p-3.5 shadow-sm border border-slate-200 mb-3 relative overflow-hidden">
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
        <h4 class="text-xs font-black text-slate-900 leading-snug mb-1">${escapeHtml(title)}</h4>
        <p class="text-[10px] text-slate-500 leading-relaxed">${escapeHtml(desc)}</p>
      </div>

      <!-- Questions Preview -->
      <div class="space-y-3">
    `;

    builderQuestions.forEach((q, idx) => {
      html += `
        <div class="bg-white rounded-2xl p-3 shadow-sm border border-slate-200 space-y-2">
          <div class="flex items-start gap-1.5">
            <span class="w-4 h-4 rounded-full bg-slate-100 text-slate-700 font-bold text-[9px] flex items-center justify-center shrink-0 mt-0.5">
              ${idx + 1}
            </span>
            <p class="text-[11px] font-bold text-slate-900 leading-tight">
              ${escapeHtml(q.title || "Pertanyaan nomor " + (idx + 1))}
              ${q.required ? '<span class="text-rose-500">*</span>' : ""}
            </p>
          </div>
      `;

      if (q.type === "choice") {
        html += `<div class="space-y-1 pt-1">`;
        (q.options || []).forEach((opt) => {
          html += `
            <div class="p-2 border border-slate-200 rounded-xl text-[10px] font-medium text-slate-700 flex items-center gap-1.5 bg-slate-50/50">
              <span class="w-2.5 h-2.5 rounded-full border border-slate-300"></span>
              <span>${escapeHtml(opt)}</span>
            </div>
          `;
        });
        html += `</div>`;
      } else if (q.type === "scale") {
        html += `
          <div class="pt-1 space-y-1">
            <div class="grid grid-cols-5 gap-1">
              ${[1, 2, 3, 4, 5]
                .map(
                  (n) => `
                <div class="py-1.5 text-center text-[10px] font-bold border border-slate-200 rounded-lg bg-white text-slate-700">
                  ${n}
                </div>
              `,
                )
                .join("")}
            </div>
            <div class="flex justify-between text-[8px] text-slate-400 px-0.5">
              <span>${escapeHtml(q.minLabel || "Min")}</span>
              <span>${escapeHtml(q.maxLabel || "Max")}</span>
            </div>
          </div>
        `;
      } else if (q.type === "text") {
        html += `
          <div class="pt-1">
            <div class="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-[9px] text-slate-400 italic">
              Ketik jawaban responden...
            </div>
          </div>
        `;
      }

      html += `</div>`;
    });

    html += `
      </div>

      <!-- Submit button preview -->
      <div class="pt-4">
        <div class="w-full py-2.5 bg-indigo-600 text-white font-bold text-[11px] rounded-xl text-center shadow-md">
          Kirim Jawaban Survei
        </div>
      </div>
    `;

    phonePreviewScreen.innerHTML = html;
  }

  // Builder Mutations
  inputDashTitle.addEventListener("input", updatePhonePreview);
  inputDashDesc.addEventListener("input", updatePhonePreview);

  window.updateBuilderQTitle = function (idx, val) {
    builderQuestions[idx].title = val;
    updatePhonePreview();
  };
  window.updateBuilderQRequired = function (idx, checked) {
    builderQuestions[idx].required = checked;
    updatePhonePreview();
  };
  window.updateBuilderQScale = function (idx, field, val) {
    builderQuestions[idx][field] = val;
    updatePhonePreview();
  };
  window.updateBuilderQOption = function (qIdx, optIdx, val) {
    builderQuestions[qIdx].options[optIdx] = val;
    updatePhonePreview();
  };
  window.addBuilderQOption = function (qIdx) {
    builderQuestions[qIdx].options.push(
      `Opsi ${builderQuestions[qIdx].options.length + 1}`,
    );
    renderBuilderQuestions();
    updatePhonePreview();
  };
  window.deleteBuilderQOption = function (qIdx, optIdx) {
    if (builderQuestions[qIdx].options.length <= 2) {
      window.UI.showToast("Minimal 2 opsi untuk pilihan ganda.", "warning");
      return;
    }
    builderQuestions[qIdx].options.splice(optIdx, 1);
    renderBuilderQuestions();
    updatePhonePreview();
  };
  window.deleteBuilderQ = function (idx) {
    builderQuestions.splice(idx, 1);
    renderBuilderQuestions();
    updatePhonePreview();
  };
  window.moveBuilderQ = function (idx, direction) {
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= builderQuestions.length) return;
    const temp = builderQuestions[idx];
    builderQuestions[idx] = builderQuestions[targetIdx];
    builderQuestions[targetIdx] = temp;
    renderBuilderQuestions();
    updatePhonePreview();
  };

  btnDashAddChoice.addEventListener("click", () => {
    builderQuestions.push({
      id: "q_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
      type: "choice",
      title: "",
      required: true,
      options: ["Opsi 1", "Opsi 2", "Opsi 3"],
    });
    renderBuilderQuestions();
    updatePhonePreview();
    window.UI.showToast("Pertanyaan Pilihan Ganda ditambahkan.", "success");
  });

  btnDashAddScale.addEventListener("click", () => {
    builderQuestions.push({
      id: "q_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
      type: "scale",
      title: "",
      required: true,
      minLabel: "Sangat Tidak Puas",
      maxLabel: "Sangat Puas",
    });
    renderBuilderQuestions();
    updatePhonePreview();
    window.UI.showToast("Pertanyaan Skala 1–5 ditambahkan.", "success");
  });

  btnDashAddText.addEventListener("click", () => {
    builderQuestions.push({
      id: "q_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5),
      type: "text",
      title: "",
      required: false,
    });
    renderBuilderQuestions();
    updatePhonePreview();
    window.UI.showToast("Pertanyaan Teks Esai ditambahkan.", "success");
  });

  btnResetBuilder.addEventListener("click", () => {
    if (confirm("Kosongkan formulir kuesioner ini?")) {
      inputDashTitle.value = "";
      inputDashDesc.value = "";
      builderQuestions = [];
      renderBuilderQuestions();
      updatePhonePreview();
    }
  });

  btnDashPublish.addEventListener("click", async () => {
    const title = inputDashTitle.value.trim();
    const description = inputDashDesc.value.trim();

    if (!title) {
      window.UI.showToast("Mohon isi Judul Survei terlebih dahulu!", "warning");
      inputDashTitle.focus();
      return;
    }

    if (builderQuestions.length === 0) {
      window.UI.showToast(
        "Kuesioner harus memiliki minimal 1 butir pertanyaan!",
        "warning",
      );
      return;
    }

    for (let i = 0; i < builderQuestions.length; i++) {
      const q = builderQuestions[i];
      if (!q.title || q.title.trim() === "") {
        window.UI.showToast(
          `Pertanyaan nomor ${i + 1} belum memiliki teks pertanyaan!`,
          "warning",
        );
        return;
      }
      if (q.type === "choice") {
        const validOpts = (q.options || []).filter((o) => o && o.trim() !== "");
        if (validOpts.length < 2) {
          window.UI.showToast(
            `Pertanyaan nomor ${i + 1} membutuhkan minimal 2 opsi pilihan!`,
            "warning",
          );
          return;
        }
      }
    }

    btnDashPublish.disabled = true;
    btnDashPublish.textContent = "Menyimpan...";

    try {
      const saved = await window.SurveyDB.saveSurvey({
        title,
        description,
        questions: builderQuestions,
      });

      const surveyUrl = window.UI.getSurveyUrl(saved.id);
      publishedTitle.textContent = saved.title;
      publishedUrlInput.value = surveyUrl;

      btnCopyPublished.onclick = () =>
        window.UI.copyToClipboard(surveyUrl, "Link survei disalin!");
      btnWhatsAppPublished.onclick = () =>
        window.UI.shareWhatsApp(saved.title, surveyUrl);

      modalSuccess.classList.remove("hidden");

      // Refresh data
      inputDashTitle.value = "";
      inputDashDesc.value = "";
      await loadAllInitialData();
    } catch (err) {
      console.error(err);
      window.UI.showToast("Gagal menyimpan: " + err.message, "error");
    } finally {
      btnDashPublish.disabled = false;
      btnDashPublish.textContent = "Simpan & Publikasikan Survei";
    }
  });

  // =========================================================================
  // MODAL ISI SURVEI LANGSUNG (ADMIN QUICK-FILLER)
  // =========================================================================
  window.openFillSurveyModal = function (surveyId) {
    const survey = loadedSurveys.find((s) => s.id === surveyId);
    if (!survey) {
      window.UI.showToast("Survei tidak ditemukan.", "error");
      return;
    }

    currentFillingSurvey = survey;
    currentFillingAnswers = {};

    fillTitle.textContent = survey.title;
    fillDesc.textContent =
      survey.description || "Silakan lengkapi pertanyaan berikut:";
    fillQuestionsContainer.innerHTML = "";

    const questions = survey.questions || [];
    questions.forEach((q, idx) => {
      const item = document.createElement("div");
      item.className =
        "p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2";

      let html = `
        <div class="flex items-start gap-2">
          <span class="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
            ${idx + 1}
          </span>
          <h5 class="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
            ${escapeHtml(q.title)}
            ${q.required ? '<span class="text-rose-500">*</span>' : ""}
          </h5>
        </div>
      `;

      if (q.type === "choice") {
        html += `<div class="space-y-1.5 pt-1">`;
        (q.options || []).forEach((opt) => {
          html += `
            <label class="flex items-center gap-2 p-2.5 border border-slate-200 bg-white rounded-xl hover:bg-indigo-50/50 cursor-pointer text-xs font-medium text-slate-700 transition">
              <input type="radio" name="modal_ans_${q.id}" value="${escapeAttr(opt)}" onchange="selectModalChoice('${q.id}', '${escapeAttr(opt)}')" class="w-3.5 h-3.5 text-indigo-600">
              <span>${escapeHtml(opt)}</span>
            </label>
          `;
        });
        html += `</div>`;
      } else if (q.type === "scale") {
        html += `
          <div class="pt-1 space-y-2">
            <div class="grid grid-cols-5 gap-2">
              ${[1, 2, 3, 4, 5]
                .map(
                  (num) => `
                <button type="button" data-modal-scale="${q.id}" data-val="${num}" onclick="selectModalScale('${q.id}', ${num}, this)" class="py-2.5 flex items-center justify-center border-2 border-slate-200 rounded-xl bg-white font-bold text-sm text-slate-700 hover:border-indigo-400 transition">
                  ${num}
                </button>
              `,
                )
                .join("")}
            </div>
            <div class="flex justify-between text-[10px] font-bold text-slate-400 px-1">
              <span>${escapeHtml(q.minLabel || "Min")}</span>
              <span>${escapeHtml(q.maxLabel || "Max")}</span>
            </div>
          </div>
        `;
      } else if (q.type === "text") {
        html += `
          <div class="pt-1">
            <textarea rows="2" placeholder="Ketik tanggapan Anda..." oninput="updateModalText('${q.id}', this.value)" class="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-xl focus-glow"></textarea>
          </div>
        `;
      }

      item.innerHTML = html;
      fillQuestionsContainer.appendChild(item);
    });

    modalFill.classList.remove("hidden");
  };

  window.selectModalChoice = function (qId, val) {
    currentFillingAnswers[qId] = val;
  };

  window.selectModalScale = function (qId, num, btn) {
    currentFillingAnswers[qId] = num.toString();
    const siblingBtns = document.querySelectorAll(
      `button[data-modal-scale="${qId}"]`,
    );
    siblingBtns.forEach((b) => {
      b.classList.remove("bg-indigo-600", "text-white", "border-indigo-600");
      b.classList.add("bg-white", "text-slate-700", "border-slate-200");
    });
    btn.classList.remove("bg-white", "text-slate-700", "border-slate-200");
    btn.classList.add("bg-indigo-600", "text-white", "border-indigo-600");
  };

  window.updateModalText = function (qId, val) {
    currentFillingAnswers[qId] = val.trim();
  };

  fillForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentFillingSurvey) return;

    btnSubmitFill.disabled = true;
    btnSubmitFill.textContent = "Mengirim...";

    try {
      await window.SurveyDB.submitResponse(
        currentFillingSurvey.id,
        currentFillingAnswers,
      );
      modalFill.classList.add("hidden");
      window.UI.showToast("Tanggapan berhasil disimpan!", "success");

      // Refresh analitik & survey cards
      await loadAllInitialData();
    } catch (err) {
      console.error(err);
      window.UI.showToast("Gagal: " + err.message, "error");
    } finally {
      btnSubmitFill.disabled = false;
      btnSubmitFill.textContent = "Kirim Jawaban Ini";
    }
  });

  function closeFillModal() {
    modalFill.classList.add("hidden");
    currentFillingSurvey = null;
    currentFillingAnswers = {};
  }
  btnCloseFill.addEventListener("click", closeFillModal);
  btnCancelFill.addEventListener("click", closeFillModal);

  // Close Publish Modal
  btnClosePublishModal.addEventListener("click", () => {
    modalSuccess.classList.add("hidden");
    switchTab("surveys");
  });

  // Action Helpers
  window.copySurveyLink = function (surveyId) {
    const url = window.UI.getSurveyUrl(surveyId);
    window.UI.copyToClipboard(url, "Link survei berhasil disalin!");
  };

  window.shareToWhatsApp = function (title, surveyId) {
    const url = window.UI.getSurveyUrl(surveyId);
    window.UI.shareWhatsApp(title, url);
  };

  window.deleteSurveyConfirm = async function (surveyId, title) {
    if (
      confirm(
        `Hapus kuesioner "${title}" beserta seluruh respons yang tersimpan?`,
      )
    ) {
      await window.SurveyDB.deleteSurvey(surveyId);
      window.UI.showToast("Survei berhasil dihapus.", "success");
      loadAllInitialData();
    }
  };

  // Firebase Config Modal
  function openConfigModal() {
    const cfg = window.SurveyDB.getConfig();
    inputApiKey.value = cfg.apiKey || "";
    inputProjectId.value = cfg.projectId || "";
    inputAuthDomain.value = cfg.authDomain || "";
    inputStorageBucket.value = cfg.storageBucket || "";
    inputAppId.value = cfg.appId || "";
    modalConfig.classList.remove("hidden");
  }
  function closeConfigModal() {
    modalConfig.classList.add("hidden");
  }
  btnOpenConfig.addEventListener("click", openConfigModal);
  btnCloseConfig.addEventListener("click", closeConfigModal);
  btnCancelConfig.addEventListener("click", closeConfigModal);

  formConfig.addEventListener("submit", (e) => {
    e.preventDefault();
    const newConfig = {
      apiKey: inputApiKey.value.trim(),
      projectId: inputProjectId.value.trim(),
      authDomain: inputAuthDomain.value.trim(),
      storageBucket: inputStorageBucket.value.trim(),
      messagingSenderId: "",
      appId: inputAppId.value.trim(),
    };
    if (!newConfig.projectId || !newConfig.apiKey) {
      window.UI.showToast("Lengkapi apiKey dan projectId!", "warning");
      return;
    }
    window.SurveyDB.saveConfig(newConfig);
    closeConfigModal();
    window.UI.showToast("Konfigurasi Firebase berhasil disimpan!", "success");
    setTimeout(() => window.location.reload(), 500);
  });

  btnResetDemo.addEventListener("click", () => {
    if (confirm("Beralih ke mode penyimpanan Demo (LocalStorage)?")) {
      window.SurveyDB.resetConfig();
      closeConfigModal();
      window.UI.showToast("Beralih ke Mode Demo (LocalStorage).", "success");
      setTimeout(() => window.location.reload(), 500);
    }
  });

  // Helpers
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
    return str.replace(/'/g, "\\'").replace(/"/g, "&quot;");
  }

  // Initial Boot
  loadAllInitialData();
});
