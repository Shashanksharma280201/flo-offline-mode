import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import slugify from "slugify";
import BlogPost from "../models/blogPostModel";
import { uploadBlogMedia } from "../utils/blogMedia";

const calculateReadTime = (content: string): number => {
  const text = content.replace(/<[^>]*>?/gm, "");
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words / 200);
};

/**
 * @desc    Get all blog posts (Public)
 * @route   GET /api/v1/blog
 * @access  Public
 */
export const getPosts = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const { search, status, tag } = req.query;

  const query: any = {};

  if (status) query.status = status;
  if (tag) query.tags = tag;
  if (search) query.$text = { $search: search as string };

  const skip = (page - 1) * limit;

  const [posts, total] = await Promise.all([
    BlogPost.find(query)
      .sort({ publishedAt: -1, createdAt: -1 })
      .select("-content")
      .skip(skip)
      .limit(limit),
    BlogPost.countDocuments(query)
  ]);

  res.json({
    posts,
    page,
    pages: Math.ceil(total / limit),
    total
  });
});

/**
 * @desc    Get single blog post by ID (Internal/Editor use)
 * @route   GET /api/v1/blog/id/:id
 * @access  Protected
 */
export const getPostById = asyncHandler(async (req: Request, res: Response) => {
  const post = await BlogPost.findById(req.params.id);
  if (!post) {
    res.status(404);
    throw new Error("Blog post not found");
  }
  res.json(post);
});

/**
 * @desc    Create a blog post
 * @route   POST /api/v1/blog
 * @access  Private (manage_blogs)
 */
export const createPost = asyncHandler(async (req: Request, res: Response) => {
  const { title, content, excerpt, coverImage, status, tags, author, seo } =
    req.body;

  const baseSlug = slugify(title, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;

  // eslint-disable-next-line no-await-in-loop
  while (await BlogPost.findOne({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  const readTime = calculateReadTime(content);

  const post = await BlogPost.create({
    title,
    slug,
    content,
    excerpt,
    coverImage,
    status: status || "draft",
    tags,
    readTimeMinutes: readTime,
    author,
    seo,
    publishedAt: status === "published" ? new Date() : undefined
  });

  res.status(201).json(post);
});

/**
 * @desc    Update a blog post
 * @route   PUT /api/v1/blog/:id
 * @access  Private (manage_blogs)
 */
export const updatePost = asyncHandler(async (req: Request, res: Response) => {
  const post = await BlogPost.findById(req.params.id);

  if (!post) {
    res.status(404);
    throw new Error("Blog post not found");
  }

  const { title, content, excerpt, coverImage, status, tags, author, seo } =
    req.body;

  if (content) {
    post.content = content;
    post.readTimeMinutes = calculateReadTime(post.content);
  }

  if (title) post.title = title;
  if (excerpt) post.excerpt = excerpt;
  if (coverImage) post.coverImage = coverImage;
  if (tags) post.tags = tags;
  if (author) post.author = author;
  if (seo) post.seo = seo;

  if (status) {
    if (
      status === "published" &&
      post.status !== "published" &&
      !post.publishedAt
    ) {
      post.publishedAt = new Date();
    }
    post.status = status;
  }

  const updatedPost = await post.save();
  res.json(updatedPost);
});

/**
 * @desc    Delete a blog post
 * @route   DELETE /api/v1/blog/:id
 * @access  Private (manage_blogs)
 */
export const deletePost = asyncHandler(async (req: Request, res: Response) => {
  const post = await BlogPost.findById(req.params.id);

  if (!post) {
    res.status(404);
    throw new Error("Blog post not found");
  }

  await post.deleteOne();
  res.json({ message: "Post removed" });
});

/**
 * @desc    Upload media for blog
 * @route   POST /api/v1/blog/upload
 * @access  Private (manage_blogs)
 */
export const uploadMedia = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400);
    throw new Error("No file uploaded");
  }

  const url = await uploadBlogMedia(req.file);

  res.json({
    url,
    key: url.split(".amazonaws.com/")[1]
  });
});
