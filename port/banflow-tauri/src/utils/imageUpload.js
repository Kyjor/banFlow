import { tauriInvoke } from './tauri';

export function readFileAsDataUrl(file) {
  const blob = file?.originFileObj || file;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Save an uploaded image to project/global docs storage; returns data URL for preview. */
export async function saveProjectImage(file, projectName, isGlobal = false) {
  const blob = file?.originFileObj || file;
  const imageData = await readFileAsDataUrl(file);
  const saved = await tauriInvoke('docs:saveImage', {
    imageName: blob.name,
    imageData,
    projectName,
    isGlobal,
  });
  const imagePath =
    saved && typeof saved === 'object'
      ? saved.path || saved.name
      : String(saved);
  const imageUrl = await tauriInvoke('docs:getImage', {
    imagePath,
    projectName,
    isGlobal,
  });
  return { imagePath, imageUrl };
}
