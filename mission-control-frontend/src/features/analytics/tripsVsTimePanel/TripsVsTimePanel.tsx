import { memo, useEffect, useState } from "react";
import {
    Bar,
    BarChart,
    Brush,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import { ProcessedAppData } from "../../../data/types/appDataTypes";
import { colors } from "@/util/constants";
import dayjs from "dayjs";

const COLORS_400 = colors.COLORS_400();

const getTripsVsTimeData = (data: ProcessedAppData) => {
    const trips =  data.appSessionData.reduce((trips, session)=>{
        const date = dayjs(session.loadingStartTimestamp).format("DD/MM/YYYY")
        if (trips[date]){
            trips[date]["totalTrips"]  += 1 
            trips[date][session.loadingMaterialType] = (trips[date][session.loadingMaterialType] || 0)+1
        } else{ 
            trips[date] = {
                [session.loadingMaterialType]: 1,
                totalTrips: 1
            }
        }
        return trips
    }, {} as {[date:string]:any})
   
    const dateArr = Object.keys(trips).map((date, index) => ({
        date: date,
        ...trips[date]
    }))
   
   const materialNames = data.appSessionData.reduce((materialNames, session)=>{
        materialNames.add(session.loadingMaterialType)
        return materialNames
   }, new Set<string>())

   return {dateArr, materialNames: Array.from(materialNames)}
};


/**
 * Bar chart for number of trips for all the days worked. 
 */
const TripsVsTimePanel = ({ data }: { data: ProcessedAppData }) => {
    const [trips, setTrips] = useState< {
        [key: string]: any;
    }[]>([]);
    const [materialNames, setMaterialNames] = useState<string[]>([])
    useEffect(() => {
        const {dateArr, materialNames} = getTripsVsTimeData(data);
        setTrips(dateArr);
        setMaterialNames(materialNames)
    }, [data]);

    const CustomTooltip = ({
        active,
        payload,
        label
    }: {
        active?: any;
        payload?: any;
        label?: any;
    }) => {
        
        

        if (active && payload && payload.length ) {
            return (
                <div className="flex flex-col gap-2 rounded-md bg-white p-3">
                    <h3 className="text-black">{label}</h3>
                    <h3 className="text-black">Total Trips: {payload[0].payload.totalTrips}</h3>
                    {/* @ts-ignore */}
                    {[...payload].reverse().map((item) => (
                        <div
                            style={{ color: item.fill }}
                            className="flex gap-2"
                            key={item.name}
                        >
                            <span>{item.name}</span>
                            <span>
                                {item.value}
                            </span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };


    return (
        <ResponsiveContainer
            width="100%"
            className="min-h-[30vh]  -translate-x-2 md:translate-x-0"
        >
            <BarChart data={trips}>
                <XAxis dataKey="date" />
                <Tooltip
                   content={<CustomTooltip />} 
                />
                <YAxis />
                {materialNames.map((name, index) => (
                    <Bar
                        maxBarSize={50}
                        key={index}
                        dataKey={name}
                        stackId="a"
                        fill={ COLORS_400[index*2 % COLORS_400.length]}
                    />
                ))}
                <Legend
                    wrapperStyle={{
                        bottom: -5
                    }}
                />
                <Brush
                    endIndex={trips && trips.length > 5 ? 5 : undefined}
                    dataKey="date"
                    height={30}
                    fill="#191414"
                />
            </BarChart>
        </ResponsiveContainer>
    );
};

export default memo(TripsVsTimePanel);