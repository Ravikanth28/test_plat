import { Link } from "react-router-dom";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="container">
        <div className="cols">
          <div>
            <div className="flogo">
              Local<span>Mart</span>
            </div>
            <p className="small" style={{ marginTop: 10, maxWidth: 260, lineHeight: 1.6 }}>
              Your neighbourhood, delivered. Order groceries, medicines, food
              and more from local shops around you.
            </p>
          </div>
          <div>
            <h4>Company</h4>
            <Link to="/">Home</Link>
            <Link to="/orders">My Orders</Link>
            <Link to="/register">Become a Seller</Link>
          </div>
          <div>
            <h4>Support</h4>
            <a href="#">Help Center</a>
            <a href="#">Track Order</a>
            <a href="#">Contact Us</a>
          </div>
          <div>
            <h4>Legal</h4>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
            <a href="#">Refund Policy</a>
          </div>
        </div>
        <div className="fbar">
          <span>© {year} LocalMart. All rights reserved.</span>
          <span>Made with ❤ for local shops</span>
        </div>
      </div>
    </footer>
  );
}
