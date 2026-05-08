# Guide de Démarrage du Resultat-Service

## Erreur actuellement rencontrée
```
net::ERR_CONNECTION_REFUSED
POST http://localhost:8088/api/admin/resultats/import
```

**Cause**: Le **resultat-service** backend n'est pas en cours d'exécution

## Solution: Lancer le service

### Option 1: Avec Maven (recommandé)
```bash
cd BACKEND/resultat-service
mvn clean spring-boot:run
```

### Option 2: Avec Java (JAR)
```bash
cd BACKEND/resultat-service
mvn clean package
java -jar target/resultat-service-*.jar
```

### Option 3: Avec Docker
```bash
cd BACKEND/resultat-service
docker build -t resultat-service .
docker run -p 8088:8088 resultat-service
```

## Configuration requise

### Port
- Default: **8088**
- Variable env: `SERVER_PORT=8088`
- Fichier: `application.yml` ou `application-docker.yml`

### Base de données
- Assurer que la base MySQL/PostgreSQL est accessible
- Tables: `resultats_candidat`, `import_resultat_trace`
- Schéma: check `BACKEND/shared-config/sprint2_resultat_service.sql`

### RabbitMQ (pour les notifications)
- Host: **localhost** ou 127.0.0.1
- Port: **5672** (par défaut)
- Queue: `q.notification.resultats.publies`
- Exchange: `concours.exchange`

## Vérifier que le service est actif

```bash
# Test sur le port
netstat -ano | findstr 8088

# Ou
curl http://localhost:8088/actuator/health
```

## Logs debug

En cas d'erreur, vérifier les logs:
```
target/logs/resultat-service.log
```

## Prochaines étapes après le démarrage

1. ✅ Créer le fichier Excel (`resultats_exemple.csv` → convertir en `.xlsx`)
2. ✅ Importer le fichier via l'interface Admin
3. ✅ Cliquer "Publier & Notifier"
4. ✅ Les résultats seront visibles pour les candidats
