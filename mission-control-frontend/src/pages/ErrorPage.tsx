import { useRouteError } from "react-router-dom";

/**
 * Page shown when an error is encountered
 */
const ErrorPage = () => {
    const error: any = useRouteError();
    return (
        <div className="h-screen w-screen lg:p-64">
            <div className="flex h-full flex-col-reverse  items-center justify-center gap-x-16 gap-y-8 rounded-lg px-16 lg:flex-row lg:bg-backgroundGray">
                <section className="flex flex-col justify-center gap-y-3 ">
                    <h1 className="self-center text-3xl font-bold text-primary600 lg:self-start lg:text-4xl">
                        {error?.status ? error?.status : "Oops!"}
                    </h1>
                    <p className="text-center text-sm lg:text-left lg:text-2xl  ">
                        Sorry, an unexpected error has occurred.
                    </p>
                    <p className="text-center text-xs text-red-400 lg:text-left lg:text-base">
                        {error?.statusText ?? error.message ?? ""}
                    </p>
                </section>
                <section>
                    <img
                        className="w-36 lg:w-72 "
                        src="/errorRobot.png"
                        alt="Broken down robot"
                    />
                </section>
            </div>
        </div>
    );
};
export default ErrorPage;
