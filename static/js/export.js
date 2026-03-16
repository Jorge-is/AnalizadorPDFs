/**
 * export.js
 * Exportación de datos a Excel.
 * Depende de: table.js (obtenerFilasSeleccionadas, obtenerColumnasSeleccionadas)
 *
 * Lógica:
 *   1. Lee columnas visibles desde los checkboxes del column-toggle.
 *   2. Lee filas seleccionadas (o exporta todas si ninguna está marcada).
 *   3. Envía al endpoint /exportar_excel con columnas e índices.
 *   4. Si el servidor devuelve una URL, descarga el archivo.
 */

'use strict';

/**
 * Punto de entrada principal. Se llama desde el botón del template.
 * @param {Event} evento
 */
async function exportarExcel(evento) {
    evento.preventDefault();

    const columnas = obtenerColumnasSeleccionadas();
    const filas    = obtenerFilasSeleccionadas(); // null = todas

    // Mostrar feedback visual en el botón
    const boton = evento.currentTarget || evento.target;
    const textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Exportando...';

    try {
        const formData = new FormData();

        // Enviar columnas
        columnas.forEach(col => formData.append('columnas', col));

        // Enviar índices de filas (vacío = todas)
        if (filas !== null) {
            filas.forEach(idx => formData.append('filas', idx));
        }

        const respuesta = await fetch('/exportar_excel', {
            method: 'POST',
            body: formData,
        });

        if (!respuesta.ok) {
            const err = await respuesta.json().catch(() => ({ error: 'Error desconocido' }));
            mostrarNotificacion(err.error || 'Error al exportar', 'error');
            return;
        }

        const datos = await respuesta.json();

        if (datos.error) {
            mostrarNotificacion(datos.error, 'error');
            return;
        }

        if (datos.url) {
            // Crear enlace temporal y disparar descarga
            const enlace = document.createElement('a');
            enlace.href = datos.url;
            enlace.download = 'rsl_datos.xlsx';
            document.body.appendChild(enlace);
            enlace.click();
            document.body.removeChild(enlace);
            mostrarNotificacion('Archivo descargado correctamente', 'success');
        }

    } catch (error) {
        console.error('[export.js] Error en exportarExcel:', error);
        mostrarNotificacion('Error de conexión con el servidor', 'error');
    } finally {
        boton.disabled = false;
        boton.textContent = textoOriginal;
    }
}

/**
 * Muestra una notificación temporal en el área de actions-bar.
 * @param {string} mensaje
 * @param {'success'|'error'|'info'} tipo
 */
function mostrarNotificacion(mensaje, tipo = 'info') {
    // Reutilizar un elemento existente o crear uno temporal
    let notif = document.getElementById('export-notif');
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'export-notif';
        const actionsBar = document.querySelector('.actions-bar');
        if (actionsBar) actionsBar.prepend(notif);
        else document.body.prepend(notif);
    }
    notif.className = `alert alert--${tipo}`;
    notif.textContent = mensaje;
    notif.style.display = 'flex';

    clearTimeout(notif._timeout);
    notif._timeout = setTimeout(() => {
        notif.style.display = 'none';
    }, 4000);
}
