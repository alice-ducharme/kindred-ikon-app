import { useState, useEffect } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ZAxis, ReferenceArea } from "recharts";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { getApiUrl } from "@/config";

interface ResortData {
  resort: string;
  region: string;
  state: string | null;
  skiable_acres: number | null;
  vertical_drop: number | null;
  annual_snowfall: number | null;
}

// Color palette for regions
const REGION_COLORS: Record<string, string> = {
  "Rockies": "#8B4513",
  "West Coast": "#4169E1",
  "Northeast": "#228B22",
  "Midwest": "#FFD700",
  "Mid-Atlantic": "#FF6347",
  "Europe": "#9370DB",
  "Japan": "#FF1493",
  "Australia / New Zealand": "#00CED1",
  "South America": "#FF8C00",
};

const ResortScatterPlot = () => {
  const [resorts, setResorts] = useState<ResortData[]>([]);
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Zoom state
  const [refAreaLeft, setRefAreaLeft] = useState<number | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<number | null>(null);
  const [refAreaTop, setRefAreaTop] = useState<number | null>(null);
  const [refAreaBottom, setRefAreaBottom] = useState<number | null>(null);
  const [left, setLeft] = useState<number | "dataMin">("dataMin");
  const [right, setRight] = useState<number | "dataMax">("dataMax");
  const [bottom, setBottom] = useState<number | "dataMin">("dataMin");
  const [top, setTop] = useState<number | "dataMax">("dataMax");
  const [isZoomed, setIsZoomed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetchResortStats();
  }, []);

  const fetchResortStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl('/api/resorts/stats'));
      const data = await response.json();
      
      if (response.ok) {
        setResorts(data.resorts);
        setAvailableRegions(data.regions);
        // Start with all regions selected
        setSelectedRegions(data.regions);
      } else {
        setError(data.error || 'Failed to load resort data');
      }
    } catch (err) {
      setError('Failed to connect to backend');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleRegion = (region: string) => {
    setSelectedRegions(prev =>
      prev.includes(region)
        ? prev.filter(r => r !== region)
        : [...prev, region]
    );
  };

  const selectAll = () => {
    setSelectedRegions(availableRegions);
  };

  const deselectAll = () => {
    setSelectedRegions([]);
  };

  // Zoom functions
  const zoom = () => {
    if (refAreaLeft === null || refAreaRight === null || refAreaTop === null || refAreaBottom === null) {
      return;
    }

    // Swap if needed
    let x1 = refAreaLeft;
    let x2 = refAreaRight;
    let y1 = refAreaBottom;
    let y2 = refAreaTop;

    if (x1 > x2) [x1, x2] = [x2, x1];
    if (y1 > y2) [y1, y2] = [y2, y1];

    // Only zoom if the selection is large enough
    if (Math.abs(x2 - x1) > 10 && Math.abs(y2 - y1) > 10) {
      // Round to integers for cleaner axis labels
      setLeft(Math.floor(x1));
      setRight(Math.ceil(x2));
      setBottom(Math.floor(y1));
      setTop(Math.ceil(y2));
      setIsZoomed(true);
    }

    // Clear the selection area
    setRefAreaLeft(null);
    setRefAreaRight(null);
    setRefAreaTop(null);
    setRefAreaBottom(null);
  };

  const resetZoom = () => {
    setLeft("dataMin");
    setRight("dataMax");
    setBottom("dataMin");
    setTop("dataMax");
    setRefAreaLeft(null);
    setRefAreaRight(null);
    setRefAreaTop(null);
    setRefAreaBottom(null);
    setIsZoomed(false);
  };

  const zoomIn = () => {
    if (left === "dataMin" || right === "dataMax" || bottom === "dataMin" || top === "dataMax") {
      // If not zoomed, calculate initial zoom around center
      const xValues = chartData.map(d => d.skiable_acres);
      const yValues = chartData.map(d => d.vertical_drop);
      const xMin = Math.min(...xValues);
      const xMax = Math.max(...xValues);
      const yMin = Math.min(...yValues);
      const yMax = Math.max(...yValues);
      
      const xRange = xMax - xMin;
      const yRange = yMax - yMin;
      
      setLeft(Math.floor(xMin + xRange * 0.15));
      setRight(Math.ceil(xMax - xRange * 0.15));
      setBottom(Math.floor(yMin + yRange * 0.15));
      setTop(Math.ceil(yMax - yRange * 0.15));
      setIsZoomed(true);
    } else {
      // Zoom in by 30%
      const xRange = (right as number) - (left as number);
      const yRange = (top as number) - (bottom as number);
      
      setLeft(Math.floor((left as number) + xRange * 0.15));
      setRight(Math.ceil((right as number) - xRange * 0.15));
      setBottom(Math.floor((bottom as number) + yRange * 0.15));
      setTop(Math.ceil((top as number) - yRange * 0.15));
      setIsZoomed(true);
    }
  };

  const zoomOut = () => {
    if (left === "dataMin" || right === "dataMax" || bottom === "dataMin" || top === "dataMax") {
      return; // Already at max zoom out
    }
    
    // Zoom out by 30%
    const xRange = (right as number) - (left as number);
    const yRange = (top as number) - (bottom as number);
    
    const newLeft = (left as number) - xRange * 0.15;
    const newRight = (right as number) + xRange * 0.15;
    const newBottom = (bottom as number) - yRange * 0.15;
    const newTop = (top as number) + yRange * 0.15;
    
    // Check if we've zoomed out to show everything
    const xValues = chartData.map(d => d.skiable_acres);
    const yValues = chartData.map(d => d.vertical_drop);
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    
    if (newLeft <= xMin && newRight >= xMax && newBottom <= yMin && newTop >= yMax) {
      resetZoom();
    } else {
      setLeft(Math.floor(Math.max(newLeft, xMin)));
      setRight(Math.ceil(Math.min(newRight, xMax)));
      setBottom(Math.floor(Math.max(newBottom, yMin)));
      setTop(Math.ceil(Math.min(newTop, yMax)));
    }
  };

  // Filter and prepare data for chart
  const chartData = resorts
    .filter(resort => 
      selectedRegions.includes(resort.region) &&
      resort.skiable_acres !== null &&
      resort.vertical_drop !== null &&
      resort.annual_snowfall !== null
    )
    .map(resort => ({
      ...resort,
      // Size for the bubble (annual snowfall, scaled for visibility)
      z: resort.annual_snowfall,
    }));

  // Calculate data bounds with padding for bubbles
  const getDataBounds = () => {
    if (chartData.length === 0) {
      return { xMin: 0, xMax: 1000, yMin: 0, yMax: 1000 };
    }
    
    const xValues = chartData.map(d => d.skiable_acres);
    const yValues = chartData.map(d => d.vertical_drop);
    
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    
    // Add 10% padding to max values so bubbles aren't cut off
    const xPadding = (xMax - xMin) * 0.1;
    const yPadding = (yMax - yMin) * 0.1;
    
    return {
      xMin: Math.floor(Math.max(0, xMin - xPadding)),
      xMax: Math.ceil(xMax + xPadding),
      yMin: Math.floor(Math.max(0, yMin - yPadding)),
      yMax: Math.ceil(yMax + yPadding)
    };
  };

  const dataBounds = getDataBounds();
  
  // Determine actual domain values
  const xDomain = left === "dataMin" ? dataBounds.xMin : left;
  const xDomainMax = right === "dataMax" ? dataBounds.xMax : right;
  const yDomain = bottom === "dataMin" ? dataBounds.yMin : bottom;
  const yDomainMax = top === "dataMax" ? dataBounds.yMax : top;

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border p-3 rounded-lg shadow-lg">
          <p className="font-bold text-foreground">{data.resort}</p>
          <p className="text-sm text-muted-foreground">{data.state ? `${data.state}, ${data.region}` : data.region}</p>
          <div className="mt-2 space-y-1 text-sm">
            <p><span className="font-semibold">Skiable Acres:</span> {data.skiable_acres?.toLocaleString()}</p>
            <p><span className="font-semibold">Vertical Drop:</span> {data.vertical_drop?.toLocaleString()} ft</p>
            <p><span className="font-semibold">Annual Snowfall:</span> {data.annual_snowfall?.toLocaleString()} in</p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-red-500">{error}</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Region Filter - Sidebar */}
      <Card className="p-6 lg:w-80 flex-shrink-0">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Filter by Region</h3>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-sm text-primary hover:underline"
            >
              Select All
            </button>
            <span className="text-muted-foreground">|</span>
            <button
              onClick={deselectAll}
              className="text-sm text-primary hover:underline"
            >
              Deselect All
            </button>
          </div>
          
          <div className="space-y-2">
            {availableRegions.map((region) => {
              const regionsWithAsterisk = ["Australia / New Zealand", "South America", "Japan"];
              const displayName = regionsWithAsterisk.includes(region) ? `${region}*` : region;
              
              return (
                <div
                  key={region}
                  className="flex items-center gap-2 p-2 rounded hover:bg-secondary/50 cursor-pointer"
                  onClick={() => toggleRegion(region)}
                >
                  <div onClick={(e) => e.stopPropagation()} className="flex items-center">
                    <Checkbox
                      checked={selectedRegions.includes(region)}
                      onCheckedChange={() => toggleRegion(region)}
                    />
                  </div>
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: REGION_COLORS[region] || '#888' }}
                  />
                  <label className="text-sm cursor-pointer flex-1 leading-none">
                    {displayName}
                  </label>
                </div>
              );
            })}
          </div>
          
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground italic">
              * Kindred doesn't have homes in these regions (yet) but they're included here for scale
            </p>
          </div>
        </div>
      </Card>

      {/* Chart */}
      <Card className="p-6 flex-1 select-none">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">Resort Comparison</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Bubble size represents annual snowfall • Showing {chartData.length} resorts
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={zoomIn}
                className="h-8"
              >
                <ZoomIn className="h-4 w-4 mr-1" />
                Zoom In
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={zoomOut}
                disabled={!isZoomed}
                className="h-8"
              >
                <ZoomOut className="h-4 w-4 mr-1" />
                Zoom Out
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetZoom}
                disabled={!isZoomed}
                className="h-8"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p><strong>Tip:</strong> Drag a rectangle on the chart to zoom into a specific area</p>
          </div>
          
          <div 
            style={{ userSelect: isDragging ? 'none' : 'auto' }}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
          >
            <ResponsiveContainer width="100%" height={600}>
              <ScatterChart
                margin={{ top: 20, right: 20, bottom: 60, left: 60 }}
                onMouseDown={(e: any) => {
                  if (e && e.xValue !== undefined && e.yValue !== undefined) {
                    setRefAreaLeft(e.xValue);
                    setRefAreaBottom(e.yValue);
                    setIsDragging(true);
                  }
                }}
                onMouseMove={(e: any) => {
                  if (refAreaLeft !== null && e && e.xValue !== undefined && e.yValue !== undefined) {
                    setRefAreaRight(e.xValue);
                    setRefAreaTop(e.yValue);
                  }
                }}
                onMouseUp={(e: any) => {
                  zoom();
                  setIsDragging(false);
                }}
              >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                type="number"
                dataKey="skiable_acres"
                name="Skiable Acres"
                label={{ value: 'Skiable Acres', position: 'bottom', offset: 10 }}
                className="text-xs"
                domain={[xDomain, xDomainMax]}
                allowDataOverflow
                allowDecimals={false}
              />
              <YAxis
                type="number"
                dataKey="vertical_drop"
                name="Vertical Drop (ft)"
                label={{ 
                  value: 'Vertical Drop (ft)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' },
                  offset: -20
                }}
                className="text-xs"
                domain={[yDomain, yDomainMax]}
                allowDataOverflow
                allowDecimals={false}
              />
              <ZAxis
                type="number"
                dataKey="z"
                range={[50, 1000]}
                name="Annual Snowfall (in)"
              />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Legend
                wrapperStyle={{ paddingTop: '35px' }}
                content={() => (
                  <div className="flex justify-center gap-4 flex-wrap text-xs">
                    {selectedRegions.map(region => (
                      <div key={region} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: REGION_COLORS[region] || '#888' }}
                        />
                        <span>{region}</span>
                      </div>
                    ))}
                  </div>
                )}
              />
              {selectedRegions.map(region => (
                <Scatter
                  key={region}
                  name={region}
                  data={chartData.filter(d => d.region === region)}
                  fill={REGION_COLORS[region] || '#888'}
                  fillOpacity={0.6}
                />
              ))}
              {refAreaLeft !== null && refAreaRight !== null && refAreaTop !== null && refAreaBottom !== null ? (
                <ReferenceArea
                  x1={refAreaLeft}
                  x2={refAreaRight}
                  y1={refAreaBottom}
                  y2={refAreaTop}
                  strokeOpacity={0.3}
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                />
              ) : null}
            </ScatterChart>
          </ResponsiveContainer>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ResortScatterPlot;

