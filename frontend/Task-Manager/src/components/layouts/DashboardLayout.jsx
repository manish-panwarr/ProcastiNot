import React from 'react'
import { UserContext } from '../../context/userContext';
import { useContext } from 'react';
import Navbar from './Navbar';
import SideMenu from './SideMenu';

const DashboardLayout = ({ children, activeMenu, isChatPage = false }) => {
    const { user } = useContext(UserContext);
    return (
        <div className="flex flex-col bg-slate-50 min-h-screen h-screen overflow-hidden w-full">
            <Navbar activeMenu={activeMenu} />

            <div className="flex flex-1 overflow-hidden w-full">
                {user && (
                    <div className="hidden lg:block w-64 xl:w-72 h-full bg-white z-40 border-r border-gray-200 flex-shrink-0">
                        <SideMenu activeMenu={activeMenu} />
                    </div>
                )}

                <div className={`flex flex-col flex-1 w-full transition-all duration-300 ${isChatPage ? 'h-full overflow-hidden' : 'h-full overflow-y-auto'}`}>
                    <div className={isChatPage ? 'flex-1 min-w-0 min-h-0 overflow-hidden relative flex flex-col' : 'flex-1 px-4 sm:px-6 md:px-8 py-6 w-full max-w-7xl mx-auto'}>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default DashboardLayout