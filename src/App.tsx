import { Suspense, lazy, Component, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, Protected } from '@/lib/auth';
import { LocaleProvider } from '@/lib/i18n';
import { Layout } from '@/components/layout';
import { State, ScrollTop } from '@/components/shared';
import Home from '@/pages/home';
const Marketplace = lazy(() => import('@/pages/marketplace'));
const Suppliers = lazy(() => import('@/pages/marketplace').then((m) => ({ default: m.Suppliers })));
const Product = lazy(() => import('@/pages/product'));
const Auth = lazy(() => import('@/pages/auth'));
const Info = lazy(() => import('@/pages/info'));
const Dashboard = lazy(() => import('@/pages/dashboard'));
const Overview = lazy(() => import('@/pages/dashboard').then((m) => ({ default: m.Overview })));
const Settings = lazy(() =>
  import('@/pages/dashboard').then((m) => ({ default: m.AccountSettings })),
);
const Business = lazy(() => import('@/pages/supplier').then((m) => ({ default: m.BusinessPage })));
const SupplierProducts = lazy(() =>
  import('@/pages/supplier').then((m) => ({ default: m.SupplierProducts })),
);
const ProductEditor = lazy(() =>
  import('@/pages/supplier').then((m) => ({ default: m.ProductEditor })),
);
const Verification = lazy(() =>
  import('@/pages/supplier').then((m) => ({ default: m.VerificationPage })),
);
const Favorites = lazy(() => import('@/pages/buyer').then((m) => ({ default: m.Favorites })));
const SavedSuppliers = lazy(() =>
  import('@/pages/buyer').then((m) => ({ default: m.SavedSuppliers })),
);
const Quotations = lazy(() => import('@/pages/buyer').then((m) => ({ default: m.Quotations })));
const Messages = lazy(() => import('@/pages/messages'));
const Users = lazy(() => import('@/pages/admin').then((m) => ({ default: m.AdminUsers })));
const Moderation = lazy(() => import('@/pages/admin').then((m) => ({ default: m.Moderation })));
const Verifications = lazy(() =>
  import('@/pages/admin').then((m) => ({ default: m.AdminVerifications })),
);
const Categories = lazy(() =>
  import('@/pages/admin').then((m) => ({ default: m.AdminCategories })),
);
const Reports = lazy(() => import('@/pages/admin').then((m) => ({ default: m.AdminReports })));
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error('Application boundary:', error.message);
  }
  render() {
    return this.state.failed ? (
      <State
        title="Something went wrong"
        description="Reload the page and try again."
        action={<button onClick={() => window.location.reload()}>Reload page</button>}
      />
    ) : (
      this.props.children
    );
  }
}
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, retry: 1, refetchOnWindowFocus: false } },
});
const guard = (roles: ('buyer' | 'supplier' | 'admin')[], node: ReactNode) => (
  <Protected roles={roles}>{node}</Protected>
);
export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LocaleProvider>
          <BrowserRouter>
            <AuthProvider>
              <ScrollTop />
              <Layout>
                <Suspense fallback={<State title="Loading…" />}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/products" element={<Marketplace />} />
                    <Route path="/products/:id" element={<Product />} />
                    <Route path="/suppliers" element={<Suppliers />} />
                    <Route path="/suppliers/:id" element={<Suppliers />} />
                    <Route path="/auth/:mode" element={<Auth />} />
                    <Route path="/info/:slug" element={<Info />} />
                    <Route
                      path="/dashboard"
                      element={
                        <Protected>
                          <Dashboard />
                        </Protected>
                      }
                    >
                      <Route index element={<Overview />} />
                      <Route path="settings" element={<Settings />} />
                      <Route path="business" element={guard(['buyer', 'supplier'], <Business />)} />
                      <Route path="products" element={guard(['supplier'], <SupplierProducts />)} />
                      <Route path="products/new" element={guard(['supplier'], <ProductEditor />)} />
                      <Route path="products/:id" element={guard(['supplier'], <ProductEditor />)} />
                      <Route path="verification" element={guard(['supplier'], <Verification />)} />
                      <Route path="favorites" element={guard(['buyer'], <Favorites />)} />
                      <Route path="suppliers" element={guard(['buyer'], <SavedSuppliers />)} />
                      <Route
                        path="quotations"
                        element={guard(['buyer', 'supplier'], <Quotations />)}
                      />
                      <Route path="messages" element={guard(['buyer', 'supplier'], <Messages />)} />
                      <Route path="users" element={guard(['admin'], <Users />)} />
                      <Route path="moderation" element={guard(['admin'], <Moderation />)} />
                      <Route path="verifications" element={guard(['admin'], <Verifications />)} />
                      <Route path="categories" element={guard(['admin'], <Categories />)} />
                      <Route path="reports" element={guard(['admin'], <Reports />)} />
                    </Route>
                    <Route
                      path="*"
                      element={
                        <State title="Page not found" action={<Link to="/">Back home</Link>} />
                      }
                    />
                  </Routes>
                </Suspense>
              </Layout>
            </AuthProvider>
          </BrowserRouter>
        </LocaleProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
