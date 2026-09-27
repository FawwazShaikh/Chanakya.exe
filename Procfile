# Render uses this to start the production server
# gunicorn handles HTTPS termination through Render's proxy — no ssl_context needed
web: gunicorn app:app --bind 0.0.0.0:$PORT
