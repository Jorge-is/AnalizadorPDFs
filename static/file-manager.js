// Clase para gestionar toda la lógica de la subida, eliminación y extracción de archivos en el frontend.
class GestorArchivos {
  constructor() {
    console.log("Inicializando Gestor de Archivos...");

    // Obtener referencias a los elementos del DOM que se van a manipular.
    this.botonSubir = document.getElementById("upload-btn");
    this.entradaArchivo = document.getElementById("file-input");
    this.contenedorArchivos = document.getElementById("files-container");
    this.botonExtraer = document.getElementById("extract-btn");
    this.estadoSubida = document.getElementById("upload-status");

    // Inicializar los escuchadores de eventos y cargar la lista de archivos existentes en el servidor.
    this.inicializarEventListeners();
    this.cargarArchivos();
  }

  // Método para configurar todos los eventos de clic y cambio.
  inicializarEventListeners() {
    // Evento para la zona de subida: simula un clic en el input de archivo oculto.
    if (this.botonSubir) {
      this.botonSubir.addEventListener("click", () => {
        if (this.entradaArchivo) this.entradaArchivo.click();
      });
      // Soporte de teclado para accesibilidad (Enter / Space)
      this.botonSubir.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (this.entradaArchivo) this.entradaArchivo.click();
        }
      });
    }

    // Evento para el input de archivo: cuando el usuario selecciona un archivo, se llama a la función de subida.
    if (this.entradaArchivo) {
      this.entradaArchivo.addEventListener("change", (e) => {
        if (e.target.files.length > 0) {
          this.subirArchivo(e.target.files[0]);
        }
      });
    }

    // Evento para el botón de extracción.
    if (this.botonExtraer) {
      this.botonExtraer.addEventListener("click", () => {
        this.extraerDatos();
      });
    }
  }

  // Sube un archivo al servidor usando una petición `fetch`.
  async subirArchivo(archivo) {
    const formData = new FormData();
    formData.append("pdf", archivo); // Prepara los datos del formulario para el envío.

    try {
      this.mostrarEstadoSubida("Subiendo archivo...", "info");

      // Envía el archivo al endpoint '/subir_archivo' en el backend.
      const respuesta = await fetch("/subir_archivo", {
        method: "POST",
        body: formData,
      });

      const resultado = await respuesta.json(); // Convierte la respuesta a JSON.

      if (respuesta.ok) {
        this.mostrarEstadoSubida("Archivo subido correctamente", "success");
        this.mostrarArchivos(resultado.files); // Actualiza la lista de archivos en la interfaz.
        this.entradaArchivo.value = ""; // Limpia el input para poder subir el mismo archivo de nuevo.
      } else {
        this.mostrarEstadoSubida(
          resultado.error || "Error al subir el archivo",
          "error",
        );
      }
    } catch (error) {
      this.mostrarEstadoSubida("Error de conexión con el servidor", "error");
      console.error("Error en la subida:", error);
    }
  }

  // Elimina un archivo del servidor y de la lista.
  async eliminarArchivo(nombreArchivo) {
    try {
      // Envía una petición DELETE al backend para eliminar el archivo.
      const respuesta = await fetch(
        `/eliminar_archivo/${encodeURIComponent(nombreArchivo)}`,
        {
          method: "DELETE",
        },
      );

      const resultado = await respuesta.json();

      if (respuesta.ok) {
        this.mostrarEstadoSubida("Archivo eliminado correctamente", "success");
        this.mostrarArchivos(resultado.files); // Actualiza la lista de archivos.
      } else {
        this.mostrarEstadoSubida(
          resultado.error || "Error al eliminar el archivo",
          "error",
        );
      }
    } catch (error) {
      this.mostrarEstadoSubida("Error de conexión con el servidor", "error");
      console.error("Error al eliminar:", error);
    }
  }

  // Carga la lista de archivos que ya están en el servidor al cargar la página.
  async cargarArchivos() {
    try {
      const respuesta = await fetch("/get_archivos");
      const resultado = await respuesta.json();

      if (respuesta.ok) {
        this.mostrarArchivos(resultado.files);
      }
    } catch (error) {
      console.error("Error cargando archivos iniciales:", error);
    }
  }

  // Renderiza (dibuja) la lista de archivos en el contenedor del DOM.
  mostrarArchivos(archivos) {
    if (!this.contenedorArchivos) return;

    // Actualizar el contador en el header del panel
    const contador = document.getElementById('file-count');
    if (contador) contador.textContent = archivos ? archivos.length : 0;

    // Si no hay archivos, muestra un mensaje y deshabilita el botón de extraer.
    if (!archivos || archivos.length === 0) {
      this.contenedorArchivos.innerHTML =
        '<li class="no-files">No hay archivos aún</li>';
      if (this.botonExtraer) this.botonExtraer.disabled = true;
      return;
    }

    // Si hay archivos, habilita el botón de extraer.
    if (this.botonExtraer) this.botonExtraer.disabled = false;

    // Crea el HTML para cada archivo de la lista.
    const archivosHTML = archivos
      .map(
        (archivo) => `
            <li class="file-item">
                <span class="file-icon">📄</span>
                <span class="file-name">${archivo.filename}</span>
                <button class="delete-btn"
                        onclick="gestorArchivos.eliminarArchivo('${archivo.filename}')"
                        title="Eliminar archivo">&#x1F5D1;</button>
            </li>`,
      )
      .join("");

    this.contenedorArchivos.innerHTML = archivosHTML;
  }

  // Envía la señal al backend para que procese todos los archivos de la lista.
  async extraerDatos() {
    try {
      this.mostrarEstadoExtraccion(
        "Extrayendo datos, por favor espera...",
        "info",
      );
      if (this.botonExtraer) this.botonExtraer.disabled = true; // Deshabilita el botón durante el proceso.

      const respuesta = await fetch("/extraer_de_lista", { method: "POST" });
      const resultado = await respuesta.json();

      if (respuesta.ok) {
        this.mostrarEstadoExtraccion(
          "Datos extraídos correctamente. Redirigiendo...",
          "success",
        );
        // Recarga la página después de 1 segundo para mostrar los resultados en la tabla.
        setTimeout(() => {
          window.location.href = "/";
        }, 1000);
      } else {
        this.mostrarEstadoExtraccion(
          resultado.error || "Error al extraer datos",
          "error",
        );
        if (this.botonExtraer) this.botonExtraer.disabled = false; // Rehabilita el botón si hay error.
      }
    } catch (error) {
      this.mostrarEstadoExtraccion(
        "Error de conexión con el servidor",
        "error",
      );
      if (this.botonExtraer) this.botonExtraer.disabled = false;
      console.error("Error en la extracción:", error);
    }
  }

  // Muestra un mensaje temporal sobre el estado de la subida.
  mostrarEstadoSubida(mensaje, tipo) {
    if (this.estadoSubida) {
      this.estadoSubida.textContent = mensaje;
      this.estadoSubida.className = `status-message ${tipo}`;
      // El mensaje desaparece después de 3 segundos.
      setTimeout(() => {
        if (this.estadoSubida) {
          this.estadoSubida.textContent = "";
          this.estadoSubida.className = "";
        }
      }, 3000);
    }
  }

  // Muestra un mensaje sobre el estado de la extracción (no se borra automáticamente si es exitoso).
  mostrarEstadoExtraccion(mensaje, tipo) {
    if (this.estadoSubida) {
      this.estadoSubida.textContent = mensaje;
      this.estadoSubida.className = `status-message ${tipo}`;
    }
  }
}

// Inicializa la clase GestorArchivos cuando el contenido del DOM se haya cargado completamente.
document.addEventListener("DOMContentLoaded", () => {
  // Se crea una instancia global para que se pueda acceder desde los botones onclick en el HTML.
  window.gestorArchivos = new GestorArchivos();
});
