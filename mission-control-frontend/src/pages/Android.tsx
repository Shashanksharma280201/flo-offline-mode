import React, { useEffect, useRef, useState } from "react";
import { MdAndroid } from "react-icons/md";
import SignIn from "../assets/signIn.png";
import Progress from "../assets/uploadProgress.png";
import Loading from "../assets/loadingMaterials.png";
import { useMutation } from "react-query";
import { fetchUrlForApp } from "../features/android/androidService";
import { errorLogger } from "../util/errorLogger";
import { toast } from "react-toastify";

const IMAGES = [SignIn, Loading, Progress];

/**
 * Page to showcase the FloTrips mobile app along with the
 * functionality to download the recent version
 */
const Android = () => {
    const [currentImage, setCurrentImage] = useState(0);
    const [appUrl, setAppUrl] = useState<string | undefined>(undefined);
    const [apkVersion, setApkVersion] = useState<string>("0.1.0");

    /**
     * Handles fetching APK url along with APK version
     */
    const { mutate: fetchApkUrl } = useMutation(() => fetchUrlForApp(), {
        onSuccess: (data) => {
            setAppUrl(data.url);
            setApkVersion(data.version);
        },
        onError: (error: any) => errorLogger(error)
    });

    useEffect(() => {
        fetchApkUrl();

        // Logic for the image carousel
        const intervalId = setInterval(() => {
            setCurrentImage((prev) => {
                if (prev === IMAGES.length - 1) {
                    return 0;
                } else return prev + 1;
            });
        }, 2000);

        return () => clearInterval(intervalId);
    }, []);

    const apkDownloadHandler = () => {
        if (!appUrl) {
            toast.error("No Available App found.");
            return;
        }
    };

    return (
        <>
            <div className="shape fixed top-0 z-0" />
            <div className="flex min-h-screen flex-wrap  items-center justify-around gap-10 p-8 md:flex-row md:gap-0">
                <div className="z-10 flex max-w-[1200px] flex-col justify-center gap-5 text-center md:text-left ">
                    <h1 className="text-center  text-3xl font-bold tracking-wide text-primary600 md:text-6xl ">
                        Flo Trips{" "}
                        <span className="font-normal tracking-wide text-white">
                            v{apkVersion}
                        </span>
                    </h1>
                    <a
                        rel="noreferrer"
                        href={appUrl}
                        download="FloTrip"
                        onClick={apkDownloadHandler}
                        className="text-md flex w-full cursor-pointer items-center justify-between gap-3 self-center rounded-md bg-primary600 px-5 py-3 hover:bg-primary700 md:w-72 md:self-start"
                    >
                        <span className="text-md md:">Download</span>
                        <MdAndroid className="text-3xl text-white" />
                    </a>
                </div>
                <div className="image h-[600px] md:h-[800px]">
                    <img
                        src={IMAGES[currentImage]}
                        className="h-full w-auto rounded-md border-black"
                    />
                </div>
            </div>
        </>
    );
};

export default Android;
