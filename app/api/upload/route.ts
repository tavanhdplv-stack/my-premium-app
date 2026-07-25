import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

async function sha1(message: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await crypto.subtle.digest('SHA-1', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function POST(request: NextRequest) {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "zejld0zt";
    const apiKey = process.env.CLOUDINARY_API_KEY || "452719257376477";
    const apiSecret = process.env.CLOUDINARY_API_SECRET || "cy8V6U7z3UbWDzsYzQorgNYulpU";

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Cloudinary configuration is missing' }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const widthField = formData.get('width');
    const resizeWidth = widthField ? Number(String(widthField)) : undefined;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const timestamp = Math.round(new Date().getTime() / 1000).toString();
    
    // Cloudinary signature parameters
    const paramsToSign: Record<string, string> = { timestamp };
    
    let transformationStr = '';
    if (resizeWidth && Number.isFinite(resizeWidth) && resizeWidth > 0) {
      transformationStr = `c_scale,w_${resizeWidth}`;
      paramsToSign.transformation = transformationStr;
    }

    // Sort keys and create signature string
    const sortedKeys = Object.keys(paramsToSign).sort();
    const signatureString = sortedKeys.map(k => `${k}=${paramsToSign[k]}`).join('&') + apiSecret;
    
    const signature = await sha1(signatureString);

    // Prepare FormData for Cloudinary API
    const cloudinaryFormData = new FormData();
    cloudinaryFormData.append('file', file);
    cloudinaryFormData.append('api_key', apiKey);
    cloudinaryFormData.append('timestamp', timestamp);
    cloudinaryFormData.append('signature', signature);
    if (transformationStr) {
      cloudinaryFormData.append('transformation', transformationStr);
    }

    // Upload via standard fetch (Edge compatible)
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: cloudinaryFormData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || 'Upload failed');
    }

    return NextResponse.json({ secure_url: result.secure_url, url: result.secure_url });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
