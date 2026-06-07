import React, { useState, useRef } from 'react';
import { LuUser, LuUpload, LuTrash } from 'react-icons/lu'

const ProfilePhotoSelector = ({ image, setImage }) => {

    const inputRef = React.useRef(null);
    const [previewUrl, setprevieUrl] = useState(null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const preview = URL.createObjectURL(file);
            setprevieUrl(preview);
            setImage(file);
        }
    };

    const handleRemoveImage = () => {
        setImage(null);
        setprevieUrl(null);
    };

    const onChooseFile = () => {
        inputRef.current.click();
    };

    return (
        <div className='flex justify-center mb-6'>
            <input
                type="file"
                accept='image/*'
                ref={inputRef}
                onChange={handleImageChange}
                className='hidden'
            />

            {!image ? (
                <div className='w-20 h-20 flex items-center justify-center bg-blue-100/50 rounded cursor-pointer relative rounded-full' onClick={onChooseFile} title='Choose Profile Photo' >
                    <LuUser className='text-4xl text-primary rounded-full' />

                    <button
                        type='button'
                        className='w-8 h-8 flex items-center justify-center bg-primary text-white rounded-full absolute -bottom-1 -right-1 cursor-pointer'
                        onClick={(e) => {
                            e.stopPropagation();
                            onChooseFile();
                        }}
                    >
                        <LuUpload size={15} />
                    </button>
                </div>
            ) : (
                <div className='relative'>
                    <img src={previewUrl} alt="profile photo" className='w-20 h-20 rounded-full object-cover' />
                    <button
                        type='button'
                        onClick={handleRemoveImage}
                        className='w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-full absolute -bottom-1 -right-1 cursor-pointer'
                    >
                        <LuTrash />

                    </button>
                </div>
            )}
        </div>
    )
}

export default ProfilePhotoSelector