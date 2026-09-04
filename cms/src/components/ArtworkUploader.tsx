import React, { useState, useRef } from 'react';
import { Upload, CheckCircle2, AlertCircle, RefreshCw, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Artwork } from '../types';
import { api } from '../api/client';

interface ArtworkUploaderProps {
  artworkType: 'poster' | 'banner' | 'thumbnail';
  label: string;
  recommendedDimensions: string;
  aspectRatioLabel: string;
  currentArtwork?: Artwork | null;
  onArtworkUploaded: (artwork: Artwork) => void;
}

export const ArtworkUploader: React.FC<ArtworkUploaderProps> = ({
  artworkType,
  label,
  recommendedDimensions,
  aspectRatioLabel,
  currentArtwork,
  onArtworkUploaded,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentArtwork?.url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);

    // Immediate client-side check for 200KB limit
    if (file.size > 200 * 1024) {
      const sizeKb = (file.size / 1024).toFixed(1);
      setErrorMessage(`The selected file is too large (${sizeKb} KB). Please upload an image under 200 KB.`);
      return;
    }

    setIsUploading(true);
    try {
      const uploaded = await api.uploadArtwork(file, artworkType);
      setPreviewUrl(uploaded.url);
      onArtworkUploaded(uploaded);
    } catch (err: any) {
      setErrorMessage(err.message || 'Artwork upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Determine aspect ratio class for preview frame
  const aspectClass =
    artworkType === 'poster'
      ? 'aspect-[2/3] w-36 sm:w-44'
      : artworkType === 'banner'
      ? 'aspect-[16/9] w-full max-w-sm'
      : 'aspect-[16/9] w-48';

  return (
    <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="font-semibold text-sm text-slate-200 flex items-center space-x-2">
            <ImageIcon className="w-4 h-4 text-brand-400" />
            <span>{label}</span>
          </label>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {aspectRatioLabel}
          </span>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Recommended: <strong className="text-slate-300">{recommendedDimensions}</strong> (Max 200 KB)
        </p>

        {/* Upload Container / Preview Box */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`relative group cursor-pointer border-2 border-dashed rounded-xl overflow-hidden transition-all duration-200 flex flex-col items-center justify-center p-3 text-center bg-slate-900/50 ${aspectClass} ${
            errorMessage
              ? 'border-rose-500/60 bg-rose-950/20'
              : previewUrl
              ? 'border-emerald-500/50 hover:border-brand-400'
              : 'border-slate-700 hover:border-slate-500 hover:bg-slate-850'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
          />

          {previewUrl ? (
            <div className="relative w-full h-full group">
              <img
                src={previewUrl}
                alt={label}
                className="w-full h-full object-cover rounded-lg"
              />
              <div className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center space-y-2 rounded-lg">
                <RefreshCw className="w-5 h-5 text-white animate-spin-slow" />
                <span className="text-xs font-semibold text-white">Click to Replace</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-4 space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-5 h-5 text-slate-400 group-hover:text-brand-400" />
              </div>
              <div className="text-xs font-medium text-slate-300">
                {isUploading ? 'Uploading & Validating...' : 'Click or Drag image'}
              </div>
              <span className="text-[10px] text-slate-500">PNG, JPG, WebP</span>
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-300 font-medium">Validating artwork...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error or Success notification */}
      <div className="mt-3">
        {errorMessage && (
          <div className="flex items-start space-x-2 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 rounded-lg p-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {previewUrl && !errorMessage && (
          <div className="flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 rounded-lg py-1.5 px-2.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Artwork verified & saved</span>
          </div>
        )}
      </div>
    </div>
  );
};
