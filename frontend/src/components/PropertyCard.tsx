import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Home, Users, Calendar } from "lucide-react";

interface Availability {
  startDate: string;
  endDate: string;
}

interface ResortInfo {
  resort: string;
  driving_time_minutes: number | null;
}

export interface Property {
  id: string;
  name: string;
  resort: string; // Kept for backward compatibility
  resorts?: ResortInfo[]; // Array of nearby resorts with drive times
  distance: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  imageUrl: string;
  lat: number;
  lng: number;
  driveTime?: number;
  availabilities?: Availability[];
}

interface PropertyCardProps {
  property: Property;
  onClick: () => void;
  searchStartDate?: string;
  searchEndDate?: string;
}

const PropertyCard = ({ property, onClick, searchStartDate, searchEndDate }: PropertyCardProps) => {
  // Filter availabilities to only show those that overlap with search dates
  const getFilteredAvailabilities = () => {
    if (!property.availabilities || !searchStartDate || !searchEndDate) {
      return [];
    }

    const searchStart = new Date(searchStartDate);
    const searchEnd = new Date(searchEndDate);

    return property.availabilities.filter(avail => {
      const availStart = new Date(avail.startDate);
      const availEnd = new Date(avail.endDate);
      
      // Check if there's any overlap between availability and search dates
      return availStart <= searchEnd && availEnd >= searchStart;
    }).slice(0, 3); // Show max 3 availability periods
  };

  const filteredAvailabilities = getFilteredAvailabilities();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Format drive time text with multiple resorts
  const formatDriveTimeText = () => {
    const resorts = property.resorts || [];
    
    if (resorts.length === 0) {
      // Fallback to old format
      return property.driveTime !== undefined && property.driveTime !== null
        ? `Estimated ${Math.round(property.driveTime)} min drive to ${property.resort}`
        : `${property.distance} from ${property.resort}`;
    }

    // Filter resorts with valid driving times
    const resortsWithTime = resorts.filter(
      r => r.driving_time_minutes !== null && r.driving_time_minutes !== undefined
    );
    
    if (resortsWithTime.length === 0) {
      return `Near ${resorts.map(r => r.resort).join(', ')}`;
    }

    // Show only the closest resort, then "farther to other resorts" if there are more resort badges shown
    const closestResort = resortsWithTime[0];
    // Check total number of resorts (including those without times) to see if we should show "farther"
    const totalResortCount = resorts.length;
    
    let text = `Estimated ${Math.round(closestResort.driving_time_minutes!)} min drive to ${closestResort.resort}`;
    
    if (totalResortCount > 1) {
      text += ', farther to other resorts';
    }
    
    return text;
  };

  return (
    <Card 
      className="overflow-hidden cursor-pointer transition-all duration-hover ease-entrance hover:shadow-[var(--shadow-hover)] hover:-translate-y-2 bg-gradient-to-br from-card to-secondary/20 border-2 border-transparent hover:border-[hsl(var(--ikon-yellow))]/50 group will-change-transform"
      onClick={onClick}
      style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
    >
      <div className="aspect-video overflow-hidden bg-muted relative">
        <img
          src={property.imageUrl}
          alt={property.name}
          className="w-full h-full object-cover transition-transform duration-hover ease-entrance group-hover:scale-110"
        />
        {/* Multiple resort badges */}
        <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-1">
          {(property.resorts && property.resorts.length > 0 ? property.resorts : [{ resort: property.resort, driving_time_minutes: property.driveTime }]).map((resortInfo, idx) => (
            <Badge 
              key={idx} 
              variant="secondary" 
              className="bg-[hsl(var(--ikon-yellow))] text-[hsl(var(--ikon-navy))] hover:bg-[hsl(var(--ikon-yellow))]/90 font-bold border border-[hsl(var(--ikon-yellow))]/50 transition-all duration-hover ease-entrance shadow-lg"
            >
              {resortInfo.resort}
            </Badge>
          ))}
        </div>
      </div>
      <div className="p-4 space-y-3" style={{ backfaceVisibility: 'hidden' }}>
        <div>
          <h3 className="font-semibold text-lg text-foreground line-clamp-1">
            {property.name}
          </h3>
          <div className="flex items-center gap-1 text-muted-foreground text-sm mt-1">
            <MapPin className="h-4 w-4 -mt-px flex-shrink-0" />
            <span className="line-clamp-3">
              {formatDriveTimeText()}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Home className="h-4 w-4 -mt-px" />
            <span>{property.bedrooms} bed • {property.bathrooms} bath</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 -mt-px" />
            <span>{property.maxGuests} guests</span>
          </div>
        </div>

        {filteredAvailabilities.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Calendar className="h-3 w-3 -mt-px" />
              <span>Available:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {filteredAvailabilities.map((avail, idx) => (
                <Badge 
                  key={idx} 
                  variant="outline" 
                  className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                >
                  {formatDate(avail.startDate)} - {formatDate(avail.endDate)}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default PropertyCard;
