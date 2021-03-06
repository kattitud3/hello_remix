import {
  Form,
  useActionData,
  useLoaderData,
  useTransition,
} from "@remix-run/react";

import {
  type LoaderFunction,
  type ActionFunction,
  redirect,
  json,
} from "@remix-run/node";

import { getPost, updatePost } from "~/models/post.server";
import { requireUserId } from "../../../session.server";
import invariant from "tiny-invariant";
import { type Post } from "@prisma/client";
import { PostView } from "../../../components/posts";

type LoaderData = Post;
export const loader: LoaderFunction = async ({ request, params }) => {
  invariant(params.slug, `params.slug is required`);

  const userId = await requireUserId(request);
  const post = await getPost({ userId, slug: params.slug });
  invariant(post, `Post not found: ${params.slug}`);

  return json<LoaderData>(post);
};

type ActionData =
  | {
      title: null | string;
      slug: null | string;
      markdown: null | string;
    }
  | undefined;

export const action: ActionFunction = async ({ request }) => {
  await new Promise((res) => setTimeout(res, 1000));

  const userId = await requireUserId(request);
  const formData = await request.formData();

  const title = formData.get("title");
  const slug = formData.get("slug");
  const markdown = formData.get("markdown");

  const errors: ActionData = {
    title: title ? null : "Title is required",
    slug: slug ? null : "Slug is required",
    markdown: markdown ? null : "Markdown is required",
  };
  const hasErrors = Object.values(errors).some((errorMessage) => errorMessage);
  if (hasErrors) {
    return json<ActionData>(errors);
  }

  invariant(typeof slug === "string", "slug must be a string");
  invariant(typeof title === "string", "title must be a string");
  invariant(typeof markdown === "string", "markdown must be a string");

  await updatePost({ slug, title, markdown });

  return redirect(`/posts/${slug}`);
};

const inputClassName = `w-full rounded border border-gray-500 px-2 py-1 text-lg`;

export default function NewPost() {
  const post = useLoaderData() as LoaderData;
  const errors = useActionData();
  const transition = useTransition();
  const isUpdating = Boolean(transition.submission);

  return transition.submission ? (
    <PostView
      post={
        Object.fromEntries(transition.submission?.formData) as unknown as Post
      }
    />
  ) : (
    <Form method="post">
      <p>
        <label>
          Post Title:{" "}
          {errors?.title ? (
            <em className="text-red-600">{errors.title}</em>
          ) : null}
          <input
            type="text"
            name="title"
            required
            minLength={10}
            className={inputClassName}
            defaultValue={post.title}
          />
        </label>
      </p>
      <p>
        <label>
          Post Slug:{" "}
          {errors?.slug ? (
            <em className="text-red-600">{errors.slug}</em>
          ) : null}
          <input
            type="text"
            name="slug"
            className={inputClassName}
            defaultValue={post.slug}
          />
        </label>
      </p>
      <p>
        <label htmlFor="markdown">
          Markdown:{" "}
          {errors?.markdown ? (
            <em className="text-red-600">{errors.markdown}</em>
          ) : null}
        </label>
        <br />
        <textarea
          id="markdown"
          rows={20}
          name="markdown"
          className={`${inputClassName} font-mono`}
          defaultValue={post.markdown}
        />
      </p>
      <p className="text-right">
        <button
          type="submit"
          className="rounded bg-blue-500 py-2 px-4 text-white hover:bg-blue-600 focus:bg-blue-400 disabled:bg-blue-300"
          disabled={isUpdating}
        >
          {isUpdating ? "Creating..." : "Create Post"}
        </button>
      </p>
    </Form>
  );
}
