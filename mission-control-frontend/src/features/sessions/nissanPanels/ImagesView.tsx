import React, { useEffect, useState } from "react";
import { useMutation } from "react-query";
import {
    Anomaly,
    getNissanImagesFn,
    getNissanImageUrlFn
} from "./services/nissanService";
import { errorLogger } from "@/util/errorLogger";
import { useParams } from "react-router-dom";
import { AdvancedMarker, Map, useMap } from "@vis.gl/react-google-maps";
import { RasterMapOptions } from "@/constants/map";
import ComboBox from "@/components/comboBox/ComboBox";

type ImageType = {
    confidence: number;
    key: string;
    time: number;
    lat?: number;
    lng?: number;
    imageUrl?: string;
};
type AnomolyImages = {
    [camera: string]: ImageType[];
};

const ImagesView = () => {
    const { robotId, sessionId } = useParams();
    const [imageList, setImageList] = useState<AnomolyImages>();
    const [anomoly, setAnomoly] = useState<Anomaly>("crack");
    const [selectedImage, setSelectedImage] = useState<ImageType>();

    const fetchNissanImageMutation = useMutation({
        mutationFn: ({
            image,
            imagePath
        }: {
            image: ImageType;
            imagePath: string;
        }) => getNissanImageUrlFn(imagePath),
        onSuccess: ({ imageUrl }, { image, imagePath }) => {
            setSelectedImage({ ...image, imageUrl });
        },
        onError: errorLogger
    });

    const fetchImagesMutation = useMutation({
        mutationFn: (data: {
            deviceId: string;
            sessionId: string;
            anomoly: Anomaly;
        }) => getNissanImagesFn(data),
        onSuccess: (data) => {
            setImageList(data);
        },
        onError: errorLogger
    });

    useEffect(() => {
        if (!robotId || !sessionId) return;
        fetchImagesMutation.mutate({
            deviceId: robotId,
            sessionId,
            anomoly
        });
    }, [robotId, sessionId, anomoly]);

    return (
        <section className="grid h-screen grid-cols-1 grid-rows-4 gap-2 sm:grid-cols-2 sm:grid-rows-3 md:grid-cols-3 md:grid-rows-2">
            <div className="order-3 row-span-2  rounded-md bg-border/30 sm:order-2 sm:col-span-2 sm:row-span-2 sm:row-start-2 md:order-1 md:col-span-2 md:col-start-1 md:row-span-2 md:row-start-1">
                <ImagesList
                    onImageClick={fetchNissanImageMutation.mutate}
                    anomoly={anomoly}
                    setAnomoly={setAnomoly}
                    images={imageList}
                />
            </div>
            <div className="order-1 row-span-1 overflow-hidden rounded-md bg-border/30 sm:order-1 sm:col-span-1 sm:row-span-1 sm:row-start-1 md:order-2 md:col-span-1 md:col-start-3 md:row-span-1 md:row-start-1">
                <SelectedImage image={selectedImage} />
            </div>
            <div className="order-2 row-span-1 overflow-hidden rounded-md bg-border/30 sm:order-3 sm:col-span-1 sm:row-span-1 sm:row-start-1 md:order-3 md:col-span-1 md:col-start-3 md:row-span-1 md:row-start-2">
                <ImageLocation image={selectedImage} />
            </div>
        </section>
    );
};

const ImagesList = ({
    anomoly,
    images,
    setAnomoly,
    onImageClick
}: {
    anomoly: Anomaly;
    images?: AnomolyImages;
    setAnomoly: (anomoly: Anomaly) => void;
    onImageClick: ({
        image,
        imagePath
    }: {
        image: ImageType;
        imagePath: string;
    }) => void;
}) => {
    const { sessionId } = useParams();
    const cameras = Object.keys(images || {});
    const [selectedCamera, setSelectedCamera] = useState<string>();
    const [cameraImages, setCameraImages] = useState<ImageType[]>([]);

    useEffect(() => {
        if (images && cameras.length > 0) {
            setSelectedCamera(cameras[0]);
            setCameraImages(images[cameras[0]]);
        }
    }, [images, cameras.length]);

    const handleCameraChange = (camera: string) => {
        if (!images) return;
        setSelectedCamera(camera);
        setCameraImages(images[camera]);
    };

    if (!images) {
        return (
            <div>
                <span>No images found</span>
            </div>
        );
    }

    const handleImageClick = (image: ImageType) => {
        if (!selectedCamera) return;
        let imagePath = `${sessionId}/`;
        if (anomoly === "white-line-blur") imagePath += "F2/";
        else imagePath += "F1/";
        imagePath += `${selectedCamera}/${anomoly.replaceAll("-", "_")}/images/`;
        imagePath += image.key;
        onImageClick({ image, imagePath });
    };

    return (
        <div className="flex h-full flex-col gap-2 p-4">
            <div className="flex gap-2 p-2">
                <ComboBox
                    wrapperClassName="px-4 py-2 h-fit"
                    inputClassName="placeholder:text-sm placeholder:text-gray"
                    label=""
                    showLabel={false}
                    items={[
                        "crack",
                        "pole",
                        "pothole",
                        "crosswalk-blur",
                        "leaning-pole",
                        "white-line-blur"
                    ]}
                    selectedItem={anomoly}
                    setSelectedItem={setAnomoly}
                    getItemLabel={(item) => item}
                    placeholder={"Anomolies"}
                    compareItems={(itemA, itemB) => itemA === itemB}
                />
                <ComboBox
                    wrapperClassName="px-4 py-2 h-fit"
                    inputClassName="placeholder:text-sm placeholder:text-gray"
                    label=""
                    showLabel={false}
                    items={cameras}
                    selectedItem={selectedCamera}
                    setSelectedItem={handleCameraChange}
                    getItemLabel={(item) => item}
                    placeholder={"Select camera"}
                    compareItems={(itemA, itemB) => itemA === itemB}
                />
            </div>
            <div className="h-[1px] w-full bg-border/60" />
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
                {cameraImages.map((image) => (
                    <div
                        onClick={() => handleImageClick(image)}
                        className="flex cursor-pointer justify-between rounded-sm p-2 hover:bg-border/60"
                        key={image.key}
                    >
                        <span>{image.key}</span>
                        <span className="hidden md:block">
                            {image.confidence}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SelectedImage = ({ image }: { image?: ImageType }) => {
    if (!image || !image.imageUrl) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <span>No image selected</span>
            </div>
        );
    }
    return (
        <img
            src={image.imageUrl}
            className="h-full w-full object-contain"
            alt="image"
        />
    );
};

const ImageLocation = ({ image }: { image?: ImageType }) => {
    const map = useMap("clientMap");

    useEffect(() => {
        if (!map || !image || !image.lat || !image.lng) return;
        const { lat, lng } = image;
        map.setCenter({
            lat,
            lng
        });
    }, [image, image?.lat, image?.lng]);

    if (!image || !image.lat || !image.lng) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <span>No image selected</span>
            </div>
        );
    }

    return (
        <Map
            id="nissanLocation"
            defaultCenter={{
                lat: image.lat,
                lng: image.lng
            }}
            style={{ borderRadius: "6px" }}
            mapId={RasterMapOptions.mapId}
            disableDefaultUI
            defaultZoom={15}
        >
            <AdvancedMarker
                zIndex={10}
                position={{
                    lat: image.lat,
                    lng: image.lng
                }}
            />
        </Map>
    );
};

export default ImagesView;
