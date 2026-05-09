"use client";

import { useState, useRef, useEffect } from "react";
import { Activity, ShieldAlert, ShieldCheck, Terminal, Server, Shield, BrainCircuit, LayoutDashboard, Clock, Fingerprint, Lock, Globe, Wifi } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type AgentEvent = {
  agent: string;
  action: string;
  details: string;
  status: "running" | "completed";
};

type Incident = {
  id: string;
  time: string;
  type: string;
  target: string;
  status: string;
  severity: "High" | "Critical" | "Medium";
};

type Vuln = {
  package: string;
  version: string;
  cve: string;
  status: "Patched" | "Vulnerable" | "Scanning";
  pr?: string;
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "activity" | "timeline" | "vulns">("overview");
  
  // Simulation State
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  
  const [bruteForceIp, setBruteForceIp] = useState("");
  const [vulnPkgName, setVulnPkgName] = useState("");
  const [vulnPkgVer, setVulnPkgVer] = useState("");
  const [phishingText, setPhishingText] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  
  // Global SOC State
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [vulns, setVulns] = useState<Vuln[]>([]);

  useEffect(() => {
    const savedInc = localStorage.getItem("sentinel_inc");
    if (savedInc) setIncidents(JSON.parse(savedInc));
    const savedVul = localStorage.getItem("sentinel_vul");
    if (savedVul) setVulns(JSON.parse(savedVul));
  }, []);

  const addIncident = (inc: Incident) => {
    setIncidents(prev => {
      const updated = [inc, ...prev];
      localStorage.setItem("sentinel_inc", JSON.stringify(updated));
      return updated;
    });
  };

  const addVuln = (v: Vuln) => {
    setVulns(prev => {
      const updated = [v, ...prev];
      localStorage.setItem("sentinel_vul", JSON.stringify(updated));
      return updated;
    });
  };

  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === "activity") {
      feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [events, activeTab]);

  const triggerScenario = async (scenario: string, payload: any = {}) => {
    if (isSimulating) return;
    setEvents([]);
    setActiveScenario(scenario);
    setIsSimulating(true);
    setActiveTab("activity"); // Auto switch to activity tab to watch it run

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/scenario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario_type: scenario, payload }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let cveFound = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "");
            try {
              const eventData: AgentEvent = JSON.parse(dataStr);
              setEvents((prev) => [...prev, eventData]);
              
              if (eventData.details.includes("Match: CVE")) {
                  const match = eventData.details.match(/Match: (CVE-\d+-\d+)/);
                  if (match) cveFound = match[1];
              }

              if (eventData.status === "completed") {
                setIsSimulating(false);
                // Push to global state based on scenario
                const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                if (scenario === "brute_force") {
                  addIncident({ id: `INC-${Math.floor(Math.random() * 10000)}`, time: now, type: "Brute Force", target: payload.ip_address || "Unknown", status: "Blocked", severity: "High" });
                } else if (scenario === "phishing") {
                  addIncident({ id: `INC-${Math.floor(Math.random() * 10000)}`, time: now, type: "Phishing Attempt", target: "Employee Email", status: "Quarantined", severity: "Medium" });
                } else if (scenario === "vuln_package") {
                  addVuln({ package: payload.package_name, version: payload.package_version, cve: cveFound || "CVE-UNKNOWN", status: "Patched", pr: `#${Math.floor(Math.random() * 1000)}` });
                } else if (scenario === "web_scan") {
                  addIncident({ id: `INC-${Math.floor(Math.random() * 10000)}`, time: now, type: "Web Vulnerability", target: payload.target_url || "Unknown", status: "Reported", severity: "High" });
                } else if (scenario === "local_scan") {
                  addIncident({ id: `INC-${Math.floor(Math.random() * 10000)}`, time: now, type: "IoT / Wi-Fi Scan", target: "Local Device", status: "Audited", severity: "Medium" });
                }
              }
            } catch (e) {
              console.error("Error parsing SSE data", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch scenario stream", error);
      setIsSimulating(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#050508] text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#0a0a0f]/90 backdrop-blur-xl border-r border-white/5 flex flex-col z-20">
        <div className="p-6 border-b border-white/5 flex items-center gap-3 shrink-0">
          <div className="relative">
            <BrainCircuit className="text-blue-500 w-8 h-8 relative z-10" />
            <div className="absolute inset-0 bg-blue-500 blur-lg opacity-50"></div>
          </div>
          <h1 className="text-xl font-bold tracking-wider text-white">Sentinel<span className="text-blue-500">OS</span></h1>
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto overflow-x-hidden">
          <nav className="space-y-1 mb-8">
            <button onClick={() => setActiveTab("overview")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${activeTab === "overview" ? "bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)]" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}>
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-medium tracking-wide">Threat Overview</span>
            </button>
            <button onClick={() => setActiveTab("activity")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${activeTab === "activity" ? "bg-blue-500/10 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.1)]" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}>
              <Activity className="w-5 h-5" />
              <span className="font-medium tracking-wide">Agent Activity</span>
            </button>
            <button onClick={() => setActiveTab("timeline")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${activeTab === "timeline" ? "bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)]" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}>
              <Clock className="w-5 h-5" />
              <span className="font-medium tracking-wide">Incident Timeline</span>
            </button>
            <button onClick={() => setActiveTab("vulns")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${activeTab === "vulns" ? "bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)]" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"}`}>
              <Fingerprint className="w-5 h-5" />
              <span className="font-medium tracking-wide">Vulnerabilities</span>
            </button>
          </nav>

          <h2 className="text-xs uppercase text-slate-600 font-bold mb-4 tracking-widest pl-4">Simulations</h2>
          <div className="space-y-3 px-2">
              {/* Brute Force */}
              <div className={`p-3 rounded-xl border ${activeScenario === "brute_force" ? "bg-blue-500/10 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]" : "bg-[#0f0f15] border-white/5"} transition-all duration-300`}>
                <div className="flex items-center gap-2 mb-3 text-slate-300 font-medium text-sm">
                  <Server className="w-4 h-4 text-blue-400" />
                  <span>Brute Force</span>
                  {activeScenario === "brute_force" && isSimulating && <Activity className="w-4 h-4 ml-auto text-blue-400 animate-pulse" />}
                </div>
                <input type="text" value={bruteForceIp} onChange={(e) => setBruteForceIp(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 mb-2 focus:outline-none focus:border-blue-500 transition-colors placeholder-slate-600" placeholder="e.g. 104.28.14.16" disabled={isSimulating} />
                <button onClick={() => triggerScenario("brute_force", { ip_address: bruteForceIp })} disabled={isSimulating} className="w-full bg-blue-500/20 hover:bg-blue-500/40 border border-blue-500/30 text-blue-400 text-xs font-bold py-2 rounded-lg disabled:opacity-50 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">Simulate Attack</button>
              </div>
              
              {/* Vuln Pkg */}
              <div className={`p-3 rounded-xl border ${activeScenario === "vuln_package" ? "bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]" : "bg-[#0f0f15] border-white/5"} transition-all duration-300`}>
                <div className="flex items-center gap-2 mb-3 text-slate-300 font-medium text-sm">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Vulnerable Pkg</span>
                  {activeScenario === "vuln_package" && isSimulating && <Activity className="w-4 h-4 ml-auto text-amber-400 animate-pulse" />}
                </div>
                <div className="flex gap-2 mb-2">
                  <input type="text" value={vulnPkgName} onChange={(e) => setVulnPkgName(e.target.value)} className="w-3/5 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500 transition-colors placeholder-slate-600" placeholder="log4j" disabled={isSimulating} />
                  <input type="text" value={vulnPkgVer} onChange={(e) => setVulnPkgVer(e.target.value)} className="w-2/5 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500 transition-colors placeholder-slate-600" placeholder="2.14.1" disabled={isSimulating} />
                </div>
                <button onClick={() => triggerScenario("vuln_package", { package_name: vulnPkgName, package_version: vulnPkgVer })} disabled={isSimulating} className="w-full bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/30 text-amber-400 text-xs font-bold py-2 rounded-lg disabled:opacity-50 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">Simulate Exploit</button>
              </div>

              {/* Phishing */}
              <div className={`p-3 rounded-xl border ${activeScenario === "phishing" ? "bg-purple-500/10 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.1)]" : "bg-[#0f0f15] border-white/5"} transition-all duration-300`}>
                <div className="flex items-center gap-2 mb-3 text-slate-300 font-medium text-sm">
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span>Phishing Email</span>
                  {activeScenario === "phishing" && isSimulating && <Activity className="w-4 h-4 ml-auto text-purple-400 animate-pulse" />}
                </div>
                <textarea value={phishingText} onChange={(e) => setPhishingText(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 mb-2 h-16 resize-none focus:outline-none focus:border-purple-500 transition-colors placeholder-slate-600" placeholder="Email text..." disabled={isSimulating} />
                <button onClick={() => triggerScenario("phishing", { email_text: phishingText })} disabled={isSimulating} className="w-full bg-purple-500/20 hover:bg-purple-500/40 border border-purple-500/30 text-purple-400 text-xs font-bold py-2 rounded-lg disabled:opacity-50 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">Simulate Phishing</button>
              </div>

              {/* Web Scanner */}
              <div className={`p-3 rounded-xl border ${activeScenario === "web_scan" ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]" : "bg-[#0f0f15] border-white/5"} transition-all duration-300`}>
                <div className="flex items-center gap-2 mb-3 text-slate-300 font-medium text-sm">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span>Web Scanner</span>
                  {activeScenario === "web_scan" && isSimulating && <Activity className="w-4 h-4 ml-auto text-emerald-400 animate-pulse" />}
                </div>
                <input type="text" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 mb-2 focus:outline-none focus:border-emerald-500 transition-colors placeholder-slate-600" placeholder="https://example.com" disabled={isSimulating} />
                <button onClick={() => triggerScenario("web_scan", { target_url: targetUrl })} disabled={isSimulating} className="w-full bg-emerald-500/20 hover:bg-emerald-500/40 border border-emerald-500/30 text-emerald-400 text-xs font-bold py-2 rounded-lg disabled:opacity-50 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">Scan Target</button>
              </div>

              {/* Local Network & IoT */}
              <div className={`p-3 rounded-xl border ${activeScenario === "local_scan" ? "bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]" : "bg-[#0f0f15] border-white/5"} transition-all duration-300`}>
                <div className="flex items-center gap-2 mb-3 text-slate-300 font-medium text-sm">
                  <Wifi className="w-4 h-4 text-cyan-400" />
                  <span>Network & IoT</span>
                  {activeScenario === "local_scan" && isSimulating && <Activity className="w-4 h-4 ml-auto text-cyan-400 animate-pulse" />}
                </div>
                <button onClick={() => triggerScenario("local_scan")} disabled={isSimulating} className="w-full bg-cyan-500/20 hover:bg-cyan-500/40 border border-cyan-500/30 text-cyan-400 text-xs font-bold py-2 rounded-lg disabled:opacity-50 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">Initiate Local Scan</button>
              </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/5 bg-black/20 shrink-0">
           <div className="flex items-center gap-3">
             <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </div>
             <div>
               <p className="text-xs font-bold tracking-wider text-white uppercase">System Active</p>
               <p className="text-[10px] text-slate-500 tracking-wide">Multi-Agent Orchestration nominal</p>
             </div>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/10 via-[#050508] to-[#050508]">
        
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>

        <div className="p-8 h-full overflow-y-auto relative z-10">
          <AnimatePresence mode="wait">
            
            {/* SCREEN 1: OVERVIEW */}
            {activeTab === "overview" && (
              <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="space-y-8">
                <div>
                  <h2 className="text-3xl font-light tracking-tight text-white mb-2">SOC <span className="font-bold">Overview</span></h2>
                  <p className="text-slate-500 tracking-wide">Real-time threat intelligence and agent orchestration.</p>
                </div>
                
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-[#0a0a0f]/80 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                        <ShieldCheck className="w-6 h-6 text-blue-500" />
                      </div>
                      <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">+12 in 24h</span>
                    </div>
                    <p className="text-sm font-medium text-slate-400 mb-1">Threats Mitigated</p>
                    <p className="text-4xl font-bold text-white tracking-tight">{incidents.length}</p>
                  </div>
                  
                  <div className="bg-[#0a0a0f]/80 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                        <Activity className="w-6 h-6 text-purple-500" />
                      </div>
                      <span className="text-xs font-bold text-purple-500 bg-purple-500/10 px-2 py-1 rounded-md border border-purple-500/20">Autonomous</span>
                    </div>
                    <p className="text-sm font-medium text-slate-400 mb-1">Avg Response Time</p>
                    <p className="text-4xl font-bold text-white tracking-tight">3.8s</p>
                  </div>
                  
                  <div className="bg-[#0a0a0f]/80 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                        <BrainCircuit className="w-6 h-6 text-emerald-500" />
                      </div>
                      <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">Optimal</span>
                    </div>
                    <p className="text-sm font-medium text-slate-400 mb-1">Active Agents</p>
                    <p className="text-4xl font-bold text-white tracking-tight">7 <span className="text-lg text-slate-600 font-normal">/ 7</span></p>
                  </div>
                </div>

                <div className="bg-[#0a0a0f]/80 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-2xl">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><Lock className="w-5 h-5 text-slate-400"/> System Health Pulse</h3>
                  <div className="h-48 flex items-end gap-2">
                    {[40, 65, 45, 80, 55, 90, 60, 45, 70, 50, 85, 40, 65, 55, 75, 45, 60].map((h, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ duration: 0.5, delay: i * 0.05 }}
                        className="flex-1 bg-gradient-to-t from-blue-500/20 to-blue-400/80 rounded-t-sm"
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* SCREEN 2: ACTIVITY FEED */}
            {activeTab === "activity" && (
              <motion.div key="activity" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="h-full flex flex-col">
                <div className="mb-6">
                  <h2 className="text-3xl font-light tracking-tight text-white mb-2">Agent <span className="font-bold">Activity</span></h2>
                  <p className="text-slate-500 tracking-wide">Live execution trace of the multi-agent reasoning engine.</p>
                </div>
                
                <div className="flex-1 bg-[#0a0a0f]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 opacity-50"></div>
                  <div className="bg-white/5 px-6 py-4 border-b border-white/5 flex items-center gap-3">
                    <Terminal className="w-5 h-5 text-slate-400" />
                    <h3 className="text-sm font-bold tracking-wider text-slate-200 uppercase">Live Trace</h3>
                    {isSimulating ? (
                      <span className="ml-auto flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span>
                        Processing
                      </span>
                    ) : events.length > 0 ? (
                      <span className="ml-auto text-xs font-bold text-slate-500 uppercase tracking-wider">Execution Complete</span>
                    ) : null}
                  </div>
                  
                  <div className="flex-1 p-6 overflow-y-auto font-mono text-sm space-y-4">
                    {events.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-600">
                        <BrainCircuit className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-lg">Awaiting input.</p>
                        <p className="text-sm mt-2 opacity-50">Select a scenario from the sidebar to begin.</p>
                      </div>
                    ) : (
                      <AnimatePresence>
                        {events.map((evt, i) => (
                          <motion.div 
                            key={i} 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, type: "spring", stiffness: 100 }}
                            className="flex gap-6"
                          >
                            <div className="flex-shrink-0 w-36 text-right pt-1">
                              <span className={`px-3 py-1 rounded-md text-xs font-bold tracking-wider uppercase border ${
                                evt.agent === 'Commander' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' :
                                evt.agent === 'Watcher' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                                evt.agent === 'Threat Intel' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                                evt.agent === 'Investigator' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' :
                                evt.agent === 'Response' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                                evt.agent === 'Patch' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
                                'bg-slate-800 text-slate-300 border-slate-700'
                              }`}>
                                {evt.agent}
                              </span>
                            </div>
                            <div className="flex-1 bg-white/5 rounded-xl p-4 border border-white/5 shadow-lg relative group">
                              <div className="absolute left-0 top-1/2 -translate-x-[1px] -translate-y-1/2 w-[2px] h-0 bg-white/20 transition-all duration-300 group-hover:h-full"></div>
                              <p className="text-slate-200 font-bold mb-2 tracking-wide text-base flex items-center gap-2">
                                {evt.action}
                                {i === events.length - 1 && evt.status === "running" && <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-ping"></span>}
                              </p>
                              <p className="text-slate-400 leading-relaxed">{evt.details}</p>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    )}
                    <div ref={feedEndRef} className="h-4" />
                  </div>
                </div>
              </motion.div>
            )}

            {/* SCREEN 3: TIMELINE */}
            {activeTab === "timeline" && (
              <motion.div key="timeline" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
                <div>
                  <h2 className="text-3xl font-light tracking-tight text-white mb-2">Incident <span className="font-bold">Timeline</span></h2>
                  <p className="text-slate-500 tracking-wide">Historical log of all threats mitigated by SentinelOS.</p>
                </div>
                
                <div className="bg-[#0a0a0f]/80 backdrop-blur-md border border-white/5 rounded-2xl shadow-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 border-b border-white/10 text-slate-400 text-xs uppercase tracking-widest font-bold">
                        <th className="p-5">Incident ID</th>
                        <th className="p-5">Time</th>
                        <th className="p-5">Threat Type</th>
                        <th className="p-5">Target / IP</th>
                        <th className="p-5">Severity</th>
                        <th className="p-5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {incidents.map((inc, i) => (
                        <motion.tr key={inc.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-5 font-mono text-sm text-slate-300">{inc.id}</td>
                          <td className="p-5 text-sm text-slate-400">{inc.time}</td>
                          <td className="p-5 font-medium text-white">{inc.type}</td>
                          <td className="p-5 text-sm text-slate-400 font-mono">{inc.target}</td>
                          <td className="p-5">
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${inc.severity === 'Critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : inc.severity === 'High' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                              {inc.severity}
                            </span>
                          </td>
                          <td className="p-5">
                            <span className="flex items-center gap-2 text-sm font-bold text-emerald-400">
                              <ShieldCheck className="w-4 h-4" /> {inc.status}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* SCREEN 4: VULNERABILITIES */}
            {activeTab === "vulns" && (
              <motion.div key="vulns" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
                <div>
                  <h2 className="text-3xl font-light tracking-tight text-white mb-2">Vulnerability <span className="font-bold">Center</span></h2>
                  <p className="text-slate-500 tracking-wide">Supply chain monitoring and autonomous patching.</p>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  {vulns.map((v, i) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }} className="bg-[#0a0a0f]/80 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                          <Fingerprint className="w-8 h-8 text-slate-400" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-white mb-1 tracking-wide">{v.package} <span className="text-slate-500 font-normal">v{v.version}</span></h4>
                          <p className="text-sm font-mono text-rose-400">{v.cve}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Status</p>
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${v.status === 'Patched' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                            {v.status}
                          </span>
                        </div>
                        {v.pr && (
                          <div className="text-right">
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Auto-PR</p>
                            <span className="text-blue-400 font-mono font-bold">{v.pr}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
