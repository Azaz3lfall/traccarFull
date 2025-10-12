# Cloudinary Setup Instructions

This project uses Cloudinary for image upload and management. Follow these steps to set up Cloudinary for your application.

## 1. Create a Cloudinary Account

1. Go to [https://cloudinary.com](https://cloudinary.com)
2. Sign up for a free account
3. Verify your email address

## 2. Get Your Cloudinary Credentials

1. Log in to your Cloudinary dashboard
2. Go to the "Dashboard" section
3. Copy the following values:
   - **Cloud Name**: Found in the "Account Details" section
   - **API Key**: Found in the "Account Details" section  
   - **API Secret**: Found in the "Account Details" section

## 3. Create Upload Preset

1. In your Cloudinary dashboard, go to **Settings** → **Upload**
2. Scroll down to **Upload presets** section
3. Click **Add upload preset**
4. Configure the preset:
   - **Preset name**: `traccar_profiles`
   - **Signing Mode**: `Unsigned` (this allows client-side uploads)
   - **Folder**: `traccar-profiles` (optional, but recommended)
   - **Access Mode**: `Public`
   - **Auto-upload**: `Enabled`
   - **Transformations**: Add these transformations:
     - **Width**: `200`
     - **Height**: `200`
     - **Crop**: `fill`
     - **Gravity**: `face`
     - **Quality**: `auto`
5. Click **Save**

## 4. Update Environment Variables

The `.env` file has been created with your credentials. If you need to update them:

```env
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_API_KEY=your_api_key
VITE_CLOUDINARY_API_SECRET=your_api_secret
VITE_CLOUDINARY_URL=cloudinary://your_api_key:your_api_secret@your_cloud_name
```

## 5. Features Included

### Image Upload
- **Client-side compression**: Images are compressed to 10-15KB before upload
- **Automatic optimization**: Cloudinary applies face detection and quality optimization
- **Multiple formats**: Supports JPEG, PNG, WebP, and other formats
- **Transformations**: Automatic resizing and cropping

### User Profile Photos
- **Upload button**: Small camera icon on user avatar
- **Real-time preview**: Immediate display after upload
- **Fallback support**: Shows initials if no photo is available
- **Error handling**: User-friendly error messages

### Image Management
- **Organized storage**: Images are stored in `traccar-profiles` folder
- **Unique naming**: Each image gets a unique public ID
- **Secure uploads**: Uses API key and signature for authentication
- **Easy deletion**: Can delete old images when uploading new ones

## 6. Usage Examples

### Upload User Profile Photo
```javascript
import { uploadToCloudinary } from '../utils/cloudinary';

const uploadProfilePhoto = async (file, userId) => {
  const result = await uploadToCloudinary(file, {
    folder: 'traccar-profiles',
    publicId: `user_${userId}_${Date.now()}`,
    transformations: {
      width: 200,
      height: 200,
      crop: 'fill',
      gravity: 'face',
      quality: 'auto'
    }
  });
  
  return result.url; // Use this URL in your user data
};
```

### Generate Image URLs with Transformations
```javascript
import { getCloudinaryImageUrl } from '../utils/cloudinary';

const thumbnailUrl = getCloudinaryImageUrl('user_123_456789', {
  width: 100,
  height: 100,
  crop: 'fill'
});
```

### Delete Image
```javascript
import { deleteFromCloudinary } from '../utils/cloudinary';

await deleteFromCloudinary('user_123_456789');
```

## 7. Security Notes

- **Upload Preset**: Uses unsigned uploads with a preset for security
- **Environment Variables**: Keep your `.env` file secure and don't commit it to version control
- **Rate Limiting**: Cloudinary has rate limits on free accounts
- **Access Control**: Upload preset can be configured with restrictions

## 8. Troubleshooting

### Common Issues

1. **"Cloudinary credentials not found"**
   - Check that your `.env` file exists and has the correct variable names
   - Restart your development server after updating environment variables

2. **"Upload failed"**
   - Verify your API key and secret are correct
   - Check that your Cloudinary account is active
   - Ensure the image file is not corrupted

3. **"Invalid transformation parameter"**
   - This was fixed by using the correct Cloudinary transformation format
   - Transformations now use short codes: `width` → `w`, `height` → `h`, `crop` → `c`, etc.
   - Example: `{width: 200, height: 200, crop: 'fill'}` becomes `w_200,h_200,c_fill`

4. **"Transformation parameter is not allowed when using unsigned upload"**
   - This is fixed by configuring transformations in the upload preset instead of the upload request
   - Make sure your upload preset has the transformations configured:
     - Width: 200, Height: 200, Crop: fill, Gravity: face, Quality: auto
   - The code now applies transformations via URL generation after upload

5. **"Upload preset not found"**
   - Make sure you've created the `traccar_profiles` upload preset in Cloudinary
   - Check that the preset is set to "Unsigned" mode
   - Verify the preset name matches exactly: `traccar_profiles`

6. **"Process is not defined"**
   - This was fixed by removing the Cloudinary SDK dependency
   - The implementation now uses direct API calls for browser compatibility

### Getting Help

- Check the [Cloudinary Documentation](https://cloudinary.com/documentation)
- Review the error messages in the browser console
- Verify your Cloudinary dashboard for upload logs

## 9. File Structure

```
src/
├── utils/
│   ├── cloudinary.js          # Main Cloudinary utility
│   ├── cloudinary.example.js  # Usage examples
│   └── imageCompression.js    # Image compression utility
├── main/
│   └── MainPage.jsx           # User popover with photo upload
└── .env                       # Environment variables (not in git)
```

The implementation is now ready to use! Users can upload profile photos through the avatar popover, and the images will be automatically compressed and uploaded to Cloudinary.
