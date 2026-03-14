""" Script para resetear BD y Redis """
import os
import shutil
import redis
from main import app
from models import db

print("1. Limpiando colas congeladas en Redis...")
try:
    r = redis.Redis(host='127.0.0.1', port=6379, db=0)
    r.flushdb()
    print("✓ Colas de Celery eliminadas exitosamente.")
except Exception as e:
    print(f"Error limpiando Redis: {e}")

print("2. Reseteando base de datos SQLite...")
db_path = os.path.join('instance', 'app.db')
if os.path.exists(db_path):
    os.remove(db_path)
    print("✓ Base de datos anterior borrada.")

print("3. Borrando archivos físicos de PDFs viejos...")
if os.path.exists('uploads'):
    shutil.rmtree('uploads')
os.makedirs('uploads', exist_ok=True)
print("✓ Carpeta /uploads limpiada.")

print("4. Recreando tablas nuevas...")
with app.app_context():
    db.create_all()
    print("✓ Tablas limpias creadas exitosamente.")

print("\n--- ¡SISTEMA RESTAURADO CON ÉXITO! ---")
print("Arrancar 'python main.py' y registrarse con un usuario nuevo.")
