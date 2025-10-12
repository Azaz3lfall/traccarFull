# Translation Guide for Photo Upload Feature

This guide explains how to add translations for the new photo upload functionality to other languages.

## New Translation Keys Added

The following translation keys have been added for the photo upload feature:

### English Keys (en.json)
```json
{
  "deviceImageCompressedSuccess": "Image uploaded successfully! Compressed from {originalSize}KB to {compressedSize}KB",
  "userPhotoUploadError": "Failed to upload profile photo. Please try again.",
  "userPhotoUploadSuccess": "Profile photo updated! Compressed from {originalSize}KB to {compressedSize}KB",
  "userPhotoValidationError": "Please select a valid image file (PNG, JPG, JPEG, WebP) up to {maxSize}KB",
  "userPhotoCloudinaryConfigError": "Cloudinary configuration not found. Please check environment variables.",
  "userPhotoUploading": "Uploading...",
  "userPhotoUploadTitle": "Upload photo"
}
```

## How to Add Translations

### 1. Locate the Target Language File
Find the language file in `src/resources/l10n/[language].json` (e.g., `de.json` for German, `pt.json` for Portuguese).

### 2. Find the Device Image Section
Look for the existing device image keys:
```json
"deviceImageSizeError": "...",
"deviceImageTypeError": "...",
"deviceImageUploadError": "..."
```

### 3. Add the New Keys
Add the new translation keys right after the existing device image keys:

```json
"deviceImageSizeError": "...",
"deviceImageTypeError": "...",
"deviceImageUploadError": "...",
"deviceImageCompressedSuccess": "[Your translation]",
"userPhotoUploadError": "[Your translation]",
"userPhotoUploadSuccess": "[Your translation]",
"userPhotoValidationError": "[Your translation]",
"userPhotoCloudinaryConfigError": "[Your translation]",
"userPhotoUploading": "[Your translation]",
"userPhotoUploadTitle": "[Your translation]"
```

## Translation Guidelines

### Parameter Placeholders
- `{originalSize}` - Original file size in KB (e.g., "120.5")
- `{compressedSize}` - Compressed file size in KB (e.g., "12.3")
- `{maxSize}` - Maximum allowed file size in KB (e.g., "120")

### Key Descriptions
- **deviceImageCompressedSuccess**: Success message for device image upload with compression info
- **userPhotoUploadError**: Error message when profile photo upload fails
- **userPhotoUploadSuccess**: Success message for profile photo upload with compression info
- **userPhotoValidationError**: Error message for invalid file type or size
- **userPhotoCloudinaryConfigError**: Error message when Cloudinary configuration is missing
- **userPhotoUploading**: Loading text shown during upload
- **userPhotoUploadTitle**: Tooltip text for the upload button

## Example Translations

### Spanish (es.json)
```json
"deviceImageCompressedSuccess": "¡Imagen subida exitosamente! Comprimida de {originalSize}KB a {compressedSize}KB",
"userPhotoUploadError": "Error al subir la foto de perfil. Inténtalo de nuevo.",
"userPhotoUploadSuccess": "¡Foto de perfil actualizada! Comprimida de {originalSize}KB a {compressedSize}KB",
"userPhotoValidationError": "Por favor selecciona un archivo de imagen válido (PNG, JPG, JPEG, WebP) de hasta {maxSize}KB",
"userPhotoCloudinaryConfigError": "Configuración de Cloudinary no encontrada. Por favor verifica las variables de entorno.",
"userPhotoUploading": "Subiendo...",
"userPhotoUploadTitle": "Subir foto"
```

### French (fr.json)
```json
"deviceImageCompressedSuccess": "Image téléchargée avec succès ! Compressée de {originalSize}KB à {compressedSize}KB",
"userPhotoUploadError": "Échec du téléchargement de la photo de profil. Veuillez réessayer.",
"userPhotoUploadSuccess": "Photo de profil mise à jour ! Compressée de {originalSize}KB à {compressedSize}KB",
"userPhotoValidationError": "Veuillez sélectionner un fichier image valide (PNG, JPG, JPEG, WebP) jusqu'à {maxSize}KB",
"userPhotoCloudinaryConfigError": "Configuration Cloudinary introuvable. Veuillez vérifier les variables d'environnement.",
"userPhotoUploading": "Téléchargement...",
"userPhotoUploadTitle": "Télécharger une photo"
```

## Testing Translations

1. Change the language in the application settings
2. Test the photo upload functionality
3. Verify that all messages appear in the correct language
4. Check that parameter substitution works correctly (e.g., file sizes are displayed)

## Notes

- The translation system now supports parameters using the `{parameterName}` syntax
- All parameter placeholders must be preserved in translations
- Keep the tone consistent with existing translations in each language
- Consider cultural differences in error message phrasing
