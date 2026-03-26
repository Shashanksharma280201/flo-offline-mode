import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdAlternateEmail, MdLockOutline } from "react-icons/md";
import logo from "../assets/logo.png";
import { useMutation } from "react-query";
import { login } from "../features/auth/authService";
import { useUserStore } from "../stores/userStore";
import { errorLogger } from "../util/errorLogger";

export type LoginInput = {
    email: string;
    password: string;
};

/**
 * This page allows users to login with email and password
 *
 */
const Login = () => {
    const [formData, setFormData] = useState({
        email: "",
        password: ""
    });
    const { email, password } = formData;
    const navigate = useNavigate();
    const setUser = useUserStore((state) => state.setUser);

    /**
     * Handles response from login API
     */
    const { mutate: loginUser, isLoading } = useMutation(
        (userData: LoginInput) => login(userData),
        {
            onSuccess: (data) => {
                navigate("/");
                setUser(data);
            },
            onError: (error: any) => errorLogger(error)
        }
    );

    /**
     * Set formData state value on change in email or password fields
     * @param e - event triggered when text in input is changed
     */
    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prevData) => ({
            ...prevData,
            [e.target.name]: e.target.value
        }));
    };

    /**
     * Sends userData to server on Login submission
     * @param event - triggered event when form is submitted
     */
    const submitHandler = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const userData = {
            email,
            password
        };
        loginUser(userData);
    };

    return (
        <div className="relative">
            <div className="flex h-[100vh] flex-col items-center bg-slate-400/20 ">
                <div className="mx-auto my-auto flex flex-col rounded-lg px-10 pb-20 pt-10 shadow-xl xs:w-[70%] md:w-[35%] md:gap-y-8 md:bg-backgroundGray md:text-center">
                    <section>
                        <h1 className="pt-[10%] text-5xl font-semibold text-white sm:text-6xl md:text-7xl">
                            Sign <span className="text-green-500">In</span>{" "}
                        </h1>

                        <p className="my-5 text-sm text-secondary sm:text-lg">
                            Please Login and view your dashboard
                        </p>
                    </section>
                    <section>
                        <form
                            onSubmit={submitHandler}
                            className="flex flex-col gap-y-4"
                        >
                            <fieldset className="flex items-center justify-center rounded-md border bg-white">
                                <div className="inline-flex rounded-l-md p-2.5 text-sm text-black">
                                    <MdAlternateEmail className="text-base" />
                                </div>
                                <input
                                    type="email"
                                    className="block w-full rounded-r-md  border-l p-2.5 text-sm text-black outline-none"
                                    id="email"
                                    name="email"
                                    value={email}
                                    placeholder="Enter email"
                                    onChange={onChange}
                                />
                            </fieldset>
                            <fieldset className="flex items-center justify-center rounded-md border bg-white">
                                <div className="inline-flex rounded-l-md p-2.5 text-sm text-black">
                                    <MdLockOutline className="text-base" />
                                </div>
                                <input
                                    type="password"
                                    className="block w-full rounded-r-md  border-l p-2.5 text-sm text-black outline-none"
                                    id="password"
                                    name="password"
                                    value={password}
                                    placeholder="Enter password"
                                    onChange={onChange}
                                />
                            </fieldset>
                            <fieldset>
                                <button
                                    type="submit"
                                    className="w-full rounded-md bg-green-500 p-2.5 text-sm font-semibold text-white hover:scale-[98%]"
                                >
                                    Submit
                                </button>
                            </fieldset>
                        </form>
                    </section>
                </div>
            </div>
            <header className="absolute left-5 top-5">
                <img
                    className="w-12 md:w-16 lg:w-24"
                    src={logo}
                    alt="Website logo"
                />
            </header>
        </div>
    );
};

export default Login;
