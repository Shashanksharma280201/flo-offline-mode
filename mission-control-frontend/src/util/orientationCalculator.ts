import { Quaternion, Vector3 } from "three";
import { IQuaternion } from "../data/types";

// export const getQuaternion = (v1: Vector3, v2: Vector3): Quaternion => {
//     return new Quaternion().setFromUnitVectors(v1.normalize(), v2.normalize());
// };
export const getQuaternion = (v1: Vector3, v2: Vector3): IQuaternion => {
    let dir = v2.clone().sub(v1);
    dir.normalize();

    const theta = Math.atan2(dir.y, dir.x);

    return {
        x: 0,
        y: 0,
        z: Math.sin(theta / 2),
        w: Math.cos(theta / 2)
    };
};

export const getYaw = (v1: Vector3, v2: Vector3): number => {
    let dir = v2.clone().sub(v1);
    dir.normalize();

    const theta = Math.atan2(dir.y || Number.EPSILON, dir.x);

    return theta;
};
