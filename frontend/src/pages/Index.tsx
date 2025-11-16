import { useState, useRef } from "react";
import Hero from "@/components/Hero";
import AuthDialog from "@/components/AuthDialog";
import FilterPanel, { SearchFilters } from "@/components/FilterPanel";
import ResultsList from "@/components/ResultsList";
import PropertyMap from "@/components/PropertyMap";
import { Property } from "@/components/PropertyCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { getApiUrl } from "@/config";

// Mock data - will be replaced with real data from backend
const mockProperties: Property[] = [
  {
    id: "1",
    name: "Cozy Mountain Cabin",
    resort: "Aspen Snowmass",
    distance: "3.2 miles",
    bedrooms: 3,
    bathrooms: 2,
    maxGuests: 6,
    imageUrl: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&q=80",
    lat: 39.1911,
    lng: -106.8175,
  },
  {
    id: "2",
    name: "Luxury Ski Chalet",
    resort: "Steamboat",
    distance: "1.5 miles",
    bedrooms: 5,
    bathrooms: 4,
    maxGuests: 10,
    imageUrl: "https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=800&q=80",
    lat: 40.4850,
    lng: -106.8317,
  },
  {
    id: "3",
    name: "Alpine Retreat",
    resort: "Winter Park",
    distance: "2.8 miles",
    bedrooms: 4,
    bathrooms: 3,
    maxGuests: 8,
    imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
    lat: 39.8868,
    lng: -105.7625,
  },
  {
    id: "4",
    name: "Modern Mountain Home",
    resort: "Copper Mountain",
    distance: "4.1 miles",
    bedrooms: 3,
    bathrooms: 2,
    maxGuests: 6,
    imageUrl: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80",
    lat: 39.5021,
    lng: -106.1504,
  },
  {
    id: "5",
    name: "Rustic Lodge",
    resort: "Alta",
    distance: "2.2 miles",
    bedrooms: 4,
    bathrooms: 3,
    maxGuests: 8,
    imageUrl: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80",
    lat: 40.5885,
    lng: -111.6377,
  },
  {
    id: "6",
    name: "Slope Side Condo",
    resort: "Deer Valley",
    distance: "0.5 miles",
    bedrooms: 2,
    bathrooms: 2,
    maxGuests: 4,
    imageUrl: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80",
    lat: 40.6374,
    lng: -111.4783,
  },
];

const Index = () => {
  const [showResults, setShowResults] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchStartDate, setSearchStartDate] = useState<string>("");
  const [searchEndDate, setSearchEndDate] = useState<string>("");
  const [lastAuthTime, setLastAuthTime] = useState<number>(() => {
    // Initialize from localStorage on mount
    const stored = localStorage.getItem("last_auth_time");
    return stored ? parseInt(stored) : 0;
  });
  const resultsRef = useRef<HTMLDivElement>(null);

  const checkAuth = () => {
    const hasToken = localStorage.getItem("auth_token") !== null;
    console.log("checkAuth() called, hasToken:", hasToken);
    return hasToken;
  };

  const handleStartSearch = () => {
    if (!checkAuth()) {
      setAuthDialogOpen(true);
      return;
    }
    resultsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleAuthenticated = () => {
    console.log("handleAuthenticated called");
    const token = localStorage.getItem("auth_token");
    console.log("Token after auth:", token ? token.substring(0, 20) + "..." : "null");
    // Store the authentication time - skip validation for 30 minutes
    const now = Date.now();
    setLastAuthTime(now);
    localStorage.setItem("last_auth_time", now.toString());
    console.log("Stored auth time - will skip validation for 30 minutes");
    resultsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSearch = async (filters: SearchFilters) => {
    console.log("Searching with filters:", filters);
    
    if (!checkAuth()) {
      setAuthDialogOpen(true);
      return;
    }

    if (!filters.dateRange?.from || !filters.dateRange?.to) {
      toast.error("Please select a date range");
      return;
    }
    
    setLoading(true);
    
    try {
      const token = localStorage.getItem("auth_token");
      console.log("Retrieved token for search:", token ? token.substring(0, 20) + "..." : "null");
      
      if (!token) {
        console.log("No token found in localStorage!");
        setLoading(false);
        setAuthDialogOpen(true);
        toast.error("Please log in to continue");
        return;
      }
      
      // Check if we should validate the token
      const storedAuthTime = localStorage.getItem("last_auth_time");
      const authTime = storedAuthTime ? parseInt(storedAuthTime) : 0;
      const timeSinceAuth = Date.now() - authTime;
      const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds
      
      // Only validate if more than 30 minutes have passed since last auth
      if (timeSinceAuth > thirtyMinutes) {
        console.log("Token is older than 30 minutes, validating...");
        const validateResponse = await fetch(getApiUrl('/api/auth/validate'), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!validateResponse.ok) {
          console.log("Token validation failed");
          const validationData = await validateResponse.json();
          console.log("Validation error:", validationData);
          localStorage.removeItem("auth_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("last_auth_time");
          setLoading(false);
          setAuthDialogOpen(true);
          toast.error("Your session has expired. Please log in again.");
          return;
        }
        
        console.log("Token validated successfully, proceeding with search...");
      } else {
        const minutesRemaining = Math.floor((thirtyMinutes - timeSinceAuth) / 60000);
        console.log(`Token is fresh (${minutesRemaining} minutes remaining), skipping validation`);
      }
      
      // Format dates as YYYY-MM-DD
      const startDate = filters.dateRange.from.toISOString().split('T')[0];
      const endDate = filters.dateRange.to.toISOString().split('T')[0];
      
      // Store search dates for displaying on property cards
      setSearchStartDate(startDate);
      setSearchEndDate(endDate);
      
      const response = await fetch(getApiUrl('/api/search'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          startDate,
          endDate,
          regions: filters.regions.length > 0 ? filters.regions : undefined,
          resorts: filters.resorts.length > 0 ? filters.resorts : undefined,
          mileRange: filters.mileRange,
          dateType: filters.searchType,
          minNights: filters.minNights || 0,
          minSkiableAcres: filters.minSkiableAcres,
          minVerticalDrop: filters.minVerticalDrop,
          minAnnualSnowfall: filters.minAnnualSnowfall,
          numberOfPeople: filters.numberOfPeople,
          petsAllowed: filters.petsAllowed,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if it's an authentication error
        if (data.error && (
          data.error.includes('AUTH_INVALID_AUTH_TOKEN') || 
          data.error.includes('UNAUTHENTICATED') ||
          data.error.includes('iat_004')
        )) {
          // Clear the expired token and auth time
          localStorage.removeItem("auth_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("last_auth_time");
          setLastAuthTime(0);
          setLoading(false);
          setAuthDialogOpen(true);
          toast.error("Your session has expired. Please log in again.");
          return;
        }
        throw new Error(data.error || 'Search failed');
      }

      setProperties(data.results);
      setShowResults(true);
      setLoading(false);
      
      toast.success(`Found ${data.results.length} homes matching your criteria!`);
    } catch (error) {
      setLoading(false);
      // Check if the error message contains auth-related keywords
      const errorMsg = error instanceof Error ? error.message : 'Search failed';
      if (errorMsg.includes('AUTH_INVALID_AUTH_TOKEN') || 
          errorMsg.includes('UNAUTHENTICATED') ||
          errorMsg.includes('iat_004')) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("last_auth_time");
        setLastAuthTime(0);
        setAuthDialogOpen(true);
        toast.error("Your session has expired. Please log in again.");
      } else {
        toast.error(errorMsg);
      }
    }
  };

  const handlePropertyClick = (property: Property) => {
    // Open the property page on Kindred's website
    const homeUrl = `https://livekindred.com/home/${property.id}`;
    window.open(homeUrl, '_blank');
    toast.info(`Opening ${property.name} on Kindred`);
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("last_auth_time");
    setProperties([]);
    setShowResults(false);
    setLastAuthTime(0);
    toast.success("Logged out successfully");
  };

  return (
    <>
      <Hero onSearchClick={handleStartSearch} />
      <AuthDialog 
        open={authDialogOpen} 
        onClose={() => setAuthDialogOpen(false)}
        onAuthenticated={handleAuthenticated}
      />
      
      <div ref={resultsRef} className="container mx-auto px-4 py-12 space-y-8">
        {checkAuth() && (
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4 -mt-px" />
              Sign Out
            </Button>
          </div>
        )}
        <FilterPanel onSearch={handleSearch} loading={loading} />
        
        {showResults && (
          <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
              <TabsTrigger value="list" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                List View
              </TabsTrigger>
              <TabsTrigger value="map" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                Map View
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="list" className="mt-0">
              <ResultsList 
                properties={properties} 
                onPropertyClick={handlePropertyClick}
                searchStartDate={searchStartDate}
                searchEndDate={searchEndDate}
              />
            </TabsContent>
            
            <TabsContent value="map" className="mt-0">
              <PropertyMap properties={properties} onPropertyClick={handlePropertyClick} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </>
  );
};

export default Index;
