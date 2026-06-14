# KPO - Awale bete

Version 1 d'un jeu d'awale pratique en pays bete, appele KPO.

## Contenu

- Page d'accueil
- Plateau jouable 2 x 4 avec reserves laterales
- Phase d'ouverture
- Semaille animee avec sons
- Captures en reserve
- Chronometre de partie
- Historique local des oppositions Joueur 1 / Joueur 2
- Mode a distance par code d'invitation avec Supabase Realtime
- Page des regles
- Page d'informations sur l'auteur

## Auteur

Docteur Frere Zadi Bley Roger  
Directeur du College catholique Kirmann d'Abengourou  
Chercheur en langues, mathematiques et jeux africains  
Auteur de *Le Solfege bete*

Contact: doizylet@gmail.com

## Activer le jeu a distance

1. Creer un projet sur https://supabase.com.
2. Ouvrir `Project Settings > API`.
3. Copier l'URL du projet et la cle publique `publishable` ou `anon`.
4. Les renseigner dans `supabase-config.js`.
5. Redeployer le site.

Le mode en ligne utilise un canal Supabase Realtime temporaire. Le createur
de la partie est Joueur 1. La personne qui saisit le code est Joueur 2.
