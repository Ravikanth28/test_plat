import { useNavigate, useLocation } from "react-router-dom";

// A slim "Back" bar shown on every page except Home. Returns to the previous
// screen, or falls back to Home when there's no in-app history to pop (e.g. the
// page was opened directly from a deep link).
export default function BackBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (pathname === "/") return null;

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  return (
    <div className="back-bar">
      <div className="container">
        <button className="back-btn" onClick={goBack} aria-label="Go back">
          <span aria-hidden="true">←</span> Back
        </button>
      </div>
    </div>
  );
}
