import React, { useState, useContext } from "react";
import AuthLayout from "../../components/layouts/AuthLayout";
import ProfilePhotoSelector from "../../components/inputs/ProfilePhotoSelector";
import { validateEmail } from "../../utils/helper";
import Input from "../../components/inputs/Input";
import { Link } from "react-router-dom";
import { API_PATHS } from "../../utils/apiPaths";
import axiosInstance from "../../utils/axiosInstance";
import { UserContext } from "../../context/userContext";
import { useNavigate } from "react-router-dom";
import uploadImage from "../../utils/uploadImage";


const SignUp = () => {

    const [profilePic, setProfilePic] = useState(null);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [adminInviteToken, setAdminInviteToken] = useState('');

    const { updateUser } = useContext(UserContext);
    const navigate = useNavigate();
    const [error, setError] = useState(null);

    // Handle Signup Form Submit
    const handleSignUp = async (e) => {
        e.preventDefault();

        let profilePicUrl = "";

        if (!fullName) {
            setError("Please enter your full name!");
            return;
        }

        if (!validateEmail(email)) {
            setError("Please enter a valid email address!");
            return;
        }

        if (!password) {
            setError("Please enter your password!")
            return;
        }

        setError("");

        // Signup API Call
        try {
            if (profilePic) {
                const imgUploadRes = await uploadImage(profilePic);
                profilePicUrl = imgUploadRes.imageUrl || "";
            }
            const response = await axiosInstance.post(API_PATHS.AUTH.SIGNUP, {
                name: fullName,
                email,
                password,
                profileImageUrl: profilePicUrl,
                adminInviteToken,
            });

            const { accessToken, role } = response.data;

            if (accessToken) {
                localStorage.setItem("token", accessToken);
                updateUser(response.data);

                //Redirect based on role
                if (role === "admin") {
                    navigate("/admin/dashboard");
                } else if (role === "manager") {
                    navigate("/manager/dashboard");
                } else {
                    navigate("/user/dashboard");
                }
            }
        } catch (e) {
            if (e.response && e.response.data.message) {
                setError(e.response.data.message);
            } else {
                setError("Something went wrong. Please try again.");
            }
        }

    }
    return (
        <AuthLayout>
            <div className="lg:w-[100%] h-auto md:h-full mt-10 md:mt-0 flex flex-col justify-center">
                <h3 className="text-xl font-semibold text-black">Create an account</h3>
                <p className="text-xs text-slate-700 mt-[5px] mb-6">Join us today by entering your details below.</p>

                <form onSubmit={handleSignUp}>
                    <ProfilePhotoSelector image={profilePic} setImage={setProfilePic} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        <Input
                            value={fullName}
                            onChange={({ target }) => setFullName(target.value)}
                            label="Full Name"
                            type="text"
                            placeholder="John Doe"
                        />
                        <Input
                            value={email}
                            onChange={({ target }) => setEmail(target.value)}
                            label="Email Address"
                            type="email"
                            placeholder='manish@example.com'
                        />
                        <Input
                            value={password}
                            onChange={({ target }) => setPassword(target.value)}
                            label="Password"
                            type="password"
                            placeholder="minimum 6 characters !"
                        />

                        <Input
                            value={adminInviteToken}
                            onChange={({ target }) => setAdminInviteToken(target.value)}
                            label="Admin Invite Token (Optional)"
                            type="text"
                            placeholder="Enter Admin Invite Token"
                        />

                        {error && <p className="text-red-500 text-xs pb-2.5">{error}</p>}
                        <div className="col-span-full">
                            <button type='submit' className='btn-primary'>Sign up</button>
                        </div>

                        <p className='text-[13px] text-slate-800 mt-3'>Already have an account ? {""}
                            <Link className='font-medium text-primary underline' to="/login">Log in</Link>
                        </p>
                    </div>


                </form>



            </div>
        </AuthLayout>
    );
}

export default SignUp;