import React from 'react';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import CustomTooltip from './CustomTooltip';
import CustomLegend from './CustomLegend';

const COLORS = ['#0088FE', '#00C49F', '#FF8042'];

const CustomPieChart = ({ data, colors }) => {
    const themeColors = colors || COLORS;
    return (

        <ResponsiveContainer width="100%" height={325} >
            <PieChart >
                <Pie
                    className='text-[10px] border-none outline-none  '
                    data={data}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={110}
                    outerRadius={130}
                    labelLine={false}
                >
                    {data.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={themeColors[index % themeColors.length]}
                        />
                    ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend content={<CustomLegend />} />
            </PieChart>
        </ResponsiveContainer>

    );
};

export default CustomPieChart;