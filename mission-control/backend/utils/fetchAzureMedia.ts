import {
  BlobSASPermissions,
  BlobServiceClient,
  StorageSharedKeyCredential
} from "@azure/storage-blob";

const accountKey = process.env.AZURE_ACCOUNT_KEY || "";
const account = `${process.env.AZURE_ACCOUNT}`;

const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
const blobServiceClient = new BlobServiceClient(
  `https://${account}.blob.core.windows.net`,
  sharedKeyCredential
);

export const fetchMediaUrl = async (
  containerName: string,
  filePath: string
) => {
  try {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(filePath);

    // Generate SAS URL that expires in 1 hour
    const sasUrl = await blobClient.generateSasUrl({
      permissions: BlobSASPermissions.parse("r"),
      expiresOn: new Date(new Date().valueOf() + 3600 * 1000)
    });

    return sasUrl;
  } catch (error) {
    throw new Error("Error generating video URL");
  }
};
