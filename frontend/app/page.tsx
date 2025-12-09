"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  MapPin,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Info,
} from "lucide-react";
import { SimpleLineChart } from "@/components/SimpleLineChart";

type DenguePoint = {
  date: string;
  year: number;
  week?: number;
  cases: number;
  region: string;
};

type ForecastData = {
  predictedCases: number;
  riskLevel: "Low" | "Moderate" | "High";
  trend: "Increasing" | "Stable" | "Decreasing";
  riskColor: string;
};


export default function DengueDashboardPage() {
  const [allData, setAllData] = useState<DenguePoint[]>([]);
  const [selectedRegion, setSelectedRegion] = useState("Region IV-A");
  const [yearRange, setYearRange] = useState<[number, number]>([2017, 2021]);
  const [showRisk, setShowRisk] = useState(false);
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch("/data/dengue_timeseries.json");
        if (!res.ok) throw new Error("Failed to load dengue data");
        const data: DenguePoint[] = await res.json();
        setAllData(data);
      } catch (err: any) {
        console.error(err);
        setError("Could not load dengue dataset for the dashboard.");
      }
    };
    loadData();
  }, []);

  const REGIONS = useMemo(
    () =>
      Array.from(new Set(allData.map((d) => d.region))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [allData]
  );

  const filteredData = useMemo(() => {
    return allData
      .filter((d) => d.region === selectedRegion)
      .filter(
        (d) => d.year >= yearRange[0] && d.year <= yearRange[1]
      )
      .sort(
        (a, b) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
      );
  }, [allData, selectedRegion, yearRange]);

  const handleAnalyzeRisk = async () => {
    if (showRisk) {
      setShowRisk(false);
      return;
    }

    if (filteredData.length < 2) {
      setError("Not enough historical data to analyze risk for this region.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const latest = filteredData[filteredData.length - 1];
      const prev = filteredData[filteredData.length - 2];

      const latestDate = new Date(latest.date);
      const year = latestDate.getFullYear();
      const month = latestDate.getMonth() + 1;

      const res = await fetch("http://localhost:8000/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region: selectedRegion,
          year,
          month,
          cases_lag1: prev.cases,
        }),
      });

      if (!res.ok) {
        throw new Error("Forecast API error");
      }

      const data = await res.json();
      const predicted = data.predicted_cases as number;
      const lastCases = latest.cases;
      const diff = predicted - lastCases;
      const diffRatio = lastCases > 0 ? diff / lastCases : 0;

      let trend: ForecastData["trend"];
      if (diffRatio > 0.15) trend = "Increasing";
      else if (diffRatio < -0.15) trend = "Decreasing";
      else trend = "Stable";

      let riskLevel: ForecastData["riskLevel"];
      let riskColor: string;

      if (predicted >= 1500) {
        riskLevel = "High";
        riskColor = "border-l-red-500";
      } else if (predicted >= 800) {
        riskLevel = "Moderate";
        riskColor = "border-l-amber-400";
      } else {
        riskLevel = "Low";
        riskColor = "border-l-emerald-400";
      }

      setForecastData({
        predictedCases: Math.round(predicted),
        riskLevel,
        riskColor,
        trend,
      });
      setShowRisk(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong while fetching forecast.");
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    if (!forecastData) return "Not enough data to generate summary.";
    return `In ${selectedRegion}, dengue cases are currently ${forecastData.trend.toLowerCase()}. 
    Based on the last month's data (${yearRange[1]}), we project roughly ${forecastData.predictedCases} cases 
    in the upcoming weeks. This places the region at ${forecastData.riskLevel} Risk.`;
  }, [forecastData, selectedRegion, yearRange]);

  const peakDate = useMemo(() => {
    if (filteredData.length === 0) return "N/A";
    const peak = filteredData.reduce((prev, current) =>
      prev.cases > current.cases ? prev : current
    );
    return peak.date;
  }, [filteredData]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      {/* Navbar */}
      <div className="bg-blue-900 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-6 w-6 text-red-400" />
            <h1 className="text-xl font-bold tracking-tight">
              DengGuard PH
            </h1>
          </div>
          <div className="text-xs bg-blue-800 px-3 py-1 rounded-full uppercase tracking-wider font-semibold">
            Beta Prototype
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 mt-8 space-y-6">
        {/* Controls Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Region Selector */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-semibold text-slate-600">
              <MapPin className="h-4 w-4 mr-1" /> Select Region
            </label>
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {/* If REGIONS is empty (initially), keep the current default */}
              {REGIONS.length === 0 ? (
                <option value={selectedRegion}>{selectedRegion}</option>
              ) : (
                REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Year Range Selector */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-semibold text-slate-600">
              <Calendar className="h-4 w-4 mr-1" /> Year Range:{" "}
              {yearRange[0]} - {yearRange[1]}
            </label>
            <div className="flex items-center space-x-4 px-2">
              <input
                type="range"
                min="2017"
                max={yearRange[1]}
                value={yearRange[0]}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (val <= yearRange[1]) setYearRange([val, yearRange[1]]);
                }}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="range"
                min={yearRange[0]}
                max="2021"
                value={yearRange[1]}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (val >= yearRange[0])
                    setYearRange([yearRange[0], val]);
                }}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Forecast Toggle */}
          <div className="flex items-end pb-2">
            <button
              onClick={handleAnalyzeRisk}
              disabled={loading || filteredData.length < 2}
              className={`w-full py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 
                ${
                  showRisk
                    ? "bg-red-600 text-white shadow-md"
                    : "bg-white border-2 border-red-600 text-red-600 hover:bg-red-50"
                } ${
                loading ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>
                {loading
                  ? "Analyzing..."
                  : showRisk
                  ? "Hide Forecast"
                  : "Analyze Risk"}
              </span>
            </button>
          </div>
        </div>

        {/* Error message (global) */}
        {error && (
          <div className="max-w-6xl mx-auto">
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          </div>
        )}

        {/* Dashboard Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-h-[400px]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800">
                  Dengue Case Trends
                </h2>
                <div className="text-sm text-slate-500">
                  Weekly Reported Cases
                </div>
              </div>

              {/* Line chart */}
              <SimpleLineChart data={filteredData} />

              <div className="mt-4 flex justify-center space-x-6 text-sm text-slate-500">
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-red-500 rounded-full mr-2" />
                  Confirmed Cases
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar / Info Column */}
          <div className="space-y-6">
            {/* Risk Card - Only shows if toggled */}
            {showRisk && forecastData && (
              <div
                className={`p-6 rounded-xl border-l-8 shadow-sm ${forecastData.riskColor} bg-white animate-in slide-in-from-right duration-500`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm uppercase tracking-wide font-bold opacity-70">
                      Forecast Risk Level
                    </h3>
                    <div className="text-3xl font-extrabold mt-1">
                      {forecastData.riskLevel}
                    </div>
                  </div>
                  <AlertTriangle className="h-8 w-8 opacity-80" />
                </div>
                <div className="mt-4 pt-4 border-t border-black/10">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span>Predicted next 4 weeks:</span>
                    <span className="text-lg">
                      ~{forecastData.predictedCases} cases
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* AI Summary Card */}
            <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 shadow-sm">
              <div className="flex items-center space-x-2 text-indigo-900 mb-3">
                <Info className="h-5 w-5" />
                <h3 className="font-bold">Summary Analysis</h3>
              </div>
              <p className="text-indigo-800 leading-relaxed text-sm">
                {summary}
              </p>
            </div>

            {/* Quick Stats */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-800 mb-4">
                Dataset Highlights
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Records</span>
                  <span className="font-mono font-medium">
                    {filteredData.length} weeks
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Peak Week</span>
                  <span className="font-mono font-medium">{peakDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Max Cases</span>
                  <span className="font-mono font-medium">
                    {filteredData.length > 0
                      ? Math.max(
                          ...filteredData.map((d) => d.cases)
                        ).toLocaleString()
                      : 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
