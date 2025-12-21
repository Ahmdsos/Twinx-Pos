
/**
 * Service to manage local image storage using the Origin Private File System (OPFS).
 * This ensures images are saved as actual files on the device, accessible offline.
 */

const IMAGE_DIR = 'product_images';

async function getDirectory() {
  const root = await navigator.storage.getDirectory();
  return await root.getDirectoryHandle(IMAGE_DIR, { create: true });
}

export const imageStorage = {
  /**
   * Saves a File object to the local file system.
   * Returns a unique filename/path.
   */
  saveImage: async (file: File): Promise<string> => {
    const dir = await getDirectory();
    const extension = file.name.split('.').pop() || 'png';
    const fileName = `${crypto.randomUUID()}.${extension}`;
    
    const fileHandle = await dir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(file);
    await writable.close();
    
    return fileName;
  },

  /**
   * Retrieves a Blob from the local file system.
   */
  getImageBlob: async (path: string): Promise<Blob | null> => {
    try {
      const dir = await getDirectory();
      const fileHandle = await dir.getFileHandle(path);
      const file = await fileHandle.getFile();
      return file;
    } catch (e) {
      console.error(`Failed to load local image: ${path}`, e);
      return null;
    }
  },

  /**
   * Deletes a file from the local file system.
   */
  deleteImage: async (path: string): Promise<void> => {
    try {
      const dir = await getDirectory();
      await dir.removeEntry(path);
    } catch (e) {
      console.warn(`Could not delete local file: ${path}`, e);
    }
  }
};
