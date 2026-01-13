export interface PdfConversionResult {
    imageUrl: string;
    file: File | null;
    error?: string;
}

export async function convertPdfToImage(
    file: File
): Promise<PdfConversionResult> {
    try {
        // ✅ Dynamic imports — browser only
        // @ts-ignore
        const pdfjsLib = await import("pdfjs-dist/build/pdf.mjs");
        const worker = await import(
            "pdfjs-dist/build/pdf.worker.min.mjs?url"
            );

        pdfjsLib.GlobalWorkerOptions.workerSrc = worker.default;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);

        const viewport = page.getViewport({ scale: 2 });

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
            throw new Error("Failed to get canvas context");
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderTask = page.render({
            canvasContext: context,
            viewport,
        });

        await renderTask.promise;

        return await new Promise((resolve) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    resolve({
                        imageUrl: "",
                        file: null,
                        error: "Failed to create image blob",
                    });
                    return;
                }

                const imageFile = new File(
                    [blob],
                    file.name.replace(/\.pdf$/i, ".png"),
                    {
                        type: "image/png",
                        lastModified: Date.now(),
                    }
                );

                resolve({
                    imageUrl: URL.createObjectURL(blob),
                    file: imageFile,
                });
            }, "image/png");
        });
    } catch (err) {
        return {
            imageUrl: "",
            file: null,
            error: `Failed to convert PDF: ${(err as Error).message}`,
        };
    }
}
