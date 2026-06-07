import React from 'react';
import { getAvatarUrl } from '../../utils/helper';

const UserPerformanceCard = ({ data }) => {
    const maxCount = data && data.length > 0 ? Math.max(...data.map(u => u.count)) : 1;

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 h-full">
            <h5 className="text-lg font-medium text-gray-800 mb-4">Top Performers</h5>
            <p className="text-xs text-gray-400 mb-6">Top 5 members based on completed tasks</p>

            <div className="space-y-6">
                {data && data.length > 0 ? (
                    data.map((user, index) => (
                        <div key={user._id} className="flex items-center gap-4">
                            {/* Rank Badge */}
                            <div className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold ${index === 0 ? "bg-yellow-100 text-yellow-600" :
                                index === 1 ? "bg-gray-100 text-gray-600" :
                                    index === 2 ? "bg-orange-100 text-orange-600" :
                                        "bg-slate-50 text-slate-500"
                                }`}>
                                {index + 1}
                            </div>

                            <img
                                src={getAvatarUrl(user.profileImageUrl, user.name)}
                                alt={user.name}
                                className="w-10 h-10 rounded-full object-cover border border-gray-100"
                            />

                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                    <h6 className="text-sm font-medium text-gray-700">{user.name}</h6>
                                    <span className="text-xs text-gray-500 font-semibold">{user.count} Tasks</span>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full bg-gray-100 rounded-full h-1.5">
                                    <div
                                        className={`h-1.5 rounded-full ${index === 0 ? "bg-yellow-400" :
                                            index === 1 ? "bg-gray-400" :
                                                index === 2 ? "bg-orange-400" :
                                                    "bg-slate-400"
                                            }`}
                                        style={{ width: `${(user.count / maxCount) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-gray-400 text-center py-8">No performance data available.</p>
                )}
            </div>
        </div>
    );
};

export default UserPerformanceCard;
