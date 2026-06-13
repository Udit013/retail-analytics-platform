"use client";

import React, { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface OrderQuantity {
  productId: string;
  totalQuantity: number;
}

const OrderQuantityInfocard = () => {
  const [data, setData] = useState<OrderQuantity[]>([]);

  useEffect(() => {
    async function fetchData() {
      const res = await fetch("/api/analytics/order-quantity");
      const json: OrderQuantity[] = await res.json();
      setData(json);
    }
    fetchData();
  }, []);

  const chartData = {
    labels: data.map((d) => d.productId),
    datasets: [
      {
        label: "Total Quantity",
        data: data.map((d) => d.totalQuantity),
        backgroundColor: "rgba(34, 197, 94, 0.6)",
        borderColor: "rgba(34, 197, 94, 1)",
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { type: "category" as const, grid: { display: false } },
      y: { beginAtZero: true },
    },
  };

  return (
    <div className="bg-white dark:bg-neutral p-4 border border-stone-200 shadow w-full h-full flex flex-col">
      <h2 className="font-bold text-gray-800">Order Quantity per Product</h2>
      <p className="text-xs">
        Lorem, ipsum dolor sit amet consectetur adipisicing elit. Aperiam
        architecto ex eligendi, officiis iusto iste quas commodi, aut officia
      </p>
      {/* <p className="text-2xl font-bold mb-4">${totalSales.toLocaleString()}</p> */}
      <div className="h-80 mt-8">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};

export default OrderQuantityInfocard;
