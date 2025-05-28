let chart;
let R_left = 0;
let C_left = 0;
let R_right = 0;
let C_right = 0;

function plotUnified() {
    const Ucc = 5, Uth = 2, U0 = 0.3;
    const lnArg = (Ucc - U0) / (Ucc - Uth);
    const delta = 0.2;
    const n = 4 , points = 6000;

    // Учёт единиц (килоОм и микрофарады -> секунды)
    const t1 = R_left * 1e3 * C_left * 1e-6 * Math.log(lnArg);
    const t2 = R_right * 1e3 *  C_right * 1e-6 * Math.log(lnArg);
    const T = t1 + t2;
    const dt = (n * T) / points;

    const t_arr = [];
    const u1 = [];
    const u2 = [];
    
    const D1 = t1/T;
    const D2 = t2/T;

    const timeOffset = T * 1.5; // Сдвигаем на половину периода

    for (let i = 0; i < points; i++) {
        const t = i * dt;
        // Добавляем смещение для расчетов
        const tWithOffset = t + timeOffset;
        const modT = tWithOffset % T;

        const val1 = modT < t1 ? Ucc : 0;
        const val2 = ((tWithOffset - t1) % T) >= t2 ? Ucc : 0;

        u1.push(-(val1 + delta));
        u2.push(val2 + delta);
        t_arr.push(t) // Отображаем на графике исходное время без смещения
    }

    chart.data.labels = t_arr;
    chart.data.datasets[0].data = u1.map(v => +v.toFixed(3));
    chart.data.datasets[1].data = u2.map(v => +v.toFixed(3));

    chart.data.datasets[0].label = `T1 (R=${R_left}kΩ, C=${C_left}μF)`;
    chart.data.datasets[1].label = `T2 (R=${R_right}kΩ, C=${C_right}μF)`;

    document.getElementById('t1Value').textContent = t1.toFixed(4);
    document.getElementById('t2Value').textContent = t2.toFixed(4);
    document.getElementById('TValue').textContent = T.toFixed(4);
    document.getElementById('D1Value').textContent = D1.toFixed(4);
    document.getElementById('D2Value').textContent = D2.toFixed(4);
    // скважность

    chart.update();
    startBlinking()
}




/* ---------- создать график с двумя сигналами ---------- */
function createUnifiedChart(ctx) {
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Канал 1',
                    data: [],
                    borderColor: '#facc15',
                    fill: false,
                    tension: 0,
                    pointRadius: 0,
                    borderWidth: 2
                },
                {
                    label: 'Канал 2',
                    data: [],
                    borderColor: '#3b82f6',
                    fill: false,
                    tension: 0,
                    pointRadius: 0,
                    borderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 0.1,
            animation: false,
            layout: { padding: 0 },
            scales: {
                x: {
                    type: 'linear',
                    title: { display: true, text: 't, с' },
                    min: 0
                },
                y: {
                    title: { display: true, text: 'U, В' },
                    min: -7,
                    max: 7,
                    grid: {
                        color: '#aaa'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top'
                }
            }
        }
    });
}

/* ---------- инициализация ---------- */
window.addEventListener('DOMContentLoaded', () => {
    const ctx = document.getElementById('chart1').getContext('2d');
    chart = createUnifiedChart(ctx);

    document.getElementById('runBtn').addEventListener('click', plotUnified);
     // первый запуск
});

// В начале файла script.js или через отдельный загрузчик
fetch('shema_num_no_border.svg')
    .then(res => res.text())
    .then(svg => {
        document.getElementById('svg-container').innerHTML = svg;
        init(); // инициализация логики после загрузки SVG
    });
function init() {
    // Объект для хранения соединений
    const connections = {
        top1: null,
        top2: null,
        top3: null,
        top4: null
    };

    // Значения для каждого соединения (временные)
    const values = {
        top1: {
            1: 10,
            2: 22,
            3: 47,
            4: 100,
            5: 220
        },
        top2: {
            1: 2,
            2: 4,
            3: 6,
            4: 8,
            5: 10
        },
        top3: {
            1: 2,
            2: 4,
            3: 6,
            4: 8,
            5: 10
        },
        top4: {
            1: 10,
            2: 22,
            3: 47,
            4: 100,
            5: 220
        }
    };

    // Маппинг между id ручек и id верхних кружков
    const handleToTop = {
        'handle-top1': 'top1',
        'handle-top2': 'top2',
        'handle-top3': 'top3',
        'handle-top4': 'top4'
    };

    // Получаем все элементы
    const smallCircles = document.querySelectorAll('.small-circle');
    const largeCircles = document.querySelectorAll('.large-circle');
    const connectionsGroup = document.getElementById('connections');
    const wireHandles = document.querySelectorAll('.wire-handle');
    const valuesList = document.getElementById('valuesList');
    const resetButton = document.getElementById('resetButton');

    // Для drag-and-drop
    let draggedHandle = null;
    let draggedWire = null;
    let svgElement = document.querySelector('svg');
    let svgPoint = svgElement.createSVGPoint();

    // Функция для получения координат относительно SVG
    function getCursorPosition(event) {
        svgPoint.x = event.clientX;
        svgPoint.y = event.clientY;
        return svgPoint.matrixTransform(svgElement.getScreenCTM().inverse());
    }

    // Функция для создания или обновления проводка с S-образным изгибом
    function createOrUpdateWire(topId, x2, y2) {
        const topCircle = document.getElementById(topId);
        const x1 = parseFloat(topCircle.getAttribute('cx'));
        const y1 = parseFloat(topCircle.getAttribute('cy'));

        // Проверяем наличие существующего проводка
        let wire = document.getElementById(`wire-${topId}`);

        if (!wire) {
            // Создаем новый проводок как путь, если его нет
            wire = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            wire.setAttribute('id', `wire-${topId}`);
            wire.setAttribute('class', 'connection');
            wire.setAttribute('fill', 'none');
            connectionsGroup.appendChild(wire);
        }

        // Создаем S-образную кривую с несколькими точками
        // Делим расстояние по Y на 3 части
        const yDist = y2 - y1;
        const y_1 = y1 + yDist * 0.5;
        const y_2 = y1 + yDist * 0.3;

        // Смещение для создания S-образной формы
        const offsetRight = 30;  // Смещение вправо
        const offsetLeft = -30;  // Смещение влево

        // Создаем точки для сплайна
        const d = `M ${x1} ${y1}
               C ${x1 + offsetRight} ${y1 + 10}, ${x1 + offsetRight} ${y_1}, ${x1} ${y_1}
               S ${x1 + offsetLeft} ${y_2}, ${x1} ${y_2}
               S ${x2} ${y2 - 10}, ${x2} ${y2}`;

        wire.setAttribute('d', d);

        return wire;
    }

    // Функция для определения топового ID ручки по классам
    function getTopIdFromHandle(handleElement) {
        if (handleElement.classList.contains('for-top1')) return 'top1';
        if (handleElement.classList.contains('for-top2')) return 'top2';
        if (handleElement.classList.contains('for-top3')) return 'top3';
        if (handleElement.classList.contains('for-top4')) return 'top4';

        // Запасной вариант - использовать маппинг по ID
        return handleToTop[handleElement.id];
    }

    // Функция для получения колонки из элемента по классам
    function getColumnFromCircle(circleElement) {
        if (circleElement.classList.contains('column-1')) return '1';
        if (circleElement.classList.contains('column-2')) return '2';
        if (circleElement.classList.contains('column-3')) return '3';
        if (circleElement.classList.contains('column-4')) return '4';
        return null;
    }

    // Функция для получения ряда из элемента по классам
    function getRowFromCircle(circleElement) {
        if (circleElement.classList.contains('row-1')) return '1';
        if (circleElement.classList.contains('row-2')) return '2';
        if (circleElement.classList.contains('row-3')) return '3';
        if (circleElement.classList.contains('row-4')) return '4';
        if (circleElement.classList.contains('row-5')) return '5';
        return null;
    }

    // Обработчики событий для перетаскивания проводков
    wireHandles.forEach(handle => {
        // Начало перетаскивания
        handle.addEventListener('mousedown', function(e) {
            e.preventDefault();
            draggedHandle = this;
            const topId = getTopIdFromHandle(this);

            // Удаляем существующее соединение, если есть
            if (connections[topId]) {
                connections[topId] = null;
            }

            // Создаем или обновляем проводок
            const cursorPos = getCursorPosition(e);
            draggedWire = createOrUpdateWire(topId, cursorPos.x, cursorPos.y);

            // Обновляем отображение значений
            updateValues();

        });
    });

    // Перемещение мыши
    document.addEventListener('mousemove', function(e) {
        if (draggedHandle) {
            const cursorPos = getCursorPosition(e);
            const topId = getTopIdFromHandle(draggedHandle);
            // Обновляем проводок при движении
            draggedWire = createOrUpdateWire(topId, cursorPos.x, cursorPos.y);
        }
    });

    // Завершение перетаскивания
    document.addEventListener('mouseup', function(e) {
        if (draggedHandle) {
            const topId = getTopIdFromHandle(draggedHandle);
            const cursorPos = getCursorPosition(e);

            // Проверяем, не пересекает ли проводок большой кружок
            let targetCircle = null;
            let minDistance = Infinity;

            largeCircles.forEach(circle => {
                const cx = parseFloat(circle.getAttribute('cx'));
                const cy = parseFloat(circle.getAttribute('cy'));
                const r = parseFloat(circle.getAttribute('r'));

                // Вычисляем расстояние от курсора до центра кружка
                const distance = Math.sqrt(Math.pow(cx - cursorPos.x, 2) + Math.pow(cy - cursorPos.y, 2));

                // Если курсор находится в пределах кружка и это ближайший кружок
                if (distance <= r && distance < minDistance) {
                    const column = getColumnFromCircle(circle);
                    // Проверяем, подходит ли колонка для данного верхнего кружка
                    if (
                        (topId === 'top1' && column === '1') ||
                        (topId === 'top2' && column === '2') ||
                        (topId === 'top3' && column === '3') ||
                        (topId === 'top4' && column === '4')
                    ) {
                        minDistance = distance;
                        targetCircle = circle;
                    }
                }
            });

            if (targetCircle) {
                // Если нашли подходящий кружок, фиксируем соединение
                const cx = parseFloat(targetCircle.getAttribute('cx'));
                const cy = parseFloat(targetCircle.getAttribute('cy'));
                draggedWire = createOrUpdateWire(topId, cx, cy);

                // Обновляем объект соединений
                connections[topId] = {
                    column: getColumnFromCircle(targetCircle),
                    row: getRowFromCircle(targetCircle),
                    circleId: targetCircle.id
                };

                // Подсветка соединенного кружка
                targetCircle.classList.add('selected');
                setTimeout(() => targetCircle.classList.remove('selected'), 500);
            } else {
                // Если не нашли подходящий кружок, удаляем проводок
                if (draggedWire) {
                    connectionsGroup.removeChild(draggedWire);
                }
            }

            draggedHandle = null;
            draggedWire = null;

            updateValues();
        }
    });

    // Кнопка сброса всех соединений
    resetButton.addEventListener('click', function() {
        while (connectionsGroup.firstChild) {
            connectionsGroup.removeChild(connectionsGroup.firstChild);
        }

        for (const topId in connections) {
            connections[topId] = null;
        }

        updateValues();
    });

    // Функция обновления отображения значений
    function updateValues() {
        // Сброс значений
        document.getElementById('resistanceLeft').textContent = '-';
        document.getElementById('capacitanceLeft').textContent = '-';
        document.getElementById('resistanceRight').textContent = '-';
        document.getElementById('capacitanceRight').textContent = '-';

        R_left = 0;
        C_left = 0;
        R_right = 0;
        C_right = 0;

        if (connections.top2) {
            const { row } = connections.top2;
            const value = values.top2[row];
            R_left = parseFloat(value);
            document.getElementById('capacitanceLeft').textContent = value;
        }
        if (connections.top1) {
            const { row } = connections.top1;
            const value = values.top1[row];
            C_left = parseFloat(value);
            document.getElementById('resistanceLeft').textContent = value;
        }
        if (connections.top4) {
            const { row } = connections.top4;
            const value = values.top4[row];
            C_right = parseFloat(value);
            document.getElementById('resistanceRight').textContent = value;
        }
        if (connections.top3) {
            const { row } = connections.top3;
            const value = values.top3[row];
            R_right = parseFloat(value);
            document.getElementById('capacitanceRight').textContent = value;
        }
    }

    updateValues();
}

// Переменные для управления миганием
let blinkingInterval = null;

// Функция для запуска мигания кружочков
function startBlinking() {
    // Останавливаем предыдущий интервал если он есть
    stopBlinking();

    // Ждем немного, чтобы SVG загрузился
    setTimeout(() => {
        // Ищем кружочки разными способами
        let circle1 = document.querySelector('circle[cx="253"][cy="116"]');
        let circle2 = document.querySelector('circle[cx="547"][cy="116"]');

        // Если не нашли точно по координатам, ищем приблизительно
        if (!circle1) {
            const circles = document.querySelectorAll('circle');
            circles.forEach(circle => {
                const cx = parseFloat(circle.getAttribute('cx'));
                const cy = parseFloat(circle.getAttribute('cy'));
                if (Math.abs(cx - 253) < 5 && Math.abs(cy - 116) < 5) {
                    circle1 = circle;
                }
            });
        }

        if (!circle2) {
            const circles = document.querySelectorAll('circle');
            circles.forEach(circle => {
                const cx = parseFloat(circle.getAttribute('cx'));
                const cy = parseFloat(circle.getAttribute('cy'));
                if (Math.abs(cx - 547) < 5 && Math.abs(cy - 116) < 5) {
                    circle2 = circle;
                }
            });
        }

        console.log('Найденные кружочки:', circle1, circle2); // для отладки

        if (!circle1 || !circle2) {
            console.log('Кружочки не найдены!');
            return;
        }

        // Рассчитываем параметры мигания
        const Ucc = 5, Uth = 2, U0 = 0.3;
        const lnArg = (Ucc - U0) / (Ucc - Uth);

        const t1 = R_left * 1e3 * C_left * 1e-6 * Math.log(lnArg);
        const t2 = R_right * 1e3 * C_right * 1e-6 * Math.log(lnArg);
        const T = t1 + t2;

        console.log('Времена:', { t1, t2, T, R_left, C_left, R_right, C_right }); // для отладки

        if (T <= 0 || isNaN(T) || R_left === 0 || C_left === 0 || R_right === 0 || C_right === 0) {
            console.log('Некорректные значения для мигания');
            return;
        }

        // Сохраняем исходные цвета заливки
        const originalFill1 = circle1.getAttribute('fill') || 'none';
        const originalFill2 = circle2.getAttribute('fill') || 'none';

        console.log('Запускаем мигание с периодом T =', T, 'секунд');

        // Запоминаем время начала
        const startTime = Date.now() / 1000;

        // Единый интервал для управления обоими кружочками
        blinkingInterval = setInterval(() => {
            const currentTime = (Date.now() / 1000 - startTime) % T; // текущее время в периоде

            // Логика: первый кружочек горит время t1, затем второй горит время t2
            if (currentTime < t1) {
                // Горит первый кружочек (время от 0 до t1)
                circle1.setAttribute('fill', 'red');
                circle1.setAttribute('stroke', 'red');
                circle1.setAttribute('stroke-width', '3');

                circle2.setAttribute('fill', originalFill2);
                circle2.setAttribute('stroke', 'black');
                circle2.setAttribute('stroke-width', '2');
            } else {
                // Горит второй кружочек (время от t1 до T)
                circle1.setAttribute('fill', originalFill1);
                circle1.setAttribute('stroke', 'black');
                circle1.setAttribute('stroke-width', '2');

                circle2.setAttribute('fill', 'red');
                circle2.setAttribute('stroke', 'red');
                circle2.setAttribute('stroke-width', '3');
            }
        }, 50); // обновление каждые 50мс для плавности

    }, 500); // ждем 500мс для загрузки SVG
}

// Функция для остановки мигания
function stopBlinking() {
    if (blinkingInterval) {
        clearInterval(blinkingInterval);
        blinkingInterval = null;
    }

    // Возвращаем исходный вид кружочкам
    setTimeout(() => {
        const circles = document.querySelectorAll('circle');
        circles.forEach(circle => {
            const cx = parseFloat(circle.getAttribute('cx'));
            const cy = parseFloat(circle.getAttribute('cy'));
            if ((Math.abs(cx - 253) < 5 && Math.abs(cy - 116) < 5) ||
                (Math.abs(cx - 547) < 5 && Math.abs(cy - 116) < 5)) {
                circle.setAttribute('fill', 'none');
                circle.setAttribute('stroke', 'black');
                circle.setAttribute('stroke-width', '2');
            }
        });
    }, 100);
}

