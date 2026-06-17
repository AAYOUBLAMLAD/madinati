// === معاينة الصورة المختارة ===
const photoInput = document.getElementById('photo');
const photoPreview = document.getElementById('photo-preview');

if (photoInput) {
    photoInput.addEventListener('change', function () {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                photoPreview.src = e.target.result;
                photoPreview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });
}

// === تحديد الموقع الجغرافي ===
const locationBtn = document.getElementById('get-location-btn');
const locationStatus = document.getElementById('location-status');
const latitudeInput = document.getElementById('latitude');
const longitudeInput = document.getElementById('longitude');

if (locationBtn) {
    locationBtn.addEventListener('click', function () {
        if (!navigator.geolocation) {
            locationStatus.textContent = '⚠️ متصفحك لا يدعم تحديد الموقع.';
            return;
        }

        locationStatus.textContent = '⏳ جاري تحديد موقعك...';

        navigator.geolocation.getCurrentPosition(
            function (position) {
                latitudeInput.value = position.coords.latitude;
                longitudeInput.value = position.coords.longitude;
                locationStatus.textContent = '✅ تم تحديد موقعك بنجاح';
                locationStatus.style.color = 'green';
            },
            function (error) {
                locationStatus.textContent = '❌ تعذر تحديد موقعك. تأكد من تفعيل صلاحية الموقع.';
                locationStatus.style.color = 'red';
            }
        );
    });
}

// === إرسال التبليغ (نسخة مؤقتة - قيد التطوير) ===
const reportForm = document.getElementById('report-form');

if (reportForm) {
    reportForm.addEventListener('submit', function (e) {
        e.preventDefault();
        alert('⚠️ ميزة إرسال التبليغات قيد التطوير حالياً وستُفعَّل قريباً بعد إطلاق الخادم الآمن.\n\nشكراً لتفهمك وصبرك على مدينتي!');
    });
}