# eventlet monkey_patch eliminado: causa problemas con Redis en Windows
# Si necesitas concurrencia, usa: celery -A celery_worker worker --pool=solo
from main import celery_app
