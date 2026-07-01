const REPORTS_KEY = 'madinati_reports';
const ADMIN_AUTH_KEY = 'madinati_admin_authenticated';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'madinati123';

const bodyPage = document.body.dataset.page;
const photoInput = document.getElementById('photo');
const photoPreview = document.getElementById('photo-preview');
const locationBtn = document.getElementById('get-location-btn');
const locationStatus = document.getElementById('location-status');
const latitudeInput = document.getElementById('latitude');
const longitudeInput = document.getElementById('longitude');
const reportForm = document.getElementById('report-form');
const trackForm = document.getElementById('track-form');
const trackResult = document.getElementById('track-result');
const reportIdInput = document.getElementById('report-id');
const adminLoginForm = document.getElementById('admin-login-form');
const adminLoginSection = document.getElementById('admin-login-section');
const adminDashboardSection = document.getElementById('admin-dashboard');
const loginError = document.getElementById('login-error');
const adminWelcome = document.getElementById('admin-welcome');
const adminLogoutButton = document.getElementById('admin-logout-button');
const adminTableBody = document.getElementById('admin-reports-table-body');
const adminStatsNew = document.getElementById('admin-stat-new');
const adminStatsProcessing = document.getElementById('admin-stat-processing');
const adminStatsResolved = document.getElementById('admin-stat-resolved');
const adminStatsTotal = document.getElementById('admin-stat-total');
const adminNoReports = document.getElementById('admin-no-reports');

function getReports() {
  try {
    return JSON.parse(localStorage.getItem(REPORTS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveReports(reports) {
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
}

function generateReportId() {
  return `RPT-${Date.now()}`;
}

function toLatin(input){
  if(input === null || input === undefined) return '';
  const s = String(input);
  const arabicIndic = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  const easternArabic = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  return s.split('').map(ch=>{
    const ai = arabicIndic.indexOf(ch);
    if(ai !== -1) return String(ai);
    const ea = easternArabic.indexOf(ch);
    if(ea !== -1) return String(ea);
    return ch;
  }).join('');
}

function formatNumber(number) {
  return toLatin(new Intl.NumberFormat('ar-EG').format(number));
}

function animateValue(element, start, end, duration = 900) {
  if (!element) return;
  const startTime = performance.now();
  const change = end - start;

  function step(currentTime) {
    const progress = Math.min((currentTime - startTime) / duration, 1);
    element.textContent = formatNumber(Math.floor(start + change * progress));
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

function calculateAverageProcess() {
  const reports = getReports().filter(report => report.status === 'محلول' && report.resolvedAt);
  if (!reports.length) return 2.6;
  const totalHours = reports.reduce((sum, report) => sum + Math.max(0, (report.resolvedAt - report.createdAt) / 3600000), 0);
  return totalHours / reports.length;
}

function displayToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast-message toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-visible'));
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function showReportConfirmation(reportId) {
  hideReportConfirmation();
  const overlay = document.createElement('div');
  overlay.id = 'report-confirmation-overlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-card">
      <h2>تم إرسال البلاغ بنجاح</h2>
      <p>يرجى الاحتفاظ برقم التتبع التالي للرجوع إليه لاحقاً عند تتبع حالة البلاغ.</p>
      <p class="tracking-number">${toLatin(reportId)}</p>
      <button id="report-confirmation-ok" type="button">حسناً</button>
    </div>
  `;
  overlay.addEventListener('click', function (event) {
    if (event.target === overlay) hideReportConfirmation();
  });
  document.body.appendChild(overlay);
  const okButton = document.getElementById('report-confirmation-ok');
  if (okButton) okButton.addEventListener('click', hideReportConfirmation);
}

function hideReportConfirmation() {
  const overlay = document.getElementById('report-confirmation-overlay');
  if (overlay) overlay.remove();
}

function createSkeletonCard() {
  return `
    <div class="glass-card p-8 skeleton">
      <div class="h-5 w-1/3 rounded-full bg-slate-200"></div>
      <div class="mt-6 h-5 w-1/2 rounded-full bg-slate-200"></div>
      <div class="mt-6 h-4 rounded-full bg-slate-200"></div>
      <div class="mt-3 h-4 rounded-full bg-slate-200"></div>
      <div class="mt-3 h-4 w-2/3 rounded-full bg-slate-200"></div>
    </div>
  `;
}

async function renderRecentReports() {
  const container = document.getElementById('recent-reports');
  if (!container) return;

  let reports = getReports();

  // إذا localStorage فارغ => اجلب آخر 3 من السيرفر
  if (!Array.isArray(reports) || !reports.length) {
    try {
      const resp = await fetch('/api/reports');
      const json = await resp.json();
      reports = Array.isArray(json?.reports) ? json.reports : [];
    } catch (e) {
      console.error('فشل جلب آخر البلاغات:', e);
      reports = [];
    }
  }

  if (!reports.length) {
    container.innerHTML = `<div class="glass-card p-8 text-center text-slate-600 dark:text-slate-300">لا يوجد بلاغات حتى الآن. أرسل أول بلاغ ولاحظ التقدم هنا.</div>`;
    return;
  }

  container.innerHTML = reports.slice(0, 3).map(report => {
    const statusClass = report.status === 'محلول' ? 'resolved' : report.status === 'قيد المعالجة' ? 'processing' : 'new';
    const location = report.latitude && report.longitude ? `خط العرض ${toLatin(report.latitude)} , خط الطول ${toLatin(report.longitude)}` : 'الموقع غير متوفر';

    return `
      <article class="glass-card overflow-hidden shadow-soft">
        <div class="relative h-56 overflow-hidden bg-slate-200 dark:bg-slate-800">
          ${report.photo ? `<img src="${report.photo}" alt="${report.type}" class="h-full w-full object-cover" />` : `<div class="flex h-full items-center justify-center text-slate-500 dark:text-slate-300">لا توجد صورة</div>`}
          <span class="status-badge status-${statusClass} absolute top-4 left-4">${report.status}</span>
        </div>
        <div class="p-6 space-y-4">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">${report.type}</p>
              <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">${toLatin(new Date(report.createdAt).toLocaleDateString('ar-EG'))}</p>
            </div>
            <span class="text-sm text-slate-500 dark:text-slate-400">${toLatin(report.id)}</span>
          </div>
          <p class="text-slate-700 dark:text-slate-200">${report.description.substring(0, 120)}...</p>
          <p class="text-sm text-slate-500 dark:text-slate-400">${location}</p>
        </div>
      </article>
    `;
  }).join('');
}

function updateLandingStats() {
  const reports = getReports();
  const resolvedCount = reports.filter(report => report.status === 'محلول').length;
  const totalCount = reports.length;
  const average = calculateAverageProcess();
  const usersCount = Math.max(420, totalCount * 4 + 120);

  animateValue(document.getElementById('home-total'), 0, totalCount);
  animateValue(document.getElementById('home-resolved'), 0, resolvedCount);
  const averageEl = document.getElementById('home-average');
  if (averageEl) averageEl.textContent = toLatin(average.toFixed(1));
  animateValue(document.getElementById('home-users'), 0, usersCount);
}

function showPhotoPreview() {
  if (!photoInput || !photoPreview) return;
  photoInput.addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      photoPreview.src = e.target.result;
      photoPreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  });
}

function initLocationButton() {
  if (!locationBtn || !locationStatus || !latitudeInput || !longitudeInput) return;
  locationBtn.addEventListener('click', function () {
    if (!navigator.geolocation) {
      locationStatus.textContent = '⚠️ متصفحك لا يدعم تحديد الموقع.';
      locationStatus.style.color = '#d97706';
      return;
    }
    locationStatus.textContent = '⏳ جاري تحديد موقعك...';
    locationStatus.style.color = '';
    navigator.geolocation.getCurrentPosition(
      position => {
        latitudeInput.value = position.coords.latitude;
        longitudeInput.value = position.coords.longitude;
        locationStatus.textContent = '✅ تم تحديد موقعك بنجاح';
        locationStatus.style.color = '#16a34a';
      },
      () => {
        locationStatus.textContent = '❌ تعذر تحديد موقعك. تأكد من تفعيل صلاحية الموقع.';
        locationStatus.style.color = '#dc2626';
      }
    );
  });
}

async function uploadImage(imageData) {
  try {
    const response = await fetch('/api/upload-image-base64', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ imageData })
    });

    if (!response.ok) {
      throw new Error('فشل رفع الصورة');
    }

    const result = await response.json();
    return result.path;
  } catch (error) {
    console.error('خطأ في رفع الصورة:', error);
    return '';
  }
}

function initReportForm() {
  if (!reportForm) return;
  reportForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const problemType = document.getElementById('problem-type').value;
    const description = document.getElementById('description').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const photoData = photoPreview && !photoPreview.classList.contains('hidden') ? photoPreview.src : '';
    const latitude = latitudeInput ? latitudeInput.value : '';
    const longitude = longitudeInput ? longitudeInput.value : '';
    if (!problemType || !description) {
      displayToast('يرجى تعبئة نوع المشكلة ووصفها.', 'danger');
      return;
    }

    // عرض رسالة انتظار
    displayToast('⏳ جاري معالجة البلاغ...', 'info');

    // رفع الصورة إذا كانت موجودة
    let photoPath = '';
    if (photoData) {
      photoPath = await uploadImage(photoData);
    }

    const report = {
      id: generateReportId(),
      type: problemType,
      description,
      phone,
      photo: photoPath,
      latitude,
      longitude,
      status: 'جديد',
      createdAt: Date.now(),
      resolvedAt: null
    };
    const reports = getReports();
    reports.unshift(report);
    saveReports(reports);
    updateLandingStats();
    renderRecentReports();
    reportForm.reset();
    if (photoPreview) {
      photoPreview.classList.add('hidden');
      photoPreview.src = '';
    }
    displayToast(`✅ تم تسجيل البلاغ بنجاح. رقم البلاغ: ${toLatin(report.id)}`, 'success');
    showReportConfirmation(report.id);
  });
}

function renderTrackResult(report) {
  if (!trackResult) return;

  // صندوق منبثق + خلفية ضبابية
  // (نترك trackResult كمكان شكلي، لكن الإظهار يتم داخل نافذة منبثقة)

  const existing = document.getElementById('tracking-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'tracking-modal-overlay';
  overlay.className = 'tracking-modal-overlay';

  const closeBtn = `<button type="button" id="tracking-modal-close" class="btn btn-secondary btn-sm">إغلاق</button>`;

  if (!report) {
    overlay.innerHTML = `
      <div class="tracking-modal-card" dir="rtl">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold">نتيجة التتبع</h2>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-300">لا يوجد بلاغ مطابق لهذا الرقم. حاول مرة أخرى.</p>
          </div>
          ${closeBtn}
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
    const close = overlay.querySelector('#tracking-modal-close');
    if (close) close.addEventListener('click', () => overlay.remove());

    window.addEventListener('keydown', function handler(ev) {
      if (ev.key === 'Escape') {
        overlay.remove();
        window.removeEventListener('keydown', handler);
      }
    });
    return;
  } else {

    const statusClass = report.status === 'محلول' ? 'resolved' : report.status === 'قيد المعالجة' ? 'processing' : 'new';
    const progress = report.status === 'محلول' ? 100 : report.status === 'قيد المعالجة' ? 70 : 25;
    const steps = [
      {label: 'تم الإرسال', active: true},
      {label: 'قيد المراجعة', active: report.status !== 'جديد'},
      {label: 'تم تحويله للفريق المختص', active: report.status !== 'جديد'},
      {label: 'جاري التنفيذ', active: report.status === 'قيد المعالجة' || report.status === 'محلول'},
      {label: 'تم الحل', active: report.status === 'محلول'}
    ];

    overlay.innerHTML = `
      <div class="tracking-modal-card" dir="rtl">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-bold">نتيجة التتبع</h2>
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-300">${toLatin(report.id)} • ${report.status}</p>
          </div>
          ${closeBtn}
        </div>

        <div class="mt-6 space-y-6">
          <div class="glass-card p-8">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p class="text-sm font-semibold text-slate-500 dark:text-slate-300">رقم البلاغ</p>
                <p class="mt-2 text-xl font-semibold text-slate-900 dark:text-white">${toLatin(report.id)}</p>
              </div>
              <span class="status-badge status-${statusClass}">${report.status}</span>
            </div>
            <div class="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <p class="text-sm text-slate-500 dark:text-slate-300">النوع</p>
                <p class="mt-2 font-semibold text-slate-900 dark:text-white">${report.type}</p>
              </div>
              <div>
                <p class="text-sm text-slate-500 dark:text-slate-300">التاريخ</p>
                <p class="mt-2 font-semibold text-slate-900 dark:text-white">${toLatin(new Date(report.createdAt).toLocaleDateString('ar-EG'))}</p>
              </div>
            </div>
            <div class="mt-6">
              <p class="text-sm text-slate-500 dark:text-slate-300">الوصف</p>
              <p class="mt-2 text-slate-700 dark:text-slate-200">${report.description}</p>
            </div>
            <div class="mt-6 overflow-hidden rounded-3xl bg-slate-200 dark:bg-slate-800">
              <div class="h-3 rounded-3xl bg-primary transition-all duration-500" style="width: ${progress}%"></div>
            </div>
            <p class="mt-3 text-sm text-slate-500 dark:text-slate-300">${toLatin(progress)}% من مسار الحل</p>
          </div>

          <div class="glass-card p-8">
            <p class="text-sm font-semibold uppercase tracking-[0.24em] text-primary">الخطوات</p>
            <div class="mt-6 space-y-4">
              ${steps.map(step => `<div class="flex items-center gap-4"><span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl ${step.active ? 'bg-primary/10 text-primary' : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}">${step.active ? '✓' : ''}</span><span class="text-slate-700 dark:text-slate-200">${step.label}</span></div>`).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  document.body.appendChild(overlay);

  // إغلاق
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  const close = overlay.querySelector('#tracking-modal-close');
  if (close) close.addEventListener('click', () => overlay.remove());

  // إغلاق بزر ESC
  window.addEventListener('keydown', function handler(ev) {
    if (ev.key === 'Escape') {
      overlay.remove();
      window.removeEventListener('keydown', handler);
    }
  });
}


function initTrackPage() {
  if (!trackForm || !reportIdInput || !trackResult) return;
  trackForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const searchId = reportIdInput.value.trim();
    if (!searchId) {
      trackResult.innerHTML = `<div class="glass-card p-8 text-slate-700 dark:text-slate-200">الرجاء إدخال رقم البلاغ.</div>`;
      return;
    }
    trackResult.innerHTML = createSkeletonCard();
    const reports = getReports();
    const report = reports.find(item => item.id.toLowerCase() === searchId.toLowerCase());
    setTimeout(() => renderTrackResult(report), 700);
  });
}

function initAdminPage() {
  if (!adminLoginSection || !adminDashboardSection || !adminLoginForm) return;
  function showAdminView() {
    adminLoginSection.style.display = 'none';
    adminDashboardSection.style.display = 'block';
    adminWelcome.textContent = 'مرحباً بك، مدير المنصة';
    updateAdminDashboard();
  }
  function showLoginView() {
    adminLoginSection.style.display = 'grid';
    adminDashboardSection.style.display = 'none';
    if (loginError) {
      loginError.style.display = 'none';
      loginError.textContent = '';
    }
    adminLoginForm.reset();
  }
  if (localStorage.getItem(ADMIN_AUTH_KEY) === 'true') showAdminView(); else showLoginView();
  adminLoginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const usernameInput = document.getElementById('admin-username').value.trim();
    const passwordInput = document.getElementById('admin-password').value.trim();
    if (usernameInput === ADMIN_USERNAME && passwordInput === ADMIN_PASSWORD) {
      localStorage.setItem(ADMIN_AUTH_KEY, 'true');
      showAdminView();
    } else if (loginError) {
      loginError.style.display = 'block';
      loginError.textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة.';
    }
  });
  adminDashboardSection.addEventListener('click', function (e) {
    const button = e.target.closest('button[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    const reportId = button.dataset.id;
    if (action === 'processing') updateAdminStatus(reportId, 'قيد المعالجة');
    if (action === 'resolved') updateAdminStatus(reportId, 'محلول');
    if (action === 'reopen') updateAdminStatus(reportId, 'جديد');
  });
  if (adminLogoutButton) {
    adminLogoutButton.addEventListener('click', function () {
      localStorage.removeItem(ADMIN_AUTH_KEY);
      showLoginView();
    });
  }
}

function updateAdminDashboard() {
  if (!adminTableBody || !adminStatsNew || !adminStatsProcessing || !adminStatsResolved || !adminStatsTotal || !adminNoReports) return;
  const reports = getReports();
  const newCount = reports.filter(report => report.status === 'جديد').length;
  const processingCount = reports.filter(report => report.status === 'قيد المعالجة').length;
  const resolvedCount = reports.filter(report => report.status === 'محلول').length;
  const totalCount = reports.length;
  adminStatsNew.textContent = toLatin(newCount);
  adminStatsProcessing.textContent = toLatin(processingCount);
  adminStatsResolved.textContent = toLatin(resolvedCount);
  adminStatsTotal.textContent = toLatin(totalCount);
  if (!reports.length) {
    adminNoReports.textContent = 'لا توجد بلاغات حتى الآن.';
    adminNoReports.classList.remove('hidden');
    adminTableBody.innerHTML = '';
    return;
  }
  adminNoReports.classList.add('hidden');
  adminTableBody.innerHTML = reports.map(report => {
    const buttons = [];
    if (report.status !== 'قيد المعالجة') buttons.push(`<button class="inline-flex items-center justify-center rounded-3xl bg-secondary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary" data-action="processing" data-id="${report.id}">بدء المعالجة</button>`);
    if (report.status !== 'محلول') buttons.push(`<button class="inline-flex items-center justify-center rounded-3xl bg-success px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600" data-action="resolved" data-id="${report.id}">وضع محلول</button>`);
    if (report.status === 'محلول') buttons.push(`<button class="inline-flex items-center justify-center rounded-3xl bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-300" data-action="reopen" data-id="${report.id}">إعادة فتح</button>`);
    const statusClass = report.status === 'محلول' ? 'resolved' : report.status === 'قيد المعالجة' ? 'processing' : 'new';
    return `
      <tr>
        <td class="whitespace-nowrap px-4 py-3 text-right text-slate-700 dark:text-slate-200">${toLatin(report.id)}</td>
        <td class="whitespace-nowrap px-4 py-3 text-right text-slate-700 dark:text-slate-200">${report.type}</td>
        <td class="px-4 py-3 text-right text-slate-700 dark:text-slate-200">${report.description.substring(0, 60)}...</td>
        <td class="whitespace-nowrap px-4 py-3 text-right"><span class="status-badge status-${statusClass}">${report.status}</span></td>
        <td class="px-4 py-3 text-right flex flex-wrap gap-2">${buttons.join('')}</td>
      </tr>
    `;
  }).join('');
}

function updateAdminStatus(reportId, newStatus) {
  const reports = getReports();
  const report = reports.find(item => item.id === reportId);
  if (!report) return;
  report.status = newStatus;
  if (newStatus === 'محلول') report.resolvedAt = Date.now();
  saveReports(reports);
  updateAdminDashboard();
  updateLandingStats();
}

function initMapSearch() {
  const mapSearchForm = document.getElementById('map-search-form');
  const mapLocation = document.getElementById('map-location');
  if (!mapSearchForm || !mapLocation) return;
  mapSearchForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const input = document.getElementById('map-search-input');
    const query = input.value.trim() || 'المدينة';
    mapLocation.textContent = `نتائج البحث عن: ${query}`;
    displayToast('تم تحديث الموقع على الخريطة بنجاح', 'success');
  });
}

function initThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle');
  function updateButton() {
    if (!themeToggle) return;
    const isDark = document.documentElement.classList.contains('dark');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    themeToggle.setAttribute('aria-label', isDark ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن');
  }
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('madinati_theme', isDark ? 'dark' : 'light');
      updateButton();
      displayToast(isDark ? 'تم تفعيل الوضع الليلي' : 'تم التبديل إلى الوضع الفاتح', 'success');
    });
  }

  const storedTheme = localStorage.getItem('madinati_theme');
  const preferDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const useDark = storedTheme ? storedTheme === 'dark' : preferDark;
  document.documentElement.classList.toggle('dark', useDark);
  updateButton();
}

function initPage() {
  initThemeToggle();
  showPhotoPreview();
  initLocationButton();
  initReportForm();
  initTrackPage();
  initMapSearch();
  initAdminPage();
  updateLandingStats();
  renderRecentReports();
}

window.addEventListener('DOMContentLoaded', initPage);
