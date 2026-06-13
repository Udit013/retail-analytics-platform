"use client";

import React, { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface SalesDataPoint {
  month: string;
  totalSales: number;
}

const SalesOverTimeInfoCard = () => {
  const [data, setData] = useState<SalesDataPoint[]>([]);
  const [totalSales, setTotalSales] = useState<number>(0);

  useEffect(() => {
    async function fetchData() {
      const res = await fetch("/api/analytics/sales-over-time");
      const json: SalesDataPoint[] = await res.json();
      setData(json);
      const sum = json.reduce((acc, item) => acc + Number(item.totalSales), 0);
      setTotalSales(sum);
    }
    fetchData();
  }, []);

  const chartData = {
    labels: data.map((d) => d.month),
    datasets: [
      {
        label: "Sales",
        data: data.map((d) => Number(d.totalSales)),
        fill: true,
        backgroundColor: "rgba(59, 130, 246, 0.2)",
        borderColor: "rgba(59, 130, 246, 1)",
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        type: "category" as const,
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="bg-white dark:bg-neutral p-4 border border-stone-200 shadow w-full h-full flex flex-col">
      <h2 className="font-bold text-gray-800">Sales Over Time</h2>
      <p className="text-xs">
        Lorem, ipsum dolor sit amet consectetur adipisicing elit. Aperiam
        architecto ex eligendi, officiis iusto iste quas commodi, aut officia
      </p>
      {/* <p className="text-2xl font-bold mb-4">${totalSales.toLocaleString()}</p> */}
      <div className="h-80 mt-8">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

export default SalesOverTimeInfoCard;
