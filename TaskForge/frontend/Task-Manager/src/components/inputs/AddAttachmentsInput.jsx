import React, { useState, useRef } from "react";
import { HiMiniPlus, HiOutlineTrash } from "react-icons/hi2";
import { LuPaperclip, LuFile } from "react-icons/lu";

const AddAttachmentsInput = ({ attachments, setAttachments, files, setFiles }) => {
    const [option, setOption] = useState("");
    const fileInputRef = useRef(null);

    // Function to handle adding a link
    const handleAddOption = () => {
        if (option.trim()) {
            setAttachments([...attachments, option.trim()]);
            setOption("");
        }
    };

    // Function to handle deleting an attachment (link or existing object)
    const handleDeleteOption = (index) => {
        const updatedArr = attachments.filter((_, i) => i !== index);
        setAttachments(updatedArr);
    };

    // Function to handle deleting a file (new upload)
    const handleDeleteFile = (index) => {
        const updatedFiles = files.filter((_, i) => i !== index);
        setFiles(updatedFiles);
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFiles([...files, ...Array.from(e.target.files)]);
        }
    };


    return (
        <div>
            {/* Existing Attachments and Links */}
            {attachments.map((item, index) => (
                <div key={`param-${index}`} className="flex justify-between items-center bg-gray-50 border border-gray-100 px-4 py-3 rounded-md mb-3 mt-2 overflow-hidden">
                    <div className="flex-1 flex items-center gap-3 overflow-hidden">
                        <LuPaperclip className="text-gray-400 text-lg flex-shrink-0" />
                        <p className="text-xs text-black truncate flex-1 min-w-0">
                            {typeof item === 'string' ? item : item.originalName || item.fileUrl}
                        </p>
                    </div>

                    <button className="cursor-pointer ml-3 flex-shrink-0" onClick={() => handleDeleteOption(index)}>
                        <HiOutlineTrash className="text-lg text-red-500" />
                    </button>
                </div>
            ))}

            {/* New Files */}
            {files && files.map((file, index) => (
                <div key={`file-${index}`} className="flex justify-between items-center bg-blue-50 border border-blue-100 px-4 py-3 rounded-md mb-3 mt-2 overflow-hidden">
                    <div className="flex-1 flex items-center gap-3 overflow-hidden">
                        <LuFile className="text-blue-400 text-lg flex-shrink-0" />
                        <p className="text-xs text-black truncate flex-1 min-w-0">{file.name}</p>
                    </div>
                    <button className="cursor-pointer ml-3 flex-shrink-0" onClick={() => handleDeleteFile(index)}>
                        <HiOutlineTrash className="text-lg text-red-500" />
                    </button>
                </div>
            ))}

            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-5 mt-4">
                <div className="flex-1 flex items-center gap-3 border border-gray-100 rounded-md px-3 py-2 w-full">
                    <LuPaperclip className="text-gray-400" />
                    <input
                        type="text"
                        placeholder="Add attachment link"
                        value={option}
                        onChange={(e) => setOption(e.target.value)}
                        className="outline-none bg-white flex-1 min-w-0 text-sm"
                    />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md px-4 py-2 border border-blue-200 hover:border-blue-300 transition-colors duration-300"
                        onClick={handleAddOption}
                    >
                        <HiMiniPlus className="text-lg" />Link
                    </button>

                    <input
                        type="file"
                        multiple
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                    />
                    <button
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-md px-4 py-2 border border-purple-200 hover:border-purple-300 transition-colors duration-300"
                        onClick={() => fileInputRef.current.click()}
                    >
                        <HiMiniPlus className="text-lg" />File
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddAttachmentsInput;