import { z } from "zod";
import { router, protectedProcedure } from "./_utils/trpc.js";
import { put } from "@vercel/blob";
import { nanoid } from "nanoid";

export const uploadRouter = router({
  // Get URL for upload (using Vercel Blob)
  getSignedUrl: protectedProcedure
    .input(
      z.object({
        filename: z.string(),
        contentType: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        throw new Error("Vercel Blob not configured");
      }

      // Generate a unique key for the file
      const fileKey = `books/${nanoid()}/${input.filename}`;

      // Return upload info
      return {
        uploadUrl: `https://api.vercel.com/v1/blob`, // Client will POST here
        fileUrl: `${process.env.BLOB_UPLOAD_URL || "https://blob.vercelusercontent.com"}/${fileKey}`,
        fileKey: fileKey,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      };
    }),

  // Upload handler (arquivo é enviado direto do cliente)
  uploadBook: protectedProcedure
    .input(
      z.object({
        file: z.string(),
        filename: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // This is handled by client uploading directly to Vercel Blob
      return {
        success: true,
        message: "File uploaded successfully",
      };
    }),
});
