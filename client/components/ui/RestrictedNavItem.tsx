import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock } from "lucide-react";
import { LucideIcon } from "lucide-react";

interface RestrictedNavItemProps {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: string | null;
  active: boolean;
  disabled: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}

export default function RestrictedNavItem({
  name,
  href,
  icon: Icon,
  badge,
  active,
  disabled,
  collapsed = false,
  onClick
}: RestrictedNavItemProps) {
  const content = (
    <>
      <Icon
        className={`h-5 w-5 ${
          disabled
            ? "text-slate-400 dark:text-slate-600"
            : active
            ? "text-white"
            : "text-slate-600 dark:text-slate-400 group-hover:text-ocean-blue"
        }`}
      />
      {!collapsed && (
        <div className="flex items-center justify-between flex-1">
          <span className={`font-medium ${
            disabled ? "text-slate-400 dark:text-slate-600" : ""
          }`}>
            {name}
          </span>
          <div className="flex items-center space-x-2">
            {badge && (
              <Badge
                variant={active ? "secondary" : "outline"}
                className={`text-xs ${
                  disabled
                    ? "bg-slate-100 text-slate-400 border-slate-200"
                    : active
                    ? "bg-white/20 text-white border-white/30"
                    : name === 'Subscription' && badge === 'Payment Required'
                    ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                    : "border-ocean-blue/20 text-ocean-blue"
                }`}
              >
                {badge}
              </Badge>
            )}
            {disabled && !collapsed && (
              <div className="opacity-60">
                <Lock className="h-3 w-3 text-slate-400 dark:text-slate-600" />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  if (disabled) {
    return (
      <div
        className="flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-not-allowed opacity-40 hover:opacity-60 relative group"
        title="Upgrade your subscription to access this feature"
        onClick={onClick}
      >
        {content}
        {/* Subtle lock icon overlay for collapsed state */}
        {collapsed && (
          <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="bg-slate-200 dark:bg-slate-700 rounded-full p-1">
              <Shield className="h-2 w-2 text-slate-500 dark:text-slate-400" />
            </div>
          </div>
        )}
        {/* Hover tooltip for expanded state */}
        {!collapsed && (
          <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="bg-slate-200 dark:bg-slate-700 rounded-full p-1">
              <Shield className="h-3 w-3 text-slate-500 dark:text-slate-400" />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      to={href}
      className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
        active
          ? "gradient-primary text-white shadow-lg"
          : "text-slate-600 dark:text-slate-400 hover:bg-gradient-soft hover:text-foreground"
      }`}
      onClick={onClick}
    >
      {content}
    </Link>
  );
}