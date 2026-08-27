import { assertGiftImageFile } from '../../models/giftMedia';

interface CoverImagePickerProps {
  file: File | null;
  previewUrl: string;
  error: string;
  onChange: (file: File | null) => void;
  onError: (message: string) => void;
}

export function CoverImagePicker({
  file,
  previewUrl,
  error,
  onChange,
  onError,
}: CoverImagePickerProps) {
  return (
    <div className="cover-image-picker">
      {file && previewUrl && (
        <div className="cover-image-preview">
          <img src={previewUrl} alt="Vista previa de la imagen del regalo" />
          <div>
            <strong>{file.name}</strong>
            <span>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
          </div>
        </div>
      )}

      <div className="cover-image-actions">
        <label className="file-button">
          {file ? 'Reemplazar imagen' : 'Elegir imagen'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              const nextFile = event.target.files?.[0];
              event.currentTarget.value = '';
              if (!nextFile) return;

              try {
                assertGiftImageFile(nextFile);
                onChange(nextFile);
                onError('');
              } catch (uploadError) {
                onError(uploadError instanceof Error ? uploadError.message : 'No pudimos usar esa imagen.');
              }
            }}
          />
        </label>
        {file && (
          <button type="button" className="ghost-button" onClick={() => { onChange(null); onError(''); }}>
            Quitar imagen
          </button>
        )}
      </div>

      {error && <p className="memory-editor-error" role="alert">{error}</p>}
    </div>
  );
}
