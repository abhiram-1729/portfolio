import { uploadToSupabase } from '../../utils/supabaseService.js';

/**
 * @desc    Upload an image to Supabase storage and return the URL
 * @route   POST /api/admin/upload-image
 * @access  Admin
 */
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const { folder = 'receipts' } = req.body;

    const imageUrl = await uploadToSupabase(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'admin-uploads',
      folder
    );

    if (!imageUrl) {
      return res.status(500).json({ message: 'Failed to upload image to storage' });
    }

    res.json({ 
      success: true, 
      data: { url: imageUrl } 
    });
  } catch (error) {
    console.error('[Upload Image Error]:', error);
    res.status(500).json({ message: 'Server error during upload', error: error.message });
  }
};
