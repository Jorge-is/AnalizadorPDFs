from celery import shared_task
from models import db, Article
from services.pdf_service import extraer_datos_pdf

@shared_task
def procesar_pdf_background(article_id, filepath):
    # La tarea se ejecuta en segundo plano con app_context resuelto
    article = Article.query.get(article_id)
    if not article:
        return "Not Found"
    
    try:
        article.status = 'processing'
        db.session.commit()
            
        # Extraer los datos (Gemini OCR ya cuenta con Tenacity retry adentro)
        datos = extraer_datos_pdf(filepath)
            
        if datos:
            article.set_metadata(datos)
            article.status = 'completed'
        else:
            article.status = 'failed'
        db.session.commit()
    except Exception as e:
        print(f"Excepción grave en background celery: {e}")
        article.status = 'failed'
        db.session.commit()
        
    return f"Procesado articulo ID: {article_id}"

import os
import time
from flask import current_app

@shared_task
def limpiar_uploads_huerfanos():
    """Tarea programada que borra PDFs viejos para ahorrar disco (Ejecutada por Celery Beat)"""
    try:
        now = time.time()
        folder = current_app.config['UPLOAD_FOLDER']
        if not os.path.exists(folder):
            return "Carpeta no encontrada."
        
        eliminados = 0
        for filename in os.listdir(folder):
            filepath = os.path.join(folder, filename)
            if os.path.isfile(filepath) and filename.lower().endswith('.pdf'):
                # 86400 segundos = 24 horas
                if os.stat(filepath).st_mtime < (now - 86400):
                    try:
                        os.remove(filepath)
                        eliminados += 1
                    except Exception as e:
                        print(f"No se pudo eliminar {filename}: {e}")
                        
        return f"Limpiados {eliminados} archivos viejos."
    except Exception as e:
        return f"Error en limpieza: {e}"
