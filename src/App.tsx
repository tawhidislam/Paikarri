import '@/pages/growth.css';
import { MarketplaceChatProvider } from '@/components/marketplace-chat';
import { Suspense, lazy, Component, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, Protected } from '@/lib/auth';
import { LocaleProvider } from '@/lib/i18n';
import { Layout } from '@/components/layout';
import { State, ScrollTop } from '@/components/shared';
import Home from '@/pages/home';
const Compare = lazy(() => import('@/pages/compare'));
const SourcingList = lazy(() =>
  import('@/pages/sourcing').then((m) => ({ default: m.SourcingList })),
);
const SourcingDetail = lazy(() =>
  import('@/pages/sourcing').then((m) => ({ default: m.SourcingDetail })),
);
const ReviewModeration = lazy(() => import('@/pages/admin/reviews'));
const SupplierReviews = lazy(() =>
  import('@/pages/admin/reviews').then((m) => ({ default: m.SupplierReviewReplies })),
);
const Tenders = lazy(() => import('@/pages/tenders'));
const TenderDetail = lazy(() => import('@/pages/tenders').then((m) => ({ default: m.TenderPage })));
const FinancialReports = lazy(() => import('@/pages/admin/financial-reports'));
const Integrations = lazy(() => import('@/pages/admin/integrations'));
const SupplierTools = lazy(() => import('@/pages/supplier-tools'));
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
const Verification = lazy(() => import('@/pages/verification'));
const Favorites = lazy(() => import('@/pages/buyer').then((m) => ({ default: m.Favorites })));
const SavedSuppliers = lazy(() =>
  import('@/pages/buyer').then((m) => ({ default: m.SavedSuppliers })),
);
const Quotations = lazy(() => import('@/pages/buyer').then((m) => ({ default: m.Quotations })));
const Messages = lazy(() => import('@/pages/messages'));
const AdminConsole = lazy(() => import('@/pages/admin/console'));
const AdminOverview = lazy(() =>
  import('@/pages/admin/console').then((m) => ({ default: m.AdminOverview })),
);
const ConversationMonitoring = lazy(() =>
  import('@/pages/admin/conversations').then((m) => ({ default: m.ConversationMonitoring })),
);
const ConversationMonitoringDetail = lazy(() =>
  import('@/pages/admin/conversations').then((m) => ({ default: m.ConversationMonitoringDetail })),
);
const AdminAccounts = lazy(() =>
  import('@/pages/admin/console').then((m) => ({ default: m.AdminAccounts })),
);
const AdminSupplierDetail = lazy(() =>
  import('@/pages/admin/console').then((m) => ({ default: m.AdminSupplierDetail })),
);
const AdminSettings = lazy(() =>
  import('@/pages/admin/console').then((m) => ({ default: m.AdminSettings })),
);
const AdminAudit = lazy(() =>
  import('@/pages/admin/console').then((m) => ({ default: m.AdminAudit })),
);
const Moderation = lazy(() =>
  import('@/pages/admin/management').then((m) => ({ default: m.ConsoleProducts })),
);
const Verifications = lazy(() =>
  import('@/pages/admin/verification').then((m) => ({ default: m.VerificationQueue })),
);
const VerificationApplication = lazy(() =>
  import('@/pages/admin/verification').then((m) => ({ default: m.VerificationApplication })),
);
const Categories = lazy(() =>
  import('@/pages/admin/management').then((m) => ({ default: m.ConsoleCategories })),
);
const Reports = lazy(() =>
  import('@/pages/admin/management').then((m) => ({ default: m.ConsoleReports })),
);
const TermsEditor = lazy(() => import('@/pages/admin/terms'));
const HomepageEditor = lazy(() =>
  import('@/pages/admin/operations').then((m) => ({ default: m.HomepageEditor })),
);
const SupplierOnboarding = lazy(() =>
  import('@/pages/admin/operations').then((m) => ({ default: m.SupplierOnboarding })),
);
const NotificationDelivery = lazy(() =>
  import('@/pages/admin/operations').then((m) => ({ default: m.NotificationDelivery })),
);
const Notifications = lazy(() => import('@/pages/notifications'));
const SupplierManagement = lazy(() =>
  import('@/pages/admin/supplier-management').then((m) => ({ default: m.SupplierManagement })),
);
const SupplierWorkspace = lazy(() =>
  import('@/pages/admin/supplier-management').then((m) => ({ default: m.SupplierWorkspace })),
);
const SupplierRenewals = lazy(() =>
  import('@/pages/admin/supplier-management').then((m) => ({ default: m.SupplierRenewals })),
);
const Cart = lazy(() => import('@/pages/orders').then((m) => ({ default: m.CartPage })));
const Checkout = lazy(() => import('@/pages/orders').then((m) => ({ default: m.CheckoutPage })));
const Orders = lazy(() => import('@/pages/orders').then((m) => ({ default: m.OrdersPage })));
const OrderDetail = lazy(() =>
  import('@/pages/orders').then((m) => ({ default: m.OrderDetailPage })),
);
const SupplierActions = lazy(() => import('@/pages/supplier-actions'));

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
const guard = (roles: ('buyer' | 'supplier' | 'admin' | 'super_admin')[], node: ReactNode) => (
  <Protected roles={roles}>{node}</Protected>
);
export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LocaleProvider>
          <BrowserRouter>
            <AuthProvider>
              <MarketplaceChatProvider>
                <ScrollTop />
                <Layout>
                  <Suspense fallback={<State title="Loading…" />}>
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/tenders" element={<Tenders />} />
                      <Route path="/tenders/:id" element={<TenderDetail />} />
                      <Route path="/compare" element={<Compare />} />
                      <Route path="/products" element={<Marketplace />} />
                      <Route path="/products/:id" element={<Product />} />
                      <Route path="/suppliers" element={<Suppliers />} />
                      <Route path="/suppliers/:id" element={<Suppliers />} />
                      <Route path="/cart" element={guard(['buyer'], <Cart />)} />
                      <Route path="/checkout" element={guard(['buyer'], <Checkout />)} />
                      <Route path="/auth/:mode" element={<Auth />} />
                      <Route path="/admin/login" element={<Auth />} />
                      <Route
                        path="/admin"
                        element={guard(['admin', 'super_admin'], <AdminConsole />)}
                      >
                        <Route index element={<AdminOverview />} />
                        <Route path="suppliers" element={<AdminAccounts kind="suppliers" />} />
                        <Route path="suppliers/:id" element={<AdminSupplierDetail />} />
                        <Route path="accounts" element={<AdminAccounts />} />
                        <Route
                          path="supplier-management"
                          element={guard(['super_admin'], <SupplierManagement />)}
                        />
                        <Route
                          path="supplier-management/:id"
                          element={guard(['super_admin'], <SupplierWorkspace />)}
                        />
                        <Route
                          path="supplier-renewals"
                          element={guard(['super_admin'], <SupplierRenewals />)}
                        />
                        <Route
                          path="conversations"
                          element={guard(['super_admin'], <ConversationMonitoring />)}
                        />
                        <Route
                          path="conversations/:id"
                          element={guard(['super_admin'], <ConversationMonitoringDetail />)}
                        />
                        <Route path="orders" element={guard(['super_admin'], <Orders admin />)} />
                        <Route
                          path="orders/:id"
                          element={guard(['super_admin'], <OrderDetail admin />)}
                        />
                        <Route path="requests" element={guard(['super_admin'], <SourcingList />)} />
                        <Route
                          path="requests/:id"
                          element={guard(['super_admin'], <SourcingDetail />)}
                        />
                        <Route path="reviews" element={<ReviewModeration />} />
                        <Route path="products" element={<Moderation />} />
                        <Route path="verifications" element={<Verifications />} />
                        <Route
                          path="verifications/:id"
                          element={guard(['super_admin'], <VerificationApplication />)}
                        />
                        <Route path="tenders" element={<Tenders admin />} />
                        <Route path="tenders/:id" element={<TenderDetail admin />} />
                        <Route
                          path="financial-reports"
                          element={guard(['super_admin'], <FinancialReports />)}
                        />
                        <Route
                          path="integrations"
                          element={guard(['super_admin'], <Integrations />)}
                        />
                        <Route path="categories" element={<Categories />} />
                        <Route path="reports" element={<Reports />} />
                        <Route path="audit" element={<AdminAudit />} />
                        <Route path="terms" element={guard(['super_admin'], <TermsEditor />)} />
                        <Route
                          path="refund-policy"
                          element={guard(['super_admin'], <TermsEditor kind="refund" />)}
                        />
                        <Route
                          path="homepage"
                          element={guard(['super_admin'], <HomepageEditor />)}
                        />
                        <Route path="onboarding" element={<SupplierOnboarding />} />
                        <Route path="notifications" element={<NotificationDelivery />} />
                        <Route path="inbox" element={<Notifications />} />
                        <Route
                          path="staff"
                          element={guard(['super_admin'], <AdminAccounts kind="staff" />)}
                        />
                        <Route
                          path="settings"
                          element={guard(['super_admin'], <AdminSettings />)}
                        />
                      </Route>
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
                        <Route path="orders" element={guard(['buyer', 'supplier'], <Orders />)} />
                        <Route
                          path="orders/:id"
                          element={guard(['buyer', 'supplier'], <OrderDetail />)}
                        />
                        <Route path="tools" element={guard(['supplier'], <SupplierTools />)} />
                        <Route path="settings" element={<Settings />} />
                        <Route path="notifications" element={<Notifications />} />
                        <Route
                          path="business"
                          element={guard(['buyer', 'supplier'], <Business />)}
                        />
                        <Route
                          path="products"
                          element={guard(['supplier'], <SupplierProducts />)}
                        />
                        <Route
                          path="products/new"
                          element={guard(['supplier'], <ProductEditor />)}
                        />
                        <Route
                          path="products/:id"
                          element={guard(['supplier'], <ProductEditor />)}
                        />
                        <Route
                          path="verification"
                          element={guard(['supplier'], <Verification />)}
                        />
                        <Route
                          path="supplier-actions"
                          element={guard(['supplier'], <SupplierActions />)}
                        />
                        <Route
                          path="requests"
                          element={guard(['buyer', 'supplier'], <SourcingList />)}
                        />
                        <Route
                          path="requests/:id"
                          element={guard(['buyer', 'supplier'], <SourcingDetail />)}
                        />
                        <Route path="reviews" element={guard(['supplier'], <SupplierReviews />)} />
                        <Route path="favorites" element={guard(['buyer'], <Favorites />)} />
                        <Route path="suppliers" element={guard(['buyer'], <SavedSuppliers />)} />
                        <Route
                          path="quotations"
                          element={guard(['buyer', 'supplier'], <Quotations />)}
                        />
                        <Route
                          path="messages"
                          element={guard(['buyer', 'supplier'], <Messages />)}
                        />
                        <Route
                          path="users"
                          element={guard(['admin', 'super_admin'], <AdminAccounts />)}
                        />
                        <Route
                          path="moderation"
                          element={guard(['admin', 'super_admin'], <Moderation />)}
                        />
                        <Route
                          path="verifications"
                          element={guard(['admin', 'super_admin'], <Verifications />)}
                        />
                        <Route
                          path="categories"
                          element={guard(['admin', 'super_admin'], <Categories />)}
                        />
                        <Route
                          path="reports"
                          element={guard(['admin', 'super_admin'], <Reports />)}
                        />
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
              </MarketplaceChatProvider>
            </AuthProvider>
          </BrowserRouter>
        </LocaleProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
