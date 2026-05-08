# Script de réinitialisation complète du projet Residanat TN (V3 - Version Finale)
# Garde uniquement le compte administrateur (CIN: 00000000)

Write-Host "⚠️  ATTENTION : Nettoyage complet en cours..." -ForegroundColor Yellow

# 1. AUTH SERVICE
Write-Host "Cleaning Auth database (residanat_db)..."
docker exec -i pfe_version-postgres-auth-1 psql -U postgres -d residanat_db -c "
DELETE FROM utilisateurs WHERE cin != '00000000';
"

# 2. CONCOURS SERVICE
Write-Host "Cleaning Concours database..."
docker exec -i pfe_version-postgres-concours-1 psql -U postgres -d residanat_concours_db -c "
TRUNCATE TABLE concours, resultats_candidats RESTART IDENTITY CASCADE;
"

# 3. DOSSIER SERVICE
Write-Host "Cleaning Dossier database..."
docker exec -i pfe_version-postgres-dossier-1 psql -U postgres -d residanat_dossier_db -c "
TRUNCATE TABLE documents, dossiers_candidature, evaluations_ia RESTART IDENTITY CASCADE;
"

# 4. RESULTAT SERVICE
Write-Host "Cleaning Resultat database..."
docker exec -i pfe_version-postgres-resultat-1 psql -U postgres -d residanat_resultat_db -c "
TRUNCATE TABLE import_resultat_traces, publication_concours, resultats_candidat RESTART IDENTITY CASCADE;
"

# 5. CONVOCATION SERVICE
Write-Host "Cleaning Convocation database..."
docker exec -i pfe_version-postgres-convocation-1 psql -U postgres -d residanat_convocation_db -c "
TRUNCATE TABLE affectations_ministere, convocations RESTART IDENTITY CASCADE;
"

# 6. RECLAMATION SERVICE
Write-Host "Cleaning Reclamation database..."
docker exec -i pfe_version-postgres-reclamation-1 psql -U postgres -d residanat_reclamation_db -c "
TRUNCATE TABLE reclamations RESTART IDENTITY CASCADE;
"

# 7. NOTIFICATION SERVICE
Write-Host "Cleaning Notification database..."
docker exec -i pfe_version-postgres-notification-1 psql -U postgres -d residanat_notification_db -c "
TRUNCATE TABLE notifications RESTART IDENTITY CASCADE;
"

Write-Host "✅  TERMINÉ ! La base est propre. Seul l'admin (CIN: 00000000) reste." -ForegroundColor Green
