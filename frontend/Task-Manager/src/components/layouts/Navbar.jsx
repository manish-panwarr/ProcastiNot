import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import SideMenu from "./SideMenu";
import { HiOutlineMenu, HiOutlineX } from "react-icons/hi";
import { BsStopwatch } from "react-icons/bs";
import { useSocket } from "../../context/SocketContext";
import NotificationPanel from "./NotificationPanel";

const Navbar = ({ activeMenu }) => {
    const [openSideMenu, setOpenSideMenu] = useState(false);
    const { totalUnread } = useSocket();
    const navigate = useNavigate();

    const onChatPage = window.location.pathname.startsWith("/chat");

    return (
        <>
            <div className="navbar relative flex items-center justify-between bg-white border-b border-gray-200 py-4 px-6 sticky top-0 z-40">

                <div className="peer flex items-center gap-2 cursor-pointer w-max z-50">
                    <h2
                        onClick={() => navigate("/")}
                        className="flex items-center text-xl font-medium text-black"
                    >
                        <BsStopwatch size={35} />
                        procrasti_NOT
                    </h2>
                </div>

                <div className="hidden min-[1016px]:block pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[150%] opacity-0 peer-hover:-translate-y-1/2 peer-hover:opacity-100 transition-all duration-500 z-40 text-sm text-slate-700 whitespace-nowrap">
                    ProcrastiNOT kills procrastination before it kills your
                    <span className="ml-1 font-medium text-primary line-through">
                        deadlines
                    </span>{" "}
                    👨‍⚕️
                </div>

                <div className="layout flex items-center gap-0 relative justify-end md:w-full md:mr-5">
                    {!onChatPage && (
                        <button
                            onClick={() => navigate("/chat")}
                            className="layout2 relative flex items-center p-2 rounded-full hover:scale-110 transition-colors"
                            title="Chat"
                        >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                                <path
                                    d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
                                    stroke={totalUnread > 0 ? "#1368EC" : "#64748b"}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>

                            {totalUnread > 0 && (
                                <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-[16px] text-[10px] font-bold bg-red-500 text-white rounded-full px-1 border border-white">
                                    {totalUnread > 99 ? "99+" : totalUnread}
                                </span>
                            )}
                        </button>
                    )}

                    <NotificationPanel />
                </div>

                <button
                    className="lg:hidden"
                    onClick={() => setOpenSideMenu(!openSideMenu)}
                >
                    {openSideMenu ? (
                        <HiOutlineX className="text-2xl" />
                    ) : (
                        <HiOutlineMenu className="text-2xl" />
                    )}
                </button>
            </div>



            <div
                className={`fixed inset-0 z-[9999] lg:hidden transition ${openSideMenu ? "visible opacity-100" : "invisible opacity-0"
                    }`}
            >
                <div
                    className="absolute inset-0 bg-black/40"
                    onClick={() => setOpenSideMenu(false)}
                />

                <div
                    className={`absolute left-0 top-0 h-full w-80 bg-white shadow-xl transform transition-transform ${openSideMenu ? "translate-x-0" : "-translate-x-full"
                        }`}
                >
                    <div className="p-4 border-b flex justify-between items-center">
                        <h2
                            onClick={() => {
                                navigate("/");
                                setOpenSideMenu(false);
                            }}
                            className="flex items-center text-lg font-medium cursor-pointer gap-1"
                        >
                            <BsStopwatch size={34} />
                            procrasti_NOT
                        </h2>

                        <HiOutlineX
                            className="text-2xl cursor-pointer"
                            onClick={() => setOpenSideMenu(false)}
                        />
                    </div>

                    <SideMenu activeMenu={activeMenu} isMobile />
                </div>
            </div>
        </>
    );
};

export default Navbar;