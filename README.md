# KPO - Awalé bété

Version 1 d'un jeu d'awalé pratiqué en pays bété, appelé KPO.

## Contenu

- Page d'accueil
- Plateau jouable 2 x 4 avec réserves latérales
- Phase d'ouverture
- Semaille animee avec sons
- Captures en réserve
- Chronomètre de partie
- Historique local des oppositions Joueur 1 / Joueur 2
- Mode a distance par code d'invitation avec Supabase Realtime
- Page des règles
- Page d'informations sur l'auteur

## Auteur

Docteur Frère Zadi Bley Roger

Directeur du Collège catholique Kirmann d'Abengourou

Chercheur en langues, mathématiques et jeux africains

Auteur de *Le Solfège bété*

Contact: doizylet@gmail.com

## Activer le jeu a distance

1. Creer un projet sur https://supabase.com.
2. Ouvrir `Project Settings > API`.
3. Copier l'URL du projet et la cle publique `publishable` ou `anon`.
4. Les renseigner dans `supabase-config.js`.
5. Redeployer le site.

Le mode en ligne utilise un canal Supabase Realtime temporaire. Le createur
de la partie est Joueur 1. La personne qui saisit le code est Joueur 2.

## Maintenir Supabase actif

Le dépôt contient une tâche GitHub Actions `.github/workflows/keep-supabase-awake.yml`.
Elle appelle légèrement l'API publique Supabase tous les 3 jours pour garder
un minimum d'activité sur le projet gratuit.

La tâche peut aussi être lancée manuellement depuis l'onglet `Actions` de GitHub.
