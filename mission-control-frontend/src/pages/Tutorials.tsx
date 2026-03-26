import ComboBox from "@/components/comboBox/ComboBox";
import Header from "@/components/header/Header";
import Popup from "@/components/popup/Popup";
import SmIconButton from "@/components/ui/SmIconButton";
import {
    Tutorial,
    TutorialPayload,
    TutorialTag
} from "@/data/types/tutorialTypes";
import {
    deleteTutorialFn,
    fetchTutorialsFn,
    postTutorialFn,
    updateTutorialFn
} from "@/features/tutorials/services/tutorialService";
import { errorLogger } from "@/util/errorLogger";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { FaYoutube } from "react-icons/fa";
import { useMutation } from "react-query";
import { toast } from "react-toastify";

const Tutorials = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedTutorial, setSelectedTutorial] = useState<Tutorial>();
    const [tutorials, setTutorials] = useState<Tutorial[]>([]);
    const [selectedTag, setSelectedTag] = useState<TutorialTag | "all">("all");
    const [searchValue, setSearchValue] = useState("");
    const [isVideoOpen, setIsVideoOpen] = useState(false);

    const filterBasedOnTag = (tutorial: TutorialPayload) => {
        if (selectedTag === "all") return true;
        if (tutorial.tag === selectedTag) return true;
        return false;
    };

    const filterBasedOnSearch = (tutorial: TutorialPayload) => {
        if (searchValue === "") return true;
        const reSearchValue = searchValue.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );
        const re = new RegExp(reSearchValue, "i");

        if (tutorial.title.match(re)) return true;
        return false;
    };

    const fetchTutorialsMutation = useMutation({
        mutationFn: () => fetchTutorialsFn(),
        onSuccess: (data) => {
            console.log(data);
            setTutorials(data);
        },
        onError: (error) => errorLogger(error)
    });
    const createTutorialMutation = useMutation({
        mutationFn: (tutorial: TutorialPayload) => postTutorialFn(tutorial),
        onSuccess: () => {
            toast.success("Tutorial added successfully");
            setIsOpen(false);
            fetchTutorialsMutation.mutate();
        },
        onError: (error) => errorLogger(error)
    });

    const updateTutorialMutation = useMutation({
        mutationFn: ({
            id,
            tutorial
        }: {
            id: string;
            tutorial: TutorialPayload;
        }) => updateTutorialFn(id, tutorial),
        onSuccess: () => {
            toast.success("Tutorial updated successfully");
            setIsOpen(false);
            fetchTutorialsMutation.mutate();
        },
        onError: (error) => errorLogger(error)
    });

    const filteredTutorials = tutorials
        .filter(filterBasedOnTag)
        .filter(filterBasedOnSearch);

    useEffect(() => {
        fetchTutorialsMutation.mutate();
    }, []);

    const handleSubmit = (data: TutorialPayload) => {
        if (selectedTutorial) {
            updateTutorialMutation.mutate({
                id: selectedTutorial._id,
                tutorial: data
            });
        } else {
            createTutorialMutation.mutate(data);
        }
    };

    const deleteTutorialMutation = useMutation({
        mutationFn: (id: string) => deleteTutorialFn(id),
        onSuccess: () => {
            toast.success("Tutorial deleted successfully");
            setIsOpen(false);
            fetchTutorialsMutation.mutate();
        },
        onError: (error) => errorLogger(error)
    });

    const handleDelete = () => {
        if (selectedTutorial) {
            deleteTutorialMutation.mutate(selectedTutorial._id);
        }
    };

    return (
        <>
            <Header title="Tutorials">
                <button
                    onClick={() => {
                        setSelectedTutorial(undefined);
                        setIsOpen(true);
                    }}
                    className=" rounded-md border border-border p-2 px-6 hover:bg-slate-300 hover:text-black"
                >
                    Add tutorial
                </button>
            </Header>
            <div className="mx-auto flex h-full w-full flex-col bg-blue-900/25 md:gap-6 md:p-8 md:py-8">
                <div className="flex w-full divide-x  divide-border border-y border-border md:rounded-md md:border">
                    <div className="w-fit">
                        <ComboBox
                            nullable={false}
                            label="Tag"
                            items={
                                [
                                    "all",
                                    "maintenance",
                                    "operations",
                                    "troubleshooting",
                                    "mobile app"
                                ] as (TutorialTag | "all")[]
                            }
                            selectedItem={selectedTag}
                            setSelectedItem={setSelectedTag}
                            getItemLabel={(tag) =>
                                tag.charAt(0).toUpperCase() + tag.slice(1) || ""
                            }
                            wrapperClassName="border-none px-4"
                            compareItems={(itemOne, itemTwo) =>
                                itemOne === itemTwo
                            }
                            showLabel={false}
                            isSelect={true}
                        />
                    </div>
                    <input
                        className="flex w-full  items-center divide-border bg-transparent px-4 py-3 outline-none md:divide-x"
                        placeholder="Search tutorials"
                        value={searchValue}
                        onChange={(event) => setSearchValue(event.target.value)}
                    />
                </div>

                <div className="flex border-collapse flex-col divide-border rounded-md border-border p-2 md:border">
                    {filteredTutorials.length ? (
                        filteredTutorials.map((item) => {
                            return (
                                <div
                                    key={item._id}
                                    className="flex items-center justify-between gap-3 rounded-xl p-6 hover:bg-gray-900 md:gap-1"
                                >
                                    <div
                                        onClick={() => {
                                            setSelectedTutorial(item);
                                            setIsOpen(true);
                                        }}
                                        className="flex cursor-pointer flex-col items-start  justify-center gap-4"
                                    >
                                        <h1>{item.title}</h1>
                                        <span className="rounded-full bg-backgroundGray px-3 py-1 text-sm">
                                            {item.tag.charAt(0).toUpperCase() +
                                                item.tag.slice(1)}
                                        </span>
                                    </div>
                                    <FaYoutube
                                        className="h-6 w-6 cursor-pointer text-white"
                                        onClick={() => {
                                            setSelectedTutorial(item);
                                            setIsVideoOpen(true);
                                        }}
                                    />
                                </div>
                            );
                        })
                    ) : (
                        <span className="self-center p-8">
                            No tutorials found
                        </span>
                    )}
                </div>
            </div>
            <AddOrEditTutorialPopup
                selectedTutorial={selectedTutorial}
                isOpen={isOpen}
                onDelete={handleDelete}
                setIsOpen={setIsOpen}
                onSubmit={handleSubmit}
            />
            {selectedTutorial && (
                <TutorialVideo
                    isVideoOpen={isVideoOpen}
                    setIsVideoOpen={setIsVideoOpen}
                    tutorial={selectedTutorial}
                />
            )}
        </>
    );
};

const TutorialVideo = ({
    tutorial,
    isVideoOpen,
    setIsVideoOpen
}: {
    tutorial: TutorialPayload;
    isVideoOpen: boolean;
    setIsVideoOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
    return (
        <Popup
            title={tutorial.title}
            description=""
            dialogToggle={isVideoOpen}
            panelClassName="absolute border-none  bg-[#111] rounded-none md:rounded-2xl top-0 left-0 md:static h-full w-full md:w-[48vw]"
            onClose={() => setIsVideoOpen(false)}
        >
            <iframe
                className="h-[50vh] w-full rounded-md "
                src={`https://www.youtube.com/embed/${tutorial.youtubeId}?enablejsapi=1&origin=https://fleet.flomobility.com`}
                title="Tutorial video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
            ></iframe>
        </Popup>
    );
};

const AddOrEditTutorialPopup = ({
    isOpen,
    selectedTutorial,
    setIsOpen,
    onDelete,
    onSubmit
}: {
    isOpen: boolean;
    selectedTutorial?: TutorialPayload;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    onDelete: () => void;
    onSubmit: (data: TutorialPayload) => void;
}) => {
    const { register, handleSubmit, setValue } = useForm();
    const [selectedTag, setSelectedTag] = useState<TutorialTag>("maintenance");
    const [isDeleteMode, setIsDeleteMode] = useState(false);

    const submitHandler = (data: any) => {
        const { title, youtubeId } = data;
        if (title && youtubeId && selectedTag) {
            onSubmit({ title, tag: selectedTag, youtubeId });
            setValue("title", "");
            setValue("youtubeId", "");
        }
    };

    const cancelDelete = () => {
        setIsDeleteMode(false);
    };

    const handleDelete = () => {
        if (isDeleteMode) {
            onDelete();
        }
    };

    useEffect(() => {
        setIsDeleteMode(false);
        if (selectedTutorial) {
            setValue("title", selectedTutorial.title);
            setSelectedTag(selectedTutorial.tag);
            setValue("youtubeId", selectedTutorial.youtubeId);
        } else {
            setValue("title", "");
            setValue("youtubeId", "");
        }
    }, [selectedTutorial]);

    return (
        <Popup
            title={
                selectedTutorial
                    ? isDeleteMode
                        ? "Delete tutorial?"
                        : "Edit Tutorial"
                    : "Add tutorial"
            }
            description={
                isDeleteMode
                    ? "Are you sure you want to delete this tutorial? This action cannot be undone."
                    : ""
            }
            dialogToggle={isOpen}
            onClose={() => setIsOpen(false)}
            panelClassName="absolute overflow-visible rounded-none md:rounded-2xl top-0 left-0 md:static h-full w-full text-white md:w-[40vw]"
        >
            <form
                className="flex flex-col gap-4"
                onSubmit={handleSubmit(submitHandler)}
            >
                {!isDeleteMode && (
                    <>
                        <div className="flex flex-col gap-2">
                            <label>Tutorial name</label>
                            <input
                                className="rounded-md bg-backgroundGray/30 p-2 outline-none"
                                placeholder="Name of the tutorial"
                                {...register("title")}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label>Tutorial tag</label>
                            <ComboBox
                                nullable={false}
                                label="Tag"
                                items={
                                    [
                                        "maintenance",
                                        "operations",
                                        "troubleshooting",
                                        "mobile app"
                                    ] as TutorialTag[]
                                }
                                selectedItem={selectedTag}
                                setSelectedItem={setSelectedTag}
                                getItemLabel={(tag) =>
                                    tag.charAt(0).toUpperCase() +
                                        tag.slice(1) || ""
                                }
                                wrapperClassName="bg-backgroundGray/30 border-none"
                                compareItems={(itemOne, itemTwo) =>
                                    itemOne === itemTwo
                                }
                                showLabel={false}
                                isSelect={true}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label>Youtube video ID</label>
                            <input
                                className="rounded-md bg-backgroundGray/30 p-2 outline-none"
                                placeholder="Youtube video ID"
                                {...register("youtubeId")}
                            />
                        </div>
                    </>
                )}

                <div className="flex justify-end gap-2">
                    {selectedTutorial && !isDeleteMode && (
                        <button
                            onClick={() => setIsDeleteMode(true)}
                            type="button"
                            className="self-start rounded-md bg-red-400 px-4 py-2 text-black hover:bg-red-500"
                        >
                            Delete
                        </button>
                    )}

                    {isDeleteMode ? (
                        <div className="flex gap-2">
                            <button
                                onClick={cancelDelete}
                                type="button"
                                className="rounded-md border border-border px-4 py-2 hover:bg-backgroundGray/30"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="rounded-md bg-red-400 px-4 py-2 text-black hover:bg-red-500"
                            >
                                Confirm
                            </button>
                        </div>
                    ) : (
                        <>
                            {!selectedTutorial && (
                                <button
                                    onClick={() => setIsOpen(false)}
                                    type="button"
                                    className="rounded-md border border-border px-4 py-2 hover:bg-backgroundGray/30"
                                >
                                    Cancel
                                </button>
                            )}
                            <button
                                type="submit"
                                className="rounded-md bg-white px-4 py-2 text-black hover:bg-white/80"
                            >
                                {selectedTutorial ? "Update" : "Create"}
                            </button>
                        </>
                    )}
                </div>
            </form>
        </Popup>
    );
};

const ConfirmDeletePopup = ({
    isOpen,
    setIsOpen,
    onConfirm,
    onCancel
}: {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    onConfirm: () => void;
    onCancel: () => void;
}) => {
    return (
        <Popup
            title="Delete Tutorial?"
            description="This action cannot be undone. This will
                                        permanently delete this tutorial from
                                        your account."
            dialogToggle={isOpen}
            onClose={() => setIsOpen(false)}
        >
            <div className="flex items-center justify-end gap-2 md:gap-4">
                <SmIconButton
                    name={"Cancel"}
                    className="border border-backgroundGray bg-transparent font-semibold text-white hover:bg-white/20"
                    onClick={onCancel}
                />
                <SmIconButton
                    name={"Delete"}
                    className=" border border-red-500 bg-red-500 font-semibold text-white"
                    onClick={onConfirm}
                />
            </div>
        </Popup>
    );
};

export default Tutorials;
