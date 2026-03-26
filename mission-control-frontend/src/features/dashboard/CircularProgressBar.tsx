const CircularProgressBar = ({
    stroke = "#FFFFFF",
    strokeWidth = 10,
    background = "#40404044",
    diameter = 150,
    thresholdColor,
    percentage,
    title,
    value,
    units
}: {
    stroke?: string;
    strokeWidth?: number;
    background?: string;
    diameter?: number;
    percentage: number;
    thresholdColor?: string;
    title: string;
    value: string;
    units: string;
}) => {
    const coordinateForCircle = diameter / 2;
    const radius = (diameter - 2 * strokeWidth) / 2;

    // Clamp percentage between 0 and 100
    let percentageValue = Math.max(0, Math.min(100, percentage));

    // Adjust for 70% of the circle
    const startAngle = 225; // Start at the bottom left
    const sweepAngle = 270; // Cover 270 degrees (which is about 75% of a full circle)

    return (
        <div className="flex flex-col items-center justify-center rounded-md bg-backgroundGray/30 p-6">
            <div className="relative flex items-center justify-center">
                <svg
                    width={diameter}
                    height={diameter}
                    viewBox={`0 0 ${diameter} ${diameter}`}
                >
                    {/* Background circle */}
                    <path
                        d={describeArc(
                            coordinateForCircle,
                            coordinateForCircle,
                            radius,
                            startAngle,
                            startAngle + sweepAngle
                        )}
                        fill="none"
                        strokeLinecap="round"
                        stroke={background}
                        strokeWidth={strokeWidth}
                    />

                    {/* Progress circle */}
                    <path
                        d={describeArc(
                            coordinateForCircle,
                            coordinateForCircle,
                            radius,
                            startAngle,
                            startAngle + (sweepAngle * percentageValue) / 100
                        )}
                        fill="none"
                        stroke={thresholdColor ? thresholdColor : stroke}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                    />
                </svg>
                <span className="absolute text-4xl font-medium">{value}</span>
                <span className="absolute  bottom-[15%] text-secondary">
                    {units}
                </span>
            </div>
            <span className="text-center">{title}</span>
        </div>
    );
};

// Utility function to describe an arc
function polarToCartesian(
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number
) {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians)
    };
}

function describeArc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number
) {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);

    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

    const d = [
        "M",
        start.x,
        start.y,
        "A",
        radius,
        radius,
        0,
        largeArcFlag,
        0,
        end.x,
        end.y
    ].join(" ");

    return d;
}

export default CircularProgressBar;
