// audioFilePicker.ts - Utility for selecting audio files
// Works with both browser file input and Electron file dialog

/**
 * Open file picker and return selected audio file
 * 
 * @param accept - MIME types to accept (default: all supported audio formats)
 * @returns Promise that resolves with selected File or null if cancelled
 */
export async function pickAudioFile(
  accept: string = 'audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac'
): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';

    const safeCleanup = () => {
      try {
        if (input.parentNode === document.body) {
          document.body.removeChild(input);
        }
      } catch (_) {}
    };

    let resolved = false;
    const safetyTimeout = setTimeout(() => {
      if (!resolved) {
        safeCleanup();
        resolved = true;
        resolve(null);
      }
    }, 5 * 60 * 1000);

    input.onchange = (event) => {
      if (resolved) return;
      clearTimeout(safetyTimeout);
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0] || null;
      setTimeout(() => {
        safeCleanup();
        resolved = true;
        resolve(file);
      }, 0);
    };

    document.body.appendChild(input);
    input.click();
  });
}

/**
 * Validate if a file is a valid audio file
 */
export function validateAudioFile(file: File): { valid: boolean; error?: string } {
  // Check file size (max 500MB)
  const maxSize = 500 * 1024 * 1024; // 500MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 500MB.`,
    };
  }

  // Check if file has a name
  if (!file.name || file.name.trim() === '') {
    return {
      valid: false,
      error: 'File has no name',
    };
  }

  // Check file extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  const supportedExtensions = ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'];
  
  if (!extension || !supportedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `Unsupported file format: .${extension}. Supported formats: ${supportedExtensions.join(', ')}`,
    };
  }

  return { valid: true };
}


