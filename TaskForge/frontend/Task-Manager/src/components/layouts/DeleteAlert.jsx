import React from "react";
import { LuTrash2 } from "react-icons/lu";

const DeleteAlert = ({ content, onDelete }) => {
    return (
        <div>
            <p className="text-sm">{content}</p>

            <div className="flex justify-end mt-6">
                <button className="flex items-center justify-center gap-1.5 text-xs md:text-sm  px-4 py-2 cursor-pointer font-medium text-rose-500 whitespace-nowrap bg-rose-50 border border-rose-200 rounded-md px-3 py-1.5 hover:bg-rose-100 hover:border-rose-300 transition-colors duration-300"
                    type="button"
                    onClick={onDelete}
                >
                    <LuTrash2 className="text-lg" />
                    Delete
                </button>
            </div>

        </div>
    );
};

export default DeleteAlert;