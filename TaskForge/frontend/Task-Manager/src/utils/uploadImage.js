import { API_PATHS } from "./apiPaths";
import axiosInstance from "./axiosInstance";

//@desc : Upload image to the server
//@why : To upload image to the server
//@return : Promise of response
const uploadImage = async (imageFile) => {
    const formData = new FormData();
    formData.append('image', imageFile);

    try {
        const response = await axiosInstance.post(API_PATHS.IMAGE.UPLOAD_IMAGE, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (e) {
        console.error("Error uploading the image:", e);
        throw e;
    }
};

export default uploadImage;
