import imageCompression from 'browser-image-compression';
import { supabase } from '@/app/lib/supabase';

export async function uploadImageDirect(file: File): Promise<string> {
  // 1. Compress the image first
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
  };
  const compressedFile = await imageCompression(file, options);

  // 2. Generate a unique file name
  const timestamp = Date.now();
  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `${timestamp}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

  // 3. Upload directly to Supabase Storage
  const { data, error } = await supabase.storage
    .from('images')
    .upload(fileName, compressedFile, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw new Error(error.message || 'Failed to upload image to Supabase');
  }

  // 4. Get the public URL
  const { data: publicUrlData } = supabase.storage
    .from('images')
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}

