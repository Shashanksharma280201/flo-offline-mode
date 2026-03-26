import { useSpring, animated } from "react-spring";

/**
 * Animation to count up to a number
 */
export const AnimatedCounter = ({
    number,
    className,
    precision
}: {
    number: number;
    className: string;
    precision?: number;
}) => {
    const animatedEntity = useSpring({
        val: number,
        from: {
            val: 0
        }
    });
    return (
        <animated.span className={className}>
            {precision
                ? animatedEntity.val.to((val) => val.toFixed(precision))
                : animatedEntity.val.to((val) => val.toFixed(0))}
        </animated.span>
    );
};
