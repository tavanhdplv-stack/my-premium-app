import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse } from 'cloudinary';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Configure once at module level (reads from .env.local)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "zejld0zt",
  api_key: process.env.CLOUDINARY_API_KEY || "452719257376477",
  api_secret: process.env.CLOUDINARY_API_SECRET || "cy8V6U7z3UbWDzsYzQorgNYulpU",
  secure: true,
});

export async function POST(request: NextRequest) {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "zejld0zt";
    const apiKey = process.env.CLOUDINARY_API_KEY || "452719257376477";
    const apiSecret = process.env.CLOUDINARY_API_SECRET || "cy8V6U7z3UbWDzsYzQorgNYulpU";

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'Cloudinary configuration is missing' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const widthField = formData.get('width');
    const resizeWidth = widthField ? Number(String(widthField)) : undefined;

    if (!file || typeof (file as { arrayBuffer?: unknown }).arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await (file as Blob).arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const options: any = { folder: 'tawan-orders', resource_type: 'image' };
      if (resizeWidth && Number.isFinite(resizeWidth) && resizeWidth > 0) {
        options.transformation = [{ width: resizeWidth, crop: 'scale' }];
      }
      cloudinary.uploader
        .upload_stream(options, (error, uploadResult) => {
          if (error) reject(error);
          else if (!uploadResult?.secure_url) reject(new Error('Upload failed'));
          else resolve(uploadResult);
        })
        .end(buffer);
    });

    return NextResponse.json({ secure_url: result.secure_url, url: result.secure_url });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
