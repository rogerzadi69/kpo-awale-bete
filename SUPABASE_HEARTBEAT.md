# Maintenir Supabase actif

Le workflow GitHub Actions `.github/workflows/keep-supabase-awake.yml` met a jour une ligne dans Supabase tous les 2 jours.
Cette action cree une activite de base de donnees plus fiable qu'un simple ping.

## Etape 1 - Creer la table

Dans Supabase :

1. Ouvrir le projet `kpo-awale-bete`.
2. Aller dans `SQL Editor`.
3. Copier et executer le contenu de `supabase/heartbeat.sql`.

## Etape 2 - Ajouter le secret GitHub

Dans GitHub :

1. Ouvrir le depot du jeu.
2. Aller dans `Settings > Secrets and variables > Actions`.
3. Cliquer sur `New repository secret`.
4. Nom du secret : `SUPABASE_SERVICE_ROLE_KEY`.
5. Valeur du secret : la cle `service_role` du projet Supabase.

La cle `service_role` ne doit jamais etre placee dans le code du site.
Elle doit rester uniquement dans les secrets GitHub.

## Etape 3 - Tester

Dans GitHub :

1. Aller dans `Actions`.
2. Ouvrir `Keep Supabase Awake`.
3. Cliquer sur `Run workflow`.
4. Verifier que l'execution passe au vert.
