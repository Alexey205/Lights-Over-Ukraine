// Ініціалізація карти та гри
document.addEventListener('DOMContentLoaded', function () {
    initializeMap();
    createCityMarkers();
    createPowerStationMarkers();
    createConnectionLines();
    initializeUI();
    initializeNotificationSystem();
    startGame();
});

// Ініціалізація карти
function initializeMap() {
    map = L.map('map').setView([48.5, 31], 6);

    // Базовий шар карти
    L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> | &copy; <a href="https://carto.com/">CartoDB</a> | &copy; <a href="https://www.geoboundaries.org">geoBoundaries</a>, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>'
    }).addTo(map);

    // Завантаження кордонів України
    fetch('src/geoBoundaries-UKR-ADM0_simplified.geojson')
        .then(res => res.json())
        .then(geojson => {
            // Кордон України
            L.geoJSON(geojson, {
                style: {
                    color: '#2c3e50',
                    weight: 2,
                    opacity: 0.8,
                    fillColor: '#2c3e50',
                    fillOpacity: 0,
                    dashArray: '3, 5'
                }
            }).addTo(map);
        })
        .catch(error => console.error('Помилка завантаження GeoJSON:', error));

    // Обмеження карти
    const bounds = L.latLngBounds(
        [44, 22], // Південно-західний кут
        [52.5, 40] // Північно-східний кут
    );
    map.setMaxBounds(bounds);
    map.fitBounds(bounds);
}

// Створення маркерів міст
function createCityMarkers() {
    for (const [name, data] of Object.entries(cities)) {
        const container = L.DomUtil.create('div', 'city-marker powered');
        container.style.width = '12px';
        container.style.height = '12px';

        const marker = L.marker(data.coords, {
            icon: L.divIcon({
                className: '',
                html: container.outerHTML,
                iconSize: [12, 12],
                iconAnchor: [6, 6]
            }),
            zIndexOffset: 1000
        }).addTo(map);

        marker.bindTooltip(createTooltipContent(name, `Потреба: ${data.powerNeed} МВт`), {
            permanent: false,
            direction: 'top'
        });

        cityMarkers[name] = marker;
        cityHealth[name] = { current: 100, timer: null, powered: true };
    }
}

// Створення маркерів електростанцій
function createPowerStationMarkers() {
    powerStations.forEach((station) => {
        const container = L.DomUtil.create('div', getStationClass(station.type));
        container.style.width = '20px';
        container.style.height = '20px';

        const iconElement = L.DomUtil.create('div', 'station-icon', container);
        iconElement.innerHTML = getStationIcon(station.type);

        const marker = L.marker(station.coords, {
            icon: L.divIcon({
                className: '',
                html: container.outerHTML,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            }),
            zIndexOffset: 2000
        }).addTo(map);

        marker.bindTooltip(createTooltipContent(
            `${station.name} (${station.type})`,
            `Потужність: ${station.powerOutput} МВт`
        ), { permanent: false, direction: 'top' });

        powerStationMarkers[station.name] = {
            marker,
            fire: null,
            damaged: false,
            type: station.type,
            powerOutput: station.powerOutput
        };

        marker.on('click', () => {
            repairPowerStation(station.name);
            updatePowerStationTooltip(station.name);
        });
    });
}

// Створення ліній з'єднання
function createConnectionLines() {
    connections.forEach(([from, to]) => {
        const latlngs = [
            cities[from]?.coords || powerStations.find(p => p.name === from)?.coords,
            cities[to]?.coords || powerStations.find(p => p.name === to)?.coords
        ];

        const line = L.polyline(latlngs, {
            color: lineUpgrades.colors[lineUpgrades.level],
            weight: lineUpgrades.weights[lineUpgrades.level],
            className: 'power-line'
        }).addTo(map).bringToBack();

        const damageIcon = L.DomUtil.create('div', '');
        damageIcon.innerHTML = '<span style="font-size:24px;line-height:24px;color:#ff5722;text-shadow:0 0 8px #ff5722;">⚡</span>';

        const damageMarker = L.marker(midpoint(latlngs[0], latlngs[1]), {
            icon: L.divIcon({
                className: '',
                html: damageIcon.outerHTML,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            }),
            zIndexOffset: 0
        }).addTo(map).setOpacity(0);

        const conn = {
            from,
            to,
            line,
            damaged: false,
            damageMarker,
            repairTimer: null
        };
        lineLayers.push(conn);

        damageMarker.on('click', () => {
            if (!conn.damaged || repairTeams <= 0) return;

            if (lineUpgrades.autoRepair.unlocked && conn.repairTimer) {
                showNotification("Автоматичний ремонт вже виконує цю роботу!", 'warning');
                return;
            }

            repairTeams--;
            updateTeamStatus();

            if (conn.repairTimer) {
                clearTimeout(conn.repairTimer);
                conn.repairTimer = null;
            }

            const repairTime = repairTimes['line'] * difficultyMultiplier *
                lineUpgrades.repairTimes[lineUpgrades.level];

            showProgressBar(damageMarker.getLatLng(), repairTime, () => {
                repairLine(conn);
                repairTeams++;
                updateTeamStatus();

                if (lineUpgrades.autoRepair.unlocked) {
                    startAutoRepair();
                }
            });
        });
    });
}

// Ініціалізація інтерфейсу
function initializeUI() {
    const mainPanel = document.getElementById('mainPanel');
    const toggleBtn = document.getElementById('togglePanel');
    const tabs = document.querySelectorAll('.tab');

    // Обробка перемикання вкладок
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Деактивуємо всі вкладки і контенти
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.panel-content').forEach(content => {
                content.classList.remove('active');
            });

            // Активуємо обрану вкладку і контент
            tab.classList.add('active');
            const contentId = tab.getAttribute('data-tab') + 'Content';
            document.getElementById(contentId).classList.add('active');
            
            // Оновлюємо історію подій при відкритті вкладки
            if (tab.getAttribute('data-tab') === 'events') {
                updateEventsPanel();
            }
        });
    });

    // Обробка згортання/розгортання панелі
    toggleBtn.addEventListener('click', () => {
        mainPanel.classList.toggle('collapsed');
        toggleBtn.textContent = mainPanel.classList.contains('collapsed') ? '⚙️' : '✕';
        toggleBtn.style.left = mainPanel.classList.contains('collapsed') ? '10px' : '340px';
    });

    // Обробка кнопки рестарту
    document.getElementById('restart-button').addEventListener('click', restartGame);
}

// Ініціалізація системи сповіщень
function initializeNotificationSystem() {
    // Створюємо контейнер для toast якщо його немає
    if (!document.getElementById('toast-container')) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    // Ініціалізуємо фільтри подій
    initializeEventFilters();
    
    // Розтягуємо вітальні сповіщення в часі
    setTimeout(() => {
        showNotification("Вітаємо у грі! Захистіть енергосистему України.", 'info', 'Початок гри');
    }, 500);
    
    setTimeout(() => {
        showNotification("Використовуйте ремонтні бригади для відновлення пошкоджених об'єктів", 'info', 'Підказка');
    }, 2500);
    
    setTimeout(() => {
        showNotification("Накопичуйте енергію та купуйте покращення для захисту", 'info', 'Стратегія');
    }, 4500);
    
    setTimeout(() => {
        showNotification("Перша атака почнеться незабаром. Будьте готові!", 'warning', 'Увага');
    }, 6500);
}

// Ініціалізація фільтрів подій
function initializeEventFilters() {
    const filters = document.querySelectorAll('.event-filter');
    
    filters.forEach(filter => {
        filter.addEventListener('click', () => {
            // Знімаємо активний клас з усіх фільтрів
            filters.forEach(f => f.classList.remove('active'));
            
            // Додаємо активний клас до обраного
            filter.classList.add('active');
            
            // Оновлюємо панель подій
            updateEventsPanel();
        });
    });
}

// Запуск гри
function startGame() {
    updateTeamStatus();
    updateCityPowerStatus();
    updateUpgradeButtons();
    updateIncomeRate();
    balanceUpdateInterval = setInterval(updateBalancePeriodically, 1000);
    scheduleNextAttack();
    updateLivesDisplay();
    updateVictoryUI();
    
    // Затримуємо показ етапу щоб не змішувався з вітальними повідомленнями
    setTimeout(() => {
        showVictoryStageMessage();
    }, 7000);
}

// Функції для роботи з містами

// Зменшення здоров'я міста
function startHealthDecrease(cityName) {
    if (cityHealth[cityName].timer) return;

    cityHealth[cityName].current = 100;
    updateHealthBar(cityName, 100);

    const decreaseInterval = 100;
    const totalTime = 60000;
    const steps = totalTime / decreaseInterval;
    const decreasePerStep = 100 / steps;

    cityHealth[cityName].timer = setInterval(() => {
        cityHealth[cityName].current = Math.max(0, cityHealth[cityName].current - decreasePerStep);
        updateHealthBar(cityName, cityHealth[cityName].current);

        if (cityHealth[cityName].current <= 0) {
            clearInterval(cityHealth[cityName].timer);
            cityHealth[cityName].timer = null;
            disableCity(cityName);
            showNotification(`${cityName} втратив всі ресурси!`, 'attack', 'Місто знеструмлене');
        }
    }, decreaseInterval);
}

// Відключення міста
function disableCity(cityName) {
    const marker = cityMarkers[cityName];

    if (cityHealthMarkers[cityName]) {
        cityHealthMarkers[cityName].marker.setOpacity(0);
    }

    // Оновлюємо клас маркера
    updateCityVisual(cityName, 'city-marker disabled');
    loseLife();
}

// Включення міста
function enableCity(cityName) {
    const marker = cityMarkers[cityName];

    if (cityDisabledLayers[cityName]) {
        map.removeLayer(cityDisabledLayers[cityName]);
        delete cityDisabledLayers[cityName];
    }

    updateCityVisual(cityName, 'city-marker powered');
}

// Зупинка зменшення здоров'я
function stopHealthDecrease(cityName) {
    if (cityHealth[cityName].timer) {
        clearInterval(cityHealth[cityName].timer);
        cityHealth[cityName].timer = null;
    }
}

// Скидання здоров'я міста
function resetCityHealth(cityName) {
    cityHealth[cityName].current = 100;
    updateHealthBar(cityName, 100);
    enableCity(cityName);
}

// Оновлення статусу електропостачання міст
function updateCityPowerStatus() {
    const { distribution, stats } = calculatePowerDistribution();
    updateIncomeRate();

    for (const [city, marker] of Object.entries(cityMarkers)) {
        const powered = distribution[city] || false;
        const wasPowered = cityHealth[city].powered;
        cityHealth[city].powered = powered;

        if (wasPowered !== powered) {
            if (powered) {
                stopHealthDecrease(city);
                resetCityHealth(city);
                updateCityHealthIndicator(city, false);
                updateCityVisual(city, 'city-marker powered');
                showNotification(`${city} відновлено електропостачання`, 'repair');
            } else {
                resetCityHealth(city);
                updateCityHealthIndicator(city, true);
                startHealthDecrease(city);
                updateCityVisual(city, 'city-marker unpowered');
                showNotification(`${city} втратив електропостачання!`, 'attack');
            }
        }
    }

    const poweredCount = Object.values(distribution).filter(v => v).length;
    updateStatusPanel(poweredCount, Object.keys(cityMarkers).length, stats);
    updateIncomeRate();
    updateVictoryProgress();
}

// Система перемоги

// Перевірка чи всі міста підключені
function checkAllCitiesPowered() {
    const { distribution } = calculatePowerDistribution();
    const poweredCount = Object.values(distribution).filter(v => v).length;
    const totalCities = Object.keys(cities).length;
    return poweredCount === totalCities;
}

// Перевірка тривалості стабільності
function checkStabilityDuration() {
    if (!checkAllCitiesPowered()) {
        allCitiesPoweredStartTime = null;
        return false;
    }

    if (!allCitiesPoweredStartTime) {
        allCitiesPoweredStartTime = Date.now();
        return false;
    }

    const duration = Date.now() - allCitiesPoweredStartTime;
    return duration >= 180000; // 3 хвилини
}

// Оновлення прогресу перемоги
function updateVictoryProgress() {
    if (isVictorious || isGameOver) return;

    const stage = victoryStages[currentStage];
    if (!stage) return;

    // Перевірка умови поточного етапу
    if (stage.condition()) {
        if (currentStage === victoryStages.length - 1) {
            // Останній стадій - перемога!
            achieveVictory();
            return;
        } else {
            // Перехід до наступного етапу
            currentStage++;
            stageStartTime = Date.now();
            allCitiesPoweredStartTime = null; // Скидаємо для нового етапу
            showVictoryStageMessage();
        }
    }

    // Перевірка на тайм-аут (якщо є)
    if (stage.timeLimit) {
        const elapsed = Date.now() - stageStartTime;
        if (elapsed > stage.timeLimit && !stage.condition()) {
            // Провал етапу через тайм-аут
            showNotification(`Етап "${stage.name}" провалено! Час вийшов.`, 'warning');
            // Можна додати штраф або перезапуск етапу
        }
    }

    updateVictoryUI();
}

// Показ повідомлення про новий етап
function showVictoryStageMessage() {
    const stage = victoryStages[currentStage];
    if (stage) {
        showNotification(`${stage.name}: ${stage.description}`, 'achievement', `Етап ${currentStage + 1}`);
    }
}

// Досягнення перемоги
function achieveVictory() {
    isVictorious = true;
    clearInterval(balanceUpdateInterval);
    clearTimeout(attackTimeout);

    // Показуємо екран перемоги
    showVictoryScreen();
}

// Показ екрану перемоги
function showVictoryScreen() {
    const victoryScreen = document.createElement('div');
    victoryScreen.id = 'victory-screen';
    victoryScreen.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 100, 0, 0.8);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 2000;
        color: white;
        font-family: sans-serif;
    `;

    victoryScreen.innerHTML = `
        <h1 style="font-size: 48px; margin-bottom: 20px; text-shadow: 0 0 20px #00ff00;">🎉 ПЕРЕМОГА! 🎉</h1>
        <h2 style="font-size: 24px; margin-bottom: 30px;">Енергосистема України відновлена!</h2>
        <div style="background: rgba(0,0,0,0.5); padding: 20px; border-radius: 10px; text-align: center;">
            <p>✅ Всі міста підключені до мережі</p>
            <p>⚡ Накопичено ${Math.floor(energyResources)} МВт·год</p>
            <p>🛡️ Система стабілізована</p>
        </div>
        <button id="victory-restart" style="
            margin-top: 30px;
            padding: 15px 30px;
            font-size: 18px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            transition: background 0.3s;
        ">Грати знову</button>
    `;

    document.body.appendChild(victoryScreen);

    document.getElementById('victory-restart').addEventListener('click', () => {
        location.reload();
    });
}

// Оновлення UI перемоги
function updateVictoryUI() {
    const progressEl = document.getElementById('victory-progress');
    if (!progressEl || isVictorious) return;

    const stage = victoryStages[currentStage];
    if (!stage) return;

    // Оновлюємо заголовок
    const header = progressEl.querySelector('.stage-header');
    header.textContent = `${stage.icon} Етап ${currentStage + 1}: ${stage.name}`;

    // Оновлюємо опис
    const description = progressEl.querySelector('.stage-description');
    description.textContent = stage.description;

    // Оновлюємо прогрес-бар
    const progressFill = progressEl.querySelector('.victory-progress-fill');
    let progress = 0;

    switch (currentStage) {
        case 0: // Пережити 3 атаки
            progress = Math.min((survivedAttacks / 3) * 100, 100);
            break;

        case 1: // Накопити ресурси
            progress = Math.min((energyResources / 2500) * 100, 100);
            break;

        case 2: // Стабільність
            if (checkAllCitiesPowered() && allCitiesPoweredStartTime) {
                const elapsed = Date.now() - allCitiesPoweredStartTime;
                progress = Math.min((elapsed / 180000) * 100, 100);
            } else {
                progress = 0;
            }
            break;
    }

    progressFill.style.width = `${progress}%`;

    // Оновлюємо таймер
    const timer = progressEl.querySelector('.stage-timer');
    if (currentStage === 2) {
        // Показуємо скільки залишилось витримати до 3 хв без відключень
        if (checkAllCitiesPowered() && allCitiesPoweredStartTime) {
            const elapsed = Date.now() - allCitiesPoweredStartTime;
            const remaining = Math.max(0, 180000 - elapsed);
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            timer.textContent = `Залишилось витримати: ${minutes}:${seconds.toString().padStart(2, '0')}`;
            timer.style.color = remaining < 60000 ? '#FF5252' : '#FFD700';
        } else {
            // Якщо хоч одне місто від'єднане — починаємо заново з 3:00
            timer.textContent = `Залишилось витримати: 3:00`;
            timer.style.color = '#FFD700';
        }
    } else if (stage.timeLimit) {
        const elapsed = Date.now() - stageStartTime;
        const remaining = Math.max(0, stage.timeLimit - elapsed);
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        timer.textContent = `Час: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        timer.style.color = remaining < 60000 ? '#FF5252' : '#FFD700';
    } else {
        timer.textContent = '';
    }
}