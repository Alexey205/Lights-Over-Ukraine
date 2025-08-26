// Ігрові змінні
let map;
const cityMarkers = {};
const lineLayers = [];
const powerStationMarkers = {};
const cityHealth = {};
const cityHealthMarkers = {};
const cityDisabledLayers = {};
let repairTeams = 1;
let difficultyMultiplier = 1;
let lastAttackTime = Date.now();
let gameStartTime = Date.now();
let energyResources = 0;
const efficiencyFactor = 0.05;
let isGameRunning = true;
let resourceUpdateCooldown = false;
let currentIncomeRate = 0;
let balanceUpdateInterval;
let lives = 3;
const maxLives = 3;
let isGameOver = false;
let attackTimeout;

// Система етапів перемоги
let currentStage = 0;
let stageStartTime = Date.now();
let allCitiesPoweredStartTime = null;
let isVictorious = false;
let survivedAttacks = 0;

// Функція для оновлення доходу
function updateIncomeRate() {
    const { stats } = calculatePowerDistribution();
    const currentSurplus = stats.totalProduction - stats.totalConsumption;

    if (currentSurplus > 0) {
        currentIncomeRate = Math.floor(currentSurplus * 0.01 * 60);
    } else {
        currentIncomeRate = 0;
    }

    document.getElementById("incomeRate").textContent = currentIncomeRate;
}

// Функція для періодичного оновлення балансу
function updateBalancePeriodically() {
    if (currentIncomeRate > 0) {
        energyResources += currentIncomeRate / 60;
        updateResourceUI();
        updateUpgradeButtons();
    }
    updateVictoryProgress();
}

// Функція для покупки апгрейдів
function buyUpgrade(type) {
    const upgrade = upgrades[type];
    if (energyResources >= upgrade.cost) {
        energyResources -= upgrade.cost;
        updateResourceUI();

        const result = upgrade.effect();

        if (type === 'powerPlant' && result) {
            const ps = powerStationMarkers[result];
            showUpgradeNotification(`${ps.type} "${result}" покращено! +200 МВт`);
            blinkPowerStation(result);
        } else if (type === 'team') {
            showUpgradeNotification(`Найнято додаткову ремонтну бригаду!`);
        }

        updateCityPowerStatus();
        updateIncomeRate();
    } else {
        showNotification(`Недостатньо ресурсів! Потрібно ${upgrade.cost} МВт·год`, 'warning');
    }
}

// Функція для покупки апгрейду ліній
function buyLineUpgrade() {
    if (lineUpgrades.level >= lineUpgrades.maxLevel) {
        showNotification("Лінії вже максимально покращені!", 'warning');
        return;
    }

    const next = lineUpgrades.level + 1;
    const cost = lineUpgrades.costs[next];

    if (energyResources >= cost) {
        energyResources -= cost;
        lineUpgrades.level = next;
        updateResourceUI();

        lineLayers.forEach(conn => {
            conn.line.setStyle({
                color: lineUpgrades.colors[next],
                weight: lineUpgrades.weights[next]
            });
        });

        updateUpgradeButtons();
        updateIncomeRate();
        showUpgradeNotification(`Лінії покращено до рівня "${lineUpgrades.levels[next]}"`);

        // Ефект апгрейду на всіх лініях
        lineLayers.forEach(conn => {
            const midPoint = [(conn.line.getLatLngs()[0].lat + conn.line.getLatLngs()[1].lat) / 2,
            (conn.line.getLatLngs()[0].lng + conn.line.getLatLngs()[1].lng) / 2];
            createUpgradeEffect(midPoint);
        });
    } else {
        showNotification(`Недостатньо ресурсів! Потрібно ${cost} МВт·год`, 'warning');
    }
}

// Функція для покупки автоматичного ремонту
function buyAutoRepair() {
    if (!lineUpgrades.autoRepair.unlocked) {
        if (energyResources >= lineUpgrades.autoRepair.cost) {
            energyResources -= lineUpgrades.autoRepair.cost;
            lineUpgrades.autoRepair.unlocked = true;
            lineUpgrades.autoRepair.active = true;
            updateResourceUI();
            updateUpgradeButtons();
            startAutoRepair();
            showUpgradeNotification("Автоматичний ремонт активовано та увімкнено!");
        } else {
            showNotification(`Недостатньо ресурсів! Потрібно ${lineUpgrades.autoRepair.cost} МВт·год`, 'warning');
        }
    }
    else {
        lineUpgrades.autoRepair.active = !lineUpgrades.autoRepair.active;
        updateUpgradeButtons();
        if (lineUpgrades.autoRepair.active) {
            startAutoRepair();
            showNotification("Автоматичний ремонт увімкнено!", 'info');
        } else {
            clearAllAutoRepairs();
            showNotification("Автоматичний ремонт вимкнено!", 'warning');
        }
    }
}

// Функція для автоматичного ремонту
function startAutoRepair() {
    if (!lineUpgrades.autoRepair.unlocked || !lineUpgrades.autoRepair.active) return;

    const damagedLines = lineLayers.filter(line => line.damaged);

    if (repairTeams > 0 && damagedLines.length > 0) {
        const lineToRepair = damagedLines[0];
        repairTeams--;
        updateTeamStatus();

        const repairTime = repairTimes['line'] * lineUpgrades.autoRepair.repairSpeed *
            lineUpgrades.repairTimes[lineUpgrades.level];

        showProgressBar(lineToRepair.damageMarker.getLatLng(), repairTime, () => {
            repairLine(lineToRepair);
            repairTeams++;
            updateTeamStatus();
            setTimeout(startAutoRepair, 0);
        });
    }
}

// Функція для очищення автоматичних ремонтів
function clearAllAutoRepairs() {
    lineLayers.forEach(line => {
        if (line.repairTimer) {
            clearTimeout(line.repairTimer);
            line.repairTimer = null;
        }
    });
}

// Функція для розрахунку розподілу електроенергії
function calculatePowerDistribution() {
    const graph = buildGraph();

    const workingStations = Object.entries(powerStationMarkers)
        .filter(([_, ps]) => !ps.damaged)
        .map(([name, ps]) => ({
            name,
            powerOutput: ps.powerOutput,
            remainingPower: ps.powerOutput,
            cities: []
        }));

    workingStations.sort((a, b) => b.powerOutput - a.powerOutput);

    const result = {};
    const poweredCities = new Set();

    for (const station of workingStations) {
        const reachableCities = Object.keys(cities).filter(city =>
            !poweredCities.has(city) && hasPath(graph, city, station.name)
        );

        reachableCities.sort((a, b) => {
            const distA = getDistance(cities[a].coords, powerStationMarkers[station.name].marker.getLatLng());
            const distB = getDistance(cities[b].coords, powerStationMarkers[station.name].marker.getLatLng());
            return distA - distB;
        });

        for (const city of reachableCities) {
            if (station.remainingPower >= cities[city].powerNeed) {
                station.cities.push(city);
                station.remainingPower -= cities[city].powerNeed;
                poweredCities.add(city);
                result[city] = true;
            }
        }
    }

    const totalProduction = workingStations.reduce((sum, s) => sum + s.powerOutput, 0);
    const totalConsumption = Object.values(cities).reduce((sum, c) => sum + c.powerNeed, 0);
    const poweredConsumption = workingStations.reduce((sum, s) => sum + (s.powerOutput - s.remainingPower), 0);

    return {
        distribution: result,
        stats: { totalProduction, totalConsumption, poweredConsumption }
    };
}

// Функція для побудови графа з'єднань
function buildGraph() {
    const graph = {};
    Object.keys(cities).forEach(name => graph[name] = []);
    Object.keys(powerStationMarkers).forEach(name => graph[name] = []);

    for (const { from, to, damaged } of lineLayers) {
        if (!damaged) {
            graph[from].push(to);
            graph[to].push(from);
        }
    }
    return graph;
}

// Функція для перевірки існування шляху
function hasPath(graph, start, goal) {
    if (start === goal) return true;
    const visited = new Set();
    const queue = [start];
    while (queue.length) {
        const node = queue.shift();
        if (node === goal) return true;
        visited.add(node);
        for (const neighbor of graph[node] || []) {
            if (!visited.has(neighbor)) queue.push(neighbor);
        }
    }
    return false;
}

// Функція для розрахунку відстані
function getDistance(latLng1, latLng2) {
    const R = 6371;
    const dLat = (latLng2.lat - latLng1[0]) * Math.PI / 180;
    const dLon = (latLng2.lng - latLng1[1]) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(latLng1[0] * Math.PI / 180) * Math.cos(latLng2.lat * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Функція для отримання середньої точки
function midpoint(coord1, coord2) {
    return [(coord1[0] + coord2[0]) / 2, (coord1[1] + coord2[1]) / 2];
}

// Функція для ремонту електростанції
function repairPowerStation(name) {
    const ps = powerStationMarkers[name];
    if (!ps.damaged) return;

    if (repairTeams <= 0) {
        showNotification("Недостатньо бригад! Зачекайте, поки звільниться хоча б одна.", 'warning');
        return;
    }

    repairTeams--;
    updateTeamStatus();

    showProgressBar(ps.marker.getLatLng(), repairTimes[ps.type] * difficultyMultiplier, () => {
        ps.damaged = false;
        if (ps.fire) {
            map.removeLayer(ps.fire);
            ps.fire = null;
        }

        // Оновлюємо клас елемента
        updatePowerStationVisual(name, false);

        // Ефекти ремонту
        createRepairEffect(ps.marker.getLatLng());
        createParticleEffect(ps.marker.getLatLng(), 'repair');

        showRepairNotification(`${ps.type} "${name}" відремонтовано!`);

        repairTeams++;
        updateTeamStatus();
        updateCityPowerStatus();
        updateIncomeRate();
    });
}

// Функція для ремонту ліній
function repairLine(line) {
    if (!line.damaged) return;

    line.damaged = false;
    line.line.setStyle({
        color: lineUpgrades.colors[lineUpgrades.level],
        weight: lineUpgrades.weights[lineUpgrades.level]
    });
    line.damageMarker.setOpacity(0);

    // Ефекти ремонту
    createRepairEffect(line.damageMarker.getLatLng());
    createParticleEffect(line.damageMarker.getLatLng(), 'repair');

    if (line.repairTimer) {
        clearTimeout(line.repairTimer);
        line.repairTimer = null;
    }

    showRepairNotification("Лінію електропередачі відремонтовано");

    updateCityPowerStatus();
    updateIncomeRate();
}

// Функція симуляції атаки
function simulateAttack() {
    if (!isGameRunning) return;

    let attackExecuted = false;
    const now = Date.now();

    if (Math.random() < 0.7) {
        const workingLines = lineLayers.filter(line => !line.damaged);
        if (workingLines.length > 0) {
            const randomLine = workingLines[Math.floor(Math.random() * workingLines.length)];

            const dmgChance = lineUpgrades.damageChances[lineUpgrades.level];
            if (Math.random() < dmgChance) {
                randomLine.damaged = true;
                randomLine.line.setStyle({
                    color: '#ff0000',
                    className: 'power-line damaged'
                });
                randomLine.damageMarker.setOpacity(1);
                attackExecuted = true;

                // Ефект атаки
                createLightningEffect(randomLine.damageMarker.getLatLng());
                createParticleEffect(randomLine.damageMarker.getLatLng(), 'damage');

                showAttackNotification("Лінію електропередачі пошкоджено!");

                if (lineUpgrades.autoRepair.unlocked && lineUpgrades.autoRepair.active) {
                    if (repairTeams > 0 && !randomLine.repairInProgress) {
                        randomLine.repairInProgress = true;
                        repairTeams--;
                        updateTeamStatus();

                        const repairTime = repairTimes['line'] *
                            lineUpgrades.autoRepair.repairSpeed *
                            lineUpgrades.repairTimes[lineUpgrades.level];

                        showProgressBar(
                            randomLine.damageMarker.getLatLng(),
                            repairTime,
                            () => {
                                if (randomLine.damaged) {
                                    repairLine(randomLine);
                                }
                                randomLine.repairInProgress = false;
                                repairTeams++;
                                updateTeamStatus();
                            }
                        );
                    } else if (repairTeams <= 0) {
                        randomLine.repairTimer = setTimeout(() => {
                            if (randomLine.damaged && lineUpgrades.autoRepair.active) {
                                repairLine(randomLine);
                            }
                        }, 2000);
                    }
                }
            } else {
                showNotification("Атака відбита! Міцні лінії витримали удар.", 'info', 'Захист спрацював');
            }
        }
    }

    if (!attackExecuted && Math.random() < 0.3) {
        const workingStations = Object.values(powerStationMarkers)
            .filter(ps => !ps.damaged && ps.type === 'ТЕС');

        if (workingStations.length > 0) {
            const randomStation = workingStations[Math.floor(Math.random() * workingStations.length)];
            randomStation.damaged = true;

            // Створення ефекту пожежі
            const fireContainer = L.DomUtil.create('div', '');
            fireContainer.innerHTML = '<span style="font-size:20px;line-height:20px;color:#ff5722;text-shadow:0 0 10px #ff5722;">🔥</span>';

            randomStation.fire = L.marker(randomStation.marker.getLatLng(), {
                icon: L.divIcon({
                    className: '',
                    html: fireContainer.outerHTML,
                    iconSize: [20, 20],
                    iconAnchor: [10, 20]
                }),
                zIndexOffset: 2001
            }).addTo(map);

            // Оновлення класу станції
            const stationName = Object.keys(powerStationMarkers).find(name => powerStationMarkers[name] === randomStation);
            updatePowerStationVisual(stationName, true);

            // Ефекти атаки
            createLightningEffect(randomStation.marker.getLatLng());
            createParticleEffect(randomStation.marker.getLatLng(), 'damage');

            showAttackNotification(`${randomStation.type} "${stationName}" пошкоджено!`);

            attackExecuted = true;
        }
    }

    if (attackExecuted) {
        updateCityPowerStatus();

        if (lineUpgrades.autoRepair.unlocked && lineUpgrades.autoRepair.active) {
            setTimeout(() => {
                const damagedLines = lineLayers.filter(line =>
                    line.damaged &&
                    !line.repairInProgress &&
                    !line.repairTimer
                );

                if (damagedLines.length > 0 && repairTeams > 0) {
                    const lineToRepair = damagedLines[0];
                    lineToRepair.repairInProgress = true;
                    repairTeams--;
                    updateTeamStatus();

                    const repairTime = repairTimes['line'] *
                        lineUpgrades.autoRepair.repairSpeed *
                        lineUpgrades.repairTimes[lineUpgrades.level];

                    showProgressBar(
                        lineToRepair.damageMarker.getLatLng(),
                        repairTime,
                        () => {
                            repairLine(lineToRepair);
                            lineToRepair.repairInProgress = false;
                            repairTeams++;
                            updateTeamStatus();
                        }
                    );
                }
            }, 1500);
        }
    }

    difficultyMultiplier = Math.min(2, 0.7 + (now - gameStartTime) / 1800000);
    scheduleNextAttack();

    survivedAttacks++;
    updateVictoryProgress();
}

// Функція для планування наступної атаки
function scheduleNextAttack() {
    const now = Date.now();
    const timeSinceLast = now - lastAttackTime;
    const timeSinceStart = (now - gameStartTime) / 1000; // у секундах

    // Початкова пауза на 8 секунд для вітальних повідомлень
    if (timeSinceStart < 8) {
        setTimeout(() => {
            simulateAttack();
            lastAttackTime = Date.now();
        }, (8 - timeSinceStart) * 1000 + 2000); // +2 секунди після паузи
        return;
    }

    const timeSinceStartMinutes = timeSinceStart / 60;
    const baseDelay = Math.max(5000, 15000 - timeSinceStartMinutes * 300);
    const dynamicDelay = Math.min(20000, Math.max(3000, baseDelay));

    setTimeout(() => {
        simulateAttack();
        lastAttackTime = Date.now();
        difficultyMultiplier = Math.min(2, 0.7 + timeSinceStartMinutes / 30);
    }, dynamicDelay);
}

// Функція для втрати життя
function loseLife() {
    if (isGameOver) return;

    lives--;
    updateLivesDisplay();

    if (lives <= 0) {
        endGame();
    } else {
        showNotification("Ви втратили одне життя!", 'warning', 'Втрата життя');
    }
}

// Функція завершення гри
function endGame() {
    isGameOver = true;
    document.getElementById('game-over').style.display = 'flex';
    clearInterval(balanceUpdateInterval);
    clearTimeout(attackTimeout);
    showNotification("Гра завершена! Ви втратили всі життя.", 'warning', 'Кінець гри');
}

// Функція перезапуску гри
function restartGame() {
    // Скидання змінних етапів
    currentStage = 0;
    stageStartTime = Date.now();
    allCitiesPoweredStartTime = null;
    isVictorious = false;

    document.getElementById('game-over').style.opacity = '0';
    setTimeout(() => location.reload(), 500);
}