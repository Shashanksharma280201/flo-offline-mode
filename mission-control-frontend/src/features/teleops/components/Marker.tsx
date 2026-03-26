import { FaMapMarkerAlt } from "react-icons/fa";

type MarkerProps = {
    lat: number;
    lng: number;
    name: string;
    className?: string;
};

const Marker = ({ lat, lng, name, className }: MarkerProps) => {
    return (
        <div // @ts-ignore
            lat={lat}
            // @ts-ignore
            lng={lng}
            className={`flex flex-col ${className} items-center justify-center `}
        >
            <FaMapMarkerAlt className="h-8 w-8 text-red-600" />
            <span className="text-center text-black">{name}</span>
        </div>
    );
};
export default Marker;
