import React, { useState, useRef } from 'react';
import { ArrowLeft, Printer, Download, QrCode } from 'lucide-react';
import QRCodeLib from 'qrcode';
import { Equipment } from '../types/Equipment';

interface LabelGeneratorProps {
  equipment: Equipment;
  config: any;
  onBack: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export const LabelGenerator: React.FC<LabelGeneratorProps> = ({ 
  equipment, 
  config, 
  onBack, 
  showToast 
}) => {
  const [labelGenerated, setLabelGenerated] = useState(false);
  const [generating, setGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Get label settings from config with defaults
  const labelSettings = config.labelSettings || {
    widthMM: 40,
    heightMM: 30,
    qrCodeSize: 0.6,
    baseFontSize: 12,
    margin: 10,
    includeName: true,
    includeModel: true,
    includeSerial: true,
    includeAssetTag: true,
    useVerticalLayout: false
  };

  const generateQRCode = async (text: string): Promise<string> => {
    try {
      return await QRCodeLib.toDataURL(text, {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  };

  const generateLabel = async () => {
    if (!canvasRef.current) return;

    setGenerating(true);
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');

      // Set canvas size using label settings
      const dpi = 300;
      const widthMM = labelSettings.widthMM;
      const heightMM = labelSettings.heightMM;
      const widthPx = (widthMM / 25.4) * dpi; // Convert mm to inches, then to pixels
      const heightPx = (heightMM / 25.4) * dpi;
      
      canvas.width = widthPx;
      canvas.height = heightPx;

      // Fill with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, widthPx, heightPx);

      // Generate QR code
      const qrUrl = `${config.baseUrl}/hardware/${equipment.id}`;
      const qrDataUrl = await generateQRCode(qrUrl);
      
      // Load QR code image
      const qrImage = new Image();
      await new Promise((resolve, reject) => {
        qrImage.onload = resolve;
        qrImage.onerror = reject;
        qrImage.src = qrDataUrl;
      });

      // Calculate dimensions using label settings
      const margin = labelSettings.margin;
      const qrSize = Math.min(heightPx - (margin * 2), (heightPx - (margin * 2)) * labelSettings.qrCodeSize);
      const textAreaX = qrSize + margin * 2;
      const textAreaWidth = widthPx - textAreaX - margin;

      // Set up text styling
      ctx.fillStyle = 'black';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      // Calculate font sizes based on available space and settings
      const baseFontSize = Math.max(8, Math.min(20, labelSettings.baseFontSize));
      
      // Build text lines based on settings
      const textLines = [];
      if (labelSettings.includeName) {
        textLines.push({ text: equipment.name || 'Unnamed Asset', bold: true, size: baseFontSize + 3 });
      }
      if (labelSettings.includeModel) {
        textLines.push({ text: equipment.model?.name || 'Unknown', bold: false, size: baseFontSize + 1 });
      }
      if (labelSettings.includeSerial) {
        textLines.push({ text: equipment.serial || 'N/A', bold: false, size: baseFontSize + 1 });
      }
      if (labelSettings.includeAssetTag) {
        textLines.push({ text: equipment.asset_tag, bold: false, size: baseFontSize + 1 });
      }
      
      const totalTextHeight = textLines.reduce((sum, line) => sum + line.size + 4, 0) + 8;
      const useVerticalLayout = labelSettings.useVerticalLayout || totalTextHeight > (heightPx - margin * 2) * 0.4;
      
      if (useVerticalLayout) {
        // Vertical layout: QR code on top, text below
        const qrTopMargin = margin;
        const qrLeftMargin = (widthPx - qrSize) / 2; // Center QR code horizontally
        
        // Draw QR code centered at top
        ctx.drawImage(qrImage, qrLeftMargin, qrTopMargin, qrSize, qrSize);
        
        // Draw text below QR code
        let yOffset = qrTopMargin + qrSize + margin;
        ctx.textAlign = 'center';
        
        textLines.forEach(line => {
          ctx.font = `${line.bold ? 'bold' : 'normal'} ${line.size}px Arial`;
          ctx.fillText(line.text, widthPx / 2, yOffset);
          yOffset += line.size + 4;
        });
      } else {
        // Horizontal layout: QR code on left, text on right
        ctx.drawImage(qrImage, margin, margin, qrSize, qrSize);
        
        // Draw text on the right
        let yOffset = margin;
        ctx.textAlign = 'left';
        
        textLines.forEach(line => {
          ctx.font = `${line.bold ? 'bold' : 'normal'} ${line.size}px Arial`;
          ctx.fillText(line.text, textAreaX, yOffset);
          yOffset += line.size + 4;
        });
      }

      // Add border
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, widthPx, heightPx);

      setLabelGenerated(true);
      showToast('Label generated successfully!', 'success');
    } catch (error) {
      console.error('Error generating label:', error);
      showToast('Failed to generate label', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!canvasRef.current || !labelGenerated) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Could not open print window', 'error');
      return;
    }

    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Asset Label - ${equipment.asset_tag}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: white;
            }
            .label {
              border: 1px solid #ccc;
              padding: 10px;
            }
            img {
              max-width: 100%;
              height: auto;
            }
            @media print {
              body {
                padding: 0;
              }
              .label {
                border: none;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="label">
            <img src="${dataUrl}" alt="Asset Label for ${equipment.asset_tag}" />
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const handleDownload = () => {
    if (!canvasRef.current || !labelGenerated) return;

    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `label-${equipment.asset_tag}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Generate Asset Label</h2>
      </div>

      {/* Asset Info */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">Asset Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Name:</span>
            <span className="ml-2 text-gray-900 dark:text-white">{equipment.name}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Asset Tag:</span>
            <span className="ml-2 text-gray-900 dark:text-white">{equipment.asset_tag}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Model:</span>
            <span className="ml-2 text-gray-900 dark:text-white">{equipment.model?.name || 'Unknown'}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Serial:</span>
            <span className="ml-2 text-gray-900 dark:text-white">{equipment.serial || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Label Settings Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">Current Label Settings:</h3>
        <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <p>• Size: {labelSettings.widthMM}mm × {labelSettings.heightMM}mm</p>
          <p>• QR Code: {Math.round(labelSettings.qrCodeSize * 100)}% of available space</p>
          <p>• Font: {labelSettings.baseFontSize}px base size</p>
          <p>• Layout: {labelSettings.useVerticalLayout ? 'Vertical' : 'Automatic'}</p>
          <p>• Content: {[
            labelSettings.includeName && 'Name',
            labelSettings.includeModel && 'Model', 
            labelSettings.includeSerial && 'Serial',
            labelSettings.includeAssetTag && 'Asset Tag'
          ].filter(Boolean).join(', ')}</p>
        </div>
      </div>

      {/* Label Preview */}
      <div className="mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Label Preview ({labelSettings.widthMM}mm × {labelSettings.heightMM}mm)</h3>
        <div className="flex justify-center p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-500 p-2 sm:p-4">
            <canvas
              ref={canvasRef}
              className="border border-gray-300 dark:border-gray-500 max-w-full h-auto"
              style={{ maxWidth: '100%', maxHeight: '250px' }}
            />
            {!labelGenerated && (
              <div className="flex items-center justify-center w-full h-24 sm:h-32 text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                <QrCode className="w-6 h-6 sm:w-8 sm:h-8 mr-2" />
                <span>Click "Generate Label" to preview</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <button
          onClick={generateLabel}
          disabled={generating}
          className="flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white rounded-xl text-base sm:text-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center touch-manipulation"
        >
          {generating ? (
            <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-white mr-2 sm:mr-3"></div>
          ) : (
            <QrCode className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
          )}
          {generating ? 'Generating...' : 'Generate Label'}
        </button>

        {labelGenerated && (
          <>
            <button
              onClick={handlePrint}
              className="flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white rounded-xl text-base sm:text-lg font-semibold transition-colors flex items-center justify-center touch-manipulation"
            >
              <Printer className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
              Print Label
            </button>

            <button
              onClick={handleDownload}
              className="flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-xl text-base sm:text-lg font-semibold transition-colors flex items-center justify-center touch-manipulation"
            >
              <Download className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" />
              Download
            </button>
          </>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
        <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">Label Instructions:</h4>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• Label size: {labelSettings.widthMM}mm × {labelSettings.heightMM}mm (configurable in settings)</li>
          <li>• QR code links directly to asset page in Snipe-IT</li>
          <li>• Content and layout can be customized in configuration settings</li>
          <li>• Print on adhesive label paper for best results</li>
        </ul>
      </div>
    </div>
  );
};