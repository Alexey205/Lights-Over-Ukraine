// Функції для оновлення інтерфейсу

// Оновлення ресурсів UI
function updateResourceUI() {
    document.getElementById("energyResources").textContent = Math.floor(energyResources);
}

// Оновлення кнопок апгрейдів
function updateUpgradeButtons() {
    const lineBtn = document.getElementById('lineUpgradeBtn');
    const lvl = lineUpgrades.level;
    const next = lvl + 1;

    if (next <= lineUpgrades.maxLevel) {
        const cost = lineUpgrades.costs[next];
        lineBtn.querySelector('.upgrade-cost').textContent = `${cost} МВт·год`;
        lineBtn.querySelector('.upgrade-effect').innerHTML = `
            <span style="color:#81C784">${lineUpgrades.levels[next]}</span><br>
            Шанс пошкодження: <b>${Math.round(lineUpgrades.damageChances[next] * 100)}%</b><br>
            Час ремонту: <b>${Math.round((1 - lineUpgrades.repairTimes[next]) * 100)}% швидше</b>
        `;
        lineBtn.disabled = energyResources < cost;
    } else {
        lineBtn.querySelector('.upgrade-effect').innerHTML = `
            <span style="color:#FFD700">${lineUpgrades.levels[lvl]} (макс)</span>
        `;
        lineBtn.disabled = true;
    }

    const autoRepairBtn = document.getElementById('autoRepairBtn');
    if (!lineUpgrades.autoRepair.unlocked) {
        autoRepairBtn.querySelector('.upgrade-cost').textContent = `${lineUpgrades.autoRepair.cost} МВт·год`;
        autoRepairBtn.disabled = energyResources < lineUpgrades.autoRepair.cost;
    } else {
        autoRepairBtn.querySelector('.upgrade-title').innerHTML = lineUpgrades.autoRepair.active ?
            '<span style="color:#EF5350">Вимкнути авторемонт</span>' :
            '<span style="color:#66BB6A">Увімкнути авторемонт</span>';
        autoRepairBtn.querySelector('.upgrade-icon').textContent = lineUpgrades.autoRepair.active ? '⛔️' : '▶️';
        autoRepairBtn.disabled = false;
    }

    document.querySelectorAll('.upgrade-btn').forEach(btn => {
        if (!btn.id || (btn.id !== 'lineUpgradeBtn' && btn.id !== 'autoRepairBtn')) {
            const cost = parseInt(btn.querySelector('.upgrade-cost').textContent);
            btn.disabled = energyResources < cost;
        }
    });
}

// Оновлення статусу бригад
function updateTeamStatus() {
    const teamElement = document.createElement('div');
    teamElement.id = 'teamsStatus';
    teamElement.className = 'status-panel';
    teamElement.innerHTML = `
    <div class="status-item">
      <span class="status-label">Ремонтні бригади:</span>
      <span class="status-value ${repairTeams > 0 ? 'status-good' : 'status-danger'}">
        ${repairTeams} доступно
      </span>
    </div>
  `;

    const statusPanel = document.getElementById('statusContent');
    const existingTeamElement = document.getElementById('teamsStatus');

    if (existingTeamElement) {
        statusPanel.replaceChild(teamElement, existingTeamElement);
    } else {
        statusPanel.appendChild(teamElement);
    }
}

// Оновлення статусної панелі
function updateStatusPanel(poweredCities, totalCities, stats) {
    const psStats = { 'ГЕС': [0, 0], 'АЕС': [0, 0], 'ТЕС': [0, 0], 'ВЕС': [0, 0] };
    for (const { name, type } of powerStations) {
        const ps = powerStationMarkers[name];
        if (ps.damaged) psStats[type][1]++;
        else psStats[type][0]++;
    }

    let workingLines = 0, damagedLines = 0;
    for (const conn of lineLayers) {
        if (conn.damaged) damagedLines++;
        else workingLines++;
    }

    const citiesPercentage = Math.round((poweredCities / totalCities) * 100);
    const linesPercentage = Math.round((workingLines / (workingLines + damagedLines)) * 100);
    const deficit = Math.round(stats.totalConsumption - stats.totalProduction);

    // Функція для отримання класу статусу
    const getStatusClass = (working, total) => {
        if (working === total) return 'status-good';
        if (working === 0) return 'status-danger';
        return 'status-warning';
    };

    const statusHTML = `
    <div class="status-panel">
      <div class="status-item">
        <span class="status-label">Міста зі світлом:</span>
        <div class="progress-with-text">
          <div class="progress-text">${poweredCities}/${totalCities}</div>
          <div class="progress-bar-small" style="width: ${citiesPercentage}%"></div>
        </div>
      </div>
      
      <div class="status-item">
        <span class="status-label">Лінії електропередач:</span>
        <div class="progress-with-text">
          <div class="progress-text">${workingLines}/${workingLines + damagedLines}</div>
          <div class="progress-bar-small" style="width: ${linesPercentage}%"></div>
        </div>
      </div>
      
      <div class="status-item">
        <span class="status-label">Виробництво енергії:</span>
        <span class="status-value status-good">${Math.round(stats.totalProduction)} МВт</span>
      </div>
      
      <div class="status-item">
        <span class="status-label">Споживання енергії:</span>
        <span class="status-value status-neutral">${Math.round(stats.totalConsumption)} МВт</span>
      </div>
      
      <div class="status-item">
        <span class="status-label">Баланс енергії:</span>
        <span class="status-value ${deficit <= 0 ? 'status-good' : 'status-danger'}">
          ${deficit <= 0 ? '+' + Math.abs(deficit) : '-' + deficit} МВт
        </span>
      </div>
    </div>
    
    <div class="status-panel">
      <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #BDBDBD; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 6px;">Електростанції</h3>
      
      <div class="station-status">
        <div class="station-icon-small">⚛️</div>
        <span class="station-name">Атомні (АЕС)</span>
        <span class="station-count ${getStatusClass(psStats['АЕС'][0], psStats['АЕС'][0] + psStats['АЕС'][1])}">
          ${psStats['АЕС'][0]}/${psStats['АЕС'][0] + psStats['АЕС'][1]}
        </span>
      </div>
      
      <div class="station-status">
        <div class="station-icon-small">🏭</div>
        <span class="station-name">Теплові (ТЕС)</span>
        <span class="station-count ${getStatusClass(psStats['ТЕС'][0], psStats['ТЕС'][0] + psStats['ТЕС'][1])}">
          ${psStats['ТЕС'][0]}/${psStats['ТЕС'][0] + psStats['ТЕС'][1]}
        </span>
      </div>
      
      <div class="station-status">
        <div class="station-icon-small">💧</div>
        <span class="station-name">Гідро (ГЕС)</span>
        <span class="station-count ${getStatusClass(psStats['ГЕС'][0], psStats['ГЕС'][0] + psStats['ГЕС'][1])}">
          ${psStats['ГЕС'][0]}/${psStats['ГЕС'][0] + psStats['ГЕС'][1]}
        </span>
      </div>
      
      <div class="station-status">
        <div class="station-icon-small">💨</div>
        <span class="station-name">Вітрові (ВЕС)</span>
        <span class="station-count ${getStatusClass(psStats['ВЕС'][0], psStats['ВЕС'][0] + psStats['ВЕС'][1])}">
          ${psStats['ВЕС'][0]}/${psStats['ВЕС'][0] + psStats['ВЕС'][1]}
        </span>
      </div>
    </div>
    
    <div id="teamsStatus"></div>
  `;

    document.getElementById('statusContent').innerHTML = statusHTML;
    updateTeamStatus();
}

// Оновлення відображення життів
function updateLivesDisplay() {
    const lifeElements = document.querySelectorAll('.life');
    lifeElements.forEach((el, index) => {
        el.style.display = index < lives ? 'inline-block' : 'none';
    });
}

// Оновлення індикатора здоров'я міста
function updateCityHealthIndicator(cityName, show) {
    if (show) {
        if (!cityHealthMarkers[cityName]) {
            const container = L.DomUtil.create('div', 'health-container');
            L.DomUtil.create('div', 'health-bar', container);

            const icon = L.divIcon({
                className: '',
                html: container.outerHTML,
                iconSize: [60, 6],
                iconAnchor: [30, 0]
            });

            const marker = L.marker(cities[cityName].coords, {
                icon,
                zIndexOffset: 1000
            }).addTo(map);

            cityHealthMarkers[cityName] = {
                marker
            };

            setTimeout(() => updateHealthBar(cityName, cityHealth[cityName].current), 0);
        } else {
            cityHealthMarkers[cityName].marker.setOpacity(1);
        }
    } else if (cityHealthMarkers[cityName]) {
        cityHealthMarkers[cityName].marker.setOpacity(0);
    }
}

// Оновлення панелі здоров'я
function updateHealthBar(cityName, percentage) {
    const healthMarker = cityHealthMarkers[cityName];
    if (healthMarker) {
        const el = healthMarker.marker.getElement();
        if (el) {
            const bar = el.querySelector('.health-bar');
            if (bar) {
                bar.style.width = `${percentage}%`;
            }
        }
    }
}

// Створення контенту для тултипу
function createTooltipContent(name, powerInfo) {
    if (powerStationMarkers[name]) {
        const ps = powerStationMarkers[name];
        return `<b>${name} (${ps.type})</b><div class="power-info">Потужність: ${ps.powerOutput} МВт</div>`;
    }
    return `<b>${name}</b><div class="power-info">${powerInfo}</div>`;
}

// Оновлення тултипу електростанції
function updatePowerStationTooltip(stationName) {
    const ps = powerStationMarkers[stationName];
    if (!ps) return;

    const newContent = createTooltipContent(
        stationName,
        `Потужність: ${ps.powerOutput} МВт`
    );

    const tooltip = ps.marker.getTooltip();
    if (tooltip && tooltip.isOpen()) {
        ps.marker.setTooltipContent(newContent);
    }

    ps.marker.unbindTooltip();
    ps.marker.bindTooltip(newContent, {
        permanent: false,
        direction: 'top'
    });
}