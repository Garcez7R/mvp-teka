import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

const Home = lazy(() => import("./pages/Home"));
const Book = lazy(() => import("./pages/Book"));
const About = lazy(() => import("./pages/About"));
const Sebos = lazy(() => import("./pages/Sebos"));
const SeboStorefront = lazy(() => import("./pages/SeboStorefront"));
const AddBook = lazy(() => import("./pages/AddBook"));
const BatchScan = lazy(() => import("./pages/BatchScan"));
const CreateSebo = lazy(() => import("./pages/CreateSebo"));
const ManageBooks = lazy(() => import("./pages/ManageBooks"));
const Login = lazy(() => import("./pages/Login"));
const Admin = lazy(() => import("./pages/Admin"));
const MyInterests = lazy(() => import("./pages/MyInterests"));
const Settings = lazy(() => import("./pages/Settings"));
const SellerRequired = lazy(() => import("./pages/SellerRequired"));
const NotFound = lazy(() => import("./pages/NotFound"));

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/book/:id" component={Book} />
      <Route path="/add-book" component={AddBook} />
      <Route path="/batch-scan" component={BatchScan} />
      <Route path="/manage-books" component={ManageBooks} />
      <Route path="/sebo/novo" component={CreateSebo} />
      <Route path="/sebo/:id" component={SeboStorefront} />
      <Route path="/s/:slug" component={SeboStorefront} />
      <Route path="/login" component={Login} />
      <Route path="/seller-required" component={SellerRequired} />
      <Route path="/my-interests" component={MyInterests} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin" component={Admin} />
      <Route path="/about" component={About} />
      <Route path="/sebos" component={Sebos} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        switchable
      >
        <TooltipProvider>
          <Toaster />
          <Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="w-8 h-8 border-4 border-[#da4653] border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <Router />
          </Suspense>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
