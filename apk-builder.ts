import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface ApkBuildConfig {
  packageName: string;
  appName: string;
  versionName: string;
  versionCode: number;
  minSdkVersion: number;
  targetSdkVersion: number;
  htmlContent: string;
  iconPngBuffer?: Buffer;
}

export interface ApkBuildMetadata {
  fileName: string;
  packageName: string;
  appName: string;
  versionName: string;
  versionCode: number;
  minSdkVersion: number;
  targetSdkVersion: number;
  sizeBytes: number;
  sha256Apk: string;
  certSha256Fingerprint: string;
  certSubject: string;
  dexSha1: string;
  dexAdler32: string;
  signatureSchemes: string[];
  builtAt: string;
  downloadUrl: string;
}

// Cached RSA keypair & certificate so builds are fast and deterministic per server run
let cachedSigningCreds: {
  keyPem: string;
  certPem: string;
  certDer: Buffer;
  spkiDer: Buffer;
  certSha256Fingerprint: string;
} | null = null;

export function getOrGenerateSigningCredentials() {
  if (cachedSigningCreds) return cachedSigningCreds;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apk-sign-'));
  const keyPath = path.join(tmpDir, 'release-key.pem');
  const certPath = path.join(tmpDir, 'release-cert.pem');
  const certDerPath = path.join(tmpDir, 'release-cert.der');

  try {
    execSync(
      `openssl req -x509 -newkey rsa:2048 -nodes -keyout "${keyPath}" -out "${certPath}" -days 10000 -subj "/CN=SCHEVANKA Gold Terminal/OU=Mobile Engineering/O=SCHEVANKA Institutional/L=Jakarta/ST=DKI Jakarta/C=ID" -sha256 2>/dev/null`
    );
    execSync(`openssl x509 -in "${certPath}" -outform DER -out "${certDerPath}" 2>/dev/null`);

    const keyPem = fs.readFileSync(keyPath, 'utf-8');
    const certPem = fs.readFileSync(certPath, 'utf-8');
    const certDer = fs.readFileSync(certDerPath);

    const pubKeyObj = crypto.createPublicKey(certPem);
    const spkiDer = pubKeyObj.export({ type: 'spki', format: 'der' }) as Buffer;

    const hashHex = crypto.createHash('sha256').update(certDer).digest('hex').toUpperCase();
    const certSha256Fingerprint = hashHex.match(/.{2}/g)!.join(':');

    cachedSigningCreds = {
      keyPem,
      certPem,
      certDer,
      spkiDer,
      certSha256Fingerprint,
    };
    return cachedSigningCreds;
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

/**
 * Builds a valid Android Binary XML (AXML) buffer for AndroidManifest.xml.
 */
export function buildBinaryAndroidManifest(cfg: ApkBuildConfig): Buffer {
  // Attribute resource IDs in strictly ascending order
  const attrDefs: Array<{ name: string; id: number }> = [
    { name: 'theme', id: 0x01010000 },
    { name: 'label', id: 0x01010001 },
    { name: 'icon', id: 0x01010002 },
    { name: 'name', id: 0x01010003 },
    { name: 'exported', id: 0x01010010 },
    { name: 'configChanges', id: 0x0101001f },
    { name: 'minSdkVersion', id: 0x0101020c },
    { name: 'versionCode', id: 0x0101021b },
    { name: 'versionName', id: 0x0101021c },
    { name: 'targetSdkVersion', id: 0x01010270 },
    { name: 'allowBackup', id: 0x01010280 },
    { name: 'hardwareAccelerated', id: 0x010102d3 },
    { name: 'usesCleartextTraffic', id: 0x010104ec },
  ];

  const activityClassName = `${cfg.packageName}.MainActivity`;

  const extraStrings = [
    'package',
    'android',
    'http://schemas.android.com/apk/res/android',
    'manifest',
    'uses-sdk',
    'uses-permission',
    'android.permission.INTERNET',
    'android.permission.ACCESS_NETWORK_STATE',
    'application',
    'activity',
    'intent-filter',
    'action',
    'android.intent.action.MAIN',
    'category',
    'android.intent.category.LAUNCHER',
    cfg.packageName,
    cfg.versionName,
    cfg.appName,
    activityClassName,
  ];

  const allStrings = [...attrDefs.map((a) => a.name), ...extraStrings];
  const strIdx = (s: string): number => {
    const i = allStrings.indexOf(s);
    if (i === -1) throw new Error(`Missing AXML string: ${s}`);
    return i;
  };

  // Encode UTF-16LE StringPool
  const encodedStrings: Buffer[] = [];
  const stringOffsets: number[] = [];
  let currentOffset = 0;

  for (const s of allStrings) {
    stringOffsets.push(currentOffset);
    const charLen = s.length;
    const buf = Buffer.alloc(2 + charLen * 2 + 2);
    buf.writeUInt16LE(charLen, 0);
    buf.write(s, 2, charLen * 2, 'utf16le');
    buf.writeUInt16LE(0, 2 + charLen * 2);
    encodedStrings.push(buf);
    currentOffset += buf.length;
  }

  const rawStringBytes = Buffer.concat(encodedStrings);
  const padLen = (4 - (rawStringBytes.length % 4)) % 4;
  const paddedStringBytes = Buffer.concat([rawStringBytes, Buffer.alloc(padLen)]);

  const stringPoolHeaderSize = 28;
  const offsetsSize = allStrings.length * 4;
  const stringsStart = stringPoolHeaderSize + offsetsSize;
  const stringPoolTotalSize = stringsStart + paddedStringBytes.length;

  const stringPoolChunk = Buffer.alloc(stringPoolTotalSize);
  stringPoolChunk.writeUInt16LE(0x0001, 0); // RES_STRING_POOL_TYPE
  stringPoolChunk.writeUInt16LE(stringPoolHeaderSize, 2);
  stringPoolChunk.writeUInt32LE(stringPoolTotalSize, 4);
  stringPoolChunk.writeUInt32LE(allStrings.length, 8); // stringCount
  stringPoolChunk.writeUInt32LE(0, 12); // styleCount
  stringPoolChunk.writeUInt32LE(0, 16); // flags = 0 (UTF-16LE)
  stringPoolChunk.writeUInt32LE(stringsStart, 20);
  stringPoolChunk.writeUInt32LE(0, 24); // stylesStart

  for (let i = 0; i < stringOffsets.length; i++) {
    stringPoolChunk.writeUInt32LE(stringOffsets[i], 28 + i * 4);
  }
  paddedStringBytes.copy(stringPoolChunk, stringsStart);

  // ResourceMap chunk (RES_XML_RESOURCE_MAP_TYPE = 0x0180)
  const resMapSize = 8 + attrDefs.length * 4;
  const resMapChunk = Buffer.alloc(resMapSize);
  resMapChunk.writeUInt16LE(0x0180, 0);
  resMapChunk.writeUInt16LE(8, 2);
  resMapChunk.writeUInt32LE(resMapSize, 4);
  for (let i = 0; i < attrDefs.length; i++) {
    resMapChunk.writeUInt32LE(attrDefs[i].id, 8 + i * 4);
  }

  const nsPrefix = strIdx('android');
  const nsUri = strIdx('http://schemas.android.com/apk/res/android');
  const NO_NS = 0xffffffff;

  function makeNamespaceChunk(isStart: boolean, line: number): Buffer {
    const b = Buffer.alloc(24);
    b.writeUInt16LE(isStart ? 0x0100 : 0x0101, 0);
    b.writeUInt16LE(16, 2);
    b.writeUInt32LE(24, 4);
    b.writeUInt32LE(line, 8);
    b.writeUInt32LE(0xffffffff, 12);
    b.writeUInt32LE(nsPrefix, 16);
    b.writeUInt32LE(nsUri, 20);
    return b;
  }

  interface XmlAttr {
    ns: number;
    nameIdx: number;
    rawValueIdx: number;
    dataType: number; // 0x03=STRING, 0x10=INT_DEC, 0x11=INT_HEX, 0x12=BOOLEAN, 0x01=REFERENCE
    data: number;
  }

  function makeStartElement(elemName: string, line: number, attrs: XmlAttr[]): Buffer {
    // Sort attributes by nameIdx (which puts resource-mapped attributes first in ascending resource ID order)
    const sortedAttrs = [...attrs].sort((a, b) => a.nameIdx - b.nameIdx);
    const totalSize = 16 + 20 + sortedAttrs.length * 20;
    const b = Buffer.alloc(totalSize);
    b.writeUInt16LE(0x0102, 0); // RES_XML_START_ELEMENT_TYPE
    b.writeUInt16LE(16, 2);
    b.writeUInt32LE(totalSize, 4);
    b.writeUInt32LE(line, 8);
    b.writeUInt32LE(0xffffffff, 12);

    // ResXMLTree_attrExt
    b.writeUInt32LE(NO_NS, 16);
    b.writeUInt32LE(strIdx(elemName), 20);
    b.writeUInt16LE(20, 24); // attributeStart
    b.writeUInt16LE(20, 26); // attributeSize
    b.writeUInt16LE(sortedAttrs.length, 28); // attributeCount
    b.writeUInt16LE(0, 30); // idIndex
    b.writeUInt16LE(0, 32); // classIndex
    b.writeUInt16LE(0, 34); // styleIndex

    for (let i = 0; i < sortedAttrs.length; i++) {
      const a = sortedAttrs[i];
      const off = 36 + i * 20;
      b.writeUInt32LE(a.ns, off);
      b.writeUInt32LE(a.nameIdx, off + 4);
      b.writeUInt32LE(a.rawValueIdx, off + 8);
      b.writeUInt16LE(8, off + 12); // typedValue.size = 8
      b.writeUInt8(0, off + 14); // res0 = 0
      b.writeUInt8(a.dataType, off + 15);
      b.writeUInt32LE(a.data >>> 0, off + 16);
    }
    return b;
  }

  function makeEndElement(elemName: string, line: number): Buffer {
    const b = Buffer.alloc(24);
    b.writeUInt16LE(0x0103, 0); // RES_XML_END_ELEMENT_TYPE
    b.writeUInt16LE(16, 2);
    b.writeUInt32LE(24, 4);
    b.writeUInt32LE(line, 8);
    b.writeUInt32LE(0xffffffff, 12);
    b.writeUInt32LE(NO_NS, 16);
    b.writeUInt32LE(strIdx(elemName), 20);
    return b;
  }

  function attrString(ns: number, attrName: string, valStr: string): XmlAttr {
    const vIdx = strIdx(valStr);
    return {
      ns,
      nameIdx: strIdx(attrName),
      rawValueIdx: vIdx,
      dataType: 0x03,
      data: vIdx,
    };
  }

  function attrInt(ns: number, attrName: string, val: number, isHex = false): XmlAttr {
    return {
      ns,
      nameIdx: strIdx(attrName),
      rawValueIdx: 0xffffffff,
      dataType: isHex ? 0x11 : 0x10,
      data: val >>> 0,
    };
  }

  function attrBool(ns: number, attrName: string, val: boolean): XmlAttr {
    return {
      ns,
      nameIdx: strIdx(attrName),
      rawValueIdx: 0xffffffff,
      dataType: 0x12,
      data: val ? 0xffffffff : 0x00000000,
    };
  }

  function attrRef(ns: number, attrName: string, resId: number): XmlAttr {
    return {
      ns,
      nameIdx: strIdx(attrName),
      rawValueIdx: 0xffffffff,
      dataType: 0x01,
      data: resId >>> 0,
    };
  }

  const xmlNodes: Buffer[] = [
    makeNamespaceChunk(true, 2),

    // <manifest package="..." android:versionCode="1" android:versionName="1.0.0">
    makeStartElement('manifest', 2, [
      attrInt(nsUri, 'versionCode', cfg.versionCode),
      attrString(nsUri, 'versionName', cfg.versionName),
      attrString(NO_NS, 'package', cfg.packageName),
    ]),

    // <uses-sdk android:minSdkVersion="24" android:targetSdkVersion="28" />
    makeStartElement('uses-sdk', 4, [
      attrInt(nsUri, 'minSdkVersion', cfg.minSdkVersion),
      attrInt(nsUri, 'targetSdkVersion', cfg.targetSdkVersion),
    ]),
    makeEndElement('uses-sdk', 4),

    // <uses-permission android:name="android.permission.INTERNET" />
    makeStartElement('uses-permission', 6, [
      attrString(nsUri, 'name', 'android.permission.INTERNET'),
    ]),
    makeEndElement('uses-permission', 6),

    // <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    makeStartElement('uses-permission', 7, [
      attrString(nsUri, 'name', 'android.permission.ACCESS_NETWORK_STATE'),
    ]),
    makeEndElement('uses-permission', 7),

    // <application ...>
    makeStartElement('application', 9, [
      attrRef(nsUri, 'theme', 0x01030129), // @android:style/Theme.DeviceDefault.NoActionBar
      attrString(nsUri, 'label', cfg.appName),
      attrRef(nsUri, 'icon', 0x01080093), // @android:drawable/sym_def_app_icon
      attrBool(nsUri, 'allowBackup', true),
      attrBool(nsUri, 'hardwareAccelerated', true),
      attrBool(nsUri, 'usesCleartextTraffic', true),
    ]),

    // <activity ...>
    makeStartElement('activity', 15, [
      attrString(nsUri, 'label', cfg.appName),
      attrString(nsUri, 'name', activityClassName),
      attrBool(nsUri, 'exported', true),
      attrInt(nsUri, 'configChanges', 0x000004a0, true), // orientation|keyboardHidden|screenSize
    ]),

    // <intent-filter>
    makeStartElement('intent-filter', 20, []),
    makeStartElement('action', 21, [
      attrString(nsUri, 'name', 'android.intent.action.MAIN'),
    ]),
    makeEndElement('action', 21),
    makeStartElement('category', 22, [
      attrString(nsUri, 'name', 'android.intent.category.LAUNCHER'),
    ]),
    makeEndElement('category', 22),
    makeEndElement('intent-filter', 23),

    makeEndElement('activity', 24),
    makeEndElement('application', 25),
    makeEndElement('manifest', 26),
    makeNamespaceChunk(false, 26),
  ];

  const body = Buffer.concat([stringPoolChunk, resMapChunk, ...xmlNodes]);
  const header = Buffer.alloc(8);
  header.writeUInt16LE(0x0003, 0); // RES_XML_TYPE
  header.writeUInt16LE(8, 2);
  header.writeUInt32LE(8 + body.length, 4);

  return Buffer.concat([header, body]);
}

/**
 * Builds a minimal valid Android Resource Table (resources.arsc)
 */
export function buildResourcesArsc(packageName: string): Buffer {
  // Global string pool with 1 string ("res/drawable/ic_launcher.png")
  const str = 'res/drawable/ic_launcher.png';
  const strBuf = Buffer.alloc(2 + str.length * 2 + 2);
  strBuf.writeUInt16LE(str.length, 0);
  strBuf.write(str, 2, str.length * 2, 'utf16le');
  strBuf.writeUInt16LE(0, 2 + str.length * 2);
  const pad = (4 - (strBuf.length % 4)) % 4;
  const paddedStr = Buffer.concat([strBuf, Buffer.alloc(pad)]);

  const spSize = 28 + 4 + paddedStr.length;
  const sp = Buffer.alloc(spSize);
  sp.writeUInt16LE(0x0001, 0); // RES_STRING_POOL_TYPE
  sp.writeUInt16LE(28, 2);
  sp.writeUInt32LE(spSize, 4);
  sp.writeUInt32LE(1, 8); // 1 string
  sp.writeUInt32LE(0, 12);
  sp.writeUInt32LE(0, 16);
  sp.writeUInt32LE(32, 20);
  sp.writeUInt32LE(0, 24);
  sp.writeUInt32LE(0, 28);
  paddedStr.copy(sp, 32);

  // Empty TypeStrings & KeyStrings pools for ResTable_package
  const emptyPool = Buffer.alloc(28);
  emptyPool.writeUInt16LE(0x0001, 0);
  emptyPool.writeUInt16LE(28, 2);
  emptyPool.writeUInt32LE(28, 4);
  emptyPool.writeUInt32LE(0, 8);
  emptyPool.writeUInt32LE(0, 12);
  emptyPool.writeUInt32LE(0, 16);
  emptyPool.writeUInt32LE(28, 20);
  emptyPool.writeUInt32LE(0, 24);

  const pkgHeaderSize = 288;
  const pkgTotalSize = pkgHeaderSize + emptyPool.length * 2;
  const pkg = Buffer.alloc(pkgTotalSize);
  pkg.writeUInt16LE(0x0200, 0); // RES_TABLE_PACKAGE_TYPE
  pkg.writeUInt16LE(pkgHeaderSize, 2);
  pkg.writeUInt32LE(pkgTotalSize, 4);
  pkg.writeUInt32LE(0x7f, 8); // user package ID 0x7f
  pkg.write(packageName.slice(0, 127), 12, 'utf16le');
  pkg.writeUInt32LE(pkgHeaderSize, 268); // typeStrings offset
  pkg.writeUInt32LE(0, 272); // lastPublicType
  pkg.writeUInt32LE(pkgHeaderSize + emptyPool.length, 276); // keyStrings offset
  pkg.writeUInt32LE(0, 280); // lastPublicKey
  pkg.writeUInt32LE(0, 284); // typeIdOffset

  emptyPool.copy(pkg, pkgHeaderSize);
  emptyPool.copy(pkg, pkgHeaderSize + emptyPool.length);

  const totalSize = 12 + sp.length + pkg.length;
  const tableHeader = Buffer.alloc(12);
  tableHeader.writeUInt16LE(0x0002, 0); // RES_TABLE_TYPE
  tableHeader.writeUInt16LE(12, 2);
  tableHeader.writeUInt32LE(totalSize, 4);
  tableHeader.writeUInt32LE(1, 8); // packageCount = 1

  return Buffer.concat([tableHeader, sp, pkg]);
}

function encodeUleb128(value: number): Buffer {
  const bytes: number[] = [];
  let v = value >>> 0;
  do {
    let b = v & 0x7f;
    v >>>= 7;
    if (v !== 0) b |= 0x80;
    bytes.push(b);
  } while (v !== 0);
  return Buffer.from(bytes);
}

function computeAdler32(buf: Buffer): number {
  const MOD_ADLER = 65521;
  let a = 1;
  let b = 0;
  for (let i = 0; i < buf.length; i++) {
    a = (a + buf[i]) % MOD_ADLER;
    b = (b + a) % MOD_ADLER;
  }
  return ((b << 16) | a) >>> 0;
}

/**
 * Builds a 100% valid Dalvik Executable (classes.dex) containing MainActivity
 * extending android.app.Activity that initializes a full-screen WebView and loads
 * file:///android_asset/index.html.
 */
export function buildClassesDex(packageName: string): {
  dexBuffer: Buffer;
  sha1Hex: string;
  adler32Hex: string;
} {
  const mainActivityDesc = `L${packageName.replace(/\./g, '/')}/MainActivity;`;

  // All strings needed in the DEX file, sorted strictly in UTF-8 lexicographical order
  const rawStrings = [
    '<init>',
    'Landroid/app/Activity;',
    'Landroid/content/Context;',
    'Landroid/os/Bundle;',
    'Landroid/view/View;',
    'Landroid/webkit/WebSettings;',
    'Landroid/webkit/WebView;',
    'Landroid/webkit/WebViewClient;',
    'Ljava/lang/Object;',
    'Ljava/lang/String;',
    'MainActivity.java',
    'V',
    'VL',
    'VZ',
    'Z',
    'file:///android_asset/index.html',
    'getSettings',
    'loadUrl',
    'onCreate',
    'setContentView',
    'setDomStorageEnabled',
    'setJavaScriptEnabled',
    'setWebViewClient',
    mainActivityDesc,
  ];
  const strings = Array.from(new Set(rawStrings)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const sIdx = (s: string) => {
    const i = strings.indexOf(s);
    if (i === -1) throw new Error(`DEX string missing: ${s}`);
    return i;
  };

  // Type descriptors sorted by their string index
  const rawTypes = [
    'Landroid/app/Activity;',
    'Landroid/content/Context;',
    'Landroid/os/Bundle;',
    'Landroid/view/View;',
    'Landroid/webkit/WebSettings;',
    'Landroid/webkit/WebView;',
    'Landroid/webkit/WebViewClient;',
    'Ljava/lang/Object;',
    'Ljava/lang/String;',
    'V',
    'Z',
    mainActivityDesc,
  ];
  const types = [...rawTypes].sort((a, b) => sIdx(a) - sIdx(b));
  const tIdx = (t: string) => {
    const i = types.indexOf(t);
    if (i === -1) throw new Error(`DEX type missing: ${t}`);
    return i;
  };

  // Prototypes:
  // ()V, (Landroid/content/Context;)V, (Landroid/os/Bundle;)V, (Landroid/view/View;)V,
  // (Landroid/webkit/WebViewClient;)V, (Ljava/lang/String;)V, (Z)V, ()Landroid/webkit/WebSettings;
  interface ProtoDef {
    id: string;
    shorty: string;
    returnType: string;
    params: string[];
  }
  const rawProtos: ProtoDef[] = [
    { id: '()V', shorty: 'V', returnType: 'V', params: [] },
    { id: '(Context)V', shorty: 'VL', returnType: 'V', params: ['Landroid/content/Context;'] },
    { id: '(Bundle)V', shorty: 'VL', returnType: 'V', params: ['Landroid/os/Bundle;'] },
    { id: '(View)V', shorty: 'VL', returnType: 'V', params: ['Landroid/view/View;'] },
    { id: '(WebViewClient)V', shorty: 'VL', returnType: 'V', params: ['Landroid/webkit/WebViewClient;'] },
    { id: '(String)V', shorty: 'VL', returnType: 'V', params: ['Ljava/lang/String;'] },
    { id: '(Z)V', shorty: 'VZ', returnType: 'V', params: ['Z'] },
    { id: '()WebSettings', shorty: 'L', returnType: 'Landroid/webkit/WebSettings;', params: [] },
  ];

  // Ensure 'L' shorty is in strings! Wait: let's make sure 'L' is in rawStrings above!
  // Wait: let's check if 'L' was in rawStrings. Let's handle that cleanly by building strings after defining protos.
  return buildClassesDexWithFullTables(packageName);
}

function buildClassesDexWithFullTables(packageName: string): {
  dexBuffer: Buffer;
  sha1Hex: string;
  adler32Hex: string;
} {
  const mainActivityDesc = `L${packageName.replace(/\./g, '/')}/MainActivity;`;

  const rawStrings = [
    '<init>',
    'L',
    'Landroid/app/Activity;',
    'Landroid/content/Context;',
    'Landroid/os/Bundle;',
    'Landroid/view/View;',
    'Landroid/webkit/WebSettings;',
    'Landroid/webkit/WebView;',
    'Landroid/webkit/WebViewClient;',
    'Ljava/lang/Object;',
    'Ljava/lang/String;',
    'MainActivity.java',
    'V',
    'VL',
    'VZ',
    'Z',
    'file:///android_asset/index.html',
    'getSettings',
    'loadUrl',
    'onCreate',
    'setContentView',
    'setDomStorageEnabled',
    'setJavaScriptEnabled',
    'setWebViewClient',
    mainActivityDesc,
  ];

  const strings = Array.from(new Set(rawStrings)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const sIdx = (s: string) => {
    const idx = strings.indexOf(s);
    if (idx === -1) throw new Error(`Missing DEX string: ${s}`);
    return idx;
  };

  const rawTypes = [
    'Landroid/app/Activity;',
    'Landroid/content/Context;',
    'Landroid/os/Bundle;',
    'Landroid/view/View;',
    'Landroid/webkit/WebSettings;',
    'Landroid/webkit/WebView;',
    'Landroid/webkit/WebViewClient;',
    'Ljava/lang/Object;',
    'Ljava/lang/String;',
    'V',
    'Z',
    mainActivityDesc,
  ];
  const types = [...rawTypes].sort((a, b) => sIdx(a) - sIdx(b));
  const tIdx = (t: string) => {
    const idx = types.indexOf(t);
    if (idx === -1) throw new Error(`Missing DEX type: ${t}`);
    return idx;
  };

  interface ProtoDef {
    key: string;
    shorty: string;
    returnType: string;
    params: string[];
  }
  const rawProtos: ProtoDef[] = [
    { key: '()V', shorty: 'V', returnType: 'V', params: [] },
    { key: '(Context)V', shorty: 'VL', returnType: 'V', params: ['Landroid/content/Context;'] },
    { key: '(Bundle)V', shorty: 'VL', returnType: 'V', params: ['Landroid/os/Bundle;'] },
    { key: '(View)V', shorty: 'VL', returnType: 'V', params: ['Landroid/view/View;'] },
    { key: '(WebViewClient)V', shorty: 'VL', returnType: 'V', params: ['Landroid/webkit/WebViewClient;'] },
    { key: '(String)V', shorty: 'VL', returnType: 'V', params: ['Ljava/lang/String;'] },
    { key: '(Z)V', shorty: 'VZ', returnType: 'V', params: ['Z'] },
    { key: '()WebSettings', shorty: 'L', returnType: 'Landroid/webkit/WebSettings;', params: [] },
  ];

  // Sort protos by return_type idx, then parameter type indices lexicographically
  const protos = [...rawProtos].sort((a, b) => {
    const rDiff = tIdx(a.returnType) - tIdx(b.returnType);
    if (rDiff !== 0) return rDiff;
    const minLen = Math.min(a.params.length, b.params.length);
    for (let i = 0; i < minLen; i++) {
      const pDiff = tIdx(a.params[i]) - tIdx(b.params[i]);
      if (pDiff !== 0) return pDiff;
    }
    return a.params.length - b.params.length;
  });
  const pIdx = (key: string) => {
    const idx = protos.findIndex((p) => p.key === key);
    if (idx === -1) throw new Error(`Missing DEX proto: ${key}`);
    return idx;
  };

  interface MethodDef {
    key: string;
    classType: string;
    name: string;
    protoKey: string;
  }
  const rawMethods: MethodDef[] = [
    { key: 'Activity.<init>', classType: 'Landroid/app/Activity;', name: '<init>', protoKey: '()V' },
    { key: 'Activity.onCreate', classType: 'Landroid/app/Activity;', name: 'onCreate', protoKey: '(Bundle)V' },
    { key: 'Activity.setContentView', classType: 'Landroid/app/Activity;', name: 'setContentView', protoKey: '(View)V' },
    { key: 'WebSettings.setDomStorageEnabled', classType: 'Landroid/webkit/WebSettings;', name: 'setDomStorageEnabled', protoKey: '(Z)V' },
    { key: 'WebSettings.setJavaScriptEnabled', classType: 'Landroid/webkit/WebSettings;', name: 'setJavaScriptEnabled', protoKey: '(Z)V' },
    { key: 'WebView.<init>', classType: 'Landroid/webkit/WebView;', name: '<init>', protoKey: '(Context)V' },
    { key: 'WebView.getSettings', classType: 'Landroid/webkit/WebView;', name: 'getSettings', protoKey: '()WebSettings' },
    { key: 'WebView.loadUrl', classType: 'Landroid/webkit/WebView;', name: 'loadUrl', protoKey: '(String)V' },
    { key: 'WebView.setWebViewClient', classType: 'Landroid/webkit/WebView;', name: 'setWebViewClient', protoKey: '(WebViewClient)V' },
    { key: 'WebViewClient.<init>', classType: 'Landroid/webkit/WebViewClient;', name: '<init>', protoKey: '()V' },
    { key: 'MainActivity.<init>', classType: mainActivityDesc, name: '<init>', protoKey: '()V' },
    { key: 'MainActivity.onCreate', classType: mainActivityDesc, name: 'onCreate', protoKey: '(Bundle)V' },
  ];

  // Sort methods by class_idx, then name_idx, then proto_idx
  const methods = [...rawMethods].sort((a, b) => {
    const cDiff = tIdx(a.classType) - tIdx(b.classType);
    if (cDiff !== 0) return cDiff;
    const nDiff = sIdx(a.name) - sIdx(b.name);
    if (nDiff !== 0) return nDiff;
    return pIdx(a.protoKey) - pIdx(b.protoKey);
  });
  const mIdx = (key: string) => {
    const idx = methods.findIndex((m) => m.key === key);
    if (idx === -1) throw new Error(`Missing DEX method: ${key}`);
    return idx;
  };

  // Fixed section layout:
  // 0x0000..0x0070: Header (112 bytes)
  // string_ids: strings.length * 4
  // type_ids: types.length * 4
  // proto_ids: protos.length * 12
  // method_ids: methods.length * 8
  // class_defs: 1 * 32
  const headerOff = 0;
  const stringIdsOff = 112;
  const typeIdsOff = stringIdsOff + strings.length * 4;
  const protoIdsOff = typeIdsOff + types.length * 4;
  const methodIdsOff = protoIdsOff + protos.length * 12;
  const classDefsOff = methodIdsOff + methods.length * 8;
  const dataSectionStart = classDefsOff + 32;

  // Build Data Section items with proper alignment
  const dataChunks: Buffer[] = [];
  let curDataOff = dataSectionStart;
  const align4 = () => {
    const pad = (4 - (curDataOff % 4)) % 4;
    if (pad > 0) {
      dataChunks.push(Buffer.alloc(pad));
      curDataOff += pad;
    }
  };

  // 1. type_list items for protos with parameters
  const protoTypeListOffs = new Map<string, number>();
  align4();
  const typeListMapOff = curDataOff;
  let typeListCount = 0;
  for (const p of protos) {
    if (p.params.length > 0) {
      align4();
      protoTypeListOffs.set(p.key, curDataOff);
      const tlBuf = Buffer.alloc(4 + p.params.length * 2);
      tlBuf.writeUInt32LE(p.params.length, 0);
      for (let i = 0; i < p.params.length; i++) {
        tlBuf.writeUInt16LE(tIdx(p.params[i]), 4 + i * 2);
      }
      dataChunks.push(tlBuf);
      curDataOff += tlBuf.length;
      typeListCount++;
    }
  }

  // 2. code_item for MainActivity.<init>()V and MainActivity.onCreate(Bundle)V
  align4();
  const codeItemSectionOff = curDataOff;

  // Code item 1: MainActivity.<init>()V
  const initCodeOff = curDataOff;
  const initCodeBuf = Buffer.alloc(16 + 8); // 16-byte header + 4 words (8 bytes)
  initCodeBuf.writeUInt16LE(1, 0); // registers_size = 1 (p0 = v0)
  initCodeBuf.writeUInt16LE(1, 2); // ins_size = 1
  initCodeBuf.writeUInt16LE(1, 4); // outs_size = 1
  initCodeBuf.writeUInt16LE(0, 6); // tries_size = 0
  initCodeBuf.writeUInt32LE(0, 8); // debug_info_off = 0
  initCodeBuf.writeUInt32LE(4, 12); // insns_size = 4 (16-bit code units)
  // invoke-direct {v0}, Landroid/app/Activity;-><init>()V
  initCodeBuf.writeUInt16LE(0x1070, 16);
  initCodeBuf.writeUInt16LE(mIdx('Activity.<init>'), 18);
  initCodeBuf.writeUInt16LE(0x0000, 20);
  // return-void
  initCodeBuf.writeUInt16LE(0x000e, 22);
  dataChunks.push(initCodeBuf);
  curDataOff += initCodeBuf.length;

  // Code item 2: MainActivity.onCreate(Landroid/os/Bundle;)V
  align4();
  const onCreateCodeOff = curDataOff;
  const insnsWords: number[] = [
    // invoke-super {v3, v4}, Activity.onCreate(Bundle)V
    0x206f,
    mIdx('Activity.onCreate'),
    0x0043,
    // new-instance v0, WebView
    0x0022,
    tIdx('Landroid/webkit/WebView;'),
    // invoke-direct {v0, v3}, WebView.<init>(Context)V
    0x2070,
    mIdx('WebView.<init>'),
    0x0030,
    // invoke-virtual {v0}, WebView.getSettings()WebSettings
    0x106e,
    mIdx('WebView.getSettings'),
    0x0000,
    // move-result-object v1
    0x010c,
    // const/4 v2, #1
    0x1212,
    // invoke-virtual {v1, v2}, WebSettings.setJavaScriptEnabled(Z)V
    0x206e,
    mIdx('WebSettings.setJavaScriptEnabled'),
    0x0021,
    // invoke-virtual {v1, v2}, WebSettings.setDomStorageEnabled(Z)V
    0x206e,
    mIdx('WebSettings.setDomStorageEnabled'),
    0x0021,
    // new-instance v2, WebViewClient
    0x0222,
    tIdx('Landroid/webkit/WebViewClient;'),
    // invoke-direct {v2}, WebViewClient.<init>()V
    0x1070,
    mIdx('WebViewClient.<init>'),
    0x0002,
    // invoke-virtual {v0, v2}, WebView.setWebViewClient(WebViewClient)V
    0x206e,
    mIdx('WebView.setWebViewClient'),
    0x0020,
    // const-string v2, "file:///android_asset/index.html"
    0x021a,
    sIdx('file:///android_asset/index.html'),
    // invoke-virtual {v0, v2}, WebView.loadUrl(String)V
    0x206e,
    mIdx('WebView.loadUrl'),
    0x0020,
    // invoke-virtual {v3, v0}, Activity.setContentView(View)V
    0x206e,
    mIdx('Activity.setContentView'),
    0x0003,
    // return-void
    0x000e,
  ];
  const onCreateCodeBuf = Buffer.alloc(16 + insnsWords.length * 2);
  onCreateCodeBuf.writeUInt16LE(5, 0); // registers_size = 5 (v0, v1, v2, p0=v3, p1=v4)
  onCreateCodeBuf.writeUInt16LE(2, 2); // ins_size = 2 (p0, p1)
  onCreateCodeBuf.writeUInt16LE(2, 4); // outs_size = 2
  onCreateCodeBuf.writeUInt16LE(0, 6); // tries_size = 0
  onCreateCodeBuf.writeUInt32LE(0, 8); // debug_info_off = 0
  onCreateCodeBuf.writeUInt32LE(insnsWords.length, 12);
  for (let i = 0; i < insnsWords.length; i++) {
    onCreateCodeBuf.writeUInt16LE(insnsWords[i], 16 + i * 2);
  }
  dataChunks.push(onCreateCodeBuf);
  curDataOff += onCreateCodeBuf.length;

  // 3. string_data_item for each string
  const stringDataSectionOff = curDataOff;
  const stringDataOffsets: number[] = [];
  for (const s of strings) {
    stringDataOffsets.push(curDataOff);
    const utf8Bytes = Buffer.from(s, 'utf8');
    const lenPrefix = encodeUleb128(s.length);
    const itemBuf = Buffer.concat([lenPrefix, utf8Bytes, Buffer.from([0x00])]);
    dataChunks.push(itemBuf);
    curDataOff += itemBuf.length;
  }

  // 4. class_data_item for MainActivity
  const classDataOff = curDataOff;
  const directMethodIdx = mIdx('MainActivity.<init>');
  const virtualMethodIdx = mIdx('MainActivity.onCreate');
  const classDataBuf = Buffer.concat([
    encodeUleb128(0), // static_fields_size = 0
    encodeUleb128(0), // instance_fields_size = 0
    encodeUleb128(1), // direct_methods_size = 1 (<init>)
    encodeUleb128(1), // virtual_methods_size = 1 (onCreate)
    // direct_methods[0]:
    encodeUleb128(directMethodIdx),
    encodeUleb128(0x10001), // ACC_PUBLIC | ACC_CONSTRUCTOR
    encodeUleb128(initCodeOff),
    // virtual_methods[0]:
    encodeUleb128(virtualMethodIdx),
    encodeUleb128(0x0001), // ACC_PUBLIC
    encodeUleb128(onCreateCodeOff),
  ]);
  dataChunks.push(classDataBuf);
  curDataOff += classDataBuf.length;

  // 5. map_list (4-byte aligned at end of file)
  align4();
  const mapOff = curDataOff;
  const mapItems: Array<{ type: number; size: number; offset: number }> = [
    { type: 0x0000, size: 1, offset: headerOff }, // TYPE_HEADER_ITEM
    { type: 0x0001, size: strings.length, offset: stringIdsOff }, // TYPE_STRING_ID_ITEM
    { type: 0x0002, size: types.length, offset: typeIdsOff }, // TYPE_TYPE_ID_ITEM
    { type: 0x0003, size: protos.length, offset: protoIdsOff }, // TYPE_PROTO_ID_ITEM
    { type: 0x0005, size: methods.length, offset: methodIdsOff }, // TYPE_METHOD_ID_ITEM
    { type: 0x0006, size: 1, offset: classDefsOff }, // TYPE_CLASS_DEF_ITEM
    { type: 0x1001, size: typeListCount, offset: typeListMapOff }, // TYPE_TYPE_LIST
    { type: 0x2001, size: 2, offset: codeItemSectionOff }, // TYPE_CODE_ITEM
    { type: 0x2002, size: strings.length, offset: stringDataSectionOff }, // TYPE_STRING_DATA_ITEM
    { type: 0x2000, size: 1, offset: classDataOff }, // TYPE_CLASS_DATA_ITEM
    { type: 0x1000, size: 1, offset: mapOff }, // TYPE_MAP_LIST
  ];
  const mapBuf = Buffer.alloc(4 + mapItems.length * 12);
  mapBuf.writeUInt32LE(mapItems.length, 0);
  for (let i = 0; i < mapItems.length; i++) {
    const off = 4 + i * 12;
    mapBuf.writeUInt16LE(mapItems[i].type, off);
    mapBuf.writeUInt16LE(0, off + 2);
    mapBuf.writeUInt32LE(mapItems[i].size, off + 4);
    mapBuf.writeUInt32LE(mapItems[i].offset, off + 8);
  }
  dataChunks.push(mapBuf);
  curDataOff += mapBuf.length;

  const fileSize = curDataOff;
  const dataSize = fileSize - dataSectionStart;

  // Assemble fixed sections
  const stringIdsBuf = Buffer.alloc(strings.length * 4);
  for (let i = 0; i < strings.length; i++) {
    stringIdsBuf.writeUInt32LE(stringDataOffsets[i], i * 4);
  }

  const typeIdsBuf = Buffer.alloc(types.length * 4);
  for (let i = 0; i < types.length; i++) {
    typeIdsBuf.writeUInt32LE(sIdx(types[i]), i * 4);
  }

  const protoIdsBuf = Buffer.alloc(protos.length * 12);
  for (let i = 0; i < protos.length; i++) {
    const p = protos[i];
    protoIdsBuf.writeUInt32LE(sIdx(p.shorty), i * 12);
    protoIdsBuf.writeUInt32LE(tIdx(p.returnType), i * 12 + 4);
    protoIdsBuf.writeUInt32LE(protoTypeListOffs.get(p.key) || 0, i * 12 + 8);
  }

  const methodIdsBuf = Buffer.alloc(methods.length * 8);
  for (let i = 0; i < methods.length; i++) {
    const m = methods[i];
    methodIdsBuf.writeUInt16LE(tIdx(m.classType), i * 8);
    methodIdsBuf.writeUInt16LE(pIdx(m.protoKey), i * 8 + 2);
    methodIdsBuf.writeUInt32LE(sIdx(m.name), i * 8 + 4);
  }

  const classDefsBuf = Buffer.alloc(32);
  classDefsBuf.writeUInt32LE(tIdx(mainActivityDesc), 0); // class_idx
  classDefsBuf.writeUInt32LE(0x0001, 4); // access_flags = ACC_PUBLIC
  classDefsBuf.writeUInt32LE(tIdx('Landroid/app/Activity;'), 8); // superclass_idx
  classDefsBuf.writeUInt32LE(0, 12); // interfaces_off
  classDefsBuf.writeUInt32LE(sIdx('MainActivity.java'), 16); // source_file_idx
  classDefsBuf.writeUInt32LE(0, 20); // annotations_off
  classDefsBuf.writeUInt32LE(classDataOff, 24); // class_data_off
  classDefsBuf.writeUInt32LE(0, 28); // static_values_off

  const headerBuf = Buffer.alloc(112);
  headerBuf.write('dex\n035\0', 0, 'utf8');
  headerBuf.writeUInt32LE(fileSize, 32);
  headerBuf.writeUInt32LE(112, 36); // header_size
  headerBuf.writeUInt32LE(0x12345678, 40); // endian_tag
  headerBuf.writeUInt32LE(0, 44); // link_size
  headerBuf.writeUInt32LE(0, 48); // link_off
  headerBuf.writeUInt32LE(mapOff, 52); // map_off
  headerBuf.writeUInt32LE(strings.length, 56); // string_ids_size
  headerBuf.writeUInt32LE(stringIdsOff, 60); // string_ids_off
  headerBuf.writeUInt32LE(types.length, 64); // type_ids_size
  headerBuf.writeUInt32LE(typeIdsOff, 68); // type_ids_off
  headerBuf.writeUInt32LE(protos.length, 72); // proto_ids_size
  headerBuf.writeUInt32LE(protoIdsOff, 76); // proto_ids_off
  headerBuf.writeUInt32LE(0, 80); // field_ids_size
  headerBuf.writeUInt32LE(0, 84); // field_ids_off
  headerBuf.writeUInt32LE(methods.length, 88); // method_ids_size
  headerBuf.writeUInt32LE(methodIdsOff, 92); // method_ids_off
  headerBuf.writeUInt32LE(1, 96); // class_defs_size
  headerBuf.writeUInt32LE(classDefsOff, 100); // class_defs_off
  headerBuf.writeUInt32LE(dataSize, 104); // data_size
  headerBuf.writeUInt32LE(dataSectionStart, 108); // data_off

  const fullDex = Buffer.concat([
    headerBuf,
    stringIdsBuf,
    typeIdsBuf,
    protoIdsBuf,
    methodIdsBuf,
    classDefsBuf,
    ...dataChunks,
  ]);

  // Compute SHA-1 over bytes [32..fileSize)
  const sha1 = crypto.createHash('sha1').update(fullDex.subarray(32)).digest();
  sha1.copy(fullDex, 12);

  // Compute Adler32 over bytes [12..fileSize)
  const adler = computeAdler32(fullDex.subarray(12));
  fullDex.writeUInt32LE(adler, 8);

  return {
    dexBuffer: fullDex,
    sha1Hex: sha1.toString('hex'),
    adler32Hex: adler.toString(16).padStart(8, '0'),
  };
}

// CRC-32 lookup table for ZIP entries
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Generates PKCS#7 / CMS detached signature for JAR v1 signing (META-INF/CERT.RSA)
 */
function signJarManifestSf(sfBuffer: Buffer, certPem: string, keyPem: string): Buffer {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jar-sig-'));
  const sfPath = path.join(tmpDir, 'CERT.SF');
  const certPath = path.join(tmpDir, 'cert.pem');
  const keyPath = path.join(tmpDir, 'key.pem');
  const rsaPath = path.join(tmpDir, 'CERT.RSA');

  try {
    fs.writeFileSync(sfPath, sfBuffer);
    fs.writeFileSync(certPath, certPem);
    fs.writeFileSync(keyPath, keyPem);
    execSync(
      `openssl cms -sign -binary -noattr -in "${sfPath}" -outform DER -out "${rsaPath}" -signer "${certPath}" -inkey "${keyPath}" -md sha256 2>/dev/null`
    );
    return fs.readFileSync(rsaPath);
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

function lengthPrefixed(buf: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32LE(buf.length, 0);
  return Buffer.concat([len, buf]);
}

/**
 * Computes APK Signature Scheme v2 chunked SHA-256 digest over the 3 ZIP sections
 */
function computeApkV2Digest(zipEntries: Buffer, centralDir: Buffer, eocdWithSigBlockOffset: Buffer): Buffer {
  const CHUNK_SIZE = 1024 * 1024; // 1 MB
  const chunkDigests: Buffer[] = [];
  let totalChunks = 0;

  for (const section of [zipEntries, centralDir, eocdWithSigBlockOffset]) {
    let offset = 0;
    while (offset < section.length) {
      const slice = section.subarray(offset, Math.min(offset + CHUNK_SIZE, section.length));
      const prefix = Buffer.alloc(5);
      prefix[0] = 0xa5;
      prefix.writeUInt32LE(slice.length, 1);
      const d = crypto.createHash('sha256').update(prefix).update(slice).digest();
      chunkDigests.push(d);
      totalChunks++;
      offset += CHUNK_SIZE;
    }
  }

  const topPrefix = Buffer.alloc(5);
  topPrefix[0] = 0x5a;
  topPrefix.writeUInt32LE(totalChunks, 1);
  return crypto
    .createHash('sha256')
    .update(topPrefix)
    .update(Buffer.concat(chunkDigests))
    .digest();
}

/**
 * Builds the APK Signing Block (APK Sig Block 42) containing APK Signature Scheme v2 (0x7109871a)
 */
function buildApkSigningBlockV2(
  topLevelDigest: Buffer,
  certDer: Buffer,
  spkiDer: Buffer,
  keyPem: string
): Buffer {
  const ALG_RSA_PKCS1_V1_5_SHA256 = 0x0103;

  // Digest entry: uint32(algId) + lengthPrefixed(digest)
  const algBuf = Buffer.alloc(4);
  algBuf.writeUInt32LE(ALG_RSA_PKCS1_V1_5_SHA256, 0);
  const singleDigest = lengthPrefixed(Buffer.concat([algBuf, lengthPrefixed(topLevelDigest)]));
  const digestsSeq = lengthPrefixed(singleDigest);

  // Certificates sequence
  const certsSeq = lengthPrefixed(lengthPrefixed(certDer));

  // Additional attributes (empty)
  const additionalAttrs = Buffer.alloc(4); // length = 0

  // signedData
  const signedData = Buffer.concat([digestsSeq, certsSeq, additionalAttrs]);

  // Sign signedData using RSA-SHA256 (PKCS#1 v1.5)
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signedData);
  const signatureBytes = signer.sign(keyPem);

  const singleSig = lengthPrefixed(Buffer.concat([algBuf, lengthPrefixed(signatureBytes)]));
  const signaturesSeq = lengthPrefixed(singleSig);

  const signerBlock = Buffer.concat([
    lengthPrefixed(signedData),
    signaturesSeq,
    lengthPrefixed(spkiDer),
  ]);

  const signersSeq = lengthPrefixed(lengthPrefixed(signerBlock));

  // Pair: uint64_le(4 + signersSeq.length) + uint32_le(0x7109871a) + signersSeq
  const pairLen = 4 + signersSeq.length;
  const pairHeader = Buffer.alloc(12);
  pairHeader.writeBigUInt64LE(BigInt(pairLen), 0);
  pairHeader.writeUInt32LE(0x7109871a, 8);
  const pairBuf = Buffer.concat([pairHeader, signersSeq]);

  // Pad pairBuf to 4096-byte alignment if desired, or exact 8-byte multiple
  const blockSizeExcludingFirst8 = BigInt(pairBuf.length + 8 + 16);
  const headSizeBuf = Buffer.alloc(8);
  headSizeBuf.writeBigUInt64LE(blockSizeExcludingFirst8, 0);

  const tailBuf = Buffer.alloc(24);
  tailBuf.writeBigUInt64LE(blockSizeExcludingFirst8, 0);
  tailBuf.write('APK Sig Block 42', 8, 'utf8');

  return Buffer.concat([headSizeBuf, pairBuf, tailBuf]);
}

/**
 * Assembles a 4-byte aligned, STOREd ZIP archive signed with BOTH
 * APK Signature Scheme v1 (JAR Signing) and APK Signature Scheme v2 (APK Sig Block 42).
 */
export function buildSignedAndroidApk(cfg: ApkBuildConfig & { fileName: string; downloadUrl: string }): {
  apkBuffer: Buffer;
  metadata: ApkBuildMetadata;
} {
  const creds = getOrGenerateSigningCredentials();
  const manifestXmlBuf = buildBinaryAndroidManifest(cfg);
  const resourcesArscBuf = buildResourcesArsc(cfg.packageName);
  const { dexBuffer, sha1Hex, adler32Hex } = buildClassesDex(cfg.packageName);
  const htmlAssetBuf = Buffer.from(cfg.htmlContent, 'utf-8');

  // Payload files
  const payloadEntries: Array<{ name: string; data: Buffer; align4: boolean }> = [
    { name: 'AndroidManifest.xml', data: manifestXmlBuf, align4: true },
    { name: 'resources.arsc', data: resourcesArscBuf, align4: true },
    { name: 'classes.dex', data: dexBuffer, align4: true },
    { name: 'assets/index.html', data: htmlAssetBuf, align4: false },
  ];

  if (cfg.iconPngBuffer) {
    payloadEntries.push({
      name: 'res/drawable/ic_launcher.png',
      data: cfg.iconPngBuffer,
      align4: true,
    });
  }

  // Build v1 JAR signature files: META-INF/MANIFEST.MF, META-INF/CERT.SF, META-INF/CERT.RSA
  const manifestLines: string[] = [
    'Manifest-Version: 1.0',
    'Created-By: 17.0.9 (SCHEVANKA Android APK Builder)',
    '',
  ];
  const sfEntries: string[] = [];

  for (const entry of payloadEntries) {
    const sha256B64 = crypto.createHash('sha256').update(entry.data).digest('base64');
    const section = `Name: ${entry.name}\r\nSHA-256-Digest: ${sha256B64}\r\n\r\n`;
    manifestLines.push(`Name: ${entry.name}`, `SHA-256-Digest: ${sha256B64}`, '');
    const sfSectionDigest = crypto.createHash('sha256').update(section, 'utf8').digest('base64');
    sfEntries.push(`Name: ${entry.name}`, `SHA-256-Digest: ${sfSectionDigest}`, '');
  }

  const manifestMfBuf = Buffer.from(manifestLines.join('\r\n'), 'utf8');
  const manifestFullDigest = crypto.createHash('sha256').update(manifestMfBuf).digest('base64');

  const sfLines = [
    'Signature-Version: 1.0',
    `SHA-256-Digest-Manifest: ${manifestFullDigest}`,
    'Created-By: 17.0.9 (SCHEVANKA Android APK Signer)',
    '',
    ...sfEntries,
  ];
  const certSfBuf = Buffer.from(sfLines.join('\r\n'), 'utf8');
  const certRsaBuf = signJarManifestSf(certSfBuf, creds.certPem, creds.keyPem);

  const allEntries: Array<{ name: string; data: Buffer; align4: boolean }> = [
    ...payloadEntries,
    { name: 'META-INF/MANIFEST.MF', data: manifestMfBuf, align4: false },
    { name: 'META-INF/CERT.SF', data: certSfBuf, align4: false },
    { name: 'META-INF/CERT.RSA', data: certRsaBuf, align4: false },
  ];

  // Assemble Local File Headers + Data (STORE method = 0, with 4-byte alignment via extra field)
  const localChunks: Buffer[] = [];
  const cdChunks: Buffer[] = [];
  let localOffset = 0;

  for (const entry of allEntries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const entryCrc = crc32(entry.data);
    let extraLen = 0;
    if (entry.align4) {
      const dataStartWithoutExtra = localOffset + 30 + nameBuf.length;
      extraLen = (4 - (dataStartWithoutExtra % 4)) % 4;
    }

    const lfh = Buffer.alloc(30 + nameBuf.length + extraLen);
    lfh.writeUInt32LE(0x04034b50, 0); // Local file header signature
    lfh.writeUInt16LE(20, 4); // Version needed to extract (2.0)
    lfh.writeUInt16LE(0, 6); // General purpose bit flag
    lfh.writeUInt16LE(0, 8); // Compression method = 0 (STORE)
    lfh.writeUInt16LE(0x0000, 10); // Last mod file time
    lfh.writeUInt16LE(0x5421, 12); // Last mod file date
    lfh.writeUInt32LE(entryCrc, 14);
    lfh.writeUInt32LE(entry.data.length, 18); // Compressed size
    lfh.writeUInt32LE(entry.data.length, 22); // Uncompressed size
    lfh.writeUInt16LE(nameBuf.length, 26);
    lfh.writeUInt16LE(extraLen, 28);
    nameBuf.copy(lfh, 30);

    localChunks.push(lfh, entry.data);

    // Central Directory Header (46 + nameBuf.length)
    const cdh = Buffer.alloc(46 + nameBuf.length);
    cdh.writeUInt32LE(0x02014b50, 0); // Central directory file header signature
    cdh.writeUInt16LE(20, 4); // Version made by
    cdh.writeUInt16LE(20, 6); // Version needed to extract
    cdh.writeUInt16LE(0, 8); // General purpose bit flag
    cdh.writeUInt16LE(0, 10); // Compression method = 0 (STORE)
    cdh.writeUInt16LE(0x0000, 12);
    cdh.writeUInt16LE(0x5421, 14);
    cdh.writeUInt32LE(entryCrc, 16);
    cdh.writeUInt32LE(entry.data.length, 20);
    cdh.writeUInt32LE(entry.data.length, 24);
    cdh.writeUInt16LE(nameBuf.length, 28);
    cdh.writeUInt16LE(0, 30); // Extra field length in CD
    cdh.writeUInt16LE(0, 32); // File comment length
    cdh.writeUInt16LE(0, 34); // Disk number start
    cdh.writeUInt16LE(0, 36); // Internal file attributes
    cdh.writeUInt32LE(0, 38); // External file attributes
    cdh.writeUInt32LE(localOffset, 42); // Relative offset of local header
    nameBuf.copy(cdh, 46);
    cdChunks.push(cdh);

    localOffset += lfh.length + entry.data.length;
  }

  // Ensure zipEntries length is a multiple of 4096 or 4 before APK Signing Block
  const zipEntriesBuf = Buffer.concat(localChunks);
  const centralDirBuf = Buffer.concat(cdChunks);

  // Build EOCD with centralDirectoryOffset = zipEntriesBuf.length (for v2 digest calculation)
  const makeEocd = (cdOffset: number) => {
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0); // End of central dir signature
    eocd.writeUInt16LE(0, 4); // Number of this disk
    eocd.writeUInt16LE(0, 6); // Disk where CD starts
    eocd.writeUInt16LE(allEntries.length, 8);
    eocd.writeUInt16LE(allEntries.length, 10);
    eocd.writeUInt32LE(centralDirBuf.length, 12);
    eocd.writeUInt32LE(cdOffset, 16);
    eocd.writeUInt16LE(0, 20); // Comment length = 0
    return eocd;
  };

  const eocdForDigest = makeEocd(zipEntriesBuf.length);
  const v2TopDigest = computeApkV2Digest(zipEntriesBuf, centralDirBuf, eocdForDigest);
  const apkSigBlock = buildApkSigningBlockV2(
    v2TopDigest,
    creds.certDer,
    creds.spkiDer,
    creds.keyPem
  );

  // Final EOCD has centralDirectoryOffset shifted by apkSigBlock.length
  const finalEocd = makeEocd(zipEntriesBuf.length + apkSigBlock.length);
  const apkBuffer = Buffer.concat([zipEntriesBuf, apkSigBlock, centralDirBuf, finalEocd]);

  const sha256Apk = crypto.createHash('sha256').update(apkBuffer).digest('hex');

  return {
    apkBuffer,
    metadata: {
      fileName: cfg.fileName,
      packageName: cfg.packageName,
      appName: cfg.appName,
      versionName: cfg.versionName,
      versionCode: cfg.versionCode,
      minSdkVersion: cfg.minSdkVersion,
      targetSdkVersion: cfg.targetSdkVersion,
      sizeBytes: apkBuffer.length,
      sha256Apk,
      certSha256Fingerprint: creds.certSha256Fingerprint,
      certSubject: 'CN=SCHEVANKA Gold Terminal, OU=Mobile Engineering, O=SCHEVANKA Institutional, L=Jakarta, ST=DKI Jakarta, C=ID',
      dexSha1: sha1Hex,
      dexAdler32: adler32Hex,
      signatureSchemes: ['v1 (JAR PKCS#7 RSA-2048)', 'v2 (APK Sig Block 42 • 0x7109871a)'],
      builtAt: new Date().toISOString(),
      downloadUrl: cfg.downloadUrl,
    },
  };
}

export const BROKER_BRIDGE_APK_HTML = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Broker Bridge Sync v1.0.0</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #070a0f; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-height: 100vh; display: flex; flex-direction: column; }
    .topbar { background: linear-gradient(135deg, #064e3b 0%, #0f172a 100%); padding: 16px; border-bottom: 1px solid rgba(16,185,129,0.3); display: flex; align-items: center; justify-content: space-between; }
    .brand { display: flex; align-items: center; gap: 10px; }
    .logo { width: 40px; height: 40px; border-radius: 12px; background: #10b981; color: #052e16; font-weight: 900; display: flex; align-items: center; justify-content: center; font-size: 16px; }
    .title { font-size: 15px; font-weight: 800; color: #fff; }
    .sub { font-size: 11px; color: #6ee7b7; font-family: monospace; }
    .badge { background: rgba(16,185,129,0.2); border: 1px solid #10b981; color: #34d399; padding: 4px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; font-family: monospace; }
    .main { flex: 1; padding: 16px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; }
    .card { background: #0f1623; border: 1px solid #1e293b; border-radius: 16px; padding: 14px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
    .box { background: #090d14; border: 1px solid #1e293b; border-radius: 10px; padding: 10px; }
    .lbl { font-size: 10px; color: #94a3b8; text-transform: uppercase; }
    .val { font-size: 14px; font-weight: 800; font-family: monospace; margin-top: 3px; color: #f8fafc; }
    .val.green { color: #34d399; }
    .val.amber { color: #fbbf24; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
    label { font-size: 11px; color: #94a3b8; font-weight: 600; display: block; margin-bottom: 4px; }
    input { width: 100%; background: #090d14; border: 1px solid #334155; border-radius: 10px; padding: 10px; color: #fff; font-size: 13px; font-family: monospace; }
    .btn { width: 100%; background: #10b981; color: #052e16; border: none; border-radius: 12px; padding: 13px; font-weight: 800; font-size: 13px; cursor: pointer; margin-top: 6px; }
    .btn-sec { width: 100%; background: #1e293b; color: #e2e8f0; border: 1px solid #334155; border-radius: 12px; padding: 11px; font-weight: 700; font-size: 12px; cursor: pointer; text-align: center; text-decoration: none; display: block; }
    .toast { padding: 10px 12px; border-radius: 10px; font-size: 12px; font-family: monospace; display: none; }
    .toast.ok { display: block; background: rgba(16,185,129,0.15); border: 1px solid #10b981; color: #6ee7b7; }
    .toast.err { display: block; background: rgba(239,68,68,0.15); border: 1px solid #ef4444; color: #fca5a5; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="brand">
      <div class="logo">BB</div>
      <div>
        <div class="title">Broker Bridge Sync</div>
        <div class="sub">com.example.brokerbridgesync • v1.0.0</div>
      </div>
    </div>
    <span class="badge">● WEBHOOK LIVE</span>
  </div>
  <div class="main">
    <div id="toast" class="toast"></div>
    <div class="card">
      <div style="font-size:12px;font-weight:700;color:#cbd5e1;">Sinkronisasi Akun Broker Real-Time</div>
      <div class="grid">
        <div class="box"><div class="lbl">Login ID</div><div id="vLogin" class="val amber">10894251</div></div>
        <div class="box"><div class="lbl">Server</div><div id="vServer" class="val">HFMarkets-LiveServer1</div></div>
        <div class="box"><div class="lbl">Balance</div><div id="vBal" class="val green">$1,500.00</div></div>
        <div class="box"><div class="lbl">Equity</div><div id="vEq" class="val green">$1,524.50</div></div>
      </div>
    </div>
    <div class="card">
      <div class="form-row">
        <div><label>Login ID</label><input id="inLogin" value="10894251" /></div>
        <div><label>Server</label><input id="inServer" value="HFMarkets-LiveServer1" /></div>
      </div>
      <div class="form-row">
        <div><label>Balance ($)</label><input id="inBal" type="number" step="0.01" value="1500.00" /></div>
        <div><label>Equity ($)</label><input id="inEq" type="number" step="0.01" value="1524.50" /></div>
      </div>
      <div class="form-row">
        <div><label>Margin ($)</label><input id="inMar" type="number" step="0.01" value="30.00" /></div>
        <div><label>Leverage</label><input id="inLev" type="number" value="500" /></div>
      </div>
      <button class="btn" onclick="syncNow()">⚡ Kirim POST Webhook Sync</button>
    </div>
    <a class="btn-sec" href="https://ais-pre-oj2gpgwetvago2t5xyvcxe-232925187258.asia-southeast1.run.app">🌐 Buka Layar Penuh SCHEVANKA Gold Terminal</a>
  </div>
  <script>
    const ENDPOINT = "https://ais-pre-oj2gpgwetvago2t5xyvcxe-232925187258.asia-southeast1.run.app/api/broker/bridge/webhook";
    async function syncNow() {
      const el = document.getElementById('toast');
      const bal = parseFloat(document.getElementById('inBal').value) || 0;
      const eq = parseFloat(document.getElementById('inEq').value) || 0;
      const mar = parseFloat(document.getElementById('inMar').value) || 0;
      const payload = {
        loginId: document.getElementById('inLogin').value.trim(),
        server: document.getElementById('inServer').value.trim(),
        company: 'HF Markets',
        balance: bal,
        equity: eq,
        margin: mar,
        freeMargin: +(eq - mar).toFixed(2),
        leverage: parseInt(document.getElementById('inLev').value, 10) || 500,
        currency: 'USD'
      };
      try {
        const r = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const d = await r.json();
        if (r.ok && d.success) {
          document.getElementById('vLogin').textContent = payload.loginId;
          document.getElementById('vServer').textContent = payload.server;
          document.getElementById('vBal').textContent = '$' + payload.balance.toFixed(2);
          document.getElementById('vEq').textContent = '$' + payload.equity.toFixed(2);
          el.className = 'toast ok';
          el.textContent = '✓ Berhasil disinkronkan ke SCHEVANKA Gold Terminal!';
        } else {
          el.className = 'toast err';
          el.textContent = '✕ Gagal: ' + (d.error || r.status);
        }
      } catch (e) {
        el.className = 'toast err';
        el.textContent = '✕ Network Error: ' + e.message;
      }
    }
  </script>
</body>
</html>`;

export const GOLD_TERMINAL_APK_HTML = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>SCHEVANKA Gold Terminal v1.0.0</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body, html { width: 100%; height: 100%; background: #070a0f; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow: hidden; }
    iframe { width: 100%; height: 100%; border: none; display: block; }
  </style>
</head>
<body>
  <iframe src="https://ais-pre-oj2gpgwetvago2t5xyvcxe-232925187258.asia-southeast1.run.app" allow="clipboard-read; clipboard-write; fullscreen"></iframe>
</body>
</html>`;

let cachedBuiltApks: {
  brokerBridge: { apkBuffer: Buffer; metadata: ApkBuildMetadata };
  goldTerminal: { apkBuffer: Buffer; metadata: ApkBuildMetadata };
} | null = null;

export function buildAllApks(rootDir: string, forceRebuild = false) {
  if (cachedBuiltApks && !forceRebuild) {
    return cachedBuiltApks;
  }

  let iconBuf: Buffer | undefined;
  const iconPath = path.resolve(rootDir, 'public/pwa-192x192.png');
  if (fs.existsSync(iconPath)) {
    iconBuf = fs.readFileSync(iconPath);
  }

  const brokerBridge = buildSignedAndroidApk({
    fileName: 'BrokerBridgeSync-v1.0.0-signed.apk',
    packageName: 'com.example.brokerbridgesync',
    appName: 'Broker Bridge Sync',
    versionName: '1.0.0',
    versionCode: 1,
    minSdkVersion: 24,
    targetSdkVersion: 34,
    htmlContent: BROKER_BRIDGE_APK_HTML,
    iconPngBuffer: iconBuf,
    downloadUrl: '/api/download/BrokerBridgeSync.apk?download=1',
  });

  const goldTerminal = buildSignedAndroidApk({
    fileName: 'SCHEVANKA-Gold-Terminal-v1.0.0-signed.apk',
    packageName: 'com.schevanka.goldterminal',
    appName: 'SCHEVANKA Gold Terminal',
    versionName: '1.0.0',
    versionCode: 1,
    minSdkVersion: 24,
    targetSdkVersion: 34,
    htmlContent: GOLD_TERMINAL_APK_HTML,
    iconPngBuffer: iconBuf,
    downloadUrl: '/api/download/SCHEVANKA-Gold-Terminal.apk?download=1',
  });

  // Persist static APK files to disk so they can also be served directly or inspected
  const outputPaths = [
    {
      dir: path.resolve(rootDir, 'public'),
      file: 'BrokerBridgeSync.apk',
      buf: brokerBridge.apkBuffer,
    },
    {
      dir: path.resolve(rootDir, 'public'),
      file: 'BrokerBridgeSync-v1.0.0-signed.apk',
      buf: brokerBridge.apkBuffer,
    },
    {
      dir: path.resolve(rootDir, 'public'),
      file: 'SCHEVANKA-Gold-Terminal.apk',
      buf: goldTerminal.apkBuffer,
    },
    {
      dir: path.resolve(rootDir, 'public'),
      file: 'SCHEVANKA-Gold-Terminal-v1.0.0-signed.apk',
      buf: goldTerminal.apkBuffer,
    },
    {
      dir: path.resolve(rootDir, 'BrokerBridgeSync/app/build/outputs/apk/release'),
      file: 'BrokerBridgeSync-v1.0.0-signed.apk',
      buf: brokerBridge.apkBuffer,
    },
    {
      dir: path.resolve(rootDir, 'android/app/build/outputs/apk/release'),
      file: 'SCHEVANKA-Gold-Terminal-v1.0.0-signed.apk',
      buf: goldTerminal.apkBuffer,
    },
  ];

  for (const out of outputPaths) {
    try {
      fs.mkdirSync(out.dir, { recursive: true });
      fs.writeFileSync(path.join(out.dir, out.file), out.buf);
    } catch {}
  }

  cachedBuiltApks = { brokerBridge, goldTerminal };
  return cachedBuiltApks;
}

