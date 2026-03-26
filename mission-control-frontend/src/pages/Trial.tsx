import Socket from "../features/sockets/Socket";

/**
 *
 * Sample Fleet of robots for development and testing purposes
 */
const Trial = () => {
    return (
        <div className="text-white">
            <Socket url="/v1/robot/master" name="Whitey" />
            <Socket url="/v1/robot/master" name="Maggie" />
        </div>
    );
};
export default Trial;
