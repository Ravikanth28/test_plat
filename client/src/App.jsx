import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import UpdateBanner from "./components/UpdateBanner.jsx";
import NotificationToast from "./components/NotificationToast.jsx";

import Home from "./pages/Home.jsx";
import ShopDetail from "./pages/ShopDetail.jsx";
import SearchResults from "./pages/SearchResults.jsx";
import Favorites from "./pages/Favorites.jsx";
import Cart from "./pages/Cart.jsx";
import Checkout from "./pages/Checkout.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import MyOrders from "./pages/MyOrders.jsx";
import OrderDetail from "./pages/OrderDetail.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import ShopDashboard from "./pages/ShopDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";

export default function App() {
  return (
    <div className="app-shell">
      <UpdateBanner />
      <NotificationToast />
      <Navbar />
      <main className="app-main">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/shop/:id" element={<ShopDetail />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/cart" element={<Cart />} />
        <Route
          path="/favorites"
          element={
            <ProtectedRoute roles={["customer", "admin"]}>
              <Favorites />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/checkout"
          element={
            <ProtectedRoute roles={["customer", "admin"]}>
              <Checkout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <MyOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <ProtectedRoute>
              <OrderDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shop"
          element={
            <ProtectedRoute roles={["shopkeeper", "admin"]}>
              <ShopDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<div className="container mt">Page not found.</div>} />
      </Routes>
      </main>
      <Footer />
    </div>
  );
}
