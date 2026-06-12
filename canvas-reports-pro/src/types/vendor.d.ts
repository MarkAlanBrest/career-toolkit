declare module 'lucide-react' {
  import type { ComponentType, SVGProps } from 'react';
  export const BarChart3: ComponentType<SVGProps<SVGSVGElement>>;
  export const FileDown: ComponentType<SVGProps<SVGSVGElement>>;
  export const Loader2: ComponentType<SVGProps<SVGSVGElement>>;
  export const Moon: ComponentType<SVGProps<SVGSVGElement>>;
  export const Printer: ComponentType<SVGProps<SVGSVGElement>>;
  export const Search: ComponentType<SVGProps<SVGSVGElement>>;
  export const Sun: ComponentType<SVGProps<SVGSVGElement>>;
  export const X: ComponentType<SVGProps<SVGSVGElement>>;
}

declare module 'recharts' {
  import type { ComponentType, ReactNode } from 'react';
  type AnyProps = Record<string, unknown> & { children?: ReactNode };
  export const Bar: ComponentType<AnyProps>;
  export const BarChart: ComponentType<AnyProps>;
  export const CartesianGrid: ComponentType<AnyProps>;
  export const ResponsiveContainer: ComponentType<AnyProps>;
  export const Tooltip: ComponentType<AnyProps>;
  export const XAxis: ComponentType<AnyProps>;
  export const YAxis: ComponentType<AnyProps>;
}

declare module 'html2canvas' {
  export default function html2canvas(element: HTMLElement, options?: Record<string, unknown>): Promise<HTMLCanvasElement>;
}

declare module 'jspdf' {
  export default class jsPDF {
    constructor(orientation?: string, unit?: string, format?: string);
    internal: { pageSize: { getWidth(): number; getHeight(): number } };
    addImage(imageData: string, format: string, x: number, y: number, width: number, height: number): void;
    addPage(): void;
    save(filename: string): void;
  }
}
