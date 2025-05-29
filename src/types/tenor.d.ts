
export interface TenorGif {
  id: string;
  media_formats: {
    tinygif: { url: string; dims: number[]; preview: string; duration: number; size: number; }; // Added more fields
    gif: { url: string; dims: number[]; preview: string; duration: number; size: number; }; // Added more fields
    // You can add other formats if needed, e.g., mp4, nanogif
  };
  content_description: string;
  created: number;
  hasaudio: boolean;
  itemurl: string;
  shares: number;
  source_id: string;
  tags: string[];
  url: string;
  composite: any | null; // Can be more specific if structure is known
  hascaption: boolean;
  title: string;
  flags: string[];
}
