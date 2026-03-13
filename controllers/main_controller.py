from flask import Blueprint, render_template, request, redirect, url_for, jsonify, current_app
from services.pdf_service import extraer_datos_pdf
from services.file_service import guardar_pdf_seguro
import os
from models import db, Collection, Article
from flask_login import login_required, current_user

main_bp = Blueprint('main', __name__)

def get_or_create_default_collection():
    """Helper para obtener la colección principal del usuario logueado"""
    col = Collection.query.filter_by(user_id=current_user.id, name="Default").first()
    if not col:
        col = Collection(name="Default", owner=current_user)
        db.session.add(col)
        db.session.commit()
    return col

@main_bp.route("/", methods=["GET", "POST"])
@login_required
def inicio():
    try:
        col = get_or_create_default_collection()
        # Traer todos los artículos que ya han sido procesados.
        articles = Article.query.filter_by(collection_id=col.id, status='completed').all()
        lista_datos = [a.get_metadata() for a in articles]
        
        return render_template("index.html", 
                               lista_datos=lista_datos, 
                               username=current_user.username)
    except Exception as e:
        return render_template("index.html", error=f"Error al cargar la página: {str(e)}")


@main_bp.route("/estadisticas", methods=["GET", "POST"])
@login_required
def estadisticas():
    if request.method == "GET":
        return render_template("estadisticas.html")
    return redirect(url_for("main.inicio"))


@main_bp.route("/datos_estadistica", methods=["GET"])
@login_required
def datos_estadistica():
    col = get_or_create_default_collection()
    articles = Article.query.filter_by(collection_id=col.id, status='completed').all()
    lista_datos = [a.get_metadata() for a in articles]
    return jsonify(datos=lista_datos)


@main_bp.route("/buscar", methods=["POST", "GET"])
@login_required
def buscar_titulo():
    if request.method == "POST":
        termino_busqueda = request.form.get("buscar_tema", "").lower()
        if termino_busqueda:
            try:
                col = get_or_create_default_collection()
                articles_query = Article.query.filter_by(collection_id=col.id, status='completed').all()
                lista_datos = []
                for article in articles_query:
                    metadata = article.get_metadata()
                    if metadata and "titulo" in metadata and termino_busqueda in metadata["titulo"].lower():
                        lista_datos.append(metadata)

                return render_template("index.html", lista_datos=lista_datos, username=current_user.username)
            except Exception as e:
                return render_template("index.html", error=f"Error durante la búsqueda: {str(e)}")
    return redirect(url_for("main.inicio", error="Ingresa un término"))


@main_bp.route("/extraer", methods=["POST", "GET"])
@login_required
def extraer():
    if request.method == "POST":
        archivos = request.files.getlist("pdf")
        if not archivos or any(not archivo.filename or not archivo.filename.lower().endswith('.pdf') for archivo in archivos):
            return render_template("index.html", error="Solo archivos válidos en formato PDF.")

        col = get_or_create_default_collection()
        import tasks

        for archivo in archivos:
            if archivo.filename:
                try:
                    ruta_archivo, secure_name = guardar_pdf_seguro(archivo)
                    new_art = Article(collection_id=col.id, filename=secure_name, filepath=ruta_archivo, status='pending')
                    db.session.add(new_art)
                    db.session.commit()
                    
                    # Llamada a IA delegada al trabajador de fondo (Celery)
                    tasks.procesar_pdf_background.delay(new_art.id, ruta_archivo)
                except Exception as e:
                    print(f"Error procesando/encolando {archivo.filename}: {e}")

        return redirect(url_for("main.inicio"))
    return redirect(url_for("main.inicio", error="Por favor, adjunta archivos."))

@main_bp.route("/subir_archivo", methods=["POST"])
@login_required
def subir_archivo():
    if 'pdf' not in request.files:
        return jsonify({'error': 'No se encontró el archivo'}), 400

    archivo = request.files['pdf']
    try:
        ruta_archivo, secure_name = guardar_pdf_seguro(archivo)
        
        col = get_or_create_default_collection()
        
        # Verificar duplicados ligeros
        if Article.query.filter_by(collection_id=col.id, filename=secure_name).first():
            return jsonify({'error': 'El archivo ya existe en tu colección'}), 400

        new_art = Article(collection_id=col.id, filename=secure_name, filepath=ruta_archivo, status='pending')
        db.session.add(new_art)
        db.session.commit()
        
        articulos = Article.query.filter_by(collection_id=col.id, status='pending').all()
        lista_archivos = [{'filename': a.filename, 'filepath': a.filepath} for a in articulos]
        
        return jsonify({
            'success': True,
            'filename': secure_name,
            'files': lista_archivos
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400


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
    except:
        pass
        
    db.session.delete(article)
    db.session.commit()
    
    articulos_restantes = Article.query.filter_by(collection_id=col.id, status='pending').all()
    lista_archivos = [{'filename': a.filename, 'filepath': a.filepath} for a in articulos_restantes]
    
    return jsonify({
        'success': True,
        'message': 'Archivo eliminado correctamente',
        'files': lista_archivos
    })


@main_bp.route("/get_archivos", methods=["GET"])
@login_required
def get_archivos():
    col = get_or_create_default_collection()
    articulos = Article.query.filter_by(collection_id=col.id, status='pending').all()
    lista_archivos = [{'filename': a.filename, 'filepath': a.filepath} for a in articulos]
    return jsonify({'files': lista_archivos})


@main_bp.route("/extraer_de_lista", methods=["POST"])
@login_required
def extraer_de_lista():
    col = get_or_create_default_collection()
    pendientes = Article.query.filter_by(collection_id=col.id, status='pending').all()

    if not pendientes:
        return jsonify({'error': 'No hay archivos en la lista para procesar'}), 400

    import tasks

    procesados = 0
    for art in pendientes:
        try:
            # Enviar a la cola de celery en segundo plano
            tasks.procesar_pdf_background.delay(art.id, art.filepath)
            procesados += 1
        except Exception as e:
            print(f"Error encolando {art.filename}: {e}")

    return jsonify({
        'success': True,
        'data_count': procesados,
        'message': 'Tareas enviadas a proceso en segundo plano.',
        'redirect_url': url_for('main.inicio')
    })


@main_bp.route("/refrescar", methods=["GET"])
@login_required
def refrescar_datos():
    # Elimina los datos de la colección actual para reiniciar todo
    col = get_or_create_default_collection()
    articulos = Article.query.filter_by(collection_id=col.id).all()
    
    for art in articulos:
        try:
            if os.path.exists(art.filepath):
                os.remove(art.filepath)
        except:
            pass
        db.session.delete(art)
        
    db.session.commit()
    
    return redirect(url_for("main.inicio"))
