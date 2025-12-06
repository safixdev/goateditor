import {
  AlignmentType,
  LevelFormat,
  convertInchesToTwip,
  UnderlineType,
} from "docx";

/**
 * Default document styles configuration
 */
export const getDocumentStyles = () => ({
  default: {
    document: {
      run: {
        font: "Calibri",
        size: "11pt",
      },
    },
    hyperlink: {
      run: {
        color: "0563C1",
        underline: { type: UnderlineType.SINGLE },
      },
    },
  },
});

/**
 * Numbering configuration for ordered lists
 */
export const getNumberingConfig = () => ({
  config: [
    {
      reference: "ordered-list-numbering",
      levels: [
        {
          level: 0,
          format: LevelFormat.DECIMAL,
          text: "%1.",
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: {
              indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) },
            },
          },
        },
        {
          level: 1,
          format: LevelFormat.LOWER_LETTER,
          text: "%2.",
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: {
              indent: { left: convertInchesToTwip(1), hanging: convertInchesToTwip(0.25) },
            },
          },
        },
        {
          level: 2,
          format: LevelFormat.LOWER_ROMAN,
          text: "%3.",
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: {
              indent: { left: convertInchesToTwip(1.5), hanging: convertInchesToTwip(0.25) },
            },
          },
        },
        {
          level: 3,
          format: LevelFormat.DECIMAL,
          text: "%4.",
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: {
              indent: { left: convertInchesToTwip(2), hanging: convertInchesToTwip(0.25) },
            },
          },
        },
      ],
    },
  ],
});

