import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { CalendarIcon, Map, CableCar, Mountain, Loader2, Radius, ChevronDown, ChevronUp, Maximize2, TrendingDown, Snowflake, HelpCircle, X, Users, PawPrint, Home, CalendarClock, Moon } from "lucide-react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { getApiUrl } from "@/config";

interface FilterPanelProps {
  onSearch: (filters: SearchFilters) => void;
  loading?: boolean;
}

export interface SearchFilters {
  dateRange?: DateRange;
  regions: string[];
  resorts: string[];
  mileRange: number;
  searchType: 'exact' | 'flexible';
  minNights?: number;
  minSkiableAcres?: number;
  minVerticalDrop?: number;
  minAnnualSnowfall?: number;
  numberOfPeople?: number;
  petsAllowed?: boolean;
}

const FilterPanel = ({ onSearch, loading = false }: FilterPanelProps) => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedResorts, setSelectedResorts] = useState<string[]>([]);
  const [mileRange, setMileRange] = useState<number>(35);
  const [searchType, setSearchType] = useState<'exact' | 'flexible'>('exact');
  const [minNights, setMinNights] = useState<number>(3);
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);
  const [availableResorts, setAvailableResorts] = useState<string[]>([]);
  const [allResortData, setAllResortData] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [showKindredFilters, setShowKindredFilters] = useState<boolean>(false);
  const [minSkiableAcres, setMinSkiableAcres] = useState<number | undefined>();
  const [minVerticalDrop, setMinVerticalDrop] = useState<number | undefined>();
  const [minAnnualSnowfall, setMinAnnualSnowfall] = useState<number | undefined>();
  const [numberOfPeople, setNumberOfPeople] = useState<number | undefined>();
  const [petsAllowed, setPetsAllowed] = useState<boolean>(false);
  const [regionPopoverOpen, setRegionPopoverOpen] = useState(false);
  const [resortPopoverOpen, setResortPopoverOpen] = useState(false);
  const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0);
  const [shuffledPhrases, setShuffledPhrases] = useState<string[]>([]);

  // Loading phrases that cycle during search
  const loadingPhrases = [
    "Skimming uphill...",
    "Speeding through the singles line...",
    "Turning off-piste...",
    "Finding your line...",
    "Digging out of fresh powder...",
    "Avoiding the gapers..."
  ];

  // Shuffle array helper function
  const shuffleArray = (array: string[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Cycle through loading phrases with random order
  useEffect(() => {
    if (!loading) {
      return;
    }

    // Shuffle phrases and start at a random index when loading begins
    const shuffled = shuffleArray(loadingPhrases);
    setShuffledPhrases(shuffled);
    setLoadingPhraseIndex(Math.floor(Math.random() * shuffled.length));

    const interval = setInterval(() => {
      setLoadingPhraseIndex((prev) => (prev + 1) % shuffled.length);
    }, 3000); // Change phrase every 3 seconds

    return () => clearInterval(interval);
  }, [loading]);

  // Fetch resorts on mount
  useEffect(() => {
    const fetchResorts = async () => {
      try {
        setDataLoading(true);
        setDataError(null);
        console.log("Fetching resorts from backend...");
        const response = await fetch(getApiUrl('/api/resorts'));
        console.log("Response status:", response.status, response.ok);
        
        const data = await response.json();
        console.log("Fetched resorts data:", data);
        console.log("Regions array:", data.regions);
        console.log("Resorts array length:", data.resorts?.length);
        
        if (response.ok && data.regions && data.resorts) {
          // Exclude regions without Kindred homes
          const excludedRegions = ["Japan", "Australia / New Zealand", "South America"];
          
          // Filter regions
          const filteredRegions = data.regions.filter((region: string) => !excludedRegions.includes(region));
          
          // Filter resorts (exclude resorts from excluded regions)
          const filteredResorts = data.resorts.filter((r: any) => !excludedRegions.includes(r.region));
          const resortNames = filteredResorts.map((r: any) => r.resort);
          
          console.log(`Setting ${filteredRegions.length} regions and ${resortNames.length} resorts (excluded: ${excludedRegions.join(', ')})`);
          console.log("New regions to set:", filteredRegions);
          console.log("New resorts to set (first 5):", resortNames.slice(0, 5));
          
          setAvailableRegions(filteredRegions);
          setAllResortData(filteredResorts);
          setAvailableResorts(resortNames);
          setDataLoading(false);
          
          console.log("State updated successfully");
        } else {
          console.error("Failed to fetch resorts - invalid response:", data);
          setDataError("Failed to load resorts data");
          setDataLoading(false);
        }
      } catch (error) {
        console.error("Failed to fetch resorts - error:", error);
        setDataError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setDataLoading(false);
      }
    };
    
    fetchResorts();
  }, []);

  // Filter resorts by selected regions
  useEffect(() => {
    if (selectedRegions.length === 0) {
      // No regions selected, show all resorts
      const resortNames = allResortData.map((r: any) => r.resort);
      setAvailableResorts(resortNames);
    } else {
      // Filter resorts by selected regions
      const filteredResorts = allResortData
        .filter((r: any) => selectedRegions.includes(r.region))
        .map((r: any) => r.resort);
      setAvailableResorts(filteredResorts);
      // Clear selected resorts that are no longer in filtered list
      setSelectedResorts(prev => prev.filter(resort => filteredResorts.includes(resort)));
    }
  }, [selectedRegions, allResortData]);

  const handleSearch = () => {
    onSearch({ 
      dateRange, 
      regions: selectedRegions, 
      resorts: selectedResorts, 
      mileRange,
      searchType,
      minNights: searchType === 'flexible' ? minNights : undefined,
      minSkiableAcres,
      minVerticalDrop,
      minAnnualSnowfall,
      numberOfPeople,
      petsAllowed
    });
  };

  const toggleRegion = (regionName: string) => {
    setSelectedRegions(prev => 
      prev.includes(regionName) 
        ? prev.filter(r => r !== regionName)
        : [...prev, regionName]
    );
  };

  const toggleResort = (resortName: string) => {
    setSelectedResorts(prev => 
      prev.includes(resortName) 
        ? prev.filter(r => r !== resortName)
        : [...prev, resortName]
    );
  };

  return (
    <Card className="p-8 shadow-[var(--shadow-elegant)] border-2 border-[hsl(var(--ikon-yellow))]/20 bg-gradient-to-br from-card to-secondary/30 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[hsl(var(--ikon-yellow))]/10 rounded-full -mr-16 -mt-16" />
      <h2 className="text-3xl font-black mb-6 text-foreground uppercase tracking-tight relative">Filter Your Search</h2>
      
      {dataLoading && (
        <div className="mb-4 text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 -mt-px animate-spin" />
          Loading resorts and regions...
        </div>
      )}
      
      {dataError && (
        <div className="mb-4 text-sm text-red-500">
          {dataError} - Please make sure the backend is running on port 5000
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <CalendarIcon className="h-4 w-4 -mt-px" />
            Dates
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal hover:bg-secondary/50 hover:shadow-sm transition-all duration-hover ease-entrance"
              >
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span className="text-muted-foreground">Select dates</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <CalendarClock className="h-4 w-4 -mt-px" />
            <span>Search Type</span>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="inline-flex items-center">
                    <HelpCircle className="h-4 w-4 -mt-px cursor-help hover:text-foreground transition-colors" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="font-normal">If you choose "Flexible Dates," homes with availability for any period within your chosen dates will be listed.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select value={searchType} onValueChange={(value: 'exact' | 'flexible') => setSearchType(value)}>
            <SelectTrigger className="w-full hover:bg-secondary/50 hover:shadow-sm transition-all duration-hover ease-entrance">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="exact">Exact Dates</SelectItem>
              <SelectItem value="flexible">Flexible Dates</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {searchType === 'flexible' && (
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Moon className="h-4 w-4 -mt-px" />
              Minimum Nights
            </label>
            <Input
              type="number"
              min="1"
              max="30"
              value={minNights}
              onChange={(e) => setMinNights(Math.max(1, parseInt(e.target.value) || 3))}
              className="hover:bg-secondary/50 hover:shadow-sm transition-all duration-hover ease-entrance"
              placeholder="e.g. 3"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="space-y-2">
          <div className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Map className="h-4 w-4 -mt-px" />
            <span>Regions</span>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="inline-flex items-center">
                    <HelpCircle className="h-4 w-4 -mt-px cursor-help hover:text-foreground transition-colors" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="font-normal">Kindred doesn't have homes in Asia, Australia, or South America (yet), so those regions and resorts are excluded.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Popover open={regionPopoverOpen} onOpenChange={setRegionPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between hover:bg-secondary/50 hover:text-foreground hover:shadow-sm transition-all duration-hover ease-entrance">
                <span className="truncate">
                  {selectedRegions.length === 0 
                    ? "Select regions" 
                    : `${selectedRegions.length} selected`
                  }
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0 bg-popover border-border">
              <div className="max-h-[300px] overflow-y-auto p-2">
                {availableRegions.map((regionName) => (
                  <div key={regionName} className="flex items-center space-x-2 py-2 px-2 hover:bg-secondary/50 rounded cursor-pointer" onClick={() => toggleRegion(regionName)}>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox 
                        checked={selectedRegions.includes(regionName)}
                        onCheckedChange={() => toggleRegion(regionName)}
                      />
                    </div>
                    <label className="text-sm cursor-pointer flex-1">{regionName}</label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          {selectedRegions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedRegions.map(regionName => (
                <Badge key={regionName} variant="secondary" className="text-xs transition-all duration-tap ease-entrance hover:scale-105 hover:-translate-y-0.5 hover:shadow-md">
                  {regionName}
                  <X className="h-3 w-3 ml-1 cursor-pointer hover:text-destructive transition-colors duration-tap" onClick={() => toggleRegion(regionName)} />
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <CableCar className="h-4 w-4 -mt-px" />
            Resorts
          </label>
          <Popover open={resortPopoverOpen} onOpenChange={setResortPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between hover:bg-secondary/50 hover:text-foreground hover:shadow-sm transition-all duration-hover ease-entrance">
                <span className="truncate">
                  {selectedResorts.length === 0 
                    ? "Select resorts" 
                    : `${selectedResorts.length} selected`
                  }
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0 bg-popover border-border">
              <div className="max-h-[300px] overflow-y-auto p-2">
                {availableResorts.map((resortName) => (
                  <div key={resortName} className="flex items-center space-x-2 py-2 px-2 hover:bg-secondary/50 rounded cursor-pointer" onClick={() => toggleResort(resortName)}>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox 
                        checked={selectedResorts.includes(resortName)}
                        onCheckedChange={() => toggleResort(resortName)}
                      />
                    </div>
                    <label className="text-sm cursor-pointer flex-1">{resortName}</label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          {selectedResorts.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedResorts.map(resortName => (
                <Badge key={resortName} variant="secondary" className="text-xs transition-all duration-tap ease-entrance hover:scale-105 hover:-translate-y-0.5 hover:shadow-md">
                  {resortName}
                  <X className="h-3 w-3 ml-1 cursor-pointer hover:text-destructive transition-colors duration-tap" onClick={() => toggleResort(resortName)} />
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Radius className="h-4 w-4 -mt-px" />
            <span>Mile Radius: {mileRange}</span>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="inline-flex items-center">
                    <HelpCircle className="h-4 w-4 -mt-px cursor-help hover:text-foreground transition-colors" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="font-normal">An approximate radius from the resort location <em>as the crow flies</em>. The driving distance will almost certainly be greater.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Slider
            value={[mileRange]}
            onValueChange={(value) => setMileRange(value[0])}
            min={1}
            max={200}
            step={1}
            className="w-full"
          />
          <div className="flex gap-2">
            <Badge
              variant={mileRange === 10 ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/90 hover:scale-105 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 transition-all duration-tap ease-entrance hover:shadow-md"
              onClick={() => setMileRange(10)}
            >
              10
            </Badge>
            <Badge
              variant={mileRange === 30 ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/90 hover:scale-105 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 transition-all duration-tap ease-entrance hover:shadow-md"
              onClick={() => setMileRange(30)}
            >
              30
            </Badge>
            <Badge
              variant={mileRange === 60 ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/90 hover:scale-105 hover:-translate-y-0.5 active:scale-95 active:translate-y-0 transition-all duration-tap ease-entrance hover:shadow-md"
              onClick={() => setMileRange(60)}
            >
              60
            </Badge>
          </div>
        </div>
      </div>

      {/* Advanced Kindred Filters Toggle */}
      <div className="mb-6 p-4 border-2 border-border rounded-lg bg-secondary/20 cursor-pointer hover:bg-secondary/30 hover:shadow-md transition-all duration-hover ease-entrance" onClick={() => setShowKindredFilters(!showKindredFilters)}>
        <div className="w-full flex items-center justify-between">
          <span className="flex items-center gap-2 font-semibold">
            <Home className="h-4 w-4 -mt-px" />
            Advanced Kindred Filters
          </span>
          {showKindredFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
        
        {showKindredFilters && (
          <div className="mt-4 pt-4 border-t border-border" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-muted-foreground mb-4">Filter homes by Kindred requirements:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4 -mt-px" />
                  Number of People
                </label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={numberOfPeople || ""}
                  onChange={(e) => setNumberOfPeople(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="hover:bg-secondary/50 hover:shadow-sm transition-all duration-hover ease-entrance"
                  placeholder="e.g. 4"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <PawPrint className="h-4 w-4 -mt-px" />
                  Pets Allowed
                </label>
                <div className="flex items-center h-10 px-3 py-2 border border-input rounded-md bg-background hover:bg-secondary/50 hover:shadow-sm transition-all duration-hover ease-entrance">
                  <Checkbox
                    id="pets-allowed"
                    checked={petsAllowed}
                    onCheckedChange={(checked) => setPetsAllowed(checked === true)}
                    className="mr-2"
                  />
                  <label
                    htmlFor="pets-allowed"
                    className="text-sm cursor-pointer flex-1"
                  >
                    Pet-friendly homes only
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Mountain Filters Toggle */}
      <div className="mb-6 p-4 border-2 border-border rounded-lg bg-secondary/20 cursor-pointer hover:bg-secondary/30 hover:shadow-md transition-all duration-hover ease-entrance" onClick={() => setShowAdvanced(!showAdvanced)}>
        <div className="w-full flex items-center justify-between">
          <span className="flex items-center gap-2 font-semibold">
            <Mountain className="h-4 w-4 -mt-px" />
            Advanced Mountain Filters
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="inline-flex items-center" onClick={(e) => e.stopPropagation()}>
                    <HelpCircle className="h-4 w-4 -mt-px cursor-help hover:text-foreground transition-colors" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="font-normal">Check out the Resorts tab to see stats like vertical drop for each mountain.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </span>
          {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
        
        {showAdvanced && (
          <div className="mt-4 pt-4 border-t border-border" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-muted-foreground mb-4">Filter resorts by minimum requirements:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <Maximize2 className="h-4 w-4 -mt-px" />
                  Min Skiable Acres
                </label>
                <Input
                  type="number"
                  min="0"
                  value={minSkiableAcres || ""}
                  onChange={(e) => setMinSkiableAcres(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="hover:bg-secondary/50 hover:shadow-sm transition-all duration-hover ease-entrance"
                  placeholder="e.g. 1000"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <TrendingDown className="h-4 w-4 -mt-px" />
                  Min Vertical Drop (ft)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={minVerticalDrop || ""}
                  onChange={(e) => setMinVerticalDrop(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="hover:bg-secondary/50 hover:shadow-sm transition-all duration-hover ease-entrance"
                  placeholder="e.g. 2000"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                  <Snowflake className="h-4 w-4 -mt-px" />
                  Min Annual Snowfall (in)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={minAnnualSnowfall || ""}
                  onChange={(e) => setMinAnnualSnowfall(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="hover:bg-secondary/50 hover:shadow-sm transition-all duration-hover ease-entrance"
                  placeholder="e.g. 300"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <Button 
        onClick={handleSearch} 
        className="w-full bg-gradient-to-r from-[hsl(var(--ikon-cyan))] to-[hsl(195_100%_35%)] hover:shadow-[var(--shadow-hover)] text-white font-black text-lg uppercase tracking-wide transition-all duration-hover ease-entrance hover:scale-[1.02] active:scale-[0.98]"
        size="lg"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 -mb-0.5 animate-spin" />
            {shuffledPhrases.length > 0 ? shuffledPhrases[loadingPhraseIndex] : "Searching..."}
          </>
        ) : (
          "Search Available Homes"
        )}
      </Button>
    </Card>
  );
};

export default FilterPanel;
