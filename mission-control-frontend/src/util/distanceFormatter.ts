interface FormattedDistance {
    value: number;
    unit: string;
}

export const formatDistance = (
    meters: number,
    decimals = 2
): FormattedDistance => {
    if (!+meters) return { value: 0, unit: "Meters" };

    const kilometers = meters / 1000;

    const distanceUnits = ["Meters", "Kilometers"];
    const distanceValues = [meters, kilometers];

    let i = 0;
    while (i < distanceValues.length - 1 && distanceValues[i] < 1) {
        i++;
    }

    const dm = decimals < 0 ? 0 : decimals;
    return {
        value: parseFloat(distanceValues[i].toFixed(dm)),
        unit: distanceUnits[i]
    };
};
