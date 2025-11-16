"""
Flask API backend for Kindred-Ikon ski home finder.
Provides authentication via OTP and search functionality.
"""

import os
import json
import pandas as pd
import requests
import datetime
import time
import math
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from typing import Optional, Dict, List
from dateutil.relativedelta import relativedelta

# Load environment variables
load_dotenv()

app = Flask(__name__)

# CORS configuration - allows frontend from any origin in development,
# or specific origins in production
ALLOWED_ORIGINS = os.environ.get('ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost:5174,http://localhost:8080').split(',')
CORS(app, origins=ALLOWED_ORIGINS, supports_credentials=True)

# Configuration
KINDRED_BEARER_TOKEN = os.environ.get('KINDRED_BEARER_TOKEN')
OPENROUTESERVICE_API_KEY = os.environ.get('OPEN_ROUTE_SERVICE_KEY')
MY_EMAIL = os.environ.get('EMAIL')
KINDRED_URL = "https://app.livekindred.com/api/graphql"

# Load resort locations
script_dir = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(script_dir, 'resort_locations_20256.csv')
locations = pd.read_csv(csv_path)
locations.columns = locations.columns.str.lower()
locations.rename(columns={
    'resortregion': 'region',
    'stateorprovince': 'state',
    'skiableacres': 'skiable_acres',
    'verticaldrop': 'vertical_drop',
    'annualsnowfall': 'annual_snowfall'
}, inplace=True)


class _TokenBox:
    """Holds the current access token so it can be updated when refreshed."""
    def __init__(self, access_token: str):
        self.access = access_token


token_box = _TokenBox(KINDRED_BEARER_TOKEN)


def _build_headers(token: Optional[str] = None) -> dict:
    """Build headers for Kindred API requests. Uses provided token or falls back to token_box."""
    auth_token = token if token else token_box.access
    return {
        "accept": "*/*",
        "content-type": "application/json",
        "apollographql-client-name": "Web",
        "apollographql-client-version": "1.929.3",
        "authorization": f"Bearer {auth_token}",
        "origin": "https://livekindred.com",
        "referer": "https://livekindred.com/",
        "x-locale": "en",
    }


def _get_token_from_request() -> Optional[str]:
    """Extract bearer token from Authorization header."""
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header[7:]  # Remove 'Bearer ' prefix
    return None


# GraphQL mutations for OTP flow
MUT_SEND_EMAIL = """
mutation sendMagicLinkOrOTP($email: String!, $path: String) {
  startEmailLoginUser(email: $email, path: $path) {
    mode
    length
  }
}
"""

MUT_FINISH_EMAIL = """
mutation FinishEmailLoginUser($deviceId: String, $email: String!, $emailToken: String!) {
  finishEmailLoginUser(deviceId: $deviceId, email: $email, emailToken: $emailToken) {
    accessToken
    refreshToken
  }
}
"""

QUERY_EXPLORE_LIST = """
query exploreList($filter: FlexibleSearchFilter!, $pagination: Pagination!, $sortedAt: Date!, $width: Int!, $avatarWidth: Int!) {
  getHomesWithSearchCriteria(filter: $filter, pagination: $pagination, sortedAt: $sortedAt) {
    page
    hasMore
    didFindPerfectMatches
    homeRecs {
      home {
        ...HomeCardData
      }
      matchingStatus { ...SearchResultScore }
      household { ...SearchHousehold }
    }
  }
}

fragment HomeCardData on Home {
  id
  status
  destination { id name region }
  media { url thumbnailUrl(width: $width) }
  title
  titleV2 { translation originalLanguage }
  availabilitiesWithoutBookedDates { ...HomeAvailability }
  swapAvailabilitiesV2 { ...SwapAvailabilities }
  isFavorite
  homeProfileProgress
  maxGuestsLimit
  workspacesCount
  bathrooms
  bedroomsCount
  bedsCount
  petPreference
  petHostingDetails
  lat
  lon
  preSelect { ...PreSelectDates }
  swapQuality
  owner { id displayName isOpenForInquiry }
  swapAvailabilitiesV2 { destinationIds destinationNames }
  excludeHomeMediaFromMarketing
  pricingPreview { ...PublicPreviewPricing }
  restrictionReasons
}

fragment HomeAvailability on HomeAvailability { id homeId startDate endDate }
fragment SwapAvailabilities on HomeSwapAvailability {
  id swapAvailabilityId start end tripLengthsV2 minimumNights dateRanges
  destinationIds destinationNames destinationName travelPlanId
  travelPlan {
    tripTypes { ...HomeTripType }
    minBedrooms minBathrooms minBeds totalGuests
    homeFilters { ...HomeFilters }
  }
  swapDestination { name }
}
fragment HomeTripType on HomeTripType { name displayName photoUrl }
fragment HomeFilters on HomeFilter {
  ... on AmenityFilter { __typename amenity enabled }
  ... on PetPreferenceFilter { __typename petPreference enabled }
  ... on BedTypeFilter { __typename bed enabled }
  ... on CompositeHomeFilter { __typename compositeFilter enabled }
}
fragment PreSelectDates on PreSelect { dateRange isSwap }
fragment PublicPreviewPricing on PricingPreviewPublic {
  fees { ...TripPricingFee }
  totalMoney { ...TripMoneyDisplay }
  moneyPerNight { ...TripMoneyDisplay }
  credit { totalCredits }
  pricingComparison { totalMoney { amount currency } moneyPerNight { ...TripMoneyDisplay } totalNights }
}
fragment TripPricingFee on PricingFee { type total { amount currency } }
fragment TripMoneyDisplay on MoneyDisplay { amount currency displayString }
fragment SearchResultScore on MatchingResult {
  alternateDates alternateLocation lessBedrooms lessWorkstations lessBeds lessHomeCapacity noPetsAllowed needPetsFriendlyHomeOtherSide score
}
fragment SearchHousehold on BaseHouseholdProfile {
  id
  primaryResident { displayName image { url(width: $avatarWidth) } }
  householdImages { url(width: $avatarWidth) }
}
"""


def gql_noauth(operation_name: str, query: str, variables: dict):
    """Send a GraphQL request without Authorization (for login)."""
    headers = {
        "content-type": "application/json",
        "origin": "https://livekindred.com",
        "referer": "https://livekindred.com/",
        "apollographql-client-name": "Web",
        "apollographql-client-version": "1.929.3",
        "x-locale": "en",
    }
    payload = {"operationName": operation_name, "query": query, "variables": variables}
    r = requests.post(KINDRED_URL, headers=headers, data=json.dumps(payload))
    r.raise_for_status()
    j = r.json()
    if "errors" in j:
        raise RuntimeError(json.dumps(j["errors"], indent=2))
    return j["data"]


def post_graphql(operation_name: str, query: str, variables: dict, token: Optional[str] = None):
    """Posts a GraphQL query/mutation with authentication."""
    payload = {"operationName": operation_name, "query": query, "variables": variables or {}}
    
    r = requests.post(KINDRED_URL, headers=_build_headers(token), data=json.dumps(payload))
    
    def parse(resp):
        try:
            d = resp.json()
        except ValueError:
            return None, None
        return d, d.get("errors")
    
    data, errs = parse(r)
    
    if r.status_code >= 400:
        if errs:
            raise RuntimeError(json.dumps(errs, indent=2))
        r.raise_for_status()
    
    if errs:
        raise RuntimeError(json.dumps(errs, indent=2))
    
    return data["data"]


def get_driving_time(resort_lat, resort_lon, house_lat, house_lon):
    """Get driving time between two points using OpenRouteService."""
    if not OPENROUTESERVICE_API_KEY:
        return None
    
    coordinates = {"coordinates": [[house_lon, house_lat], [resort_lon, resort_lat]]}
    directions_url = f'https://api.openrouteservice.org/v2/directions/driving-car?api_key={OPENROUTESERVICE_API_KEY}'
    headers = {
        'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
        'api_key': OPENROUTESERVICE_API_KEY,
        'Content-Type': 'application/json; charset=utf-8'
    }
    
    try:
        call = requests.post(directions_url, json=coordinates, headers=headers)
        return call.json()['routes'][0]['summary']['duration'] / 60
    except (KeyError, Exception):
        return None


def make_polygon(lat, lon, distance_miles):
    """Creates an octagonal polygon around a point."""
    lat_rad = math.radians(lat)
    miles_per_lat = 69.0
    miles_per_lon = 69.172 * math.cos(lat_rad)
    
    directions_deg = [90, 45, 0, 315, 270, 225, 180, 135]
    polygon = []
    for angle in directions_deg:
        angle_rad = math.radians(angle)
        d_lat = (distance_miles * math.sin(angle_rad)) / miles_per_lat
        d_lon = (distance_miles * math.cos(angle_rad)) / miles_per_lon
        point = {"lat": lat + d_lat, "lon": lon + d_lon}
        polygon.append(point)
    return polygon


def to_iso_date_range(start_date, end_date):
    """Convert dates to ISO format."""
    from datetime import datetime
    iso_format = "%Y-%m-%dT%H:%M:%S.000Z"
    
    def ensure_dt(d):
        if isinstance(d, str):
            return datetime.strptime(d, "%Y-%m-%d")
        return d
    
    dt_start = ensure_dt(start_date)
    dt_end = ensure_dt(end_date)
    
    return [dt_start.strftime(iso_format), dt_end.strftime(iso_format)]


def make_monthly_date_ranges(start_date, end_date, date_format="%Y-%m-%d"):
    """Returns a list of one-month date ranges."""
    from datetime import datetime
    
    current_date = datetime.strptime(start_date, date_format)
    end_date_dt = datetime.strptime(end_date, date_format)
    
    date_ranges = []
    while current_date < end_date_dt:
        next_month = current_date + relativedelta(months=1)
        range_end = min(next_month, end_date_dt)
        date_ranges.append(to_iso_date_range(current_date, range_end))
        current_date = range_end
    return date_ranges


def explore_map_once(polygon, date_range, date_type='flexible', min_nights=0, page=0, page_size=50, total_guests=0, pets_allowed=False):
    """Create variables for a single explore query."""
    if date_type == 'exact':
        trip_type = "EXACT_DATES"
    else:
        trip_type = "MINIMUM_NIGHTS"
    
    # Build pet preferences filter
    pet_preferences = []
    if pets_allowed:
        # Include both YES and MAYBE (open to considering pets)
        pet_preferences = ["YES", "MAYBE"]
    
    variables = {
        "filter": {
            "tripLengthsV2": [trip_type],
            **({"minimumNights": min_nights} if date_type == 'flexible' else {}),
            "dateRanges": date_range,
            "includeCloseDates": False,
            "isFavoriteHomesOnly": False,
            "onboardingSort": False,
            "polygon": polygon,
            "matchTypes": ["SWAP", "AVAILABILITY"],
            "minBedrooms": 0,
            "minBathrooms": 0,
            "minBeds": 0,
            "totalGuests": total_guests,
            "filterInput": {
                "amenityFilters": [],
                "bedTypeFilters": [],
                "compositeFilters": [],
                "petPreferences": pet_preferences
            }
        },
        "pagination": {"page": page, "pageSize": page_size},
        "sortedAt": datetime.datetime.now(datetime.UTC).isoformat().replace("+00:00", "Z"),
        "width": 720,
        "avatarWidth": 90
    }
    return variables


def explore_map_multiple(lat, lon, distance_miles, date_range, date_type, min_nights=0, page_size=50, token=None, total_guests=0, pets_allowed=False):
    """Search for homes near a location."""
    sorted_at = datetime.datetime.now(datetime.UTC).isoformat(timespec='milliseconds').replace("+00:00", "Z")
    all_rows = []
    page = 0
    
    polygon = make_polygon(lat, lon, distance_miles)
    
    if date_type == 'flexible':
        formatted_date_range = make_monthly_date_ranges(date_range[0], date_range[1])
    else:
        formatted_date_range = [to_iso_date_range(date_range[0], date_range[1])]
    
    while True:
        vars_page = explore_map_once(
            polygon,
            formatted_date_range,
            date_type=date_type,
            min_nights=min_nights,
            page=page,
            page_size=page_size,
            total_guests=total_guests,
            pets_allowed=pets_allowed
        )
        
        vars_page["sortedAt"] = sorted_at
        
        data = post_graphql("exploreList", QUERY_EXPLORE_LIST, vars_page, token=token)
        res = data["getHomesWithSearchCriteria"]
        
        for rec in res.get("homeRecs", []):
            h = rec["home"]
            pet_preference = h.get("petPreference")
            pet_hosting_details = h.get("petHostingDetails")
            
            # If pets filter is enabled, skip homes that don't allow pets
            # Check both petPreference and petHostingDetails fields
            if pets_allowed and (pet_preference == "NO" or pet_hosting_details == "NO"):
                continue
            
            # Get first image URL or None
            media = h.get("media", [])
            image_url = media[0].get("thumbnailUrl") if media and len(media) > 0 else None
            
            all_rows.append({
                "id": h.get("id"),
                "homeId": h.get("id"),
                "title": h.get("title"),
                "destination": (h.get("destination") or {}).get("name"),
                "lat": h.get("lat"),
                "lon": h.get("lon"),
                "availabilitiesWithoutBookedDates": h.get("availabilitiesWithoutBookedDates", []),
                "maxGuestsLimit": h.get("maxGuestsLimit"),
                "petPreference": pet_preference,
                "petHostingDetails": pet_hosting_details,
                "bedroomsCount": h.get("bedroomsCount"),
                "bathrooms": h.get("bathrooms"),
                "imageUrl": image_url,
            })
        
        if not res.get("hasMore"):
            break
        
        page += 1
        time.sleep(0.4)
    
    return all_rows


def resort_map_multiple(resort_df, date_range, date_type='flexible', mile_range=35, page_size=50, min_nights=0, token=None, total_guests=0, pets_allowed=False):
    """Search for homes near multiple resorts."""
    results_full = []
    
    for idx, row in resort_df.iterrows():
        current_time = datetime.datetime.now()
        
        results = explore_map_multiple(
            lat=row['latitude'],
            lon=row['longitude'],
            distance_miles=mile_range,
            date_range=date_range,
            date_type=date_type,
            min_nights=min_nights,
            page_size=page_size,
            token=token,
            total_guests=total_guests,
            pets_allowed=pets_allowed
        )
        
        for result in results:
            result['resort'] = row['resort']
            result['state'] = None if pd.isna(row['state']) else row['state']
            result['region'] = row['region']
            result['resort_lat'] = row['latitude']
            result['resort_lon'] = row['longitude']
            results_full.append(result)
        
        time_elapsed = datetime.datetime.now() - current_time
        print(f"Found {len(results)} houses near {row.get('resort', idx)} in {time_elapsed}")
    
    # Add driving times
    for result in results_full:
        if result.get('lat') and result.get('lon'):
            result['driving_time_minutes'] = get_driving_time(
                result['resort_lat'], result['resort_lon'],
                result['lat'], result['lon']
            )
        else:
            result['driving_time_minutes'] = None
    
    # Deduplicate homes by ID and aggregate resort information
    homes_dict = {}
    for result in results_full:
        home_id = result.get('id')
        if not home_id:
            continue
            
        if home_id not in homes_dict:
            # First time seeing this home
            homes_dict[home_id] = result.copy()
            homes_dict[home_id]['resorts'] = [{
                'resort': result['resort'],
                'state': result.get('state'),
                'region': result['region'],
                'driving_time_minutes': result['driving_time_minutes']
            }]
            homes_dict[home_id]['min_driving_time'] = result['driving_time_minutes']
        else:
            # Home already exists, add this resort to its list
            homes_dict[home_id]['resorts'].append({
                'resort': result['resort'],
                'state': result.get('state'),
                'region': result['region'],
                'driving_time_minutes': result['driving_time_minutes']
            })
            # Update minimum driving time if this one is shorter
            if result['driving_time_minutes'] is not None:
                current_min = homes_dict[home_id]['min_driving_time']
                if current_min is None or result['driving_time_minutes'] < current_min:
                    homes_dict[home_id]['min_driving_time'] = result['driving_time_minutes']
    
    # Convert back to list and sort by minimum driving time
    deduplicated_results = list(homes_dict.values())
    
    # Sort resorts within each home by driving time
    for home in deduplicated_results:
        home['resorts'].sort(key=lambda x: x['driving_time_minutes'] if x['driving_time_minutes'] is not None else float('inf'))
    
    # Sort homes by minimum driving time
    deduplicated_results.sort(key=lambda x: x['min_driving_time'] if x['min_driving_time'] is not None else float('inf'))
    
    return deduplicated_results


# API Routes

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok"})


@app.route('/api/auth/send-otp', methods=['POST'])
def send_otp():
    """Send OTP to user's email."""
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({"error": "Email is required"}), 400
        
        result = gql_noauth(
            "sendMagicLinkOrOTP",
            MUT_SEND_EMAIL,
            {"email": email, "path": "/explore"}
        )
        
        return jsonify({
            "success": True,
            "mode": result["startEmailLoginUser"]["mode"],
            "length": result["startEmailLoginUser"]["length"]
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/auth/verify-otp', methods=['POST'])
def verify_otp():
    """Verify OTP and return access token."""
    try:
        data = request.get_json()
        email = data.get('email')
        otp = data.get('otp')
        
        if not email or not otp:
            return jsonify({"error": "Email and OTP are required"}), 400
        
        result = gql_noauth(
            "FinishEmailLoginUser",
            MUT_FINISH_EMAIL,
            {"deviceId": None, "email": email, "emailToken": otp}
        )
        
        access_token = result["finishEmailLoginUser"]["accessToken"]
        refresh_token = result["finishEmailLoginUser"]["refreshToken"]
        
        # Update the token box with the new access token
        token_box.access = access_token
        
        return jsonify({
            "success": True,
            "accessToken": access_token,
            "refreshToken": refresh_token
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/auth/validate', methods=['GET'])
def validate_token():
    """Quick validation of authentication token."""
    try:
        # Get token from request header
        token = _get_token_from_request()
        if not token:
            print("No token provided in request")
            return jsonify({"valid": False, "error": "No token provided"}), 401
        
        print(f"Validating token: {token[:20]}...")
        
        # Make a simple, fast GraphQL query to check if token is valid
        QUERY_ME = """
        query {
          me {
            id
            email
          }
        }
        """
        
        print("Making 'me' query to Kindred API...")
        result = post_graphql("me", QUERY_ME, {}, token=token)
        print(f"Kindred API response: {result}")
        
        if result and result.get("me"):
            print("Token is valid")
            return jsonify({"valid": True})
        else:
            print("Token validation returned no 'me' data")
            return jsonify({"valid": False, "error": "Invalid token"}), 401
    
    except Exception as e:
        error_msg = str(e)
        print(f"Token validation exception: {error_msg}")
        import traceback
        traceback.print_exc()
        return jsonify({"valid": False, "error": error_msg}), 401


@app.route('/api/resorts', methods=['GET'])
def get_resorts():
    """Get list of all resorts."""
    try:
        # Get unique regions
        regions = sorted(locations['region'].dropna().unique().tolist())
        
        # Get all resorts with their details
        # Use .where() to convert NaN to None (which becomes null in JSON)
        resorts_df = locations[['resort', 'region', 'state', 'latitude', 'longitude']].copy()
        resorts_df = resorts_df.where(pd.notna(resorts_df), None)
        resorts = resorts_df.to_dict('records')
        
        print(f"Returning {len(regions)} regions and {len(resorts)} resorts")
        
        return jsonify({
            "regions": regions,
            "resorts": resorts
        })
    
    except Exception as e:
        print(f"Error in get_resorts: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/resorts/stats', methods=['GET'])
def get_resort_stats():
    """Get all resort statistics for visualization."""
    try:
        # Get all columns we need for the visualization
        stats_df = locations[['resort', 'region', 'state', 'skiable_acres', 'vertical_drop', 'annual_snowfall']].copy()
        
        # Convert NaN to None for JSON serialization
        stats_df = stats_df.where(pd.notna(stats_df), None)
        
        resorts = stats_df.to_dict('records')
        
        # Get unique regions for filtering
        regions = sorted(locations['region'].dropna().unique().tolist())
        
        print(f"Returning stats for {len(resorts)} resorts across {len(regions)} regions")
        
        return jsonify({
            "resorts": resorts,
            "regions": regions
        })
    
    except Exception as e:
        print(f"Error in get_resort_stats: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/search', methods=['POST'])
def search():
    """Search for homes near resorts."""
    try:
        # Get token from request header
        token = _get_token_from_request()
        if not token:
            return jsonify({"error": "Authentication required"}), 401
        
        data = request.get_json()
        
        # Extract search parameters
        start_date = data.get('startDate')  # format: YYYY-MM-DD
        end_date = data.get('endDate')  # format: YYYY-MM-DD
        regions = data.get('regions', [])  # array of region names
        resorts = data.get('resorts', [])  # array of resort names
        mile_range = data.get('mileRange', 35)
        date_type = data.get('dateType', 'flexible')
        min_nights = data.get('minNights', 0)
        
        # Advanced filters
        min_skiable_acres = data.get('minSkiableAcres')
        min_vertical_drop = data.get('minVerticalDrop')
        min_annual_snowfall = data.get('minAnnualSnowfall')
        
        # Kindred requirements
        number_of_people = data.get('numberOfPeople', 0)
        pets_allowed = data.get('petsAllowed', False)
        
        # Validate required fields
        if not start_date or not end_date:
            return jsonify({"error": "Start date and end date are required"}), 400
        
        # Filter resorts based on criteria
        resort_df = locations.copy()
        
        # Apply region filter if specific regions are selected
        if regions and len(regions) > 0:
            resort_df = resort_df[resort_df['region'].isin(regions)]
            print(f"Filtered to {len(resort_df)} resorts in regions: {regions}")
        
        # Apply resort filter if specific resorts are selected
        if resorts and len(resorts) > 0:
            resort_df = resort_df[resort_df['resort'].isin(resorts)]
            print(f"Filtered to {len(resort_df)} specific resorts: {resorts}")
        
        # Apply advanced filters
        if min_skiable_acres is not None and min_skiable_acres > 0:
            resort_df = resort_df[resort_df['skiable_acres'] >= min_skiable_acres]
            print(f"Filtered to {len(resort_df)} resorts with >= {min_skiable_acres} skiable acres")
        
        if min_vertical_drop is not None and min_vertical_drop > 0:
            resort_df = resort_df[resort_df['vertical_drop'] >= min_vertical_drop]
            print(f"Filtered to {len(resort_df)} resorts with >= {min_vertical_drop} ft vertical drop")
        
        if min_annual_snowfall is not None and min_annual_snowfall > 0:
            resort_df = resort_df[resort_df['annual_snowfall'] >= min_annual_snowfall]
            print(f"Filtered to {len(resort_df)} resorts with >= {min_annual_snowfall} in annual snowfall")
        
        if resort_df.empty:
            print("No resorts match the filter criteria")
            return jsonify({"results": []})
        
        # Perform the search
        results = resort_map_multiple(
            resort_df=resort_df,
            date_range=[start_date, end_date],
            date_type=date_type,
            mile_range=mile_range,
            page_size=50,
            min_nights=min_nights,
            token=token,
            total_guests=number_of_people,
            pets_allowed=pets_allowed
        )
        
        # Format results for frontend
        formatted_results = []
        search_start = datetime.datetime.strptime(start_date, "%Y-%m-%d")
        search_end = datetime.datetime.strptime(end_date, "%Y-%m-%d")

        for r in results:
            availabilities = r.get("availabilitiesWithoutBookedDates", [])

            # Filter availabilities to only those that overlap with search dates
            matching_availabilities = []
            for avail in availabilities:
                avail_start = datetime.datetime.strptime(avail["startDate"], "%Y-%m-%d")
                avail_end = datetime.datetime.strptime(avail["endDate"], "%Y-%m-%d")

                # Check if there's any overlap between availability and search dates
                if avail_start <= search_end and avail_end >= search_start:
                    matching_availabilities.append(avail)

            # Only include homes that have at least one matching availability period
            if len(matching_availabilities) > 0:
                # Format resorts array with drive times
                resorts_list = r.get("resorts", [])
                if not resorts_list:
                    # Fallback for single resort (backward compatibility)
                    resorts_list = [{
                        'resort': r.get("resort"),
                        'driving_time_minutes': r.get("driving_time_minutes")
                    }]
                
                formatted_results.append({
                    "id": r.get("homeId"),
                    "name": r.get("title"),
                    "resort": r.get("resort"),  # Keep for backward compatibility
                    "resorts": resorts_list,  # Array of resorts with drive times
                    "distance": f"{r.get('driving_time_minutes', 0):.1f} min" if r.get('driving_time_minutes') else "N/A",
                    "driveTime": r.get("driving_time_minutes"),
                    "bedrooms": r.get("bedroomsCount", 0),
                    "bathrooms": r.get("bathrooms", 0),
                    "maxGuests": r.get("maxGuestsLimit", 0),
                    "imageUrl": r.get("imageUrl") or "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&q=80",
                    "lat": r.get("lat"),
                    "lng": r.get("lon"),
                    "availabilities": matching_availabilities,
                    "petPreference": r.get("petPreference"),
                    "petHostingDetails": r.get("petHostingDetails"),
                    "homeUrl": f"https://livekindred.com/home/{r.get('homeId')}",
                })

        return jsonify({"results": formatted_results})
    
    except Exception as e:
        print(f"Search error: {str(e)}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    # Use environment variable for port (required for Render)
    port = int(os.environ.get('PORT', 5000))
    # Determine if we're in production
    is_production = os.environ.get('ENVIRONMENT', 'development') == 'production'
    
    app.run(
        host='0.0.0.0',  # Required for external access
        port=port,
        debug=not is_production  # Disable debug in production
    )

