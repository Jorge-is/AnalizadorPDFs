import os
from werkzeug.utils import secure_filename
from pathlib import Path
from flask import current_app

def guardar_pdf_seguro(file):
    """
    Guarda un archivo de manera segura evitando ataques de Path Traversal
    y validando la extensión del archivo.
    Retorna (ruta_absoluta, nombre_archivo_seguro)
    """
    if file.filename == '' or file.filename is None:
        raise ValueError("No se seleccionó ningún archivo.")

    filename = secure_filename(file.filename)
    if not filename.lower().endswith('.pdf'):
        raise ValueError("Formato no permitido. Solo se permiten archivos .pdf.")

    # Resolver la carpeta base de manera estricta
    base_dir = Path(current_app.config['UPLOAD_FOLDER']).resolve()
    
    # Resolver la ruta completa final
    file_path = (base_dir / filename).resolve()
    
    # Validar que el archivo resuelto siga estando DENTRO de la carpeta permitida
    if base_dir not in file_path.parents:
        raise PermissionError("Ruta inválida (Path Traversal detectado).")
        
    file.save(str(file_path))
    
    return str(file_path), filename
