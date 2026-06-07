import React from "react";
import { MdTaskAlt } from "react-icons/md";
import { BsStopwatch } from "react-icons/bs";
import UI_IMG from "../../assets/images/auth-image-blue-bg.png";
import UI_IMG2 from "../../assets/images/auth-image-alt0.png";

const AuthLayout = ({ children }) => {
    return (
        <div className="flex">
            <div className="w-screen h-screen md:w-[65vw] px-13 pt-15 pb-32">
                <h2 className="peer flex items-center  text-xl font-medium text-black cursor-pointer select-none ml-3">TaskForge</h2>
                <p className="text-[13px] text-slate-700 mt-[-2px] mb-6 ml-10 opacity-0 -translate-y-2 transition-all duration-300 peer-hover:opacity-100 peer-hover:translate-y-0">
                    Everything Your Team Needs to Work Together in realtime without - <span className="font-medium text-primary line-through">Context switching.</span>.
                </p>
                {children}
            </div>

            <div className="hidden rounded-l-3xl md:flex w-[40vw] h-screen items-center justify-center bg-[#137AE3] bg-[url('/auth-image-alt0.png')] bg-cover bg-no-repeat bg-center overflow-hidden p-5">
                <img src={UI_IMG2} className="w-full lg:w-[85%]" />
            </div>
        </div>
    )
}

export default AuthLayout;