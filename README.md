# Experts Conseil Habitat — Maison 3D immersive

Prototype de page d'accueil immersive : une maison en vue écorchée qui se démonte puis se remonte au scroll, une prestation par étape.

**Stack :** Next.js 16 (App Router) · React 19 · React Three Fiber · Drei · Postprocessing (N8AO).
Aucun modèle 3D externe : toute la maison est générée en code (`components/geometry.ts`), donc chaque pièce est animable.

## Lancer en local

```bash
npm install
npm run dev
# http://localhost:3000
```

## Déployer sur Vercel

1. Pousser le dossier sur un dépôt GitHub.
2. Sur Vercel : **Add New → Project →** importer le dépôt. Aucun réglage à changer.
3. Chaque `git push` redéploie ; chaque branche a son URL de prévisualisation.

Export statique (hébergement mutualisé type Hostinger) : `STATIC_EXPORT=1 npm run build`, puis envoyer le dossier `out/`.

## Où modifier quoi

| Fichier | Rôle |
|---|---|
| `components/content.ts` | Textes, ordre des sections, lien de contact, adresse |
| `components/scroll.ts` | Scénario : à quel moment chaque couche revient (`timeline`) |
| `components/Scene.tsx` | Caméra par section (`SHOTS`), lumières, points cliquables (`HOTSPOTS`) |
| `components/House.tsx` | Matériaux, effets (humidité, flux d'air, grilles) |
| `components/geometry.ts` | Dimensions de la maison et construction de chaque couche |
| `app/globals.css` | Charte graphique (couleurs, typo, cartes, mobile) |

## À compléter avant mise en ligne

- `CONTACT_URL` dans `content.ts` pointe vers le site actuel : le remplacer par la page ou le formulaire de devis.
- Ajouter le vrai logo (le carré « ECH » est un placeholder) et le numéro de téléphone.
- Faire valider les textes des prestations par le client.
