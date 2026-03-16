/**
 * estadisticas.js
 * Carga datos desde /datos_estadistica y renderiza 5 gráficos:
 *   1. Artículos por año          — Bar
 *   2. Distribución por país      — Doughnut (top 8)
 *   3. Top países                 — Horizontal Bar
 *   4. Tendencia acumulada        — Line
 *   5. Mapa coroplético           — Choropleth (Chart.js Geo)
 *
 * También rellena 4 KPI cards.
 */

'use strict';

// ── Paleta de colores ────────────────────────────────────────────
const PALETTE = [
    '#3b7de8', '#22c55e', '#f59e0b', '#ef4444',
    '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6',
    '#f97316', '#64748b', '#a855f7', '#10b981',
];

const CHART_DEFAULTS = {
    color: '#8a9bb8',          // Color de texto
    borderColor: '#1e2d47',    // Bordes de grids
    bgTooltip: '#131c2e',
};

// Aplicar defaults globales de Chart.js
Chart.defaults.color = CHART_DEFAULTS.color;
Chart.defaults.borderColor = CHART_DEFAULTS.borderColor;
Chart.defaults.font.family = "'Space Grotesk', sans-serif";


// ── Exportar gráfico como PNG ────────────────────────────────────
function exportarGrafico(chartId, nombre) {
    const chart = Chart.getChart(chartId);
    if (!chart) return;
    const link = document.createElement('a');
    link.download = `${nombre}.png`;
    link.href = chart.toBase64Image('image/png', 1.0);
    link.click();
}


// ── Helpers ──────────────────────────────────────────────────────
/** Cuenta ocurrencias de valores en un array */
function contarOcurrencias(arr) {
    return arr.reduce((acc, val) => {
        if (val && val !== 'N/A' && val !== 'No detectado') {
            acc[val] = (acc[val] || 0) + 1;
        }
        return acc;
    }, {});
}

/** Ordena un objeto {clave: número} de mayor a menor y devuelve top N */
function topN(obj, n = 10) {
    return Object.entries(obj)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n);
}

/** Rellena un KPI card con valor y posible animación de conteo */
function animarKPI(elementId, valor) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const fin = typeof valor === 'number' ? valor : parseInt(valor, 10);
    if (isNaN(fin)) { el.textContent = valor; return; }
    let inicio = 0;
    const duracion = 800;
    const paso = Math.ceil(fin / (duracion / 16));
    const timer = setInterval(() => {
        inicio = Math.min(inicio + paso, fin);
        el.textContent = inicio;
        if (inicio >= fin) clearInterval(timer);
    }, 16);
}


// ── Gráfico 1: Artículos por año (Bar) ──────────────────────────
function crearGraficoAnios(yearCount) {
    const aniosOrdenados = Object.keys(yearCount).sort((a, b) => a - b);
    const valores = aniosOrdenados.map(y => yearCount[y]);

    return new Chart(document.getElementById('yearChart'), {
        type: 'bar',
        data: {
            labels: aniosOrdenados,
            datasets: [{
                label: 'Artículos',
                data: valores,
                backgroundColor: PALETTE[0] + 'cc',
                borderColor: PALETTE[0],
                borderWidth: 2,
                borderRadius: 6,
                borderSkipped: false,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: CHART_DEFAULTS.bgTooltip,
                    titleColor: '#e8edf5',
                    bodyColor: '#8a9bb8',
                    callbacks: {
                        label: ctx => ` ${ctx.raw} artículo(s)`,
                    },
                },
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: CHART_DEFAULTS.color },
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: CHART_DEFAULTS.color, stepSize: 1 },
                    grid: { color: CHART_DEFAULTS.borderColor },
                },
            },
        },
    });
}


// ── Gráfico 2: Distribución por país (Doughnut) ─────────────────
function crearGraficoDonutPaises(paisesCuenta) {
    const top = topN(paisesCuenta, 8);
    const labels = top.map(([p]) => p);
    const values = top.map(([, v]) => v);
    const total  = Object.values(paisesCuenta).reduce((a, b) => a + b, 0);

    return new Chart(document.getElementById('countryChart'), {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: PALETTE.slice(0, labels.length),
                borderColor: '#0d1421',
                borderWidth: 3,
                hoverOffset: 8,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: CHART_DEFAULTS.color, padding: 14, font: { size: 12 } },
                },
                tooltip: {
                    backgroundColor: CHART_DEFAULTS.bgTooltip,
                    callbacks: {
                        label: ctx => {
                            const pct = ((ctx.raw / total) * 100).toFixed(1);
                            return ` ${ctx.raw} artículos (${pct}%)`;
                        },
                    },
                },
            },
            animation: { animateScale: true, animateRotate: true },
        },
    });
}


// ── Gráfico 3: Top países — Horizontal Bar ───────────────────────
function crearGraficoTopPaises(paisesCuenta) {
    const top = topN(paisesCuenta, 10);
    const labels = top.map(([p]) => p).reverse();
    const values = top.map(([, v]) => v).reverse();

    return new Chart(document.getElementById('topPaisesChart'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Artículos',
                data: values,
                backgroundColor: values.map((_, i) => PALETTE[i % PALETTE.length] + 'cc'),
                borderColor:     values.map((_, i) => PALETTE[i % PALETTE.length]),
                borderWidth: 2,
                borderRadius: 4,
            }],
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: CHART_DEFAULTS.bgTooltip,
                    callbacks: { label: ctx => ` ${ctx.raw} artículo(s)` },
                },
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { color: CHART_DEFAULTS.color, stepSize: 1 },
                    grid: { color: CHART_DEFAULTS.borderColor },
                },
                y: {
                    ticks: { color: CHART_DEFAULTS.color },
                    grid: { display: false },
                },
            },
        },
    });
}


// ── Gráfico 4: Tendencia acumulada (Line) ────────────────────────
function crearGraficoTendencia(yearCount) {
    const aniosOrdenados = Object.keys(yearCount).sort((a, b) => a - b);
    let acumulado = 0;
    const valores = aniosOrdenados.map(y => { acumulado += yearCount[y]; return acumulado; });

    return new Chart(document.getElementById('trendChart'), {
        type: 'line',
        data: {
            labels: aniosOrdenados,
            datasets: [{
                label: 'Acumulado',
                data: valores,
                borderColor: PALETTE[1],
                backgroundColor: PALETTE[1] + '22',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: PALETTE[1],
                pointBorderColor: '#0d1421',
                pointRadius: 5,
                pointHoverRadius: 7,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: CHART_DEFAULTS.bgTooltip,
                    callbacks: { label: ctx => ` ${ctx.raw} artículos acumulados` },
                },
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: CHART_DEFAULTS.color },
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: CHART_DEFAULTS.color, stepSize: 1 },
                    grid: { color: CHART_DEFAULTS.borderColor },
                },
            },
        },
    });
}


// ── Gráfico 5: Mapa coroplético ──────────────────────────────────
async function crearGraficoMapa(paisesCuenta) {
    const respuesta = await fetch('https://unpkg.com/world-atlas@2.0.2/countries-50m.json');
    const mundo     = await respuesta.json();
    const paises    = ChartGeo.topojson.feature(mundo, mundo.objects.countries).features;

    const datos = paises.map(d => ({
        feature: d,
        value: paisesCuenta[d.properties.name] || 0,
    }));

    const max = Math.max(...Object.values(paisesCuenta), 1);

    return new Chart(document.getElementById('geoChart'), {
        type: 'choropleth',
        data: {
            labels: paises.map(p => p.properties.name),
            datasets: [{
                label: 'Artículos',
                data: datos,
                outline: paises,
                backgroundColor: datos.map(d => {
                    if (d.value === 0) return '#1e2d47';
                    const intensidad = Math.round(50 + (d.value / max) * 200);
                    return `rgba(59, 125, 232, ${0.2 + (d.value / max) * 0.8})`;
                }),
                borderColor: '#0d1421',
                borderWidth: 0.5,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                xy: { projection: 'equalEarth' },
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: CHART_DEFAULTS.bgTooltip,
                    callbacks: {
                        label: ctx => {
                            const nombre = ctx.label || 'País';
                            const val    = ctx.raw?.value ?? 0;
                            return val > 0
                                ? ` ${nombre}: ${val} artículo(s)`
                                : ` ${nombre}: sin artículos`;
                        },
                    },
                },
            },
        },
    });
}


// ── Inicialización principal ─────────────────────────────────────
async function inicializarEstadisticas() {
    try {
        const respuesta = await fetch('/datos_estadistica');
        const { datos } = await respuesta.json();

        if (!datos || datos.length === 0) {
            document.querySelector('.stats-grid').style.display = 'none';
            document.querySelector('.kpi-grid').style.display = 'none';
            document.getElementById('empty-stats').style.display = 'flex';
            return;
        }

        // Preprocesamiento
        const yearCount   = contarOcurrencias(datos.map(d => d.anio));
        const paisesCuenta = contarOcurrencias(datos.map(d => d.pais));

        const aniosOrdenados = Object.keys(yearCount).sort((a, b) => a - b);
        const totalArticulos  = datos.length;
        const paisesUnicos    = Object.keys(paisesCuenta).length;
        const anioMasReciente = aniosOrdenados[aniosOrdenados.length - 1] ?? '—';
        const aniosCubiertos  = aniosOrdenados.length;

        // KPI cards
        animarKPI('kpi-total',    totalArticulos);
        animarKPI('kpi-paises',   paisesUnicos);
        animarKPI('kpi-anios',    aniosCubiertos);
        document.getElementById('kpi-reciente').textContent = anioMasReciente;

        // Gráficos
        crearGraficoAnios(yearCount);
        crearGraficoDonutPaises(paisesCuenta);
        crearGraficoTopPaises(paisesCuenta);
        crearGraficoTendencia(yearCount);
        await crearGraficoMapa(paisesCuenta);

    } catch (err) {
        console.error('[estadisticas.js] Error cargando datos:', err);
    }
}

// Arrancar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', inicializarEstadisticas);
