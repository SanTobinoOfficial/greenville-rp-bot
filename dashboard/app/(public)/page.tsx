import Link from 'next/link';
import { Users, Radio, Gamepad2, ExternalLink, Shield } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#2B2D31] text-white flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#5865F2] flex items-center justify-center font-bold text-sm">
              G
            </div>
            <span className="font-semibold text-lg">Greenville RP</span>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-white/70 hover:text-white transition-colors"
          >
            Panel Staffu
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-[#5865F2]/15 border border-[#5865F2]/30 rounded-full px-4 py-1.5 text-sm text-[#5865F2] font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-[#57F287] animate-pulse" />
          Serwer aktywny
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
          Greenville{' '}
          <span className="text-[#5865F2]">RP</span>
        </h1>

        <p className="text-white/60 text-lg md:text-xl max-w-xl mb-12">
          Polski serwer Roleplay na Roblox | 1800+ członków
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://discord.gg/greenvillerp"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#5865F2] hover:bg-[#4752c4] text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Dołącz do serwera
          </a>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white font-semibold px-8 py-3 rounded-lg transition-colors border border-white/10"
          >
            <Shield className="w-4 h-4" />
            Panel Staffu
          </Link>
        </div>
      </main>

      {/* Stats */}
      <section className="py-16 px-6 border-t border-white/10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center text-white/50 text-sm uppercase tracking-widest mb-10">
            Statystyki serwera
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-[#1e2024] border border-white/10 rounded-xl p-6 text-center">
              <Users className="w-8 h-8 text-[#5865F2] mx-auto mb-3" />
              <div className="text-4xl font-bold mb-1">1800+</div>
              <div className="text-white/50 text-sm">Członkowie</div>
            </div>
            <div className="bg-[#1e2024] border border-white/10 rounded-xl p-6 text-center">
              <Gamepad2 className="w-8 h-8 text-[#5865F2] mx-auto mb-3" />
              <div className="text-4xl font-bold mb-1">—</div>
              <div className="text-white/50 text-sm">Sesje RP</div>
            </div>
            <div className="bg-[#1e2024] border border-white/10 rounded-xl p-6 text-center">
              <Radio className="w-8 h-8 text-[#5865F2] mx-auto mb-3" />
              <div className="text-4xl font-bold mb-1">—</div>
              <div className="text-white/50 text-sm">Aktywne Roleplay</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-6 text-center text-white/30 text-sm">
        © {new Date().getFullYear()} Greenville RP. Wszelkie prawa zastrzeżone.
      </footer>
    </div>
  );
}
