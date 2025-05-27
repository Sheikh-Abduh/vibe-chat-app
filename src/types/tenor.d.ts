
export interface TenorGif {
  id: string;
  media_formats: {
    tinygif: { url: string; dims: number[] };
    gif: { url: string; dims: number[] };
    // You can add other formats if needed, e.g., mp4, nanogif
  };
  content_description: string;
  // Add other fields you might need from the Tenor API response
  // e.g., tags, itemurl, created, etc.
}

    