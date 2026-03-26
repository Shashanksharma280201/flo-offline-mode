import LocalizedModel from "./components/LocalizedModel";
import Stations from "./components/Stations";
import Paths from "./components/Paths";
import React from "react";
import Boundaries from "./components/Boundaries";
import Obstacles from "./components/Obstacles";

const MapViz = () => {
    return (
        <>
            <LocalizedModel />
            <ambientLight color={0x606060} />
            <directionalLight position={[0, 1.75, 1]} />
            <Paths />
            <Stations />
            <Boundaries />
            <Obstacles />
        </>
    );
};
export default React.memo(MapViz);
