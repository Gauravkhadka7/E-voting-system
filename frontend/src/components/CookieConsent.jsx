import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("cookie_consent");
    if (!accepted) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem("cookie_consent", "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem("cookie_consent", "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-slide-up">
      <div className="bg-slate-800 border border-slate-600 rounded-2xl p-5 shadow-2xl">
        <div className="flex items-start gap-3 mb-4">
          <div className="text-2xl">🍪</div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Cookie Notice</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              We use essential cookies for authentication and session management. No tracking or advertising cookies.{" "}
              <Link to="/privacy" className="text-indigo-400 hover:underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={accept}
            className="flex-1 btn-primary text-sm py-2"
          >
            Accept
          </button>
          <button
            onClick={decline}
            className="flex-1 btn-secondary text-sm py-2"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}