"use client";

import React, { useEffect, useState } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Pie } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

interface CategorySales {
  category: string;
  totalSales: number;
}

const SalesByCategoryInfocard = () => {
  const [data, setData] = useState<CategorySales[]>([]);

  useEffect(() => {
    async function fetchData() {
      const res = await fetch("/api/analytics/sales-by-category");
      const json: CategorySales[] = await res.json();
      setData(json);
    }
    fetchData();
  }, []);

  const chartData = {
    labels: data.map((d) => d.category),
    datasets: [
      {
        label: "Sales by Category",
        data: data.map((d) => Number(d.totalSales)),
        backgroundColor: [
          "rgba(59, 130, 246, 0.7)",
          "rgba(34, 197, 94, 0.7)",
          "rgba(234, 179, 8, 0.7)",
          "rgba(244, 63, 94, 0.7)",
          "rgba(168, 85, 247, 0.7)",
          "rgba(16, 185, 129, 0.7)",
        ],
        borderColor: [
          "rgba(59, 130, 246, 1)",
          "rgba(34, 197, 94, 1)",
          "rgba(234, 179, 8, 1)",
          "rgba(244, 63, 94, 1)",
          "rgba(168, 85, 247, 1)",
          "rgba(16, 185, 129, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const, // 'top' | 'bottom' | 'left' | 'right'
        align: "center" as const, // 'start' | 'center' | 'end'
        labels: {
          boxWidth: 20,
          padding: 15,
          font: { size: 12 },
        },
      },
    },
  };
  return (
    <div className="bg-white dark:bg-neutral p-4 border border-stone-200 shadow w-full h-full flex flex-col">
      <h2 className="font-bold text-gray-800">Sales by Category</h2>
      <p className="text-xs mt-1">
        Distribution of total sales per product category.
      </p>
      <div className="h-80 mt-8">
        <Pie data={chartData} options={options} />
      </div>
    </div>
  );
};

export default SalesByCategoryInfocard;
