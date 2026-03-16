from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('main.inicio'))

    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter_by(username=username).first()
        
        if user and check_password_hash(user.password_hash, password):
            login_user(user)
            return redirect(url_for('main.inicio'))
        else:
            flash('Usuario o contraseña incorrectos', 'error')
            
    return render_template('auth/login.html')

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('main.inicio'))

    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter_by(username=username).first()
        if user:
            flash('El nombre de usuario ya existe', 'error')
            return redirect(url_for('auth.register'))
            
        new_user = User(
            username=username, 
            password_hash=generate_password_hash(password)
        )
        db.session.add(new_user)
        try:
            db.session.commit()
            login_user(new_user)
            return redirect(url_for('main.inicio'))
        except Exception as e:
            db.session.rollback()
            flash('Error al crear usuario. Es posible que el nombre de usuario ya exista.', 'error')
            return redirect(url_for('auth.register'))
        
    return render_template('auth/register.html')

@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('main.inicio'))
