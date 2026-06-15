# Salon Amira — Système de réservation beauté

Système de réservation en ligne pour salon de beauté féminin à Alger Centre.

**Stack:** FastAPI + React (Vite) + MySQL 8.4 + Docker Compose + Nginx

## Démarrage rapide

```bash
cp .env.example .env
# Éditer .env avec vos mots de passe
docker compose up -d
```

L'application est accessible sur :
- **Frontend:** http://localhost:3000
- **API:** http://localhost:8000
- **Admin:** Cliquer "Admin" dans la navigation, mot de passe défini dans `.env`

## Fonctionnalités

### Côté cliente
- Landing page avec design Warm Editorial et illustrations SVG
- Wizard de réservation en 4 étapes (service → créneau → infos → confirmation)
- Calendrier interactif avec créneaux en temps réel
- Téléchargement du rendez-vous en PDF
- Recherche de rendez-vous par téléphone
- Design responsive (mobile, tablette, laptop, desktop)

### Côté prestataire (admin)
- Agenda journalier avec changement de statut des RDV
- Gestion des services (ajout, modification, activation/désactivation)
- Gestion des disponibilités récurrentes par jour
- Créneaux bloqués (congés, pauses)
- Exceptions de dates (jours fériés, horaires spéciaux)
- Tableau de bord statistiques (CA, RDV, taux de complétion, top services)

## Services

| Service | Durée | Prix |
|---------|-------|------|
| Coiffure Femme | 45 min | 2 500 DA |
| Coupe Homme | 30 min | 1 500 DA |
| Coloration | 60–90 min | 4 500 DA |
| Brushing | 30–45 min | 1 800 DA |
| Soin Visage | 60 min | 3 500 DA |
| Maquillage | 45 min | 3 000 DA |
| Manucure | 30 min | 1 500 DA |

## Architecture

```
navigateur → :3000 (nginx) → React SPA
                            → /api/* → :8000 (FastAPI) → :3307 (MySQL)
```

- **Frontend:** React 18 + Vite, nginx reverse proxy, CSS custom properties
- **Backend:** FastAPI, SQLAlchemy, MySQL 8.4, génération PDF
- **Design:** Warm Editorial (Open Design), responsive 4 breakpoints, zéro emoji, SVG illustrations

## Structure du projet

```
booking-system/
├── frontend/           # React (Vite) — SPA, nginx
│   ├── src/
│   │   ├── pages/      # LandingPage, ClientBooking, ProviderDashboard, etc.
│   │   └── components/ # Calendar, Illustrations (SVG)
│   ├── nginx.conf
│   └── Dockerfile
├── backend/            # FastAPI — REST API
│   ├── main.py         # Routes, auth, PDF
│   ├── models.py       # SQLAlchemy models
│   └── Dockerfile
├── db/
│   └── init.sql        # Schema initial
├── docker-compose.yml
└── DESIGN.md           # Design system tokens
```

## Licence

MIT
