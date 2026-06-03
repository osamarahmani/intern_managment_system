import { supabase } from '../supabase/client';

// Helper to convert base64 to Blob
const base64ToBlob = (base64Data, contentType = '') => {
  const sliceSize = 512;
  const base64WithoutHeader = base64Data.includes(';base64,')
    ? base64Data.split(';base64,')[1]
    : base64Data;

  const byteCharacters = atob(base64WithoutHeader);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);

    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: contentType });
};

export const getAllInterns = async () => {
  const { data, error } = await supabase
    .from('interns')
    .select('*, projects(*), tasks(*)');
  if (error) throw error;
  return data;
};

export const updateIntern = async (id, updates) => {
  const { data, error } = await supabase
    .from('interns')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const registerIntern = async (internData) => {
  const { data, error } = await supabase
    .from('interns')
    .insert(internData)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const uploadPhoto = async (fileOrBase64, internId) => {
  let fileBody;
  let fileExt = 'png';
  let mimeType = 'image/png';

  if (typeof fileOrBase64 === 'string') {
    // Handle base64 Data URL
    if (fileOrBase64.startsWith('data:')) {
      const match = fileOrBase64.match(/data:([^;]+);base64,/);
      if (match) {
        mimeType = match[1];
        fileExt = mimeType.split('/')[1] || 'png';
      }
    }
    fileBody = base64ToBlob(fileOrBase64, mimeType);
  } else {
    // Handle standard File or Blob
    fileBody = fileOrBase64;
    fileExt = fileOrBase64.name?.split('.').pop() || 'png';
  }

  const filePath = `avatars/${internId}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('intern-photos')
    .upload(filePath, fileBody, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('intern-photos')
    .getPublicUrl(filePath);

  return data.publicUrl;
};

export const getPendingInterns = async () => {
  const { data, error } = await supabase
    .from('interns')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const getApprovedInterns = async () => {
  const { data, error } = await supabase
    .from('interns')
    .select('*, projects(*), tasks(*)')
    .eq('status', 'approved');
  if (error) throw error;
  return data;
};

export const approveIntern = async (id) => {
  const { data, error } = await supabase
    .from('interns')
    .update({ status: 'approved' })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const rejectIntern = async (id) => {
  const { error } = await supabase
    .from('interns')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return id;
};
