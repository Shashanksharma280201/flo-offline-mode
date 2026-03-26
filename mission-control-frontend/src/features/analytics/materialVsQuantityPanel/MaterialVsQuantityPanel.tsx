import { memo, useEffect, useState } from "react";
import {
    Bar,
    BarChart,
    Brush,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import { ProcessedAppData } from "../../../data/types/appDataTypes";
import { colors } from "@/util/constants";

type Material = {
    name: string;
    quantity: number;
    fill: string;
};

const COLORS_500 = colors.COLORS_500();

function getProcessedMaterial(data: ProcessedAppData) {
    const materialMap = data.appSessionData.reduce((materialMap, item) => {
        const name = item.loadingMaterialType;
        const quantity = item.loadingMaterialQuantity;

        if (materialMap[name]) {
            materialMap[name].quantity += quantity;
        } else {
            const fill =
                COLORS_500[Object.keys(materialMap).length % COLORS_500.length];
            materialMap[name] = { name, quantity, fill };
        }
        
        return materialMap
    }, {} as { [name: string]: Material });

    return Object.values(materialMap);
}

/**
 * Bar chart for Material name vs material quantity of the robot.
 */
const MaterialVsQuantityPanel = ({ data }: { data: ProcessedAppData }) => {
    const [materials, setMaterials] = useState<Material[]>();

    useEffect(() => {
        const materialArr = getProcessedMaterial(data);
        setMaterials(materialArr);
    }, [data]);

    return (
        <ResponsiveContainer
            width="100%"
            className="min-h-[30vh]  -translate-x-2 md:translate-x-0"
        >
            <BarChart data={materials}>
                <XAxis dataKey="name" />
                <Tooltip
                    cursor={{ fill: "#464646" }}
                    wrapperClassName="text-black rounded-md"
                />
                <YAxis />
                <Bar maxBarSize={50} dataKey="quantity" />

                <Brush
                    endIndex={materials && materials.length > 5 ? 5 : undefined}
                    dataKey="name"
                    height={30}
                    fill="#191414"
                />
            </BarChart>
        </ResponsiveContainer>
    );
};

export default memo(MaterialVsQuantityPanel);
