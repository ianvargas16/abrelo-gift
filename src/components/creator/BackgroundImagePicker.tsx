import { assertGiftImageFile } from '../../models/giftMedia';

interface BackgroundImagePickerProps {
  file: File | null;
  previewUrl: string;
  error: string;
  onChange: (file: File | null) => void;
  onError: (message: string) => void;
}

export function BackgroundImagePicker({
  file,
  previewUrl,
  error,
  onChange,
  onError,
}: BackgroundImagePickerProps) {
  return (
    <div className="background-image-picker">
      {file && previewUrl && (
        <div className="background-image-preview">
          <img src={previewUrl} alt="Vista previa del fondo del regalo" />
          <div>
            <strong>{file.name}</strong>
            <span>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
          </div>
        </div>
      )}

      <div className="background-image-actions">
        <label className="file-button">
          {file ? 'Reemplazar fondo' : 'Elegir imagen'}
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
            Quitar fondo
          </button>
        )}
      </div>

      {error && <p className="memory-editor-error" role="alert">{error}</p>}
    </div>
  );
}
