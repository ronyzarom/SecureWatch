import React, { useRef, useEffect } from 'react';

interface HTMLViewerProps {
  htmlContent: string;
}

export const HTMLViewer: React.FC<HTMLViewerProps> = ({ htmlContent }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      iframe.srcdoc = htmlContent;
    }
  }, [htmlContent]);

  return (
    <iframe
      ref={iframeRef}
      sandbox="allow-same-origin"
      style={{ width: '100%', height: '100%', border: 'none' }}
      title="Email HTML Content"
    />
  );
}; 