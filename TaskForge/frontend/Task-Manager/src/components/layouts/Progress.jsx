import React from "react";

const Progress = ({ progress, status }) => {

    const getColor = () => {
        switch (status) {
            case 'In Progress':
                return 'text-cyan-500 bg-cyan-500 border border-cyan-500/10';
            case 'Pending':
                return 'text-yellow-500 bg-yellow-500 border border-yellow-500/10';
            case 'Completed':
                return 'text-green-500 bg-green-500 border border-green-500/10';
            default:
                return 'text-gray-500 bg-gray-500 border border-gray-500/10';
        }
    }
    return (
        <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div className={`${getColor()} h-1.5 rounded-full text-center text-xs font-medium`} style={{ width: `${progress}%` }}>

            </div>
        </div>
    );
};

export default Progress;