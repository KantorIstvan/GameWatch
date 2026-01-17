# GameWatch

Track your video game playthroughs and visualize your gaming habits.

## Summary

GameWatch helps gamers log their playthroughs, track time spent on each session, and see statistics about their gaming history. Built for personal use or small communities, it integrates with the RAWG database to pull game metadata and offers a clean calendar-based interface.

## Documentation

📘 **[User Guide](docs/USER_GUIDE.md)** - Complete guide for using GameWatch  
🛠️ **[Developer Documentation](docs/DEVELOPER.md)** - Technical docs for contributors and developers

## Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)
- [Configuration & Deployment](#configuration--deployment)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## About

GameWatch is a full-stack web app for tracking video game playthroughs. Users authenticate via Auth0, search for games using the RAWG API, create playthrough entries with session times, and view their gaming activity on a calendar or in charts. It's ideal for gamers who want to see patterns in their play habits or simply maintain a personal gaming log.

## Features

- **Real-time timer** tracks gaming sessions automatically with dynamic background colors
- **Search & add games** from the RAWG database with cover art and metadata
- **Log playthrough sessions** with start/end dates and total hours played
- **Manual session logging** for retroactive time tracking
- **Drop & pickup games** - mark games as dropped and resume them later
- **Multiple playthrough types** - support for different completion goals (100%, speedrun, etc.)
- **Calendar view** shows your gaming activity at a glance
- **Statistics dashboard** displays charts for playtime by game, platform, and month
- **Detailed analytics** including genre breakdown, completion rates, and time patterns
- **Data export** to CSV for external analysis
- **User authentication** via Auth0 ensures secure, personal gaming logs
- **Multi-language support** with i18n for 11+ languages including English, Spanish, German, Japanese, Arabic, and more
- **Dark/light theme** with dynamic UI elements

## Tech Stack

**Frontend:** React 18, TypeScript, Vite, Material-UI, Auth0 React SDK, FullCalendar, Recharts, i18next  
**Backend:** Java 17, Spring Boot 3.2, Spring Security OAuth2, PostgreSQL, Flyway, Hibernate (JCache with Ehcache)  
**Infrastructure:** Docker, Docker Compose, Nginx

## Prerequisites

- **OS:** Linux, macOS, or Windows with WSL2
- **Node.js:** 18+ and npm
- **Java:** 17+
- **Maven:** 3.6+
- **PostgreSQL:** 14+
- **Docker & Docker Compose** (for containerized setup)
- **Auth0 account** (free tier works)
- **RAWG API key** ([sign up here](https://rawg.io/apidocs))

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/KantorIstvan/GameWatch.git
   cd gamewatch
   ```

2. **Set up environment variables**

   Create a `.env` file in the project root:
   ```env
   # Auth0
   AUTH0_ISSUER_URI=https://{{YOUR_TENANT}}.auth0.com/
   AUTH0_AUDIENCE=https://api.gamewatch.com
   VITE_AUTH0_DOMAIN={{YOUR_TENANT}}.auth0.com
   VITE_AUTH0_CLIENT_ID={{YOUR_CLIENT_ID}}
   VITE_AUTH0_AUDIENCE=https://api.gamewatch.com

   # RAWG API
   RAWG_API_KEY={{YOUR_RAWG_KEY}}

   # CORS (local dev)
   CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

   # Database (already configured in docker-compose.yml)
   DATABASE_URL=jdbc:postgresql://postgres:5432/gamewatch
   DATABASE_USERNAME=postgres
   DATABASE_PASSWORD=postgres
   ```

3. **Start with Docker Compose**
   ```bash
   docker compose up -d --build
   ```

   This spins up PostgreSQL, the Spring Boot backend, and the Nginx-served frontend.

## Usage

Once the containers are running, open your browser to:

```
http://localhost:3000
```

**Example flow:**

1. Log in with your account.
2. Click **Add Game** and search for a game (e.g., "Elden Ring").
3. Click **Add Playthrough**, fill in the data.
4. View your entry on the **Calendar** page or **clicking on the playthrough card**.

### Screenshots

**Login & Authentication**

![Login Page](docs/img/loginPage.png)

**Timer Page**

![Timer Page](docs/img/timerPage.png)

![Active Timer](docs/img/activeTimer.png)

**Games Management**

![Games Page](docs/img/gamesPage.png)

**Calendar View**

![Calendar Page](docs/img/calendarPage.png)

**Statistics & Analytics**

![Statistics Page](docs/img/statisticsPage1.png)

![Game Statistics](docs/img/gameStatistic.png)

**Settings**

![Settings](docs/img/settings.png)

## API Endpoints

### Game Endpoints

| Method | Path                              | Purpose                          | Auth Required |
|--------|-----------------------------------|----------------------------------|---------------|
| GET    | `/games/search?query={name}`      | Search games via RAWG            | No            |
| GET    | `/games/details/{externalId}`     | Get game details by RAWG ID      | No            |
| POST   | `/games`                          | Create a game entry              | Yes           |
| GET    | `/games`                          | List user's games                | Yes           |
| GET    | `/games/{id}`                     | Get game by ID                   | Yes           |
| DELETE | `/games/{id}`                     | Delete a game                    | Yes           |
| GET    | `/games/{id}/statistics`          | Get game statistics              | Yes           |

### Playthrough Endpoints

| Method | Path                                        | Purpose                          | Auth Required |
|--------|---------------------------------------------|----------------------------------|---------------|
| POST   | `/playthroughs`                             | Create a playthrough             | Yes           |
| GET    | `/playthroughs`                             | List user's playthroughs         | Yes           |
| GET    | `/playthroughs/{id}`                        | Get playthrough by ID            | Yes           |
| DELETE | `/playthroughs/{id}`                        | Delete a playthrough             | Yes           |
| POST   | `/playthroughs/{id}/start`                  | Start timer for playthrough      | Yes           |
| POST   | `/playthroughs/{id}/stop`                   | Stop timer for playthrough       | Yes           |
| POST   | `/playthroughs/{id}/pause`                  | Pause timer for playthrough      | Yes           |
| POST   | `/playthroughs/{id}/drop`                   | Mark playthrough as dropped      | Yes           |
| POST   | `/playthroughs/{id}/pickup`                 | Resume a dropped playthrough     | Yes           |
| POST   | `/playthroughs/{id}/end-session`            | End current session              | Yes           |
| POST   | `/playthroughs/{id}/log-manual-session`     | Log manual session               | Yes           |
| POST   | `/playthroughs/{id}/duration`               | Update playthrough duration      | Yes           |
| POST   | `/playthroughs/{id}/platform`               | Update playthrough platform      | Yes           |
| POST   | `/playthroughs/{id}/title`                  | Update playthrough title         | Yes           |
| POST   | `/playthroughs/{id}/import-sessions`        | Import sessions from another     | Yes           |
| DELETE | `/playthroughs/{id}/sessions/{sessionId}`   | Delete a session                 | Yes           |

### Statistics Endpoints

| Method | Path                              | Purpose                          | Auth Required |
|--------|-----------------------------------|----------------------------------|---------------|
| GET    | `/statistics?interval={interval}` | Get user statistics              | Yes           |
| GET    | `/statistics/recommendations`     | Get game recommendations         | Yes           |

### User Endpoints

| Method | Path         | Purpose                | Auth Required |
|--------|--------------|------------------------|---------------|
| GET    | `/users/me`  | Get current user info  | Yes           |
| DELETE | `/users/me`  | Delete current user    | Yes           |

### Example Requests

**POST /playthroughs:**
```bash
curl -X POST http://localhost:8080/playthroughs \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": 42,
    "playthroughType": "story",
    "platform": "PC",
    "title": "My First Playthrough",
    "startDate": "2026-01-01"
  }'
```

**Response:**
```json
{
  "id": 123,
  "gameId": 42,
  "gameName": "Elden Ring",
  "gameBannerImageUrl": "https://...",
  "playthroughType": "story",
  "title": "My First Playthrough",
  "platform": "PC",
  "startDate": "2026-01-01",
  "durationSeconds": 0,
  "isActive": false,
  "isCompleted": false,
  "isDropped": false,
  "isPaused": false,
  "sessionCount": 0,
  "createdAt": "2026-01-01T10:00:00Z"
}
```

**GET /statistics?interval=month:**
```bash
curl -H "Authorization: Bearer {token}" \
  "http://localhost:8080/statistics?interval=month"
```

## Configuration & Deployment

**Key environment variables:**

- `AUTH0_ISSUER_URI`, `AUTH0_AUDIENCE`: Auth0 API settings
- `RAWG_API_KEY`: Your RAWG API key
- `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`: PostgreSQL connection
- `CORS_ALLOWED_ORIGINS`: Comma-separated list of frontend origins

**Build for production:**
```bash
# Backend
cd backend && mvn clean package -DskipTests

# Frontend
cd frontend && npm run build
```

## Testing

Run the full test suite:

```bash
# Backend (in backend/ directory)
mvn test
```

Backend tests cover controllers, services, repositories, and integration scenarios with an in-memory H2 database.

## Contributing

- **Report bugs or request features** by opening an issue on GitHub.



## Contact

For questions or support, open a GitHub issue.

---


_Last reviewed by: Kántor István (January 16, 2026)_
