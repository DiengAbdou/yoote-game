# Yoote; Jeu de stratégie sénégalais multijoueur

Application web temps réel déployée en production, avec authentification, 
sécurité backend et support multiplateforme (PWA + Android APK).

**Lien live :** [yoote.netlify.app](https://yoote.netlify.app/)

---

## En cours : Bot IA par Apprentissage par Renforcement (Deep RL)

Le bot actuel repose sur l'algorithme classique **Minimax avec élagage Alpha-Beta** (avec une profondeur dynamique allant jusqu'à 11 coups en fin de partie). 

La prochaine étape majeure du projet est de le remplacer par un **agent intelligent entraîné par renforcement** :

- **Approche envisagée :** PPO (Proximal Policy Optimization) ou architecture de type AlphaZero (Self-play + MCTS + Réseau de neurones).
- **Stack technique :** Python (PyTorch / Stable-Baselines3).
- **Pipeline ML :** Entraînement en local -> Export du modèle (ex: format ONNX) -> Déploiement et intégration via une Edge Function Supabase ou une API Python dédiée.

---

## Architecture technique

Ce projet explore une architecture full-stack complète :

| Couche | Technologie | Détail |
|--------|-------------|--------|
| Base de données | Supabase (PostgreSQL) | Temps réel via WebSockets |
| Sécurité | RLS + Auth anonyme | Aucune donnée sensible exposée |
| Backend | Supabase Edge Functions (Deno/TypeScript) | Validation serveur des actions |
| Build | Vite.js | Variables d'environnement, minification |
| Déploiement | GitHub -> Netlify CI/CD | Build automatique à chaque push |
| Mobile | Capacitor (Android APK) + PWA | Installable sans store |

---

## Fonctionnalités

- **Multijoueur en ligne** : synchronisation temps réel du plateau entre les joueurs
- **Mode spectateur** : regarder une partie en direct avec chat
- **Bot IA** (Minimax Alpha-Beta, profondeur dynamique)
- **Système de série** : premier joueur à 3 points, avec scoring Yoté (Sum, Door Takk,
  Ndar kepp...)
- **Détection de déconnexion** : compte à rebours + victoire automatique
- **Multiplateforme** : fonctionne sur navigateur, installable comme app (PWA),
  ou via APK Android

---

## Sécurité

- **Authentification anonyme** : chaque joueur reçoit un UUID unique sans compte
- **RLS granulaire** : seul l'hôte/invité d'une partie peut la modifier
- **Edge Function** : les mises à jour du plateau passent par un serveur
  qui vérifie l'identité avant d'écrire en base; impossible de tricher
  depuis la console navigateur
- **Aucune clé secrète** dans le code client

---

## Stack & Compétences mobilisées

`Supabase` `PostgreSQL` `Row Level Security` `Edge Functions (Deno/TypeScript)`
`Vite.js` `GitHub Actions` `Netlify` `Capacitor` `PWA` `WebSockets`



