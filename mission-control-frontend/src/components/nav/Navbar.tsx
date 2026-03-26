import { MdClose, MdMenu } from "react-icons/md";
import Navlinks from "./Navlinks";
import { useState, useEffect } from "react";
import { useUserStore } from "@/stores/userStore";

/**
 * Main navigation in the form of drawer navigation
 *
 * Links:
 * * Fleet view
 * * Robot Sessions
 * * Analytics
 * * Logout
 *
 */
const Navbar = () => {
    const [showNavBar, setShowNavBar] = useState(false);
    const user = useUserStore((state) => state.user);

// press `[` to open navbar
useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Check if user is typing in an input or textarea
            const target = event.target as HTMLElement;
            const isTyping =
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable;

            if (event.key === "[" && !isTyping) {
                setShowNavBar((prev) => !prev);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const showNavMenuHandler = () => {
        setShowNavBar(true);
    };
    const closeNavMenuHandler = () => {
        setShowNavBar(false);
    };
    return (
        <>
            <MdMenu
                onClick={showNavMenuHandler}
                className="h-5 w-5 
                cursor-pointer text-white hover:opacity-75 md:h-6 md:w-6"
            />
            {showNavBar ? (
                <div
                    onClick={closeNavMenuHandler}
                    className="fixed left-0 top-0 z-[1000] h-screen w-screen bg-slate-800 opacity-25"
                />
            ) : (
                <></>
            )}
            <div
                className={` fixed  bottom-0 left-0 top-0 z-[1045]  flex w-96 -translate-x-full flex-col border-none bg-gray-700 bg-clip-padding font-semibold  shadow-sm outline-none  transition  duration-300 ease-in-out  ${
                    showNavBar ? "visible transform-none" : "invisible"
                }`}
                tabIndex={-1}
            >
                <div className="flex flex-col gap-4 px-8 py-6 md:items-center">
                    <div className="flex w-full items-center justify-between md:justify-center">
                        <h5
                            className="text-xl font-semibold leading-normal text-green-400 md:text-2xl"
                            id="sideNavBarLabel"
                        >
                            Flo Mobility
                        </h5>

                        <button
                            type="button"
                            className="visible outline-none md:invisible"
                            onClick={closeNavMenuHandler}
                        >
                            <MdClose className="h-6 w-6 text-white hover:opacity-75" />
                        </button>
                    </div>
                    {user ? (
                        <span className="text-secondary">{user.email}</span>
                    ) : null}
                </div>
                <div className="flex-grow overflow-y-auto p-4">
                    <Navlinks />
                </div>
            </div>
        </>
    );
};

export default Navbar;
