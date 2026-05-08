# 🚀 Guide d'activation n8n (Pour le développement)

Pour que les notifications par email fonctionnent sur ton PC, suis ces étapes simples après avoir lancé `docker-compose up`.

## 1. Accès à n8n
Ouvre ton navigateur sur : [http://localhost:5678](http://localhost:5678)

## 2. Importer les Workflows
Les modèles de mails sont déjà dans le dossier `n8n/workflows/`.
1. Dans n8n, clique sur **Workflows** > **Add Workflow**.
2. Clique sur les **trois points (...)** en haut à droite.
3. Choisis **Import from file**.
4. Sélectionne les fichiers dans `n8n/workflows/` :
   - `notifications_workflow.json`
   - `password_reset_workflow.json`
5. Pour chaque workflow, clique sur le bouton **Published** (en haut à droite) pour qu'il devienne **VERT**.

## 3. Configurer l'envoi d'emails (SMTP)
n8n a besoin de tes identifiants pour envoyer les mails (car ils sont secrets et non inclus dans Git).
1. Va dans l'onglet **Credentials** (icône clé 🔑 à gauche).
2. Clique sur **Add Credential** et cherche **SMTP**.
3. Remplis avec ces informations :
   - **User** : `adminresidanat2026@gmail.com`
   - **Password** : *(Demande le code à 16 chiffres à Syrine ou génère ton propre "App Password" Google)*
   - **Host** : `smtp.gmail.com`
   - **Port** : `465`
   - **SSL/TLS** : `ON` (Activé)

---
*Note : Une fois ces étapes faites, ton environnement sera 100% identique à celui de Syrine !*
