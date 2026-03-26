import { ReactNode } from "react";
import { MdArrowBack } from "react-icons/md";
import Navbar from "../nav/Navbar";

type HeaderProps = {
    title: string | ReactNode;
    children?: ReactNode;
    onBack?: () => void;
};
const Header = ({ title, children, onBack }: HeaderProps) => {
    return (
        <header className="flex flex-col bg-slate-600/55 shadow-sm">
            <div
                className={`flex min-h-[5rem] w-full items-center justify-between px-6 md:min-h-[7rem] md:px-8`}
            >
                <div className="flex items-center justify-center gap-6">
                    {onBack ? (
                        <MdArrowBack
                            onClick={onBack}
                            className="h-5 w-5 cursor-pointer text-white hover:opacity-75 md:h-6 md:w-6"
                        />
                    ) : (
                        <Navbar />
                    )}
                    <div className="text-base font-semibold md:text-xl">
                        {title}
                    </div>
                </div>
                <div>{children}</div>
            </div>
            <div>
                <div className="hidden h-[0.1vh] items-center justify-end bg-backgroundGray md:flex"></div>
            </div>
        </header>
    );
};
export default Header;
