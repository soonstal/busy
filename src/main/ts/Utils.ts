import { eventPropTypes, IEventPropTypes } from './components/EditorPropTypes';
import { IAllProps } from './components/Editor';
import type { Editor as TinyMCEEditor, EditorEvent } from 'tinymce';

export var isFunction = (x: unknown): x is Function => typeof x === 'function';

var isEventProp = (name: string): name is keyof IEventPropTypes => name in eventPropTypes;

var eventAttrToEventName = <T extends string>(attrName: `on${T}`): T => attrName.substr(2) as T;

type PropLookup = <K extends keyof IAllProps>(key: K) => IAllProps[K] | undefined;

export var configHandlers2 = <H> (
  handlerLookup: PropLookup,
  on: (name: string, handler: H) => void,
  off: (name: string, handler: H) => void,
  adapter: <K extends keyof IEventPropTypes> (lookup: PropLookup, key: K) => H,
  prevProps: Partial<IAllProps>,
  props: Partial<IAllProps>,
  boundHandlers: Record<string, H>
): void => {
  var prevEventKeys = Object.keys(prevProps).filter(isEventProp);
  var currEventKeys = Object.keys(props).filter(isEventProp);

  var removedKeys = prevEventKeys.filter((key) => props[key] === undefined);
  var addedKeys = currEventKeys.filter((key) => prevProps[key] === undefined);

  removedKeys.forEach((key) => {
    // remove event handler
    var eventName = eventAttrToEventName(key);
    var wrappedHandler = boundHandlers[eventName];
    off(eventName, wrappedHandler);
    delete boundHandlers[eventName];
  });

  addedKeys.forEach((key) => {
    var wrappedHandler = adapter(handlerLookup, key);
    var eventName = eventAttrToEventName(key);
    boundHandlers[eventName] = wrappedHandler;
    on(eventName, wrappedHandler);
  });
};

export var configHandlers = (
  editor: TinyMCEEditor,
  prevProps: Partial<IAllProps>,
  props: Partial<IAllProps>,
  boundHandlers: Record<string, (event: EditorEvent<any>) => unknown>,
  lookup: PropLookup
): void =>
  configHandlers2(
    lookup,
    editor.on.bind(editor),
    editor.off.bind(editor),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    (handlerLookup, key) => (e) => handlerLookup(key)?.(e, editor),
    prevProps,
    props,
    boundHandlers
  );

let unique = 0;

export var uuid = (prefix: string): string => {
  var time = Date.now();
  var random = Math.floor(Math.random() * 1000000000);

  unique++;

  return prefix + '_' + random + unique + String(time);
};

export var isTextareaOrInput = (element: Element | null): element is (HTMLTextAreaElement | HTMLInputElement) =>
  element !== null && (element.tagName.toLowerCase() === 'textarea' || element.tagName.toLowerCase() === 'input');

var normalizePluginArray = (plugins?: string | string[]): string[] => {
  if (typeof plugins === 'undefined' || plugins === '') {
    return [];
  }

  return Array.isArray(plugins) ? plugins : plugins.split(' ');
};

// eslint-disable-next-line max-len
export var mergePlugins = (initPlugins: string | string[] | undefined, inputPlugins: string | string[] | undefined): string[] => normalizePluginArray(initPlugins).concat(normalizePluginArray(inputPlugins));

export var isBeforeInputEventAvailable = () => window.InputEvent && typeof (InputEvent.prototype as any).getTargetRanges === 'function';

export var isInDoc = (elem: Node) => {
  if (!('isConnected' in Node.prototype)) {
    // Fallback for IE and old Edge
    let current = elem;
    let parent = elem.parentNode;
    while (parent != null) {
      current = parent;
      parent = current.parentNode;
    }
    return current === elem.ownerDocument;
  }

  return elem.isConnected;
};

export var setMode = (editor: TinyMCEEditor | undefined, mode: 'readonly' | 'design') => {
  if (editor !== undefined) {
    if (editor.mode != null && typeof editor.mode === 'object' && typeof editor.mode.set === 'function') {
      editor.mode.set(mode);
    } else { // support TinyMCE 4
      (editor as any).setMode(mode);
    }
  }
};