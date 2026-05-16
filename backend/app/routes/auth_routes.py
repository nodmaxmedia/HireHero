from flask import Blueprint, request, jsonify, redirect, url_for, session
from app.models.user import User
from app.models.employee import Employee
from app.models.otp import PasswordResetOTP
from app import db
import jwt
import datetime
from datetime import timezone
import random
import smtplib
import ssl
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app
from authlib.integrations.flask_client import OAuth

auth_bp = Blueprint('auth', __name__)
oauth = OAuth()

def init_oauth(app):
    oauth.init_app(app)
    oauth.register(
        name='google',
        client_id=app.config.get('GOOGLE_CLIENT_ID'),
        client_secret=app.config.get('GOOGLE_CLIENT_SECRET'),
        access_token_url='https://accounts.google.com/o/oauth2/token',
        access_token_params=None,
        authorize_url='https://accounts.google.com/o/oauth2/auth',
        authorize_params=None,
        api_base_url='https://www.googleapis.com/oauth2/v1/',
        userinfo_endpoint='https://openidconnect.googleapis.com/v1/userinfo',
        client_kwargs={'scope': 'openid email profile'}
    )

@auth_bp.route('/ping', methods=['GET'])
def ping():
    return jsonify({'msg': 'auth ok'})

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    if User.query.filter_by(email=data.get('email')).first():
        return jsonify({'error': 'Email already exists'}), 400
    if not data.get('phone'):
        return jsonify({'error': 'Phone number is required'}), 400
    first_name = data.get('firstName')
    phone = data.get('phone')
    user = User(
        first_name=first_name,
        last_name=data.get('lastName'),
        company_name=data.get('companyName'),
        email=data.get('email'),
        role=data.get('role')
    )
    user.set_password(data.get('password'))
    db.session.add(user)
    db.session.commit()
    # Create profile for user
    from app.models.profile import Profile
    profile = Profile(user_id=user.id, phone=phone)
    db.session.add(profile)
    db.session.commit()
    # Compose user_id as firstname+last 3 digits of phone
    phone_digits = ''.join(filter(str.isdigit, phone))
    user_id = f"{first_name}{phone_digits[-3:]}" if len(phone_digits) >= 3 else f"{first_name}{phone_digits}"
    return jsonify({'message': 'User registered successfully', 'user_id': user_id, 'id': user.id}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(email=data.get('email')).first()
    if user and user.check_password(data.get('password')):
        # Get phone from profile
        profile = user.profile
        phone = profile.phone if profile else ''
        first_name = user.first_name
        phone_digits = ''.join(filter(str.isdigit, phone))
        user_id = f"{first_name}{phone_digits[-3:]}" if len(phone_digits) >= 3 else f"{first_name}{phone_digits}"
        token = jwt.encode({
            'user_id': user.id,
            'role': user.role,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, current_app.config['SECRET_KEY'], algorithm='HS256')
        return jsonify({'message': 'Login successful', 'token': token, 'role': user.role, 'user_id': user_id, 'id': user.id}), 200
    return jsonify({'error': 'Invalid credentials'}), 401

@auth_bp.route('/change-password', methods=['PUT'])
def change_password():
    # Verify Token
    auth_header = request.headers.get('Authorization', None)
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing or invalid token'}), 401
    token = auth_header.split(' ')[1]
    try:
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        user = User.query.get(payload.get('user_id'))
        if not user:
            return jsonify({'error': 'User not found'}), 404
    except Exception:
        return jsonify({'error': 'Invalid token'}), 401

    data = request.json
    current_password = data.get('current_password')
    new_password = data.get('new_password')

    if not current_password or not new_password:
        return jsonify({'error': 'Current and new passwords are required'}), 400

    if not user.check_password(current_password):
        return jsonify({'error': 'Incorrect current password'}), 400

    user.set_password(new_password)
    db.session.commit()

    return jsonify({'message': 'Password updated successfully'}), 200

@auth_bp.route('/google-login')
def google_login():
    role = request.args.get('role')
    if role:
        session['google_role'] = role
    redirect_uri = url_for('auth.google_auth_callback', _external=True)
    return oauth.google.authorize_redirect(redirect_uri)

@auth_bp.route('/google-auth-callback')
def google_auth_callback():
    token = oauth.google.authorize_access_token()
    userinfo = oauth.google.parse_id_token(token)
    email = userinfo['email']
    user = User.query.filter_by(email=email).first()
    if not user:
        # New user, ask for role selection (frontend should handle this)
        session['google_email'] = email
        session['google_name'] = userinfo.get('name', '')
        return redirect('/select-role')  # Frontend route to select role
    # Existing user, login
    jwt_token = jwt.encode({
        'user_id': user.id,
        'role': user.role,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, current_app.config['SECRET_KEY'], algorithm='HS256')
    return redirect(f'/google-auth-success?token={jwt_token}&role={user.role}')

@auth_bp.route('/google-register', methods=['POST'])
def google_register():
    data = request.json
    email = session.get('google_email')
    name = session.get('google_name')
    role = session.get('google_role')
    if not email or not role:
        return jsonify({'error': 'Missing data'}), 400
    user = User(
        first_name=name.split(' ')[0],
        last_name=' '.join(name.split(' ')[1:]),
        company_name='',
        email=email,
        role=role
    )
    user.set_password('')  # No password for Google users
    db.session.add(user)
    db.session.commit()
    jwt_token = jwt.encode({
        'user_id': user.id,
        'role': user.role,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, current_app.config['SECRET_KEY'], algorithm='HS256')
    return jsonify({'message': 'Google registration successful', 'token': jwt_token, 'role': user.role}), 201

# Get current user info from JWT
@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    auth_header = request.headers.get('Authorization', None)
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing or invalid token'}), 401
    token = auth_header.split(' ')[1]
    try:
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        user = User.query.get(payload.get('user_id'))
        if not user:
            return jsonify({'error': 'User not found'}), 404
        return jsonify({
            'id': user.id,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'company_name': user.company_name,
            'email': user.email,
            'role': user.role
        })
    except Exception as e:
        return jsonify({'error': 'Invalid token'}), 401
    

@auth_bp.route('/users/basic', methods=['GET'])
def get_users_basic():
    # Only fetch users with role 'candidate'
    users = User.query.filter_by(role='candidate').all()
    result = []
    for user in users:
        phone = ''
        if user.profile:
            phone = user.profile.phone or ''
        # Find employee record by querying Employee table directly
        employee = Employee.query.filter_by(user_id=str(user.id)).first()
        employee_id = employee.id if employee else None
        result.append({
            'id': user.id,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'email': user.email,
            'phone': phone,
            'employee_id': employee_id
        })
    return jsonify(result)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _send_otp_email(recipient_email: str, otp_code: str, first_name: str) -> bool:
    """Send OTP via Gmail SMTP. Returns True on success."""
    mail_user = os.getenv('MAIL_USERNAME')
    mail_pass = os.getenv('MAIL_PASSWORD')
    mail_from = os.getenv('MAIL_FROM', mail_user)
    mail_server = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    mail_port = int(os.getenv('MAIL_PORT', 587))

    if not mail_user or not mail_pass:
        # Dev fallback: print OTP to console so the app still works without email config
        print(f"[DEV] OTP for {recipient_email}: {otp_code}")
        return True

    msg = MIMEMultipart('alternative')
    msg['Subject'] = 'HireHero – Your Password Reset OTP'
    msg['From'] = f'HireHero <{mail_from}>'
    msg['To'] = recipient_email

    html_body = f"""
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px">
      <h2 style="color:#013362;margin-bottom:8px">Password Reset</h2>
      <p style="color:#374151">Hi {first_name},</p>
      <p style="color:#374151">Use the OTP below to reset your HireHero password. It expires in <strong>10 minutes</strong>.</p>
      <div style="background:#f3f4f6;border-radius:8px;padding:20px 32px;text-align:center;margin:24px 0">
        <span style="font-size:36px;font-weight:700;letter-spacing:12px;color:#013362">{otp_code}</span>
      </div>
      <p style="color:#6b7280;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
    </div>
    """
    msg.attach(MIMEText(html_body, 'html'))

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(mail_server, mail_port) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(mail_user, mail_pass)
            server.sendmail(mail_from, recipient_email, msg.as_string())
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        return False


# ── Forgot Password Endpoints ─────────────────────────────────────────────────

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json or {}
    email = (data.get('email') or '').strip().lower()

    if not email:
        return jsonify({'error': 'Email is required'}), 400

    user = User.query.filter_by(email=email).first()
    # Always return 200 to avoid leaking whether the email is registered
    if not user:
        return jsonify({'message': 'If that email is registered, an OTP has been sent.'}), 200

    # Invalidate any previous OTPs for this email
    PasswordResetOTP.query.filter_by(email=email, is_used=False).update({'is_used': True})
    db.session.flush()

    otp_code = str(random.randint(100000, 999999))
    expires_at = datetime.datetime.now(timezone.utc) + datetime.timedelta(minutes=10)

    otp_record = PasswordResetOTP(email=email, otp_code=otp_code, expires_at=expires_at)
    db.session.add(otp_record)
    db.session.commit()

    sent = _send_otp_email(email, otp_code, user.first_name)
    if not sent:
        return jsonify({'error': 'Failed to send OTP email. Please try again.'}), 500

    return jsonify({'message': 'If that email is registered, an OTP has been sent.'}), 200


@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    data = request.json or {}
    email = (data.get('email') or '').strip().lower()
    otp_code = (data.get('otp') or '').strip()

    if not email or not otp_code:
        return jsonify({'error': 'Email and OTP are required'}), 400

    record = (PasswordResetOTP.query
              .filter_by(email=email, otp_code=otp_code, is_used=False)
              .order_by(PasswordResetOTP.created_at.desc())
              .first())

    if not record:
        return jsonify({'error': 'Invalid OTP'}), 400

    if datetime.datetime.now(timezone.utc) > record.expires_at.replace(tzinfo=timezone.utc):
        return jsonify({'error': 'OTP has expired. Please request a new one.'}), 400

    return jsonify({'message': 'OTP verified successfully'}), 200


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.json or {}
    email = (data.get('email') or '').strip().lower()
    otp_code = (data.get('otp') or '').strip()
    new_password = data.get('new_password') or ''

    if not email or not otp_code or not new_password:
        return jsonify({'error': 'Email, OTP, and new password are required'}), 400

    if len(new_password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    record = (PasswordResetOTP.query
              .filter_by(email=email, otp_code=otp_code, is_used=False)
              .order_by(PasswordResetOTP.created_at.desc())
              .first())

    if not record:
        return jsonify({'error': 'Invalid OTP'}), 400

    if datetime.datetime.now(timezone.utc) > record.expires_at.replace(tzinfo=timezone.utc):
        return jsonify({'error': 'OTP has expired. Please request a new one.'}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    user.set_password(new_password)
    record.is_used = True
    db.session.commit()

    return jsonify({'message': 'Password reset successfully. You can now log in.'}), 200