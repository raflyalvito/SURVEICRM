/**
 * SURVEICRM - Survey Builder Controller
 * Mengelola pembuatan survei kustom, penambahan berbagai tipe pertanyaan,
 * validasi form, dan penyimpanan ke Firebase Firestore.
 */

document.addEventListener('DOMContentLoaded', () => {
  const surveyTitleInput = document.getElementById('survey-title');
  const surveyDescInput = document.getElementById('survey-desc');
  const questionsListContainer = document.getElementById('questions-list');

  const btnAddChoice = document.getElementById('btn-add-choice');
  const btnAddScale = document.getElementById('btn-add-scale');
  const btnAddText = document.getElementById('btn-add-text');
  const btnPublishTop = document.getElementById('btn-publish-survey');
  const btnPublishBottom = document.getElementById('btn-publish-survey-bottom');

  // Modal Elements
  const modalSuccess = document.getElementById('modal-publish-success');
  const publishedTitle = document.getElementById('published-survey-title');
  const publishedUrlInput = document.getElementById('published-survey-url');
  const btnCopyPublished = document.getElementById('btn-copy-published-url');
  const btnWhatsAppPublished = document.getElementById('btn-whatsapp-published');
  const linkOpenPublished = document.getElementById('link-open-published');

  // State daftar pertanyaan
  let questions = [
    {
      id: 'q_' + Date.now() + '_1',
      type: 'scale',
      title: 'Seberapa puas Anda dengan kualitas produk / layanan kami secara keseluruhan?',
      required: true,
      minLabel: 'Sangat Tidak Puas',
      maxLabel: 'Sangat Puas'
    },
    {
      id: 'q_' + Date.now() + '_2',
      type: 'choice',
      title: 'Faktor apa yang paling mempengaruhi keputusan Anda dalam memilih layanan kami?',
      required: true,
      options: ['Kecepatan Pelayanan', 'Kualitas Produk', 'Keramahan Staf', 'Harga Terjangkau']
    },
    {
      id: 'q_' + Date.now() + '_3',
      type: 'text',
      title: 'Apa saran atau masukan Anda untuk peningkatan layanan kami ke depan?',
      required: false
    }
  ];

  // Render Seluruh Pertanyaan
  function renderQuestions() {
    questionsListContainer.innerHTML = '';

    if (questions.length === 0) {
      questionsListContainer.innerHTML = `
        <div class="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400">
          <p class="text-sm font-medium">Belum ada pertanyaan. Klik salah satu tombol di bawah untuk menambahkan pertanyaan.</p>
        </div>
      `;
      return;
    }

    questions.forEach((q, index) => {
      const qCard = document.createElement('div');
      qCard.className = 'bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative space-y-4';
      qCard.dataset.id = q.id;

      let typeBadge = '';
      if (q.type === 'choice') {
        typeBadge = '<span class="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">Pilihan Ganda</span>';
      } else if (q.type === 'scale') {
        typeBadge = '<span class="text-xs font-semibold px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-200">Skala Penilaian (1 - 5)</span>';
      } else {
        typeBadge = '<span class="text-xs font-semibold px-2.5 py-1 bg-sky-50 text-sky-700 rounded-full border border-sky-200">Teks Singkat</span>';
      }

      // Header Kartu Pertanyaan
      let innerHTML = `
        <div class="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
              ${index + 1}
            </span>
            ${typeBadge}
          </div>

          <div class="flex items-center gap-1">
            <button type="button" onclick="moveQuestion(${index}, -1)" ${index === 0 ? 'disabled class="p-1 text-slate-300 cursor-not-allowed"' : 'class="p-1 text-slate-400 hover:text-slate-600 rounded"'} title="Pindahkan ke atas">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg>
            </button>
            <button type="button" onclick="moveQuestion(${index}, 1)" ${index === questions.length - 1 ? 'disabled class="p-1 text-slate-300 cursor-not-allowed"' : 'class="p-1 text-slate-400 hover:text-slate-600 rounded"'} title="Pindahkan ke bawah">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            <button type="button" onclick="deleteQuestion(${index})" class="p-1 text-slate-400 hover:text-rose-600 rounded transition ml-1" title="Hapus Pertanyaan">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Pertanyaan / Kuesioner *</label>
          <input 
            type="text" 
            value="${escapeAttr(q.title)}" 
            onchange="updateQuestionTitle(${index}, this.value)"
            class="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-800 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="Tuliskan butir pertanyaan..."
          >
        </div>
      `;

      // Body Spesifik per Tipe
      if (q.type === 'choice') {
        innerHTML += `
          <div class="space-y-2 pt-1">
            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider">Opsi Pilihan Jawaban</label>
            <div class="space-y-2" id="options-container-${index}">
              ${q.options.map((opt, optIdx) => `
                <div class="flex items-center gap-2">
                  <span class="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0"></span>
                  <input 
                    type="text" 
                    value="${escapeAttr(opt)}"
                    onchange="updateOptionText(${index}, ${optIdx}, this.value)"
                    class="flex-1 px-3 py-1.5 text-xs sm:text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Teks opsi pilihan..."
                  >
                  <button type="button" onclick="deleteOption(${index}, ${optIdx})" class="p-1 text-slate-400 hover:text-rose-500" title="Hapus Opsi">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
              `).join('')}
            </div>
            <button 
              type="button" 
              onclick="addOption(${index})"
              class="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 pt-1"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
              Tambah Opsi Pilihan
            </button>
          </div>
        `;
      } else if (q.type === 'scale') {
        innerHTML += `
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1">Label Nilai 1 (Skala Terendah)</label>
              <input 
                type="text" 
                value="${escapeAttr(q.minLabel || 'Sangat Tidak Puas')}"
                onchange="updateScaleLabel(${index}, 'minLabel', this.value)"
                class="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                placeholder="Misal: Sangat Buruk / Sangat Tidak Puas"
              >
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1">Label Nilai 5 (Skala Tertinggi)</label>
              <input 
                type="text" 
                value="${escapeAttr(q.maxLabel || 'Sangat Puas')}"
                onchange="updateScaleLabel(${index}, 'maxLabel', this.value)"
                class="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                placeholder="Misal: Sangat Baik / Sangat Puas"
              >
            </div>
          </div>
          <div class="flex items-center justify-between max-w-xs mx-auto py-2 px-3 bg-slate-50 rounded-xl text-xs font-bold text-slate-600">
            <span>1</span>
            <span>2</span>
            <span>3</span>
            <span>4</span>
            <span>5</span>
          </div>
        `;
      } else if (q.type === 'text') {
        innerHTML += `
          <div class="pt-1">
            <div class="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400 italic">
              [Area teks jawaban responden akan muncul di sini saat kuesioner dibuka]
            </div>
          </div>
        `;
      }

      // Footer Kartu: Wajib Diisi Toggle
      innerHTML += `
        <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
          <label class="inline-flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              ${q.required ? 'checked' : ''}
              onchange="updateQuestionRequired(${index}, this.checked)"
              class="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            >
            <span class="text-xs font-semibold text-slate-600">Wajib diisi oleh responden</span>
          </label>
        </div>
      `;

      qCard.innerHTML = innerHTML;
      questionsListContainer.appendChild(qCard);
    });
  }

  // Mutasi State Pertanyaan
  window.updateQuestionTitle = function(index, value) {
    questions[index].title = value;
  };

  window.updateQuestionRequired = function(index, checked) {
    questions[index].required = checked;
  };

  window.updateScaleLabel = function(index, field, value) {
    questions[index][field] = value;
  };

  window.updateOptionText = function(qIndex, optIndex, value) {
    questions[qIndex].options[optIndex] = value;
  };

  window.addOption = function(qIndex) {
    const nextNum = questions[qIndex].options.length + 1;
    questions[qIndex].options.push(`Opsi ${nextNum}`);
    renderQuestions();
  };

  window.deleteOption = function(qIndex, optIndex) {
    if (questions[qIndex].options.length <= 2) {
      window.UI.showToast('Pertanyaan pilihan ganda minimal membutuhkan 2 opsi.', 'warning');
      return;
    }
    questions[qIndex].options.splice(optIndex, 1);
    renderQuestions();
  };

  window.deleteQuestion = function(index) {
    questions.splice(index, 1);
    renderQuestions();
  };

  window.moveQuestion = function(index, direction) {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    const temp = questions[index];
    questions[index] = questions[targetIdx];
    questions[targetIdx] = temp;
    renderQuestions();
  };

  // Tambah Pertanyaan Baru
  btnAddChoice.addEventListener('click', () => {
    questions.push({
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      type: 'choice',
      title: '',
      required: true,
      options: ['Opsi 1', 'Opsi 2', 'Opsi 3']
    });
    renderQuestions();
    window.UI.showToast('Pertanyaan Pilihan Ganda ditambahkan.', 'success');
  });

  btnAddScale.addEventListener('click', () => {
    questions.push({
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      type: 'scale',
      title: '',
      required: true,
      minLabel: 'Sangat Tidak Puas',
      maxLabel: 'Sangat Puas'
    });
    renderQuestions();
    window.UI.showToast('Pertanyaan Skala 1-5 ditambahkan.', 'success');
  });

  btnAddText.addEventListener('click', () => {
    questions.push({
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      type: 'text',
      title: '',
      required: false
    });
    renderQuestions();
    window.UI.showToast('Pertanyaan Teks Singkat ditambahkan.', 'success');
  });

  // Validasi & Simpan Survei
  async function handlePublish() {
    const title = surveyTitleInput.value.trim();
    const description = surveyDescInput.value.trim();

    if (!title) {
      window.UI.showToast('Mohon isi Judul Survei terlebih dahulu!', 'warning');
      surveyTitleInput.focus();
      return;
    }

    if (questions.length === 0) {
      window.UI.showToast('Survei harus memiliki minimal 1 pertanyaan!', 'warning');
      return;
    }

    // Validasi kelengkapan pertanyaan
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.title || q.title.trim() === '') {
        window.UI.showToast(`Pertanyaan nomor ${i + 1} belum memiliki teks pertanyaan!`, 'warning');
        return;
      }

      if (q.type === 'choice') {
        const validOptions = q.options.filter(opt => opt && opt.trim() !== '');
        if (validOptions.length < 2) {
          window.UI.showToast(`Pertanyaan nomor ${i + 1} harus memiliki minimal 2 opsi pilihan!`, 'warning');
          return;
        }
      }
    }

    // Disable button saat proses simpan
    btnPublishTop.disabled = true;
    btnPublishBottom.disabled = true;
    btnPublishTop.innerHTML = `
      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
      Menyimpan...
    `;

    try {
      const savedSurvey = await window.SurveyDB.saveSurvey({
        title,
        description,
        questions
      });

      const surveyUrl = window.UI.getSurveyUrl(savedSurvey.id);

      // Tampilkan Modal Sukses
      publishedTitle.textContent = savedSurvey.title;
      publishedUrlInput.value = surveyUrl;
      linkOpenPublished.href = `survey.html?id=${savedSurvey.id}`;

      btnCopyPublished.onclick = () => {
        window.UI.copyToClipboard(surveyUrl, 'Link survei berhasil disalin!');
      };

      btnWhatsAppPublished.onclick = () => {
        window.UI.shareWhatsApp(savedSurvey.title, surveyUrl);
      };

      modalSuccess.classList.remove('hidden');
    } catch (err) {
      console.error(err);
      window.UI.showToast('Gagal mempublikasikan survei: ' + err.message, 'error');
      btnPublishTop.disabled = false;
      btnPublishBottom.disabled = false;
      btnPublishTop.innerHTML = `
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
        Publikasikan Survei
      `;
    }
  }

  btnPublishTop.addEventListener('click', handlePublish);
  btnPublishBottom.addEventListener('click', handlePublish);

  function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/"/g, '&quot;');
  }

  // Render awal
  renderQuestions();
});
