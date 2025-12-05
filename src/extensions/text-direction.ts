import { Extension } from "@tiptap/react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textDirection: {
      setTextDirection: (direction: "ltr" | "rtl") => ReturnType;
      unsetTextDirection: () => ReturnType;
    };
  }
}

export const TextDirectionExtension = Extension.create({
  name: "textDirection",
  addOptions() {
    return {
      types: ["paragraph", "heading", "bulletList", "orderedList", "listItem", "taskList", "taskItem", "codeBlock", "blockquote"],
      defaultDirection: "ltr" as "ltr" | "rtl",
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          dir: {
            default: null, // null means inherit/default (ltr)
            renderHTML: (attributes) => {
              if (!attributes.dir) return {};
              return {
                dir: attributes.dir,
                style: `direction: ${attributes.dir}; text-align: ${attributes.dir === "rtl" ? "right" : "left"}`,
              };
            },
            parseHTML: (element) => {
              return element.getAttribute("dir") || element.style.direction || null;
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setTextDirection:
        (direction: "ltr" | "rtl") =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          tr = tr.setSelection(selection);

          const { from, to } = selection;
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              tr = tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                dir: direction,
              });
            }
          });

          if (dispatch) dispatch(tr);
          return true;
        },
      unsetTextDirection:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state;
          tr = tr.setSelection(selection);

          const { from, to } = selection;
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              tr = tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                dir: null,
              });
            }
          });
          if (dispatch) dispatch(tr);
          return true;
        },
    };
  },
});


