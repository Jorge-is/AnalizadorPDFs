# Importar Flask para crear la aplicación web
from flask import Flask
from markupsafe import escape # markupsafe es instalado junto a Flask y jinga

# Importar configuración personalizada desde config.py
from config import Config
from models import db, User
from flask_login import LoginManager

# Importar los blueprints que contienen las rutas (controladores) de la app
from controllers.main_controller import main_bp
from controllers.export_controller import export_bp
from controllers.auth_controller import auth_bp

# Crear una instancia de la aplicación Flask
app = Flask(__name__)

# Cargar la configuración desde el archivo Config
app.config.from_object(Config)

# Inicializamos Celery enlazado a esta app
from make_celery import init_celery
celery_app = init_celery(app)
import tasks

# Inicializar Base de datos
db.init_app(app)

# Inicializar sistema de Autenticación
login_manager = LoginManager()
login_manager.login_view = 'auth.login'
login_manager.login_message = "Por favor, inicia sesión para acceder a esta página."
login_manager.init_app(app)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Registrar el blueprint principal (página de inicio, búsqueda, estadísticas, etc.)
app.register_blueprint(main_bp)

# Registrar el blueprint para exportación a Excel y descarga
app.register_blueprint(export_bp)

# Registrar el blueprint para cuentas de usuario
app.register_blueprint(auth_bp)

# Crear todas las tablas si no existen antes de iniciar
with app.app_context():
    db.create_all()

# Punto de entrada principal de la aplicación
# Ejecuta el servidor Flask en modo de depuración (debug=True)
if __name__ == "__main__":
    app.run(debug=True)

