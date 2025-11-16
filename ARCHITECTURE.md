# Architecture Overview

## System Flow

```
User Browser
    ↓
React Frontend (localhost:5173)
    ↓ HTTP requests
Flask Backend (localhost:5000)
    ↓ API calls
Kindred GraphQL API & OpenRouteService API
```

## Authentication Flow

1. User clicks "Start Your Search"
2. User fills in search filters and clicks "Search Available Homes"
3. If no auth token exists:
   - Frontend opens AuthDialog
   - User enters email
   - Frontend → Backend: `POST /api/auth/send-otp` with email
   - Backend → Kindred API: Sends OTP request
   - Kindred sends OTP to user's email
   - User enters OTP from email
   - Frontend → Backend: `POST /api/auth/verify-otp` with email + OTP
   - Backend → Kindred API: Verifies OTP
   - Backend returns access token to Frontend
   - Frontend stores token in localStorage
4. User can now search

## Search Flow

1. User selects:
   - Date range (required)
   - Region (optional)
   - Resort (optional)
2. User clicks "Search Available Homes"
3. Frontend → Backend: `POST /api/search` with:
   ```json
   {
     "startDate": "2026-01-17",
     "endDate": "2026-01-19",
     "region": "Northeast",
     "resort": "Killington",
     "mileRange": 50
   }
   ```
4. Backend:
   - Filters resorts based on region/resort selection
   - For each matching resort:
     - Creates a polygon search area around the resort
     - Calls Kindred API with `resort_map_multiple()`
     - Gets all available homes in that area
     - Calculates driving time from each home to resort (using OpenRouteService)
   - Combines and sorts results by driving time
   - Returns formatted results to Frontend
5. Frontend displays results in List View or Map View

## Key Components

### Backend (`backend_api.py`)

**Endpoints:**
- `POST /api/auth/send-otp` - Triggers OTP email
- `POST /api/auth/verify-otp` - Verifies OTP and returns token
- `GET /api/resorts` - Returns list of all resorts and regions
- `POST /api/search` - Searches for homes near resorts

**Key Functions:**
- `resort_map_multiple()` - Main search function that queries Kindred API
- `make_polygon()` - Creates search area around a lat/lon point
- `get_driving_time()` - Calculates driving time using OpenRouteService
- `post_graphql()` - Makes GraphQL requests to Kindred API

### Frontend

**Pages:**
- `Index.tsx` - Main page with Hero, FilterPanel, and Results

**Components:**
- `Hero.tsx` - Landing section with "Start Your Search" button
- `AuthDialog.tsx` - Email + OTP authentication modal
- `FilterPanel.tsx` - Search filters (dates, region, resort)
- `ResultsList.tsx` - List view of search results
- `PropertyMap.tsx` - Map view of search results
- `PropertyCard.tsx` - Individual property card

## Data Models

### Property (Frontend)
```typescript
interface Property {
  id: string;
  name: string;
  resort: string;
  distance: string;  // e.g., "23.5 min"
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  imageUrl: string;
  lat: number;
  lng: number;
}
```

### Search Filters (Frontend)
```typescript
interface SearchFilters {
  dateRange?: DateRange;  // { from: Date, to: Date }
  region: string;         // e.g., "Northeast" or "All Regions"
  resort: string;         // e.g., "Killington" or "All Resorts"
}
```

### Resort (Backend)
```python
{
  "resort": str,        # "Killington"
  "region": str,        # "Northeast"
  "state": str,         # "Vermont"
  "latitude": float,    # 43.6058
  "longitude": float,   # -72.8203
  "skiable_acres": int,
  "vertical_drop": int,
  "annual_snowfall": int
}
```

## API Integration

### Kindred GraphQL API

The backend uses Kindred's GraphQL API to:
- Authenticate users (OTP flow)
- Search for available homes
- Get home details and availability

**Key GraphQL Operations:**
- `sendMagicLinkOrOTP` - Sends OTP to email
- `FinishEmailLoginUser` - Verifies OTP and returns tokens
- `exploreList` - Searches for homes with filters

### OpenRouteService API

Used to calculate driving time between homes and resorts.

**Endpoint:**
- `POST https://api.openrouteservice.org/v2/directions/driving-car`

**Input:** Coordinates of home and resort
**Output:** Driving time in seconds (converted to minutes)

## State Management

### Frontend State (React)
- `authToken` - Stored in localStorage
- `properties` - List of search results
- `showResults` - Boolean to show/hide results
- `loading` - Boolean for loading state
- `filters` - Current search filters

### Backend State (Flask)
- `token_box` - Holds current access token
- `locations` - DataFrame of all resorts (loaded from CSV)

## Error Handling

### Frontend
- Network errors: Shows error toast
- Invalid input: Shows validation error toast
- No results: Shows empty state

### Backend
- Invalid auth: Returns 401/403 status
- Missing parameters: Returns 400 with error message
- API errors: Returns 500 with error details
- Token expiration: Automatically refreshes token

## Performance Considerations

1. **Rate Limiting**: Backend adds 0.4s delay between paginated requests to Kindred API
2. **Pagination**: Kindred API returns results in pages (50 per page)
3. **Caching**: Resorts list is cached on frontend after first load
4. **Lazy Loading**: Results are loaded all at once (could be improved with virtual scrolling)
5. **Image Loading**: Uses thumbnail URLs from Kindred API

## Security

1. **CORS**: Backend allows requests only from localhost (development)
2. **Token Storage**: Access tokens stored in localStorage (should use httpOnly cookies in production)
3. **API Keys**: Stored in `.env` file (never committed to git)
4. **HTTPS**: Should be used in production for all API calls

## Future Improvements

1. **Token Refresh**: Implement automatic token refresh on expiration
2. **Caching**: Cache search results to avoid redundant API calls
3. **Pagination**: Load results progressively instead of all at once
4. **Map Clustering**: Cluster nearby properties on map view
5. **Save Searches**: Allow users to save and reuse searches
6. **Favorite Properties**: Let users mark properties as favorites
7. **Email Alerts**: Notify users when new properties match their criteria
8. **Server-Side Rendering**: For better SEO and initial load time
9. **WebSockets**: Real-time updates for new properties
10. **Mobile App**: Native iOS/Android app

