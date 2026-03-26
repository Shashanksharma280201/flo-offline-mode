export const indianNumberFormat = (num: number | string) => {
    if (!num) return "";
    return new Intl.NumberFormat("en-IN").format(Number(num));
};
export const removeCommas = (value: string) => value.replace(/,/g, "");
