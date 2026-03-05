import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

const Home = lazy(() => import("./pages/Home"));
const Book = lazy(() => import("./pages/Book"));
const About = lazy(() => import("./pages/About"));
const AddBook = lazy(() => import("./pages/AddBook"));
const CreateSebo = lazy(() => import("./pages/CreateSebo"));
const ManageBooks = lazy(() => import("./pages/ManageBooks"));
const Login = lazy(() => import("./pages/Login"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/book/:id" component={Book} />
      <Route path="/add-book" component={AddBook} />
      <Route path="/manage-books" component={ManageBooks} />
      <Route path="/sebo/novo" component={CreateSebo} />
      <Route path="/login" component={Login} />
      <Route path="/admin" component={Admin} />
      <Route path="/about" component={About} />
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
