import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X } from "lucide-react";

const Navigation = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Search" },
    { path: "/resorts", label: "Resorts" },
    { path: "/about", label: "About" },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-[hsl(var(--ikon-navy))] border-[hsl(var(--ikon-yellow))]/20">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="px-4 py-1 bg-[hsl(var(--ikon-yellow))] text-[hsl(var(--ikon-navy))] font-black text-sm uppercase tracking-wider -rotate-2">
              KINDRED 🤝 IKON
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive(item.path) ? "default" : "ghost"}
                  className={
                    isActive(item.path)
                      ? "bg-[hsl(var(--ikon-yellow))] text-[hsl(var(--ikon-navy))] font-bold hover:bg-[hsl(var(--ikon-yellow))]/90"
                      : "text-white hover:bg-white/10 font-semibold"
                  }
                >
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>

          {/* Mobile Hamburger */}
          <div className="md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10"
                >
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent 
                side="right" 
                className="w-[250px] bg-[hsl(var(--ikon-navy))] border-[hsl(var(--ikon-yellow))]/20"
              >
                <div className="flex flex-col space-y-3 mt-8">
                  {navItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setOpen(false)}
                    >
                      <Button
                        variant={isActive(item.path) ? "default" : "ghost"}
                        className={
                          isActive(item.path)
                            ? "w-full justify-start bg-[hsl(var(--ikon-yellow))] text-[hsl(var(--ikon-navy))] font-bold hover:bg-[hsl(var(--ikon-yellow))]/90"
                            : "w-full justify-start text-white hover:bg-white/10 font-semibold"
                        }
                      >
                        {item.label}
                      </Button>
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

