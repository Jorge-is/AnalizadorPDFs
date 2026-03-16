/**
 * table.js
 * Gestión de la tabla de resultados:
 *   - Alternar visibilidad de columnas
 *   - Selección de filas (individual y total)
 *   - Contador de selección
 */

'use strict';

// ── Visibilidad de columnas ──────────────────────────────────────
/**
 * Muestra u oculta todas las celdas de una columna dada.
 * @param {HTMLInputElement} checkbox - El checkbox que disparó el cambio.
 * @param {string} nombreColumna     - Valor del atributo data-columna.
 */
function alternarColumna(checkbox, nombreColumna) {
    const celdas = document.querySelectorAll(`[data-columna="${nombreColumna}"]`);
    celdas.forEach(celda => {
        celda.style.display = checkbox.checked ? 'table-cell' : 'none';
    });
}


// ── Selección de filas ───────────────────────────────────────────
/**
 * Selecciona o deselecciona TODAS las filas al cambiar el checkbox maestro.
 * @param {HTMLInputElement} masterCheckbox
 */
function toggleSelectAll(masterCheckbox) {
    const rowCheckboxes = document.querySelectorAll('.row-select');
    rowCheckboxes.forEach(cb => { cb.checked = masterCheckbox.checked; });
    actualizarContadorSeleccion();
}

/**
 * Actualiza el texto del contador de filas seleccionadas
 * y sincroniza el estado del checkbox maestro.
 */
function actualizarContadorSeleccion() {
    const total     = document.querySelectorAll('.row-select').length;
    const selected  = document.querySelectorAll('.row-select:checked').length;
    const counter   = document.getElementById('selected-count');
    const masterCb  = document.getElementById('select-all');

    if (counter) counter.textContent = selected;

    if (masterCb) {
        masterCb.indeterminate = selected > 0 && selected < total;
        masterCb.checked = selected === total && total > 0;
    }
}

/**
 * Devuelve los índices (base-0) de las filas seleccionadas.
 * Si no hay ninguna seleccionada, devuelve null (= exportar todas).
 * @returns {number[]|null}
 */
function obtenerFilasSeleccionadas() {
    const checkboxes = document.querySelectorAll('.row-select');
    const seleccionados = [];
    checkboxes.forEach((cb, idx) => {
        if (cb.checked) seleccionados.push(idx);
    });
    return seleccionados.length > 0 ? seleccionados : null;
}

/**
 * Devuelve los nombres de las columnas visibles (checkboxes marcados),
 * siempre incluyendo 'titulo'.
 * @returns {string[]}
 */
function obtenerColumnasSeleccionadas() {
    const checkboxes = document.querySelectorAll('.column-toggle input[type="checkbox"]');
    const columnas = new Set(['titulo']); // título siempre incluido
    checkboxes.forEach(cb => {
        if (cb.checked) columnas.add(cb.name);
    });
    return Array.from(columnas);
}


// ── Inicialización ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Aplicar estado inicial de visibilidad de columnas
    const checkboxes = document.querySelectorAll('.column-toggle input[type="checkbox"]');
    checkboxes.forEach(cb => {
        // El campo "titulo" está disabled y siempre visible; no hace falta ocultarlo.
        if (!cb.disabled) {
            alternarColumna(cb, cb.name);
        }
    });

    // Inicializar contador
    actualizarContadorSeleccion();
});
