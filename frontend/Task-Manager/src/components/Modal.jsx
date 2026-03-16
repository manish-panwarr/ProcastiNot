import React from "react";


const Modal = ({ children, isOpen, onClose, title }) => {
    if (!isOpen) return;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className={`relative w-full max-w-lg p-3 md:p-5 transition-all transform duration-300 scale-100 opacity-100`}>
                <div className="relative bg-white rounded-xl shadow-2xl dark:bg-gray-100 flex flex-col max-h-[90vh]">
                    <div className="flex items-center justify-between p-4 border-b rounded-t border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-800 ">
                            {title}
                        </h3>
                        <button
                            className="text-gray-400 bg-transparent hover:bg-gray-100 hover:text-gray-600 rounded-lg text-sm w-8 h-8 inline-flex items-center justify-center dark:hover:bg-gray-600 dark:hover:text-white cursor-pointer transition-colors"
                            onClick={onClose}
                            type="button"
                        >
                            <svg
                                className="w-3 h-3"
                                aria-hidden="true"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 14 14"
                            >
                                <path
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M1 1l12 12M13 1L1 13"
                                />
                            </svg>
                        </button>
                    </div>

                    <div className="p-4 md:p-5 space-y-4 overflow-y-auto custom-scrollbar">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Modal;
