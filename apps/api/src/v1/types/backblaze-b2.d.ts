declare module 'backblaze-b2' {
  export interface B2Options {
    applicationKeyId: string;
    applicationKey: string;
  }

  export default class B2 {
    constructor(options: B2Options);
    downloadUrl: string;
    authorize(): Promise<any>;
    getUploadUrl(params: {
      bucketId: string;
    }): Promise<{ data: { uploadUrl: string; authorizationToken: string } }>;
    uploadFile(params: {
      uploadUrl: string;
      uploadAuthToken: string;
      fileName: string;
      data: Buffer;
      mime: string;
    }): Promise<{ data: { fileId: string } }>;
    deleteFileVersion(params: {
      fileId: string;
      fileName: string;
    }): Promise<any>;
  }
}
