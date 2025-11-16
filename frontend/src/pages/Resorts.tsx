import ResortScatterPlot from "@/components/ResortScatterPlot";

const Resorts = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Ikon Pass Resorts</h1>
          <p className="text-lg text-muted-foreground">
            Compare resorts by terrain size, vertical drop, and snowfall
          </p>
        </div>
        <ResortScatterPlot />
      </div>
    </div>
  );
};

export default Resorts;

