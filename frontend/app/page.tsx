"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar,
  MapPin,
  AlertTriangle,
  TrendingUp,
  Activity,
  Info,
} from "lucide-react";

// --- CONFIG ---

const YEARS = [2017, 2018, 2019, 2020, 2021];

type RegionConfig = {
  label: string;
  apiValue: string;
  multiplier: number;
};

const REGIONS: RegionConfig[] = [
  { label: "National", apiValue: "National", multiplier: 1.0 },
  { label: "NCR (Metro Manila)", apiValue: "NCR", multiplier: 0.25 },
  { label: "Region VII (Central Visayas)", apiValue: "Region VII", multiplier: 0.15 },
  { label: "Region XI (Davao)", apiValue: "Region XI", multiplier: 0.1 },
  { label: "Region IV-A (Calabarzon)", apiValue: "Region IV-A", multiplier: 0.18 },
];

type DenguePoint = {
  region: string;
  year: number;
  week: number;
  cases: number;
  date: string;
};

const generateData = (): DenguePoint[] => {
  const data: DenguePoint[] = [];

  const seasonalProfile = [
    0.8, 0.7, 0.6, 0.6, 0.7, 0.9, 1.2, 1.8, 2.2, 2.0, 1.5, 1.0,
  ];

  REGIONS.forEach(({ label, multiplier }) => {
    YEARS.forEach((year) => {
      let yearMultiplier = 1.0;
      if (year === 2019) yearMultiplier = 2.5;
      if (year === 2020) yearMultiplier = 0.3;

      for (let week = 1; week <= 52; week++) {
        const monthIndex = Math.floor((week - 1) / 4.3);
        const seasonality = seasonalProfile[Math.min(monthIndex, 11)];

        const baseCases = 1500;
        const noise = 0.8 + Math.random() * 0.4;

        const cases = Math.floor(
          baseCases * seasonality * yearMultiplier * multiplier * noise
        );

        data.push({
          region: label,
          year,
          week,
          cases,
          date: `Week ${week}, ${year}`,
        });
      }
    });
  });

  return data;
};

const RAW_DATA: DenguePoint[] = generateData();

interface SimpleLineChartProps {
  data: DenguePoint[];
  color?: string;
}

const SimpleLineChart: React.FC<SimpleLineChartProps> = ({
  data,
  color = "#ef4444",
}) => {
  if (!data || data.length === 0)
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        No data available
      </div>
    );

  const height = 300;
  const width = 800;
  const padding = 40;

  const maxVal = Math.max(...data.map((d) => d.cases));
  const minVal = 0;

  const getX = (index: number) =>
    padding + (index / (data.length - 1)) * (width - padding * 2);
  const getY = (val: number) =>
    height -
    padding -
    ((val - minVal) / (maxVal - minVal)) * (height - padding * 2);

  const points = data
    .map((d, i) => `${getX(i)},${getY(d.cases)}`)
    .join(" ");

  const labelStep = Math.max(1, Math.floor(data.length / 6));

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[600px]">
        {/* Grid + Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const y = height - padding - tick * (height - padding * 2);
          return (
            <g key={tick}>
              <line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
              <text
                x={padding - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#9ca3af"
              >
                {Math.round(minVal + tick * (maxVal - minVal))}
              </text>
            </g>
          );
        })}

        {/* Line */}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* X-axis labels (roughly 6) */}
        {data.map((d, i) => {
          if (i % labelStep !== 0) return null;
          return (
            <text
              key={`${d.year}-${d.week}`}
              x={getX(i)}
              y={height - 10}
              textAnchor="middle"
              fontSize="10"
              fill="#6b7280"
            >
              {d.year} W{d.week}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

// --- MAIN COMPONENT ---

export default function DengueDashboard() {
  // UI state
  const [selectedRegion, setSelectedRegion] = useState<RegionConfig>(REGIONS[0]);
  const [yearRange, setYearRange] = useState<[number, number]>([2019, 2021]);

  // Backend-driven forecast state (from FastAPI)
  const [forecastYear, setForecastYear] = useState<number>(2024);
  const [forecastMonth, setForecastMonth] = useState<number>(1);
  const [lagCases, setLagCases] = useState<number>(100);
  const [prediction, setPrediction] = useState<number | null>(null);
  const [showRisk, setShowRisk] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filter chart data based on region + year range
  const filteredData = useMemo(
    () =>
      RAW_DATA.filter(
        (d) =>
          d.region === selectedRegion.label &&
          d.year >= yearRange[0] &&
          d.year <= yearRange[1]
      ),
    [selectedRegion, yearRange]
  );

  // Risk + trend derived from backend prediction
  const forecastData = useMemo(() => {
    if (prediction === null || filteredData.length === 0) return null;

    const lastPoint = filteredData[filteredData.length - 1];
    const lastCases = lastPoint.cases;

    // Risk thresholds (can tune)
    const isNational = selectedRegion.apiValue === "National";
    const highRiskThreshold = isNational ? 8000 : 2000;
    const modRiskThreshold = isNational ? 4000 : 800;

    let riskLevel = "Low";
    let riskColor = "bg-green-100 text-green-800 border-green-200";
    if (prediction > modRiskThreshold) {
      riskLevel = "Moderate";
      riskColor = "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
    if (prediction > highRiskThreshold) {
      riskLevel = "High";
      riskColor = "bg-red-100 text-red-800 border-red-200";
    }

    const trend = prediction > lastCases ? "Increasing" : "Decreasing";

    return {
      predictedCases: Math.round(prediction),
      riskLevel,
      riskColor,
      trend,
      referenceWeek: lastPoint.date,
    };
  }, [prediction, filteredData, selectedRegion]);

  // Plain-language summary
  const summary = useMemo(() => {
    if (!forecastData) {
      return "Not enough data or forecast yet. Set the forecast parameters and click Analyze Risk to get a prediction.";
    }

    return `For ${selectedRegion.label}, the model predicts around ${
      forecastData.predictedCases
    } dengue cases for ${forecastYear}-${String(forecastMonth).padStart(
      2,
      "0"
    )}. This suggests a ${forecastData.riskLevel.toLowerCase()} risk level. Compared to the latest observed week (${forecastData.referenceWeek}), cases appear to be ${forecastData.trend.toLowerCase()}.`;
  }, [forecastData, selectedRegion, forecastYear, forecastMonth]);

  // BACKEND CALL (from your second file, but wired into this UI)
  const handleForecast = async () => {
    setLoading(true);
    setError(null);
    setShowRisk(false);

    try {
      const res = await fetch("http://localhost:8000/forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region: selectedRegion.apiValue,
          year: forecastYear,
          month: forecastMonth,
          cases_lag1: lagCases,
        }),
      });

      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setPrediction(data.predicted_cases);
      setShowRisk(true);
    } catch (err: any) {
      setError(err.message || "Failed to fetch forecast");
      setPrediction(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      {/* Navbar */}
      <div className="bg-blue-900 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-6 w-6 text-red-400" />
            <h1 className="text-xl font-bold tracking-tight">DengueNow PH</h1>
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
              value={selectedRegion.label}
              onChange={(e) => {
                const regionCfg = REGIONS.find(
                  (r) => r.label === e.target.value
                );
                if (regionCfg) {
                  setSelectedRegion(regionCfg);
                }
              }}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {REGIONS.map((r) => (
                <option key={r.apiValue} value={r.label}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Year Range for Chart */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-semibold text-slate-600">
              <Calendar className="h-4 w-4 mr-1" /> Year Range: {yearRange[0]} -{" "}
              {yearRange[1]}
            </label>
            <div className="flex items-center space-x-4 px-2">
              <input
                type="range"
                min="2017"
                max={yearRange[1]}
                value={yearRange[0]}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
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
                  const val = parseInt(e.target.value, 10);
                  if (val >= yearRange[0]) setYearRange([yearRange[0], val]);
                }}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Forecast Controls + Button (backend) */}
          <div className="flex flex-col justify-between space-y-3">
            <div>
              <label className="flex items-center text-sm font-semibold text-slate-600">
                <TrendingUp className="h-4 w-4 mr-1" />
                Forecast Parameters
              </label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 mb-1">Year</span>
                  <input
                    type="number"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                    value={forecastYear}
                    onChange={(e) => setForecastYear(Number(e.target.value))}
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 mb-1">Month</span>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                    value={forecastMonth}
                    onChange={(e) =>
                      setForecastMonth(
                        Math.min(Math.max(Number(e.target.value), 1), 12)
                      )
                    }
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-slate-500 mb-1">
                    Prev-month cases
                  </span>
                  <input
                    type="number"
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-sm"
                    value={lagCases}
                    onChange={(e) => setLagCases(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-1">
              <button
                onClick={handleForecast}
                disabled={loading}
                className={`w-full py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
                  loading
                    ? "bg-red-300 text-white"
                    : "bg-white border-2 border-red-600 text-red-600 hover:bg-red-50"
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                <span>
                  {loading
                    ? "Predicting..."
                    : prediction === null
                    ? "Analyze Risk"
                    : "Update Forecast"}
                </span>
              </button>
              {error && (
                <p className="text-xs text-red-600 mt-1">{error}</p>
              )}
            </div>
          </div>
        </div>

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
            {/* Risk Card (backend-driven) */}
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
                    <p className="mt-1 text-xs text-slate-600">
                      Compared to latest observed week (
                      {forecastData.referenceWeek}), trend is{" "}
                      <span className="font-semibold">
                        {forecastData.trend.toLowerCase()}
                      </span>
                      .
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 opacity-80" />
                </div>
                <div className="mt-4 pt-4 border-t border-black/10">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span>Predicted next period:</span>
                    <span className="text-lg">
                      ~{forecastData.predictedCases.toLocaleString()} cases
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
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total Records</span>
                  <span className="font-mono font-medium">
                    {filteredData.length} weeks
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Peak Week</span>
                  <span className="font-mono font-medium">
                    {filteredData.length > 0
                      ? filteredData.reduce((prev, current) =>
                          prev.cases > current.cases ? prev : current
                        ).date
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
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
