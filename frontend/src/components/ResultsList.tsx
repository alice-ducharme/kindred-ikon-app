import PropertyCard, { Property } from "./PropertyCard";

interface ResultsListProps {
  properties: Property[];
  onPropertyClick: (property: Property) => void;
  searchStartDate?: string;
  searchEndDate?: string;
}

const ResultsList = ({ properties, onPropertyClick, searchStartDate, searchEndDate }: ResultsListProps) => {
  if (properties.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">
          No properties found. Try adjusting your filters.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-foreground">
        {properties.length} {properties.length === 1 ? "Home" : "Homes"} Available
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {properties.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            onClick={() => onPropertyClick(property)}
            searchStartDate={searchStartDate}
            searchEndDate={searchEndDate}
          />
        ))}
      </div>
    </div>
  );
};

export default ResultsList;
