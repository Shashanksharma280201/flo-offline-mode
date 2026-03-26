import React from "react";
import { Editor } from "@tiptap/react";
import {
    Bold,
    Italic,
    Underline,
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    Quote,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Image as ImageIcon,
    Youtube as YoutubeIcon,
    Link as LinkIcon,
    Undo,
    Redo,
    Code
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "react-toastify";
import { uploadMediaFn } from "../services/blogService";

interface EditorToolbarProps {
    editor: Editor | null;
}

const ToolbarButton = ({
    onClick,
    isActive = false,
    children,
    title
}: {
    onClick: () => void;
    isActive?: boolean;
    children: React.ReactNode;
    title?: string;
}) => (
    <button
        onClick={onClick}
        title={title}
        className={cn(
            "rounded p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white",
            isActive && "bg-white/20 text-white"
        )}
        type="button"
    >
        {children}
    </button>
);

const EditorToolbar: React.FC<EditorToolbarProps> = ({ editor }) => {
    if (!editor) {
        return null;
    }

    const setLink = () => {
        const previousUrl = editor.getAttributes("link").href;
        const url = window.prompt("URL", previousUrl);

        if (url === null) {
            return;
        }

        if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
        }

        editor
            .chain()
            .focus()
            .extendMarkRange("link")
            .setLink({ href: url })
            .run();
    };

    const addYoutubeVideo = () => {
        const url = prompt("Enter YouTube URL");

        if (url) {
            const regex =
                /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
            const match = url.match(regex);

            if (match && match[1]) {
                const videoId = match[1];
                editor.commands.setYoutubeVideo({
                    src: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1`
                });
            } else {
                toast.error("Invalid YouTube URL");
            }
        }
    };

    const handleImageUpload = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = async () => {
            if (input.files?.length) {
                const file = input.files[0];
                const toastId = toast.loading("Uploading image...");
                try {
                    const { url } = await uploadMediaFn(file);
                    editor.chain().focus().setImage({ src: url }).run();
                    toast.update(toastId, {
                        render: "Image uploaded",
                        type: "success",
                        isLoading: false,
                        autoClose: 2000
                    });
                } catch (error) {
                    toast.update(toastId, {
                        render: "Failed to upload image",
                        type: "error",
                        isLoading: false,
                        autoClose: 3000
                    });
                }
            }
        };
        input.click();
    };

    return (
        <div className="sticky top-0 z-30 flex w-full flex-wrap items-center gap-1 border-b border-white/5 bg-slate-950/90 p-2 backdrop-blur-md">
            <div className="mr-4 flex items-center gap-1 border-r border-white/10 pr-4">
                <ToolbarButton
                    onClick={() => editor.chain().focus().undo().run()}
                    title="Undo"
                >
                    <Undo className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().redo().run()}
                    title="Redo"
                >
                    <Redo className="h-4 w-4" />
                </ToolbarButton>
            </div>

            <div className="mr-4 flex items-center gap-1 border-r border-white/10 pr-4">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    isActive={editor.isActive("bold")}
                    title="Bold"
                >
                    <Bold className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    isActive={editor.isActive("italic")}
                    title="Italic"
                >
                    <Italic className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() =>
                        editor.chain().focus().toggleUnderline().run()
                    }
                    isActive={editor.isActive("underline")}
                    title="Underline"
                >
                    <Underline className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleCode().run()}
                    isActive={editor.isActive("code")}
                    title="Code"
                >
                    <Code className="h-4 w-4" />
                </ToolbarButton>
            </div>

            <div className="mr-4 flex items-center gap-1 border-r border-white/10 pr-4">
                <ToolbarButton
                    onClick={() =>
                        editor.chain().focus().toggleHeading({ level: 2 }).run()
                    }
                    isActive={editor.isActive("heading", { level: 2 })}
                    title="H2"
                >
                    <Heading2 className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() =>
                        editor.chain().focus().toggleHeading({ level: 3 }).run()
                    }
                    isActive={editor.isActive("heading", { level: 3 })}
                    title="H3"
                >
                    <Heading3 className="h-4 w-4" />
                </ToolbarButton>
            </div>

            <div className="mr-4 flex items-center gap-1 border-r border-white/10 pr-4">
                <ToolbarButton
                    onClick={() =>
                        editor.chain().focus().toggleBulletList().run()
                    }
                    isActive={editor.isActive("bulletList")}
                    title="Bullet List"
                >
                    <List className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() =>
                        editor.chain().focus().toggleOrderedList().run()
                    }
                    isActive={editor.isActive("orderedList")}
                    title="Ordered List"
                >
                    <ListOrdered className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() =>
                        editor.chain().focus().toggleBlockquote().run()
                    }
                    isActive={editor.isActive("blockquote")}
                    title="Quote"
                >
                    <Quote className="h-4 w-4" />
                </ToolbarButton>
            </div>

            <div className="mr-4 flex items-center gap-1 border-r border-white/10 pr-4">
                <ToolbarButton
                    onClick={() =>
                        editor.chain().focus().setTextAlign("left").run()
                    }
                    isActive={editor.isActive({ textAlign: "left" })}
                    title="Align Left"
                >
                    <AlignLeft className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() =>
                        editor.chain().focus().setTextAlign("center").run()
                    }
                    isActive={editor.isActive({ textAlign: "center" })}
                    title="Align Center"
                >
                    <AlignCenter className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() =>
                        editor.chain().focus().setTextAlign("right").run()
                    }
                    isActive={editor.isActive({ textAlign: "right" })}
                    title="Align Right"
                >
                    <AlignRight className="h-4 w-4" />
                </ToolbarButton>
            </div>

            <div className="flex items-center gap-1">
                <ToolbarButton
                    onClick={setLink}
                    isActive={editor.isActive("link")}
                    title="Link"
                >
                    <LinkIcon className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton onClick={handleImageUpload} title="Image">
                    <ImageIcon className="h-4 w-4" />
                </ToolbarButton>
                <ToolbarButton onClick={addYoutubeVideo} title="YouTube">
                    <YoutubeIcon className="h-4 w-4" />
                </ToolbarButton>
            </div>
        </div>
    );
};

export default EditorToolbar;
