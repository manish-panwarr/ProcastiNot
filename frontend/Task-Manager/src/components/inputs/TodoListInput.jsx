import React, { useState } from "react";
import { HiMiniPlus, HiOutlineTrash } from "react-icons/hi2";
import ReactMarkdown from "react-markdown";


const TodoListInput = ({ todoList, setTodoList }) => {

    const [option, setOption] = useState("");

    // Function to handle adding an option
    const handleAddOption = () => {
        if (option.trim()) {
            setTodoList([...todoList, option.trim()]);
            setOption("");
        }
    };

    // Function to handle deleting an option
    const handleDeleteOption = (index) => {
        const updatedArr = todoList.filter((_, i) => i !== index);
        setTodoList(updatedArr);
    };

    return (
        <div>
            {todoList.map((item, index) => (
                <div key={item}
                    className="flex justify-between bg-gray-50 border border-gray-100 px-4 py-3 rounded-md mb-3 mt-2">

                    <div className="flex-1 text-xs text-black min-w-0 pr-4 prose prose-sm max-w-none leading-normal prose-p:my-0 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
                        <span className="text-xs text-gray-400 font-semibold mr-2 block mb-1">
                            {index < 9 ? `0${index + 1}` : index + 1}
                        </span>
                        <ReactMarkdown>
                            {item}
                        </ReactMarkdown>
                    </div>

                    <button className="cursor-pointer"
                        onClick={() => {
                            handleDeleteOption(index);
                        }}>
                        <HiOutlineTrash className="text-lg text-red-500" />
                    </button>
                </div>
            ))}

            <div className="flex items-start gap-4 mt-4">
                <textarea
                    placeholder="Enter Task (supports Markdown formatting)"
                    value={option}
                    onChange={({ target }) => setOption(target.value)}
                    rows={4}
                    className="w-full text-[13px] text-black outline-none bg-white border border-gray-200 px-4 py-3 rounded-md focus:border-blue-300 focus:ring-2 focus:ring-blue-100 resize-y whitespace-pre-wrap"
                />

                <button
                    className="flex-shrink-0 flex items-center gap-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md px-4 py-3 border border-blue-200 hover:border-blue-300 transition-colors duration-300"
                    onClick={handleAddOption}
                >
                    <HiMiniPlus className="text-lg" /> Add
                </button>
            </div>
        </div>
    );
};

export default TodoListInput;