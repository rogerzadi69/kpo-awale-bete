# Configuration du mode à distance

Le code du multijoueur est déjà intégré. Il reste à relier l'application à
un projet Supabase.

## 1. Créer le projet

1. Ouvrir https://supabase.com/dashboard.
2. Créer un nouveau projet, par exemple `kpo-awale-bete`.
3. Attendre que le projet soit pret.

## 2. Recuperer les identifiants publics

Dans les parametres API du projet, recuperer :

- `Project URL`
- `Publishable key` ou, sur les anciens projets, la cle `anon public`

Ne jamais utiliser la cle `service_role` dans le navigateur.

## 3. Configurer l'application

Modifier `supabase-config.js` :

```js
window.KPO_SUPABASE_CONFIG = {
  url: "https://VOTRE-PROJET.supabase.co",
  publishableKey: "VOTRE_CLE_PUBLIQUE",
};
```

## 4. Tester

1. Ouvrir le site dans deux navigateurs ou deux telephones.
2. Sur le premier, choisir `À distance`, puis `Créer une partie`.
3. Copier le lien ou communiquer le code a six caracteres.
4. Sur le second, choisir `A distance`, saisir le code et rejoindre.
5. Le créateur joue comme Joueur 1 et l'invité comme Joueur 2.

## Limites de cette premiere version en ligne

- Le salon est temporaire : les deux navigateurs doivent rester connectés.
- Le créateur fait autorité pour l'état initial et les nouvelles parties.
- Il n'y a pas encore de compte utilisateur ni de classement mondial.
- Une reconnexion longue peut demander de rejoindre de nouveau avec le code.
