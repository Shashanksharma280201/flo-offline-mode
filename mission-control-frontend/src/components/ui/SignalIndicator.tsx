import {
    MdSignalWifiStatusbar1Bar,
    MdSignalWifiStatusbar2Bar,
    MdSignalWifiStatusbar3Bar,
    MdSignalWifiStatusbar4Bar
} from "react-icons/md";

type SignalIndicatorProps = {
    ping: number;
    className: string;
};

const SignalIndicator = ({ ping, className }: SignalIndicatorProps) => {
    if (ping > 100) {
        return <MdSignalWifiStatusbar1Bar className={`${className}`} />;
    } else if (ping > 70) {
        return <MdSignalWifiStatusbar2Bar className={`${className}`} />;
    } else if (ping > 40) {
        return <MdSignalWifiStatusbar3Bar className={`${className}`} />;
    } else return <MdSignalWifiStatusbar4Bar className={`${className}`} />;
};
export default SignalIndicator;
