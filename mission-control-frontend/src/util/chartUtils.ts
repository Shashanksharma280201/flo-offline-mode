import { scaleTime } from "d3";
import dayjs from "dayjs";

const monthFormat = (date: number) => {
    return dayjs(date).format("h:mm:ss A");
};

export const getXAxisArgsForTimeBasedGraph = (numericValues: number[]) => {
    const maxValue = Math.max(...numericValues);
    const minValue = Math.min(...numericValues);
    const timeScale = scaleTime().domain([minValue, maxValue]).nice(5);
    return {
        scale: timeScale,
        type: "number",
        domain: timeScale.domain(),
        tickFormatter: monthFormat,
        ticks: timeScale.ticks(5)
    };
};
