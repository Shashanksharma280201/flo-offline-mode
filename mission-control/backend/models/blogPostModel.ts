import mongoose, { Schema, Document, Types } from "mongoose";

export interface IBlogPost extends Document {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  coverImage: string;
  status: "draft" | "published" | "archived";
  tags: string[];
  readTimeMinutes: number;
  author: {
    name: string;
    role?: string;
    avatar?: string;
  };
  seo?: {
    title?: string;
    description?: string;
  };
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BlogPostSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Please add a title"],
      trim: true
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    content: {
      type: String,
      required: [true, "Please add content"]
    },
    excerpt: {
      type: String,
      required: [true, "Please add an excerpt"],
      maxLength: 300
    },
    coverImage: {
      type: String,
      required: [true, "Please add a cover image"]
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true
    },
    tags: {
      type: [String],
      default: []
    },
    readTimeMinutes: {
      type: Number,
      default: 0
    },
    author: {
      name: { type: String, required: true },
      role: String,
      avatar: String
    },
    seo: {
      title: String,
      description: String
    },
    publishedAt: Date
  },
  {
    timestamps: true
  }
);

BlogPostSchema.index({ title: "text", "author.name": "text" });

export default mongoose.model<IBlogPost>("BlogPost", BlogPostSchema);
