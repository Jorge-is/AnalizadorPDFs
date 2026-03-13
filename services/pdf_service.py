import fitz as pymupdf
import os
import re
from google import genai
from config import Config
from tenacity import retry, wait_exponential, stop_after_attempt
import logging

cliente = genai.Client(api_key=Config.GEMINI_API_KEY)

# Configurar reintentos exponenciales: intentará hasta 5 veces, empezando con 4s de espera y multiplicando, max 10s.
@retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=4, max=10))
def llamar_gemini(texto_corto, es_resumen=True):
    # Si falla, tenacity atrapará la excepción y lo volverá a intentar.
    if es_resumen:
        prompt = f"Resume este texto en un solo párrafo en español: {texto_corto}"
    else:
        prompt = f"Según tu análisis, ¿de qué país es este texto? Responde solo con el nombre del país en inglés: {texto_corto}"
        
    respuesta = cliente.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt
    )
    return respuesta.text

def extraer_datos_pdf(ruta_archivo):
    ruta_absoluta = os.path.abspath(ruta_archivo)
    documento = pymupdf.open(ruta_absoluta)
    contador_paginas = documento.page_count

    datos = {}
    contador_imagenes = sum(len(pagina.get_images()) for pagina in documento)

    metadatos = documento.metadata
    datos["nombre_archivo"] = os.path.basename(ruta_absoluta)
    datos["titulo"] = metadatos.get("title", "N/A")
    datos["autores"] = metadatos.get("author", "N/A")
    datos["palabras"] = metadatos.get("keywords", "N/A")
    datos["tema"] = metadatos.get("subject", "N/A")
    datos["paginas_imagenes"]  = f"{contador_paginas} / {contador_imagenes}"

    texto_completo = "".join([pagina.get_text() for pagina in documento])
    documento.close()

    longitud_maxima = 10000
    texto_corto = texto_completo[:longitud_maxima]

    try:
        # Llamamos a gemini de forma resiliente
        datos["resumen"] = llamar_gemini(texto_corto, es_resumen=True)
        pais = llamar_gemini(texto_corto, es_resumen=False)
        datos["pais"] = pais.strip() if pais else "N/A"
    except Exception as e:
        # Si después de 5 intentos falló, capturamos error log
        logging.error(f"Error definitivo con Gemini para {ruta_archivo}: {e}")
        datos["resumen"] = "N/A"
        datos["pais"] = "N/A"

    coincidencia_anio = re.search(r'\b(20[0-3][0-9])\b', texto_completo)
    datos["anio"] = coincidencia_anio.group(1) if coincidencia_anio else "N/A"

    return datos
