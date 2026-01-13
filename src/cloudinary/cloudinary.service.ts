import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }

  /**
   * Upload file PUBLIC
   * - PDF nên dùng resource_type: "raw"
   * - Ảnh dùng "image"
   * - an toàn nhất dùng "auto"
   */
  uploadPublicFile(
    file: Express.Multer.File,
    opts?: { folder?: string; public_id?: string },
  ): Promise<{ secure_url: string; public_id: string; resource_type: string }> {
    if (!file?.buffer) throw new BadRequestException('File không hợp lệ');

    const folder = opts?.folder ?? 'worklogs';
    const publicId = opts?.public_id; 

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: publicId,
          resource_type: 'auto',
          overwrite: true,
        },
        (error: any, result: any) => {
  if (error) return reject(error)
  if (!result) return reject(new Error('Empty result'))
  resolve({
    secure_url: result.secure_url,
    public_id: result.public_id,
    resource_type: result.resource_type,
  })
}
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  /**
   * Xoá file Cloudinary theo public_id
   */
  async deleteByPublicId(publicId: string) {
    if (!publicId) return;
    // resource_type auto delete: thử raw trước, nếu fail thử image
    try {
      return await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    } catch {
      return await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    }
  }
}
