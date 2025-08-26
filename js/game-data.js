// Дані міст України
const cities = {
    'Київ': { coords: [50.45, 30.52], powerNeed: 1500 },
    'Львів': { coords: [49.84, 24.03], powerNeed: 800 },
    'Харків': { coords: [49.99, 36.23], powerNeed: 1200 },
    'Одеса': { coords: [46.48, 30.73], powerNeed: 900 },
    'Дніпро': { coords: [48.45, 34.98], powerNeed: 1100 },
    'Запоріжжя': { coords: [47.84, 35.14], powerNeed: 700 },
    'Луцьк': { coords: [50.75, 25.33], powerNeed: 400 },
    'Івано-Франківськ': { coords: [48.92, 24.71], powerNeed: 450 },
    'Тернопіль': { coords: [49.55, 25.59], powerNeed: 350 },
    'Рівне': { coords: [50.62, 26.25], powerNeed: 300 },
    'Чернівці': { coords: [48.29, 25.94], powerNeed: 400 },
    'Вінниця': { coords: [49.23, 28.48], powerNeed: 500 },
    'Житомир': { coords: [50.25, 28.66], powerNeed: 400 },
    'Полтава': { coords: [49.59, 34.55], powerNeed: 600 },
    'Кропивницький': { coords: [48.51, 32.26], powerNeed: 450 },
    'Миколаїв': { coords: [46.97, 31.99], powerNeed: 550 },
    'Херсон': { coords: [46.63, 32.6], powerNeed: 500 },
    'Чернігів': { coords: [51.5, 31.3], powerNeed: 450 },
    'Суми': { coords: [50.92, 34.78], powerNeed: 400 },
    'Ужгород': { coords: [48.62, 22.3], powerNeed: 350 },
    'Черкаси': { coords: [49.44, 32.06], powerNeed: 400 },
    'Хмельницький': { coords: [49.42, 27.0], powerNeed: 450 },
    'Краматорськ': { coords: [48.74, 37.58], powerNeed: 300 },
    'Маріуполь': { coords: [47.1, 37.55], powerNeed: 600 },
    'Сімферополь': { coords: [44.95, 34.1], powerNeed: 700 },
    'Севастополь': { coords: [44.61, 33.53], powerNeed: 500 },
    'Мелітополь': { coords: [46.85, 35.37], powerNeed: 250 },
    'Луганськ': { coords: [48.57, 39.32], powerNeed: 400 },
    'Керч': { coords: [45.35, 36.47], powerNeed: 200 },
    'Нікополь': { coords: [47.57, 34.4], powerNeed: 300 },
    'Біла Церква': { coords: [49.8, 30.12], powerNeed: 200 },
    'Кременчук': { coords: [49.07, 33.42], powerNeed: 350 },
    'Кривий Ріг': { coords: [47.91, 33.39], powerNeed: 800 }
};

// Дані електростанцій України
const powerStations = [
    { name: 'Бурштинська ТЕС', coords: [49.26, 24.63], type: 'ТЕС', powerOutput: 2800 },
    { name: 'Південноукраїнська АЕС', coords: [47.82, 31.18], type: 'АЕС', powerOutput: 3500 },
    { name: 'Хмельницька АЕС', coords: [50.37, 26.64], type: 'АЕС', powerOutput: 2500 },
    { name: 'Київська ГЕС', coords: [50.58, 30.5], type: 'ГЕС', powerOutput: 500 },
    { name: 'Запорізька АЕС', coords: [47.51, 34.58], type: 'АЕС', powerOutput: 6500 },
    { name: 'Трипільська ТЕС', coords: [50.13, 30.79], type: 'ТЕС', powerOutput: 2200 },
    { name: 'Криворізька ТЕС', coords: [47.98, 33.38], type: 'ТЕС', powerOutput: 1600 },
    { name: 'Кременчуцька ГЕС', coords: [49.10, 33.42], type: 'ГЕС', powerOutput: 450 },
    { name: 'Ботієвська ВЕС', coords: [46.85, 36.0], type: 'ВЕС', powerOutput: 400 }
];

// З'єднання між містами та електростанціями
const connections = [
    ['Київ', 'Житомир'], ['Ботієвська ВЕС', 'Запоріжжя'], ['Житомир', 'Рівне'], ['Рівне', 'Луцьк'], ['Луцьк', 'Львів'],
    ['Київ', 'Чернігів'], ['Київ', 'Черкаси'], ['Київ', 'Полтава'], ['Київ', 'Трипільська ТЕС'],
    ['Полтава', 'Харків'], ['Полтава', 'Краматорськ'], ['Краматорськ', 'Маріуполь'],
    ['Краматорськ', 'Дніпро'], ['Дніпро', 'Запоріжжя'], ['Дніпро', 'Криворізька ТЕС'],
    ['Дніпро', 'Кропивницький'], ['Кропивницький', 'Черкаси'], ['Кропивницький', 'Миколаїв'],
    ['Миколаїв', 'Одеса'], ['Миколаїв', 'Херсон'], ['Херсон', 'Сімферополь'],
    ['Сімферополь', 'Севастополь'], ['Вінниця', 'Київ'], ['Вінниця', 'Хмельницький'],
    ['Хмельницький', 'Тернопіль'], ['Тернопіль', 'Івано-Франківськ'],
    ['Івано-Франківськ', 'Чернівці'], ['Ужгород', 'Івано-Франківськ'],
    ['Суми', 'Харків'], ['Суми', 'Чернігів'],
    ['Південноукраїнська АЕС', 'Миколаїв'],
    ['Київська ГЕС', 'Київ'], ['Кременчуцька ГЕС', 'Кременчук'], ['Криворізька ТЕС', 'Кривий Ріг'],
    ['Трипільська ТЕС', 'Біла Церква'], ['Запорізька АЕС', 'Запоріжжя'],
    ['Мелітополь', 'Запоріжжя'], ['Луганськ', 'Краматорськ'],
    ['Керч', 'Сімферополь'], ['Нікополь', 'Запоріжжя'], ['Біла Церква', 'Київ'], ['Кременчук', 'Полтава'],
    ['Бурштинська ТЕС', 'Івано-Франківськ'],
    ['Хмельницька АЕС', 'Рівне'],
    ['Вінниця', 'Кропивницький']
];

// Час ремонту для різних типів об'єктів (в мілісекундах)
const repairTimes = {
    'АЕС': 8000,
    'ТЕС': 5000,
    'ГЕС': 4000,
    'ВЕС': 3000,
    'line': 2000
};

// Система апгрейдів ліній електропередач
const lineUpgrades = {
    level: 0,
    maxLevel: 3,
    levels: ["Базові", "Укріплені", "Надійні", "Ідеальні"],
    damageChances: [0.7, 0.55, 0.4, 0.25],
    repairTimes: [1.0, 0.85, 0.7, 0.55],
    costs: [0, 300, 500, 700],
    colors: ['#888', '#007BFF', '#4CAF50', '#FFD700'],
    weights: [2, 3, 4, 5],
    autoRepair: {
        unlocked: false,
        active: false,
        cost: 800,
        repairSpeed: 0.5
    }
};

// Система апгрейдів
const upgrades = {
    team: {
        cost: 100,
        effect: () => {
            repairTeams++;
            const perCityIncrease = 50 / Object.keys(cities).length;
            for (const city in cities) {
                cities[city].powerNeed += perCityIncrease;
            }
        }
    },
    powerPlant: {
        cost: 300,
        effect: () => {
            const stationNames = Object.keys(powerStationMarkers)
                .filter(name => powerStationMarkers[name].type !== 'АЕС');

            if (stationNames.length === 0) {
                showWarning("Немає доступних станцій для покращення!", false);
                return null;
            }
            const name = stationNames[Math.floor(Math.random() * stationNames.length)];
            powerStationMarkers[name].powerOutput += 200;
            updatePowerStationTooltip(name);
            return name;
        }
    }
};

// Етапи перемоги
const victoryStages = [
    {
        name: "Перші удари",
        description: "Переживіть 3 атаки",
        timeLimit: null,
        icon: "🛡️",
        condition: () => survivedAttacks >= 3
    },
    {
        name: "Накопичення ресурсів",
        description: "Накопіть 2500 МВт·год енергії",
        timeLimit: null,
        icon: "⚡",
        condition: () => energyResources >= 2500
    },
    {
        name: "Стабілізація системи",
        description: "Утримайте всі міста підключеними протягом 3 хвилин",
        timeLimit: null, // 3 хвилини стабільності
        icon: "🛡️",
        condition: () => checkStabilityDuration()
    }
];

// Допоміжні функції для іконок станцій
function getStationIcon(type) {
    const icons = {
        'АЕС': '⚛️',
        'ТЕС': '🏭',
        'ГЕС': '💧',
        'ВЕС': '💨'
    };
    return icons[type] || '⚡';
}

function getStationClass(type, damaged = false) {
    if (damaged) return 'power-station damaged';

    const classes = {
        'АЕС': 'power-station nuclear working',
        'ТЕС': 'power-station thermal working',
        'ГЕС': 'power-station hydro working',
        'ВЕС': 'power-station wind working'
    };
    return classes[type] || 'power-station working';
}