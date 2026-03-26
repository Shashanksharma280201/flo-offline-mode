import React, { useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import EditorToolbar from "./EditorToolbar";
import { cn } from "@/lib/utils";

interface BlogEditorProps {
    content: string;
    onChange: (html: string) => void;
    editable?: boolean;
}

const YoutubeExtended = Youtube.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            src: {
                default: null,
                parseHTML: (element) => element.getAttribute("src"),
                renderHTML: (attributes) => ({
                    src: attributes.src
                })
            },
            title: {
                default: "youtube video",
                parseHTML: (element) => element.getAttribute("title"),
                renderHTML: (attributes) => ({
                    title: attributes.title
                })
            },
            loading: {
                default: "lazy",
                parseHTML: (element) => element.getAttribute("loading"),
                renderHTML: (attributes) => ({
                    loading: attributes.loading
                })
            },
            allow: {
                default:
                    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
                parseHTML: (element) => element.getAttribute("allow"),
                renderHTML: (attributes) => ({
                    allow: attributes.allow
                })
            }
        };
    }
});

const BlogEditor: React.FC<BlogEditorProps> = ({
    content,
    onChange,
    editable = true
}) => {
    const hasLoadedRef = useRef(false);
    const editor = useEditor({
        extensions: [
            StarterKit,
            Image.configure({
                inline: true,
                allowBase64: true
            }),
            YoutubeExtended.configure({
                controls: true,
                nocookie: true,
                allowFullscreen: true,
                HTMLAttributes: {
                    class: "rounded-lg overflow-hidden my-8 mx-auto"
                }
            }),
            Link.configure({
                openOnClick: false,
                autolink: true,
                defaultProtocol: "https"
            }),
            Underline,
            TextAlign.configure({
                types: ["heading", "paragraph"]
            }),
            Placeholder.configure({
                placeholder: "Start writing your story..."
            })
        ],
        content: content,
        editable: editable,
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            onChange(html);
        },
        editorProps: {
            attributes: {
                class: "tiptap prose prose-invert max-w-none focus:outline-none min-h-[500px] px-8 py-6 text-slate-300 [&_img]:mx-auto [&_img]:rounded-lg [&_img]:my-8 [&_img]:block"
            }
        }
    });

    // Handle initial content load
    useEffect(() => {
        if (editor && content && !hasLoadedRef.current) {
            editor.commands.setContent(content);
            hasLoadedRef.current = true;
        }
    }, [content, editor]);

    useEffect(() => {
        if (editor) {
            editor.setEditable(editable);
        }
    }, [editable, editor]);

    return (
        <div className="flex w-full flex-col bg-transparent">
            {editable && <EditorToolbar editor={editor} />}
            <EditorContent editor={editor} className="flex-1" />
        </div>
    );
};

export default BlogEditor;
