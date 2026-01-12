import React, { useRef, useState } from 'react';

const FileUpload = ({ onFileSelect, acceptedFormats = '.pdf,.docx', maxSize = 5, multiple = true }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFiles = (files) => {
    const validFiles = [];
    for (const file of files) {
      if (file.size > maxSize * 1024 * 1024) {
        alert(`File "${file.name}" exceeds ${maxSize}MB limit`);
        continue;
      }
      validFiles.push(file);
    }
    if (validFiles.length === 0) return;

    // Update local state (append or replace depending on multiple)
    if (multiple) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
    } else {
      setUploadedFiles([validFiles[0]]);
    }

    // Notify parent for each valid file to preserve existing single-file handlers
    for (const vf of validFiles) {
      try { onFileSelect(vf); } catch (e) { console.warn('onFileSelect failed', e); }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats}
        onChange={handleFileChange}
        multiple={multiple}
        className="hidden"
      />
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-purple-500 bg-purple-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <div className="flex flex-col items-center gap-2">
          <svg
            className="w-16 h-16 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-lg font-medium text-gray-700">
            {uploadedFiles && uploadedFiles.length > 0 ? `${uploadedFiles.length} file(s) selected` : 'Drag and drop files or browse'}
          </p>
          {uploadedFiles && uploadedFiles.length > 0 && (
            <div className="text-sm text-gray-600 mt-2 max-h-36 overflow-y-auto">
              {uploadedFiles.map((f, i) => (
                <div key={i} className="text-xs truncate">{f.name}</div>
              ))}
            </div>
          )}
          <p className="text-sm text-gray-500">
            {acceptedFormats.replace(/\./g, '').toUpperCase()} - Max {maxSize}MB
          </p>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;