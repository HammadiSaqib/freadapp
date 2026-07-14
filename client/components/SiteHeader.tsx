import { Link, NavLink, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { Menu, ChevronDown, Calculator, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "Features", to: "/features" },
  { label: "How It Works", to: "/how-it-works" },
  { label: "Pricing", to: "/pricing" },
  { label: "Contact", to: "/contact" },
];

const calculatorLinks = [
  { label: "Funding Calculator", to: "/funding-calculator" },
  { label: "Mortgage Calculator", to: "/mortgage-calculator" },
  { label: "Car Loan Calculator", to: "/car-loan-calculator" },
];

export default function SiteHeader() {
  const location = useLocation();
  const calculatorsActive = calculatorLinks.some((item) => location.pathname === item.to);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-xl">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-500/60 to-transparent" />
      <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-4">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <img
            src="/capsol-logo.png"
            alt="CapSol"
            className="h-12 w-auto sm:h-14"
            width="240"
            height="140"
            decoding="async"
            fetchpriority="high"
          />
          <div className="hidden min-w-0 lg:block">
            <p className="truncate text-lg font-black tracking-tight text-slate-950">CapSol</p>
            <p className="mt-1 truncate text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Capital Solutions
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 xl:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  "rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950",
                  isActive && "bg-slate-950 text-white shadow-sm",
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950",
                  calculatorsActive && "bg-slate-950 text-white shadow-sm",
                )}
              >
                Calculators
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60 border-slate-200 bg-white text-slate-900 shadow-xl">
              {calculatorLinks.map((item) => (
                <DropdownMenuItem key={item.to} asChild className="focus:bg-slate-100 focus:text-slate-950">
                  <Link to={item.to} className="flex w-full items-center gap-2">
                    <Calculator className="h-4 w-4 text-teal-600" />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button
            variant="outline"
            className="border-slate-300 bg-white text-slate-900 hover:bg-slate-100 hover:text-slate-950"
            asChild
          >
            <Link to="/login">Sign In</Link>
          </Button>
          <Button
            variant="outline"
            className="hidden border-slate-300 bg-white text-slate-900 hover:bg-slate-100 hover:text-slate-950 lg:inline-flex"
            asChild
          >
            <Link to="/contact">Talk to Us</Link>
          </Button>
          <Button className="bg-teal-500 font-bold text-slate-950 hover:bg-teal-400" asChild>
            <Link to="/business-funding">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="xl:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="border-slate-300 bg-white text-slate-900 hover:bg-slate-100 hover:text-slate-950"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 border-slate-200 bg-white text-slate-950">
              <SheetHeader>
                <SheetTitle className="text-left text-slate-950">CapSol</SheetTitle>
              </SheetHeader>

              <div className="mt-8 space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <img
                    src="/capsol-logo.png"
                    alt="CapSol"
                    className="h-16 w-auto"
                  />
                </div>

                <div className="grid gap-2">
                  {navLinks.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      className={({ isActive }) =>
                        cn(
                          "block rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950",
                          isActive && "bg-slate-950 text-white",
                        )
                      }
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-700">Calculators</p>
                  <div className="mt-3 grid gap-2">
                    {calculatorLinks.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                          cn(
                            "block rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950",
                            isActive && "bg-slate-950 text-white",
                          )
                        }
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="border-slate-300 bg-white text-slate-900 hover:bg-slate-100 hover:text-slate-950"
                    asChild
                  >
                    <Link to="/login">Sign In</Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="border-slate-300 bg-white text-slate-900 hover:bg-slate-100 hover:text-slate-950"
                    asChild
                  >
                    <Link to="/contact">Talk to Us</Link>
                  </Button>
                  <Button className="bg-teal-500 font-bold text-slate-950 hover:bg-teal-400" asChild>
                    <Link to="/business-funding">Get Started</Link>
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
