import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  CreditCard,
  ArrowLeft,
  Bell,
  Settings,
  Construction,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface PlaceholderPageProps {
  title: string;
  description: string;
  comingSoon?: boolean;
}

export default function PlaceholderPage({
  title,
  description,
  comingSoon = true,
}: PlaceholderPageProps) {
  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold">CreditRepairPro</span>
            </Link>
            <nav className="hidden md:flex items-center space-x-6 ml-8">
              <Link
                to="/dashboard"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Dashboard
              </Link>
              <Link
                to="/clients"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Clients
              </Link>
              <Link
                to="/reports"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Reports
              </Link>
              <Link
                to="/disputes"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Disputes
              </Link>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
            <Avatar>
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-2xl mx-auto text-center mt-20">
          <Card>
            <CardHeader>
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Construction className="h-8 w-8 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">{title}</CardTitle>
              <CardDescription className="text-lg">
                {description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {comingSoon && (
                <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-sm font-medium">
                  Coming Soon
                </div>
              )}
              <p className="text-muted-foreground">
                This feature is currently under development. Continue prompting
                to have this page built out with full functionality.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild>
                  <Link to="/dashboard">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Link>
                </Button>
                <Button variant="outline">Request Priority Development</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
