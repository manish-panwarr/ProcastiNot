import React from 'react'

const InfoCard = ({ icon, label, value, color }) => {
    return (
        <div className='bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-md'>
            <div className='flex items-center gap-3 mb-2'>
                <div className={`w-2 h-6 md:h-8 ${color} rounded-full`} />
                <p className='text-gray-500 text-sm md:text-base font-medium leading-tight'>{label}</p>
            </div>
            <h4 className='text-3xl md:text-4xl font-bold text-gray-800 pl-5'>{value}</h4>
        </div>
    );
};

export default InfoCard