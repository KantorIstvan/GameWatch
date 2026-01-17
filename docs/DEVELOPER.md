# GameWatch Developer Documentation

Technical guide for developers working on or extending GameWatch.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Backend Development](#backend-development)
- [Frontend Development](#frontend-development)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Authentication & Security](#authentication--security)
- [Testing Strategy](#testing-strategy)
- [Contributing Guidelines](#contributing-guidelines)

## Architecture Overview

GameWatch uses a modern three-tier architecture:

**Frontend (React/TypeScript)** → **Backend (Spring Boot)** → **Database (PostgreSQL)**

- **Frontend**: SPA built with Vite, handles routing, state, and UI
- **Backend**: RESTful API with OAuth2 resource server, JPA repositories
- **Database**: PostgreSQL with Flyway migrations for schema versioning
- **External APIs**: RAWG for game metadata
- **Auth**: Auth0 for user authentication (JWT tokens)

### Technology Choices

- **Spring Boot 3.2**: Latest stable version with Spring Security 6
- **React 18**: Concurrent rendering and hooks
- **PostgreSQL 14**: Reliable RDBMS with JSON support
- **Material-UI**: Consistent component library
- **Docker**: Container-based development and deployment

## Project Structure

```
gamewatch/
├── backend/                 # Spring Boot application
│   ├── src/main/java/com/gamewatch/
│   │   ├── controller/      # REST endpoints
│   │   ├── service/         # Business logic
│   │   ├── repository/      # JPA repositories
│   │   ├── entity/          # JPA entities
│   │   ├── dto/             # Data transfer objects
│   │   ├── config/          # Spring configuration
│   │   └── exception/       # Custom exceptions
│   ├── src/main/resources/
│   │   ├── db/migration/    # Flyway SQL migrations
│   │   ├── application.yml  # Main config
│   │   └── ehcache.xml      # Cache config
│   └── pom.xml              # Maven dependencies
├── frontend/                # React application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Route components
│   │   ├── services/        # API clients
│   │   ├── contexts/        # React contexts
│   │   ├── hooks/           # Custom hooks
│   │   ├── types/           # TypeScript types
│   │   ├── i18n/            # Translations
│   │   └── utils/           # Helper functions
│   ├── vite.config.ts       # Vite configuration
│   └── package.json         # npm dependencies
└── docker-compose.yml       # Local dev environment
```

## Backend Development

### Running Locally

Without Docker:
```bash
cd backend

# Start PostgreSQL separately
createdb gamewatch

# Set environment variables
export AUTH0_ISSUER_URI=https://your-tenant.auth0.com/
export AUTH0_AUDIENCE=https://api.gamewatch.com
export RAWG_API_KEY=your-key
export DATABASE_URL=jdbc:postgresql://localhost:5432/gamewatch
export DATABASE_USERNAME=postgres
export DATABASE_PASSWORD=postgres

# Run application
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

### Key Classes

**Controllers**: Handle HTTP requests, validate input, return DTOs
- `GameController`: Game search and creation
- `PlaythroughController`: CRUD operations for playthroughs
- `UserController`: User profile management
- `StatisticsController`: Aggregated gaming stats

**Services**: Business logic, validation, external API calls
- `GameService`: Game management and RAWG integration
- `PlaythroughService`: Playthrough CRUD with validation and timer management
- `UserService`: User creation and profile updates
- `UserStatisticsService`: Statistics calculation and game recommendations
- `RawgApiService`: RAWG API client with caching
- `ColorExtractionService`: Extracts dominant colors from game images

**Repositories**: JPA data access
- `GameRepository`: Game entity data access
- `PlaythroughRepository`: Playthrough queries with custom filtering
- `UserRepository`: User lookups by auth0_user_id
- `UserGameRepository`: User-game relationship queries
- `SessionHistoryRepository`: Session tracking data
- Use Spring Data JPA for automatic query generation
- Custom queries with `@Query` annotation
- Second-level cache enabled for frequently accessed entities

### Adding a New Endpoint

1. **Create DTO** in `dto/` package
2. **Add controller method** with proper validation
3. **Implement service logic** with error handling
4. **Write unit tests** for service and controller
5. **Update API documentation** in this file

Example:
```java
@PostMapping("/playthroughs")
public ResponseEntity<PlaythroughDto> createPlaythrough(
        @Valid @RequestBody CreatePlaythroughRequest request,
        Authentication authentication) {
    User user = userService.getOrCreateUser(authentication);
    PlaythroughDto playthrough = playthroughService.create(request, user);
    return ResponseEntity.status(HttpStatus.CREATED).body(playthrough);
}
```

### Database Migrations

Flyway manages schema versions. Migrations live in `src/main/resources/db/migration/`.

**Naming convention**: `V{version}__{description}.sql`

Example: `V1__initial_schema.sql`, `V2__add_platform_column.sql`

To create a new migration:
1. Create file in `db/migration/`
2. Write SQL (use PostgreSQL syntax)
3. Restart app; Flyway auto-applies pending migrations
4. Never modify existing migrations in production

### Caching Strategy

Ehcache provides second-level Hibernate cache:
- Game entities cached (rarely change)
- User entities cached
- RAWG API responses cached (1 hour TTL)

Configure in `ehcache.xml`. Clear cache on deployment or via JMX.

## Frontend Development

### Running Locally

```bash
cd frontend
npm install
npm run dev
```

Vite dev server starts on `http://localhost:5173` with hot reload.

### Key Components

**Pages**: Top-level route components
- `Dashboard.tsx`: Home page with active timers and quick stats
- `Games.tsx`: Game library and search functionality
- `PlaythroughDetail.tsx`: Individual playthrough view with timer controls
- `Calendar.tsx`: FullCalendar integration for playthrough timeline
- `Statistics.tsx`: Charts and analytics
- `GameStatistics.tsx`: Per-game statistics and insights
- `Timers.tsx`: Active and paused timer management
- `Settings.tsx`: User preferences and configuration

**Components**: Reusable UI elements
- `GameCard.tsx`: Display single game in library
- `PlaythroughHeader.tsx`: Playthrough details header
- `TimerDisplay.tsx`: Timer UI component
- `GameSearchAutocomplete.tsx`: Game search with autocomplete
- `StopwatchCard.tsx`: Active timer card
- `GameDetails.tsx`: Detailed game information modal
- `CreatePlaythroughDialog.tsx`: New playthrough creation form
- `LogManualSessionDialog.tsx`: Manual session time logging
- `charts/`: Various chart components for statistics
- `playthrough/`: Playthrough-related components
- `statistics/`: Statistics visualization components

### State Management

- **React Context** for global state (AuthContext, ThemeContext)
- **Local state** with `useState` for component-specific data
- **API calls** via axios in `services/` directory

### API Client

Axios instance in `services/api.ts`:
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});
```

### Adding a New Feature

1. **Create types** in `types/` for data models
2. **Add API service** function in `services/`
3. **Build component** with proper error handling
4. **Add route** in `App.tsx` if needed
5. **Write i18n strings** in `i18n/` for all languages
6. **Test manually** with different states

### Internationalization

i18next manages translations. Add new strings to JSON files in `src/i18n/locales/`.

```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t('welcome.title')}</h1>;
}
```

## Database Schema

### Core Tables

**users**
- `id` (bigserial PK)
- `auth0_user_id` (text, unique) - Auth0 user identifier
- `username` (text)
- `email` (text, nullable)
- `profile_picture_url` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**games**
- `id` (bigserial PK)
- `external_id` (integer) - RAWG API ID
- `name` (text)
- `banner_image_url` (text)
- `description` (text)
- `release_date` (date)
- `platforms` (text array)
- `genres` (text array)
- `developers` (text array)
- `publishers` (text array)
- `esrb_rating` (text)
- `metacritic_score` (integer)
- `dominant_color_light` (text) - Hex color
- `dominant_color_dark` (text) - Hex color
- `created_at` (timestamp)
- `updated_at` (timestamp)

**playthroughs**
- `id` (bigserial PK)
- `game_id` (bigint FK → games.id)
- `user_id` (bigint FK → users.id)
- `playthrough_type` (text) - 'story', '100_percent', 'speedrun', etc.
- `title` (text) - Custom playthrough name
- `platform` (text)
- `started_at` (timestamp)
- `stopped_at` (timestamp)
- `duration_seconds` (bigint) - Total playtime in seconds
- `is_active` (boolean) - Currently running timer
- `is_completed` (boolean)
- `is_paused` (boolean)
- `is_dropped` (boolean)
- `pause_count` (integer)
- `session_count` (integer)
- `start_date` (date) - For calendar view
- `end_date` (date, nullable) - For calendar view
- `import_source` (text)
- `imported_at` (timestamp)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**user_games**
- `id` (bigserial PK)
- `user_id` (bigint FK → users.id)
- `game_id` (bigint FK → games.id)
- `total_playtime_seconds` (bigint) - Aggregated playtime across all playthroughs
- `created_at` (timestamp)
- Unique constraint on (user_id, game_id)

**session_history**
- `id` (bigserial PK)
- `playthrough_id` (bigint FK → playthroughs.id)
- `start_time` (timestamp)
- `end_time` (timestamp)
- `duration_seconds` (bigint)
- `is_manual` (boolean) - True if manually logged
- `created_at` (timestamp)

### Indexes

- `idx_users_auth0_user_id` on `users(auth0_user_id)`
- `idx_games_external_id` on `games(external_id)`
- `idx_playthroughs_user_id` on `playthroughs(user_id)`
- `idx_playthroughs_game_id` on `playthroughs(game_id)`
- `idx_playthroughs_is_active` on `playthroughs(is_active)`
- `idx_user_games_user_id` on `user_games(user_id)`
- `idx_user_games_game_id` on `user_games(game_id)`
- `idx_session_history_playthrough_id` on `session_history(playthrough_id)`

## API Documentation

### Authentication

All endpoints except `/health` require JWT token in `Authorization` header:
```
Authorization: Bearer {access_token}
```

Obtain token via Auth0 authentication flow in frontend.

### Endpoints

#### Games

**GET /games/search?query={name}**
- Search RAWG database for games
- Returns: `List<GameSearchResultDto>`

**GET /games/details/{externalId}**
- Get full game details from RAWG
- Returns: `GameSearchResultDto`

**POST /games**
- Create game entry in database
- Body: `CreateGameRequest`
- Returns: `GameDto`

**GET /games/{id}**
- Get game by database ID
- Returns: `GameDto`

#### Playthroughs

**GET /playthroughs**
- List user's playthroughs
- Query params: `status`, `platform`, `page`, `size`
- Returns: `Page<PlaythroughDto>`

**POST /playthroughs**
- Create new playthrough
- Body: `CreatePlaythroughRequest`
- Returns: `PlaythroughDto`

**PUT /playthroughs/{id}**
- Update playthrough
- Body: `UpdatePlaythroughRequest`
- Returns: `PlaythroughDto`

**DELETE /playthroughs/{id}**
- Delete playthrough
- Returns: 204 No Content

#### Statistics

**GET /statistics**
- Get user's gaming statistics
- Query params: `startDate`, `endDate`
- Returns: `StatisticsDto`

**GET /statistics/recommendations**
- Get personalized game recommendations
- Query params: `limit` (default: 10)
- Returns: `List<GameRecommendationDto>`

#### Playthroughs - Timer Operations

**POST /playthroughs/{id}/start**
- Start playthrough timer
- Returns: `PlaythroughDto`

**POST /playthroughs/{id}/stop**
- Stop playthrough timer
- Returns: `PlaythroughDto`

**POST /playthroughs/{id}/pause**
- Pause playthrough timer
- Returns: `PlaythroughDto`

**POST /playthroughs/{id}/resume**
- Resume paused timer
- Returns: `PlaythroughDto`

**POST /playthroughs/{id}/sessions**
- Log manual gaming session
- Body: `{ startTime, endTime, durationSeconds }`
- Returns: `SessionHistoryDto`

#### Users

**GET /users/me**
- Get current user profile
- Returns: `UserDto`

**PUT /users/me**
- Update user profile
- Body: `UpdateUserRequest`
- Returns: `UserDto`

### Error Responses

Standard error format:
```json
{
  "timestamp": "2026-01-14T10:30:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Start date must be before end date",
  "path": "/playthroughs"
}
```

## Authentication & Security

### Auth0 Integration

Backend validates JWT tokens:
1. Frontend gets token from Auth0
2. Token sent in `Authorization` header
3. Spring Security validates signature and claims
4. `Authentication` object contains user info

Configuration in `SecurityConfig.java`:
```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) {
    http.oauth2ResourceServer(oauth2 -> 
        oauth2.jwt(jwt -> jwt.decoder(jwtDecoder()))
    );
    // ...
}
```

### CORS Policy

Configured in `application.yml`:
```yaml
cors:
  allowed-origins: ${CORS_ALLOWED_ORIGINS}
```

Set environment variable with comma-separated origins.

### Security Best Practices

- Never log sensitive data (tokens, passwords)
- Use HTTPS in production
- Validate all inputs with Bean Validation
- Sanitize user-generated content
- Keep dependencies updated
- Enable CSRF protection for state-changing ops

## Testing Strategy

### Backend Tests

**Unit Tests**: Test services in isolation with mocked repositories
```bash
mvn test -Dtest=PlaythroughServiceTest
```

**Integration Tests**: Test full stack with embedded H2 database
```bash
mvn test -Dtest=GameWatchIntegrationTest
```

**Controller Tests**: Test REST endpoints with MockMvc
```bash
mvn test -Dtest=PlaythroughControllerTest
```

### Frontend Tests

Currently manual testing. Future: add Jest + React Testing Library.

### Test Data

Use `@BeforeEach` to set up test fixtures. Example:
```java
@BeforeEach
void setUp() {
    user = User.builder()
        .auth0Id("auth0|123")
        .username("testuser")
        .build();
    userRepository.save(user);
}
```

### Environment Variables

Required in production:
- `AUTH0_ISSUER_URI`
- `AUTH0_AUDIENCE`
- `RAWG_API_KEY`
- `DATABASE_URL`
- `DATABASE_USERNAME`
- `DATABASE_PASSWORD`
- `CORS_ALLOWED_ORIGINS`

### Health Check

Monitor `/health` endpoint for application status.

### Logging

Logs to stdout. Configure level in `application.yml`:
```yaml
logging:
  level:
    com.gamewatch: INFO
    org.springframework.security: DEBUG
```

---

**Questions?** Open a GitHub discussion.
