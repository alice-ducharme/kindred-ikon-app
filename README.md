# Kindred x Ikon Ski Home Finder

A full-stack application that helps users find Kindred homes near Ikon Pass ski resorts.

## Project Structure

```
kindred-ikon-app/
├── backend/                # Backend (Python Flask API)
│   ├── backend_api.py      # Flask API server
│   ├── notebook.ipynb      # Original notebook with data exploration
│   ├── requirements.txt    # Python dependencies
│   ├── resort_locations_20256.csv  # Resort data
│   └── .env               # Environment variables (create this)
└── frontend/               # Frontend (React + TypeScript + Vite)
    ├── src/               # React source files
    ├── package.json       # Node dependencies
    └── ...
```

## Features

- **Authentication**: Email + OTP authentication flow using Kindred's API
- **Resort Search**: Search for Kindred homes near any Ikon Pass resort
- **Filter by Region**: Filter resorts by region (Rockies, Northeast, Europe, etc.)
- **Date Selection**: Choose your travel dates
- **Results Display**: View results in list or map view
- **Driving Times**: Automatically calculates driving time from each home to the resort

## Quick Start

### Option 1: Use the Startup Scripts (Recommended)

1. Create a `.env` file in the `backend` directory:
   ```bash
   cd kindred-ikon-app/backend
   cp .env.example .env
   # Edit .env and add your API keys
   ```

2. Start the backend (in one terminal):
   ```bash
   cd kindred-ikon-app
   ./start-backend.sh
   ```

3. Start the frontend (in another terminal):
   ```bash
   cd kindred-ikon-app
   ./start-frontend.sh
   ```

### Option 2: Manual Setup

#### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd kindred-ikon-app/backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv ikon_kindred_env
   source ikon_kindred_env/bin/activate  # On Windows: ikon_kindred_env\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file with your API keys:
   ```bash
   # Copy the example file
   cp .env.example .env
   
   # Edit .env and add your values:
   # KINDRED_BEARER_TOKEN=your_kindred_token_here (optional - can be left blank)
   # OPEN_ROUTE_SERVICE_KEY=your_openrouteservice_key_here
   # EMAIL=your_email@example.com
   ```

   **Getting API Keys:**
   - **Kindred Token**: Optional - you can leave it blank and the OTP flow will generate one for you when you first authenticate
   - **OpenRouteService Key**: Sign up at https://openrouteservice.org/ for a free API key (used for calculating driving times)
   - **Email**: Use an email address that's registered with Kindred

5. Start the Flask backend:
   ```bash
   python backend_api.py
   ```

   The backend will run on `http://localhost:5000`

#### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd kindred-ikon-app/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend will run on `http://localhost:5173` (or another port if 5173 is busy)

## Usage

1. **Start Both Servers**: Make sure both the backend (Flask) and frontend (Vite) are running

2. **Open the App**: Navigate to `http://localhost:5173` in your browser

3. **Click "Start Your Search"**: This will scroll you to the filter panel

4. **Authenticate** (if not already):
   - If you don't have a token, clicking "Search Available Homes" will prompt you for your email
   - Enter your email and click "Send OTP"
   - Check your email for the OTP code
   - Enter the OTP to authenticate

5. **Search for Homes**:
   - Select your travel dates using the calendar
   - Choose a region (optional)
   - Choose a specific resort (optional)
   - Click "Search Available Homes"

6. **View Results**:
   - Switch between List View and Map View
   - Results show driving time, bedrooms, bathrooms, and max guests
   - Click on a property to see more details

## API Endpoints

### Backend API (`http://localhost:5000`)

- `GET /api/health` - Health check
- `POST /api/auth/send-otp` - Send OTP to email
  ```json
  { "email": "user@example.com" }
  ```
- `POST /api/auth/verify-otp` - Verify OTP and get access token
  ```json
  { "email": "user@example.com", "otp": "123456" }
  ```
- `GET /api/resorts` - Get list of all resorts and regions
- `POST /api/search` - Search for homes near resorts
  ```json
  {
    "startDate": "2026-01-17",
    "endDate": "2026-01-19",
    "region": "Northeast",
    "resort": "Killington",
    "mileRange": 50,
    "dateType": "exact",
    "minNights": 0
  }
  ```

## Technologies Used

### Backend
- Python 3.13+
- Flask (web framework)
- Flask-CORS (cross-origin resource sharing)
- Pandas (data manipulation)
- Requests (HTTP client)
- OpenRouteService API (driving time calculations)

### Frontend
- React 18
- TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- Shadcn/ui (component library)
- React Query (data fetching)
- React Router (routing)
- Mapbox GL (map view)

## Notes

- **Placeholder Images**: The results currently use placeholder images. You can update the backend to use actual property images from Kindred's API
- **Rate Limiting**: The backend implements polite rate limiting (0.4s delay between pages) to avoid overwhelming the Kindred API
- **Token Refresh**: The backend automatically handles token refresh when the access token expires
- **CORS**: The backend is configured to allow requests from the frontend running on localhost

## Troubleshooting

### Backend Issues

- **Module not found**: Make sure you activated the virtual environment and installed all dependencies
- **API Key errors**: Check that your `.env` file is in the `kindred-ikon` directory and contains valid API keys
- **Port 5000 in use**: You can change the port in `backend_api.py` (last line)

### Frontend Issues

- **Cannot connect to backend**: Make sure the Flask backend is running on port 5000
- **TypeScript errors**: Try running `npm install` again
- **Port 5173 in use**: Vite will automatically try the next available port

### Integration Issues

- **CORS errors**: Make sure Flask-CORS is installed and the backend is running
- **Authentication fails**: Check that your email is registered with Kindred
- **No results found**: Try expanding your date range or search radius

## Deployment

Want to deploy this app so others can use it? See **[DEPLOYMENT.md](DEPLOYMENT.md)** for a complete step-by-step guide to deploying on:

- **Render** (Backend - Free tier available)
- **Vercel** (Frontend - Free tier available)

The deployment guide includes:
- 📋 Environment setup
- 🚀 Step-by-step deployment instructions
- 🔒 Security checklist
- 💰 Cost breakdown
- 🔄 Continuous deployment setup
- 🆘 Troubleshooting tips

**Total cost: $0/month** for personal use!

## Future Enhancements

- Add user preferences (bedrooms, bathrooms, amenities)
- Save favorite properties
- Email alerts for new properties
- Batch searches for multiple date ranges
- Property comparison tool
- Reviews and ratings integration

# Alice todos

* visualizations of terrain (x axis is acreage; green, blue, and black lines across it, summit elevation is y axis)
* about page: ikon pass with arrow to it (me ->)