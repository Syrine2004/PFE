# 1. Vérifiez (Windows):
powershell -ExecutionPolicy Bypass -File scripts/verify-gitignore.ps1

# Ou (Linux/Mac):
bash scripts/verify-gitignore.sh

# 2. Committez:
git add .
git commit -m "chore: setup gitignore complet et documentation"

# 3. Poussez:
git push origin main# Guide de Déploiement - ResidanatTN

Ce document décrit comment déployer ResidanatTN en environnement de production.

## 📋 Prérequis de Production

- **Serveur Linux** (Ubuntu 20.04+ ou similaire)
- **Docker CE 20.10+** et **Docker Compose 2.0+**
- **Nginx** ou **HAProxy** pour la reverse proxy
- **Let's Encrypt SSL** pour HTTPS
- **DNS** configuré
- **Backup strategy** planifiée

## 🔐 Considérations de Sécurité

### Variables d'Environnement Sensibles

⚠️ **JAMAIS** commiter `.env` en production!

```bash
# Stockez les secrets dans:
# 1. Variables d'environnement du serveur (recommandé)
# 2. Secrets de Docker Swarm (si utilisable)
# 3. Vault (HashiCorp) ou AWS Secrets Manager
# 4. Fichiers .env.prod dans un stockage sécurisé
```

### Secrets à Changer Obligatoirement

```bash
# .env.prod DOIT avoir:
- JWT_SECRET = nouvelle clé longue (32+ caractères)
- DB_AUTH_PASSWORD = mot de passe fort
- DB_CONCOURS_PASSWORD = mot de passe fort
- DB_DOSSIER_PASSWORD = mot de passe fort
- RABBITMQ_PASSWORD = mot de passe fort
```

## 🚀 Déploiement avec Docker Compose

### 1. Préparation du serveur

```bash
# Connectez-vous au serveur
ssh user@your-server.com

# Clonez le repository
git clone https://github.com/votre-organisation/pfe_version.git
cd pfe_version

# Créez les fichiers de configuration
cp .env.example .env.prod
nano .env.prod  # Editez avec vos values de production
```

### 2. Configuration Docker pour Production

Créez `docker-compose.prod.yml`:

```bash
# Basez-le sur docker-compose.yml mais avec:
# - Volumes persistants pour les BDD
# - Policies de restart: always
# - Ressources limitées (memory limits)
# - Logging configuré
```

### 3. Lancez les services

```bash
# Commencez par les dépendances
docker-compose -f docker-compose.prod.yml up -d postgres-auth postgres-concours postgres-dossier rabbitmq

# Attendez qu'elles soient healthy
sleep 30

# Lancez tous les services
docker-compose -f docker-compose.prod.yml up -d

# Vérifiez le statut
docker-compose -f docker-compose.prod.yml ps
```

### 4. Configurez Nginx (Reverse Proxy)

```nginx
# /etc/nginx/sites-available/residanat
upstream api_backend {
    server localhost:8080;
}

upstream frontend {
    server localhost:4200;
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API Gateway
    location /api/ {
        proxy_pass http://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts pour les appels API longs
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Logs
    access_log /var/log/nginx/residanat_access.log;
    error_log /var/log/nginx/residanat_error.log;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/json application/javascript;
    gzip_min_length 1000;
}
```

### 5. Configurer SSL avec Let's Encrypt

```bash
# Installez certbot
sudo apt-get install certbot python3-certbot-nginx

# Générez le certificat
sudo certbot certonly --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal (création d'une cron job)
sudo certbot renew --dry-run
```

## 📊 Monitoring & Maintenance

### Logs

```bash
# Logs de tous les services
docker-compose -f docker-compose.prod.yml logs -f

# Logs d'un service spécifique
docker-compose -f docker-compose.prod.yml logs -f auth-service

# Logs du système
tail -f /var/log/syslog
```

### Backups des Bases de Données

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/residanat"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup PostgreSQL Auth
docker-compose exec -T postgres-auth pg_dump -U postgres residanat_auth | \
    gzip > "$BACKUP_DIR/auth_$DATE.sql.gz"

# Backup PostgreSQL Concours
docker-compose exec -T postgres-concours pg_dump -U postgres residanat_concours | \
    gzip > "$BACKUP_DIR/concours_$DATE.sql.gz"

# Backup PostgreSQL Dossier
docker-compose exec -T postgres-dossier pg_dump -U postgres residanat_dossier | \
    gzip > "$BACKUP_DIR/dossier_$DATE.sql.gz"

# Gardez seulement les 7 derniers jours
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed at $DATE"
```

Ajoutez dans crontab:
```bash
crontab -e
# Backup tous les jours à 2h du matin
0 2 * * * /home/user/backup.sh
```

### Health Checks

```bash
#!/bin/bash
# health-check.sh

# Vérifiez que les services répondent
curl -s http://localhost:8080/actuator/health | jq .
curl -s http://localhost:8761/actuator/health | jq .

# Vérifiez les databases
docker-compose exec -T postgres-auth pg_isready -U postgres
```

## 🚨 Rollback en Cas de Problème

```bash
# 1. Arrêtez les services
docker-compose -f docker-compose.prod.yml down

# 2. Restaurez une version antérieure depuis git
git checkout <commit-hash>

# 3. Reconstruisez les images
docker-compose -f docker-compose.prod.yml up -d --build

# 4. Restaurez la base de données si nécessaire
docker-compose exec postgres-auth psql -U postgres < backup.sql
```

## 📈 Performance & Scaling

### Limit Resources

```yaml
# docker-compose.prod.yml
services:
  auth-service:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### Restart Policies

```yaml
services:
  auth-service:
    restart_policy:
      condition: on-failure
      delay: 5s
      max_attempts: 3
      window: 120s
```

## ✅ Checklist de Production

- [ ] Variables d'environnement changées (secrets, tokens)
- [ ] SSL certificates configurés avec Let's Encrypt
- [ ] Reverse proxy (Nginx) configuré
- [ ] Backups des BDD planifiés
- [ ] Monitoring/Alerts configurés
- [ ] Health checks en place
- [ ] Logs centralisés (optionnel)
- [ ] Firewalls configuré
- [ ] Rate limiting activé
- [ ] CORS configuré correctement
- [ ] Tests de charge effectués
- [ ] Plan de disaster recovery documenté

---

**Pour questions: [email ou contact]**
