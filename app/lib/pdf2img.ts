// fix pdfjs worker
import workerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";

export interface PdfConversionResult {
    imageUrl: string;
    file: File | null;
    error?: string;
}

let pdfjsLib: any = null;
let loadPromise: Promise<any> | null = null;

async function loadPdfJs(): Promise<any> {
    if (pdfjsLib) return pdfjsLib;
    if (loadPromise) return loadPromise;

    loadPromise = import("pdfjs-dist/build/pdf.mjs").then((lib) => {
        lib.GlobalWorkerOptions.workerSrc = workerSrc;
        pdfjsLib = lib;
        return lib;
    });

    return loadPromise;
}

export async function convertPdfToImage(file: File): Promise<PdfConversionResult> {
    try {
        const lib = await loadPdfJs();

        const pdf = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
        const page = await pdf.getPage(1);

        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d")!;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context, viewport }).promise;

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    resolve({ imageUrl: "", file: null, error: "Failed to create image blob" });
                    return;
                }

                const imageFile = new File([blob], `${file.name.replace(/\.pdf/i, "")}.png`, {
                    type: "image/png",
                });

                resolve({
                    imageUrl: URL.createObjectURL(blob),
                    file: imageFile,
                });
            }, "image/png");
        });
    } catch (err) {
        return { imageUrl: "", file: null, error: String(err) };
    }
}
