import B2 from 'backblaze-b2';
import { AppError } from '@errors/AppError.js';

const b2 = new B2({
  applicationKeyId: process.env.B2_APPLICATION_KEY_ID ?? '',
  applicationKey: process.env.B2_APPLICATION_KEY ?? '',
});

let isAuthorized = false;

const authorize = async (): Promise<void> => {
  if (isAuthorized) return;
  try {
    await b2.authorize();
    isAuthorized = true;
  } catch (error) {
    throw new AppError('Failed to authorize Backblaze B2 client', 500);
  }
};

const uploadFile = async (
  key: string,
  buffer: Buffer,
  mimeType: string
): Promise<{ fileId: string; fileUrl: string }> => {
  await authorize();

  const bucketId = process.env.B2_BUCKET_ID ?? '';

  try {
    const uploadUrlResponse = await b2.getUploadUrl({ bucketId });

    const uploadResponse = await b2.uploadFile({
      uploadUrl: uploadUrlResponse.data.uploadUrl,
      uploadAuthToken: uploadUrlResponse.data.authorizationToken,
      fileName: key,
      data: buffer,
      mime: mimeType,
    });

    const fileId = uploadResponse.data.fileId;

    // Construct the direct download URL.
    // The format is: https://f000.backblazeb2.com/file/{bucketName}/{fileName}
    // We can also get the downloadUrl from the authorization response, but it's simpler to construct if bucket name is known,
    // or use b2.downloadUrl which is set after authorize().
    const bucketName = process.env.B2_BUCKET_NAME ?? '';
    const fileUrl = `${b2.downloadUrl}/file/${bucketName}/${key}`;

    return { fileId, fileUrl };
  } catch (error) {
    let details = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any).response?.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      details = JSON.stringify((error as any).response.data);
    } else {
      details = String(error);
    }
    throw new AppError(
      `Failed to upload file ${key} to B2. Details: ${details}`,
      500
    );
  }
};

const deleteFile = async (fileId: string, fileName: string): Promise<void> => {
  await authorize();

  try {
    await b2.deleteFileVersion({
      fileId,
      fileName,
    });
  } catch (error) {
    throw new AppError(`Failed to delete file ${fileName} from B2`, 500);
  }
};

export default { authorize, uploadFile, deleteFile };
