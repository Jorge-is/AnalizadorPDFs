/**
 * file-manager.js
 * Gestiona la subida, listado, eliminación y extracción de PDFs.
 * Clase GestorArchivos — instancia global: window.gestorArchivos
 */

'use strict';

class GestorArchivos {
    constructor() {
        // Referencias al DOM
        this.uploadZone       = document.getElementById('upload-btn');
        this.fileInput        = document.getElementById('file-input');
        this.filesContainer   = document.getElementById('files-container');
        this.extractBtn       = document.getElementById('extract-btn');
        this.uploadStatus     = document.getElementById('upload-status');
        this.fileCountBadge   = document.getElementById('file-count');

        this._initEventListeners();
        this._cargarArchivos();
    }

    // ── Event listeners ────────────────────────────────────────────
    _initEventListeners() {
        // Click o teclado sobre la zona de subida
        if (this.uploadZone) {
            this.uploadZone.addEventListener('click', () => this.fileInput?.click());
            this.uploadZone.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.fileInput?.click();
                }
            });
        }

        // Cambio en el input de archivo
        if (this.fileInput) {
            this.fileInput.addEventListener('change', e => {
                if (e.target.files.length > 0) {
                    this._subirArchivo(e.target.files[0]);
                }
            });
        }

        // Botón de extracción
        if (this.extractBtn) {
            this.extractBtn.addEventListener('click', () => this._extraerDatos());
        }
    }

    // ── Upload ─────────────────────────────────────────────────────
    async _subirArchivo(archivo) {
        const formData = new FormData();
        formData.append('pdf', archivo);

        this._mostrarEstado('Subiendo archivo...', 'info');

        try {
            const respuesta = await fetch('/subir_archivo', { method: 'POST', body: formData });
            const resultado = await respuesta.json();

            if (respuesta.ok) {
                this._mostrarEstado('Archivo subido correctamente', 'success');
                this._renderArchivos(resultado.files);
                this.fileInput.value = ''; // Limpiar input
            } else {
                this._mostrarEstado(resultado.error || 'Error al subir el archivo', 'error');
            }
        } catch (err) {
            this._mostrarEstado('Error de conexión con el servidor', 'error');
            console.error('[file-manager] _subirArchivo:', err);
        }
    }

    // ── Delete ─────────────────────────────────────────────────────
    async eliminarArchivo(nombreArchivo) {
        try {
            const respuesta = await fetch(`/eliminar_archivo/${encodeURIComponent(nombreArchivo)}`, {
                method: 'DELETE',
            });
            const resultado = await respuesta.json();

            if (respuesta.ok) {
                this._mostrarEstado('Archivo eliminado', 'success');
                this._renderArchivos(resultado.files);
            } else {
                this._mostrarEstado(resultado.error || 'Error al eliminar', 'error');
            }
        } catch (err) {
            this._mostrarEstado('Error de conexión con el servidor', 'error');
            console.error('[file-manager] eliminarArchivo:', err);
        }
    }

    // ── Load initial list ──────────────────────────────────────────
    async _cargarArchivos() {
        try {
            const respuesta = await fetch('/get_archivos');
            const resultado = await respuesta.json();
            if (respuesta.ok) this._renderArchivos(resultado.files);
        } catch (err) {
            console.error('[file-manager] _cargarArchivos:', err);
        }
    }

    // ── Render file list ───────────────────────────────────────────
    _renderArchivos(archivos) {
        if (!this.filesContainer) return;

        // Actualizar badge de conteo
        if (this.fileCountBadge) {
            this.fileCountBadge.textContent = archivos?.length ?? 0;
        }

        if (!archivos || archivos.length === 0) {
            this.filesContainer.innerHTML = '<li class="no-files">No hay archivos aún</li>';
            if (this.extractBtn) this.extractBtn.disabled = true;
            return;
        }

        if (this.extractBtn) this.extractBtn.disabled = false;

        this.filesContainer.innerHTML = archivos.map(archivo => `
            <li class="file-item">
                <span class="file-icon" aria-hidden="true">📄</span>
                <span class="file-name" title="${archivo.filename}">${archivo.filename}</span>
                <button class="delete-btn"
                        onclick="gestorArchivos.eliminarArchivo('${archivo.filename}')"
                        title="Eliminar ${archivo.filename}"
                        aria-label="Eliminar ${archivo.filename}">
                    🗑
                </button>
            </li>
        `).join('');
    }

    // ── Extract ─────────────────────────────────────────────────────
    async _extraerDatos() {
        this._mostrarEstadoFijo('⏳ Extrayendo datos, por favor espera...', 'info');
        if (this.extractBtn) this.extractBtn.disabled = true;

        try {
            const respuesta = await fetch('/extraer_de_lista', { method: 'POST' });
            const resultado = await respuesta.json();

            if (respuesta.ok) {
                this._mostrarEstadoFijo('Datos enviados. Redirigiendo...', 'success');
                setTimeout(() => { window.location.href = '/'; }, 1200);
            } else {
                this._mostrarEstadoFijo(resultado.error || 'Error al extraer datos', 'error');
                if (this.extractBtn) this.extractBtn.disabled = false;
            }
        } catch (err) {
            this._mostrarEstadoFijo('Error de conexión con el servidor', 'error');
            if (this.extractBtn) this.extractBtn.disabled = false;
            console.error('[file-manager] _extraerDatos:', err);
        }
    }

    // ── Status helpers ─────────────────────────────────────────────
    /** Muestra estado y lo borra automáticamente después de 3 s */
    _mostrarEstado(mensaje, tipo) {
        if (!this.uploadStatus) return;
        this.uploadStatus.textContent = mensaje;
        this.uploadStatus.className = `status-message ${tipo}`;
        clearTimeout(this._statusTimeout);
        this._statusTimeout = setTimeout(() => {
            if (this.uploadStatus) {
                this.uploadStatus.textContent = '';
                this.uploadStatus.className = '';
            }
        }, 3000);
    }

    /** Muestra estado persistente (no se borra automáticamente) */
    _mostrarEstadoFijo(mensaje, tipo) {
        if (!this.uploadStatus) return;
        this.uploadStatus.textContent = mensaje;
        this.uploadStatus.className = `status-message ${tipo}`;
    }
}

// Instancia global accesible desde los onclick del HTML generado dinámicamente
document.addEventListener('DOMContentLoaded', () => {
    window.gestorArchivos = new GestorArchivos();
});
