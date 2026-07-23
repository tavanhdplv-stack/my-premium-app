import imageCompression from 'browser-image-compression';

export async function uploadImageDirect(file: File): Promise<string> {
  // 1. Compress the image first
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
  };
  const compressedFile = await imageCompression(file, options);

  // 2. Get the signature from our API
  const signRes = await fetch('/api/sign-upload', { method: 'POST' });
  if (!signRes.ok) {
    throw new Error('Failed to get upload signature');
  }
  const { signature, timestamp, cloudName, apiKey } = await signRes.json();

  // 3. Upload directly to Cloudinary
  const formData = new FormData();
  formData.append('file', compressedFile);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);
  formData.append('folder', 'tawan-orders');

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!uploadRes.ok) {
    const errorData = await uploadRes.json();
    throw new Error(errorData.error?.message || 'Failed to upload image directly');
  }

  const data = await uploadRes.json();
  return data.secure_url;
}
