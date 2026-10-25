type FsEntry = { dir: boolean; text?: string; data?: Uint8Array };

type Part = string | { uri: string };

export const fileSystemState = {
  space: 1e12,
  failWrite: false,
  failCreate: false,
  fs: new Map<string, FsEntry>(),
};

export function resetFileSystem(): void {
  fileSystemState.fs.clear();
  fileSystemState.space = 1e12;
  fileSystemState.failWrite = false;
  fileSystemState.failCreate = false;
}

const DOCUMENT = 'file:///doc';
const join = (parts: Part[]) => parts.map((part) => (typeof part === 'string' ? part : part.uri)).join('/');
const nameOf = (uri: string) => uri.slice(uri.lastIndexOf('/') + 1);
const parentOf = (uri: string) => uri.slice(0, uri.lastIndexOf('/'));
const removeTree = (uri: string) => {
  for (const key of [...fileSystemState.fs.keys()]) {
    if (key === uri || key.startsWith(`${uri}/`)) fileSystemState.fs.delete(key);
  }
};

class File {
  uri: string;
  constructor(...parts: Part[]) {
    this.uri = join(parts);
  }
  get exists() {
    return fileSystemState.fs.get(this.uri)?.dir === false;
  }
  get name() {
    return nameOf(this.uri);
  }
  write(content: string | Uint8Array) {
    if (fileSystemState.failWrite) throw new Error('disk full');
    fileSystemState.fs.set(
      this.uri,
      typeof content === 'string' ? { dir: false, text: content } : { dir: false, data: content },
    );
  }
  async text() {
    const entry = fileSystemState.fs.get(this.uri);
    return entry?.text ?? (entry?.data ? new TextDecoder().decode(entry.data) : '');
  }
  async bytes() {
    const entry = fileSystemState.fs.get(this.uri);
    return entry?.data ?? new TextEncoder().encode(entry?.text ?? '');
  }
  delete() {
    fileSystemState.fs.delete(this.uri);
  }
}

class Directory {
  uri: string;
  constructor(...parts: Part[]) {
    this.uri = join(parts);
  }
  get exists() {
    return fileSystemState.fs.get(this.uri)?.dir === true;
  }
  get name() {
    return nameOf(this.uri);
  }
  create() {
    if (fileSystemState.failCreate) throw new Error('read only');
    for (let uri = this.uri; uri.startsWith(DOCUMENT); uri = parentOf(uri)) {
      fileSystemState.fs.set(uri, { dir: true });
    }
  }
  delete() {
    removeTree(this.uri);
  }
  rename() {
    throw new Error('rename is never used');
  }
  list() {
    return [...fileSystemState.fs.entries()]
      .filter(([key]) => key.startsWith(`${this.uri}/`) && !key.slice(this.uri.length + 1).includes('/'))
      .map(([key, entry]) => (entry.dir ? new Directory(key) : new File(key)));
  }
}

export const expoFileSystemMock = {
  Directory,
  File,
  Paths: {
    document: { uri: DOCUMENT },
    get availableDiskSpace() {
      return fileSystemState.space;
    },
  },
};
