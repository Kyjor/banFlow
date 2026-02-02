import { useCallback } from 'react';
import { ipcRenderer } from 'electron';
import { message } from 'antd';

export const useStagingHandlers = (
  selectedFile,
  stageFiles,
  unstageFiles,
  discardChanges,
  stageHunk,
  discardHunk,
  stageLines,
  discardLines,
  loadDiff,
) => {
  const handleStageFile = useCallback(async () => {
    if (!selectedFile) return;
    try {
      await stageFiles([selectedFile]);
      loadDiff(selectedFile);
    } catch (error) {
      console.error('Failed to stage file:', error);
    }
  }, [selectedFile, stageFiles, loadDiff]);

  const handleUnstageFile = useCallback(async () => {
    if (!selectedFile) return;
    try {
      await unstageFiles([selectedFile]);
      loadDiff(selectedFile);
    } catch (error) {
      console.error('Failed to unstage file:', error);
    }
  }, [selectedFile, unstageFiles, loadDiff]);

  const handleDiscardFile = useCallback(async () => {
    if (!selectedFile) return;
    try {
      await discardChanges([selectedFile]);
      loadDiff(selectedFile);
    } catch (error) {
      console.error('Failed to discard file:', error);
    }
  }, [selectedFile, discardChanges, loadDiff]);

  const handleStageHunk = useCallback(
    async (hunkIndex) => {
      if (!selectedFile) return;
      try {
        await stageHunk(selectedFile, hunkIndex);
        loadDiff(selectedFile);
      } catch (error) {
        console.error('Failed to stage hunk:', error);
      }
    },
    [selectedFile, stageHunk, loadDiff],
  );

  const handleDiscardHunk = useCallback(
    async (hunkIndex) => {
      if (!selectedFile) return;
      try {
        await discardHunk(selectedFile, hunkIndex);
        loadDiff(selectedFile);
      } catch (error) {
        console.error('Failed to discard hunk:', error);
      }
    },
    [selectedFile, discardHunk, loadDiff],
  );

  const handleStageLine = useCallback(
    async (hunkIndex, lineIndex) => {
      if (!selectedFile) return;
      try {
        await stageLines(selectedFile, hunkIndex, [lineIndex]);
        loadDiff(selectedFile);
      } catch (error) {
        console.error('Failed to stage line:', error);
      }
    },
    [selectedFile, stageLines, loadDiff],
  );

  const handleDiscardLine = useCallback(
    async (hunkIndex, lineIndex) => {
      if (!selectedFile) return;
      try {
        await discardLines(selectedFile, hunkIndex, [lineIndex]);
        loadDiff(selectedFile);
      } catch (error) {
        console.error('Failed to discard line:', error);
      }
    },
    [selectedFile, discardLines, loadDiff],
  );

  return {
    handleStageFile,
    handleUnstageFile,
    handleDiscardFile,
    handleStageHunk,
    handleDiscardHunk,
    handleStageLine,
    handleDiscardLine,
  };
};

export const useLineSelectionHandlers = (
  setSelectedLines,
  selectedLines,
  stageLines,
  discardLines,
  selectedFile,
  loadDiff,
) => {
  const toggleLineSelection = useCallback(
    (hunkIndex, lineIndex) => {
      const key = `${hunkIndex}-${lineIndex}`;
      setSelectedLines((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(key)) {
          newSet.delete(key);
        } else {
          newSet.add(key);
        }
        return newSet;
      });
    },
    [setSelectedLines],
  );

  const clearLineSelection = useCallback(() => {
    setSelectedLines(new Set());
  }, [setSelectedLines]);

  const handleStageSelectedLines = useCallback(async () => {
    if (!selectedFile || selectedLines.size === 0) return;

    const hunkGroups = {};
    selectedLines.forEach((key) => {
      const [hunkIndex, lineIndex] = key.split('-').map(Number);
      if (!hunkGroups[hunkIndex]) {
        hunkGroups[hunkIndex] = [];
      }
      hunkGroups[hunkIndex].push(lineIndex);
    });

    try {
      await Promise.all(
        Object.entries(hunkGroups).map(([hunkIndex, lineIndices]) =>
          stageLines(selectedFile, parseInt(hunkIndex, 10), lineIndices),
        ),
      );
      setSelectedLines(new Set());
      loadDiff(selectedFile);
    } catch (error) {
      console.error('Failed to stage lines:', error);
    }
  }, [selectedFile, selectedLines, stageLines, setSelectedLines, loadDiff]);

  const handleDiscardSelectedLines = useCallback(async () => {
    if (!selectedFile || selectedLines.size === 0) return;

    const hunkGroups = {};
    selectedLines.forEach((key) => {
      const [hunkIndex, lineIndex] = key.split('-').map(Number);
      if (!hunkGroups[hunkIndex]) {
        hunkGroups[hunkIndex] = [];
      }
      hunkGroups[hunkIndex].push(lineIndex);
    });

    try {
      await Promise.all(
        Object.entries(hunkGroups).map(([hunkIndex, lineIndices]) =>
          discardLines(selectedFile, parseInt(hunkIndex, 10), lineIndices),
        ),
      );
      setSelectedLines(new Set());
      loadDiff(selectedFile);
    } catch (error) {
      console.error('Failed to discard lines:', error);
    }
  }, [selectedFile, selectedLines, discardLines, setSelectedLines, loadDiff]);

  return {
    toggleLineSelection,
    clearLineSelection,
    handleStageSelectedLines,
    handleDiscardSelectedLines,
  };
};

export const useEditHandlers = (
  selectedFile,
  currentRepository,
  setEditedContent,
  setOriginalFileContent,
  setEditMode,
  editedContent,
  originalFileContent,
  loadDiff,
  setIsSaving,
) => {
  const loadFileForEditing = useCallback(async () => {
    if (!selectedFile || !currentRepository) return;
    try {
      const result = await ipcRenderer.invoke(
        'git:readFile',
        currentRepository,
        selectedFile,
      );
      if (result.success) {
        setEditedContent(result.content);
        setOriginalFileContent(result.content);
        setEditMode(true);
      }
    } catch (error) {
      console.error('Failed to load file for editing:', error);
      message.error('Failed to load file for editing');
    }
  }, [
    selectedFile,
    currentRepository,
    setEditedContent,
    setOriginalFileContent,
    setEditMode,
  ]);

  const handleSaveEdit = useCallback(async () => {
    if (!selectedFile || !currentRepository) return;
    setIsSaving(true);
    try {
      const result = await ipcRenderer.invoke(
        'git:writeFile',
        currentRepository,
        selectedFile,
        editedContent,
      );
      if (result.success) {
        message.success('File saved successfully');
        setOriginalFileContent(editedContent);
        loadDiff(selectedFile);
      }
    } catch (error) {
      console.error('Failed to save file:', error);
      message.error('Failed to save file');
    } finally {
      setIsSaving(false);
    }
  }, [
    selectedFile,
    currentRepository,
    editedContent,
    setOriginalFileContent,
    loadDiff,
    setIsSaving,
  ]);

  const handleCancelEdit = useCallback(() => {
    setEditedContent(originalFileContent);
    setEditMode(false);
  }, [originalFileContent, setEditedContent, setEditMode]);

  return {
    loadFileForEditing,
    handleSaveEdit,
    handleCancelEdit,
  };
};

export const useInlineEditHandlers = (
  selectedFile,
  currentRepository,
  inlineEdits,
  setInlineEdits,
  setEditingLineKey,
  setInlineEditMode,
  selectedDiff,
  readOnly,
  staged,
  inlineEditInputRef,
  setIsSaving,
  loadDiff,
) => {
  const handleInlineEditStart = useCallback(
    (lineKey, currentContent) => {
      if (readOnly || staged) return;
      setEditingLineKey(lineKey);
      if (!inlineEdits[lineKey]) {
        setInlineEdits((prev) => ({ ...prev, [lineKey]: currentContent }));
      }
      setTimeout(() => inlineEditInputRef.current?.focus(), 50);
    },
    [
      readOnly,
      staged,
      inlineEdits,
      setInlineEdits,
      setEditingLineKey,
      inlineEditInputRef,
    ],
  );

  const handleInlineEditChange = useCallback(
    (lineKey, newContent) => {
      setInlineEdits((prev) => ({ ...prev, [lineKey]: newContent }));
    },
    [setInlineEdits],
  );

  const handleInlineEditBlur = useCallback(() => {
    setEditingLineKey(null);
  }, [setEditingLineKey]);

  const handleSaveInlineEdits = useCallback(async () => {
    if (
      !selectedFile ||
      !currentRepository ||
      Object.keys(inlineEdits).length === 0
    )
      return;
    setIsSaving(true);
    try {
      const result = await ipcRenderer.invoke(
        'git:readFile',
        currentRepository,
        selectedFile,
      );
      if (!result.success) throw new Error('Failed to read file');

      const fileContent = result.content;
      const fileLines = fileContent.split('\n');

      Object.entries(inlineEdits).forEach(([lineKey, newContent]) => {
        const [hunkIdx, lineIdx] = lineKey.split('-').map(Number);
        const hunk = selectedDiff?.hunks?.[hunkIdx];
        if (!hunk) return;

        const line = hunk.lines[lineIdx];
        if (!line) return;

        const headerMatch = hunk.header.match(/@@ -\d+,?\d* \+(\d+),?\d* @@/);
        if (!headerMatch) return;

        let newLineNum = parseInt(headerMatch[1], 10);
        for (let i = 0; i < lineIdx; i += 1) {
          const prevLine = hunk.lines[i];
          if (prevLine.type === 'added' || prevLine.type === 'context') {
            newLineNum += 1;
          }
        }

        if (line.type === 'added' || line.type === 'context') {
          const arrayIdx = newLineNum - 1;
          if (arrayIdx >= 0 && arrayIdx < fileLines.length) {
            fileLines[arrayIdx] = newContent;
          }
        }
      });

      const newContent = fileLines.join('\n');
      const writeResult = await ipcRenderer.invoke(
        'git:writeFile',
        currentRepository,
        selectedFile,
        newContent,
      );
      if (writeResult.success) {
        message.success('Changes saved');
        setInlineEdits({});
        setEditingLineKey(null);
        setInlineEditMode(false);
        loadDiff(selectedFile);
      }
    } catch (error) {
      console.error('Failed to save inline edits:', error);
      message.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, [
    selectedFile,
    currentRepository,
    inlineEdits,
    selectedDiff,
    setInlineEdits,
    setEditingLineKey,
    setInlineEditMode,
    setIsSaving,
    loadDiff,
  ]);

  const handleDiscardInlineEdits = useCallback(() => {
    setInlineEdits({});
    setEditingLineKey(null);
    setInlineEditMode(false);
  }, [setInlineEdits, setEditingLineKey, setInlineEditMode]);

  return {
    handleInlineEditStart,
    handleInlineEditChange,
    handleInlineEditBlur,
    handleSaveInlineEdits,
    handleDiscardInlineEdits,
  };
};
