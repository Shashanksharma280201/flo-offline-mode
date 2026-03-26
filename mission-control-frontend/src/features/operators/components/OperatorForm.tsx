import { useRef, useState } from "react";
import { useMutation } from "react-query";
import { errorLogger } from "../../../util/errorLogger";
import { MdClose, MdVisibility } from "react-icons/md";
import { toast } from "react-toastify";
import { registerOperator } from "../services/operatorService";

type OperatorFormProps = {
    refetchOperators: () => void;
    closeOperatorForm: () => void;
};

/**
 * Form to create a new operator
 */
const OperatorForm = ({
    refetchOperators,
    closeOperatorForm
}: OperatorFormProps) => {
    const fileRef = useRef<HTMLInputElement>(null);
    // const [imageFile, setImageFile] = useState<File>();
    const [formData, setFormData] = useState({
        name: "",
        phoneNumber: "",
        password: "",
        confirmPassword: ""
    });

    const selectImageHandler = () => {
        if (fileRef.current) {
            fileRef.current.click();
        }
    };

    const onChange = (e: any) => {
        setFormData((prevData) => ({
            ...prevData,
            [e.target.name]: e.target.value
        }));
    };

    const { mutate: mutateRegisterOperator, isLoading } = useMutation(
        (operatorData: {
            name: string;
            phoneNumber: string;
            password: string;
        }) => registerOperator(operatorData),
        {
            onSuccess: () => {
                toast.success("Operator registered successfully");
                setFormData({
                    name: "",
                    phoneNumber: "",
                    password: "",
                    confirmPassword: ""
                });
                refetchOperators();
            },
            onError: (error: any) => {
                errorLogger(error);
            }
        }
    );

    const validateFormData = () => {
        let error = "";
        if (!formData.name) {
            error = "Name is required";
        } else if (!formData.phoneNumber) {
            error = "Phone number is required";
        } else if (formData.phoneNumber.length != 10) {
            error = "Phone number must be 10 digits";
        } else if (!formData.password) {
            error = "Password is required";
        } else if (formData.password !== formData.confirmPassword) {
            error = "Password mismatch";
        }

        return error;
    };

    const submitHandler = (event: any) => {
        event.preventDefault();
        const error = validateFormData();
        if (error) {
            toast.error(error);
            return;
        }
        mutateRegisterOperator({
            name: formData.name,
            phoneNumber: formData.phoneNumber,
            password: formData.password
        });
        closeOperatorForm();
    };

    const [isPassVisible, setIsPassVisible] = useState(false);
    const [isConfirmPassVisible, setIsConfirmPassVisible] = useState(false);

    const togglePasswordVisibility = () => {
        setIsPassVisible((prev) => !prev);
    };

    const toggleConfirmPasswordVisibility = () => {
        setIsConfirmPassVisible((prev) => !prev);
    };

    return (
        <div className="fixed left-0 top-0 z-[100] flex h-screen w-screen flex-col bg-background md:bg-opacity-75">
            <div className="flex w-full justify-end p-4 md:hidden">
                <MdClose
                    onClick={closeOperatorForm}
                    className="h-6 w-6 cursor-pointer text-white hover:opacity-75 "
                />
            </div>
            <div className="flex h-full w-full flex-col items-start justify-center gap-y-8 rounded-md border-border bg-background p-6 md:mx-auto md:my-auto md:h-auto md:w-[35%] md:border md:p-8">
                <div className="w-full space-y-2">
                    <div className="flex justify-between">
                        <h1 className="text-xl font-bold text-neutral-200">
                            Create operator
                        </h1>
                        <MdClose
                            onClick={closeOperatorForm}
                            className="hidden h-6 w-6 cursor-pointer text-white hover:opacity-75 md:block "
                        />
                    </div>
                    <p className="text-sm text-white/50">
                        Fill the details to create a new operator
                    </p>
                </div>
                <form
                    onSubmit={submitHandler}
                    className="flex w-full flex-col gap-y-4"
                >
                    {/* <fieldset className="flex items-center justify-center">
                        <div
                            onClick={selectImageHandler}
                            className="flex size-32 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-backgroundGray/30 hover:bg-backgroundGray/40"
                        >
                            {imageFile ? (
                                <img
                                    src={(() => {
                                        const url =
                                            URL.createObjectURL(imageFile);
                                        return url;
                                    })()}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <label
                                    htmlFor="image"
                                    className="cursor-pointer p-6 text-center text-sm"
                                >
                                    Image of operator
                                </label>
                            )}

                            <input
                                accept="image/png, image/jpeg"
                                type="file"
                                ref={fileRef}
                                onChange={(ev) =>
                                    ev.target.files &&
                                    setImageFile(ev.target.files[0])
                                }
                                className="hidden"
                                name="image"
                            />
                        </div>
                    </fieldset> */}
                    <fieldset className="flex flex-col justify-center gap-2 rounded-md ">
                        <label htmlFor="name">Name of the Operator</label>
                        <input
                            id="name"
                            required
                            type="text"
                            className="flex w-full appearance-none items-center rounded-md border border-border bg-transparent p-3 text-sm text-white placeholder:text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:required:border-red-400 md:text-lg"
                            name="name"
                            value={formData.name}
                            placeholder="Enter Name"
                            onChange={onChange}
                        />
                    </fieldset>
                    <fieldset className="flex flex-col justify-center gap-2 rounded-md ">
                        <label htmlFor="phoneNumber">
                            Phone number of the Operator
                        </label>
                        <input
                            id="phoneNumber"
                            required
                            type="number"
                            className="flex w-full appearance-none items-center rounded-md border border-border bg-transparent p-3 text-sm text-white placeholder:text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:required:border-red-400 md:text-lg"
                            name="phoneNumber"
                            value={formData.phoneNumber}
                            placeholder="Enter Phone Number"
                            onChange={onChange}
                        />
                    </fieldset>
                    <fieldset className="flex flex-col justify-center gap-2 rounded-md ">
                        <label htmlFor="password">
                            Password for the Operator
                        </label>
                        <div className="relative flex items-center">
                            <input
                                id="password"
                                required
                                type={isPassVisible ? "text" : "password"}
                                className="flex w-full appearance-none items-center rounded-md border border-border bg-transparent p-3 text-sm text-white placeholder:text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:required:border-red-400 md:text-lg"
                                name="password"
                                value={formData.password}
                                placeholder="Enter Password"
                                onChange={onChange}
                            />
                            <MdVisibility
                                size={20}
                                onClick={togglePasswordVisibility}
                                className="absolute right-6 cursor-pointer text-white"
                            />
                        </div>
                    </fieldset>
                    <fieldset className="flex flex-col justify-center gap-2 rounded-md ">
                        <label htmlFor="confirmPassword">
                            Confirm Password for the Operator
                        </label>
                        <div className="relative flex items-center">
                            <input
                                id="confirmPassword"
                                required
                                type={
                                    isConfirmPassVisible ? "text" : "password"
                                }
                                className="flex w-full appearance-none items-center rounded-md border border-border bg-transparent p-3 text-sm text-white placeholder:text-sm placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:required:border-red-400 md:text-lg"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                placeholder="Enter Password"
                                onChange={onChange}
                            />
                            <MdVisibility
                                size={20}
                                onClick={toggleConfirmPasswordVisibility}
                                className="absolute right-6 cursor-pointer text-white"
                            />
                        </div>
                    </fieldset>
                    <fieldset>
                        <button
                            disabled={isLoading}
                            type="submit"
                            className="w-full rounded-md border border-green-500 bg-green-500 p-2.5 text-sm font-semibold text-white hover:scale-[98%]"
                        >
                            Submit
                        </button>
                    </fieldset>
                </form>
            </div>
        </div>
    );
};
export default OperatorForm;
