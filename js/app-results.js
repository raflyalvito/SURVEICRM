/**
 * SURVEICRM - Survey Results & Analytics Controller
 * Mengelola kalkulasi statistik real-time, visualisasi persentase pilihan ganda,
 * rata-rata skor skala CRM, feed komentar esai, dan ekspor CSV untuk Excel.
 */

document.addEventListener("DOMContentLoaded", async () => {
  const loadingEl = document.getElementById("results-loading");
  const errorEl = document.getElementById("results-error");
  const errorMsgEl = document.getElementById("results-error-msg");
  const contentEl = document.getElementById("results-content");

  const titleEl = document.getElementById("survey-title-display");
  const descEl = document.getElementById("survey-desc-display");
  const createdBadge = document.getElementById("badge-created-date");
  const respondentCountEl = document.getElementById("stat-respondent-count");
  const lastResponseEl = document.getElementById("stat-last-response");

  const btnExportCsv = document.getElementById("btn-export-csv");
  const btnCopyLink = document.getElementById("btn-copy-link");
  const btnCopyLinkTop = document.getElementById("btn-copy-link-top");
  const btnShareWa = document.getElementById("btn-share-wa");
  const linkTestSurvey = document.getElementById("link-test-survey");

  const questionsContainer = document.getElementById(
    "questions-analysis-container",
  );
  const rawTbody = document.getElementById("raw-responses-tbody");

  // Ambil ID Survei dari URL
  const urlParams = new URLSearchParams(window.location.search);
  let surveyId = urlParams.get("id");

  let survey = null;
  let currentResponses = [];

  try {
    // Jika dibuka langsung tanpa ?id=..., otomatis ambil survei aktif pertama
    if (!surveyId) {
      const allSurveys = await window.SurveyDB.getSurveys();
      if (allSurveys && allSurveys.length > 0) {
        surveyId = allSurveys[0].id;
      } else {
        surveyId = "srv_contoh_crm";
      }
    }

    survey = await window.SurveyDB.getSurveyById(surveyId);

    if (!survey) {
      const fallbackList = await window.SurveyDB.getSurveys();
      if (fallbackList && fallbackList.length > 0) {
        survey = fallbackList[0];
        surveyId = survey.id;
      }
    }

    if (!survey) {
      loadingEl.classList.add("hidden");
      errorMsgEl.textContent = "Belum ada data survei di database.";
      errorEl.classList.remove("hidden");
      return;
    }

    // Set Info Dasar
    document.title = `Hasil: ${survey.title} - SURVEICRM`;
    titleEl.textContent = survey.title;
    descEl.textContent = survey.description || "Tidak ada deskripsi.";
    createdBadge.textContent =
      "Dibuat: " + window.UI.formatDate(survey.createdAt);

    const surveyUrl = window.UI.getSurveyUrl(survey.id);
    linkTestSurvey.href = `survey.html?id=${survey.id}`;

    // Setup Event Copy & Share
    const handleCopy = () => {
      window.UI.copyToClipboard(
        surveyUrl,
        "Link survei responden berhasil disalin!",
      );
    };
    btnCopyLink.addEventListener("click", handleCopy);
    btnCopyLinkTop.addEventListener("click", handleCopy);

    btnShareWa.addEventListener("click", () => {
      window.UI.shareWhatsApp(survey.title, surveyUrl);
    });

    // Mulai dengarkan data respon secara Real-Time
    window.SurveyDB.listenResponses(surveyId, (responses) => {
      currentResponses = responses || [];
      renderAnalytics(survey, currentResponses);
      renderRawTable(survey, currentResponses);

      loadingEl.classList.add("hidden");
      contentEl.classList.remove("hidden");
    });
  } catch (err) {
    console.error(err);
    loadingEl.classList.add("hidden");
    errorMsgEl.textContent =
      "Terjadi kesalahan saat memuat hasil: " + err.message;
    errorEl.classList.remove("hidden");
  }

  // Render Visualisasi & Analisis Tiap Pertanyaan
  function renderAnalytics(survey, responses) {
    const totalResp = responses.length;
    respondentCountEl.textContent = totalResp;

    if (totalResp > 0) {
      const latest = responses[0]; // Terurut descending
      lastResponseEl.textContent =
        "Terakhir diisi: " + window.UI.formatDate(latest.submittedAt);
    } else {
      lastResponseEl.textContent = "Belum ada responden";
    }

    const questions = survey.questions || [];
    questionsContainer.innerHTML = "";

    if (questions.length === 0) {
      questionsContainer.innerHTML = `
        <div class="bg-white p-6 rounded-2xl border border-slate-200 text-center text-slate-400">
          Survei ini tidak memiliki pertanyaan.
        </div>
      `;
      return;
    }

    questions.forEach((q, index) => {
      const card = document.createElement("div");
      card.className =
        "bg-white rounded-2xl border border-slate-200 p-6 space-y-4";

      // Header Pertanyaan
      let cardHtml = `
        <div class="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
          <div class="flex items-start gap-2.5">
            <span class="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
              ${index + 1}
            </span>
            <div>
              <h3 class="text-[15px] font-semibold text-slate-900 leading-snug">${escapeHtml(q.title)}</h3>
              <span class="text-xs text-slate-400">${getQuestionTypeLabel(q.type)}</span>
            </div>
          </div>
        </div>
      `;

      // Jika belum ada respon sama sekali
      if (totalResp === 0) {
        cardHtml += `
          <div class="py-6 text-center text-xs text-slate-400">
            Belum ada jawaban dari responden untuk pertanyaan ini.
          </div>
        `;
        card.innerHTML = cardHtml;
        questionsContainer.appendChild(card);
        return;
      }

      // 1. Tipe PILIHAN GANDA
      if (q.type === "choice") {
        const counts = {};
        const options = q.options || [];
        options.forEach((opt) => (counts[opt] = 0));

        let answeredCount = 0;
        responses.forEach((r) => {
          const ans = r.answers ? r.answers[q.id] : null;
          if (ans) {
            counts[ans] = (counts[ans] || 0) + 1;
            answeredCount++;
          }
        });

        cardHtml += `
          <div class="space-y-3.5 pt-2">
            ${options
              .map((opt, i) => {
                const count = counts[opt] || 0;
                const pct =
                  answeredCount > 0
                    ? Math.round((count / answeredCount) * 100)
                    : 0;
                // Satu keluarga warna (indigo) dengan intensitas menurun, bukan warna acak per opsi
                const shades = [
                  "bg-indigo-600",
                  "bg-indigo-500",
                  "bg-indigo-400",
                  "bg-indigo-300",
                  "bg-indigo-200",
                ];
                const barClass = shades[i % shades.length];

                return `
                <div class="space-y-1.5">
                  <div class="flex justify-between text-sm font-medium text-slate-700">
                    <span>${escapeHtml(opt)}</span>
                    <span class="text-indigo-600 font-semibold">${pct}% <span class="font-normal text-slate-400">(${count} suara)</span></span>
                  </div>
                  <div class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div class="${barClass} h-full rounded-full progress-bar-fill" style="width: 0%" data-target-width="${pct}"></div>
                  </div>
                </div>
              `;
              })
              .join("")}
          </div>
        `;

        // Tampilkan jawaban pertanyaan lanjutan (follow-up) yang menempel ke tiap opsi
        if (q.followUps) {
          Object.keys(q.followUps).forEach((optIdxKey) => {
            const fu = q.followUps[optIdxKey];
            if (!fu || !fu.title) return;
            const optionText = options[optIdxKey];

            const fuAnswers = responses
              .filter(
                (r) =>
                  r.answers &&
                  r.answers[q.id] === optionText &&
                  r.answers[fu.id],
              )
              .map((r) => ({ text: r.answers[fu.id], time: r.submittedAt }));

            cardHtml += `
              <div class="mt-4 pl-4 border-l-2 border-indigo-200 space-y-2.5">
                <p class="text-xs font-bold text-indigo-600">
                  Pertanyaan lanjutan (muncul jika pilih "${escapeHtml(optionText)}"): ${escapeHtml(fu.title)}
                </p>
                ${
                  fuAnswers.length === 0
                    ? `
                  <div class="text-xs text-slate-400 py-1">Belum ada jawaban untuk pertanyaan lanjutan ini.</div>
                `
                    : `
                  <div class="space-y-2 max-h-60 overflow-y-auto pr-1">
                    ${fuAnswers
                      .map(
                        (ans) => `
                      <div class="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-xs">
                        <p class="text-slate-800 leading-relaxed">${escapeHtml(ans.text)}</p>
                        <span class="text-[10px] text-slate-400 block mt-1">${window.UI.formatDate(ans.time)}</span>
                      </div>
                    `,
                      )
                      .join("")}
                  </div>
                `
                }
              </div>
            `;
          });
        }
      }
      // 2. Tipe SKALA PENILAIAN (1 - 5)
      else if (q.type === "scale") {
        let totalScore = 0;
        let countScored = 0;
        const scaleCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        responses.forEach((r) => {
          const ans = r.answers ? r.answers[q.id] : null;
          if (ans) {
            const num = parseInt(ans, 10);
            if (num >= 1 && num <= 5) {
              totalScore += num;
              countScored++;
              scaleCounts[num] = (scaleCounts[num] || 0) + 1;
            }
          }
        });

        const avg = countScored > 0 ? (totalScore / countScored).toFixed(1) : 0;
        let interpretation = "Belum cukup data";
        let badgeColor = "bg-slate-100 text-slate-700 border-slate-200";

        if (countScored > 0) {
          if (avg >= 4.5) {
            interpretation = "Sangat Tinggi / Sangat Puas";
            badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
          } else if (avg >= 3.5) {
            interpretation = "Baik / Puas";
            badgeColor = "bg-indigo-50 text-indigo-700 border-indigo-200";
          } else if (avg >= 2.5) {
            interpretation = "Cukup / Netral";
            badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
          } else {
            interpretation = "Rendah / Kurang Puas";
            badgeColor = "bg-rose-50 text-rose-700 border-rose-200";
          }
        }

        cardHtml += `
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 items-center">
            <!-- Box Rata-rata -->
            <div class="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-center">
              <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Skor Rata-Rata</span>
              <div class="text-4xl font-extrabold text-indigo-600 my-1">${avg} <span class="text-sm font-semibold text-slate-400">/ 5.0</span></div>
              <span class="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeColor}">
                ${interpretation}
              </span>
            </div>

            <!-- Distribusi Skala 1-5 -->
            <div class="sm:col-span-2 space-y-2">
              ${[5, 4, 3, 2, 1]
                .map((num) => {
                  const c = scaleCounts[num] || 0;
                  const pct =
                    countScored > 0 ? Math.round((c / countScored) * 100) : 0;
                  return `
                  <div class="flex items-center gap-2 text-xs">
                    <span class="w-12 font-semibold text-slate-600 text-right">Skala ${num}</span>
                    <div class="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div class="bg-indigo-500 h-2.5 rounded-full progress-bar-fill" style="width: 0%" data-target-width="${pct}"></div>
                    </div>
                    <span class="w-14 text-slate-400 text-right">${c} (${pct}%)</span>
                  </div>
                `;
                })
                .join("")}
              <div class="flex justify-between text-[11px] text-slate-400 pt-1 font-medium">
                <span>Min: ${escapeHtml(q.minLabel || "1 - Sangat Tidak Puas")}</span>
                <span>Max: ${escapeHtml(q.maxLabel || "5 - Sangat Puas")}</span>
              </div>
            </div>
          </div>
        `;
      }
      // 3. Tipe TEKS SINGKAT / ESAI
      else if (q.type === "text") {
        const textAnswers = responses
          .map((r) => ({
            text: r.answers ? r.answers[q.id] : "",
            time: r.submittedAt,
          }))
          .filter((a) => a.text && a.text.trim() !== "");

        if (textAnswers.length === 0) {
          cardHtml += `
            <div class="py-4 text-center text-xs text-slate-400">
              Belum ada masukan teks dari responden.
            </div>
          `;
        } else {
          cardHtml += `
            <div class="space-y-2.5 pt-1 max-h-72 overflow-y-auto pr-1">
              ${textAnswers
                .map(
                  (ans) => `
                <div class="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs">
                  <p class="text-slate-800 leading-relaxed">${escapeHtml(ans.text)}</p>
                  <span class="text-[10px] text-slate-400 font-medium block mt-1.5">${window.UI.formatDate(ans.time)}</span>
                </div>
              `,
                )
                .join("")}
            </div>
          `;
        }
      }

      card.innerHTML = cardHtml;
      questionsContainer.appendChild(card);
    });

    animateProgressBars();
  }

  // Memicu transisi lebar bar dari 0% ke nilai target sekali saat render (bukan tiap hover)
  function animateProgressBars() {
    const bars = questionsContainer.querySelectorAll(
      ".progress-bar-fill[data-target-width]",
    );
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bars.forEach((bar) => {
          bar.style.width = bar.getAttribute("data-target-width") + "%";
        });
      });
    });
  }

  // Render Tabel Log Respon Mentah
  function renderRawTable(survey, responses) {
    rawTbody.innerHTML = "";

    if (responses.length === 0) {
      rawTbody.innerHTML = `
        <tr>
          <td colspan="4" class="py-8 text-center text-slate-400">
            Belum ada tanggapan responden yang tercatat.
          </td>
        </tr>
      `;
      return;
    }

    const questions = survey.questions || [];

    responses.forEach((r, idx) => {
      const row = document.createElement("tr");
      row.className = "hover:bg-slate-50/80 transition";

      // Ringkasan jawaban singkat
      const summaryParts = [];
      questions.forEach((q, qIdx) => {
        const val = r.answers ? r.answers[q.id] : null;
        if (val) {
          summaryParts.push(`<b>Q${qIdx + 1}:</b> ${escapeHtml(val)}`);
        }
        // Sertakan jawaban pertanyaan lanjutan (follow-up) kalau ada & relevan
        if (q.type === "choice" && q.followUps && val) {
          const selectedIdx = (q.options || []).indexOf(val);
          const fu = q.followUps[selectedIdx];
          if (fu && r.answers && r.answers[fu.id]) {
            summaryParts.push(
              `<b>↳ ${escapeHtml(fu.title)}:</b> ${escapeHtml(r.answers[fu.id])}`,
            );
          }
        }
      });

      row.innerHTML = `
        <td class="py-3 px-4 font-semibold text-slate-900">${idx + 1}</td>
        <td class="py-3 px-4 font-mono text-slate-500">${r.id ? r.id.substring(0, 12) + "..." : "-"}</td>
        <td class="py-3 px-4 text-slate-500">${window.UI.formatDate(r.submittedAt)}</td>
        <td class="py-3 px-4 max-w-md truncate text-slate-700">${summaryParts.join(" &bull; ") || "-"}</td>
      `;

      rawTbody.appendChild(row);
    });
  }

  // Helper Label Tipe Pertanyaan
  function getQuestionTypeLabel(type) {
    if (type === "choice") return "Pilihan Ganda";
    if (type === "scale") return "Skala Penilaian (1 - 5)";
    if (type === "text") return "Teks Singkat / Esai";
    return "Pertanyaan";
  }

  // Helper Ekspor Data ke File Excel (.xlsx) asli, dengan format rapi (header berwarna,
  // lebar kolom otomatis, border, baris selang-seling, header dibekukan, dan filter).
  btnExportCsv.addEventListener("click", async () => {
    if (!survey || currentResponses.length === 0) {
      window.UI.showToast(
        "Belum ada data responden untuk diekspor!",
        "warning",
      );
      return;
    }

    if (typeof ExcelJS === "undefined") {
      window.UI.showToast(
        "Library ExcelJS gagal dimuat. Cek koneksi internet lalu coba lagi.",
        "warning",
      );
      return;
    }

    try {
      const questions = survey.questions || [];

      // Susunan kolom: No, ID Responden, Waktu Pengisian, lalu satu kolom per pertanyaan
      // (plus kolom tambahan untuk tiap pertanyaan lanjutan/follow-up, ditaruh tepat setelah induknya)
      const columns = [
        {
          header: "No",
          width: 6,
          isNumber: true,
          getValue: (r, idx) => idx + 1,
        },
        { header: "ID Responden", width: 22, getValue: (r) => r.id || "-" },
        {
          header: "Waktu Pengisian",
          width: 20,
          getValue: (r) => window.UI.formatDate(r.submittedAt),
        },
      ];

      questions.forEach((q, i) => {
        columns.push({
          header: `Q${i + 1}: ${q.title}`,
          width: 32,
          isScaleNumber: q.type === "scale",
          getValue: (r) => (r.answers ? r.answers[q.id] : null),
        });

        // Kolom tambahan untuk tiap pertanyaan lanjutan yang menempel di opsi pertanyaan ini
        if (q.type === "choice" && q.followUps) {
          Object.keys(q.followUps).forEach((optIdxKey) => {
            const fu = q.followUps[optIdxKey];
            if (!fu || !fu.title) return;
            const optionText = (q.options || [])[optIdxKey] || "";
            columns.push({
              header: `Q${i + 1} - Lanjutan (jika "${optionText}"): ${fu.title}`,
              width: 34,
              getValue: (r) => (r.answers ? r.answers[fu.id] : null),
            });
          });
        }
      });

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "SURVEICRM";
      workbook.created = new Date();

      const sheet = workbook.addWorksheet("Hasil Survei", {
        views: [{ state: "frozen", ySplit: 4 }], // Bekukan baris judul kolom
      });

      const totalCols = columns.length;

      // Baris 1: Judul survei (merge selebar tabel)
      sheet.mergeCells(1, 1, 1, totalCols);
      const titleCell = sheet.getCell(1, 1);
      titleCell.value = survey.title;
      titleCell.font = { bold: true, size: 14, color: { argb: "FF1E1B4B" } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      sheet.getRow(1).height = 26;

      // Baris 2: Deskripsi survei
      sheet.mergeCells(2, 1, 2, totalCols);
      const descCell = sheet.getCell(2, 1);
      descCell.value = survey.description || "";
      descCell.font = { italic: true, size: 10, color: { argb: "FF64748B" } };
      descCell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      sheet.getRow(2).height = 20;

      // Baris 3: kosong (spasi)
      sheet.getRow(3).height = 6;

      // Baris 4: Header tabel
      const headerRowIndex = 4;
      const headerRow = sheet.getRow(headerRowIndex);
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
        sheet.getColumn(i + 1).width = col.width;
      });
      headerRow.height = 28;

      // Baris data
      currentResponses.forEach((r, idx) => {
        const rowIndex = headerRowIndex + 1 + idx;
        const row = sheet.getRow(rowIndex);

        columns.forEach((col, colIdx) => {
          const cell = row.getCell(colIdx + 1);
          const rawVal = col.getValue(r, idx);

          if (
            (col.isNumber || col.isScaleNumber) &&
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
                : colIdx < 3
                  ? rawVal || "-"
                  : "-";
            cell.alignment = {
              horizontal: colIdx < 3 ? "center" : "left",
              vertical: "middle",
              wrapText: true,
            };
          }
        });

        // Border + baris selang-seling agar mudah dibaca
        const isEven = idx % 2 === 1;
        row.eachCell({ includeEmpty: true }, (cell, colNum) => {
          cell.border = borderThin();
          if (colNum === 1 || colNum === 3) {
            cell.alignment = { horizontal: "center", vertical: "middle" };
          }
          if (isEven) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF8FAFC" },
            };
          }
        });
      });

      // Aktifkan filter otomatis pada baris header
      sheet.autoFilter = {
        from: { row: headerRowIndex, column: 1 },
        to: { row: headerRowIndex, column: totalCols },
      };

      // Generate & unduh file .xlsx
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);

      const safeTitle = survey.title
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .substring(0, 30);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `SURVEICRM_${safeTitle}_${Date.now()}.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      window.UI.showToast("File Excel (.xlsx) berhasil diunduh!", "success");
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
});
