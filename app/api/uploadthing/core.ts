import { createUploadthing, type FileRouter } from "uploadthing/next";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const f = createUploadthing();

export const ourFileRouter = {
  encryptedFileUploader: f({ 
    blob: { maxFileSize: "64MB", maxFileCount: 10 },
    image: { maxFileSize: "16MB", maxFileCount: 10 },
    pdf: { maxFileSize: "64MB", maxFileCount: 10 },
    video: { maxFileSize: "128MB", maxFileCount: 10 },
  })
    .middleware(async ({ req }) => {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session) throw new Error("Unauthorized");

      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("File URL", file.url);
      return { uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
