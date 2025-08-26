// Система сповіщень та історії подій
let eventsHistory = [];
let toastQueue = [];
let maxToasts = 4;
let currentToasts = 0;

// Типи подій з іконками
const eventTypes = {
    attack: { icon: '⚡', title: 'Атака', color: '#F44336' },
    repair: { icon: '🔧', title: 'Ремонт', color: '#4CAF50' },
    upgrade: { icon: '⬆️', title: 'Покращення', color: '#2196F3' },
    warning: { icon: '⚠️', title: 'Попередження', color: '#FF9800' },
    achievement: { icon: '🏆', title: 'Досягнення', color: '#9C27B0' },
    info: { icon: 'ℹ️', title: 'Інформація', color: '#00BCD4' }
};

// Головна функція для показу сповіщень
function showNotification(message, type = 'info', title = null, duration = 4000) {
    // Додаємо подію до історії
    addEventToHistory(message, type, title);
    
    // Показуємо toast
    showToast(message, type, title, duration);
    
    // Оновлюємо панель історії
    updateEventsPanel();
}

// Функція для показу toast сповіщень
function showToast(message, type = 'info', title = null, duration = 4000) {
    if (currentToasts >= maxToasts) {
        // Додаємо в чергу
        toastQueue.push({ message, type, title, duration });
        return;
    }

    const container = document.getElementById('toast-container');
    if (!container) {
        console.warn('Toast container not found');
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const eventType = eventTypes[type] || eventTypes.info;
    const toastTitle = title || eventType.title;
    
    toast.innerHTML = `
        <div class="toast-icon">${eventType.icon}</div>
        <div class="toast-content">
            ${toastTitle ? `<div class="toast-title">${toastTitle}</div>` : ''}
            <div class="toast-message">${message}</div>
        </div>
        <div class="toast-progress"></div>
    `;

    container.appendChild(toast);
    currentToasts++;

    // Анімація появи
    setTimeout(() => toast.classList.add('show'), 10);

    // Прогрес-бар
    if (duration > 0) {
        const progressBar = toast.querySelector('.toast-progress');
        progressBar.style.width = '100%';
        setTimeout(() => {
            progressBar.style.width = '0%';
            progressBar.style.transition = `width ${duration}ms linear`;
        }, 100);
    }

    // Закриття по кліку
    toast.addEventListener('click', () => {
        removeToast(toast);
    });

    // Автоматичне закриття
    if (duration > 0) {
        setTimeout(() => {
            removeToast(toast);
        }, duration);
    }
}

// Функція видалення toast
function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    
    toast.classList.add('hide');
    currentToasts--;
    
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
        
        // Показуємо наступний toast з черги
        if (toastQueue.length > 0) {
            const next = toastQueue.shift();
            showToast(next.message, next.type, next.title, next.duration);
        }
    }, 300);
}

// Додавання події до історії
function addEventToHistory(message, type, title = null) {
    const event = {
        id: Date.now() + Math.random(),
        message,
        type,
        title: title || eventTypes[type]?.title || 'Подія',
        timestamp: new Date(),
        time: formatTime(new Date())
    };
    
    eventsHistory.unshift(event); // Додаємо на початок
    
    // Обмежуємо історію до 100 подій
    if (eventsHistory.length > 100) {
        eventsHistory = eventsHistory.slice(0, 100);
    }
}

// Форматування часу
function formatTime(date) {
    const minutes = Math.floor((Date.now() - gameStartTime) / 60000);
    const seconds = Math.floor(((Date.now() - gameStartTime) % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Оновлення панелі історії подій
function updateEventsPanel() {
    const historyContainer = document.getElementById('events-history');
    if (!historyContainer) return;

    const activeFilter = document.querySelector('.event-filter.active')?.dataset.filter || 'all';
    const filteredEvents = activeFilter === 'all' 
        ? eventsHistory 
        : eventsHistory.filter(event => event.type === activeFilter);

    if (filteredEvents.length === 0) {
        historyContainer.innerHTML = '<div class="events-count">Немає подій для відображення</div>';
        return;
    }

    const eventsHTML = filteredEvents.map(event => {
        const eventType = eventTypes[event.type] || eventTypes.info;
        return `
            <div class="event-item">
                <div class="event-icon">${eventType.icon}</div>
                <div class="event-content">
                    <div class="event-time">${event.time}</div>
                    <div class="event-message">${event.message}</div>
                </div>
            </div>
        `;
    }).join('');

    historyContainer.innerHTML = eventsHTML + 
        `<div class="events-count">Показано ${filteredEvents.length} з ${eventsHistory.length} подій</div>`;
}

// Стара функція showWarning для зворотної сумісності
function showWarning(message, isGoodNews = false) {
    const type = isGoodNews ? 'achievement' : 'warning';
    showNotification(message, type);
}

// Функції для різних типів сповіщень
function showAttackNotification(message) {
    showNotification(message, 'attack', 'Атака на інфраструктуру');
}

function showRepairNotification(message) {
    showNotification(message, 'repair', 'Ремонт завершено');
}

function showUpgradeNotification(message) {
    showNotification(message, 'upgrade', 'Покращення');
}

function showAchievementNotification(message) {
    showNotification(message, 'achievement', 'Досягнення');
}

// Функція для створення ефекту частинок
function createParticleEffect(latLng, type = 'repair') {
    const mapContainer = document.getElementById('map');
    const point = map.latLngToContainerPoint(latLng);

    const colors = {
        repair: ['#4CAF50', '#8BC34A', '#CDDC39'],
        damage: ['#FF5722', '#FF9800', '#FFC107'],
        upgrade: ['#9C27B0', '#E91E63', '#2196F3']
    };

    const particleColors = colors[type] || colors.repair;

    for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.className = 'spark';
        particle.style.background = particleColors[Math.floor(Math.random() * particleColors.length)];
        particle.style.left = point.x + 'px';
        particle.style.top = point.y + 'px';

        const angle = (Math.PI * 2 * i) / 8;
        const distance = 20 + Math.random() * 30;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;

        particle.style.setProperty('--tx', tx + 'px');
        particle.style.setProperty('--ty', ty + 'px');

        mapContainer.appendChild(particle);

        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 1000);
    }
}

// Функція для створення ефекту блискавки
function createLightningEffect(latLng) {
    const container = L.DomUtil.create('div', '');
    container.innerHTML = '<span style="font-size:32px;color:#ffeb3b;text-shadow:0 0 10px #ffeb3b;">⚡</span>';
    container.style.animation = 'lightningStrike 0.8s ease-out forwards';

    const icon = L.divIcon({
        className: '',
        html: container.outerHTML,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });

    const marker = L.marker(latLng, { icon }).addTo(map);

    setTimeout(() => {
        map.removeLayer(marker);
    }, 800);
}

// Функція для створення ефекту ремонту
function createRepairEffect(latLng) {
    const container = L.DomUtil.create('div', '');
    container.innerHTML = '<span style="font-size:28px;color:#4CAF50;text-shadow:0 0 8px #4CAF50;">🔧</span>';
    container.style.animation = 'repairEffect 1.5s ease-out forwards';

    const icon = L.divIcon({
        className: '',
        html: container.outerHTML,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
    });

    const marker = L.marker(latLng, { icon }).addTo(map);

    setTimeout(() => {
        map.removeLayer(marker);
    }, 1500);
}

// Функція для створення ефекту апгрейду
function createUpgradeEffect(latLng) {
    const container = L.DomUtil.create('div', '');
    container.innerHTML = '<span style="font-size:24px;color:#FFD700;text-shadow:0 0 12px #FFD700;">✨</span>';
    container.style.animation = 'upgradeEffect 2s ease-out forwards';

    const icon = L.divIcon({
        className: '',
        html: container.outerHTML,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    const marker = L.marker(latLng, { icon }).addTo(map);

    setTimeout(() => {
        map.removeLayer(marker);
    }, 2000);
}

// Функція для відображення прогрес-бару
function showProgressBar(latlng, duration, onComplete) {
    const container = L.DomUtil.create('div', 'progress-container');
    const progressBar = L.DomUtil.create('div', 'progress-bar', container);

    const icon = L.divIcon({
        className: '',
        html: container.outerHTML,
        iconSize: [60, 8],
        iconAnchor: [30, 0]
    });

    const marker = L.marker(latlng, { icon }).addTo(map);

    let start = null;
    function animate(timestamp) {
        if (!start) start = timestamp;
        const progress = (timestamp - start) / duration;

        const el = marker.getElement();
        if (el) {
            const barEl = el.querySelector('.progress-bar');
            if (barEl) {
                barEl.style.width = `${Math.min(progress * 100, 100)}%`;
            }
        }

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            map.removeLayer(marker);
            onComplete();
        }
    }

    requestAnimationFrame(animate);
}

// Функція для оновлення візуального стану електростанції
function updatePowerStationVisual(stationName, damaged = false) {
    const ps = powerStationMarkers[stationName];
    if (!ps) return;

    const container = L.DomUtil.create('div', getStationClass(ps.type, damaged));
    container.style.width = '20px';
    container.style.height = '20px';

    const iconElement = L.DomUtil.create('div', 'station-icon', container);
    iconElement.innerHTML = getStationIcon(ps.type);

    const newIcon = L.divIcon({
        className: '',
        html: container.outerHTML,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    ps.marker.setIcon(newIcon);
}

// Функція для оновлення візуального стану міста
function updateCityVisual(cityName, className) {
    const marker = cityMarkers[cityName];
    if (!marker) return;

    const container = L.DomUtil.create('div', className);
    container.style.width = '12px';
    container.style.height = '12px';

    const newIcon = L.divIcon({
        className: '',
        html: container.outerHTML,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
    });

    marker.setIcon(newIcon);
}

// Функція для анімації покращення електростанції
function blinkPowerStation(stationName) {
    const ps = powerStationMarkers[stationName];
    if (!ps) return;

    updatePowerStationTooltip(stationName);
    createUpgradeEffect(ps.marker.getLatLng());
    createParticleEffect(ps.marker.getLatLng(), 'upgrade');

    let blinkCount = 0;
    const maxBlinks = 6;
    const blinkInterval = 200;

    const blinkIntervalId = setInterval(() => {
        if (blinkCount >= maxBlinks) {
            clearInterval(blinkIntervalId);
            updatePowerStationVisual(stationName, ps.damaged);
            return;
        }

        if (blinkCount % 2 === 0) {
            ps.marker.getElement().style.background = 'radial-gradient(circle, #ffeb3b 0%, #fbc02d 100%)';
        } else {
            updatePowerStationVisual(stationName, ps.damaged);
            ps.marker.getElement().style.background = '';
        }

        blinkCount++;
    }, blinkInterval);
}