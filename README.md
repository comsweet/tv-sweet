# TV Sweet Leaderboard

En TV-anpassad leaderboard-lösning med Adversus API-integration för att visualisera försäljningsresultat, commission och bonusar i realtid.

## 📋 Funktioner

- **TV-optimerad display**: Responsiv design anpassad för stora TV-skärmar (Full HD, 4K, 8K)
- **Adversus API Integration**: Hämtar leads och användardata direkt från Adversus
- **Slideshow-rotation**: Automatisk rotering mellan olika leaderboards
- **Färgkodning**: Visuell feedback baserad på prestationer och tidsperiod
- **Ljudnotifikationer**: Dynamiska notifikationer när agenter når sina mål
- **Bonustrappor**: Flexibelt bonussystem baserat på kampanj och antal affärer
- **Profilbilder & Ljud**: Cloudinary-integration för mediahantering
- **Admin Panel**: Komplett administrationsverktyg för hantering

## 🏗️ Teknisk Stack

### Backend
- **Node.js** + **Express**: API-server
- **SQLite** (better-sqlite3): Databas med persistent disk
- **Adversus API**: Lead- och användardata
- **Cloudinary**: Bild- och ljudfiler
- **date-fns**: Datumhantering

### Frontend
- **React 18**: UI-ramverk
- **Vite**: Build-verktyg och dev-server
- **Modern CSS**: Responsiv design med gradients och animationer

## 📦 Installation

### 1. Installera dependencies

```bash
npm install
```

### 2. Konfigurera miljövariabler

Kopiera `.env.example` till `.env` och fyll i dina API-nycklar:

```bash
cp .env.example .env
```

Redigera `.env`:

```env
# Adversus API Configuration
ADVERSUS_API_URL=https://api.adversus.dk/api
ADVERSUS_API_KEY=din_adversus_api_nyckel

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=ditt_cloud_name
CLOUDINARY_API_KEY=din_cloudinary_api_key
CLOUDINARY_API_SECRET=din_cloudinary_api_secret

# Server Configuration
PORT=3000
NODE_ENV=production

# Database (på Render används /var/data)
DATABASE_PATH=/var/data/leaderboard.db
```

### 3. Starta applikationen

**Development mode:**
```bash
npm run dev
```

Detta startar både backend (port 3000) och frontend (port 5173).

**Production mode:**
```bash
# Bygg frontend
npm run build

# Starta backend (serverar även byggd frontend)
npm start
```

## 🚀 Användning

### TV Display

Öppna huvudsidan i din webbläsare och visa den i helskärmsläge på TV:n:

```
http://localhost:5173/
```

**Tangentbordsgenväg:** Tryck `Ctrl+Shift+A` för att komma åt admin-panelen.

### Admin Panel

Öppna admin-panelen:

```
http://localhost:5173/admin
```

## 📊 Admin Panel Guide

### 1. Agenter

- **Synka från Adversus**: Hämtar alla användare från Adversus API
- **Ladda upp profilbilder**: Ladda upp bilder som visas på leaderboarden
- **Ladda upp personliga ljud**: Ladda upp ljud som spelas när agenten når sina mål

### 2. Leaderboards

Skapa och hantera leaderboards:

- **Namn**: T.ex. "Dagens försäljare", "Veckans topplista"
- **Tidsperiod**:
  - **Idag**: Dagens resultat
  - **Denna vecka**: Veckans resultat
  - **Denna månad**: Månadens resultat
  - **Anpassad**: Välj eget datumintervall
- **Grupp ID**: Filtrera på specifik grupp (valfritt)
- **Visningsordning**: Ordning i slideshow-rotation
- **Aktiv/Inaktiv**: Endast aktiva leaderboards visas

### 3. Bonustrappor

Konfigurera bonussystem per kampanj:

**Exempel för kampanj "Dentle":**
- 3 affärer → 600 THB/affär (totalt 1800 THB)
- 4 affärer → 800 THB/affär (totalt 3200 THB)
- 5 affärer → 1000 THB/affär (totalt 5000 THB)

**Tilldela bonusar:**
- Välj agent och kampanj för att tilldela bonussystem
- Agenten får automatiskt bonus baserat på antal affärer

### 4. Inställningar

**Slideshow:**
- **Visningstid**: Hur länge varje leaderboard visas (sekunder)
- **Ljudnotifikationer**: Aktivera/inaktivera ljud

**Ljudfiler:**
- **Standard pling-ljud**: Spelas före 3600 THB för alla agenter
- **Milestone-ljud**: Spelas efter 3600 THB om agent saknar personligt ljud

## 🎨 Färglogik

### Idag (day)
- 🔴 **Röd**: 0 THB
- 🟠 **Orange**: Under 3,400 THB
- 🟢 **Grön**: 3,600 THB eller mer

### Denna vecka / Denna månad (week/month)
- 🔴 **Röd**: 0 THB
- ⚫ **Svart**: Under 50,000 THB
- 🟢 **Grön**: 50,000 THB eller mer

## 🔊 Ljudlogik

Systemet spelar upp olika ljud baserat på agentens prestationer:

1. **Före 3600 THB**: Standard pling-ljud spelas alltid
2. **Efter 3600 THB**:
   - Om agenten har personligt ljud → Spela personligt ljud
   - Om agenten inte har personligt ljud → Spela milestone-ljud

## 📡 API Endpoints

### Agenter
- `GET /api/agents` - Hämta alla agenter
- `GET /api/agents/:userId` - Hämta specifik agent
- `POST /api/agents/sync-all` - Synka alla från Adversus
- `POST /api/agents/:userId/profile-image` - Ladda upp profilbild
- `POST /api/agents/:userId/personal-sound` - Ladda upp personligt ljud

### Leaderboards
- `GET /api/leaderboards` - Hämta alla leaderboards
- `GET /api/leaderboards/:id/stats` - Hämta leaderboard med statistik
- `POST /api/leaderboards` - Skapa ny leaderboard
- `PUT /api/leaderboards/:id` - Uppdatera leaderboard
- `DELETE /api/leaderboards/:id` - Ta bort leaderboard

### Bonustrappor
- `GET /api/bonus-tiers` - Hämta alla bonustrappor
- `POST /api/bonus-tiers` - Skapa bonustrappa
- `DELETE /api/bonus-tiers/:id` - Ta bort bonustrappa
- `POST /api/agents/:userId/bonuses` - Tilldela bonus till agent

### Inställningar
- `GET /api/slideshow-settings` - Hämta inställningar
- `PUT /api/slideshow-settings` - Uppdatera inställningar
- `POST /api/slideshow-settings/standard-sound` - Ladda upp standard-ljud
- `POST /api/slideshow-settings/milestone-sound` - Ladda upp milestone-ljud

## 🗄️ Databas

Applikationen använder SQLite med persistent disk. Databasen skapas automatiskt vid första körning.

**Tables:**
- `agents` - Agenter från Adversus
- `leaderboards` - Leaderboard-konfigurationer
- `bonus_tiers` - Bonustrappor per kampanj
- `agent_bonus_assignments` - Bonustilldelningar
- `slideshow_settings` - Slideshow-inställningar

**VIKTIGT:** `userId` är ALLTID NUMBER (följer Adversus standard)

## ⚡ Optimeringar

### Lead-hämtning
För att minska serverbelastning hämtas endast:
- Leads med status **"success"**
- Från **innevarande månad + 7 dagar**

Detta istället för att hämta alla leads från tidernas begynnelse.

### Cloudinary
Profilbilder optimeras automatiskt:
- Storlek: 400x400px
- Crop: Face detection
- Format: Auto (WebP för moderna browsers)
- Kvalitet: Auto

## 🎯 Deployment på Render

1. **Backend**: Deploy som Web Service
2. **Persistent Disk**: Montera `/var/data` för databasen
3. **Environment Variables**: Lägg till alla env-variabler
4. **Start Command**: `npm start`

## 📱 Browser-kompatibilitet

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

För bästa TV-upplevelse, använd Chrome eller Edge.

## 🐛 Troubleshooting

### Ingen data visas
- Kontrollera att Adversus API-nyckel är korrekt
- Synka agenter från admin-panelen
- Skapa minst en aktiv leaderboard

### Bilder/ljud laddar inte upp
- Kontrollera Cloudinary-konfiguration
- Verifiera filstorlek (max 5MB)
- Kontrollera filformat (bilder: jpg/png, ljud: mp3/wav)

### Database-fel
- Kontrollera att `/var/data` är skrivbar
- Kontrollera diskutrymme

## 📄 Licens

Detta projekt är skapat för intern användning.

## 🤝 Support

För frågor och support, kontakta utvecklingsteamet.