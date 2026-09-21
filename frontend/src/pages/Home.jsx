import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";

function FloatingOrb({ className }) {
  return (
    <div
      className={`absolute rounded-full blur-3xl opacity-20 animate-pulse-slow ${className}`}
    />
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="card hover:border-indigo-500/40 transition-all duration-300 group">
      <div className="w-12 h-12 bg-indigo-600/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600/30 transition-colors">
        <span className="text-2xl">{icon}</span>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}

function StatCard({ value, label }) {
  return (
    <div className="text-center">
      <div className="text-4xl font-display font-bold gradient-text mb-1">{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 overflow-hidden">
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-[92vh] flex items-center justify-center px-4">
        {/* Background orbs */}
        <FloatingOrb className="w-96 h-96 bg-indigo-600 -top-20 -left-20" />
        <FloatingOrb className="w-72 h-72 bg-purple-600 top-1/3 -right-16" />
        <FloatingOrb className="w-64 h-64 bg-emerald-600 bottom-0 left-1/3" />

        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIzMzM0OCIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />

        <div className="relative z-10 text-center max-w-4xl mx-auto page-enter">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-900/40 border border-indigo-700/50 rounded-full text-sm text-indigo-300 mb-8">
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
            Blockchain-Powered Secure Voting
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-bold text-white leading-tight mb-6">
            The Future of{" "}
            <span className="gradient-text">Democracy</span>
            <br />is Digital
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            A transparent, tamper-proof voting system built on blockchain technology.
            Every vote is encrypted, verifiable, and permanently recorded.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/user/register"
              className="btn-primary text-base px-8 py-3.5 rounded-xl shadow-lg shadow-indigo-500/25"
            >
              Get Started — It's Free
            </Link>
            <Link
              to="/user/login"
              className="btn-secondary text-base px-8 py-3.5 rounded-xl"
            >
              Login to Vote
            </Link>
          </div>

          {/* Floating blockchain visual */}
          <div className="mt-16 flex justify-center">
            <div className="flex items-center gap-3 flex-wrap justify-center">
              {["🗳️ Vote Cast", "🔐 Encrypted", "⛓️ On-Chain", "✅ Verified"].map((step, i) => (
                <React.Fragment key={step}>
                  <div className="px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-sm text-slate-300">
                    {step}
                  </div>
                  {i < 3 && (
                    <svg className="w-4 h-4 text-slate-600 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-y border-slate-800">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCard value="100%" label="Tamper-Proof" />
            <StatCard value="0" label="Downtime" />
            <StatCard value="256-bit" label="Encryption" />
            <StatCard value="∞" label="Scalable" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="font-display text-4xl font-bold text-white mb-4">
            Why BlockVote?
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            Built for organizations of all sizes — from classrooms to governments.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard icon="🔐" title="End-to-End Encryption" desc="Every vote is AES-256 encrypted before being stored. No one can see who you voted for." />
          <FeatureCard icon="⛓️" title="Blockchain Immutability" desc="Vote hashes are permanently stored on-chain. Once recorded, they cannot be altered." />
          <FeatureCard icon="🌐" title="IPFS Audit Trail" desc="Encrypted votes are pinned on IPFS for a distributed, permanent audit record." />
          <FeatureCard icon="🎯" title="Smart Eligibility" desc="Dynamic voter filtering by role, location, batch, and custom attributes ensures only eligible voters participate." />
          <FeatureCard icon="📊" title="Real-Time Results" desc="Live election results with multiple counting strategies: majority, ranked choice, weighted voting." />
          <FeatureCard icon="🏛️" title="Multi-Scope Elections" desc="From school student councils to municipal elections — one platform handles it all." />
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center card border-indigo-500/30">
          <h2 className="font-display text-3xl font-bold text-white mb-4">
            Ready to run a secure election?
          </h2>
          <p className="text-slate-400 mb-8">
            Contact your administrator or create an account to get started.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/user/register" className="btn-primary px-8 py-3 rounded-xl">
              Create Account
            </Link>
            <Link to="/admin/login" className="btn-secondary px-8 py-3 rounded-xl">
              Admin Login
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-emerald-500 rounded-md" />
            <span className="text-sm font-semibold text-white">BlockVote</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-400">
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link to="/user/login" className="hover:text-white transition-colors">Login</Link>
          </div>
          <p className="text-xs text-slate-600">© {new Date().getFullYear()} BlockVote. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}