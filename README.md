# Shree Ji E-Commerce - Virtual Styling Upload (VSUpload) Pipeline

## Reference-First Design

The pipeline is built on a core principle: **the garment photo IS the source of truth.**

Text prompts describe ONLY the scene, pose, and photography style — they never describe the garment itself. This prevents image generation models from overriding the actual garment with their internal biases (e.g., generating a saree when a suit was uploaded).

```mermaid
flowchart TD
    Start([User Uploads Raw Photos]) --> JobCreated[("MongoDB: vsupload_jobs")]
    JobCreated --> BestPhoto[Select Best Photo]
    
    %% Metadata Extraction (for catalog only)
    BestPhoto --> GeminiVision[Gemini 3.5 Flash Vision]
    GeminiVision --> SaveMeta[("Save Metadata to Job")]
    
    %% Primary: Reference-Based Generation
    SaveMeta --> RefGen["Imagen 4 + SubjectReference"]
    BestPhoto --> |"Garment photo as reference"| RefGen
    RefGen --> |"Scene-only prompts (3 angles)"| CheckRef{Images Generated?}
    
    %% Fallback: Text-to-Image
    CheckRef -- Yes --> StoreImages[("Store Images in MongoDB")]
    CheckRef -- No --> FallbackGen[Imagen 4 Text-to-Image]
    FallbackGen --> StoreImages

    %% Finalization
    StoreImages --> UpsertProduct[("Upsert vsupload_products")]
    UpsertProduct --> FinalStatus([Status: under_review])
    
    %% Error handling
    GeminiVision -. Fails .-> FailJob([Job Status: Failed])

    %% Styles
    classDef userNode fill:#e1f5fe,stroke:#0288d1,stroke-width:2px,color:#01579b
    classDef processNode fill:#fff3e0,stroke:#f57c00,stroke-width:2px,color:#e65100
    classDef aiNode fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#4a148c
    classDef dbNode fill:#e8f5e9,stroke:#388e3c,stroke-width:2px,color:#1b5e20
    classDef errorNode fill:#ffebee,stroke:#d32f2f,stroke-width:2px,color:#b71c1c

    class Start,FinalStatus userNode
    class BestPhoto,CheckRef processNode
    class GeminiVision,RefGen,FallbackGen aiNode
    class JobCreated,SaveMeta,StoreImages,UpsertProduct dbNode
    class FailJob errorNode
```

## How It Works

1. **Upload**: Users upload raw garment photos (suits, kurtis, lehengas, etc.).
2. **Metadata Extraction**: Gemini 3.5 Flash Vision extracts structured catalog data (`name`, `color`, `style`, `fabric`, etc.). This is used for the product listing — **not** for image generation.
3. **Primary Image Generation (Reference-First)**:
   - The uploaded garment photo is passed to Imagen 4 as a `SubjectReferenceImage`.
   - The text prompt describes ONLY the scene: "Professional e-commerce catalog photo, front-facing pose, clean white studio background..."
   - The reference image carries the garment identity — Imagen reproduces the exact clothing.
4. **Fallback Generation**: If the reference-based flow fails, the pipeline builds simple text prompts from the metadata and uses Imagen 4 in text-to-image mode.
5. **Database Storage**: Generated model images + extracted metadata are compiled into a product record with `under_review` status for admin approval.

## Why Reference-First?

| Old Approach (Text-Heavy) | New Approach (Reference-First) |
|---|---|
| Prompt: "A maroon salwar suit with golden embroidery..." | Prompt: "Professional catalog photo, front-facing pose..." |
| Imagen ignores text, generates a saree | Imagen sees the actual garment photo, reproduces it |
| Garment identity depends on text accuracy | Garment identity comes from the photo itself |
| Vision model errors cascade to image gen | Metadata errors only affect catalog, not the image |
