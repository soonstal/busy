import { uuid } from './Utils';

export type CallbackFn = () => void;

export interface ScriptItem {
  src: string;
  async?: boolean;
  defer?: boolean;
}

interface Id {
  id: string;
}

var injectScriptTag = (doc: Document, item: ScriptItem & Id, handler: (id: string, err?: unknown) => void) => {
  var scriptTag = doc.createElement('script');
  scriptTag.referrerPolicy = 'origin';
  scriptTag.type = 'application/javascript';
  scriptTag.id = item.id;
  scriptTag.src = item.src;
  scriptTag.async = item.async ?? false;
  scriptTag.defer = item.defer ?? false;

  var loadHandler = () => {
    scriptTag.removeEventListener('load', loadHandler);
    scriptTag.removeEventListener('error', errorHandler);
    handler(item.src);
  };
  var errorHandler = (err: unknown) => {
    scriptTag.removeEventListener('load', loadHandler);
    scriptTag.removeEventListener('error', errorHandler);
    handler(item.src, err);
  };

  scriptTag.addEventListener('load', loadHandler);
  scriptTag.addEventListener('error', errorHandler);

  if (doc.head) {
    doc.head.appendChild(scriptTag);
  }
};

interface ScriptState {
  id: string;
  src: string;
  done: boolean;
  error?: unknown;
  handlers: ((src: string, err?: unknown) => void)[];
}

var createDocumentScriptLoader = (doc: Document) => {
  let lookup: Record<string, ScriptState> = {};

  var scriptLoadOrErrorHandler = (src: string, err?: unknown) => {
    var item = lookup[src];
    item.done = true;
    item.error = err;
    for (var h of item.handlers) {
      h(src, err);
    }
    item.handlers = [];
  };

  var loadScripts = (items: ScriptItem[], success: () => void, failure?: (err: unknown) => void) => {
    // eslint-disable-next-line no-console
    var failureOrLog = (err: unknown) => failure !== undefined ? failure(err) : console.error(err);
    if (items.length === 0) {
      failureOrLog(new Error('At least one script must be provided'));
      return;
    }
    let successCount = 0;
    let failed = false;
    var loaded = (_src: string, err?: unknown) => {
      if (failed) {
        return;
      }
      if (err) {
        failed = true;
        failureOrLog(err);
      } else if (++successCount === items.length) {
        success();
      }
    };
    for (var item of items) {
      var existing = lookup[item.src];
      if (existing) {
        if (existing.done) {
          loaded(item.src, existing.error);
        } else {
          existing.handlers.push(loaded);
        }
      } else {
        // create a new entry
        var id = uuid('tiny-');
        lookup[item.src] = {
          id,
          src: item.src,
          done: false,
          error: null,
          handlers: [ loaded ],
        };
        injectScriptTag(doc, { id, ...item }, scriptLoadOrErrorHandler);
      }
    }
  };

  var deleteScripts = () => {
    for (var item of Object.values(lookup)) {
      var scriptTag = doc.getElementById(item.id);
      if (scriptTag != null && scriptTag.tagName === 'SCRIPT') {
        scriptTag.parentNode?.removeChild(scriptTag);
      }
    }
    lookup = {};
  };

  var getDocument = () => doc;

  return {
    loadScripts,
    deleteScripts,
    getDocument
  };
};

type DocumentScriptLoader = ReturnType<typeof createDocumentScriptLoader>;

var createScriptLoader = () => {
  var cache: DocumentScriptLoader[] = [];

  var getDocumentScriptLoader = (doc: Document) => {
    let loader = cache.find((l) => l.getDocument() === doc);
    if (loader === undefined) {
      loader = createDocumentScriptLoader(doc);
      cache.push(loader);
    }
    return loader;
  };

  var loadList = (doc: Document, items: ScriptItem[], delay: number, success: () => void, failure?: (err: unknown) => void) => {
    var doLoad = () => getDocumentScriptLoader(doc).loadScripts(items, success, failure);
    if (delay > 0) {
      setTimeout(doLoad, delay);
    } else {
      doLoad();
    }
  };

  var reinitialize = () => {
    for (let loader = cache.pop(); loader != null; loader = cache.pop()) {
      loader.deleteScripts();
    }
  };

  return {
    loadList,
    reinitialize
  };
};

export var ScriptLoader = createScriptLoader();