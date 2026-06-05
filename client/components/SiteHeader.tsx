import { NavLink, Link, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { DollarSign, Menu, ChevronDown, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function SiteHeader() {
  const location = useLocation();
  const calculatorLinks = [
    { label: "Funding Calculator", to: "/funding-calculator" },
    { label: "Mortgage Calculator", to: "/mortgage-calculator" },
    { label: "Car Loan Calculator", to: "/car-loan-calculator" },
  ];
  const calculatorsActive = calculatorLinks.some((l) => location.pathname === l.to);

  return (
    <header className="relative z-50 border-b bg-white/95 backdrop-blur-sm sticky top-0">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <img src="/image.png" alt="Score Machine" className="w-20 h-14" width="80" height="56" decoding="async" fetchpriority="high" />
          <span className="text-2xl font-bold bg-gradient-to-r from-ocean-blue to-sea-green bg-clip-text text-transparent">
            Score Machine
          </span>
        </div>
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <NavLink
            to="/"
            className={({ isActive }) =>
              cn(
                "text-muted-foreground hover:text-ocean-blue transition-colors font-medium",
                isActive && "text-ocean-blue font-semibold"
              )
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/features"
            className={({ isActive }) =>
              cn(
                "text-muted-foreground hover:text-ocean-blue transition-colors font-medium",
                isActive && "text-ocean-blue font-semibold"
              )
            }
          >
            Features
          </NavLink>
          <NavLink
            to="/how-it-works"
            className={({ isActive }) =>
              cn(
                "text-muted-foreground hover:text-ocean-blue transition-colors font-medium",
                isActive && "text-ocean-blue font-semibold"
              )
            }
          >
            How It Works
          </NavLink>
          <NavLink
            to="/pricing"
            className={({ isActive }) =>
              cn(
                "text-muted-foreground hover:text-ocean-blue transition-colors font-medium",
                isActive && "text-ocean-blue font-semibold"
              )
            }
          >
            Pricing
          </NavLink>
          <NavLink
            to="/shop"
            className={({ isActive }) =>
              cn(
                "text-muted-foreground hover:text-ocean-blue transition-colors font-medium",
                isActive && "text-ocean-blue font-semibold"
              )
            }
          >
            Shop
          </NavLink>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "text-muted-foreground hover:text-ocean-blue transition-colors font-medium inline-flex items-center gap-1",
                  calculatorsActive && "text-ocean-blue font-semibold"
                )}
              >
                Calculators
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {calculatorLinks.map((item) => (
                <DropdownMenuItem key={item.to} asChild>
                  <Link to={item.to} className="w-full cursor-pointer flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <NavLink
            to="/blog"
            className={({ isActive }) =>
              cn(
                "text-muted-foreground hover:text-ocean-blue transition-colors font-medium",
                isActive && "text-ocean-blue font-semibold"
              )
            }
          >
            Blog
          </NavLink>
          <NavLink
            to="/contact"
            className={({ isActive }) =>
              cn(
                "text-muted-foreground hover:text-ocean-blue transition-colors font-medium",
                isActive && "text-ocean-blue font-semibold"
              )
            }
          >
            Contact
          </NavLink>
        </nav>
        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center space-x-3">
          
          <Button
            variant="outline"
            className="border-sea-green text-sea-green hover:bg-sea-green hover:text-white hidden lg:flex"
            asChild
          >
            <Link to="/join-affiliate">
              Join Affiliate
            </Link>
          </Button>
          <Button
            className="bg-gradient-to-r from-ocean-blue to-sea-green hover:from-ocean-blue/90 hover:to-sea-green/90 shadow-lg"
            asChild
          >
            <Link to="/login">Sign in</Link>
          </Button>
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="grid gap-3">
                  <NavLink
                    to="/"
                    className={({ isActive }) =>
                      cn(
                        "block px-3 py-2 rounded-md hover:bg-slate-100",
                        isActive && "bg-slate-100 font-semibold"
                      )
                    }
                  >
                    Home
                  </NavLink>
                  <NavLink
                    to="/features"
                    className={({ isActive }) =>
                      cn(
                        "block px-3 py-2 rounded-md hover:bg-slate-100",
                        isActive && "bg-slate-100 font-semibold"
                      )
                    }
                  >
                    Features
                  </NavLink>
                  <NavLink
                    to="/how-it-works"
                    className={({ isActive }) =>
                      cn(
                        "block px-3 py-2 rounded-md hover:bg-slate-100",
                        isActive && "bg-slate-100 font-semibold"
                      )
                    }
                  >
                    How It Works
                  </NavLink>
                  <NavLink
                    to="/pricing"
                    className={({ isActive }) =>
                      cn(
                        "block px-3 py-2 rounded-md hover:bg-slate-100",
                        isActive && "bg-slate-100 font-semibold"
                      )
                    }
                  >
                    Pricing
                  </NavLink>
                  <NavLink
                    to="/shop"
                    className={({ isActive }) =>
                      cn(
                        "block px-3 py-2 rounded-md hover:bg-slate-100",
                        isActive && "bg-slate-100 font-semibold"
                      )
                    }
                  >
                    Shop
                  </NavLink>
                  <div className="pt-2">
                    <div className="px-3 py-1 text-xs font-semibold text-slate-500">Calculators</div>
                    {calculatorLinks.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                          cn(
                            "block px-3 py-2 rounded-md hover:bg-slate-100",
                            isActive && "bg-slate-100 font-semibold"
                          )
                        }
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                  <NavLink
                    to="/blog"
                    className={({ isActive }) =>
                      cn(
                        "block px-3 py-2 rounded-md hover:bg-slate-100",
                        isActive && "bg-slate-100 font-semibold"
                      )
                    }
                  >
                    Blog
                  </NavLink>
                  <NavLink
                    to="/contact"
                    className={({ isActive }) =>
                      cn(
                        "block px-3 py-2 rounded-md hover:bg-slate-100",
                        isActive && "bg-slate-100 font-semibold"
                      )
                    }
                  >
                    Contact
                  </NavLink>
                 
                </div>

                <div className="grid gap-3 pt-4">
                  
                  <Button variant="outline" asChild>
                    <Link to="/join-affiliate">Join Affiliate</Link>
                  </Button>
                  <Button className="bg-gradient-to-r from-ocean-blue to-sea-green" asChild>
                    <Link to="/login">Sign inp</Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
