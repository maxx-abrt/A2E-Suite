# Bilan — comptabilité, budgets et subventions

Bilan est le module financier de la suite A2E. Il s'adresse aux associations,
aux petites structures et aux indépendants qui tiennent leurs comptes
eux-mêmes : facturer, suivre la trésorerie, tenir un livre présentable en cas
de contrôle, piloter des budgets, et trouver des financements publics.

## État et installation

**État au 12 septembre 2026 : implémentation partielle, non certifiée en
production.** Le code décrit ci-dessous existe dans l'application ; sa présence
ne garantit ni une installation sur votre serveur, ni la conformité comptable.
Le catalogue est actuellement constitué d'objets du workspace, pas d'un service
global à l'instance. Les invariants du journal, les périodes closes, le
chiffrement des données bancaires, les éditeurs de fiches et les exports doivent
encore être validés/complétés.

Pour trouver l'installateur, publier puis installer sur un workspace de test :
[guide Applications](../../../../docs/applications.md). Le SDK épinglé ici est
2.31.0, contre 2.39.0 dans le workspace : vérifier la compatibilité avant de
promettre une installation. Le build Docker de la plateforme ne publie pas
cette application automatiquement.

## Surfaces déclarées dans le code

Le manifeste déclare un dossier **Bilan** dans la navigation, avec :

| Page | À quoi elle sert |
|---|---|
| Tableau de bord | Facturé, encaissé, mouvements, aides au catalogue, répartitions |
| Factures / Devis | Documents de vente, TVA par ligne, échéances, encaissements partiels |
| Dépenses et recettes | La trésorerie au quotidien, justificatifs joints |
| Livre | Le journal alimenté automatiquement, avec la provenance de chaque ligne |
| Budgets | Enveloppes par catégorie et par période, alertes à 80 %, atteint, dépassé |
| Fiches | Documents officiels français : reçu de don, budget à l'équilibre, CERFA 12156… |
| Trouver des aides | Le catalogue de subventions, avec classement expliqué |
| Subventions / Mes dossiers | Le catalogue en table, et les dossiers que vous suivez |
| Catégories / Ma structure | Plan comptable et identité de la structure (prérempli les fiches) |
| Sources du catalogue | Journal des ingestions : ce qui a tourné, quand, avec quel résultat |

La fonction post-install prévoit également (effets à vérifier dans les logs et
les données après installation) :

- les **catégories du plan comptable général** (classes 6 et 7, réduites à ce
  qu'une petite structure utilise vraiment) ;
- le **journal automatique**, feuille système unique et verrouillée ;
- une **fiche de structure** avec les préfixes de numérotation ;
- une **première ingestion du catalogue de subventions**.

## Le journal automatique

Aucune saisie double. Chaque mouvement d'argent écrit sa propre ligne dans le
livre, identifiée par `sourceKind:sourceId` :

- une dépense ou une recette, dès son enregistrement ;
- une facture, **au moment où elle est encaissée** (comptabilité de trésorerie) ;
- une subvention accordée, via la recette qu'elle génère.

Contrat attendu : lignes machine protégées, provenance conservée, rejeu sans
doublon et clôture respectée via toutes les API. La clé unique `sourceKey` est
un garde-fou existant, mais les appels séparés des handlers ne prouvent pas
l'atomicité. Tester les événements concurrents, retries, suppressions et
clôtures avant d'annoncer ces garanties ; voir F12 de
[l'audit](../../../../docs/repository-architecture-audit.md).

## Le catalogue de subventions

Trois sources publiques, normalisées dans un vocabulaire unique :

Les volumes ci-dessous sont des estimations historiques du guide initial, pas
une mesure actuelle ni une garantie de disponibilité des services externes.

| Source | Nature | Volume historique |
|---|---|---|
| **Aides-territoires** | API de l'État (`aides-territoires.beta.gouv.fr`) | ~3 200 aides vivantes |
| **Carenews** | Appels à projets de fondations et d'entreprises | ~20 par page de liste |
| **Dispositifs référencés** | Liste curée : FDVA, FONJEP, Service Civique, Erasmus+… | 14 dispositifs nationaux |

Rafraîchissement chaque nuit à 04h10 UTC, ou à la demande depuis la page
« Trouver des aides ». Une aide inchangée n'est pas réécrite ; une aide
disparue en amont est retirée sans perdre l'historique des dossiers qui la
citent.

### Clé API requise

Aides-territoires demande une clé. Renseignez-la dans les variables de
l'application, champ `AIDES_TERRITOIRES_KEY` :

1. créez un compte sur <https://aides-territoires.beta.gouv.fr> ;
2. **Mes paramètres → Ma clé API** ;
3. collez la clé dans la configuration de Bilan.

Sans clé, les deux autres sources fonctionnent normalement et la source
Aides-territoires est signalée en échec dans « Sources du catalogue ».

Variable optionnelle `BILAN_SUBVENTION_SOURCES` : liste des sources actives,
séparées par des virgules (`aides-territoires`, `carenews`, `curated`). Vide =
les trois.

## Le classement des aides

« Classer pour ma structure » compare le catalogue au profil de la structure et
attribue des points **avec la raison de chacun** : public visé, thématique,
territoire, mots-clés du projet, échéance proche. C'est déterministe, gratuit et
explicable.

Chaque analyse est enregistrée dans le cache partagé sous la clé exacte qu'un
appel de modèle de langage utilisera plus tard
(`type | modèle | empreinte | version du catalogue`). Réouvrir une analyse ne
recalcule rien. Quand l'assistant IA de la suite sera branché, il reclassera le
haut de cette liste et écrira dans la même ligne de cache : le contrat ne
change pas, et une analyse déjà payée ne sera jamais repayée.

## Fonctions serveur

| Fonction | Déclencheur |
|---|---|
| `post-install` | Installation |
| `sync-finance-entry-to-ledger` | `financeEntry.*` |
| `sync-invoice-to-ledger` | `invoice.*` |
| `grant-subvention-income` | `savedSubvention.updated` |
| `refresh-subventions` | Cron `10 4 * * *` |
| `rollup-budgets` | Cron `15 * * * *` |
| `sweep-overdue-invoices` | Cron `30 5 * * *` |
| `generate-recurring-documents` | Cron `45 5 * * *` |
| `refresh-subventions-now` | `POST /s/subventions/refresh` |
| `score-subventions` | `POST /s/subventions/match` |

## Développement

Après installation de Node 24 et des dépendances compatibles, depuis ce dossier :

```sh
yarn twenty dev:build .
yarn test
yarn lint
```

`yarn test` exécute les tests unitaires Node des helpers métier, pas un test
d'installation ni de comptabilité de bout en bout. Utiliser le
[guide de vérification](../../../../docs/verification.md) et consigner les
résultats réels ; ces commandes ne sont pas déclarées réussies par ce README.
