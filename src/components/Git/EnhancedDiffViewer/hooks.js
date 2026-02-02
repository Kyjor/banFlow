import { useEffect, useCallback } from 'react';
import { ipcRenderer } from 'electron';
import { message } from 'antd';
import { useHeartbeat } from '../../../hooks/useHeartbeat';
import { isImageFile, isAsepriteFile } from './utils';

export const useFileLoading = (
  selectedFile,
  currentRepository,
  staged,
  diffData,
  getDiff,
  readOnly,
) => {
  const loadDiff = useCallback(
    async (filename) => {
      try {
        await getDiff(filename, staged);
      } catch (error) {
        console.error('Failed to load diff:', error);
      }
    },
    [getDiff, staged],
  );

  useEffect(() => {
    if (diffData) return;
    if (selectedFile && currentRepository) {
      loadDiff(selectedFile);
    }
  }, [selectedFile, staged, currentRepository, diffData, loadDiff]);

  useHeartbeat(
    `diff-viewer-refresh-${selectedFile || 'none'}`,
    () => {
      if (selectedFile && currentRepository && !diffData) {
        loadDiff(selectedFile);
      }
    },
    3000,
    {
      enabled: !!selectedFile && !!currentRepository && !diffData && !readOnly,
      immediate: false,
    },
  );

  return { loadDiff };
};

export const useImageLoading = (
  selectedFile,
  currentRepository,
  staged,
  setOriginalImage,
  setModifiedImage,
  setLoadingImages,
) => {
  useEffect(() => {
    const loadImages = async () => {
      if (!selectedFile || !currentRepository || !isImageFile(selectedFile)) {
        setOriginalImage(null);
        setModifiedImage(null);
        return;
      }

      setLoadingImages(true);
      try {
        const currentResult = await ipcRenderer.invoke(
          'git:readImageFile',
          currentRepository,
          selectedFile,
        );
        if (currentResult.success) {
          setModifiedImage(currentResult.dataUrl);
        } else {
          setModifiedImage(null);
        }

        const gitRef = 'HEAD';
        const originalResult = await ipcRenderer.invoke(
          'git:getImageFromGit',
          currentRepository,
          selectedFile,
          gitRef,
        );
        if (originalResult.success) {
          setOriginalImage(originalResult.dataUrl);
        } else {
          setOriginalImage(null);
        }
      } catch (error) {
        console.error('Failed to load images:', error);
        setOriginalImage(null);
        setModifiedImage(null);
      } finally {
        setLoadingImages(false);
      }
    };

    loadImages();
  }, [
    selectedFile,
    currentRepository,
    staged,
    setOriginalImage,
    setModifiedImage,
    setLoadingImages,
  ]);
};

export const useAsepriteLoading = (
  selectedFile,
  currentRepository,
  staged,
  setOriginalAseprite,
  setModifiedAseprite,
  setLoadingAseprite,
) => {
  useEffect(() => {
    const loadAseprite = async () => {
      if (
        !selectedFile ||
        !currentRepository ||
        !isAsepriteFile(selectedFile)
      ) {
        setOriginalAseprite(null);
        setModifiedAseprite(null);
        return;
      }

      setLoadingAseprite(true);
      try {
        const currentResult = await ipcRenderer.invoke(
          'git:readAsepriteFile',
          currentRepository,
          selectedFile,
        );
        if (currentResult.success) {
          setModifiedAseprite(currentResult);
        } else {
          setModifiedAseprite(null);
        }

        const gitRef = 'HEAD';
        const originalResult = await ipcRenderer.invoke(
          'git:getAsepriteFromGit',
          currentRepository,
          selectedFile,
          gitRef,
        );
        if (originalResult.success) {
          setOriginalAseprite(originalResult);
        } else {
          setOriginalAseprite(null);
        }
      } catch (error) {
        console.error('Failed to load Aseprite files:', error);
        setOriginalAseprite(null);
        setModifiedAseprite(null);
      } finally {
        setLoadingAseprite(false);
      }
    };

    loadAseprite();
  }, [
    selectedFile,
    currentRepository,
    staged,
    setOriginalAseprite,
    setModifiedAseprite,
    setLoadingAseprite,
  ]);
};

export const useFullFileLoading = (
  viewFullFile,
  selectedFile,
  currentRepository,
  setFullFileContent,
) => {
  useEffect(() => {
    const loadFullFile = async () => {
      if (viewFullFile && selectedFile && currentRepository) {
        try {
          const result = await ipcRenderer.invoke(
            'git:readFile',
            currentRepository,
            selectedFile,
          );
          if (result.success) {
            setFullFileContent(result.content);
          }
        } catch (error) {
          console.error('Failed to load full file:', error);
          message.error('Failed to load file content');
        }
      }
    };
    loadFullFile();
  }, [viewFullFile, selectedFile, currentRepository, setFullFileContent]);
};

export const useFileHistory = (
  selectedFile,
  currentRepository,
  readOnly,
  getFileHistory,
  setFileHistory,
  setLoadingHistory,
  setSelectedHistoryCommit,
  setHistoricalContent,
) => {
  useEffect(() => {
    const loadHistory = async () => {
      if (selectedFile && currentRepository && !readOnly) {
        setLoadingHistory(true);
        try {
          const history = await getFileHistory(selectedFile);
          setFileHistory(history || []);
        } catch (error) {
          console.error('Failed to load file history:', error);
          setFileHistory([]);
        } finally {
          setLoadingHistory(false);
        }
      } else {
        setFileHistory([]);
      }
    };
    loadHistory();
    setSelectedHistoryCommit(null);
    setHistoricalContent(null);
  }, [
    selectedFile,
    currentRepository,
    readOnly,
    getFileHistory,
    setFileHistory,
    setLoadingHistory,
    setSelectedHistoryCommit,
    setHistoricalContent,
  ]);
};

export const useKeyboardShortcuts = (
  currentRepository,
  readOnly,
  openFilePicker,
) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        if (currentRepository && !readOnly) {
          openFilePicker();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentRepository, readOnly, openFilePicker]);
};
