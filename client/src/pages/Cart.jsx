import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { rupee } from "../utils.js";

const DELIVERY_FEE = 20;

export default function Cart() {
  const { items, shopName, addItem, decItem, removeItem, itemsTotal, clearCart } =
    useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="container">
        <div className="card empty" style={{ marginTop: 40 }}>
          <div className="big">🛒</div>
          <h2 style={{ margin: "0 0 6px" }}>Your cart is empty</h2>
          <p className="muted">Browse shops and add items to get started.</p>
          <Link to="/" className="btn mt">
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
    <div className="container">
      <div className="page-head">
        <div>
          <h1>Your Cart</h1>
          <p className="sub">
            From <strong>{shopName}</strong>
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={clearCart}>
          Clear Cart
        </button>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 340px", alignItems: "start" }}>
        <div className="card">
          {items.map((i) => (
            <div className="product-item" key={i.product}>
              <div className="prod-main">
                <div>
                  <div style={{ fontWeight: 700 }}>{i.name}</div>
                  <div className="muted small">
                    {rupee(i.price)} / {i.unit || "item"}
                  </div>
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

        <div className="card summary">
          <h3 style={{ margin: "0 0 12px" }}>Bill Details</h3>
          <div className="line">
            <span>
              Items Total ({items.reduce((n, i) => n + i.qty, 0)})
            </span>
            <span>{rupee(itemsTotal)}</span>
          </div>
          <div className="line">
            <span>Delivery Fee</span>
            <span>{rupee(DELIVERY_FEE)}</span>
          </div>
          <div className="line total">
            <span>To Pay</span>
            <span className="price">{rupee(itemsTotal + DELIVERY_FEE)}</span>
          </div>
          <button className="btn btn-block mt" onClick={goCheckout}>
            Proceed to Checkout →
          </button>
          <Link
            to="/"
            className="btn btn-ghost btn-block mt"
            style={{ marginTop: 8, textAlign: "center" }}
          >
            Add more items
          </Link>
        </div>
      </div>
    </div>
  );
}
