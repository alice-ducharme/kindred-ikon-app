import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import heroImage from "@/assets/hero-mountains.jpg";

interface HeroProps {
  onSearchClick: () => void;
}

const Hero = ({ onSearchClick }: HeroProps) => {
  return (
    <div className="relative h-[600px] flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--ikon-navy))]/40 via-transparent via-40% to-[hsl(var(--ikon-navy))]/95" />
      </div>
      
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        <div className="inline-block mb-4 px-6 py-2 bg-[hsl(var(--ikon-yellow))] text-[hsl(var(--ikon-navy))] font-black text-sm uppercase tracking-wider -rotate-2 shadow-lg">
          KINDRED 🤝 IKON
        </div>
        <h1 className="text-6xl md:text-8xl font-black text-white mb-6 drop-shadow-2xl uppercase tracking-tight leading-none">
          Find Your
          <span className="block bg-gradient-to-r from-[hsl(var(--ikon-yellow))] via-[hsl(35_100%_50%)] to-[hsl(var(--ikon-yellow))] bg-clip-text text-transparent animate-pulse">
            <span className="tracking-tighter">Perfect</span> <span className="tracking-normal">Stay</span>
          </span>
        </h1>
        <p className="text-xl md:text-2xl text-white font-bold mb-10 drop-shadow-lg max-w-2xl mx-auto">
          Discover Kindred homes near Ikon resorts
        </p>
        <Button 
          size="lg" 
          onClick={onSearchClick}
          className="bg-gradient-to-r from-[hsl(var(--ikon-yellow))] to-[hsl(35_100%_50%)] hover:shadow-[var(--shadow-yellow)] text-[hsl(var(--ikon-navy))] text-lg px-10 py-7 font-black uppercase tracking-wide shadow-2xl transition-all duration-hover ease-entrance hover:scale-110 hover:-rotate-1 active:scale-[1.05]"
        >
          <Search className="mr-2 h-6 w-6" />
          Start Your Search
        </Button>
      </div>
    </div>
  );
};

export default Hero;
