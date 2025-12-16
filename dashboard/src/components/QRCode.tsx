import { useMemo } from 'react';

interface QRCodeProps {
  data: string;
  size?: number;
  className?: string;
}

// Simple QR Code visual generator
// Creates a pattern based on data hash for visual identification

function createMatrix(size: number): boolean[][] {
  return Array(size).fill(null).map(() => Array(size).fill(false));
}

// Generate a simple visual pattern based on data hash
// This is a simplified visual representation for demo purposes
function generatePattern(data: string, modules: number): boolean[][] {
  const matrix = createMatrix(modules);

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  // Add finder patterns (top-left, top-right, bottom-left)
  const addFinderPattern = (startX: number, startY: number) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const isOuter = y === 0 || y === 6 || x === 0 || x === 6;
        const isInner = (y >= 2 && y <= 4 && x >= 2 && x <= 4);
        if (startX + x < modules && startY + y < modules) {
          matrix[startY + y][startX + x] = isOuter || isInner;
        }
      }
    }
  };

  addFinderPattern(0, 0);
  addFinderPattern(modules - 7, 0);
  addFinderPattern(0, modules - 7);

  // Add timing patterns
  for (let i = 8; i < modules - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Fill data area with pattern derived from input
  const dataBytes = new TextEncoder().encode(data);
  let byteIndex = 0;
  let bitIndex = 0;

  for (let y = 8; y < modules - 8; y++) {
    for (let x = 8; x < modules - 8; x++) {
      if (x === 6 || y === 6) continue;

      // Mix hash with data bytes for pattern
      const dataVal = dataBytes[byteIndex % dataBytes.length];
      const hashBit = (hash >> (bitIndex % 32)) & 1;
      const dataBit = (dataVal >> (bitIndex % 8)) & 1;

      matrix[y][x] = ((hashBit ^ dataBit) === 1) || ((x + y + byteIndex) % 3 === 0);

      bitIndex++;
      if (bitIndex % 8 === 0) byteIndex++;
    }
  }

  return matrix;
}

export function QRCode({ data, size = 128, className = '' }: QRCodeProps) {
  const modules = 25; // Version 2 QR code has 25x25 modules
  const moduleSize = size / modules;

  const matrix = useMemo(() => generatePattern(data, modules), [data, modules]);

  const paths = useMemo(() => {
    const pathParts: string[] = [];

    for (let y = 0; y < modules; y++) {
      for (let x = 0; x < modules; x++) {
        if (matrix[y][x]) {
          const px = x * moduleSize;
          const py = y * moduleSize;
          pathParts.push(`M${px},${py}h${moduleSize}v${moduleSize}h-${moduleSize}z`);
        }
      }
    }

    return pathParts.join('');
  }, [matrix, moduleSize, modules]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      role="img"
      aria-label={`QR Code for: ${data.slice(0, 50)}...`}
    >
      <rect width={size} height={size} fill="white" rx="4" />
      <path d={paths} fill="currentColor" />
    </svg>
  );
}
