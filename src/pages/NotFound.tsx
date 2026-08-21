import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ROUTE_PATHS } from "@/config/routes";
import { useAuth } from "@/hooks/useAuth";
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Store } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userRole } = useOrganization();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  const homePath = !user
    ? ROUTE_PATHS.landing
    : userRole === "cashier"
    ? ROUTE_PATHS.checkout
    : ROUTE_PATHS.dashboard;

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md text-center bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
          <Store className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-6xl font-black text-slate-900 dark:text-white tracking-tight mb-2">404</h1>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Page Not Found</h2>
          <p className="text-sm text-muted-foreground mt-2">
            The page <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-foreground">{location.pathname}</code> doesn't exist or has moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto rounded-xl gap-2 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </Button>
          <Button
            onClick={() => navigate(homePath)}
            className="w-full sm:w-auto rounded-xl gap-2 text-sm"
          >
            <Home className="w-4 h-4" /> Return Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
