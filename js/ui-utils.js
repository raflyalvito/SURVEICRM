/**
 * SURVEICRM - Shared UI Utilities
 * Notifikasi Toast, Clipboard Helper, WhatsApp Share Generator, dan URL Resolver
 */

window.UI = {
  // Tampilkan notifikasi Toast mengambang di bawah
  showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const isSuccess = type === 'success';
    const isError = type === 'error';
    const isWarning = type === 'warning';

    let bgClass = 'bg-slate-900 text-white border-slate-700';
    let icon = `
      <svg class="w-5 h-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
    `;

    if (isError) {
      bgClass = 'bg-red-900 text-white border-red-700';
      icon = `
        <svg class="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      `;
    } else if (isWarning) {
      bgClass = 'bg-amber-900 text-white border-amber-700';
      icon = `
        <svg class="w-5 h-5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
      `;
    }

    toast.className = `${bgClass} border rounded-xl shadow-xl px-4 py-3 flex items-center gap-3 text-sm font-medium toast-enter pointer-events-auto`;
    toast.innerHTML = `
      ${icon}
      <span class="flex-1">${message}</span>
      <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-white transition">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  },

  // Salin teks ke Clipboard dengan penanganan fallback
  async copyToClipboard(text, successMsg = 'Tautan berhasil disalin ke clipboard!') {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback untuk non-https / file protocol
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      this.showToast(successMsg, 'success');
      return true;
    } catch (err) {
      console.error('Gagal menyalin:', err);
      prompt('Salin link ini secara manual:', text);
      return false;
    }
  },

  // Dapatkan URL absolut untuk halaman responden
  getSurveyUrl(surveyId) {
    const loc = window.location;
    // Dapatkan path direktori saat ini
    const pathParts = loc.pathname.split('/');
    pathParts.pop(); // Hapus nama file (misal index.html)
    const basePath = pathParts.join('/');
    
    // Bentuk URL lengkap
    return `${loc.origin}${basePath}/survey.html?id=${encodeURIComponent(surveyId)}`;
  },

  // Buka WhatsApp untuk membagikan tautan survei
  shareWhatsApp(surveyTitle, surveyUrl) {
    const message = `Halo! Mohon kesediaan waktunya sebentar untuk mengisi *${surveyTitle}* untuk keperluan tugas mata kuliah CRM:\n\n👉 ${surveyUrl}\n\nPengisian survei hanya membutuhkan waktu 1-2 menit dan tanpa perlu login. Terima kasih banyak atas bantuannya!`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  },

  // Format tanggal ramah pengguna (misal: "19 Sep 2026, 09:30")
  formatDate(isoString) {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      return isoString;
    }
  }
};
