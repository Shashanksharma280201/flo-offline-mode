export type BlogStatus = "draft" | "published" | "archived";

export interface Author {
    id?: string;
    name: string;
    role?: string;
    avatar?: string;
}

export interface BlogSEO {
    title?: string;
    description?: string;
}

export interface BlogPost {
    _id: string;
    title: string;
    slug: string;
    content: string; // HTML string
    excerpt: string;
    coverImage: string; // S3 URL
    author: Author;
    tags: string[];
    status: BlogStatus;
    publishedAt?: string; // ISO Date
    createdAt: string;
    updatedAt: string;
    seo?: BlogSEO;
    readTimeMinutes?: number;
}

export interface BlogPayload {
    title: string;
    slug?: string;
    content: string;
    excerpt?: string;
    coverImage?: string;
    tags?: string[];
    status?: BlogStatus;
    seo?: BlogSEO;
    author?: Partial<Author>;
}

export interface BlogUploadResponse {
    url: string;
    key: string;
}
