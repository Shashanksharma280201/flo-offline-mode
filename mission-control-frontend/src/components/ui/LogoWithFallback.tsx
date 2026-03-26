import { HTMLAttributes, ReactElement, useState } from "react";
import { IconType } from "react-icons";

interface LogoWithFallbackProps extends HTMLAttributes<HTMLImageElement> {
    className: string;
    src: string | undefined;
    alt: string;
    fallbackComponent: ReactElement<IconType>;
}

const LogoWithFallback = (props: LogoWithFallbackProps) => {
    const [isError, setIsError] = useState(false);
    const { className, src, alt, fallbackComponent, ...rest } = props;
    return (
        <>
            {!isError ? (
                <img
                    className={className}
                    src={src}
                    alt={alt}
                    onError={() => {
                        setIsError(true);
                    }}
                    {...rest}
                />
            ) : (
                fallbackComponent
            )}
        </>
    );
};
export default LogoWithFallback;
