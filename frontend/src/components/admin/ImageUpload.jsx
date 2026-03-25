import { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import { API } from '@/App';

const ImageUpload = ({ 
  value, 
  onChange, 
  label = 'Image',
  accept = '.jpg,.jpeg,.png,.webp,.svg',
  maxSize = 5 * 1024 * 1024 // 5MB
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imageInfo, setImageInfo] = useState(null);
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = async (file) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Allowed: JPG, PNG, WEBP, SVG');
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      toast.error(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/admin/website-settings/upload-image`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        }
      });

      const { url, size, dimensions } = response.data;
      onChange(url);
      setImageInfo({ size, dimensions });
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.error || 'Failed to upload image');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleClear = async () => {
    if (value && value.startsWith('/uploads/website/')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${API}/admin/website-settings/delete-image`, {
          headers: { 'Authorization': `Bearer ${token}` },
          data: { url: value }
        });
      } catch (e) {
        // Ignore delete errors
      }
    }
    onChange('');
    setImageInfo(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      
      {/* Current Image Preview */}
      {value && (
        <div className="relative inline-block">
          <img 
            src={value.startsWith('http') ? value : `${window.location.origin}${value}`}
            alt="Preview"
            className="max-h-40 rounded-lg border border-slate-200 object-contain"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
          <button
            type="button"
            onClick={handleClear}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
          >
            <X size={14} />
          </button>
          {imageInfo && (
            <div className="mt-1 text-xs text-slate-500">
              {formatFileSize(imageInfo.size)}
              {imageInfo.dimensions && ` • ${imageInfo.dimensions.width}×${imageInfo.dimensions.height}`}
            </div>
          )}
        </div>
      )}

      {/* Upload Area */}
      {!value && (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
            dragActive ? 'border-amber-500 bg-amber-50' : 'border-slate-300 hover:border-amber-400'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {uploading ? (
            <div className="space-y-2">
              <Loader2 className="mx-auto animate-spin text-amber-500" size={24} />
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-amber-500 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-slate-500">{progress}% uploaded</p>
            </div>
          ) : (
            <>
              <ImageIcon className="mx-auto text-slate-400 mb-2" size={32} />
              <p className="text-sm text-slate-600">
                Click or drag image here
              </p>
              <p className="text-xs text-slate-400 mt-1">
                JPG, PNG, WEBP, SVG (max 5MB)
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={(e) => handleFileSelect(e.target.files[0])}
        className="hidden"
      />

      {/* Change Image Button (when image exists) */}
      {value && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload size={14} className="mr-1" />
          Change Image
        </Button>
      )}
    </div>
  );
};

export default ImageUpload;
