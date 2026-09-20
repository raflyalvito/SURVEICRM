/**
 * SURVEICRM - Firebase Configuration & Database Layer
 * Mendukung Firebase Firestore v10 (compat CDN) dengan fallback otomatis ke LocalStorage jika belum dikonfigurasi.
 */

// Default Firebase Configuration (bisa diisi langsung di sini atau melalui UI Pengaturan)
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBU6Df60Sf8Ju9yimDHQWk2qrQxHwi2FWw",
  authDomain: "survei-tugas-crm.firebaseapp.com",
  projectId: "survei-tugas-crm",
  storageBucket: "survei-tugas-crm.firebasestorage.app",
  messagingSenderId: "398050521143",
  appId: "1:398050521143:web:bc048c0d19fe47916c8fb2",
};

const STORAGE_KEY_FIREBASE_CONFIG = "surveicrm_firebase_config";
const STORAGE_KEY_LOCAL_SURVEYS = "surveicrm_local_surveys";
const STORAGE_KEY_LOCAL_RESPONSES = "surveicrm_local_responses";

class SurveyDBLayer {
  constructor() {
    this.db = null;
    this.firebaseApp = null;
    this.isFirebaseActive = false;
    this.listeners = new Map();
    this.init();
  }

  // Ambil konfigurasi tersimpan (dari localStorage atau hardcoded default)
  getConfig() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.projectId && parsed.projectId.trim() !== "") {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Gagal membaca konfigurasi Firebase dari localStorage:", e);
    }
    return DEFAULT_FIREBASE_CONFIG;
  }

  // Simpan konfigurasi baru ke localStorage
  saveConfig(newConfig) {
    localStorage.setItem(
      STORAGE_KEY_FIREBASE_CONFIG,
      JSON.stringify(newConfig),
    );
    return this.init();
  }

  // Reset konfigurasi ke mode demo / local
  resetConfig() {
    localStorage.removeItem(STORAGE_KEY_FIREBASE_CONFIG);
    this.isFirebaseActive = false;
    this.db = null;
    this.firebaseApp = null;
    return true;
  }

  // Cek apakah konfigurasi Firebase terpasang valid
  isConfigured() {
    const config = this.getConfig();
    return !!(
      config &&
      config.projectId &&
      config.projectId.trim() !== "" &&
      config.apiKey &&
      config.apiKey.trim() !== ""
    );
  }

  // Inisialisasi Firebase
  init() {
    const config = this.getConfig();
    if (this.isConfigured() && typeof firebase !== "undefined") {
      try {
        if (!firebase.apps.length) {
          this.firebaseApp = firebase.initializeApp(config);
        } else {
          this.firebaseApp = firebase.app();
        }
        this.db = firebase.firestore();
        this.isFirebaseActive = true;
        console.log(
          "SURVEICRM: Terhubung ke Firebase Firestore (" +
            config.projectId +
            ")",
        );
        return true;
      } catch (err) {
        console.error(
          "SURVEICRM: Gagal inisialisasi Firebase Firestore, beralih ke Mode Demo (LocalStorage):",
          err,
        );
        this.isFirebaseActive = false;
        this.db = null;
        return false;
      }
    } else {
      console.log(
        "SURVEICRM: Firebase belum dikonfigurasi. Menggunakan Mode Demo (LocalStorage).",
      );
      this.isFirebaseActive = false;
      this.db = null;
      return false;
    }
  }

  // ==========================================
  // METODE CRUD SURVEI
  // ==========================================

  // Simpan Survei Baru
  async saveSurvey(surveyData) {
    const surveyId =
      "srv_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    const nowIso = new Date().toISOString();

    const newSurvey = {
      id: surveyId,
      title: surveyData.title || "Survei Tanpa Judul",
      description: surveyData.description || "",
      questions: surveyData.questions || [],
      // Survei baru langsung dapat diisi. Survei lama tanpa field ini juga
      // diperlakukan aktif agar kompatibel dengan data yang sudah ada.
      isActive: surveyData.isActive !== false,
      createdAt: nowIso,
      updatedAt: nowIso,
      responseCount: 0,
    };

    if (this.isFirebaseActive && this.db) {
      try {
        await this.db.collection("surveys").doc(surveyId).set(newSurvey);
        return newSurvey;
      } catch (err) {
        console.error(
          "Error menyimpan survei ke Firestore, menyimpan ke local:",
          err,
        );
      }
    }

    // Fallback: LocalStorage
    const surveys = this._getLocalSurveys();
    surveys.unshift(newSurvey);
    this._saveLocalSurveys(surveys);
    return newSurvey;
  }

  // Ambil Semua Survei (untuk Dashboard Admin)
  async getSurveys() {
    if (this.isFirebaseActive && this.db) {
      try {
        const snapshot = await this.db
          .collection("surveys")
          .orderBy("createdAt", "desc")
          .get();
        const list = [];
        for (const doc of snapshot.docs) {
          const data = doc.data();
          data.id = doc.id;

          // Hitung jumlah respons real-time jika belum di-cache
          try {
            const respSnapshot = await this.db
              .collection("surveys")
              .doc(doc.id)
              .collection("responses")
              .get();
            data.responseCount = respSnapshot.size;
          } catch (e) {
            data.responseCount = data.responseCount || 0;
          }

          list.push(data);
        }
        return list;
      } catch (err) {
        console.error(
          "Error mengambil survei dari Firestore, membaca dari local:",
          err,
        );
      }
    }

    // Fallback: LocalStorage
    const surveys = this._getLocalSurveys();
    const responses = this._getLocalResponses();
    return surveys.map((s) => {
      const sResp = responses.filter((r) => r.surveyId === s.id);
      return { ...s, responseCount: sResp.length };
    });
  }

  // Ambil 1 Survei berdasarkan ID
  async getSurveyById(surveyId) {
    if (!surveyId) return null;

    if (this.isFirebaseActive && this.db) {
      try {
        const doc = await this.db.collection("surveys").doc(surveyId).get();
        if (doc.exists) {
          const data = doc.data();
          data.id = doc.id;
          return data;
        }
      } catch (err) {
        console.error("Error mengambil survei by ID dari Firestore:", err);
      }
    }

    // Fallback: LocalStorage
    const surveys = this._getLocalSurveys();
    return surveys.find((s) => s.id === surveyId) || null;
  }

  // Dokumen admin dibuat dari Firebase Console agar pengguna tidak dapat
  // meningkatkan aksesnya sendiri dari aplikasi.
  async getAdminProfile(uid) {
    if (!uid || !this.isFirebaseActive || !this.db) return null;

    const adminDoc = await this.db.collection("admins").doc(uid).get();
    return adminDoc.exists ? adminDoc.data() : null;
  }

  // Ubah ketersediaan survei untuk responden.
  async setSurveyActive(surveyId, isActive) {
    const nowIso = new Date().toISOString();

    if (this.isFirebaseActive && this.db) {
      try {
        await this.db.collection("surveys").doc(surveyId).update({
          isActive: Boolean(isActive),
          updatedAt: nowIso,
        });
        return { id: surveyId, isActive: Boolean(isActive), updatedAt: nowIso };
      } catch (err) {
        console.error("Error mengubah status survei di Firestore:", err);
        throw err;
      }
    }

    const surveys = this._getLocalSurveys();
    const survey = surveys.find((s) => s.id === surveyId);
    if (!survey) throw new Error("Survei tidak ditemukan.");

    survey.isActive = Boolean(isActive);
    survey.updatedAt = nowIso;
    this._saveLocalSurveys(surveys);
    return survey;
  }

  // Hapus Survei
  async deleteSurvey(surveyId) {
    if (this.isFirebaseActive && this.db) {
      const surveyRef = this.db.collection("surveys").doc(surveyId);

      try {
        // Firestore tidak menghapus subcollection secara otomatis. Hapus
        // respons terlebih dahulu dalam batch maksimal 500 operasi.
        const respSnap = await surveyRef.collection("responses").get();
        for (let index = 0; index < respSnap.docs.length; index += 500) {
          const batch = this.db.batch();
          respSnap.docs
            .slice(index, index + 500)
            .forEach((responseDoc) => batch.delete(responseDoc.ref));
          await batch.commit();
        }

        await surveyRef.delete();
      } catch (err) {
        console.error("Error menghapus survei dari Firestore:", err);
        // Jangan menghapus cache lokal atau memberi pesan sukses bila data
        // cloud belum benar-benar terhapus.
        throw err;
      }
    }

    // Selalu sinkronkan dengan local
    let surveys = this._getLocalSurveys();
    surveys = surveys.filter((s) => s.id !== surveyId);
    this._saveLocalSurveys(surveys);

    let responses = this._getLocalResponses();
    responses = responses.filter((r) => r.surveyId !== surveyId);
    this._saveLocalResponses(responses);

    return true;
  }

  // ==========================================
  // METODE RESPON / JAWABAN RESPONDEN
  // ==========================================

  // Cek apakah NIM sudah pernah mengisi survei ini (anti-duplikat)
  async checkNIMExists(surveyId, nim) {
    if (!nim || !surveyId) return false;

    if (this.isFirebaseActive && this.db) {
      try {
        const snapshot = await this.db
          .collection("surveys")
          .doc(surveyId)
          .collection("responses")
          .where("nim", "==", nim)
          .limit(1)
          .get();
        return !snapshot.empty;
      } catch (err) {
        console.warn("checkNIMExists Firestore error, fallback ke local:", err);
      }
    }

    // Fallback: LocalStorage
    const responses = this._getLocalResponses();
    return responses.some((r) => r.surveyId === surveyId && r.nim === nim);
  }

  // Kirim Respon Survei
  async submitResponse(surveyId, answersData, nim) {
    // Periksa ulang status sebelum menyimpan, agar survei yang baru saja
    // dinonaktifkan tidak menerima respons dari halaman yang masih terbuka.
    const survey = await this.getSurveyById(surveyId);
    if (!survey) throw new Error("Survei tidak ditemukan.");
    if (survey.isActive === false) {
      throw new Error("Survei ini sedang tidak aktif dan tidak menerima jawaban.");
    }

    const responseId =
      "resp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    const nowIso = new Date().toISOString();

    const newResponse = {
      id: responseId,
      surveyId: surveyId,
      submittedAt: nowIso,
      nim: nim || null, // NIM responden (untuk cek duplikat)
      answers: answersData, // Map: { [questionId]: answerValue }
    };

    if (this.isFirebaseActive && this.db) {
      try {
        await this.db
          .collection("surveys")
          .doc(surveyId)
          .collection("responses")
          .doc(responseId)
          .set(newResponse);

        // Update responseCount di survei
        const surveyRef = this.db.collection("surveys").doc(surveyId);
        await this.db
          .runTransaction(async (transaction) => {
            const sfDoc = await transaction.get(surveyRef);
            if (sfDoc.exists) {
              const count = (sfDoc.data().responseCount || 0) + 1;
              transaction.update(surveyRef, {
                responseCount: count,
                updatedAt: nowIso,
              });
            }
          })
          .catch(() => {});

        return newResponse;
      } catch (err) {
        console.error(
          "Error submit respons ke Firestore, menyimpan ke local:",
          err,
        );
      }
    }

    // Fallback: LocalStorage
    const responses = this._getLocalResponses();
    responses.push(newResponse);
    this._saveLocalResponses(responses);

    const surveys = this._getLocalSurveys();
    const sIndex = surveys.findIndex((s) => s.id === surveyId);
    if (sIndex !== -1) {
      surveys[sIndex].responseCount = (surveys[sIndex].responseCount || 0) + 1;
      surveys[sIndex].updatedAt = nowIso;
      this._saveLocalSurveys(surveys);
    }

    return newResponse;
  }

  // Ambil Semua Respon untuk Survei Tertentu
  async getResponses(surveyId) {
    if (this.isFirebaseActive && this.db) {
      try {
        const snapshot = await this.db
          .collection("surveys")
          .doc(surveyId)
          .collection("responses")
          .orderBy("submittedAt", "desc")
          .get();
        const list = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          data.id = doc.id;
          list.push(data);
        });
        return list;
      } catch (err) {
        console.error("Error membaca responses dari Firestore:", err);
      }
    }

    // Fallback: LocalStorage
    const responses = this._getLocalResponses();
    return responses
      .filter((r) => r.surveyId === surveyId)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  }

  // Listener Real-Time Respons (onSnapshot)
  listenResponses(surveyId, callback) {
    if (this.isFirebaseActive && this.db) {
      try {
        const unsubscribe = this.db
          .collection("surveys")
          .doc(surveyId)
          .collection("responses")
          .orderBy("submittedAt", "desc")
          .onSnapshot(
            (snapshot) => {
              const list = [];
              snapshot.forEach((doc) => {
                const data = doc.data();
                data.id = doc.id;
                list.push(data);
              });
              callback(list);
            },
            (error) => {
              console.warn(
                "Firestore snapshot error, fallback to initial fetch:",
                error,
              );
              this.getResponses(surveyId).then(callback);
            },
          );
        return unsubscribe;
      } catch (err) {
        console.error("Error setting up real-time listener:", err);
      }
    }

    // Jika di localstorage, panggil sekali
    this.getResponses(surveyId).then(callback);
    return () => {};
  }

  // ==========================================
  // HELPER INTERNAL LOCALSTORAGE
  // ==========================================

  _getLocalSurveys() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_LOCAL_SURVEYS);
      if (!data) {
        // Contoh data survei bawaan untuk testing langsung jika kosong
        const sample = [
          {
            id: "srv_contoh_crm",
            title: "Survei Kepuasan Pelanggan (Contoh Mata Kuliah CRM)",
            description:
              "Survei ini bertujuan untuk mengukur tingkat kepuasan dan loyalitas pelanggan terhadap kualitas layanan kami.",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            responseCount: 3,
            isActive: true,
            questions: [
              {
                id: "q_1",
                type: "scale",
                title:
                  "Seberapa puas Anda dengan keramahan dan kecepatan pelayanan kami?",
                required: true,
                minLabel: "Sangat Tidak Puas",
                maxLabel: "Sangat Puas",
              },
              {
                id: "q_2",
                type: "choice",
                title:
                  "Seberapa sering Anda menggunakan produk / layanan kami dalam sebulan terakhir?",
                required: true,
                options: [
                  "Pertama kali",
                  "1 - 2 kali",
                  "3 - 5 kali",
                  "Lebih dari 5 kali",
                ],
              },
              {
                id: "q_3",
                type: "scale",
                title:
                  "Seberapa besar kemungkinan Anda merekomendasikan layanan kami kepada rekan Anda (Net Promoter Score)?",
                required: true,
                minLabel: "Pasti Tidak",
                maxLabel: "Pasti Ya",
              },
              {
                id: "q_4",
                type: "text",
                title:
                  "Apa saran atau masukan Anda untuk meningkatkan kualitas layanan kami ke depannya?",
                required: false,
              },
            ],
          },
        ];
        this._saveLocalSurveys(sample);
        // Tambahkan juga sample responses
        const sampleResponses = [
          {
            id: "resp_1",
            surveyId: "srv_contoh_crm",
            submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
            answers: {
              q_1: "5",
              q_2: "3 - 5 kali",
              q_3: "5",
              q_4: "Pelayanannya sangat cepat dan memuaskan!",
            },
          },
          {
            id: "resp_2",
            surveyId: "srv_contoh_crm",
            submittedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
            answers: {
              q_1: "4",
              q_2: "1 - 2 kali",
              q_3: "4",
              q_4: "Sudah bagus, tolong pertahankan kebersihannya.",
            },
          },
          {
            id: "resp_3",
            surveyId: "srv_contoh_crm",
            submittedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
            answers: {
              q_1: "4",
              q_2: "3 - 5 kali",
              q_3: "5",
              q_4: "Pertahankan keramahan staf!",
            },
          },
        ];
        this._saveLocalResponses(sampleResponses);
        return sample;
      }
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }

  _saveLocalSurveys(surveys) {
    localStorage.setItem(STORAGE_KEY_LOCAL_SURVEYS, JSON.stringify(surveys));
  }

  _getLocalResponses() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_LOCAL_RESPONSES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  _saveLocalResponses(responses) {
    localStorage.setItem(
      STORAGE_KEY_LOCAL_RESPONSES,
      JSON.stringify(responses),
    );
  }
}

// Inisialisasi instance global
window.SurveyDB = new SurveyDBLayer();
