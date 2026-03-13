from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime
import json

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    # Relación con sus colecciones
    collections = db.relationship('Collection', backref='owner', lazy=True)

class Collection(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    # Relación con los artículos de esta colección
    articles = db.relationship('Article', backref='collection', lazy=True, cascade="all, delete-orphan")

class Article(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    collection_id = db.Column(db.Integer, db.ForeignKey('collection.id'))
    filename = db.Column(db.String(255), nullable=False)
    filepath = db.Column(db.String(512), nullable=False)
    status = db.Column(db.String(20), default='pending') # 'pending', 'processing', 'completed', 'failed'
    metadata_json = db.Column(db.Text) # Almacena autores, año, resumen, país, tema, en formato json string

    def get_metadata(self):
        if self.metadata_json:
            try:
                return json.loads(self.metadata_json)
            except:
                return {}
        return {}

    def set_metadata(self, data):
        self.metadata_json = json.dumps(data)
