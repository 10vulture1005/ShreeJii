# Shree Ji E-Commerce - Virtual Styling Upload (VSUpload) Pipeline

This diagram explains the complete backend pipeline for processing raw garment photos and automatically generating AI model mockups and product metadata.

```mermaid
flowchart TD
    %% Nodes and Edges
    Start([User Uploads Raw Photos]) --> JobCreated[("MongoDB: vsupload_jobs")]
    JobCreated --> BestPhoto[Select Best Photo]
    
    %% Metadata Extraction Phase
    BestPhoto --> ExtractMeta{Extract Metadata}
    ExtractMeta -- Gemini Vision --> ValidateMeta[Validate Fields]
    ExtractMeta -- Gemini Fails --> GroqMeta[Groq Fallback]
    ValidateMeta --> SaveMeta[("Save Metadata to Job")]
    GroqMeta --> SaveMeta
    
    %% Advanced Image Generation Flow
    SaveMeta --> AdvPrompts[Gemini Vision: Generate 3 Detailed Prompts]
    AdvPrompts --> AdvImagen[Imagen 4 REST API + Subject Reference Image]
    AdvImagen -- Success --> StoreImages[("Store Images in MongoDB")]
    
    %% Fallback Image Generation Flow
    AdvImagen -- Fails/API Error --> FallbackPrompts[Build Hardcoded Prompts from Metadata]
    FallbackPrompts --> FallbackImagen[Imagen 4 API]
    FallbackImagen -- Success --> StoreImages
    FallbackImagen -- Fails --> LocalFallback[Generate Local Placeholder image]
    LocalFallback --> StoreImages

    %% Finalization Phase
    StoreImages --> UpsertProduct[("Upsert vsupload_products")]
    UpsertProduct --> FinalStatus([Update Job Status: under_review])
    
    %% Error handling
    ValidateMeta -. Invalid/Missing .-> FailJob([Job Status: Failed])
    GroqMeta -. Fails .-> FailJob

    %% Define Styles
    classDef userNode fill:#e1f5fe,stroke:#0288d1,stroke-width:2px,color:#01579b
    classDef processNode fill:#fff3e0,stroke:#f57c00,stroke-width:2px,color:#e65100
    classDef aiNode fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#4a148c
    classDef dbNode fill:#e8f5e9,stroke:#388e3c,stroke-width:2px,color:#1b5e20
    classDef errorNode fill:#ffebee,stroke:#d32f2f,stroke-width:2px,color:#b71c1c

    %% Apply Styles
    class Start,FinalStatus userNode
    class BestPhoto,ValidateMeta,FallbackPrompts,LocalFallback processNode
    class ExtractMeta,GroqMeta,AdvPrompts,AdvImagen,FallbackImagen aiNode
    class JobCreated,SaveMeta,StoreImages,UpsertProduct dbNode
    class FailJob errorNode
```

## Pipeline Overview

1. **Upload**: Users upload raw photos of garments (like suits, kurtis, lehengas).
2. **Metadata Extraction**: Gemini Vision acts as a fashion cataloguing expert to extract structured data (`name`, `description`, `color`, `style`, `fabric`, etc.). A text-only Groq fallback is used if Gemini is unavailable.
3. **Advanced Image Generation**: 
   - Gemini Vision analyzes the photo again to write 3 extremely detailed, photorealistic prompts (front, 3-quarter, and back views).
   - These prompts, along with the original photo (as a `SubjectReference`), are sent to the Imagen 4 Developer API to generate high-accuracy model catalog photos.
4. **Fallback Generation**: If the advanced reference image flow is restricted or fails, the pipeline falls back to generating standard prompts from the metadata and using Imagen 4 in text-to-image mode.
5. **Database Storage**: The generated model images and the extracted metadata are compiled into a product record and placed in an `under_review` state for the admin to approve.
