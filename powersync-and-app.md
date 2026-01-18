# Sederize iOS App & Offline Support

> **Dernière mise à jour**: 2026-01-18
> **Statut**: Phase 2 en cours - Infrastructure PowerSync créée

---

# 🚀 CONFIGURATION POWERSYNC - GUIDE DÉTAILLÉ

## PARTIE A : Récupérer les informations Supabase

### A.1 - Trouver ta Connection String

1. Ouvre https://supabase.com/dashboard
2. Clique sur ton projet Sederize
3. Dans le menu de gauche, clique sur **"Project Settings"** (l'icône engrenage ⚙️ tout en bas)
4. Clique sur **"Database"** dans le sous-menu
5. Scroll jusqu'à la section **"Connection string"**
6. Clique sur l'onglet **"URI"** (pas "PSQL" !)
7. Tu vois quelque chose comme :
   ```
   postgresql://postgres.abc123:[YOUR-PASSWORD]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
   ```
8. Clique sur **"Copy"** pour copier
9. **IMPORTANT** : Remplace `[YOUR-PASSWORD]` par ton vrai mot de passe de base de données
   - Si tu ne t'en souviens pas, clique sur **"Reset database password"** pour en créer un nouveau
10. **Colle cette URL quelque part** (un fichier texte temporaire), tu en auras besoin

### A.2 - Trouver ton JWT Secret

1. Tu es toujours dans **Project Settings**
2. Clique sur **"API"** dans le sous-menu (ou **"Data API"** selon la version)
3. Scroll jusqu'à la section **"JWT Settings"**
4. Tu vois un champ **"JWT Secret"** avec des points (caché)
5. Clique sur **"Reveal"** pour voir le secret
6. Clique sur **"Copy"** pour copier
7. **Colle ce secret quelque part** (le même fichier texte), tu en auras besoin

---

## PARTIE B : Configurer PowerSync

### B.1 - Se connecter à PowerSync

1. Ouvre https://powersync.com
2. Connecte-toi à ton compte (tu as dit qu'il était créé)
3. Tu arrives sur le dashboard

### B.2 - Créer une instance (si pas déjà fait)

1. Si tu vois un bouton **"Create Instance"** ou **"New Instance"**, clique dessus
2. Donne un nom : `sederize`
3. Choisis une région proche de toi (ex: `eu-west` pour l'Europe)
4. Clique sur **"Create"**
5. Attends que l'instance soit créée (quelques secondes)

### B.3 - Connecter PowerSync à Supabase

1. Dans ton instance PowerSync, cherche **"Connections"** ou **"Database Connections"** dans le menu
2. Clique sur **"Add Connection"** ou **"New Connection"**
3. Choisis le type : **"PostgreSQL"**
4. Tu vois un formulaire. Remplis-le :

   **Option 1 - Si tu vois un champ "Connection URI" :**
   - Colle ta connection string de l'étape A.1
   - N'oublie pas d'avoir remplacé `[YOUR-PASSWORD]` par ton vrai mot de passe !

   **Option 2 - Si tu vois des champs séparés :**
   - **Host** : `aws-0-eu-west-1.pooler.supabase.com` (la partie après @ et avant :)
   - **Port** : `6543` (le nombre après :)
   - **Database** : `postgres`
   - **Username** : `postgres.abc123` (la partie après // et avant :)
   - **Password** : ton mot de passe de DB

5. Clique sur **"Test Connection"** pour vérifier
6. Si ça dit "Connection successful" ✅, clique sur **"Save"** ou **"Create"**
7. Si erreur ❌, vérifie :
   - As-tu bien remplacé `[YOUR-PASSWORD]` ?
   - Le mot de passe est-il correct ?
   - Ton projet Supabase est-il actif (pas en pause) ?

### B.4 - Configurer l'authentification

1. Dans le menu PowerSync, cherche **"Authentication"** ou **"Auth"**
2. Clique dessus
3. Tu vois des options de configuration
4. Cherche un champ **"JWT Secret"** ou une option **"Supabase"**
5. Colle le **JWT Secret** que tu as copié à l'étape A.2
6. Clique sur **"Save"**

### B.5 - Configurer les Sync Rules

1. Dans le menu PowerSync, cherche **"Sync Rules"**
2. Clique dessus
3. Tu vois un éditeur de texte/code
4. **Supprime tout** ce qu'il y a dedans
5. **Copie-colle exactement ceci** :

```yaml
bucket_definitions:
  user_data:
    parameters: SELECT token->>'sub' as user_id FROM jwt
    data:
      - SELECT * FROM tasks WHERE user_id = bucket.user_id
      - SELECT * FROM themes WHERE user_id = bucket.user_id
      - SELECT * FROM subjects WHERE user_id = bucket.user_id
      - SELECT * FROM categories WHERE user_id = bucket.user_id
      - SELECT * FROM labels WHERE user_id = bucket.user_id
      - SELECT tl.* FROM task_labels tl JOIN tasks t ON tl.task_id = t.id WHERE t.user_id = bucket.user_id
      - SELECT * FROM pending_items WHERE user_id = bucket.user_id
      - SELECT * FROM user_preferences WHERE user_id = bucket.user_id
```

6. Clique sur **"Save"** ou **"Deploy"**
7. Attends la validation (quelques secondes)

### B.6 - Récupérer l'URL PowerSync

1. Dans le menu PowerSync, va dans **"Overview"** ou **"Instance Details"** ou **"Home"**
2. Cherche **"Instance URL"** ou **"Endpoint URL"** ou juste **"URL"**
3. Tu vois quelque chose comme :
   ```
   https://abc123def456.powersync.journeyapps.com
   ```
4. **Copie cette URL**

---

## PARTIE C : Ajouter l'URL dans ton projet

### C.1 - Modifier le fichier .env.local

1. Ouvre le fichier `.env.local` à la racine de ton projet Sederize
   - Il est au même niveau que `package.json`
   - Si tu ne le vois pas, il est peut-être caché (fichiers commençant par `.`)

2. Le fichier ressemble à ça :
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
   ```

3. Ajoute une nouvelle ligne à la fin :
   ```
   NEXT_PUBLIC_POWERSYNC_URL=https://ton-url-powersync.powersync.journeyapps.com
   ```
   (Remplace par l'URL que tu as copiée à l'étape B.6)

4. Sauvegarde le fichier

### C.2 - Redémarrer le serveur de développement

1. Si `npm run dev` tourne, arrête-le (Ctrl+C dans le terminal)
2. Relance avec `npm run dev`
3. Ouvre http://localhost:3000

### C.3 - Vérifier que ça marche

1. Connecte-toi à l'app
2. Regarde dans le header de la sidebar (à côté du logo "SEDERIZE")
3. Tu devrais voir un **petit point de couleur** :
   - 🟢 **Vert** = Connecté et synchronisé ✅
   - 🔵 **Bleu clignotant** = En train de synchroniser
   - 🟠 **Orange** = Hors ligne (pas de connexion au serveur PowerSync)
   - 🔴 **Rouge** = Erreur de connexion

4. Si c'est **vert** ou **bleu** : tout est bon ! 🎉
5. Si c'est **orange** ou **rouge** : il y a un problème, dis-moi ce que tu vois

---

## ❓ PROBLÈMES FRÉQUENTS

### "Je ne trouve pas la Connection String dans Supabase"
- Assure-toi d'être dans **Project Settings** (engrenage en bas à gauche)
- Puis **Database**
- Puis scroll vers le bas

### "Test Connection échoue dans PowerSync"
- Vérifie que tu as remplacé `[YOUR-PASSWORD]` par ton vrai mot de passe
- Vérifie que ton projet Supabase n'est pas en pause (gratuit = pause après 7 jours d'inactivité)
- Essaie de reset ton mot de passe DB dans Supabase si tu l'as oublié

### "Je ne vois pas le point de couleur dans la sidebar"
- As-tu bien ajouté `NEXT_PUBLIC_POWERSYNC_URL` dans `.env.local` ?
- As-tu relancé `npm run dev` après avoir modifié `.env.local` ?
- Ouvre la console du navigateur (F12) et regarde s'il y a des erreurs

### "Le point est rouge"
- Ouvre la console du navigateur (F12)
- Regarde les erreurs en rouge
- Copie-colle moi l'erreur

---

## ✅ CHECKLIST FINALE (COMPLÉTÉE 2026-01-18)

- [x] Connection string Supabase copiée (via bouton "Connect")
- [x] JWT Legacy Secret copié
- [x] Instance PowerSync créée (`sederize`)
- [x] Connection à PostgreSQL configurée et testée ✅
- [x] Publication PostgreSQL créée (`powersync`)
- [x] Authentification configurée avec le JWT Secret
- [x] Sync Rules configurées (voir section ci-dessous)
- [x] URL PowerSync : `https://696c1946cc2560584a00c95e.powersync.journeyapps.com`
- [x] URL ajoutée dans `.env.local`
- [x] `npm run dev` relancé
- [x] Point de couleur **VERT** visible ✅

### Sync Rules utilisées
```yaml
bucket_definitions:
  user_data:
    parameters: SELECT request.user_id() as id
    data:
      - SELECT * FROM tasks WHERE user_id = bucket.id
      - SELECT * FROM themes WHERE user_id = bucket.id
      - SELECT * FROM subjects WHERE user_id = bucket.id
      - SELECT * FROM categories WHERE user_id = bucket.id
      - SELECT * FROM labels WHERE user_id = bucket.id
      - SELECT * FROM pending_items WHERE user_id = bucket.id
```

### Publication PostgreSQL (dans Supabase SQL Editor)
```sql
CREATE PUBLICATION powersync FOR TABLE
  tasks,
  themes,
  subjects,
  categories,
  labels,
  task_labels,
  pending_items;
```

---

# 📊 PROGRESSION DU PROJET

## ✅ Phase 1 & 2 - Terminé
- [x] Icônes corrigées (512x512, 1024x1024)
- [x] manifest.json mis à jour
- [x] @powersync/web et @powersync/react installés
- [x] Schema PowerSync créé
- [x] Connector PowerSync créé
- [x] Provider PowerSync créé
- [x] UI sync status créé
- [x] SyncIndicator ajouté dans la sidebar
- [x] **PowerSync configuré et connecté (point vert)**

## ⏳ Prochaines étapes
1. [ ] Agent : **Adapter les hooks React Query pour utiliser PowerSync** (lectures offline)
2. [ ] Agent : Setup Capacitor pour iOS
3. [ ] **Toi** : Créer compte Apple Developer ($99/an)
4. [ ] Agent : Push notifications
5. [ ] Agent : Widgets iOS
6. [ ] Agent : Soumission App Store

---

# 📁 FICHIERS DE RÉFÉRENCE

| Fichier | Description |
|---------|-------------|
| `src/lib/powersync/schema.ts` | Définition des tables pour sync |
| `src/lib/powersync/connector.ts` | Connexion Supabase ↔ PowerSync |
| `src/providers/powersync-provider.tsx` | Provider React |
| `src/components/ui/sync-status.tsx` | Indicateur de sync |
| `.env.local.example` | Exemple de variables d'environnement |

---

# 💰 COÛTS

| Service | Coût | Pour quoi |
|---------|------|-----------|
| Apple Developer | $99/an | Publier sur App Store |
| PowerSync | Gratuit (10MB) | Sync offline |
| Supabase | Ton plan actuel | Pas de changement |
| Vercel | Ton plan actuel | Version web |
