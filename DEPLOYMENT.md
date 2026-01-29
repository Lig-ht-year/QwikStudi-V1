# Deployment Guide for GLINAX Project

This document outlines the steps to prepare and deploy the GLINAX project for production, including backend and frontend setup, environment configuration, and running the application securely.

---

## 1. Environment Configuration

- Create a `.env` file in the root of the backend project (`gweb/gweb/`) with the following variables:

```
PAYSTACK_SECRET_KEY=your_live_paystack_secret_key
PAYSTACK_PUBLIC_KEY=your_live_paystack_public_key
DJANGO_SECRET_KEY=your_django_secret_key
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
DATABASE_URL=postgres://user:password@host:port/dbname
```

- Replace the placeholders with your actual live credentials and database connection details.

- Ensure `.env` is added to `.gitignore` to avoid committing sensitive data.

---

## 2. Django Settings Adjustments

- Modify `settings.py` to read from environment variables:

```python
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY')
DEBUG = os.getenv('DEBUG', 'False') == 'True'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '').split(',')

PAYSTACK_SECRET_KEY = os.getenv('PAYSTACK_SECRET_KEY')
PAYSTACK_PUBLIC_KEY = os.getenv('PAYSTACK_PUBLIC_KEY')
```

- Ensure `DEBUG` is set to `False` in production.

- Set `ALLOWED_HOSTS` to your domain(s).

---

## 3. Database Setup

- Use a production-ready PostgreSQL database.

- Update `DATABASES` setting in `settings.py` to use environment variable or production database credentials.

---

## 4. Static Files

- Collect static files before deployment:

```bash
python manage.py collectstatic
```

- Configure your web server (e.g., Nginx) to serve static files.

---

## 5. Frontend Build

- Navigate to the frontend directory `gweb/glinax-frontend/`.

- Install dependencies:

```bash
npm install
```

- Build the Next.js app for production:

```bash
npm run build
```

- Start the production server:

```bash
npm start
```

- Alternatively, deploy the frontend to a platform like Vercel.

---

## 6. Running the Backend

- Use a production WSGI server like Gunicorn:

```bash
gunicorn gweb.wsgi:application --bind 0.0.0.0:8000
```

- Use a process manager like Supervisor or systemd to keep the server running.

---

## 7. HTTPS and Domain

- Configure your domain DNS to point to your server.

- Use Let's Encrypt or another CA to obtain SSL certificates.

- Configure your web server (Nginx/Apache) to proxy requests to Gunicorn and serve HTTPS.

---

## 8. Environment Variables on Server

- Set environment variables on your server or use a `.env` file.

- Ensure the server user running the app has access to these variables.

---

## 9. Additional Recommendations

- Monitor logs for errors.

- Set up backups for your database.

- Regularly update dependencies and security patches.

---

If you want, I can help you create or update specific configuration files or scripts for deployment.
