import { IPosition, IQuaternion } from "../data/types";
import { Quaternion, Vector3 } from "three";

export const rosToThreeJs = (
    rosPosition?: IPosition,
    rosRotation?: IQuaternion
) => {
    const result: {
        position?: IPosition;
        rotation?: IQuaternion;
        vecPos?: Vector3;
        quatRotation?: Quaternion;
    } = {};

    if (rosPosition) {
        const transformedPosition: IPosition = rosPosition;
        transformedPosition.x = rosPosition.x;
        transformedPosition.y = -rosPosition.z;
        transformedPosition.z = -rosPosition.y;

        const vecPos = new Vector3(
            transformedPosition.x,
            transformedPosition.y,
            transformedPosition.z
        );

        result.position = transformedPosition;
        result.vecPos = vecPos;
    }
    if (rosRotation) {
        const transformedRotation: IQuaternion = rosRotation;
        transformedRotation.y = -rosRotation.z;
        transformedRotation.z = -rosRotation.y;
        transformedRotation.w = -rosRotation.w;

        const quatRotation = new Quaternion(
            transformedRotation.x,
            transformedRotation.z,
            transformedRotation.y,
            transformedRotation.w
        );

        result.rotation = transformedRotation;
        result.quatRotation = quatRotation;
    }

    return result;
};

export const threeJsToRos = (
    vecPosition?: Vector3,
    quatRotation?: Quaternion
) => {
    const result: {
        position?: IPosition;
        rotation?: IQuaternion;
        newVecPos?: Vector3;
        newQuatRotation?: Quaternion;
    } = {};

    if (vecPosition) {
        const transformedPosition = {
            x: vecPosition.x,
            y: -vecPosition.z,
            z: -vecPosition.y
        };
        const newVecPos = new Vector3(
            transformedPosition.x,
            transformedPosition.y,
            transformedPosition.z
        );

        result.position = transformedPosition;
        result.newVecPos = newVecPos;
        // console.log("after trans", transformedPosition);
    }

    if (quatRotation) {
        const transformedRotation = {
            x: quatRotation.x,
            y: -quatRotation.z,
            z: -quatRotation.y,
            w: -quatRotation.w
        };

        const newQuatRotation = new Quaternion(
            transformedRotation.x,
            transformedRotation.z,
            transformedRotation.y,
            transformedRotation.w
        );

        result.rotation = transformedRotation;
        result.newQuatRotation = newQuatRotation;
    }

    return result;
};

export const dbToThreeJs = (
    dbPosition?: IPosition,
    dbRotation?: IQuaternion
) => {
    const result: {
        vecPos?: Vector3 | undefined;
        quatRotation?: Quaternion | undefined;
    } = {};
    if (dbPosition) {
        const vecPos = new Vector3(dbPosition.x, dbPosition.y, dbPosition.z);

        result.vecPos = vecPos;
    }
    if (dbRotation) {
        const quatRotation = new Quaternion(
            dbRotation.x,
            dbRotation.y,
            dbRotation.z,
            dbRotation.w
        );
        result.quatRotation = quatRotation;
    }
    console.log(result);
    return result;
};

export const threeJsToDb = (
    vecPosition?: Vector3,
    quatRotation?: Quaternion
) => {
    const result: {
        position?: IPosition;
        rotation?: IQuaternion;
    } = {};

    if (vecPosition) {
        const transformedPosition = {
            x: vecPosition.x,
            y: vecPosition.y,
            z: vecPosition.z
        };

        result.position = transformedPosition;
    }
    if (quatRotation) {
        const transformedRotation = {
            x: quatRotation.w,
            z: quatRotation.z,
            y: quatRotation.y,
            w: quatRotation.w
        };

        result.rotation = transformedRotation;
    }

    return result;
};
