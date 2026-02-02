export const isImageFile = (filename) => {
  if (!filename) return false;
  const extension = filename.split('.').pop()?.toLowerCase();
  const imageExtensions = [
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp',
    'svg',
    'bmp',
    'ico',
  ];
  return imageExtensions.includes(extension);
};

export const isAsepriteFile = (filename) => {
  if (!filename) return false;
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension === 'aseprite' || extension === 'ase';
};

export const getLanguageFromFilename = (filename) => {
  if (!filename) return 'text';

  const extension = filename.split('.').pop()?.toLowerCase();
  const languageMap = {
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    php: 'php',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    html: 'markup',
    xml: 'markup',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    md: 'markdown',
    sql: 'sql',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    ps1: 'powershell',
    dockerfile: 'dockerfile',
    jl: 'julia',
  };

  return languageMap[extension] || 'text';
};

export const getLinePrefix = (lineType) => {
  switch (lineType) {
    case 'added':
      return '+';
    case 'deleted':
      return '-';
    default:
      return ' ';
  }
};

export const formatHistoryDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};
