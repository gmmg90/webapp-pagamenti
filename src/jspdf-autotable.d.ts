import 'jspdf';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (...args: any[]) => void;
  }
}