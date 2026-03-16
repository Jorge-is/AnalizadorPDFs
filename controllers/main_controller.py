"""
main_controller.py
Controlador principal de la app RSL Analyzer.
Rutas: inicio, historial, estadisticas, buscar, subir, eliminar,
       extraer_de_lista, limpiar_sesion, get_archivos.
"""
from flask import (
    Blueprint, render_template, request, redirect,
    url_for, jsonify, session, flash
)
from services.file_service import guardar_pdf_seguro
import os
from models import db, Collection, Article
from flask_login import login_required, current_user

main_bp = Blueprint('main', __name__)


# ── Helper ────────────────────────────────────────────────────────
def get_or_create_default_collection():
    """Devuelve (o crea) la colección 'Default' del usuario autenticado."""
    col = Collection.query.filter_by(user_id=current_user.id, name="Default").first()
    if not col:
        col = Collection(name="Default", owner=current_user)
        db.session.add(col)
        db.session.commit()
    return col


def _estado_pendiente(articulo):
    """Genera un dict de metadata provisional para artículos en cola o fallidos."""
    en_proceso = articulo.status in ('pending', 'processing')
    return {
        "titulo": f"({articulo.status.upper()}) {articulo.filename}",
        "autores": "Pendiente...",
        "anio": "Pendiente...",
        "tema": "Pendiente...",
        "pais": "Pendiente...",
        "palabras": "Pendiente...",
        "paginas_imagenes": "Pendiente...",
        "resumen": (
            "El documento está en cola de procesamiento..."
            if en_proceso else
            "Error en el procesamiento."
        ),
    }


# ── Sesión actual ─────────────────────────────────────────────────
@main_bp.route("/", methods=["GET"])
@login_required
def inicio():
    try:
        col = get_or_create_default_collection()

        if 'current_session_ids' not in session:
            session['current_session_ids'] = []

        current_ids = session['current_session_ids']
        articles = (
            Article.query
            .filter(Article.id.in_(current_ids), Article.collection_id == col.id)
            .all()
        ) if current_ids else []

        lista_datos = [
            a.get_metadata() or _estado_pendiente(a)
            for a in articles
        ]

        return render_template(
            "main/index.html",
            lista_datos=lista_datos,
            username=current_user.username,
        )
    except Exception as e:
        return render_template("main/index.html", error=f"Error al cargar la página: {e}")


# ── Historial completo ────────────────────────────────────────────
@main_bp.route("/historial", methods=["GET"])
@login_required
def historial():
    try:
        col = get_or_create_default_collection()
        articles = Article.query.filter_by(collection_id=col.id, status='completed').all()
        lista_datos = [a.get_metadata() for a in articles]

        return render_template(
            "main/historial.html",
            lista_datos=lista_datos,
            username=current_user.username,
        )
    except Exception as e:
        return render_template(
            "main/historial.html",
            error=f"Error al cargar el historial: {e}",
            lista_datos=[],
        )


# ── Estadísticas ──────────────────────────────────────────────────
@main_bp.route("/estadisticas", methods=["GET"])
@login_required
def estadisticas():
    return render_template("main/estadisticas.html")


@main_bp.route("/datos_estadistica", methods=["GET"])
@login_required
def datos_estadistica():
    col = get_or_create_default_collection()
    articles = Article.query.filter_by(collection_id=col.id, status='completed').all()
    lista_datos = [a.get_metadata() for a in articles]
    return jsonify(datos=lista_datos)


# ── Búsqueda ──────────────────────────────────────────────────────
@main_bp.route("/buscar", methods=["POST"])
@login_required
def buscar_titulo():
    termino = request.form.get("buscar_tema", "").strip().lower()
    if not termino:
        return redirect(url_for("main.historial"))

    try:
        col = get_or_create_default_collection()
        articles = Article.query.filter_by(collection_id=col.id, status='completed').all()
        lista_datos = [
            a.get_metadata() for a in articles
            if termino in (a.get_metadata() or {}).get("titulo", "").lower()
        ]
        return render_template(
            "main/historial.html",
            lista_datos=lista_datos,
            username=current_user.username,
        )
    except Exception as e:
        return render_template(
            "main/historial.html",
            error=f"Error durante la búsqueda: {e}",
            lista_datos=[],
        )


# ── Subir archivo (AJAX) ──────────────────────────────────────────
@main_bp.route("/subir_archivo", methods=["POST"])
@login_required
def subir_archivo():
    if 'pdf' not in request.files:
        return jsonify({'error': 'No se encontró el archivo'}), 400

    archivo = request.files['pdf']
    try:
        ruta_archivo, secure_name = guardar_pdf_seguro(archivo)
        col = get_or_create_default_collection()

        if Article.query.filter_by(collection_id=col.id, filename=secure_name).first():
            return jsonify({'error': 'El archivo ya existe en tu colección'}), 400

        new_art = Article(
            collection_id=col.id,
            filename=secure_name,
            filepath=ruta_archivo,
            status='pending',
        )
        db.session.add(new_art)
        db.session.commit()

        pendientes = Article.query.filter_by(collection_id=col.id, status='pending').all()
        return jsonify({
            'success': True,
            'filename': secure_name,
            'files': [{'filename': a.filename, 'filepath': a.filepath} for a in pendientes],
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400


# ── Eliminar archivo (AJAX) ───────────────────────────────────────
@main_bp.route("/eliminar_archivo/<nombre_archivo>", methods=["DELETE"])
@login_required
def eliminar_archivo(nombre_archivo):
    col = get_or_create_default_collection()
    article = Article.query.filter_by(collection_id=col.id, filename=nombre_archivo).first()

    if not article:
        return jsonify({'error': 'Archivo no encontrado'}), 404

    try:
        if os.path.exists(article.filepath):
            os.remove(article.filepath)
    except OSError:
        pass

    db.session.delete(article)
    db.session.commit()

    pendientes = Article.query.filter_by(collection_id=col.id, status='pending').all()
    return jsonify({
        'success': True,
        'files': [{'filename': a.filename, 'filepath': a.filepath} for a in pendientes],
    })


# ── Listar archivos pendientes (AJAX) ─────────────────────────────
@main_bp.route("/get_archivos", methods=["GET"])
@login_required
def get_archivos():
    col = get_or_create_default_collection()
    pendientes = Article.query.filter_by(collection_id=col.id, status='pending').all()
    return jsonify({'files': [{'filename': a.filename, 'filepath': a.filepath} for a in pendientes]})


# ── Extraer datos de todos los archivos pendientes (AJAX) ─────────
@main_bp.route("/extraer_de_lista", methods=["POST"])
@login_required
def extraer_de_lista():
    col = get_or_create_default_collection()
    pendientes = Article.query.filter_by(collection_id=col.id, status='pending').all()

    if not pendientes:
        return jsonify({'error': 'No hay archivos en la lista para procesar'}), 400

    import tasks

    if 'current_session_ids' not in session:
        session['current_session_ids'] = []

    procesados = 0
    for art in pendientes:
        try:
            tasks.procesar_pdf_background.delay(art.id, art.filepath)
            procesados += 1
            if art.id not in session['current_session_ids']:
                session['current_session_ids'].append(art.id)
        except Exception as e:
            error_str = str(e)
            print(f"[extraer_de_lista] Error encolando {art.filename}: {error_str}")
            if any(k in error_str for k in ("10061", "Connection refused", "ConnectionRefusedError")):
                flash(
                    "No se pudo conectar a Redis. "
                    "Verifica: (1) Docker corriendo, "
                    "(2) 'docker run -d -p 6379:6379 redis:alpine', "
                    "(3) worker activo con 'celery -A celery_worker worker --pool=solo --loglevel=info'",
                    "error",
                )
            else:
                flash(f"Error al encolar {art.filename}: {error_str[:100]}", "error")

    session.modified = True
    return jsonify({
        'success': True,
        'data_count': procesados,
        'redirect_url': url_for('main.inicio'),
    })


# ── Limpiar sesión actual (sin borrar historial) ──────────────────
@main_bp.route("/limpiar_sesion", methods=["GET"])
@login_required
def limpiar_sesion():
    """
    Limpia los IDs de la sesión actual de Flask.
    Los artículos permanecen en la BD (historial); solo se
    ocultan de la vista de «Sesión Actual».
    """
    session['current_session_ids'] = []
    session.modified = True
    flash("Sesión limpiada. Los datos siguen disponibles en el Historial.", "success")
    return redirect(url_for("main.inicio"))


# ── Refrescar (elimina TODOS los datos de la colección) ───────────
@main_bp.route("/refrescar", methods=["GET"])
@login_required
def refrescar_datos():
    """Borra todos los artículos y archivos de la colección del usuario."""
    col = get_or_create_default_collection()
    articulos = Article.query.filter_by(collection_id=col.id).all()

    for art in articulos:
        try:
            if os.path.exists(art.filepath):
                os.remove(art.filepath)
        except OSError:
            pass
        db.session.delete(art)

    db.session.commit()
    session['current_session_ids'] = []
    session.modified = True
    return redirect(url_for("main.inicio"))
