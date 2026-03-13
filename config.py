# Importar módulo OS para trabajar con rutas y variables de entorno
import os

# Cargar las variables de entorno desde el archivo .env
from dotenv import load_dotenv
load_dotenv()

# Clase de configuración para la aplicación Flask
class Config:
    # Base directory
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    
    # Carpeta donde se almacenarán los archivos subidos (PDFs y Excel)
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')

    # Clave API para el uso del modelo Gemini AI, obtenida desde el archivo .env
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

    # Configuración de Flask-SQLAlchemy para conectarse a SQLite
    SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(BASE_DIR, 'instance', 'app.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Llave secreta para manejo de sesiones en Flask-Login
    SECRET_KEY = os.getenv("SECRET_KEY", "llave-secreta-de-desarrollo")

    # Crear la carpeta de subida si no existe
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
