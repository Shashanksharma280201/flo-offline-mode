import { toast } from "react-toastify";

export const errorLogger = (error: any) => {
    if (Array.isArray((error as any).response.data.error)) {
        (error as any).response.data.error.forEach((el: any) =>
            toast.error(el.message, {
                position: "top-right",
                closeOnClick: true,
                pauseOnHover: true,
                autoClose: 3000
            })
        );
    } else if ((error as any).response.data.message) {
        toast.error((error as any).response.data.message, {
            position: "top-right",
            closeOnClick: true,
            pauseOnHover: true,
            autoClose: 3000
        });
    } else {
        toast.error(error.response.statusText || error.message, {
            position: "top-right",
            closeOnClick: true,
            pauseOnHover: true,
            autoClose: 3000
        });
    }
};
