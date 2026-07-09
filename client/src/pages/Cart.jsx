import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { rupee } from "../utils.js";

const DELIVERY_FEE = 20;

export default function Cart() {
  const { items, shopId, shopName, addItem, decItem, removeItem, itemsTotal, clearCart } =
    useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="container mt center">
        <div className="card">
          <h2>Your cart is empty</h2>
          <p className="muted">Browse shops and add items to get started.</p>
          <Link to="/" className="btn">
            Explore Shops
          </Link>
        </div>
      </div>
    );
  }

  const goCheckout = () => {
    if (!user) {
      navigate("/login", { state: { from: { pathname: "/checkout" } } });
    } else {
      navigate("/checkout");
    }
  };

  return (
    <div className="container mt">
      <div className="row between">
        <h1 style={{ margin: 0 }}>Your Cart</h1>
        <button className="btn btn-ghost btn-sm" onClick={clearCart}>
          Clear Cart
        </button>
      </div>
      <p className="muted">From: {shopName}</p>

      <div className="card">
        {items.map((i) => (
          <div className="product-item" key={i.product}>
            <div>
              <div style={{ fontWeight: 600 }}>{i.name}</div>
              <div className="muted small">
                {rupee(i.price)} × {i.qty}
              </div>
            </div>
            <div className="row gap">
              <div className="qty">
                <button onClick={() => decItem(i.product)}>−</button>
                <span>{i.qty}</span>
                <button
                  onClick={() =>
                    addItem(
                      { _id: i.product, name: i.name, price: i.price, unit: i.unit },
                      { _id: localStorage.getItem("lm_cart_shop"), name: shopName }
                    )
                  }
                >
                  +
                </button>
              </div>
              <div className="price" style={{ minWidth: 70, textAlign: "right" }}>
                {rupee(i.price * i.qty)}
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => removeItem(i.product)}
                title="Remove"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card mt">
        <div className="row between">
          <span className="muted">Items Total</span>
          <span>{rupee(itemsTotal)}</span>
        </div>
        <div className="row between mt" style={{ marginTop: 8 }}>
          <span className="muted">Delivery Fee</span>
          <span>{rupee(DELIVERY_FEE)}</span>
        </div>
        <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "12px 0" }} />
        <div className="row between">
          <strong>To Pay</strong>
          <strong className="price">{rupee(itemsTotal + DELIVERY_FEE)}</strong>
        </div>
        <button className="btn btn-block mt" onClick={goCheckout}>
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
}
