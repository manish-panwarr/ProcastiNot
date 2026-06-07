import React from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    Cell,
    ResponsiveContainer,
} from "recharts";

const CustomBarChart = ({ data }) => {


    const getBarColor = (entry) => {
        switch (entry?.priority) {
            case 'High': return '#FF4747';
            case 'Medium': return '#FFD966';
            case 'Low': return '#66CC99';
            default: return '#8D51FF';
        }
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const { priority, count, fullName } = payload[0].payload;
            return (
                <div className="bg-white shadow-md rounded-lg p-2 border border-gray-200">
                    <p className="text-xs font-semibold text-purple-800">
                        {fullName || priority}
                    </p>
                    <p className="text-sm text-gray-700">
                        Count: <span className="font-medium">{count}</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white mt-6">
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />

                    <XAxis
                        dataKey="priority"
                        tick={{ fontSize: 12, fill: '#555' }}
                        stroke="none"
                    />
                    <YAxis
                        tick={{ fontSize: 12, fill: "#555" }}
                        stroke="none"
                    />

                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "transparent" }} />

                    <Bar
                        dataKey="count"
                        radius={[10, 10, 0, 0]}
                    >
                        {data.map((entry, index) => (
                            <Cell key={index} fill={getBarColor(entry)} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default CustomBarChart;