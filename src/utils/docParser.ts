import { parseWhatsAppBill, type ParseResult } from './whatsappParser';
import type { FoodItem } from '../types';

export interface DocumentExtractionProgress {
  status: 'idle' | 'reading' | 'extracting_pdf' | 'running_ocr' | 'parsing' | 'done' | 'error';
  progress: number; // 0 to 100
  message: string;
  error?: string;
}

/**
 * Extracts raw text from a digital PDF file using pdfjs-dist
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  
  // Dynamically import pdfjs-dist
  const pdfjsLib = await import('pdfjs-dist');
  
  // Configure worker
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.0.379'}/pdf.worker.min.mjs`;
  }

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  let fullText = '';

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str || '')
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText.trim();
}

/**
 * Extracts raw text from an image (PNG, JPG) using Tesseract.js client-side OCR
 */
export async function extractTextFromImage(
  file: File,
  onProgress?: (progress: number, message: string) => void
): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  
  onProgress?.(10, 'Initializing OCR engine...');
  const worker = await createWorker('eng');

  try {
    onProgress?.(30, 'Analyzing image receipt...');
    const ret = await worker.recognize(file);
    onProgress?.(90, 'OCR text recognition completed');
    await worker.terminate();
    return ret.data.text.trim();
  } catch (err: any) {
    await worker.terminate();
    throw new Error(err?.message || 'Failed to read image with OCR');
  }
}

/**
 * Unified pipeline for processing uploaded file (PDF or Image)
 */
export async function processUploadedBillFile(
  file: File,
  menuItems: FoodItem[],
  onStatusUpdate?: (status: DocumentExtractionProgress) => void
): Promise<{ text: string; parseResult: ParseResult }> {
  try {
    const fileName = file.name.toLowerCase();
    const isPdf = fileName.endsWith('.pdf') || file.type === 'application/pdf';
    let extractedText = '';

    if (isPdf) {
      onStatusUpdate?.({
        status: 'extracting_pdf',
        progress: 30,
        message: 'Extracting text from PDF document...'
      });

      try {
        extractedText = await extractTextFromPdf(file);
      } catch (pdfErr) {
        console.warn('Direct PDF text extraction failed, trying image fallback if possible', pdfErr);
        throw new Error('Could not extract text directly from PDF. The PDF might be scanned or protected.');
      }
    } else {
      // Image OCR
      onStatusUpdate?.({
        status: 'running_ocr',
        progress: 20,
        message: 'Running OCR on receipt image...'
      });

      extractedText = await extractTextFromImage(file, (p, msg) => {
        onStatusUpdate?.({
          status: 'running_ocr',
          progress: p,
          message: msg
        });
      });
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No readable text could be found in the uploaded file. Please enter the bill details manually.');
    }

    onStatusUpdate?.({
      status: 'parsing',
      progress: 95,
      message: 'Matching items with menu and calculating totals...'
    });

    const parseResult = parseWhatsAppBill(extractedText, menuItems);

    onStatusUpdate?.({
      status: 'done',
      progress: 100,
      message: 'Extraction completed successfully!'
    });

    return { text: extractedText, parseResult };
  } catch (error: any) {
    onStatusUpdate?.({
      status: 'error',
      progress: 0,
      message: error?.message || 'Failed to process document',
      error: error?.message
    });
    throw error;
  }
}
