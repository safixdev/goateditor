/**
 * Export editor content to PDF using browser's print dialog
 * This triggers window.print() which allows the user to save as PDF
 */
export const exportToPdf = () => {
  window.print();
};

