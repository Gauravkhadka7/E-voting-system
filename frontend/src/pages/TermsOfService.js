import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-12 page-enter">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-8 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Home
        </Link>
        <h1 className="font-display text-4xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-slate-400 mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="card space-y-6 text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>By using BlockVote, you agree to these terms. If you disagree, please do not use the platform.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Eligibility</h2>
            <p>You must be eligible as determined by your organization's administrator. Providing false information to gain eligibility is strictly prohibited and may result in account termination and legal action.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. One Vote Per Eligible Position</h2>
            <p>Each eligible voter may cast exactly one vote per position per election. Attempting to vote multiple times or circumvent voting controls is prohibited.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Account Security</h2>
            <p>You are responsible for maintaining the security of your account credentials and MetaMask wallet. Do not share your private keys or login credentials with anyone.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Prohibited Activities</h2>
            <p>You may not attempt to hack, manipulate, or compromise the voting system; impersonate other voters; or interfere with elections in any way.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Blockchain Immutability</h2>
            <p>Once a vote is cast and recorded on the blockchain, it cannot be reversed or modified. Ensure you make your selections carefully before submitting.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Limitation of Liability</h2>
            <p>BlockVote provides the platform as-is. We are not liable for election outcomes, technical disruptions outside our control, or user errors.</p>
          </section>
        </div>
      </div>
    </div>
  );
}