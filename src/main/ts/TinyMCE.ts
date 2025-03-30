import type { TinyMCE as TinyMCEGlobal } from 'tinymce';

let getTinymce = (view: Window): TinyMCEGlobal | null => {
  let global = view as any;

  return global && global.tinymce ? global.tinymce : null;
};

export { getTinymce };
