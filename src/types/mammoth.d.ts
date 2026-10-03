declare module "mammoth" {
  export interface Input {
    arrayBuffer?: ArrayBuffer;
    path?: string;
  }

  export interface Result {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }

  export function extractRawText(input: Input): Promise<Result>;
  export function convertToHtml(input: Input): Promise<{
    value: string;
    messages: Array<{ type: string; message: string }>;
  }>;

  const mammoth: {
    extractRawText: typeof extractRawText;
    convertToHtml: typeof convertToHtml;
  };
  export default mammoth;
}