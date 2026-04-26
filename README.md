# ReelSync AI

Prototype web mobile pour créer une preview de Reel vertical 9:16 avec :
- upload photos/vidéos
- upload audio
- choix de style
- transitions animées
- export vidéo côté navigateur

## Déployer sur Vercel avec GitHub

### Étape 1 — Créer le repo GitHub
1. Va sur https://github.com
2. Crée un compte ou connecte-toi
3. Clique sur **+**
4. Clique **New repository**
5. Nom du repo : `reelsync-ai`
6. Mets-le en **Public**
7. Clique **Create repository**

### Étape 2 — Ajouter les fichiers
Sur la page du repo :
1. Clique **uploading an existing file**
2. Ajoute tous les fichiers de ce dossier :
   - `index.html`
   - `app.js`
   - `package.json`
   - `vercel.json`
   - `manifest.json`
3. Clique **Commit changes**

### Étape 3 — Déployer sur Vercel
1. Va sur https://vercel.com
2. Clique **Add New**
3. Clique **Project**
4. Choisis ton repo GitHub `reelsync-ai`
5. Clique **Deploy**

Vercel te donnera une vraie URL publique du type :
`https://reelsync-ai.vercel.app`

## Note importante

Ce prototype fonctionne directement dans le navigateur.
Sur iPhone, l’export vidéo dépend de Safari/iOS.
Pour une vraie application robuste, la prochaine version doit ajouter un backend FFmpeg.
