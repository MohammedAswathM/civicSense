import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-civic-blue/20 blur-[100px] pointer-events-none" />

      <div className="relative mx-auto max-w-6xl px-4 py-20 lg:px-8">
        {/* Hero Section */}
        <div className="text-center mt-12 mb-20 animate-fade-in-up">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-civic-blue text-5xl shadow-2xl mb-8 border border-white/10 shadow-civic-blue/50">
            🏙️
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white tracking-tight mb-6">
            Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">CivicSense</span>
          </h1>
          <p className="text-xl md:text-2xl text-blue-100/80 max-w-2xl mx-auto font-light leading-relaxed">
            The next-generation civic issue reporting platform. 
            Empowering citizens and officials to build a better Coimbatore.
          </p>
        </div>

        {/* Pathways */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-12">
          
          {/* Citizen Pathway */}
          <div className="group rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-md hover:bg-white/10 transition-all duration-300 shadow-2xl hover:shadow-civic-blue/20 hover:-translate-y-1">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-3xl mb-6 shadow-lg">
              👋
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">For Citizens</h2>
            <p className="text-blue-200/70 mb-8 font-medium">
              Explore reported issues around your city, report new problems anonymously, and track their resolution progress in real-time.
            </p>
            <div className="space-y-4">
              <Link href="/map" className="flex items-center justify-between w-full rounded-2xl bg-white/10 px-6 py-4 text-white hover:bg-white/20 transition-colors font-semibold border border-white/5 group-hover:border-white/20">
                <span className="flex items-center gap-3"><span className="text-xl">🗺️</span> Explore Map</span>
                <span className="text-blue-300 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              <Link href="/report" className="flex items-center justify-between w-full rounded-2xl bg-white/10 px-6 py-4 text-white hover:bg-white/20 transition-colors font-semibold border border-white/5 group-hover:border-white/20">
                <span className="flex items-center gap-3"><span className="text-xl">📸</span> Report an Issue</span>
                <span className="text-blue-300 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              <Link href="/dashboard" className="flex items-center justify-between w-full rounded-2xl bg-white/10 px-6 py-4 text-white hover:bg-white/20 transition-colors font-semibold border border-white/5 group-hover:border-white/20">
                <span className="flex items-center gap-3"><span className="text-xl">📊</span> Public Dashboard</span>
                <span className="text-blue-300 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </div>

          {/* Official Pathway */}
          <div className="group rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-md hover:bg-white/10 transition-all duration-300 shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-1">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center text-3xl mb-6 shadow-lg">
              🛡️
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">For Officials</h2>
            <p className="text-blue-200/70 mb-8 font-medium">
              Access the secure portal to manage assigned tickets, verify resolutions with AI, and oversee ward performance.
            </p>
            <div className="space-y-4">
              <Link href="/official/login" className="flex items-center justify-between w-full rounded-2xl bg-civic-blue px-6 py-4 text-white hover:bg-civic-blue-dark transition-all font-semibold shadow-lg hover:shadow-civic-blue/50 border border-blue-400/30 group-hover:border-blue-400/60">
                <span className="flex items-center gap-3"><span className="text-xl">🔐</span> Official Login</span>
                <span className="text-blue-200 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              
              <div className="mt-8 rounded-2xl border border-white/5 bg-black/20 p-5">
                <h3 className="text-sm font-semibold text-blue-300 mb-2">Secure Verification</h3>
                <p className="text-xs text-blue-200/60 leading-relaxed">
                  Officials authenticate securely via Phone OTP. Access is strictly controlled via backend Role-Based Access Control (RBAC). 
                  Supervisors and Admins have extended dashboard access.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-24 text-center text-sm text-blue-300/40 font-medium">
          <p>Powered by Next.js, Firebase, and Google AI.</p>
        </div>
      </div>
    </main>
  );
}
