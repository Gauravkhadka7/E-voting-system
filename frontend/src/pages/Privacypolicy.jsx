import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-12 page-enter">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-8 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Home
        </Link>
        <h1 className="font-display text-4xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-slate-400 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="card space-y-6 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Information We Collect</h2>
            <p>We collect information necessary to provide secure voting services, including your name, email address, role-specific identifiers (student ID, company ID, citizenship number), and location data.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. How We Use Your Information</h2>
            <p>Your information is used solely for voter eligibility verification, election participation, and system security. We do not sell or share your personal data with third parties.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Vote Privacy</h2>
            <p>Votes are encrypted with AES-256 encryption before storage. Your specific vote choices are never stored in plaintext. Only cryptographic hashes are stored on the blockchain, ensuring your vote remains secret while being verifiable.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Data Security</h2>
            <p>We use industry-standard security measures including encrypted databases, JWT authentication, and blockchain immutability to protect your data.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Cookies</h2>
            <p>We use essential cookies only for authentication session management. No tracking or advertising cookies are used.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Your Rights</h2>
            <p>You have the right to access, correct, or request deletion of your personal data. Contact your system administrator to exercise these rights.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Contact</h2>
            <p>For privacy concerns, please contact your election administrator.</p>
          </section>
        </div>
      </div>
    </div>
  );
}