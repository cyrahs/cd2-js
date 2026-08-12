// ==UserScript==
// @name         CloudDrive2助手
// @namespace    https://github.com/cyrahs/cd2-js
// @version      0.1.8
// @author       cyrahs
// @description  CloudDrive2 网页助手：目前支持 VCB-Studio 项目一键添加离线下载并跟踪任务状态
// @license      MIT
// @homepageURL  https://github.com/cyrahs/cd2-js
// @source       https://github.com/cyrahs/cd2-js.git
// @supportURL   https://github.com/cyrahs/cd2-js/issues
// @match        https://vcb-s.com/*
// @connect      *
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function () {
  'use strict';

  var _GM_getValue = (() => typeof GM_getValue != "undefined" ? GM_getValue : void 0)();
  var _GM_registerMenuCommand = (() => typeof GM_registerMenuCommand != "undefined" ? GM_registerMenuCommand : void 0)();
  var _GM_setValue = (() => typeof GM_setValue != "undefined" ? GM_setValue : void 0)();
  var _GM_xmlhttpRequest = (() => typeof GM_xmlhttpRequest != "undefined" ? GM_xmlhttpRequest : void 0)();
  const KEY = "cd2_vcbs_config_v1";
  const DEFAULTS = {
    grpcBaseUrl: "http://localhost:19798",
    apiToken: "",
    offlineDestPath: "",
    checkFolderAfterSecs: 15,
    pollIntervalSecs: 10,
    pollMaxChecks: 5
  };
  function getConfig() {
    const v = _GM_getValue(KEY, null);
    if (v && typeof v === "object") return { ...DEFAULTS, ...v };
    return { ...DEFAULTS };
  }
  function setConfig(cfg) {
    _GM_setValue(KEY, cfg);
  }
  const scriptRel = (function detectScriptRel() {
    const relList = typeof document !== "undefined" && document.createElement("link").relList;
    return relList && relList.supports && relList.supports("modulepreload") ? "modulepreload" : "preload";
  })();
  const assetsURL = function(dep) {
    return "/" + dep;
  };
  const seen = {};
  const __vitePreload = function preload(baseModule, deps, importerUrl) {
    let promise = Promise.resolve();
    if (deps && deps.length > 0) {
      let allSettled2 = function(promises$2) {
        return Promise.all(promises$2.map((p) => Promise.resolve(p).then((value$1) => ({
          status: "fulfilled",
          value: value$1
        }), (reason) => ({
          status: "rejected",
          reason
        }))));
      };
      document.getElementsByTagName("link");
      const cspNonceMeta = document.querySelector("meta[property=csp-nonce]");
      const cspNonce = cspNonceMeta?.nonce || cspNonceMeta?.getAttribute("nonce");
      promise = allSettled2(deps.map((dep) => {
        dep = assetsURL(dep);
        if (dep in seen) return;
        seen[dep] = true;
        const isCss = dep.endsWith(".css");
        const cssSelector = isCss ? '[rel="stylesheet"]' : "";
        if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) return;
        const link = document.createElement("link");
        link.rel = isCss ? "stylesheet" : scriptRel;
        if (!isCss) link.as = "script";
        link.crossOrigin = "";
        link.href = dep;
        if (cspNonce) link.setAttribute("nonce", cspNonce);
        document.head.appendChild(link);
        if (isCss) return new Promise((res, rej) => {
          link.addEventListener("load", res);
          link.addEventListener("error", () => rej( new Error(`Unable to preload CSS for ${dep}`)));
        });
      }));
    }
    function handlePreloadError(err$2) {
      const e$1 = new Event("vite:preloadError", { cancelable: true });
      e$1.payload = err$2;
      window.dispatchEvent(e$1);
      if (!e$1.defaultPrevented) throw err$2;
    }
    return promise.then((res) => {
      for (const item of res || []) {
        if (item.status !== "rejected") continue;
        handlePreloadError(item.reason);
      }
      return baseModule().catch(handlePreloadError);
    });
  };
  function isMessage(arg, schema) {
    const isMessage2 = arg !== null && typeof arg == "object" && "$typeName" in arg && typeof arg.$typeName == "string";
    if (!isMessage2) {
      return false;
    }
    if (schema === void 0) {
      return true;
    }
    return schema.typeName === arg.$typeName;
  }
  var ScalarType;
  (function(ScalarType2) {
    ScalarType2[ScalarType2["DOUBLE"] = 1] = "DOUBLE";
    ScalarType2[ScalarType2["FLOAT"] = 2] = "FLOAT";
    ScalarType2[ScalarType2["INT64"] = 3] = "INT64";
    ScalarType2[ScalarType2["UINT64"] = 4] = "UINT64";
    ScalarType2[ScalarType2["INT32"] = 5] = "INT32";
    ScalarType2[ScalarType2["FIXED64"] = 6] = "FIXED64";
    ScalarType2[ScalarType2["FIXED32"] = 7] = "FIXED32";
    ScalarType2[ScalarType2["BOOL"] = 8] = "BOOL";
    ScalarType2[ScalarType2["STRING"] = 9] = "STRING";
    ScalarType2[ScalarType2["BYTES"] = 12] = "BYTES";
    ScalarType2[ScalarType2["UINT32"] = 13] = "UINT32";
    ScalarType2[ScalarType2["SFIXED32"] = 15] = "SFIXED32";
    ScalarType2[ScalarType2["SFIXED64"] = 16] = "SFIXED64";
    ScalarType2[ScalarType2["SINT32"] = 17] = "SINT32";
    ScalarType2[ScalarType2["SINT64"] = 18] = "SINT64";
  })(ScalarType || (ScalarType = {}));
  function varint64read() {
    let lowBits = 0;
    let highBits = 0;
    for (let shift = 0; shift < 28; shift += 7) {
      let b = this.buf[this.pos++];
      lowBits |= (b & 127) << shift;
      if ((b & 128) == 0) {
        this.assertBounds();
        return [lowBits, highBits];
      }
    }
    let middleByte = this.buf[this.pos++];
    lowBits |= (middleByte & 15) << 28;
    highBits = (middleByte & 112) >> 4;
    if ((middleByte & 128) == 0) {
      this.assertBounds();
      return [lowBits, highBits];
    }
    for (let shift = 3; shift <= 31; shift += 7) {
      let b = this.buf[this.pos++];
      highBits |= (b & 127) << shift;
      if ((b & 128) == 0) {
        this.assertBounds();
        return [lowBits, highBits];
      }
    }
    throw new Error("invalid varint");
  }
  function varint64write(lo, hi, bytes) {
    for (let i = 0; i < 28; i = i + 7) {
      const shift = lo >>> i;
      const hasNext = !(shift >>> 7 == 0 && hi == 0);
      const byte = (hasNext ? shift | 128 : shift) & 255;
      bytes.push(byte);
      if (!hasNext) {
        return;
      }
    }
    const splitBits = lo >>> 28 & 15 | (hi & 7) << 4;
    const hasMoreBits = !(hi >> 3 == 0);
    bytes.push((hasMoreBits ? splitBits | 128 : splitBits) & 255);
    if (!hasMoreBits) {
      return;
    }
    for (let i = 3; i < 31; i = i + 7) {
      const shift = hi >>> i;
      const hasNext = !(shift >>> 7 == 0);
      const byte = (hasNext ? shift | 128 : shift) & 255;
      bytes.push(byte);
      if (!hasNext) {
        return;
      }
    }
    bytes.push(hi >>> 31 & 1);
  }
  const TWO_PWR_32_DBL = 4294967296;
  function int64FromString(dec) {
    const minus = dec[0] === "-";
    if (minus) {
      dec = dec.slice(1);
    }
    const base = 1e6;
    let lowBits = 0;
    let highBits = 0;
    function add1e6digit(begin, end) {
      const digit1e6 = Number(dec.slice(begin, end));
      highBits *= base;
      lowBits = lowBits * base + digit1e6;
      if (lowBits >= TWO_PWR_32_DBL) {
        highBits = highBits + (lowBits / TWO_PWR_32_DBL | 0);
        lowBits = lowBits % TWO_PWR_32_DBL;
      }
    }
    add1e6digit(-24, -18);
    add1e6digit(-18, -12);
    add1e6digit(-12, -6);
    add1e6digit(-6);
    return minus ? negate(lowBits, highBits) : newBits(lowBits, highBits);
  }
  function int64ToString(lo, hi) {
    let bits = newBits(lo, hi);
    const negative = bits.hi & 2147483648;
    if (negative) {
      bits = negate(bits.lo, bits.hi);
    }
    const result = uInt64ToString(bits.lo, bits.hi);
    return negative ? "-" + result : result;
  }
  function uInt64ToString(lo, hi) {
    ({ lo, hi } = toUnsigned(lo, hi));
    if (hi <= 2097151) {
      return String(TWO_PWR_32_DBL * hi + lo);
    }
    const low = lo & 16777215;
    const mid = (lo >>> 24 | hi << 8) & 16777215;
    const high = hi >> 16 & 65535;
    let digitA = low + mid * 6777216 + high * 6710656;
    let digitB = mid + high * 8147497;
    let digitC = high * 2;
    const base = 1e7;
    if (digitA >= base) {
      digitB += Math.floor(digitA / base);
      digitA %= base;
    }
    if (digitB >= base) {
      digitC += Math.floor(digitB / base);
      digitB %= base;
    }
    return digitC.toString() + decimalFrom1e7WithLeadingZeros(digitB) + decimalFrom1e7WithLeadingZeros(digitA);
  }
  function toUnsigned(lo, hi) {
    return { lo: lo >>> 0, hi: hi >>> 0 };
  }
  function newBits(lo, hi) {
    return { lo: lo | 0, hi: hi | 0 };
  }
  function negate(lowBits, highBits) {
    highBits = ~highBits;
    if (lowBits) {
      lowBits = ~lowBits + 1;
    } else {
      highBits += 1;
    }
    return newBits(lowBits, highBits);
  }
  const decimalFrom1e7WithLeadingZeros = (digit1e7) => {
    const partial = String(digit1e7);
    return "0000000".slice(partial.length) + partial;
  };
  function varint32write(value, bytes) {
    if (value >= 0) {
      while (value > 127) {
        bytes.push(value & 127 | 128);
        value = value >>> 7;
      }
      bytes.push(value);
    } else {
      for (let i = 0; i < 9; i++) {
        bytes.push(value & 127 | 128);
        value = value >> 7;
      }
      bytes.push(1);
    }
  }
  function varint32read() {
    let b = this.buf[this.pos++];
    let result = b & 127;
    if ((b & 128) == 0) {
      this.assertBounds();
      return result;
    }
    b = this.buf[this.pos++];
    result |= (b & 127) << 7;
    if ((b & 128) == 0) {
      this.assertBounds();
      return result;
    }
    b = this.buf[this.pos++];
    result |= (b & 127) << 14;
    if ((b & 128) == 0) {
      this.assertBounds();
      return result;
    }
    b = this.buf[this.pos++];
    result |= (b & 127) << 21;
    if ((b & 128) == 0) {
      this.assertBounds();
      return result;
    }
    b = this.buf[this.pos++];
    result |= (b & 15) << 28;
    for (let readBytes = 5; (b & 128) !== 0 && readBytes < 10; readBytes++)
      b = this.buf[this.pos++];
    if ((b & 128) != 0)
      throw new Error("invalid varint");
    this.assertBounds();
    return result >>> 0;
  }
  var define_process_env_default = {};
  const protoInt64 = makeInt64Support();
  function makeInt64Support() {
    const dv = new DataView(new ArrayBuffer(8));
    const ok = typeof BigInt === "function" && typeof dv.getBigInt64 === "function" && typeof dv.getBigUint64 === "function" && typeof dv.setBigInt64 === "function" && typeof dv.setBigUint64 === "function" && (!!globalThis.Deno || !!globalThis.Bun || typeof process != "object" || typeof define_process_env_default != "object" || define_process_env_default.BUF_BIGINT_DISABLE !== "1");
    if (ok) {
      const MIN = BigInt("-9223372036854775808");
      const MAX = BigInt("9223372036854775807");
      const UMIN = BigInt("0");
      const UMAX = BigInt("18446744073709551615");
      return {
        zero: BigInt(0),
        supported: true,
        parse(value) {
          const bi = typeof value == "bigint" ? value : BigInt(value);
          if (bi > MAX || bi < MIN) {
            throw new Error(`invalid int64: ${value}`);
          }
          return bi;
        },
        uParse(value) {
          const bi = typeof value == "bigint" ? value : BigInt(value);
          if (bi > UMAX || bi < UMIN) {
            throw new Error(`invalid uint64: ${value}`);
          }
          return bi;
        },
        enc(value) {
          dv.setBigInt64(0, this.parse(value), true);
          return {
            lo: dv.getInt32(0, true),
            hi: dv.getInt32(4, true)
          };
        },
        uEnc(value) {
          dv.setBigInt64(0, this.uParse(value), true);
          return {
            lo: dv.getInt32(0, true),
            hi: dv.getInt32(4, true)
          };
        },
        dec(lo, hi) {
          dv.setInt32(0, lo, true);
          dv.setInt32(4, hi, true);
          return dv.getBigInt64(0, true);
        },
        uDec(lo, hi) {
          dv.setInt32(0, lo, true);
          dv.setInt32(4, hi, true);
          return dv.getBigUint64(0, true);
        }
      };
    }
    return {
      zero: "0",
      supported: false,
      parse(value) {
        if (typeof value != "string") {
          value = value.toString();
        }
        assertInt64String(value);
        return value;
      },
      uParse(value) {
        if (typeof value != "string") {
          value = value.toString();
        }
        assertUInt64String(value);
        return value;
      },
      enc(value) {
        if (typeof value != "string") {
          value = value.toString();
        }
        assertInt64String(value);
        return int64FromString(value);
      },
      uEnc(value) {
        if (typeof value != "string") {
          value = value.toString();
        }
        assertUInt64String(value);
        return int64FromString(value);
      },
      dec(lo, hi) {
        return int64ToString(lo, hi);
      },
      uDec(lo, hi) {
        return uInt64ToString(lo, hi);
      }
    };
  }
  function assertInt64String(value) {
    if (!/^-?[0-9]+$/.test(value)) {
      throw new Error("invalid int64: " + value);
    }
  }
  function assertUInt64String(value) {
    if (!/^[0-9]+$/.test(value)) {
      throw new Error("invalid uint64: " + value);
    }
  }
  function scalarZeroValue(type, longAsString) {
    switch (type) {
      case ScalarType.STRING:
        return "";
      case ScalarType.BOOL:
        return false;
      case ScalarType.DOUBLE:
      case ScalarType.FLOAT:
        return 0;
      case ScalarType.INT64:
      case ScalarType.UINT64:
      case ScalarType.SFIXED64:
      case ScalarType.FIXED64:
      case ScalarType.SINT64:
        return longAsString ? "0" : protoInt64.zero;
      case ScalarType.BYTES:
        return new Uint8Array(0);
      default:
        return 0;
    }
  }
  function isScalarZeroValue(type, value) {
    switch (type) {
      case ScalarType.BOOL:
        return value === false;
      case ScalarType.STRING:
        return value === "";
      case ScalarType.BYTES:
        return value instanceof Uint8Array && !value.byteLength;
      case ScalarType.DOUBLE:
      case ScalarType.FLOAT:
        return Object.is(value, 0);
      default:
        return value == 0;
    }
  }
  const IMPLICIT$3 = 2;
  const unsafeLocal = Symbol.for("reflect unsafe local");
  function unsafeOneofCase(target, oneof) {
    const c = target[oneof.localName].case;
    if (c === void 0) {
      return c;
    }
    return oneof.fields.find((f) => f.localName === c);
  }
  function unsafeIsSet(target, field) {
    const name = field.localName;
    if (field.oneof) {
      return target[field.oneof.localName].case === name;
    }
    if (field.presence != IMPLICIT$3) {
      return target[name] !== void 0 && Object.prototype.hasOwnProperty.call(target, name);
    }
    switch (field.fieldKind) {
      case "list":
        return target[name].length > 0;
      case "map":
        return Object.keys(target[name]).length > 0;
      case "scalar":
        return !isScalarZeroValue(field.scalar, target[name]);
      case "enum":
        return target[name] !== field.enum.values[0].number;
    }
    throw new Error("message field with implicit presence");
  }
  function unsafeIsSetExplicit(target, localName) {
    return Object.prototype.hasOwnProperty.call(target, localName) && target[localName] !== void 0;
  }
  function unsafeGet(target, field) {
    if (field.oneof) {
      const oneof = target[field.oneof.localName];
      if (oneof.case === field.localName) {
        return oneof.value;
      }
      return void 0;
    }
    return target[field.localName];
  }
  function unsafeSet(target, field, value) {
    if (field.oneof) {
      target[field.oneof.localName] = {
        case: field.localName,
        value
      };
    } else {
      target[field.localName] = value;
    }
  }
  function unsafeClear(target, field) {
    const name = field.localName;
    if (field.oneof) {
      const oneofLocalName = field.oneof.localName;
      if (target[oneofLocalName].case === name) {
        target[oneofLocalName] = { case: void 0 };
      }
    } else if (field.presence != IMPLICIT$3) {
      delete target[name];
    } else {
      switch (field.fieldKind) {
        case "map":
          target[name] = {};
          break;
        case "list":
          target[name] = [];
          break;
        case "enum":
          target[name] = field.enum.values[0].number;
          break;
        case "scalar":
          target[name] = scalarZeroValue(field.scalar, field.longAsString);
          break;
      }
    }
  }
  function isObject(arg) {
    return arg !== null && typeof arg == "object" && !Array.isArray(arg);
  }
  function isReflectList(arg, field) {
    var _a, _b, _c, _d;
    if (isObject(arg) && unsafeLocal in arg && "add" in arg && "field" in arg && typeof arg.field == "function") {
      if (field !== void 0) {
        const a = field;
        const b = arg.field();
        return a.listKind == b.listKind && a.scalar === b.scalar && ((_a = a.message) === null || _a === void 0 ? void 0 : _a.typeName) === ((_b = b.message) === null || _b === void 0 ? void 0 : _b.typeName) && ((_c = a.enum) === null || _c === void 0 ? void 0 : _c.typeName) === ((_d = b.enum) === null || _d === void 0 ? void 0 : _d.typeName);
      }
      return true;
    }
    return false;
  }
  function isReflectMap(arg, field) {
    var _a, _b, _c, _d;
    if (isObject(arg) && unsafeLocal in arg && "has" in arg && "field" in arg && typeof arg.field == "function") {
      if (field !== void 0) {
        const a = field, b = arg.field();
        return a.mapKey === b.mapKey && a.mapKind == b.mapKind && a.scalar === b.scalar && ((_a = a.message) === null || _a === void 0 ? void 0 : _a.typeName) === ((_b = b.message) === null || _b === void 0 ? void 0 : _b.typeName) && ((_c = a.enum) === null || _c === void 0 ? void 0 : _c.typeName) === ((_d = b.enum) === null || _d === void 0 ? void 0 : _d.typeName);
      }
      return true;
    }
    return false;
  }
  function isReflectMessage(arg, messageDesc2) {
    return isObject(arg) && unsafeLocal in arg && "desc" in arg && isObject(arg.desc) && arg.desc.kind === "message" && (messageDesc2 === void 0 || arg.desc.typeName == messageDesc2.typeName);
  }
  function isWrapper(arg) {
    return isWrapperTypeName(arg.$typeName);
  }
  function isWrapperDesc(messageDesc2) {
    const f = messageDesc2.fields[0];
    return isWrapperTypeName(messageDesc2.typeName) && f !== void 0 && f.fieldKind == "scalar" && f.name == "value" && f.number == 1;
  }
  function hasCustomJsonRepresentation(desc) {
    switch (desc.typeName) {
      case "google.protobuf.Any":
      case "google.protobuf.Timestamp":
      case "google.protobuf.Duration":
      case "google.protobuf.FieldMask":
      case "google.protobuf.Struct":
      case "google.protobuf.Value":
      case "google.protobuf.ListValue":
        return true;
      default:
        return isWrapperDesc(desc);
    }
  }
  function isWrapperTypeName(name) {
    return name.startsWith("google.protobuf.") && [
      "DoubleValue",
      "FloatValue",
      "Int64Value",
      "UInt64Value",
      "Int32Value",
      "UInt32Value",
      "BoolValue",
      "StringValue",
      "BytesValue"
    ].includes(name.substring(16));
  }
  const EDITION_PROTO3$1 = 999;
  const EDITION_PROTO2$1 = 998;
  const IMPLICIT$2 = 2;
  function create(schema, init) {
    if (isMessage(init, schema)) {
      return init;
    }
    const message = createZeroMessage(schema);
    if (init !== void 0) {
      initMessage(schema, message, init);
    }
    return message;
  }
  function initMessage(messageDesc2, message, init) {
    for (const member of messageDesc2.members) {
      let value = init[member.localName];
      if (value == null) {
        continue;
      }
      let field;
      if (member.kind == "oneof") {
        const oneofField = unsafeOneofCase(init, member);
        if (!oneofField) {
          continue;
        }
        field = oneofField;
        value = unsafeGet(init, oneofField);
      } else {
        field = member;
      }
      switch (field.fieldKind) {
        case "message":
          value = toMessage(field, value);
          break;
        case "scalar":
          value = initScalar(field, value);
          break;
        case "list":
          value = initList(field, value);
          break;
        case "map":
          value = initMap(field, value);
          break;
      }
      unsafeSet(message, field, value);
    }
    return message;
  }
  function initScalar(field, value) {
    if (field.scalar == ScalarType.BYTES) {
      return toU8Arr(value);
    }
    return value;
  }
  function initMap(field, value) {
    if (isObject(value)) {
      if (field.scalar == ScalarType.BYTES) {
        return convertObjectValues(value, toU8Arr);
      }
      if (field.mapKind == "message") {
        return convertObjectValues(value, (val) => toMessage(field, val));
      }
    }
    return value;
  }
  function initList(field, value) {
    if (Array.isArray(value)) {
      if (field.scalar == ScalarType.BYTES) {
        return value.map(toU8Arr);
      }
      if (field.listKind == "message") {
        return value.map((item) => toMessage(field, item));
      }
    }
    return value;
  }
  function toMessage(field, value) {
    if (field.fieldKind == "message" && !field.oneof && isWrapperDesc(field.message)) {
      return initScalar(field.message.fields[0], value);
    }
    if (isObject(value)) {
      if (field.message.typeName == "google.protobuf.Struct" && field.parent.typeName !== "google.protobuf.Value") {
        return value;
      }
      if (!isMessage(value, field.message)) {
        return create(field.message, value);
      }
    }
    return value;
  }
  function toU8Arr(value) {
    return Array.isArray(value) ? new Uint8Array(value) : value;
  }
  function convertObjectValues(obj, fn) {
    const ret = {};
    for (const entry of Object.entries(obj)) {
      ret[entry[0]] = fn(entry[1]);
    }
    return ret;
  }
  const tokenZeroMessageField = Symbol();
  const messagePrototypes = new WeakMap();
  function createZeroMessage(desc) {
    let msg;
    if (!needsPrototypeChain(desc)) {
      msg = {
        $typeName: desc.typeName
      };
      for (const member of desc.members) {
        if (member.kind == "oneof" || member.presence == IMPLICIT$2) {
          msg[member.localName] = createZeroField(member);
        }
      }
    } else {
      const cached = messagePrototypes.get(desc);
      let prototype;
      let members;
      if (cached) {
        ({ prototype, members } = cached);
      } else {
        prototype = {};
        members = new Set();
        for (const member of desc.members) {
          if (member.kind == "oneof") {
            continue;
          }
          if (member.fieldKind != "scalar" && member.fieldKind != "enum") {
            continue;
          }
          if (member.presence == IMPLICIT$2) {
            continue;
          }
          members.add(member);
          prototype[member.localName] = createZeroField(member);
        }
        messagePrototypes.set(desc, { prototype, members });
      }
      msg = Object.create(prototype);
      msg.$typeName = desc.typeName;
      for (const member of desc.members) {
        if (members.has(member)) {
          continue;
        }
        if (member.kind == "field") {
          if (member.fieldKind == "message") {
            continue;
          }
          if (member.fieldKind == "scalar" || member.fieldKind == "enum") {
            if (member.presence != IMPLICIT$2) {
              continue;
            }
          }
        }
        msg[member.localName] = createZeroField(member);
      }
    }
    return msg;
  }
  function needsPrototypeChain(desc) {
    switch (desc.file.edition) {
      case EDITION_PROTO3$1:
        return false;
      case EDITION_PROTO2$1:
        return true;
      default:
        return desc.fields.some((f) => f.presence != IMPLICIT$2 && f.fieldKind != "message" && !f.oneof);
    }
  }
  function createZeroField(field) {
    if (field.kind == "oneof") {
      return { case: void 0 };
    }
    if (field.fieldKind == "list") {
      return [];
    }
    if (field.fieldKind == "map") {
      return {};
    }
    if (field.fieldKind == "message") {
      return tokenZeroMessageField;
    }
    const defaultValue = field.getDefaultValue();
    if (defaultValue !== void 0) {
      return field.fieldKind == "scalar" && field.longAsString ? defaultValue.toString() : defaultValue;
    }
    return field.fieldKind == "scalar" ? scalarZeroValue(field.scalar, field.longAsString) : field.enum.values[0].number;
  }
  const errorNames = [
    "FieldValueInvalidError",
    "FieldListRangeError",
    "ForeignFieldError"
  ];
  class FieldError extends Error {
    constructor(fieldOrOneof, message, name = "FieldValueInvalidError") {
      super(message);
      this.name = name;
      this.field = () => fieldOrOneof;
    }
  }
  function isFieldError(arg) {
    return arg instanceof Error && errorNames.includes(arg.name) && "field" in arg && typeof arg.field == "function";
  }
  const symbol = Symbol.for("@bufbuild/protobuf/text-encoding");
  function getTextEncoding() {
    if (globalThis[symbol] == void 0) {
      const te = new globalThis.TextEncoder();
      const td = new globalThis.TextDecoder();
      let tdStrict;
      globalThis[symbol] = {
        encodeUtf8(text) {
          return te.encode(text);
        },
        decodeUtf8(bytes, strict) {
          if (strict) {
            if (tdStrict === void 0) {
              tdStrict = new globalThis.TextDecoder("utf-8", { fatal: true });
            }
            return tdStrict.decode(bytes);
          }
          return td.decode(bytes);
        },
        checkUtf8(text) {
          try {
            encodeURIComponent(text);
            return true;
          } catch (_) {
            return false;
          }
        }
      };
    }
    return globalThis[symbol];
  }
  var WireType;
  (function(WireType2) {
    WireType2[WireType2["Varint"] = 0] = "Varint";
    WireType2[WireType2["Bit64"] = 1] = "Bit64";
    WireType2[WireType2["LengthDelimited"] = 2] = "LengthDelimited";
    WireType2[WireType2["StartGroup"] = 3] = "StartGroup";
    WireType2[WireType2["EndGroup"] = 4] = "EndGroup";
    WireType2[WireType2["Bit32"] = 5] = "Bit32";
  })(WireType || (WireType = {}));
  const FLOAT32_MAX = 34028234663852886e22;
  const FLOAT32_MIN = -34028234663852886e22;
  const UINT32_MAX = 4294967295;
  const INT32_MAX = 2147483647;
  const INT32_MIN = -2147483648;
  class BinaryWriter {
    constructor(encodeUtf8 = getTextEncoding().encodeUtf8) {
      this.encodeUtf8 = encodeUtf8;
      this.stack = [];
      this.chunks = [];
      this.buf = [];
    }
finish() {
      if (this.buf.length) {
        this.chunks.push(new Uint8Array(this.buf));
        this.buf = [];
      }
      let len = 0;
      for (let i = 0; i < this.chunks.length; i++)
        len += this.chunks[i].length;
      let bytes = new Uint8Array(len);
      let offset = 0;
      for (let i = 0; i < this.chunks.length; i++) {
        bytes.set(this.chunks[i], offset);
        offset += this.chunks[i].length;
      }
      this.chunks = [];
      return bytes;
    }
fork() {
      this.stack.push({ chunks: this.chunks, buf: this.buf });
      this.chunks = [];
      this.buf = [];
      return this;
    }
join() {
      let chunk = this.finish();
      let prev = this.stack.pop();
      if (!prev)
        throw new Error("invalid state, fork stack empty");
      this.chunks = prev.chunks;
      this.buf = prev.buf;
      this.uint32(chunk.byteLength);
      return this.raw(chunk);
    }
tag(fieldNo, type) {
      return this.uint32((fieldNo << 3 | type) >>> 0);
    }
raw(chunk) {
      if (this.buf.length) {
        this.chunks.push(new Uint8Array(this.buf));
        this.buf = [];
      }
      this.chunks.push(chunk);
      return this;
    }
uint32(value) {
      assertUInt32(value);
      while (value > 127) {
        this.buf.push(value & 127 | 128);
        value = value >>> 7;
      }
      this.buf.push(value);
      return this;
    }
int32(value) {
      assertInt32(value);
      varint32write(value, this.buf);
      return this;
    }
bool(value) {
      this.buf.push(value ? 1 : 0);
      return this;
    }
bytes(value) {
      this.uint32(value.byteLength);
      return this.raw(value);
    }
string(value) {
      let chunk = this.encodeUtf8(value);
      this.uint32(chunk.byteLength);
      return this.raw(chunk);
    }
float(value) {
      assertFloat32(value);
      let chunk = new Uint8Array(4);
      new DataView(chunk.buffer).setFloat32(0, value, true);
      return this.raw(chunk);
    }
double(value) {
      let chunk = new Uint8Array(8);
      new DataView(chunk.buffer).setFloat64(0, value, true);
      return this.raw(chunk);
    }
fixed32(value) {
      assertUInt32(value);
      let chunk = new Uint8Array(4);
      new DataView(chunk.buffer).setUint32(0, value, true);
      return this.raw(chunk);
    }
sfixed32(value) {
      assertInt32(value);
      let chunk = new Uint8Array(4);
      new DataView(chunk.buffer).setInt32(0, value, true);
      return this.raw(chunk);
    }
sint32(value) {
      assertInt32(value);
      value = (value << 1 ^ value >> 31) >>> 0;
      varint32write(value, this.buf);
      return this;
    }
sfixed64(value) {
      let chunk = new Uint8Array(8), view = new DataView(chunk.buffer), tc = protoInt64.enc(value);
      view.setInt32(0, tc.lo, true);
      view.setInt32(4, tc.hi, true);
      return this.raw(chunk);
    }
fixed64(value) {
      let chunk = new Uint8Array(8), view = new DataView(chunk.buffer), tc = protoInt64.uEnc(value);
      view.setInt32(0, tc.lo, true);
      view.setInt32(4, tc.hi, true);
      return this.raw(chunk);
    }
int64(value) {
      let tc = protoInt64.enc(value);
      varint64write(tc.lo, tc.hi, this.buf);
      return this;
    }
sint64(value) {
      const tc = protoInt64.enc(value), sign = tc.hi >> 31, lo = tc.lo << 1 ^ sign, hi = (tc.hi << 1 | tc.lo >>> 31) ^ sign;
      varint64write(lo, hi, this.buf);
      return this;
    }
uint64(value) {
      const tc = protoInt64.uEnc(value);
      varint64write(tc.lo, tc.hi, this.buf);
      return this;
    }
  }
  class BinaryReader {
    constructor(buf, decodeUtf8 = getTextEncoding().decodeUtf8) {
      this.decodeUtf8 = decodeUtf8;
      this.varint64 = varint64read;
      this.uint32 = varint32read;
      this.buf = buf;
      this.len = buf.length;
      this.pos = 0;
      this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    }
tag() {
      const start = this.pos;
      const tag = this.uint32();
      const bytesRead = this.pos - start;
      if (bytesRead > 5 || bytesRead == 5 && this.buf[this.pos - 1] > 15) {
        throw new Error("illegal tag: varint overflows uint32");
      }
      const fieldNo = tag >>> 3;
      const wireType = tag & 7;
      if (fieldNo <= 0 || wireType > 5) {
        throw new Error("illegal tag: field no " + fieldNo + " wire type " + wireType);
      }
      return [fieldNo, wireType];
    }
skip(wireType, fieldNo, recursionLimit = 100) {
      let start = this.pos;
      switch (wireType) {
        case WireType.Varint:
          while (this.buf[this.pos++] & 128) {
          }
          break;
case WireType.Bit64:
          this.pos += 4;
        case WireType.Bit32:
          this.pos += 4;
          break;
        case WireType.LengthDelimited:
          let len = this.uint32();
          this.pos += len;
          break;
        case WireType.StartGroup:
          if (recursionLimit <= 0) {
            throw new Error("maximum recursion depth reached");
          }
          for (; ; ) {
            const [fn, wt] = this.tag();
            if (wt === WireType.EndGroup) {
              if (fieldNo !== void 0 && fn !== fieldNo) {
                throw new Error("invalid end group tag");
              }
              break;
            }
            this.skip(wt, fn, recursionLimit - 1);
          }
          break;
        default:
          throw new Error("cant skip wire type " + wireType);
      }
      this.assertBounds();
      return this.buf.subarray(start, this.pos);
    }
assertBounds() {
      if (this.pos > this.len)
        throw new RangeError("premature EOF");
    }
int32() {
      return this.uint32() | 0;
    }
sint32() {
      let zze = this.uint32();
      return zze >>> 1 ^ -(zze & 1);
    }
int64() {
      return protoInt64.dec(...this.varint64());
    }
uint64() {
      return protoInt64.uDec(...this.varint64());
    }
sint64() {
      let [lo, hi] = this.varint64();
      let s = -(lo & 1);
      lo = (lo >>> 1 | (hi & 1) << 31) ^ s;
      hi = hi >>> 1 ^ s;
      return protoInt64.dec(lo, hi);
    }
bool() {
      let [lo, hi] = this.varint64();
      return lo !== 0 || hi !== 0;
    }
fixed32() {
      return this.view.getUint32((this.pos += 4) - 4, true);
    }
sfixed32() {
      return this.view.getInt32((this.pos += 4) - 4, true);
    }
fixed64() {
      return protoInt64.uDec(this.sfixed32(), this.sfixed32());
    }
sfixed64() {
      return protoInt64.dec(this.sfixed32(), this.sfixed32());
    }
float() {
      return this.view.getFloat32((this.pos += 4) - 4, true);
    }
double() {
      return this.view.getFloat64((this.pos += 8) - 8, true);
    }
bytes() {
      let len = this.uint32(), start = this.pos;
      this.pos += len;
      this.assertBounds();
      return this.buf.subarray(start, start + len);
    }
string(strict) {
      return this.decodeUtf8(this.bytes(), strict);
    }
  }
  function assertInt32(arg) {
    if (typeof arg == "string") {
      arg = Number(arg);
    } else if (typeof arg != "number") {
      throw new Error("invalid int32: " + typeof arg);
    }
    if (!Number.isInteger(arg) || arg > INT32_MAX || arg < INT32_MIN)
      throw new Error("invalid int32: " + arg);
  }
  function assertUInt32(arg) {
    if (typeof arg == "string") {
      arg = Number(arg);
    } else if (typeof arg != "number") {
      throw new Error("invalid uint32: " + typeof arg);
    }
    if (!Number.isInteger(arg) || arg > UINT32_MAX || arg < 0)
      throw new Error("invalid uint32: " + arg);
  }
  function assertFloat32(arg) {
    if (typeof arg == "string") {
      const o = arg;
      arg = Number(arg);
      if (Number.isNaN(arg) && o !== "NaN") {
        throw new Error("invalid float32: " + o);
      }
    } else if (typeof arg != "number") {
      throw new Error("invalid float32: " + typeof arg);
    }
    if (Number.isFinite(arg) && (arg > FLOAT32_MAX || arg < FLOAT32_MIN))
      throw new Error("invalid float32: " + arg);
  }
  function checkField(field, value) {
    const check = field.fieldKind == "list" ? isReflectList(value, field) : field.fieldKind == "map" ? isReflectMap(value, field) : checkSingular(field, value);
    if (check === true) {
      return void 0;
    }
    let reason;
    switch (field.fieldKind) {
      case "list":
        reason = `expected ${formatReflectList(field)}, got ${formatVal(value)}`;
        break;
      case "map":
        reason = `expected ${formatReflectMap(field)}, got ${formatVal(value)}`;
        break;
      default: {
        reason = reasonSingular(field, value, check);
      }
    }
    return new FieldError(field, reason);
  }
  function checkListItem(field, index, value) {
    const check = checkSingular(field, value);
    if (check !== true) {
      return new FieldError(field, `list item #${index + 1}: ${reasonSingular(field, value, check)}`);
    }
    return void 0;
  }
  function checkMapEntry(field, key, value) {
    const checkKey = checkScalarValue(key, field.mapKey);
    if (checkKey !== true) {
      return new FieldError(field, `invalid map key: ${reasonSingular({ scalar: field.mapKey }, key, checkKey)}`);
    }
    const checkVal = checkSingular(field, value);
    if (checkVal !== true) {
      return new FieldError(field, `map entry ${formatVal(key)}: ${reasonSingular(field, value, checkVal)}`);
    }
    return void 0;
  }
  function checkSingular(field, value) {
    if (field.scalar !== void 0) {
      return checkScalarValue(value, field.scalar);
    }
    if (field.enum !== void 0) {
      if (field.enum.open) {
        return checkScalarValue(value, ScalarType.INT32);
      }
      return field.enum.values.some((v) => v.number === value);
    }
    return isReflectMessage(value, field.message);
  }
  function checkScalarValue(value, scalar) {
    switch (scalar) {
      case ScalarType.DOUBLE:
        return typeof value == "number";
      case ScalarType.FLOAT:
        if (typeof value != "number") {
          return false;
        }
        if (Number.isNaN(value) || !Number.isFinite(value)) {
          return true;
        }
        if (value > FLOAT32_MAX || value < FLOAT32_MIN) {
          return `${value.toFixed()} out of range`;
        }
        return true;
      case ScalarType.INT32:
      case ScalarType.SFIXED32:
      case ScalarType.SINT32:
        if (typeof value !== "number" || !Number.isInteger(value)) {
          return false;
        }
        if (value > INT32_MAX || value < INT32_MIN) {
          return `${value.toFixed()} out of range`;
        }
        return true;
      case ScalarType.FIXED32:
      case ScalarType.UINT32:
        if (typeof value !== "number" || !Number.isInteger(value)) {
          return false;
        }
        if (value > UINT32_MAX || value < 0) {
          return `${value.toFixed()} out of range`;
        }
        return true;
      case ScalarType.BOOL:
        return typeof value == "boolean";
      case ScalarType.STRING:
        if (typeof value != "string") {
          return false;
        }
        return getTextEncoding().checkUtf8(value) || "invalid UTF8";
      case ScalarType.BYTES:
        return value instanceof Uint8Array;
      case ScalarType.INT64:
      case ScalarType.SFIXED64:
      case ScalarType.SINT64:
        if (typeof value == "bigint" || typeof value == "number" || typeof value == "string" && value.length > 0) {
          try {
            protoInt64.parse(value);
            return true;
          } catch (_) {
            return `${value} out of range`;
          }
        }
        return false;
      case ScalarType.FIXED64:
      case ScalarType.UINT64:
        if (typeof value == "bigint" || typeof value == "number" || typeof value == "string" && value.length > 0) {
          try {
            protoInt64.uParse(value);
            return true;
          } catch (_) {
            return `${value} out of range`;
          }
        }
        return false;
    }
  }
  function reasonSingular(field, val, details) {
    details = typeof details == "string" ? `: ${details}` : `, got ${formatVal(val)}`;
    if (field.scalar !== void 0) {
      return `expected ${scalarTypeDescription(field.scalar)}` + details;
    }
    if (field.enum !== void 0) {
      return `expected ${field.enum.toString()}` + details;
    }
    return `expected ${formatReflectMessage(field.message)}` + details;
  }
  function formatVal(val) {
    switch (typeof val) {
      case "object":
        if (val === null) {
          return "null";
        }
        if (val instanceof Uint8Array) {
          return `Uint8Array(${val.length})`;
        }
        if (Array.isArray(val)) {
          return `Array(${val.length})`;
        }
        if (isReflectList(val)) {
          return formatReflectList(val.field());
        }
        if (isReflectMap(val)) {
          return formatReflectMap(val.field());
        }
        if (isReflectMessage(val)) {
          return formatReflectMessage(val.desc);
        }
        if (isMessage(val)) {
          return `message ${val.$typeName}`;
        }
        return "object";
      case "string":
        return val.length > 30 ? "string" : `"${val.split('"').join('\\"')}"`;
      case "boolean":
        return String(val);
      case "number":
        return String(val);
      case "bigint":
        return String(val) + "n";
      default:
        return typeof val;
    }
  }
  function formatReflectMessage(desc) {
    return `ReflectMessage (${desc.typeName})`;
  }
  function formatReflectList(field) {
    switch (field.listKind) {
      case "message":
        return `ReflectList (${field.message.toString()})`;
      case "enum":
        return `ReflectList (${field.enum.toString()})`;
      case "scalar":
        return `ReflectList (${ScalarType[field.scalar]})`;
    }
  }
  function formatReflectMap(field) {
    switch (field.mapKind) {
      case "message":
        return `ReflectMap (${ScalarType[field.mapKey]}, ${field.message.toString()})`;
      case "enum":
        return `ReflectMap (${ScalarType[field.mapKey]}, ${field.enum.toString()})`;
      case "scalar":
        return `ReflectMap (${ScalarType[field.mapKey]}, ${ScalarType[field.scalar]})`;
    }
  }
  function scalarTypeDescription(scalar) {
    switch (scalar) {
      case ScalarType.STRING:
        return "string";
      case ScalarType.BOOL:
        return "boolean";
      case ScalarType.INT64:
      case ScalarType.SINT64:
      case ScalarType.SFIXED64:
        return "bigint (int64)";
      case ScalarType.UINT64:
      case ScalarType.FIXED64:
        return "bigint (uint64)";
      case ScalarType.BYTES:
        return "Uint8Array";
      case ScalarType.DOUBLE:
        return "number (float64)";
      case ScalarType.FLOAT:
        return "number (float32)";
      case ScalarType.FIXED32:
      case ScalarType.UINT32:
        return "number (uint32)";
      case ScalarType.INT32:
      case ScalarType.SFIXED32:
      case ScalarType.SINT32:
        return "number (int32)";
    }
  }
  const NULL_VALUE = 0;
  function reflect(messageDesc2, message, check = true) {
    return new ReflectMessageImpl(messageDesc2, message, check);
  }
  const messageSortedFields = new WeakMap();
  class ReflectMessageImpl {
    get sortedFields() {
      const cached = messageSortedFields.get(this.desc);
      if (cached) {
        return cached;
      }
      const sortedFields = this.desc.fields.concat().sort((a, b) => a.number - b.number);
      messageSortedFields.set(this.desc, sortedFields);
      return sortedFields;
    }
    constructor(messageDesc2, message, check = true) {
      this.lists = new Map();
      this.maps = new Map();
      this.check = check;
      this.desc = messageDesc2;
      this.message = this[unsafeLocal] = message !== null && message !== void 0 ? message : create(messageDesc2);
      this.fields = messageDesc2.fields;
      this.oneofs = messageDesc2.oneofs;
      this.members = messageDesc2.members;
    }
    findNumber(number) {
      if (!this._fieldsByNumber) {
        this._fieldsByNumber = new Map(this.desc.fields.map((f) => [f.number, f]));
      }
      return this._fieldsByNumber.get(number);
    }
    oneofCase(oneof) {
      assertOwn(this.message, oneof);
      return unsafeOneofCase(this.message, oneof);
    }
    isSet(field) {
      assertOwn(this.message, field);
      return unsafeIsSet(this.message, field);
    }
    clear(field) {
      assertOwn(this.message, field);
      unsafeClear(this.message, field);
    }
    get(field) {
      assertOwn(this.message, field);
      const value = unsafeGet(this.message, field);
      switch (field.fieldKind) {
        case "list":
          let list = this.lists.get(field);
          if (!list || list[unsafeLocal] !== value) {
            this.lists.set(
              field,
list = new ReflectListImpl(field, value, this.check)
            );
          }
          return list;
        case "map":
          let map = this.maps.get(field);
          if (!map || map[unsafeLocal] !== value) {
            this.maps.set(
              field,
map = new ReflectMapImpl(field, value, this.check)
            );
          }
          return map;
        case "message":
          return messageToReflect(field, value, this.check);
        case "scalar":
          return value === void 0 ? scalarZeroValue(field.scalar, false) : longToReflect(field, value);
        case "enum":
          return value !== null && value !== void 0 ? value : field.enum.values[0].number;
      }
    }
    set(field, value) {
      assertOwn(this.message, field);
      if (this.check) {
        const err = checkField(field, value);
        if (err) {
          throw err;
        }
      }
      let local;
      if (field.fieldKind == "message") {
        local = messageToLocal(field, value);
      } else if (isReflectMap(value) || isReflectList(value)) {
        local = value[unsafeLocal];
      } else {
        local = longToLocal(field, value);
      }
      unsafeSet(this.message, field, local);
    }
    getUnknown() {
      return this.message.$unknown;
    }
    setUnknown(value) {
      this.message.$unknown = value;
    }
  }
  function assertOwn(owner, member) {
    if (member.parent.typeName !== owner.$typeName) {
      throw new FieldError(member, `cannot use ${member.toString()} with message ${owner.$typeName}`, "ForeignFieldError");
    }
  }
  class ReflectListImpl {
    field() {
      return this._field;
    }
    get size() {
      return this._arr.length;
    }
    constructor(field, unsafeInput, check) {
      this._field = field;
      this._arr = this[unsafeLocal] = unsafeInput;
      this.check = check;
    }
    get(index) {
      const item = this._arr[index];
      return item === void 0 ? void 0 : listItemToReflect(this._field, item, this.check);
    }
    set(index, item) {
      if (index < 0 || index >= this._arr.length) {
        throw new FieldError(this._field, `list item #${index + 1}: out of range`);
      }
      if (this.check) {
        const err = checkListItem(this._field, index, item);
        if (err) {
          throw err;
        }
      }
      this._arr[index] = listItemToLocal(this._field, item);
    }
    add(item) {
      if (this.check) {
        const err = checkListItem(this._field, this._arr.length, item);
        if (err) {
          throw err;
        }
      }
      this._arr.push(listItemToLocal(this._field, item));
      return void 0;
    }
    clear() {
      this._arr.splice(0, this._arr.length);
    }
    [Symbol.iterator]() {
      return this.values();
    }
    keys() {
      return this._arr.keys();
    }
    *values() {
      for (const item of this._arr) {
        yield listItemToReflect(this._field, item, this.check);
      }
    }
    *entries() {
      for (let i = 0; i < this._arr.length; i++) {
        yield [i, listItemToReflect(this._field, this._arr[i], this.check)];
      }
    }
  }
  class ReflectMapImpl {
    constructor(field, unsafeInput, check = true) {
      this.obj = this[unsafeLocal] = unsafeInput !== null && unsafeInput !== void 0 ? unsafeInput : {};
      this.check = check;
      this._field = field;
    }
    field() {
      return this._field;
    }
    set(key, value) {
      if (this.check) {
        const err = checkMapEntry(this._field, key, value);
        if (err) {
          throw err;
        }
      }
      this.obj[mapKeyToLocal(key)] = mapValueToLocal(this._field, value);
      return this;
    }
    delete(key) {
      const k = mapKeyToLocal(key);
      const has = Object.prototype.hasOwnProperty.call(this.obj, k);
      if (has) {
        delete this.obj[k];
      }
      return has;
    }
    clear() {
      for (const key of Object.keys(this.obj)) {
        delete this.obj[key];
      }
    }
    get(key) {
      let val = this.obj[mapKeyToLocal(key)];
      if (val !== void 0) {
        val = mapValueToReflect(this._field, val, this.check);
      }
      return val;
    }
    has(key) {
      return Object.prototype.hasOwnProperty.call(this.obj, mapKeyToLocal(key));
    }
    *keys() {
      for (const objKey of Object.keys(this.obj)) {
        yield mapKeyToReflect(objKey, this._field.mapKey);
      }
    }
    *entries() {
      for (const objEntry of Object.entries(this.obj)) {
        yield [
          mapKeyToReflect(objEntry[0], this._field.mapKey),
          mapValueToReflect(this._field, objEntry[1], this.check)
        ];
      }
    }
    [Symbol.iterator]() {
      return this.entries();
    }
    get size() {
      return Object.keys(this.obj).length;
    }
    *values() {
      for (const val of Object.values(this.obj)) {
        yield mapValueToReflect(this._field, val, this.check);
      }
    }
    forEach(callbackfn, thisArg) {
      for (const mapEntry of this.entries()) {
        callbackfn.call(thisArg, mapEntry[1], mapEntry[0], this);
      }
    }
  }
  function messageToLocal(field, value) {
    if (!isReflectMessage(value)) {
      return value;
    }
    if (isWrapper(value.message) && !field.oneof && field.fieldKind == "message") {
      return value.message.value;
    }
    if (value.desc.typeName == "google.protobuf.Struct" && field.parent.typeName != "google.protobuf.Value") {
      return wktStructToLocal(value.message);
    }
    return value.message;
  }
  function messageToReflect(field, value, check) {
    if (value !== void 0) {
      if (isWrapperDesc(field.message) && !field.oneof && field.fieldKind == "message") {
        value = {
          $typeName: field.message.typeName,
          value: longToReflect(field.message.fields[0], value)
        };
      } else if (field.message.typeName == "google.protobuf.Struct" && field.parent.typeName != "google.protobuf.Value" && isObject(value)) {
        value = wktStructToReflect(value);
      }
    }
    return new ReflectMessageImpl(field.message, value, check);
  }
  function listItemToLocal(field, value) {
    if (field.listKind == "message") {
      return messageToLocal(field, value);
    }
    return longToLocal(field, value);
  }
  function listItemToReflect(field, value, check) {
    if (field.listKind == "message") {
      return messageToReflect(field, value, check);
    }
    return longToReflect(field, value);
  }
  function mapValueToLocal(field, value) {
    if (field.mapKind == "message") {
      return messageToLocal(field, value);
    }
    return longToLocal(field, value);
  }
  function mapValueToReflect(field, value, check) {
    if (field.mapKind == "message") {
      return messageToReflect(field, value, check);
    }
    return value;
  }
  function mapKeyToLocal(key) {
    return typeof key == "string" || typeof key == "number" ? key : String(key);
  }
  function mapKeyToReflect(key, type) {
    switch (type) {
      case ScalarType.STRING:
        return key;
      case ScalarType.INT32:
      case ScalarType.FIXED32:
      case ScalarType.UINT32:
      case ScalarType.SFIXED32:
      case ScalarType.SINT32: {
        const n = Number.parseInt(key);
        if (Number.isFinite(n)) {
          return n;
        }
        break;
      }
      case ScalarType.BOOL:
        switch (key) {
          case "true":
            return true;
          case "false":
            return false;
        }
        break;
      case ScalarType.UINT64:
      case ScalarType.FIXED64:
        try {
          return protoInt64.uParse(key);
        } catch (_a) {
        }
        break;
      default:
        try {
          return protoInt64.parse(key);
        } catch (_b) {
        }
        break;
    }
    return key;
  }
  function longToReflect(field, value) {
    switch (field.scalar) {
      case ScalarType.INT64:
      case ScalarType.SFIXED64:
      case ScalarType.SINT64:
        if ("longAsString" in field && field.longAsString && typeof value == "string") {
          value = protoInt64.parse(value);
        }
        break;
      case ScalarType.FIXED64:
      case ScalarType.UINT64:
        if ("longAsString" in field && field.longAsString && typeof value == "string") {
          value = protoInt64.uParse(value);
        }
        break;
    }
    return value;
  }
  function longToLocal(field, value) {
    switch (field.scalar) {
      case ScalarType.INT64:
      case ScalarType.SFIXED64:
      case ScalarType.SINT64:
        if ("longAsString" in field && field.longAsString) {
          value = String(value);
        } else if (typeof value == "string" || typeof value == "number") {
          value = protoInt64.parse(value);
        }
        break;
      case ScalarType.FIXED64:
      case ScalarType.UINT64:
        if ("longAsString" in field && field.longAsString) {
          value = String(value);
        } else if (typeof value == "string" || typeof value == "number") {
          value = protoInt64.uParse(value);
        }
        break;
    }
    return value;
  }
  function wktStructToReflect(json) {
    const struct = {
      $typeName: "google.protobuf.Struct",
      fields: {}
    };
    if (isObject(json)) {
      for (const [k, v] of Object.entries(json)) {
        struct.fields[k] = wktValueToReflect(v);
      }
    }
    return struct;
  }
  function wktStructToLocal(val) {
    const json = {};
    for (const [k, v] of Object.entries(val.fields)) {
      json[k] = wktValueToLocal(v);
    }
    return json;
  }
  function wktValueToLocal(val) {
    switch (val.kind.case) {
      case "structValue":
        return wktStructToLocal(val.kind.value);
      case "listValue":
        return val.kind.value.values.map(wktValueToLocal);
      case "nullValue":
      case void 0:
        return null;
      default:
        return val.kind.value;
    }
  }
  function wktValueToReflect(json) {
    const value = {
      $typeName: "google.protobuf.Value",
      kind: { case: void 0 }
    };
    switch (typeof json) {
      case "number":
        value.kind = { case: "numberValue", value: json };
        break;
      case "string":
        value.kind = { case: "stringValue", value: json };
        break;
      case "boolean":
        value.kind = { case: "boolValue", value: json };
        break;
      case "object":
        if (json === null) {
          value.kind = { case: "nullValue", value: NULL_VALUE };
        } else if (Array.isArray(json)) {
          const listValue = {
            $typeName: "google.protobuf.ListValue",
            values: []
          };
          if (Array.isArray(json)) {
            for (const e of json) {
              listValue.values.push(wktValueToReflect(e));
            }
          }
          value.kind = {
            case: "listValue",
            value: listValue
          };
        } else {
          value.kind = {
            case: "structValue",
            value: wktStructToReflect(json)
          };
        }
        break;
    }
    return value;
  }
  function base64Decode(base64Str) {
    const table = getDecodeTable();
    let es = base64Str.length * 3 / 4;
    if (base64Str[base64Str.length - 2] == "=")
      es -= 2;
    else if (base64Str[base64Str.length - 1] == "=")
      es -= 1;
    let bytes = new Uint8Array(es), bytePos = 0, groupPos = 0, b, p = 0;
    for (let i = 0; i < base64Str.length; i++) {
      b = table[base64Str.charCodeAt(i)];
      if (b === void 0) {
        switch (base64Str[i]) {
case "=":
            groupPos = 0;
case "\n":
          case "\r":
          case "	":
          case " ":
            continue;
default:
            throw Error("invalid base64 string");
        }
      }
      switch (groupPos) {
        case 0:
          p = b;
          groupPos = 1;
          break;
        case 1:
          bytes[bytePos++] = p << 2 | (b & 48) >> 4;
          p = b;
          groupPos = 2;
          break;
        case 2:
          bytes[bytePos++] = (p & 15) << 4 | (b & 60) >> 2;
          p = b;
          groupPos = 3;
          break;
        case 3:
          bytes[bytePos++] = (p & 3) << 6 | b;
          groupPos = 0;
          break;
      }
    }
    if (groupPos == 1)
      throw Error("invalid base64 string");
    return bytes.subarray(0, bytePos);
  }
  function base64Encode(bytes, encoding = "std") {
    const table = getEncodeTable(encoding);
    const pad = encoding == "std";
    let base64 = "", groupPos = 0, b, p = 0;
    for (let i = 0; i < bytes.length; i++) {
      b = bytes[i];
      switch (groupPos) {
        case 0:
          base64 += table[b >> 2];
          p = (b & 3) << 4;
          groupPos = 1;
          break;
        case 1:
          base64 += table[p | b >> 4];
          p = (b & 15) << 2;
          groupPos = 2;
          break;
        case 2:
          base64 += table[p | b >> 6];
          base64 += table[b & 63];
          groupPos = 0;
          break;
      }
    }
    if (groupPos) {
      base64 += table[p];
      if (pad) {
        base64 += "=";
        if (groupPos == 1)
          base64 += "=";
      }
    }
    return base64;
  }
  let encodeTableStd;
  let encodeTableUrl;
  let decodeTable;
  function getEncodeTable(encoding) {
    if (!encodeTableStd) {
      encodeTableStd = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");
      encodeTableUrl = encodeTableStd.slice(0, -2).concat("-", "_");
    }
    return encoding == "url" ? (
encodeTableUrl
    ) : encodeTableStd;
  }
  function getDecodeTable() {
    if (!decodeTable) {
      decodeTable = [];
      const encodeTable = getEncodeTable("std");
      for (let i = 0; i < encodeTable.length; i++)
        decodeTable[encodeTable[i].charCodeAt(0)] = i;
      decodeTable["-".charCodeAt(0)] = encodeTable.indexOf("+");
      decodeTable["_".charCodeAt(0)] = encodeTable.indexOf("/");
    }
    return decodeTable;
  }
  function protoCamelCase(snakeCase) {
    let capNext = false;
    const b = [];
    for (let i = 0; i < snakeCase.length; i++) {
      let c = snakeCase.charAt(i);
      switch (c) {
        case "_":
          capNext = true;
          break;
        case "0":
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          b.push(c);
          capNext = false;
          break;
        default:
          if (capNext) {
            capNext = false;
            c = c.toUpperCase();
          }
          b.push(c);
          break;
      }
    }
    return b.join("");
  }
  function protoSnakeCase(lowerCamelCase) {
    return lowerCamelCase.replace(/[A-Z]/g, (letter) => "_" + letter.toLowerCase());
  }
  const reservedObjectProperties = new Set([
"constructor",
    "toString",
    "toJSON",
    "valueOf"
  ]);
  function safeObjectProperty(name) {
    return reservedObjectProperties.has(name) ? name + "$" : name;
  }
  function restoreJsonNames(message) {
    for (const f of message.field) {
      if (!unsafeIsSetExplicit(f, "jsonName")) {
        f.jsonName = protoCamelCase(f.name);
      }
    }
    message.nestedType.forEach(restoreJsonNames);
  }
  function parseTextFormatEnumValue(descEnum, value) {
    const enumValue = descEnum.values.find((v) => v.name === value);
    if (!enumValue) {
      throw new Error(`cannot parse ${descEnum} default value: ${value}`);
    }
    return enumValue.number;
  }
  function parseTextFormatScalarValue(type, value) {
    switch (type) {
      case ScalarType.STRING:
        return value;
      case ScalarType.BYTES: {
        const u = unescapeBytesDefaultValue(value);
        if (u === false) {
          throw new Error(`cannot parse ${ScalarType[type]} default value: ${value}`);
        }
        return u;
      }
      case ScalarType.INT64:
      case ScalarType.SFIXED64:
      case ScalarType.SINT64:
        return protoInt64.parse(value);
      case ScalarType.UINT64:
      case ScalarType.FIXED64:
        return protoInt64.uParse(value);
      case ScalarType.DOUBLE:
      case ScalarType.FLOAT:
        switch (value) {
          case "inf":
            return Number.POSITIVE_INFINITY;
          case "-inf":
            return Number.NEGATIVE_INFINITY;
          case "nan":
            return Number.NaN;
          default:
            return parseFloat(value);
        }
      case ScalarType.BOOL:
        return value === "true";
      case ScalarType.INT32:
      case ScalarType.UINT32:
      case ScalarType.SINT32:
      case ScalarType.FIXED32:
      case ScalarType.SFIXED32:
        return parseInt(value, 10);
    }
  }
  function unescapeBytesDefaultValue(str) {
    const b = [];
    const input = {
      tail: str,
      c: "",
      next() {
        if (this.tail.length == 0) {
          return false;
        }
        this.c = this.tail[0];
        this.tail = this.tail.substring(1);
        return true;
      },
      take(n) {
        if (this.tail.length >= n) {
          const r = this.tail.substring(0, n);
          this.tail = this.tail.substring(n);
          return r;
        }
        return false;
      }
    };
    while (input.next()) {
      switch (input.c) {
        case "\\":
          if (input.next()) {
            switch (input.c) {
              case "\\":
                b.push(input.c.charCodeAt(0));
                break;
              case "b":
                b.push(8);
                break;
              case "f":
                b.push(12);
                break;
              case "n":
                b.push(10);
                break;
              case "r":
                b.push(13);
                break;
              case "t":
                b.push(9);
                break;
              case "v":
                b.push(11);
                break;
              case "0":
              case "1":
              case "2":
              case "3":
              case "4":
              case "5":
              case "6":
              case "7": {
                const s = input.c;
                const t = input.take(2);
                if (t === false) {
                  return false;
                }
                const n = parseInt(s + t, 8);
                if (Number.isNaN(n)) {
                  return false;
                }
                b.push(n);
                break;
              }
              case "x": {
                const s = input.c;
                const t = input.take(2);
                if (t === false) {
                  return false;
                }
                const n = parseInt(s + t, 16);
                if (Number.isNaN(n)) {
                  return false;
                }
                b.push(n);
                break;
              }
              case "u": {
                const s = input.c;
                const t = input.take(4);
                if (t === false) {
                  return false;
                }
                const n = parseInt(s + t, 16);
                if (Number.isNaN(n)) {
                  return false;
                }
                const chunk = new Uint8Array(4);
                const view = new DataView(chunk.buffer);
                view.setInt32(0, n, true);
                b.push(chunk[0], chunk[1], chunk[2], chunk[3]);
                break;
              }
              case "U": {
                const s = input.c;
                const t = input.take(8);
                if (t === false) {
                  return false;
                }
                const tc = protoInt64.uEnc(s + t);
                const chunk = new Uint8Array(8);
                const view = new DataView(chunk.buffer);
                view.setInt32(0, tc.lo, true);
                view.setInt32(4, tc.hi, true);
                b.push(chunk[0], chunk[1], chunk[2], chunk[3], chunk[4], chunk[5], chunk[6], chunk[7]);
                break;
              }
            }
          }
          break;
        default:
          b.push(input.c.charCodeAt(0));
      }
    }
    return new Uint8Array(b);
  }
  function* nestedTypes(desc) {
    switch (desc.kind) {
      case "file":
        for (const message of desc.messages) {
          yield message;
          yield* nestedTypes(message);
        }
        yield* desc.enums;
        yield* desc.services;
        yield* desc.extensions;
        break;
      case "message":
        for (const message of desc.nestedMessages) {
          yield message;
          yield* nestedTypes(message);
        }
        yield* desc.nestedEnums;
        yield* desc.nestedExtensions;
        break;
    }
  }
  function createFileRegistry(...args) {
    const registry = createBaseRegistry();
    if (!args.length) {
      return registry;
    }
    if ("$typeName" in args[0] && args[0].$typeName == "google.protobuf.FileDescriptorSet") {
      for (const file of args[0].file) {
        addFile(file, registry);
      }
      return registry;
    }
    if ("$typeName" in args[0]) {
      let recurseDeps2 = function(file) {
        const deps = [];
        for (const protoFileName of file.dependency) {
          if (registry.getFile(protoFileName) != void 0) {
            continue;
          }
          if (seen2.has(protoFileName)) {
            continue;
          }
          const dep = resolve(protoFileName);
          if (!dep) {
            throw new Error(`Unable to resolve ${protoFileName}, imported by ${file.name}`);
          }
          if ("kind" in dep) {
            registry.addFile(dep, false, true);
          } else {
            seen2.add(dep.name);
            deps.push(dep);
          }
        }
        return deps.concat(...deps.map(recurseDeps2));
      };
      const input = args[0];
      const resolve = args[1];
      const seen2 = new Set();
      for (const file of [input, ...recurseDeps2(input)].reverse()) {
        addFile(file, registry);
      }
    } else {
      for (const fileReg of args) {
        for (const file of fileReg.files) {
          registry.addFile(file);
        }
      }
    }
    return registry;
  }
  function createBaseRegistry() {
    const types = new Map();
    const extendees = new Map();
    const files = new Map();
    return {
      kind: "registry",
      types,
      extendees,
      [Symbol.iterator]() {
        return types.values();
      },
      get files() {
        return files.values();
      },
      addFile(file, skipTypes, withDeps) {
        files.set(file.proto.name, file);
        if (!skipTypes) {
          for (const type of nestedTypes(file)) {
            this.add(type);
          }
        }
        if (withDeps) {
          for (const f of file.dependencies) {
            this.addFile(f, skipTypes, withDeps);
          }
        }
      },
      add(desc) {
        if (desc.kind == "extension") {
          let numberToExt = extendees.get(desc.extendee.typeName);
          if (!numberToExt) {
            extendees.set(
              desc.extendee.typeName,
numberToExt = new Map()
            );
          }
          numberToExt.set(desc.number, desc);
        }
        types.set(desc.typeName, desc);
      },
      get(typeName) {
        return types.get(typeName);
      },
      getFile(fileName) {
        return files.get(fileName);
      },
      getMessage(typeName) {
        const t = types.get(typeName);
        return (t === null || t === void 0 ? void 0 : t.kind) == "message" ? t : void 0;
      },
      getEnum(typeName) {
        const t = types.get(typeName);
        return (t === null || t === void 0 ? void 0 : t.kind) == "enum" ? t : void 0;
      },
      getExtension(typeName) {
        const t = types.get(typeName);
        return (t === null || t === void 0 ? void 0 : t.kind) == "extension" ? t : void 0;
      },
      getExtensionFor(extendee, no) {
        var _a;
        return (_a = extendees.get(extendee.typeName)) === null || _a === void 0 ? void 0 : _a.get(no);
      },
      getService(typeName) {
        const t = types.get(typeName);
        return (t === null || t === void 0 ? void 0 : t.kind) == "service" ? t : void 0;
      }
    };
  }
  const EDITION_PROTO2 = 998;
  const EDITION_PROTO3 = 999;
  const EDITION_UNSTABLE = 9999;
  const TYPE_STRING = 9;
  const TYPE_GROUP = 10;
  const TYPE_MESSAGE = 11;
  const TYPE_BYTES = 12;
  const TYPE_ENUM = 14;
  const LABEL_REPEATED = 3;
  const LABEL_REQUIRED = 2;
  const JS_STRING = 1;
  const IDEMPOTENCY_UNKNOWN = 0;
  const EXPLICIT = 1;
  const IMPLICIT$1 = 2;
  const LEGACY_REQUIRED$2 = 3;
  const PACKED = 1;
  const DELIMITED = 2;
  const OPEN = 1;
  const VERIFY = 2;
  const maximumEdition = 1001;
  const featureDefaults = {
998: {
      fieldPresence: 1,
enumType: 2,
repeatedFieldEncoding: 2,
utf8Validation: 3,
messageEncoding: 1,
jsonFormat: 2,
enforceNamingStyle: 2,
defaultSymbolVisibility: 1
},
999: {
      fieldPresence: 2,
enumType: 1,
repeatedFieldEncoding: 1,
utf8Validation: 2,
messageEncoding: 1,
jsonFormat: 1,
enforceNamingStyle: 2,
defaultSymbolVisibility: 1
},
1e3: {
      fieldPresence: 1,
enumType: 1,
repeatedFieldEncoding: 1,
utf8Validation: 2,
messageEncoding: 1,
jsonFormat: 1,
enforceNamingStyle: 2,
defaultSymbolVisibility: 1
},
1001: {
      fieldPresence: 1,
enumType: 1,
repeatedFieldEncoding: 1,
utf8Validation: 2,
messageEncoding: 1,
jsonFormat: 1,
enforceNamingStyle: 1,
defaultSymbolVisibility: 2
}
  };
  function addFile(proto, reg) {
    var _a, _b;
    const file = {
      kind: "file",
      proto,
      deprecated: (_b = (_a = proto.options) === null || _a === void 0 ? void 0 : _a.deprecated) !== null && _b !== void 0 ? _b : false,
      edition: getFileEdition(proto),
      name: proto.name.replace(/\.proto$/, ""),
      dependencies: findFileDependencies(proto, reg),
      enums: [],
      messages: [],
      extensions: [],
      services: [],
      toString() {
        return `file ${proto.name}`;
      }
    };
    const mapEntriesStore = new Map();
    const mapEntries = {
      get(typeName) {
        return mapEntriesStore.get(typeName);
      },
      add(desc) {
        var _a2;
        assert(((_a2 = desc.proto.options) === null || _a2 === void 0 ? void 0 : _a2.mapEntry) === true);
        mapEntriesStore.set(desc.typeName, desc);
      }
    };
    for (const enumProto of proto.enumType) {
      addEnum(enumProto, file, void 0, reg);
    }
    for (const messageProto of proto.messageType) {
      addMessage(messageProto, file, void 0, reg, mapEntries);
    }
    for (const serviceProto of proto.service) {
      addService(serviceProto, file, reg);
    }
    addExtensions(file, reg);
    for (const mapEntry of mapEntriesStore.values()) {
      addFields(mapEntry, reg, mapEntries);
    }
    for (const message of file.messages) {
      addFields(message, reg, mapEntries);
      addExtensions(message, reg);
    }
    reg.addFile(file, true);
  }
  function addExtensions(desc, reg) {
    switch (desc.kind) {
      case "file":
        for (const proto of desc.proto.extension) {
          const ext = newField(proto, desc, reg);
          desc.extensions.push(ext);
          reg.add(ext);
        }
        break;
      case "message":
        for (const proto of desc.proto.extension) {
          const ext = newField(proto, desc, reg);
          desc.nestedExtensions.push(ext);
          reg.add(ext);
        }
        for (const message of desc.nestedMessages) {
          addExtensions(message, reg);
        }
        break;
    }
  }
  function addFields(message, reg, mapEntries) {
    const allOneofs = message.proto.oneofDecl.map((proto) => newOneof(proto, message));
    const oneofsSeen = new Set();
    for (const proto of message.proto.field) {
      const oneof = findOneof(proto, allOneofs);
      const field = newField(proto, message, reg, oneof, mapEntries);
      message.fields.push(field);
      message.field[field.localName] = field;
      if (oneof === void 0) {
        message.members.push(field);
      } else {
        oneof.fields.push(field);
        if (!oneofsSeen.has(oneof)) {
          oneofsSeen.add(oneof);
          message.members.push(oneof);
        }
      }
    }
    for (const oneof of allOneofs.filter((o) => oneofsSeen.has(o))) {
      message.oneofs.push(oneof);
    }
    for (const child of message.nestedMessages) {
      addFields(child, reg, mapEntries);
    }
  }
  function addEnum(proto, file, parent, reg) {
    var _a, _b, _c, _d, _e;
    const sharedPrefix = findEnumSharedPrefix(proto.name, proto.value);
    const desc = {
      kind: "enum",
      proto,
      deprecated: (_b = (_a = proto.options) === null || _a === void 0 ? void 0 : _a.deprecated) !== null && _b !== void 0 ? _b : false,
      file,
      parent,
      open: true,
      name: proto.name,
      typeName: makeTypeName(proto, parent, file),
      value: {},
      values: [],
      sharedPrefix,
      toString() {
        return `enum ${this.typeName}`;
      }
    };
    desc.open = isEnumOpen(desc);
    reg.add(desc);
    for (const p of proto.value) {
      const name = p.name;
      desc.values.push(
desc.value[p.number] = {
          kind: "enum_value",
          proto: p,
          deprecated: (_d = (_c = p.options) === null || _c === void 0 ? void 0 : _c.deprecated) !== null && _d !== void 0 ? _d : false,
          parent: desc,
          name,
          localName: safeObjectProperty(sharedPrefix == void 0 ? name : name.substring(sharedPrefix.length)),
          number: p.number,
          toString() {
            return `enum value ${desc.typeName}.${name}`;
          }
        }
      );
    }
    ((_e = parent === null || parent === void 0 ? void 0 : parent.nestedEnums) !== null && _e !== void 0 ? _e : file.enums).push(desc);
  }
  function addMessage(proto, file, parent, reg, mapEntries) {
    var _a, _b, _c, _d;
    const desc = {
      kind: "message",
      proto,
      deprecated: (_b = (_a = proto.options) === null || _a === void 0 ? void 0 : _a.deprecated) !== null && _b !== void 0 ? _b : false,
      file,
      parent,
      name: proto.name,
      typeName: makeTypeName(proto, parent, file),
      fields: [],
      field: {},
      oneofs: [],
      members: [],
      nestedEnums: [],
      nestedMessages: [],
      nestedExtensions: [],
      toString() {
        return `message ${this.typeName}`;
      }
    };
    if (((_c = proto.options) === null || _c === void 0 ? void 0 : _c.mapEntry) === true) {
      mapEntries.add(desc);
    } else {
      ((_d = parent === null || parent === void 0 ? void 0 : parent.nestedMessages) !== null && _d !== void 0 ? _d : file.messages).push(desc);
      reg.add(desc);
    }
    for (const enumProto of proto.enumType) {
      addEnum(enumProto, file, desc, reg);
    }
    for (const messageProto of proto.nestedType) {
      addMessage(messageProto, file, desc, reg, mapEntries);
    }
  }
  function addService(proto, file, reg) {
    var _a, _b;
    const desc = {
      kind: "service",
      proto,
      deprecated: (_b = (_a = proto.options) === null || _a === void 0 ? void 0 : _a.deprecated) !== null && _b !== void 0 ? _b : false,
      file,
      name: proto.name,
      typeName: makeTypeName(proto, void 0, file),
      methods: [],
      method: {},
      toString() {
        return `service ${this.typeName}`;
      }
    };
    file.services.push(desc);
    reg.add(desc);
    for (const methodProto of proto.method) {
      const method = newMethod(methodProto, desc, reg);
      desc.methods.push(method);
      desc.method[method.localName] = method;
    }
  }
  function newMethod(proto, parent, reg) {
    var _a, _b, _c, _d;
    let methodKind;
    if (proto.clientStreaming && proto.serverStreaming) {
      methodKind = "bidi_streaming";
    } else if (proto.clientStreaming) {
      methodKind = "client_streaming";
    } else if (proto.serverStreaming) {
      methodKind = "server_streaming";
    } else {
      methodKind = "unary";
    }
    const input = reg.getMessage(trimLeadingDot(proto.inputType));
    const output = reg.getMessage(trimLeadingDot(proto.outputType));
    assert(input, `invalid MethodDescriptorProto: input_type ${proto.inputType} not found`);
    assert(output, `invalid MethodDescriptorProto: output_type ${proto.inputType} not found`);
    const name = proto.name;
    return {
      kind: "rpc",
      proto,
      deprecated: (_b = (_a = proto.options) === null || _a === void 0 ? void 0 : _a.deprecated) !== null && _b !== void 0 ? _b : false,
      parent,
      name,
      localName: safeObjectProperty(name.length ? safeObjectProperty(name[0].toLowerCase() + name.substring(1)) : name),
      methodKind,
      input,
      output,
      idempotency: (_d = (_c = proto.options) === null || _c === void 0 ? void 0 : _c.idempotencyLevel) !== null && _d !== void 0 ? _d : IDEMPOTENCY_UNKNOWN,
      toString() {
        return `rpc ${parent.typeName}.${name}`;
      }
    };
  }
  function newOneof(proto, parent) {
    return {
      kind: "oneof",
      proto,
      deprecated: false,
      parent,
      fields: [],
      name: proto.name,
      localName: safeObjectProperty(protoCamelCase(proto.name)),
      toString() {
        return `oneof ${parent.typeName}.${this.name}`;
      }
    };
  }
  function newField(proto, parentOrFile, reg, oneof, mapEntries) {
    var _a, _b, _c;
    const isExtension = mapEntries === void 0;
    const field = {
      kind: "field",
      proto,
      deprecated: (_b = (_a = proto.options) === null || _a === void 0 ? void 0 : _a.deprecated) !== null && _b !== void 0 ? _b : false,
      name: proto.name,
      number: proto.number,
      scalar: void 0,
      message: void 0,
      enum: void 0,
      presence: getFieldPresence(proto, oneof, isExtension, parentOrFile),
      utf8Validation: isUtf8Validated(proto, parentOrFile),
      listKind: void 0,
      mapKind: void 0,
      mapKey: void 0,
      delimitedEncoding: void 0,
      packed: void 0,
      longAsString: false,
      getDefaultValue: void 0
    };
    if (isExtension) {
      const file = parentOrFile.kind == "file" ? parentOrFile : parentOrFile.file;
      const parent = parentOrFile.kind == "file" ? void 0 : parentOrFile;
      const typeName = makeTypeName(proto, parent, file);
      field.kind = "extension";
      field.file = file;
      field.parent = parent;
      field.oneof = void 0;
      field.typeName = typeName;
      field.jsonName = `[${typeName}]`;
      field.toString = () => `extension ${typeName}`;
      const extendee = reg.getMessage(trimLeadingDot(proto.extendee));
      assert(extendee, `invalid FieldDescriptorProto: extendee ${proto.extendee} not found`);
      field.extendee = extendee;
    } else {
      const parent = parentOrFile;
      assert(parent.kind == "message");
      field.parent = parent;
      field.oneof = oneof;
      field.localName = oneof ? protoCamelCase(proto.name) : safeObjectProperty(protoCamelCase(proto.name));
      field.jsonName = proto.jsonName;
      field.toString = () => `field ${parent.typeName}.${proto.name}`;
    }
    const label = proto.label;
    const type = proto.type;
    const jstype = (_c = proto.options) === null || _c === void 0 ? void 0 : _c.jstype;
    if (label === LABEL_REPEATED) {
      const mapEntry = type == TYPE_MESSAGE ? mapEntries === null || mapEntries === void 0 ? void 0 : mapEntries.get(trimLeadingDot(proto.typeName)) : void 0;
      if (mapEntry) {
        field.fieldKind = "map";
        const { key, value } = findMapEntryFields(mapEntry);
        field.mapKey = key.scalar;
        field.mapKind = value.fieldKind;
        field.message = value.message;
        field.delimitedEncoding = false;
        field.enum = value.enum;
        field.scalar = value.scalar;
        return field;
      }
      field.fieldKind = "list";
      switch (type) {
        case TYPE_MESSAGE:
        case TYPE_GROUP:
          field.listKind = "message";
          field.message = reg.getMessage(trimLeadingDot(proto.typeName));
          assert(field.message);
          field.delimitedEncoding = isDelimitedEncoding(proto, parentOrFile);
          break;
        case TYPE_ENUM:
          field.listKind = "enum";
          field.enum = reg.getEnum(trimLeadingDot(proto.typeName));
          assert(field.enum);
          break;
        default:
          field.listKind = "scalar";
          field.scalar = type;
          field.longAsString = jstype == JS_STRING;
          break;
      }
      field.packed = isPackedField(proto, parentOrFile);
      return field;
    }
    switch (type) {
      case TYPE_MESSAGE:
      case TYPE_GROUP:
        field.fieldKind = "message";
        field.message = reg.getMessage(trimLeadingDot(proto.typeName));
        assert(field.message, `invalid FieldDescriptorProto: type_name ${proto.typeName} not found`);
        field.delimitedEncoding = isDelimitedEncoding(proto, parentOrFile);
        field.getDefaultValue = () => void 0;
        break;
      case TYPE_ENUM: {
        const enumeration = reg.getEnum(trimLeadingDot(proto.typeName));
        assert(enumeration !== void 0, `invalid FieldDescriptorProto: type_name ${proto.typeName} not found`);
        field.fieldKind = "enum";
        field.enum = reg.getEnum(trimLeadingDot(proto.typeName));
        field.getDefaultValue = () => {
          return unsafeIsSetExplicit(proto, "defaultValue") ? parseTextFormatEnumValue(enumeration, proto.defaultValue) : void 0;
        };
        break;
      }
      default: {
        field.fieldKind = "scalar";
        field.scalar = type;
        field.longAsString = jstype == JS_STRING;
        field.getDefaultValue = () => {
          return unsafeIsSetExplicit(proto, "defaultValue") ? parseTextFormatScalarValue(type, proto.defaultValue) : void 0;
        };
        break;
      }
    }
    return field;
  }
  function getFileEdition(proto) {
    switch (proto.syntax) {
      case "":
      case "proto2":
        return EDITION_PROTO2;
      case "proto3":
        return EDITION_PROTO3;
      case "editions":
        if (proto.edition === EDITION_UNSTABLE) {
          return maximumEdition;
        }
        if (proto.edition in featureDefaults) {
          return proto.edition;
        }
        throw new Error(`${proto.name}: unsupported edition`);
      default:
        throw new Error(`${proto.name}: unsupported syntax "${proto.syntax}"`);
    }
  }
  function findFileDependencies(proto, reg) {
    return proto.dependency.map((wantName) => {
      const dep = reg.getFile(wantName);
      if (!dep) {
        throw new Error(`Cannot find ${wantName}, imported by ${proto.name}`);
      }
      return dep;
    });
  }
  function findEnumSharedPrefix(enumName, values) {
    const prefix = camelToSnakeCase(enumName) + "_";
    for (const value of values) {
      if (!value.name.toLowerCase().startsWith(prefix)) {
        return void 0;
      }
      const shortName = value.name.substring(prefix.length);
      if (shortName.length == 0) {
        return void 0;
      }
      if (/^\d/.test(shortName)) {
        return void 0;
      }
    }
    return prefix;
  }
  function camelToSnakeCase(camel) {
    return (camel.substring(0, 1) + camel.substring(1).replace(/[A-Z]/g, (c) => "_" + c)).toLowerCase();
  }
  function makeTypeName(proto, parent, file) {
    let typeName;
    if (parent) {
      typeName = `${parent.typeName}.${proto.name}`;
    } else if (file.proto.package.length > 0) {
      typeName = `${file.proto.package}.${proto.name}`;
    } else {
      typeName = `${proto.name}`;
    }
    return typeName;
  }
  function trimLeadingDot(typeName) {
    return typeName.startsWith(".") ? typeName.substring(1) : typeName;
  }
  function findOneof(proto, allOneofs) {
    if (!unsafeIsSetExplicit(proto, "oneofIndex")) {
      return void 0;
    }
    if (proto.proto3Optional) {
      return void 0;
    }
    const oneof = allOneofs[proto.oneofIndex];
    assert(oneof, `invalid FieldDescriptorProto: oneof #${proto.oneofIndex} for field #${proto.number} not found`);
    return oneof;
  }
  function getFieldPresence(proto, oneof, isExtension, parent) {
    if (proto.label == LABEL_REQUIRED) {
      return LEGACY_REQUIRED$2;
    }
    if (proto.label == LABEL_REPEATED) {
      return IMPLICIT$1;
    }
    if (!!oneof || proto.proto3Optional) {
      return EXPLICIT;
    }
    if (isExtension) {
      return EXPLICIT;
    }
    const resolved = resolveFeature("fieldPresence", { proto, parent });
    if (resolved == IMPLICIT$1 && (proto.type == TYPE_MESSAGE || proto.type == TYPE_GROUP)) {
      return EXPLICIT;
    }
    return resolved;
  }
  function isPackedField(proto, parent) {
    if (proto.label != LABEL_REPEATED) {
      return false;
    }
    switch (proto.type) {
      case TYPE_STRING:
      case TYPE_BYTES:
      case TYPE_GROUP:
      case TYPE_MESSAGE:
        return false;
    }
    const o = proto.options;
    if (o && unsafeIsSetExplicit(o, "packed")) {
      return o.packed;
    }
    return PACKED == resolveFeature("repeatedFieldEncoding", {
      proto,
      parent
    });
  }
  function findMapEntryFields(mapEntry) {
    const key = mapEntry.fields.find((f) => f.number === 1);
    const value = mapEntry.fields.find((f) => f.number === 2);
    assert(key && key.fieldKind == "scalar" && key.scalar != ScalarType.BYTES && key.scalar != ScalarType.FLOAT && key.scalar != ScalarType.DOUBLE && value && value.fieldKind != "list" && value.fieldKind != "map");
    return { key, value };
  }
  function isEnumOpen(desc) {
    var _a;
    return OPEN == resolveFeature("enumType", {
      proto: desc.proto,
      parent: (_a = desc.parent) !== null && _a !== void 0 ? _a : desc.file
    });
  }
  function isDelimitedEncoding(proto, parent) {
    if (proto.type == TYPE_GROUP) {
      return true;
    }
    return DELIMITED == resolveFeature("messageEncoding", {
      proto,
      parent
    });
  }
  function isUtf8Validated(proto, parent) {
    return VERIFY == resolveFeature("utf8Validation", {
      proto,
      parent
    });
  }
  function resolveFeature(name, ref) {
    var _a, _b;
    const featureSet = (_a = ref.proto.options) === null || _a === void 0 ? void 0 : _a.features;
    if (featureSet) {
      const val = featureSet[name];
      if (val != 0) {
        return val;
      }
    }
    if ("kind" in ref) {
      if (ref.kind == "message") {
        return resolveFeature(name, (_b = ref.parent) !== null && _b !== void 0 ? _b : ref.file);
      }
      const editionDefaults = featureDefaults[ref.edition];
      if (!editionDefaults) {
        throw new Error(`feature default for edition ${ref.edition} not found`);
      }
      return editionDefaults[name];
    }
    return resolveFeature(name, ref.parent);
  }
  function assert(condition, msg) {
    if (!condition) {
      throw new Error(msg);
    }
  }
  function boot(boot2) {
    const root = bootFileDescriptorProto(boot2);
    root.messageType.forEach(restoreJsonNames);
    const reg = createFileRegistry(root, () => void 0);
    return reg.getFile(root.name);
  }
  function bootFileDescriptorProto(init) {
    const proto = Object.create({
      syntax: "",
      edition: 0
    });
    return Object.assign(proto, Object.assign(Object.assign({ $typeName: "google.protobuf.FileDescriptorProto", dependency: [], publicDependency: [], weakDependency: [], optionDependency: [], service: [], extension: [] }, init), { messageType: init.messageType.map(bootDescriptorProto), enumType: init.enumType.map(bootEnumDescriptorProto) }));
  }
  function bootDescriptorProto(init) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const proto = Object.create({
      visibility: 0
    });
    return Object.assign(proto, {
      $typeName: "google.protobuf.DescriptorProto",
      name: init.name,
      field: (_b = (_a = init.field) === null || _a === void 0 ? void 0 : _a.map(bootFieldDescriptorProto)) !== null && _b !== void 0 ? _b : [],
      extension: [],
      nestedType: (_d = (_c = init.nestedType) === null || _c === void 0 ? void 0 : _c.map(bootDescriptorProto)) !== null && _d !== void 0 ? _d : [],
      enumType: (_f = (_e = init.enumType) === null || _e === void 0 ? void 0 : _e.map(bootEnumDescriptorProto)) !== null && _f !== void 0 ? _f : [],
      extensionRange: (_h = (_g = init.extensionRange) === null || _g === void 0 ? void 0 : _g.map((e) => Object.assign({ $typeName: "google.protobuf.DescriptorProto.ExtensionRange" }, e))) !== null && _h !== void 0 ? _h : [],
      oneofDecl: [],
      reservedRange: [],
      reservedName: []
    });
  }
  function bootFieldDescriptorProto(init) {
    const proto = Object.create({
      label: 1,
      typeName: "",
      extendee: "",
      defaultValue: "",
      oneofIndex: 0,
      jsonName: "",
      proto3Optional: false
    });
    return Object.assign(proto, Object.assign(Object.assign({ $typeName: "google.protobuf.FieldDescriptorProto" }, init), { options: init.options ? bootFieldOptions(init.options) : void 0 }));
  }
  function bootFieldOptions(init) {
    var _a, _b, _c;
    const proto = Object.create({
      ctype: 0,
      packed: false,
      jstype: 0,
      lazy: false,
      unverifiedLazy: false,
      deprecated: false,
      weak: false,
      debugRedact: false,
      retention: 0
    });
    return Object.assign(proto, Object.assign(Object.assign({ $typeName: "google.protobuf.FieldOptions" }, init), { targets: (_a = init.targets) !== null && _a !== void 0 ? _a : [], editionDefaults: (_c = (_b = init.editionDefaults) === null || _b === void 0 ? void 0 : _b.map((e) => Object.assign({ $typeName: "google.protobuf.FieldOptions.EditionDefault" }, e))) !== null && _c !== void 0 ? _c : [], uninterpretedOption: [] }));
  }
  function bootEnumDescriptorProto(init) {
    const proto = Object.create({
      visibility: 0
    });
    return Object.assign(proto, {
      $typeName: "google.protobuf.EnumDescriptorProto",
      name: init.name,
      reservedName: [],
      reservedRange: [],
      value: init.value.map((e) => Object.assign({ $typeName: "google.protobuf.EnumValueDescriptorProto" }, e))
    });
  }
  function messageDesc(file, path, ...paths) {
    return paths.reduce((acc, cur) => acc.nestedMessages[cur], file.messages[path]);
  }
  const file_google_protobuf_descriptor = boot({ "name": "google/protobuf/descriptor.proto", "package": "google.protobuf", "messageType": [{ "name": "FileDescriptorSet", "field": [{ "name": "file", "number": 1, "type": 11, "label": 3, "typeName": ".google.protobuf.FileDescriptorProto" }], "extensionRange": [{ "start": 536e6, "end": 536000001 }] }, { "name": "FileDescriptorProto", "field": [{ "name": "name", "number": 1, "type": 9, "label": 1 }, { "name": "package", "number": 2, "type": 9, "label": 1 }, { "name": "dependency", "number": 3, "type": 9, "label": 3 }, { "name": "public_dependency", "number": 10, "type": 5, "label": 3 }, { "name": "weak_dependency", "number": 11, "type": 5, "label": 3 }, { "name": "option_dependency", "number": 15, "type": 9, "label": 3 }, { "name": "message_type", "number": 4, "type": 11, "label": 3, "typeName": ".google.protobuf.DescriptorProto" }, { "name": "enum_type", "number": 5, "type": 11, "label": 3, "typeName": ".google.protobuf.EnumDescriptorProto" }, { "name": "service", "number": 6, "type": 11, "label": 3, "typeName": ".google.protobuf.ServiceDescriptorProto" }, { "name": "extension", "number": 7, "type": 11, "label": 3, "typeName": ".google.protobuf.FieldDescriptorProto" }, { "name": "options", "number": 8, "type": 11, "label": 1, "typeName": ".google.protobuf.FileOptions" }, { "name": "source_code_info", "number": 9, "type": 11, "label": 1, "typeName": ".google.protobuf.SourceCodeInfo" }, { "name": "syntax", "number": 12, "type": 9, "label": 1 }, { "name": "edition", "number": 14, "type": 14, "label": 1, "typeName": ".google.protobuf.Edition" }] }, { "name": "DescriptorProto", "field": [{ "name": "name", "number": 1, "type": 9, "label": 1 }, { "name": "field", "number": 2, "type": 11, "label": 3, "typeName": ".google.protobuf.FieldDescriptorProto" }, { "name": "extension", "number": 6, "type": 11, "label": 3, "typeName": ".google.protobuf.FieldDescriptorProto" }, { "name": "nested_type", "number": 3, "type": 11, "label": 3, "typeName": ".google.protobuf.DescriptorProto" }, { "name": "enum_type", "number": 4, "type": 11, "label": 3, "typeName": ".google.protobuf.EnumDescriptorProto" }, { "name": "extension_range", "number": 5, "type": 11, "label": 3, "typeName": ".google.protobuf.DescriptorProto.ExtensionRange" }, { "name": "oneof_decl", "number": 8, "type": 11, "label": 3, "typeName": ".google.protobuf.OneofDescriptorProto" }, { "name": "options", "number": 7, "type": 11, "label": 1, "typeName": ".google.protobuf.MessageOptions" }, { "name": "reserved_range", "number": 9, "type": 11, "label": 3, "typeName": ".google.protobuf.DescriptorProto.ReservedRange" }, { "name": "reserved_name", "number": 10, "type": 9, "label": 3 }, { "name": "visibility", "number": 11, "type": 14, "label": 1, "typeName": ".google.protobuf.SymbolVisibility" }], "nestedType": [{ "name": "ExtensionRange", "field": [{ "name": "start", "number": 1, "type": 5, "label": 1 }, { "name": "end", "number": 2, "type": 5, "label": 1 }, { "name": "options", "number": 3, "type": 11, "label": 1, "typeName": ".google.protobuf.ExtensionRangeOptions" }] }, { "name": "ReservedRange", "field": [{ "name": "start", "number": 1, "type": 5, "label": 1 }, { "name": "end", "number": 2, "type": 5, "label": 1 }] }] }, { "name": "ExtensionRangeOptions", "field": [{ "name": "uninterpreted_option", "number": 999, "type": 11, "label": 3, "typeName": ".google.protobuf.UninterpretedOption" }, { "name": "declaration", "number": 2, "type": 11, "label": 3, "typeName": ".google.protobuf.ExtensionRangeOptions.Declaration", "options": { "retention": 2 } }, { "name": "features", "number": 50, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }, { "name": "verification", "number": 3, "type": 14, "label": 1, "typeName": ".google.protobuf.ExtensionRangeOptions.VerificationState", "defaultValue": "UNVERIFIED", "options": { "retention": 2 } }], "nestedType": [{ "name": "Declaration", "field": [{ "name": "number", "number": 1, "type": 5, "label": 1 }, { "name": "full_name", "number": 2, "type": 9, "label": 1 }, { "name": "type", "number": 3, "type": 9, "label": 1 }, { "name": "reserved", "number": 5, "type": 8, "label": 1 }, { "name": "repeated", "number": 6, "type": 8, "label": 1 }] }], "enumType": [{ "name": "VerificationState", "value": [{ "name": "DECLARATION", "number": 0 }, { "name": "UNVERIFIED", "number": 1 }] }], "extensionRange": [{ "start": 1e3, "end": 536870912 }] }, { "name": "FieldDescriptorProto", "field": [{ "name": "name", "number": 1, "type": 9, "label": 1 }, { "name": "number", "number": 3, "type": 5, "label": 1 }, { "name": "label", "number": 4, "type": 14, "label": 1, "typeName": ".google.protobuf.FieldDescriptorProto.Label" }, { "name": "type", "number": 5, "type": 14, "label": 1, "typeName": ".google.protobuf.FieldDescriptorProto.Type" }, { "name": "type_name", "number": 6, "type": 9, "label": 1 }, { "name": "extendee", "number": 2, "type": 9, "label": 1 }, { "name": "default_value", "number": 7, "type": 9, "label": 1 }, { "name": "oneof_index", "number": 9, "type": 5, "label": 1 }, { "name": "json_name", "number": 10, "type": 9, "label": 1 }, { "name": "options", "number": 8, "type": 11, "label": 1, "typeName": ".google.protobuf.FieldOptions" }, { "name": "proto3_optional", "number": 17, "type": 8, "label": 1 }], "enumType": [{ "name": "Type", "value": [{ "name": "TYPE_DOUBLE", "number": 1 }, { "name": "TYPE_FLOAT", "number": 2 }, { "name": "TYPE_INT64", "number": 3 }, { "name": "TYPE_UINT64", "number": 4 }, { "name": "TYPE_INT32", "number": 5 }, { "name": "TYPE_FIXED64", "number": 6 }, { "name": "TYPE_FIXED32", "number": 7 }, { "name": "TYPE_BOOL", "number": 8 }, { "name": "TYPE_STRING", "number": 9 }, { "name": "TYPE_GROUP", "number": 10 }, { "name": "TYPE_MESSAGE", "number": 11 }, { "name": "TYPE_BYTES", "number": 12 }, { "name": "TYPE_UINT32", "number": 13 }, { "name": "TYPE_ENUM", "number": 14 }, { "name": "TYPE_SFIXED32", "number": 15 }, { "name": "TYPE_SFIXED64", "number": 16 }, { "name": "TYPE_SINT32", "number": 17 }, { "name": "TYPE_SINT64", "number": 18 }] }, { "name": "Label", "value": [{ "name": "LABEL_OPTIONAL", "number": 1 }, { "name": "LABEL_REPEATED", "number": 3 }, { "name": "LABEL_REQUIRED", "number": 2 }] }] }, { "name": "OneofDescriptorProto", "field": [{ "name": "name", "number": 1, "type": 9, "label": 1 }, { "name": "options", "number": 2, "type": 11, "label": 1, "typeName": ".google.protobuf.OneofOptions" }] }, { "name": "EnumDescriptorProto", "field": [{ "name": "name", "number": 1, "type": 9, "label": 1 }, { "name": "value", "number": 2, "type": 11, "label": 3, "typeName": ".google.protobuf.EnumValueDescriptorProto" }, { "name": "options", "number": 3, "type": 11, "label": 1, "typeName": ".google.protobuf.EnumOptions" }, { "name": "reserved_range", "number": 4, "type": 11, "label": 3, "typeName": ".google.protobuf.EnumDescriptorProto.EnumReservedRange" }, { "name": "reserved_name", "number": 5, "type": 9, "label": 3 }, { "name": "visibility", "number": 6, "type": 14, "label": 1, "typeName": ".google.protobuf.SymbolVisibility" }], "nestedType": [{ "name": "EnumReservedRange", "field": [{ "name": "start", "number": 1, "type": 5, "label": 1 }, { "name": "end", "number": 2, "type": 5, "label": 1 }] }] }, { "name": "EnumValueDescriptorProto", "field": [{ "name": "name", "number": 1, "type": 9, "label": 1 }, { "name": "number", "number": 2, "type": 5, "label": 1 }, { "name": "options", "number": 3, "type": 11, "label": 1, "typeName": ".google.protobuf.EnumValueOptions" }] }, { "name": "ServiceDescriptorProto", "field": [{ "name": "name", "number": 1, "type": 9, "label": 1 }, { "name": "method", "number": 2, "type": 11, "label": 3, "typeName": ".google.protobuf.MethodDescriptorProto" }, { "name": "options", "number": 3, "type": 11, "label": 1, "typeName": ".google.protobuf.ServiceOptions" }] }, { "name": "MethodDescriptorProto", "field": [{ "name": "name", "number": 1, "type": 9, "label": 1 }, { "name": "input_type", "number": 2, "type": 9, "label": 1 }, { "name": "output_type", "number": 3, "type": 9, "label": 1 }, { "name": "options", "number": 4, "type": 11, "label": 1, "typeName": ".google.protobuf.MethodOptions" }, { "name": "client_streaming", "number": 5, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "server_streaming", "number": 6, "type": 8, "label": 1, "defaultValue": "false" }] }, { "name": "FileOptions", "field": [{ "name": "java_package", "number": 1, "type": 9, "label": 1 }, { "name": "java_outer_classname", "number": 8, "type": 9, "label": 1 }, { "name": "java_multiple_files", "number": 10, "type": 8, "label": 1, "defaultValue": "false", "options": {} }, { "name": "java_generate_equals_and_hash", "number": 20, "type": 8, "label": 1, "options": { "deprecated": true } }, { "name": "java_string_check_utf8", "number": 27, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "optimize_for", "number": 9, "type": 14, "label": 1, "typeName": ".google.protobuf.FileOptions.OptimizeMode", "defaultValue": "SPEED" }, { "name": "go_package", "number": 11, "type": 9, "label": 1 }, { "name": "cc_generic_services", "number": 16, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "java_generic_services", "number": 17, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "py_generic_services", "number": 18, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "deprecated", "number": 23, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "cc_enable_arenas", "number": 31, "type": 8, "label": 1, "defaultValue": "true" }, { "name": "objc_class_prefix", "number": 36, "type": 9, "label": 1 }, { "name": "csharp_namespace", "number": 37, "type": 9, "label": 1 }, { "name": "swift_prefix", "number": 39, "type": 9, "label": 1 }, { "name": "php_class_prefix", "number": 40, "type": 9, "label": 1 }, { "name": "php_namespace", "number": 41, "type": 9, "label": 1 }, { "name": "php_metadata_namespace", "number": 44, "type": 9, "label": 1 }, { "name": "ruby_package", "number": 45, "type": 9, "label": 1 }, { "name": "features", "number": 50, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }, { "name": "uninterpreted_option", "number": 999, "type": 11, "label": 3, "typeName": ".google.protobuf.UninterpretedOption" }], "enumType": [{ "name": "OptimizeMode", "value": [{ "name": "SPEED", "number": 1 }, { "name": "CODE_SIZE", "number": 2 }, { "name": "LITE_RUNTIME", "number": 3 }] }], "extensionRange": [{ "start": 1e3, "end": 536870912 }] }, { "name": "MessageOptions", "field": [{ "name": "message_set_wire_format", "number": 1, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "no_standard_descriptor_accessor", "number": 2, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "deprecated", "number": 3, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "map_entry", "number": 7, "type": 8, "label": 1 }, { "name": "deprecated_legacy_json_field_conflicts", "number": 11, "type": 8, "label": 1, "options": { "deprecated": true } }, { "name": "features", "number": 12, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }, { "name": "uninterpreted_option", "number": 999, "type": 11, "label": 3, "typeName": ".google.protobuf.UninterpretedOption" }], "extensionRange": [{ "start": 1e3, "end": 536870912 }] }, { "name": "FieldOptions", "field": [{ "name": "ctype", "number": 1, "type": 14, "label": 1, "typeName": ".google.protobuf.FieldOptions.CType", "defaultValue": "STRING" }, { "name": "packed", "number": 2, "type": 8, "label": 1 }, { "name": "jstype", "number": 6, "type": 14, "label": 1, "typeName": ".google.protobuf.FieldOptions.JSType", "defaultValue": "JS_NORMAL" }, { "name": "lazy", "number": 5, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "unverified_lazy", "number": 15, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "deprecated", "number": 3, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "weak", "number": 10, "type": 8, "label": 1, "defaultValue": "false", "options": { "deprecated": true } }, { "name": "debug_redact", "number": 16, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "retention", "number": 17, "type": 14, "label": 1, "typeName": ".google.protobuf.FieldOptions.OptionRetention" }, { "name": "targets", "number": 19, "type": 14, "label": 3, "typeName": ".google.protobuf.FieldOptions.OptionTargetType" }, { "name": "edition_defaults", "number": 20, "type": 11, "label": 3, "typeName": ".google.protobuf.FieldOptions.EditionDefault" }, { "name": "features", "number": 21, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }, { "name": "feature_support", "number": 22, "type": 11, "label": 1, "typeName": ".google.protobuf.FieldOptions.FeatureSupport" }, { "name": "uninterpreted_option", "number": 999, "type": 11, "label": 3, "typeName": ".google.protobuf.UninterpretedOption" }], "nestedType": [{ "name": "EditionDefault", "field": [{ "name": "edition", "number": 3, "type": 14, "label": 1, "typeName": ".google.protobuf.Edition" }, { "name": "value", "number": 2, "type": 9, "label": 1 }] }, { "name": "FeatureSupport", "field": [{ "name": "edition_introduced", "number": 1, "type": 14, "label": 1, "typeName": ".google.protobuf.Edition" }, { "name": "edition_deprecated", "number": 2, "type": 14, "label": 1, "typeName": ".google.protobuf.Edition" }, { "name": "deprecation_warning", "number": 3, "type": 9, "label": 1 }, { "name": "edition_removed", "number": 4, "type": 14, "label": 1, "typeName": ".google.protobuf.Edition" }, { "name": "removal_error", "number": 5, "type": 9, "label": 1 }] }], "enumType": [{ "name": "CType", "value": [{ "name": "STRING", "number": 0 }, { "name": "CORD", "number": 1 }, { "name": "STRING_PIECE", "number": 2 }] }, { "name": "JSType", "value": [{ "name": "JS_NORMAL", "number": 0 }, { "name": "JS_STRING", "number": 1 }, { "name": "JS_NUMBER", "number": 2 }] }, { "name": "OptionRetention", "value": [{ "name": "RETENTION_UNKNOWN", "number": 0 }, { "name": "RETENTION_RUNTIME", "number": 1 }, { "name": "RETENTION_SOURCE", "number": 2 }] }, { "name": "OptionTargetType", "value": [{ "name": "TARGET_TYPE_UNKNOWN", "number": 0 }, { "name": "TARGET_TYPE_FILE", "number": 1 }, { "name": "TARGET_TYPE_EXTENSION_RANGE", "number": 2 }, { "name": "TARGET_TYPE_MESSAGE", "number": 3 }, { "name": "TARGET_TYPE_FIELD", "number": 4 }, { "name": "TARGET_TYPE_ONEOF", "number": 5 }, { "name": "TARGET_TYPE_ENUM", "number": 6 }, { "name": "TARGET_TYPE_ENUM_ENTRY", "number": 7 }, { "name": "TARGET_TYPE_SERVICE", "number": 8 }, { "name": "TARGET_TYPE_METHOD", "number": 9 }] }], "extensionRange": [{ "start": 1e3, "end": 536870912 }] }, { "name": "OneofOptions", "field": [{ "name": "features", "number": 1, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }, { "name": "uninterpreted_option", "number": 999, "type": 11, "label": 3, "typeName": ".google.protobuf.UninterpretedOption" }], "extensionRange": [{ "start": 1e3, "end": 536870912 }] }, { "name": "EnumOptions", "field": [{ "name": "allow_alias", "number": 2, "type": 8, "label": 1 }, { "name": "deprecated", "number": 3, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "deprecated_legacy_json_field_conflicts", "number": 6, "type": 8, "label": 1, "options": { "deprecated": true } }, { "name": "features", "number": 7, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }, { "name": "uninterpreted_option", "number": 999, "type": 11, "label": 3, "typeName": ".google.protobuf.UninterpretedOption" }], "extensionRange": [{ "start": 1e3, "end": 536870912 }] }, { "name": "EnumValueOptions", "field": [{ "name": "deprecated", "number": 1, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "features", "number": 2, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }, { "name": "debug_redact", "number": 3, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "feature_support", "number": 4, "type": 11, "label": 1, "typeName": ".google.protobuf.FieldOptions.FeatureSupport" }, { "name": "uninterpreted_option", "number": 999, "type": 11, "label": 3, "typeName": ".google.protobuf.UninterpretedOption" }], "extensionRange": [{ "start": 1e3, "end": 536870912 }] }, { "name": "ServiceOptions", "field": [{ "name": "features", "number": 34, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }, { "name": "deprecated", "number": 33, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "uninterpreted_option", "number": 999, "type": 11, "label": 3, "typeName": ".google.protobuf.UninterpretedOption" }], "extensionRange": [{ "start": 1e3, "end": 536870912 }] }, { "name": "MethodOptions", "field": [{ "name": "deprecated", "number": 33, "type": 8, "label": 1, "defaultValue": "false" }, { "name": "idempotency_level", "number": 34, "type": 14, "label": 1, "typeName": ".google.protobuf.MethodOptions.IdempotencyLevel", "defaultValue": "IDEMPOTENCY_UNKNOWN" }, { "name": "features", "number": 35, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }, { "name": "uninterpreted_option", "number": 999, "type": 11, "label": 3, "typeName": ".google.protobuf.UninterpretedOption" }], "enumType": [{ "name": "IdempotencyLevel", "value": [{ "name": "IDEMPOTENCY_UNKNOWN", "number": 0 }, { "name": "NO_SIDE_EFFECTS", "number": 1 }, { "name": "IDEMPOTENT", "number": 2 }] }], "extensionRange": [{ "start": 1e3, "end": 536870912 }] }, { "name": "UninterpretedOption", "field": [{ "name": "name", "number": 2, "type": 11, "label": 3, "typeName": ".google.protobuf.UninterpretedOption.NamePart" }, { "name": "identifier_value", "number": 3, "type": 9, "label": 1 }, { "name": "positive_int_value", "number": 4, "type": 4, "label": 1 }, { "name": "negative_int_value", "number": 5, "type": 3, "label": 1 }, { "name": "double_value", "number": 6, "type": 1, "label": 1 }, { "name": "string_value", "number": 7, "type": 12, "label": 1 }, { "name": "aggregate_value", "number": 8, "type": 9, "label": 1 }], "nestedType": [{ "name": "NamePart", "field": [{ "name": "name_part", "number": 1, "type": 9, "label": 2 }, { "name": "is_extension", "number": 2, "type": 8, "label": 2 }] }] }, { "name": "FeatureSet", "field": [{ "name": "field_presence", "number": 1, "type": 14, "label": 1, "typeName": ".google.protobuf.FeatureSet.FieldPresence", "options": { "retention": 1, "targets": [4, 1], "editionDefaults": [{ "value": "EXPLICIT", "edition": 900 }, { "value": "IMPLICIT", "edition": 999 }, { "value": "EXPLICIT", "edition": 1e3 }] } }, { "name": "enum_type", "number": 2, "type": 14, "label": 1, "typeName": ".google.protobuf.FeatureSet.EnumType", "options": { "retention": 1, "targets": [6, 1], "editionDefaults": [{ "value": "CLOSED", "edition": 900 }, { "value": "OPEN", "edition": 999 }] } }, { "name": "repeated_field_encoding", "number": 3, "type": 14, "label": 1, "typeName": ".google.protobuf.FeatureSet.RepeatedFieldEncoding", "options": { "retention": 1, "targets": [4, 1], "editionDefaults": [{ "value": "EXPANDED", "edition": 900 }, { "value": "PACKED", "edition": 999 }] } }, { "name": "utf8_validation", "number": 4, "type": 14, "label": 1, "typeName": ".google.protobuf.FeatureSet.Utf8Validation", "options": { "retention": 1, "targets": [4, 1], "editionDefaults": [{ "value": "NONE", "edition": 900 }, { "value": "VERIFY", "edition": 999 }] } }, { "name": "message_encoding", "number": 5, "type": 14, "label": 1, "typeName": ".google.protobuf.FeatureSet.MessageEncoding", "options": { "retention": 1, "targets": [4, 1], "editionDefaults": [{ "value": "LENGTH_PREFIXED", "edition": 900 }] } }, { "name": "json_format", "number": 6, "type": 14, "label": 1, "typeName": ".google.protobuf.FeatureSet.JsonFormat", "options": { "retention": 1, "targets": [3, 6, 1], "editionDefaults": [{ "value": "LEGACY_BEST_EFFORT", "edition": 900 }, { "value": "ALLOW", "edition": 999 }] } }, { "name": "enforce_naming_style", "number": 7, "type": 14, "label": 1, "typeName": ".google.protobuf.FeatureSet.EnforceNamingStyle", "options": { "retention": 2, "targets": [1, 2, 3, 4, 5, 6, 7, 8, 9], "editionDefaults": [{ "value": "STYLE_LEGACY", "edition": 900 }, { "value": "STYLE2024", "edition": 1001 }] } }, { "name": "default_symbol_visibility", "number": 8, "type": 14, "label": 1, "typeName": ".google.protobuf.FeatureSet.VisibilityFeature.DefaultSymbolVisibility", "options": { "retention": 2, "targets": [1], "editionDefaults": [{ "value": "EXPORT_ALL", "edition": 900 }, { "value": "EXPORT_TOP_LEVEL", "edition": 1001 }] } }], "nestedType": [{ "name": "VisibilityFeature", "enumType": [{ "name": "DefaultSymbolVisibility", "value": [{ "name": "DEFAULT_SYMBOL_VISIBILITY_UNKNOWN", "number": 0 }, { "name": "EXPORT_ALL", "number": 1 }, { "name": "EXPORT_TOP_LEVEL", "number": 2 }, { "name": "LOCAL_ALL", "number": 3 }, { "name": "STRICT", "number": 4 }] }] }], "enumType": [{ "name": "FieldPresence", "value": [{ "name": "FIELD_PRESENCE_UNKNOWN", "number": 0 }, { "name": "EXPLICIT", "number": 1 }, { "name": "IMPLICIT", "number": 2 }, { "name": "LEGACY_REQUIRED", "number": 3 }] }, { "name": "EnumType", "value": [{ "name": "ENUM_TYPE_UNKNOWN", "number": 0 }, { "name": "OPEN", "number": 1 }, { "name": "CLOSED", "number": 2 }] }, { "name": "RepeatedFieldEncoding", "value": [{ "name": "REPEATED_FIELD_ENCODING_UNKNOWN", "number": 0 }, { "name": "PACKED", "number": 1 }, { "name": "EXPANDED", "number": 2 }] }, { "name": "Utf8Validation", "value": [{ "name": "UTF8_VALIDATION_UNKNOWN", "number": 0 }, { "name": "VERIFY", "number": 2 }, { "name": "NONE", "number": 3 }] }, { "name": "MessageEncoding", "value": [{ "name": "MESSAGE_ENCODING_UNKNOWN", "number": 0 }, { "name": "LENGTH_PREFIXED", "number": 1 }, { "name": "DELIMITED", "number": 2 }] }, { "name": "JsonFormat", "value": [{ "name": "JSON_FORMAT_UNKNOWN", "number": 0 }, { "name": "ALLOW", "number": 1 }, { "name": "LEGACY_BEST_EFFORT", "number": 2 }] }, { "name": "EnforceNamingStyle", "value": [{ "name": "ENFORCE_NAMING_STYLE_UNKNOWN", "number": 0 }, { "name": "STYLE2024", "number": 1 }, { "name": "STYLE_LEGACY", "number": 2 }] }], "extensionRange": [{ "start": 1e3, "end": 9995 }, { "start": 9995, "end": 1e4 }, { "start": 1e4, "end": 10001 }] }, { "name": "FeatureSetDefaults", "field": [{ "name": "defaults", "number": 1, "type": 11, "label": 3, "typeName": ".google.protobuf.FeatureSetDefaults.FeatureSetEditionDefault" }, { "name": "minimum_edition", "number": 4, "type": 14, "label": 1, "typeName": ".google.protobuf.Edition" }, { "name": "maximum_edition", "number": 5, "type": 14, "label": 1, "typeName": ".google.protobuf.Edition" }], "nestedType": [{ "name": "FeatureSetEditionDefault", "field": [{ "name": "edition", "number": 3, "type": 14, "label": 1, "typeName": ".google.protobuf.Edition" }, { "name": "overridable_features", "number": 4, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }, { "name": "fixed_features", "number": 5, "type": 11, "label": 1, "typeName": ".google.protobuf.FeatureSet" }] }] }, { "name": "SourceCodeInfo", "field": [{ "name": "location", "number": 1, "type": 11, "label": 3, "typeName": ".google.protobuf.SourceCodeInfo.Location" }], "nestedType": [{ "name": "Location", "field": [{ "name": "path", "number": 1, "type": 5, "label": 3, "options": { "packed": true } }, { "name": "span", "number": 2, "type": 5, "label": 3, "options": { "packed": true } }, { "name": "leading_comments", "number": 3, "type": 9, "label": 1 }, { "name": "trailing_comments", "number": 4, "type": 9, "label": 1 }, { "name": "leading_detached_comments", "number": 6, "type": 9, "label": 3 }] }], "extensionRange": [{ "start": 536e6, "end": 536000001 }] }, { "name": "GeneratedCodeInfo", "field": [{ "name": "annotation", "number": 1, "type": 11, "label": 3, "typeName": ".google.protobuf.GeneratedCodeInfo.Annotation" }], "nestedType": [{ "name": "Annotation", "field": [{ "name": "path", "number": 1, "type": 5, "label": 3, "options": { "packed": true } }, { "name": "source_file", "number": 2, "type": 9, "label": 1 }, { "name": "begin", "number": 3, "type": 5, "label": 1 }, { "name": "end", "number": 4, "type": 5, "label": 1 }, { "name": "semantic", "number": 5, "type": 14, "label": 1, "typeName": ".google.protobuf.GeneratedCodeInfo.Annotation.Semantic" }], "enumType": [{ "name": "Semantic", "value": [{ "name": "NONE", "number": 0 }, { "name": "SET", "number": 1 }, { "name": "ALIAS", "number": 2 }] }] }] }], "enumType": [{ "name": "Edition", "value": [{ "name": "EDITION_UNKNOWN", "number": 0 }, { "name": "EDITION_LEGACY", "number": 900 }, { "name": "EDITION_PROTO2", "number": 998 }, { "name": "EDITION_PROTO3", "number": 999 }, { "name": "EDITION_2023", "number": 1e3 }, { "name": "EDITION_2024", "number": 1001 }, { "name": "EDITION_UNSTABLE", "number": 9999 }, { "name": "EDITION_1_TEST_ONLY", "number": 1 }, { "name": "EDITION_2_TEST_ONLY", "number": 2 }, { "name": "EDITION_99997_TEST_ONLY", "number": 99997 }, { "name": "EDITION_99998_TEST_ONLY", "number": 99998 }, { "name": "EDITION_99999_TEST_ONLY", "number": 99999 }, { "name": "EDITION_MAX", "number": 2147483647 }] }, { "name": "SymbolVisibility", "value": [{ "name": "VISIBILITY_UNSET", "number": 0 }, { "name": "VISIBILITY_LOCAL", "number": 1 }, { "name": "VISIBILITY_EXPORT", "number": 2 }] }] });
  const FileDescriptorProtoSchema = messageDesc(file_google_protobuf_descriptor, 1);
  var ExtensionRangeOptions_VerificationState;
  (function(ExtensionRangeOptions_VerificationState2) {
    ExtensionRangeOptions_VerificationState2[ExtensionRangeOptions_VerificationState2["DECLARATION"] = 0] = "DECLARATION";
    ExtensionRangeOptions_VerificationState2[ExtensionRangeOptions_VerificationState2["UNVERIFIED"] = 1] = "UNVERIFIED";
  })(ExtensionRangeOptions_VerificationState || (ExtensionRangeOptions_VerificationState = {}));
  var FieldDescriptorProto_Type;
  (function(FieldDescriptorProto_Type2) {
    FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["DOUBLE"] = 1] = "DOUBLE";
    FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["FLOAT"] = 2] = "FLOAT";
    FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["INT64"] = 3] = "INT64";
    FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["UINT64"] = 4] = "UINT64";
    FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["INT32"] = 5] = "INT32";
    FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["FIXED64"] = 6] = "FIXED64";
    FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["FIXED32"] = 7] = "FIXED32";
    FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["BOOL"] = 8] = "BOOL";
    FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["STRING"] = 9] = "STRING";
    FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["GROUP"] = 10] = "GROUP";
    FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["MESSAGE"] = 11] = "MESSAGE";
    FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["BYTES"] = 12] = "BYTES";
    FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["UINT32"] = 13] = "UINT32";
    FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["ENUM"] = 14] = "ENUM";
    FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["SFIXED32"] = 15] = "SFIXED32";
    FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["SFIXED64"] = 16] = "SFIXED64";
    FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["SINT32"] = 17] = "SINT32";
    FieldDescriptorProto_Type2[FieldDescriptorProto_Type2["SINT64"] = 18] = "SINT64";
  })(FieldDescriptorProto_Type || (FieldDescriptorProto_Type = {}));
  var FieldDescriptorProto_Label;
  (function(FieldDescriptorProto_Label2) {
    FieldDescriptorProto_Label2[FieldDescriptorProto_Label2["OPTIONAL"] = 1] = "OPTIONAL";
    FieldDescriptorProto_Label2[FieldDescriptorProto_Label2["REPEATED"] = 3] = "REPEATED";
    FieldDescriptorProto_Label2[FieldDescriptorProto_Label2["REQUIRED"] = 2] = "REQUIRED";
  })(FieldDescriptorProto_Label || (FieldDescriptorProto_Label = {}));
  var FileOptions_OptimizeMode;
  (function(FileOptions_OptimizeMode2) {
    FileOptions_OptimizeMode2[FileOptions_OptimizeMode2["SPEED"] = 1] = "SPEED";
    FileOptions_OptimizeMode2[FileOptions_OptimizeMode2["CODE_SIZE"] = 2] = "CODE_SIZE";
    FileOptions_OptimizeMode2[FileOptions_OptimizeMode2["LITE_RUNTIME"] = 3] = "LITE_RUNTIME";
  })(FileOptions_OptimizeMode || (FileOptions_OptimizeMode = {}));
  var FieldOptions_CType;
  (function(FieldOptions_CType2) {
    FieldOptions_CType2[FieldOptions_CType2["STRING"] = 0] = "STRING";
    FieldOptions_CType2[FieldOptions_CType2["CORD"] = 1] = "CORD";
    FieldOptions_CType2[FieldOptions_CType2["STRING_PIECE"] = 2] = "STRING_PIECE";
  })(FieldOptions_CType || (FieldOptions_CType = {}));
  var FieldOptions_JSType;
  (function(FieldOptions_JSType2) {
    FieldOptions_JSType2[FieldOptions_JSType2["JS_NORMAL"] = 0] = "JS_NORMAL";
    FieldOptions_JSType2[FieldOptions_JSType2["JS_STRING"] = 1] = "JS_STRING";
    FieldOptions_JSType2[FieldOptions_JSType2["JS_NUMBER"] = 2] = "JS_NUMBER";
  })(FieldOptions_JSType || (FieldOptions_JSType = {}));
  var FieldOptions_OptionRetention;
  (function(FieldOptions_OptionRetention2) {
    FieldOptions_OptionRetention2[FieldOptions_OptionRetention2["RETENTION_UNKNOWN"] = 0] = "RETENTION_UNKNOWN";
    FieldOptions_OptionRetention2[FieldOptions_OptionRetention2["RETENTION_RUNTIME"] = 1] = "RETENTION_RUNTIME";
    FieldOptions_OptionRetention2[FieldOptions_OptionRetention2["RETENTION_SOURCE"] = 2] = "RETENTION_SOURCE";
  })(FieldOptions_OptionRetention || (FieldOptions_OptionRetention = {}));
  var FieldOptions_OptionTargetType;
  (function(FieldOptions_OptionTargetType2) {
    FieldOptions_OptionTargetType2[FieldOptions_OptionTargetType2["TARGET_TYPE_UNKNOWN"] = 0] = "TARGET_TYPE_UNKNOWN";
    FieldOptions_OptionTargetType2[FieldOptions_OptionTargetType2["TARGET_TYPE_FILE"] = 1] = "TARGET_TYPE_FILE";
    FieldOptions_OptionTargetType2[FieldOptions_OptionTargetType2["TARGET_TYPE_EXTENSION_RANGE"] = 2] = "TARGET_TYPE_EXTENSION_RANGE";
    FieldOptions_OptionTargetType2[FieldOptions_OptionTargetType2["TARGET_TYPE_MESSAGE"] = 3] = "TARGET_TYPE_MESSAGE";
    FieldOptions_OptionTargetType2[FieldOptions_OptionTargetType2["TARGET_TYPE_FIELD"] = 4] = "TARGET_TYPE_FIELD";
    FieldOptions_OptionTargetType2[FieldOptions_OptionTargetType2["TARGET_TYPE_ONEOF"] = 5] = "TARGET_TYPE_ONEOF";
    FieldOptions_OptionTargetType2[FieldOptions_OptionTargetType2["TARGET_TYPE_ENUM"] = 6] = "TARGET_TYPE_ENUM";
    FieldOptions_OptionTargetType2[FieldOptions_OptionTargetType2["TARGET_TYPE_ENUM_ENTRY"] = 7] = "TARGET_TYPE_ENUM_ENTRY";
    FieldOptions_OptionTargetType2[FieldOptions_OptionTargetType2["TARGET_TYPE_SERVICE"] = 8] = "TARGET_TYPE_SERVICE";
    FieldOptions_OptionTargetType2[FieldOptions_OptionTargetType2["TARGET_TYPE_METHOD"] = 9] = "TARGET_TYPE_METHOD";
  })(FieldOptions_OptionTargetType || (FieldOptions_OptionTargetType = {}));
  var MethodOptions_IdempotencyLevel;
  (function(MethodOptions_IdempotencyLevel2) {
    MethodOptions_IdempotencyLevel2[MethodOptions_IdempotencyLevel2["IDEMPOTENCY_UNKNOWN"] = 0] = "IDEMPOTENCY_UNKNOWN";
    MethodOptions_IdempotencyLevel2[MethodOptions_IdempotencyLevel2["NO_SIDE_EFFECTS"] = 1] = "NO_SIDE_EFFECTS";
    MethodOptions_IdempotencyLevel2[MethodOptions_IdempotencyLevel2["IDEMPOTENT"] = 2] = "IDEMPOTENT";
  })(MethodOptions_IdempotencyLevel || (MethodOptions_IdempotencyLevel = {}));
  var FeatureSet_VisibilityFeature_DefaultSymbolVisibility;
  (function(FeatureSet_VisibilityFeature_DefaultSymbolVisibility2) {
    FeatureSet_VisibilityFeature_DefaultSymbolVisibility2[FeatureSet_VisibilityFeature_DefaultSymbolVisibility2["DEFAULT_SYMBOL_VISIBILITY_UNKNOWN"] = 0] = "DEFAULT_SYMBOL_VISIBILITY_UNKNOWN";
    FeatureSet_VisibilityFeature_DefaultSymbolVisibility2[FeatureSet_VisibilityFeature_DefaultSymbolVisibility2["EXPORT_ALL"] = 1] = "EXPORT_ALL";
    FeatureSet_VisibilityFeature_DefaultSymbolVisibility2[FeatureSet_VisibilityFeature_DefaultSymbolVisibility2["EXPORT_TOP_LEVEL"] = 2] = "EXPORT_TOP_LEVEL";
    FeatureSet_VisibilityFeature_DefaultSymbolVisibility2[FeatureSet_VisibilityFeature_DefaultSymbolVisibility2["LOCAL_ALL"] = 3] = "LOCAL_ALL";
    FeatureSet_VisibilityFeature_DefaultSymbolVisibility2[FeatureSet_VisibilityFeature_DefaultSymbolVisibility2["STRICT"] = 4] = "STRICT";
  })(FeatureSet_VisibilityFeature_DefaultSymbolVisibility || (FeatureSet_VisibilityFeature_DefaultSymbolVisibility = {}));
  var FeatureSet_FieldPresence;
  (function(FeatureSet_FieldPresence2) {
    FeatureSet_FieldPresence2[FeatureSet_FieldPresence2["FIELD_PRESENCE_UNKNOWN"] = 0] = "FIELD_PRESENCE_UNKNOWN";
    FeatureSet_FieldPresence2[FeatureSet_FieldPresence2["EXPLICIT"] = 1] = "EXPLICIT";
    FeatureSet_FieldPresence2[FeatureSet_FieldPresence2["IMPLICIT"] = 2] = "IMPLICIT";
    FeatureSet_FieldPresence2[FeatureSet_FieldPresence2["LEGACY_REQUIRED"] = 3] = "LEGACY_REQUIRED";
  })(FeatureSet_FieldPresence || (FeatureSet_FieldPresence = {}));
  var FeatureSet_EnumType;
  (function(FeatureSet_EnumType2) {
    FeatureSet_EnumType2[FeatureSet_EnumType2["ENUM_TYPE_UNKNOWN"] = 0] = "ENUM_TYPE_UNKNOWN";
    FeatureSet_EnumType2[FeatureSet_EnumType2["OPEN"] = 1] = "OPEN";
    FeatureSet_EnumType2[FeatureSet_EnumType2["CLOSED"] = 2] = "CLOSED";
  })(FeatureSet_EnumType || (FeatureSet_EnumType = {}));
  var FeatureSet_RepeatedFieldEncoding;
  (function(FeatureSet_RepeatedFieldEncoding2) {
    FeatureSet_RepeatedFieldEncoding2[FeatureSet_RepeatedFieldEncoding2["REPEATED_FIELD_ENCODING_UNKNOWN"] = 0] = "REPEATED_FIELD_ENCODING_UNKNOWN";
    FeatureSet_RepeatedFieldEncoding2[FeatureSet_RepeatedFieldEncoding2["PACKED"] = 1] = "PACKED";
    FeatureSet_RepeatedFieldEncoding2[FeatureSet_RepeatedFieldEncoding2["EXPANDED"] = 2] = "EXPANDED";
  })(FeatureSet_RepeatedFieldEncoding || (FeatureSet_RepeatedFieldEncoding = {}));
  var FeatureSet_Utf8Validation;
  (function(FeatureSet_Utf8Validation2) {
    FeatureSet_Utf8Validation2[FeatureSet_Utf8Validation2["UTF8_VALIDATION_UNKNOWN"] = 0] = "UTF8_VALIDATION_UNKNOWN";
    FeatureSet_Utf8Validation2[FeatureSet_Utf8Validation2["VERIFY"] = 2] = "VERIFY";
    FeatureSet_Utf8Validation2[FeatureSet_Utf8Validation2["NONE"] = 3] = "NONE";
  })(FeatureSet_Utf8Validation || (FeatureSet_Utf8Validation = {}));
  var FeatureSet_MessageEncoding;
  (function(FeatureSet_MessageEncoding2) {
    FeatureSet_MessageEncoding2[FeatureSet_MessageEncoding2["MESSAGE_ENCODING_UNKNOWN"] = 0] = "MESSAGE_ENCODING_UNKNOWN";
    FeatureSet_MessageEncoding2[FeatureSet_MessageEncoding2["LENGTH_PREFIXED"] = 1] = "LENGTH_PREFIXED";
    FeatureSet_MessageEncoding2[FeatureSet_MessageEncoding2["DELIMITED"] = 2] = "DELIMITED";
  })(FeatureSet_MessageEncoding || (FeatureSet_MessageEncoding = {}));
  var FeatureSet_JsonFormat;
  (function(FeatureSet_JsonFormat2) {
    FeatureSet_JsonFormat2[FeatureSet_JsonFormat2["JSON_FORMAT_UNKNOWN"] = 0] = "JSON_FORMAT_UNKNOWN";
    FeatureSet_JsonFormat2[FeatureSet_JsonFormat2["ALLOW"] = 1] = "ALLOW";
    FeatureSet_JsonFormat2[FeatureSet_JsonFormat2["LEGACY_BEST_EFFORT"] = 2] = "LEGACY_BEST_EFFORT";
  })(FeatureSet_JsonFormat || (FeatureSet_JsonFormat = {}));
  var FeatureSet_EnforceNamingStyle;
  (function(FeatureSet_EnforceNamingStyle2) {
    FeatureSet_EnforceNamingStyle2[FeatureSet_EnforceNamingStyle2["ENFORCE_NAMING_STYLE_UNKNOWN"] = 0] = "ENFORCE_NAMING_STYLE_UNKNOWN";
    FeatureSet_EnforceNamingStyle2[FeatureSet_EnforceNamingStyle2["STYLE2024"] = 1] = "STYLE2024";
    FeatureSet_EnforceNamingStyle2[FeatureSet_EnforceNamingStyle2["STYLE_LEGACY"] = 2] = "STYLE_LEGACY";
  })(FeatureSet_EnforceNamingStyle || (FeatureSet_EnforceNamingStyle = {}));
  var GeneratedCodeInfo_Annotation_Semantic;
  (function(GeneratedCodeInfo_Annotation_Semantic2) {
    GeneratedCodeInfo_Annotation_Semantic2[GeneratedCodeInfo_Annotation_Semantic2["NONE"] = 0] = "NONE";
    GeneratedCodeInfo_Annotation_Semantic2[GeneratedCodeInfo_Annotation_Semantic2["SET"] = 1] = "SET";
    GeneratedCodeInfo_Annotation_Semantic2[GeneratedCodeInfo_Annotation_Semantic2["ALIAS"] = 2] = "ALIAS";
  })(GeneratedCodeInfo_Annotation_Semantic || (GeneratedCodeInfo_Annotation_Semantic = {}));
  var Edition;
  (function(Edition2) {
    Edition2[Edition2["EDITION_UNKNOWN"] = 0] = "EDITION_UNKNOWN";
    Edition2[Edition2["EDITION_LEGACY"] = 900] = "EDITION_LEGACY";
    Edition2[Edition2["EDITION_PROTO2"] = 998] = "EDITION_PROTO2";
    Edition2[Edition2["EDITION_PROTO3"] = 999] = "EDITION_PROTO3";
    Edition2[Edition2["EDITION_2023"] = 1e3] = "EDITION_2023";
    Edition2[Edition2["EDITION_2024"] = 1001] = "EDITION_2024";
    Edition2[Edition2["EDITION_UNSTABLE"] = 9999] = "EDITION_UNSTABLE";
    Edition2[Edition2["EDITION_1_TEST_ONLY"] = 1] = "EDITION_1_TEST_ONLY";
    Edition2[Edition2["EDITION_2_TEST_ONLY"] = 2] = "EDITION_2_TEST_ONLY";
    Edition2[Edition2["EDITION_99997_TEST_ONLY"] = 99997] = "EDITION_99997_TEST_ONLY";
    Edition2[Edition2["EDITION_99998_TEST_ONLY"] = 99998] = "EDITION_99998_TEST_ONLY";
    Edition2[Edition2["EDITION_99999_TEST_ONLY"] = 99999] = "EDITION_99999_TEST_ONLY";
    Edition2[Edition2["EDITION_MAX"] = 2147483647] = "EDITION_MAX";
  })(Edition || (Edition = {}));
  var SymbolVisibility;
  (function(SymbolVisibility2) {
    SymbolVisibility2[SymbolVisibility2["VISIBILITY_UNSET"] = 0] = "VISIBILITY_UNSET";
    SymbolVisibility2[SymbolVisibility2["VISIBILITY_LOCAL"] = 1] = "VISIBILITY_LOCAL";
    SymbolVisibility2[SymbolVisibility2["VISIBILITY_EXPORT"] = 2] = "VISIBILITY_EXPORT";
  })(SymbolVisibility || (SymbolVisibility = {}));
  function makeReadContext$1(options) {
    return Object.assign(Object.assign({ readUnknownFields: true, recursionLimit: 100 }, options), { depth: 0 });
  }
  function fromBinary(schema, bytes, options) {
    const msg = reflect(schema, void 0, false);
    readMessage$1(msg, new BinaryReader(bytes), makeReadContext$1(options), false, bytes.byteLength);
    return msg.message;
  }
  function readMessage$1(message, reader, ctx, delimited, lengthOrDelimitedFieldNo) {
    var _a;
    if (++ctx.depth > ctx.recursionLimit) {
      throw new Error(`cannot decode ${message.desc} from binary: maximum recursion depth of ${ctx.recursionLimit} reached`);
    }
    const end = delimited ? reader.len : reader.pos + lengthOrDelimitedFieldNo;
    let fieldNo;
    let wireType;
    const unknownFields = (_a = message.getUnknown()) !== null && _a !== void 0 ? _a : [];
    while (reader.pos < end) {
      [fieldNo, wireType] = reader.tag();
      if (delimited && wireType == WireType.EndGroup) {
        break;
      }
      const field = message.findNumber(fieldNo);
      if (!field) {
        const recursionLimit = ctx.recursionLimit - ctx.depth;
        const data = reader.skip(wireType, fieldNo, recursionLimit);
        if (ctx.readUnknownFields) {
          unknownFields.push({ no: fieldNo, wireType, data });
        }
        continue;
      }
      readField$1(message, reader, field, wireType, ctx);
    }
    if (delimited) {
      if (wireType != WireType.EndGroup || fieldNo !== lengthOrDelimitedFieldNo) {
        throw new Error("invalid end group tag");
      }
    }
    if (unknownFields.length > 0) {
      message.setUnknown(unknownFields);
    }
    ctx.depth--;
  }
  function readField$1(message, reader, field, wireType, ctx) {
    var _a;
    switch (field.fieldKind) {
      case "scalar":
        message.set(field, readScalar(reader, field.scalar, field.utf8Validation));
        break;
      case "enum":
        const val = readScalar(reader, ScalarType.INT32);
        if (field.enum.open) {
          message.set(field, val);
        } else {
          const ok = field.enum.values.some((v) => v.number === val);
          if (ok) {
            message.set(field, val);
          } else if (ctx.readUnknownFields) {
            const bytes = [];
            varint32write(val, bytes);
            const unknownFields = (_a = message.getUnknown()) !== null && _a !== void 0 ? _a : [];
            unknownFields.push({
              no: field.number,
              wireType,
              data: new Uint8Array(bytes)
            });
            message.setUnknown(unknownFields);
          }
        }
        break;
      case "message":
        message.set(field, readMessageField$1(reader, ctx, field, message.get(field)));
        break;
      case "list":
        readListField$1(reader, wireType, message.get(field), ctx);
        break;
      case "map":
        readMapEntry(reader, message.get(field), ctx);
        break;
    }
  }
  function readMapEntry(reader, map, ctx) {
    const field = map.field();
    let key;
    let val;
    const len = reader.uint32();
    const end = reader.pos + len;
    while (reader.pos < end) {
      const [fieldNo] = reader.tag();
      switch (fieldNo) {
        case 1:
          key = readScalar(reader, field.mapKey, field.utf8Validation);
          break;
        case 2:
          switch (field.mapKind) {
            case "scalar":
              val = readScalar(reader, field.scalar, field.utf8Validation);
              break;
            case "enum":
              val = reader.int32();
              break;
            case "message":
              val = readMessageField$1(reader, ctx, field);
              break;
          }
          break;
      }
    }
    if (key === void 0) {
      key = scalarZeroValue(field.mapKey, false);
    }
    if (val === void 0) {
      switch (field.mapKind) {
        case "scalar":
          val = scalarZeroValue(field.scalar, false);
          break;
        case "enum":
          val = field.enum.values[0].number;
          break;
        case "message":
          val = reflect(field.message, void 0, false);
          break;
      }
    }
    map.set(key, val);
  }
  function readListField$1(reader, wireType, list, ctx) {
    var _a;
    const field = list.field();
    if (field.listKind === "message") {
      list.add(readMessageField$1(reader, ctx, field));
      return;
    }
    const scalarType = (_a = field.scalar) !== null && _a !== void 0 ? _a : ScalarType.INT32;
    const packed = wireType == WireType.LengthDelimited && scalarType != ScalarType.STRING && scalarType != ScalarType.BYTES;
    if (!packed) {
      list.add(readScalar(reader, scalarType, field.utf8Validation));
      return;
    }
    const e = reader.uint32() + reader.pos;
    while (reader.pos < e) {
      list.add(readScalar(reader, scalarType, field.utf8Validation));
    }
  }
  function readMessageField$1(reader, ctx, field, mergeMessage) {
    const delimited = field.delimitedEncoding;
    const message = mergeMessage !== null && mergeMessage !== void 0 ? mergeMessage : reflect(field.message, void 0, false);
    readMessage$1(message, reader, ctx, delimited, delimited ? field.number : reader.uint32());
    return message;
  }
  function readScalar(reader, type, validateUtf8 = false) {
    switch (type) {
      case ScalarType.STRING:
        return reader.string(validateUtf8);
      case ScalarType.BOOL:
        return reader.bool();
      case ScalarType.DOUBLE:
        return reader.double();
      case ScalarType.FLOAT:
        return reader.float();
      case ScalarType.INT32:
        return reader.int32();
      case ScalarType.INT64:
        return reader.int64();
      case ScalarType.UINT64:
        return reader.uint64();
      case ScalarType.FIXED64:
        return reader.fixed64();
      case ScalarType.BYTES:
        return reader.bytes();
      case ScalarType.FIXED32:
        return reader.fixed32();
      case ScalarType.SFIXED32:
        return reader.sfixed32();
      case ScalarType.SFIXED64:
        return reader.sfixed64();
      case ScalarType.SINT64:
        return reader.sint64();
      case ScalarType.UINT32:
        return reader.uint32();
      case ScalarType.SINT32:
        return reader.sint32();
    }
  }
  function fileDesc(b64, imports) {
    var _a;
    const root = fromBinary(FileDescriptorProtoSchema, base64Decode(b64));
    root.messageType.forEach(restoreJsonNames);
    root.dependency = (_a = imports === null || imports === void 0 ? void 0 : imports.map((f) => f.proto.name)) !== null && _a !== void 0 ? _a : [];
    const reg = createFileRegistry(root, (protoFileName) => imports === null || imports === void 0 ? void 0 : imports.find((f) => f.proto.name === protoFileName));
    return reg.getFile(root.name);
  }
  const file_google_protobuf_timestamp = fileDesc("Ch9nb29nbGUvcHJvdG9idWYvdGltZXN0YW1wLnByb3RvEg9nb29nbGUucHJvdG9idWYiKwoJVGltZXN0YW1wEg8KB3NlY29uZHMYASABKAMSDQoFbmFub3MYAiABKAVChQEKE2NvbS5nb29nbGUucHJvdG9idWZCDlRpbWVzdGFtcFByb3RvUAFaMmdvb2dsZS5nb2xhbmcub3JnL3Byb3RvYnVmL3R5cGVzL2tub3duL3RpbWVzdGFtcHBi+AEBogIDR1BCqgIeR29vZ2xlLlByb3RvYnVmLldlbGxLbm93blR5cGVzYgZwcm90bzM");
  const file_google_protobuf_any = fileDesc("Chlnb29nbGUvcHJvdG9idWYvYW55LnByb3RvEg9nb29nbGUucHJvdG9idWYiJgoDQW55EhAKCHR5cGVfdXJsGAEgASgJEg0KBXZhbHVlGAIgASgMQnYKE2NvbS5nb29nbGUucHJvdG9idWZCCEFueVByb3RvUAFaLGdvb2dsZS5nb2xhbmcub3JnL3Byb3RvYnVmL3R5cGVzL2tub3duL2FueXBiogIDR1BCqgIeR29vZ2xlLlByb3RvYnVmLldlbGxLbm93blR5cGVzYgZwcm90bzM");
  const AnySchema = messageDesc(file_google_protobuf_any, 0);
  const LEGACY_REQUIRED$1 = 3;
  const writeDefaults = {
    writeUnknownFields: true
  };
  function makeWriteOptions$1(options) {
    return options ? Object.assign(Object.assign({}, writeDefaults), options) : writeDefaults;
  }
  function toBinary(schema, message, options) {
    return writeFields(new BinaryWriter(), makeWriteOptions$1(options), reflect(schema, message)).finish();
  }
  function writeFields(writer, opts, msg) {
    var _a;
    for (const f of msg.sortedFields) {
      if (!msg.isSet(f)) {
        if (f.presence == LEGACY_REQUIRED$1) {
          throw new Error(`cannot encode ${f} to binary: required field not set`);
        }
        continue;
      }
      writeField(writer, opts, msg, f);
    }
    if (opts.writeUnknownFields) {
      for (const { no, wireType, data } of (_a = msg.getUnknown()) !== null && _a !== void 0 ? _a : []) {
        writer.tag(no, wireType).raw(data);
      }
    }
    return writer;
  }
  function writeField(writer, opts, msg, field) {
    var _a;
    switch (field.fieldKind) {
      case "scalar":
      case "enum":
        writeScalar(writer, msg.desc.typeName, field.name, (_a = field.scalar) !== null && _a !== void 0 ? _a : ScalarType.INT32, field.number, msg.get(field));
        break;
      case "list":
        writeListField(writer, opts, field, msg.get(field));
        break;
      case "message":
        writeMessageField(writer, opts, field, msg.get(field));
        break;
      case "map":
        for (const [key, val] of msg.get(field)) {
          writeMapEntry(writer, opts, field, key, val);
        }
        break;
    }
  }
  function writeScalar(writer, msgName, fieldName, scalarType, fieldNo, value) {
    writeScalarValue(writer.tag(fieldNo, writeTypeOfScalar(scalarType)), msgName, fieldName, scalarType, value);
  }
  function writeMessageField(writer, opts, field, message) {
    if (field.delimitedEncoding) {
      writeFields(writer.tag(field.number, WireType.StartGroup), opts, message).tag(field.number, WireType.EndGroup);
    } else {
      writeFields(writer.tag(field.number, WireType.LengthDelimited).fork(), opts, message).join();
    }
  }
  function writeListField(writer, opts, field, list) {
    var _a;
    if (field.listKind == "message") {
      for (const item of list) {
        writeMessageField(writer, opts, field, item);
      }
      return;
    }
    const scalarType = (_a = field.scalar) !== null && _a !== void 0 ? _a : ScalarType.INT32;
    if (field.packed) {
      if (!list.size) {
        return;
      }
      writer.tag(field.number, WireType.LengthDelimited).fork();
      for (const item of list) {
        writeScalarValue(writer, field.parent.typeName, field.name, scalarType, item);
      }
      writer.join();
      return;
    }
    for (const item of list) {
      writeScalar(writer, field.parent.typeName, field.name, scalarType, field.number, item);
    }
  }
  function writeMapEntry(writer, opts, field, key, value) {
    var _a;
    writer.tag(field.number, WireType.LengthDelimited).fork();
    writeScalar(writer, field.parent.typeName, field.name, field.mapKey, 1, key);
    switch (field.mapKind) {
      case "scalar":
      case "enum":
        writeScalar(writer, field.parent.typeName, field.name, (_a = field.scalar) !== null && _a !== void 0 ? _a : ScalarType.INT32, 2, value);
        break;
      case "message":
        writeFields(writer.tag(2, WireType.LengthDelimited).fork(), opts, value).join();
        break;
    }
    writer.join();
  }
  function writeScalarValue(writer, msgName, fieldName, type, value) {
    try {
      switch (type) {
        case ScalarType.STRING:
          writer.string(value);
          break;
        case ScalarType.BOOL:
          writer.bool(value);
          break;
        case ScalarType.DOUBLE:
          writer.double(value);
          break;
        case ScalarType.FLOAT:
          writer.float(value);
          break;
        case ScalarType.INT32:
          writer.int32(value);
          break;
        case ScalarType.INT64:
          writer.int64(value);
          break;
        case ScalarType.UINT64:
          writer.uint64(value);
          break;
        case ScalarType.FIXED64:
          writer.fixed64(value);
          break;
        case ScalarType.BYTES:
          writer.bytes(value);
          break;
        case ScalarType.FIXED32:
          writer.fixed32(value);
          break;
        case ScalarType.SFIXED32:
          writer.sfixed32(value);
          break;
        case ScalarType.SFIXED64:
          writer.sfixed64(value);
          break;
        case ScalarType.SINT64:
          writer.sint64(value);
          break;
        case ScalarType.UINT32:
          writer.uint32(value);
          break;
        case ScalarType.SINT32:
          writer.sint32(value);
          break;
      }
    } catch (e) {
      if (e instanceof Error) {
        throw new Error(`cannot encode field ${msgName}.${fieldName} to binary: ${e.message}`);
      }
      throw e;
    }
  }
  function writeTypeOfScalar(type) {
    switch (type) {
      case ScalarType.BYTES:
      case ScalarType.STRING:
        return WireType.LengthDelimited;
      case ScalarType.DOUBLE:
      case ScalarType.FIXED64:
      case ScalarType.SFIXED64:
        return WireType.Bit64;
      case ScalarType.FIXED32:
      case ScalarType.SFIXED32:
      case ScalarType.FLOAT:
        return WireType.Bit32;
      default:
        return WireType.Varint;
    }
  }
  function anyPack(schema, message, into) {
    let ret = false;
    if (!into) {
      into = create(AnySchema);
      ret = true;
    }
    into.value = toBinary(schema, message);
    into.typeUrl = typeNameToUrl(message.$typeName);
    return ret ? into : void 0;
  }
  function anyIs(any, descOrTypeName) {
    if (any.typeUrl === "") {
      return false;
    }
    const want = typeof descOrTypeName == "string" ? descOrTypeName : descOrTypeName.typeName;
    const got = typeUrlToName(any.typeUrl);
    return want === got;
  }
  function anyUnpack(any, registryOrMessageDesc) {
    if (any.typeUrl === "") {
      return void 0;
    }
    const desc = registryOrMessageDesc.kind == "message" ? registryOrMessageDesc : registryOrMessageDesc.getMessage(typeUrlToName(any.typeUrl));
    if (!desc || !anyIs(any, desc)) {
      return void 0;
    }
    return fromBinary(desc, any.value);
  }
  function typeNameToUrl(name) {
    return `type.googleapis.com/${name}`;
  }
  function typeUrlToName(url) {
    const slash = url.lastIndexOf("/");
    const name = slash >= 0 ? url.substring(slash + 1) : url;
    if (!name.length) {
      throw new Error(`invalid type url: ${url}`);
    }
    return name;
  }
  const file_google_protobuf_empty = fileDesc("Chtnb29nbGUvcHJvdG9idWYvZW1wdHkucHJvdG8SD2dvb2dsZS5wcm90b2J1ZiIHCgVFbXB0eUJ9ChNjb20uZ29vZ2xlLnByb3RvYnVmQgpFbXB0eVByb3RvUAFaLmdvb2dsZS5nb2xhbmcub3JnL3Byb3RvYnVmL3R5cGVzL2tub3duL2VtcHR5cGL4AQGiAgNHUEKqAh5Hb29nbGUuUHJvdG9idWYuV2VsbEtub3duVHlwZXNiBnByb3RvMw");
  const EmptySchema = messageDesc(file_google_protobuf_empty, 0);
  const file_google_protobuf_struct = fileDesc("Chxnb29nbGUvcHJvdG9idWYvc3RydWN0LnByb3RvEg9nb29nbGUucHJvdG9idWYihAEKBlN0cnVjdBIzCgZmaWVsZHMYASADKAsyIy5nb29nbGUucHJvdG9idWYuU3RydWN0LkZpZWxkc0VudHJ5GkUKC0ZpZWxkc0VudHJ5EgsKA2tleRgBIAEoCRIlCgV2YWx1ZRgCIAEoCzIWLmdvb2dsZS5wcm90b2J1Zi5WYWx1ZToCOAEi6gEKBVZhbHVlEjAKCm51bGxfdmFsdWUYASABKA4yGi5nb29nbGUucHJvdG9idWYuTnVsbFZhbHVlSAASFgoMbnVtYmVyX3ZhbHVlGAIgASgBSAASFgoMc3RyaW5nX3ZhbHVlGAMgASgJSAASFAoKYm9vbF92YWx1ZRgEIAEoCEgAEi8KDHN0cnVjdF92YWx1ZRgFIAEoCzIXLmdvb2dsZS5wcm90b2J1Zi5TdHJ1Y3RIABIwCgpsaXN0X3ZhbHVlGAYgASgLMhouZ29vZ2xlLnByb3RvYnVmLkxpc3RWYWx1ZUgAQgYKBGtpbmQiMwoJTGlzdFZhbHVlEiYKBnZhbHVlcxgBIAMoCzIWLmdvb2dsZS5wcm90b2J1Zi5WYWx1ZSobCglOdWxsVmFsdWUSDgoKTlVMTF9WQUxVRRAAQn8KE2NvbS5nb29nbGUucHJvdG9idWZCC1N0cnVjdFByb3RvUAFaL2dvb2dsZS5nb2xhbmcub3JnL3Byb3RvYnVmL3R5cGVzL2tub3duL3N0cnVjdHBi+AEBogIDR1BCqgIeR29vZ2xlLlByb3RvYnVmLldlbGxLbm93blR5cGVzYgZwcm90bzM");
  const StructSchema = messageDesc(file_google_protobuf_struct, 0);
  const ValueSchema = messageDesc(file_google_protobuf_struct, 1);
  const ListValueSchema = messageDesc(file_google_protobuf_struct, 2);
  var NullValue;
  (function(NullValue2) {
    NullValue2[NullValue2["NULL_VALUE"] = 0] = "NULL_VALUE";
  })(NullValue || (NullValue = {}));
  function getExtension(message, extension, options) {
    assertExtendee(extension, message);
    const ufs = filterUnknownFields(message.$unknown, extension);
    const [container2, field, get] = createExtensionContainer(extension);
    const ctx = makeReadContext$1(options);
    for (const uf of ufs) {
      readField$1(container2, new BinaryReader(uf.data), field, uf.wireType, ctx);
    }
    return get();
  }
  function setExtension(message, extension, value) {
    var _a;
    assertExtendee(extension, message);
    const ufs = ((_a = message.$unknown) !== null && _a !== void 0 ? _a : []).filter((uf) => uf.no !== extension.number);
    const [container2, field] = createExtensionContainer(extension, value);
    const writer = new BinaryWriter();
    writeField(writer, { writeUnknownFields: true }, container2, field);
    const reader = new BinaryReader(writer.finish());
    while (reader.pos < reader.len) {
      const [no, wireType] = reader.tag();
      const data = reader.skip(wireType, no);
      ufs.push({ no, wireType, data });
    }
    message.$unknown = ufs;
  }
  function filterUnknownFields(unknownFields, extension) {
    if (unknownFields === void 0)
      return [];
    if (extension.fieldKind === "enum" || extension.fieldKind === "scalar") {
      for (let i = unknownFields.length - 1; i >= 0; --i) {
        if (unknownFields[i].no == extension.number) {
          return [unknownFields[i]];
        }
      }
      return [];
    }
    return unknownFields.filter((uf) => uf.no === extension.number);
  }
  function createExtensionContainer(extension, value) {
    const localName = extension.typeName;
    const field = Object.assign(Object.assign({}, extension), { kind: "field", parent: extension.extendee, localName });
    const desc = Object.assign(Object.assign({}, extension.extendee), { fields: [field], members: [field], oneofs: [] });
    const container2 = create(desc, value !== void 0 ? { [localName]: value } : void 0);
    return [
      reflect(desc, container2),
      field,
      () => {
        const value2 = container2[localName];
        if (value2 === void 0) {
          const desc2 = extension.message;
          if (isWrapperDesc(desc2)) {
            return scalarZeroValue(desc2.fields[0].scalar, desc2.fields[0].longAsString);
          }
          return create(desc2);
        }
        return value2;
      }
    ];
  }
  function assertExtendee(extension, message) {
    if (extension.extendee.typeName != message.$typeName) {
      throw new Error(`extension ${extension.typeName} can only be applied to message ${extension.extendee.typeName}`);
    }
  }
  const LEGACY_REQUIRED = 3;
  const IMPLICIT = 2;
  const jsonWriteDefaults = {
    alwaysEmitImplicit: false,
    enumAsInteger: false,
    useProtoFieldName: false
  };
  function makeWriteOptions(options) {
    return options ? Object.assign(Object.assign({}, jsonWriteDefaults), options) : jsonWriteDefaults;
  }
  function toJson(schema, message, options) {
    return reflectToJson(reflect(schema, message), makeWriteOptions(options));
  }
  function toJsonString(schema, message, options) {
    var _a;
    const jsonValue = toJson(schema, message, options);
    return JSON.stringify(jsonValue, null, (_a = options === null || options === void 0 ? void 0 : options.prettySpaces) !== null && _a !== void 0 ? _a : 0);
  }
  function reflectToJson(msg, opts) {
    var _a;
    const wktJson = tryWktToJson(msg, opts);
    if (wktJson !== void 0)
      return wktJson;
    const json = {};
    for (const f of msg.sortedFields) {
      if (!msg.isSet(f)) {
        if (f.presence == LEGACY_REQUIRED) {
          throw new Error(`cannot encode ${f} to JSON: required field not set`);
        }
        if (!opts.alwaysEmitImplicit || f.presence !== IMPLICIT) {
          continue;
        }
      }
      const jsonValue = fieldToJson(f, msg.get(f), opts);
      if (jsonValue !== void 0) {
        json[jsonName(f, opts)] = jsonValue;
      }
    }
    if (opts.registry) {
      const tagSeen = new Set();
      for (const { no } of (_a = msg.getUnknown()) !== null && _a !== void 0 ? _a : []) {
        if (!tagSeen.has(no)) {
          tagSeen.add(no);
          const extension = opts.registry.getExtensionFor(msg.desc, no);
          if (!extension) {
            continue;
          }
          const value = getExtension(msg.message, extension);
          const [container2, field] = createExtensionContainer(extension, value);
          const jsonValue = fieldToJson(field, container2.get(field), opts);
          if (jsonValue !== void 0) {
            json[extension.jsonName] = jsonValue;
          }
        }
      }
    }
    return json;
  }
  function fieldToJson(f, val, opts) {
    switch (f.fieldKind) {
      case "scalar":
        return scalarToJson(f, val);
      case "message":
        return reflectToJson(val, opts);
      case "enum":
        return enumToJsonInternal(f.enum, val, opts.enumAsInteger);
      case "list":
        return listToJson(val, opts);
      case "map":
        return mapToJson(val, opts);
    }
  }
  function mapToJson(map, opts) {
    const f = map.field();
    const jsonObj = {};
    switch (f.mapKind) {
      case "scalar":
        for (const [entryKey, entryValue] of map) {
          jsonObj[entryKey] = scalarToJson(f, entryValue);
        }
        break;
      case "message":
        for (const [entryKey, entryValue] of map) {
          jsonObj[entryKey] = reflectToJson(entryValue, opts);
        }
        break;
      case "enum":
        for (const [entryKey, entryValue] of map) {
          jsonObj[entryKey] = enumToJsonInternal(f.enum, entryValue, opts.enumAsInteger);
        }
        break;
    }
    return opts.alwaysEmitImplicit || map.size > 0 ? jsonObj : void 0;
  }
  function listToJson(list, opts) {
    const f = list.field();
    const jsonArr = [];
    switch (f.listKind) {
      case "scalar":
        for (const item of list) {
          jsonArr.push(scalarToJson(f, item));
        }
        break;
      case "enum":
        for (const item of list) {
          jsonArr.push(enumToJsonInternal(f.enum, item, opts.enumAsInteger));
        }
        break;
      case "message":
        for (const item of list) {
          jsonArr.push(reflectToJson(item, opts));
        }
        break;
    }
    return opts.alwaysEmitImplicit || jsonArr.length > 0 ? jsonArr : void 0;
  }
  function enumToJsonInternal(desc, value, enumAsInteger) {
    var _a;
    if (typeof value != "number") {
      throw new Error(`cannot encode ${desc} to JSON: expected number, got ${formatVal(value)}`);
    }
    if (desc.typeName == "google.protobuf.NullValue") {
      return null;
    }
    if (enumAsInteger) {
      return value;
    }
    const val = desc.value[value];
    return (_a = val === null || val === void 0 ? void 0 : val.name) !== null && _a !== void 0 ? _a : value;
  }
  function scalarToJson(field, value) {
    var _a, _b, _c, _d, _e, _f;
    switch (field.scalar) {
case ScalarType.INT32:
      case ScalarType.SFIXED32:
      case ScalarType.SINT32:
      case ScalarType.FIXED32:
      case ScalarType.UINT32:
        if (typeof value != "number") {
          throw new Error(`cannot encode ${field} to JSON: ${(_a = checkField(field, value)) === null || _a === void 0 ? void 0 : _a.message}`);
        }
        return value;

case ScalarType.FLOAT:
      case ScalarType.DOUBLE:
        if (typeof value != "number") {
          throw new Error(`cannot encode ${field} to JSON: ${(_b = checkField(field, value)) === null || _b === void 0 ? void 0 : _b.message}`);
        }
        if (Number.isNaN(value))
          return "NaN";
        if (value === Number.POSITIVE_INFINITY)
          return "Infinity";
        if (value === Number.NEGATIVE_INFINITY)
          return "-Infinity";
        return value;
case ScalarType.STRING:
        if (typeof value != "string") {
          throw new Error(`cannot encode ${field} to JSON: ${(_c = checkField(field, value)) === null || _c === void 0 ? void 0 : _c.message}`);
        }
        return value;
case ScalarType.BOOL:
        if (typeof value != "boolean") {
          throw new Error(`cannot encode ${field} to JSON: ${(_d = checkField(field, value)) === null || _d === void 0 ? void 0 : _d.message}`);
        }
        return value;
case ScalarType.UINT64:
      case ScalarType.FIXED64:
      case ScalarType.INT64:
      case ScalarType.SFIXED64:
      case ScalarType.SINT64:
        if (typeof value == "bigint" || typeof value == "string" || typeof value == "number" && Number.isInteger(value)) {
          return value.toString();
        }
        throw new Error(`cannot encode ${field} to JSON: ${(_e = checkField(field, value)) === null || _e === void 0 ? void 0 : _e.message}`);

case ScalarType.BYTES:
        if (value instanceof Uint8Array) {
          return base64Encode(value);
        }
        throw new Error(`cannot encode ${field} to JSON: ${(_f = checkField(field, value)) === null || _f === void 0 ? void 0 : _f.message}`);
    }
  }
  function jsonName(f, opts) {
    return opts.useProtoFieldName ? f.name : f.jsonName;
  }
  function tryWktToJson(msg, opts) {
    if (!msg.desc.typeName.startsWith("google.protobuf.")) {
      return void 0;
    }
    switch (msg.desc.typeName) {
      case "google.protobuf.Any":
        return anyToJson(msg.message, opts);
      case "google.protobuf.Timestamp":
        return timestampToJson(msg.message);
      case "google.protobuf.Duration":
        return durationToJson(msg.message);
      case "google.protobuf.FieldMask":
        return fieldMaskToJson(msg.message);
      case "google.protobuf.Struct":
        return structToJson(msg.message);
      case "google.protobuf.Value":
        return valueToJson(msg.message);
      case "google.protobuf.ListValue":
        return listValueToJson(msg.message);
      default:
        if (isWrapperDesc(msg.desc)) {
          const valueField = msg.desc.fields[0];
          return scalarToJson(valueField, msg.get(valueField));
        }
        return void 0;
    }
  }
  function anyToJson(val, opts) {
    if (val.typeUrl === "") {
      return {};
    }
    const { registry } = opts;
    let message;
    let desc;
    if (registry) {
      message = anyUnpack(val, registry);
      if (message) {
        desc = registry.getMessage(message.$typeName);
      }
    }
    if (!desc || !message) {
      throw new Error(`cannot encode message ${val.$typeName} to JSON: "${val.typeUrl}" is not in the type registry`);
    }
    const reflected = reflect(desc, message);
    const json = hasCustomJsonRepresentation(desc) ? { value: tryWktToJson(reflected, opts) } : reflectToJson(reflected, opts);
    json["@type"] = val.typeUrl;
    return json;
  }
  function durationToJson(val) {
    const seconds = Number(val.seconds);
    const nanos = val.nanos;
    if (seconds > 315576e6 || seconds < -315576e6) {
      throw new Error(`cannot encode message ${val.$typeName} to JSON: value out of range`);
    }
    if (seconds > 0 && nanos < 0 || seconds < 0 && nanos > 0) {
      throw new Error(`cannot encode message ${val.$typeName} to JSON: nanos sign must match seconds sign`);
    }
    let text = val.seconds.toString();
    if (nanos !== 0) {
      let nanosStr = Math.abs(nanos).toString();
      nanosStr = "0".repeat(9 - nanosStr.length) + nanosStr;
      if (nanosStr.substring(3) === "000000") {
        nanosStr = nanosStr.substring(0, 3);
      } else if (nanosStr.substring(6) === "000") {
        nanosStr = nanosStr.substring(0, 6);
      }
      text += "." + nanosStr;
      if (nanos < 0 && seconds == 0) {
        text = "-" + text;
      }
    }
    return text + "s";
  }
  function fieldMaskToJson(val) {
    return val.paths.map((p) => {
      if (protoSnakeCase(protoCamelCase(p)) !== p) {
        throw new Error(`cannot encode message ${val.$typeName} to JSON: lowerCamelCase of path name "${p}" is irreversible`);
      }
      return protoCamelCase(p);
    }).join(",");
  }
  function structToJson(val) {
    const json = {};
    for (const [k, v] of Object.entries(val.fields)) {
      json[k] = valueToJson(v);
    }
    return json;
  }
  function valueToJson(val) {
    switch (val.kind.case) {
      case "nullValue":
        return null;
      case "numberValue":
        if (!Number.isFinite(val.kind.value)) {
          throw new Error(`${val.$typeName} cannot be NaN or Infinity`);
        }
        return val.kind.value;
      case "boolValue":
        return val.kind.value;
      case "stringValue":
        return val.kind.value;
      case "structValue":
        return structToJson(val.kind.value);
      case "listValue":
        return listValueToJson(val.kind.value);
      default:
        throw new Error(`${val.$typeName} must have a value`);
    }
  }
  function listValueToJson(val) {
    return val.values.map(valueToJson);
  }
  function timestampToJson(val) {
    const ms = Number(val.seconds) * 1e3;
    if (ms < Date.parse("0001-01-01T00:00:00Z") || ms > Date.parse("9999-12-31T23:59:59Z")) {
      throw new Error(`cannot encode message ${val.$typeName} to JSON: must be from 0001-01-01T00:00:00Z to 9999-12-31T23:59:59Z inclusive`);
    }
    if (val.nanos < 0) {
      throw new Error(`cannot encode message ${val.$typeName} to JSON: nanos must not be negative`);
    }
    if (val.nanos > 999999999) {
      throw new Error(`cannot encode message ${val.$typeName} to JSON: nanos must not be greater than 99999999`);
    }
    let z = "Z";
    if (val.nanos > 0) {
      const nanosStr = (val.nanos + 1e9).toString().substring(1);
      if (nanosStr.substring(3) === "000000") {
        z = "." + nanosStr.substring(0, 3) + "Z";
      } else if (nanosStr.substring(6) === "000") {
        z = "." + nanosStr.substring(0, 6) + "Z";
      } else {
        z = "." + nanosStr + "Z";
      }
    }
    return new Date(ms).toISOString().replace(".000Z", z);
  }
  function makeReadContext(options) {
    return Object.assign(Object.assign({ ignoreUnknownFields: false, recursionLimit: 100 }, options), { depth: 0 });
  }
  function fromJsonString(schema, json, options) {
    return fromJson(schema, parseJsonString(json, schema.typeName), options);
  }
  function fromJson(schema, json, options) {
    const msg = reflect(schema);
    try {
      readMessage(msg, json, makeReadContext(options));
    } catch (e) {
      if (isFieldError(e)) {
        throw new Error(`cannot decode ${e.field()} from JSON: ${e.message}`, {
          cause: e
        });
      }
      throw e;
    }
    return msg.message;
  }
  const messageJsonFields = new WeakMap();
  function getJsonField(desc, jsonKey) {
    var _a;
    if (!messageJsonFields.has(desc)) {
      const jsonNames = new Map();
      for (const field of desc.fields) {
        jsonNames.set(field.name, field).set(field.jsonName, field);
      }
      messageJsonFields.set(desc, jsonNames);
    }
    return (_a = messageJsonFields.get(desc)) === null || _a === void 0 ? void 0 : _a.get(jsonKey);
  }
  function readMessage(msg, json, ctx) {
    var _a;
    if (++ctx.depth > ctx.recursionLimit) {
      throw new Error(`cannot decode ${msg.desc} from JSON: maximum recursion depth of ${ctx.recursionLimit} reached`);
    }
    if (tryWktFromJson(msg, json, ctx)) {
      ctx.depth--;
      return;
    }
    if (json == null || Array.isArray(json) || typeof json != "object") {
      throw new Error(`cannot decode ${msg.desc} from JSON: ${formatVal(json)}`);
    }
    const oneofSeen = new Map();
    const fieldSeen = new Set();
    for (const [jsonKey, jsonValue] of Object.entries(json)) {
      const field = getJsonField(msg.desc, jsonKey);
      if (field) {
        if (fieldSeen.has(field)) {
          throw new FieldError(field, "set multiple times");
        }
        fieldSeen.add(field);
        if (field.oneof && jsonValue === null && field.fieldKind == "scalar") {
          continue;
        }
        if (field.oneof) {
          const seen2 = oneofSeen.get(field.oneof);
          if (seen2 !== void 0) {
            throw new FieldError(field.oneof, `oneof set multiple times by ${seen2.name} and ${field.name}`);
          }
          oneofSeen.set(field.oneof, field);
        }
        readField(msg, field, jsonValue, ctx);
      } else {
        let extension = void 0;
        if (jsonKey.startsWith("[") && jsonKey.endsWith("]") &&
(extension = (_a = ctx.registry) === null || _a === void 0 ? void 0 : _a.getExtension(jsonKey.substring(1, jsonKey.length - 1))) && extension.extendee.typeName === msg.desc.typeName) {
          const [container2, field2, get] = createExtensionContainer(extension);
          readField(container2, field2, jsonValue, ctx);
          setExtension(msg.message, extension, get());
        }
        if (!extension && !ctx.ignoreUnknownFields) {
          throw new Error(`cannot decode ${msg.desc} from JSON: key "${jsonKey}" is unknown`);
        }
      }
    }
    ctx.depth--;
  }
  function readField(msg, field, json, ctx) {
    switch (field.fieldKind) {
      case "scalar":
        readScalarField(msg, field, json);
        break;
      case "enum":
        readEnumField(msg, field, json, ctx);
        break;
      case "message":
        readMessageField(msg, field, json, ctx);
        break;
      case "list":
        readListField(msg.get(field), json, ctx);
        break;
      case "map":
        readMapField(msg.get(field), json, ctx);
        break;
    }
  }
  function readListOrMapItem(field, json, ctx) {
    if (field.scalar && json !== null) {
      return scalarFromJson(field, json);
    }
    if (field.message && !isResetSentinelNullValue(field, json)) {
      const msgValue = reflect(field.message);
      readMessage(msgValue, json, ctx);
      return msgValue;
    }
    if (field.enum && !isResetSentinelNullValue(field, json)) {
      return readEnum(field.enum, json, ctx.ignoreUnknownFields);
    }
    throw new FieldError(field, `${field.fieldKind === "list" ? "list item" : "map value"} must not be null`);
  }
  function readMapField(map, json, ctx) {
    if (json === null) {
      return;
    }
    const field = map.field();
    if (typeof json != "object" || Array.isArray(json)) {
      throw new FieldError(field, "expected object, got " + formatVal(json));
    }
    const seen2 = new Set();
    for (const [jsonMapKey, jsonMapValue] of Object.entries(json)) {
      const key = mapKeyFromJson(field.mapKey, jsonMapKey);
      if (seen2.has(key)) {
        throw new FieldError(field, `duplicate map key "${jsonMapKey}"`);
      }
      seen2.add(key);
      const value = readListOrMapItem(field, jsonMapValue, ctx);
      if (value !== tokenIgnoredUnknownEnum) {
        map.set(key, value);
      }
    }
  }
  function readListField(list, json, ctx) {
    if (json === null) {
      return;
    }
    const field = list.field();
    if (!Array.isArray(json)) {
      throw new FieldError(field, "expected Array, got " + formatVal(json));
    }
    for (const jsonItem of json) {
      const value = readListOrMapItem(field, jsonItem, ctx);
      if (value !== tokenIgnoredUnknownEnum) {
        list.add(value);
      }
    }
  }
  function readMessageField(msg, field, json, ctx) {
    if (isResetSentinelNullValue(field, json)) {
      msg.clear(field);
      return;
    }
    const msgValue = msg.isSet(field) ? msg.get(field) : reflect(field.message);
    readMessage(msgValue, json, ctx);
    msg.set(field, msgValue);
  }
  function readEnumField(msg, field, json, ctx) {
    if (isResetSentinelNullValue(field, json)) {
      msg.clear(field);
      return;
    }
    const enumValue = readEnum(field.enum, json, ctx.ignoreUnknownFields);
    if (enumValue !== tokenIgnoredUnknownEnum) {
      msg.set(field, enumValue);
    }
  }
  function readScalarField(msg, field, json) {
    if (json === null) {
      msg.clear(field);
    } else {
      msg.set(field, scalarFromJson(field, json));
    }
  }
  function isResetSentinelNullValue(field, json) {
    var _a, _b;
    return json === null && ((_a = field.message) === null || _a === void 0 ? void 0 : _a.typeName) != "google.protobuf.Value" && ((_b = field.enum) === null || _b === void 0 ? void 0 : _b.typeName) != "google.protobuf.NullValue";
  }
  const tokenIgnoredUnknownEnum = Symbol();
  function readEnum(desc, json, ignoreUnknownFields) {
    if (json === null) {
      return desc.values[0].number;
    }
    switch (typeof json) {
      case "number":
        if (Number.isInteger(json)) {
          return json;
        }
        break;
      case "string":
        const value = desc.values.find((ev) => ev.name === json);
        if (value !== void 0) {
          return value.number;
        }
        if (ignoreUnknownFields) {
          return tokenIgnoredUnknownEnum;
        }
        break;
    }
    throw new Error(`cannot decode ${desc} from JSON: ${formatVal(json)}`);
  }
  function scalarFromJson(field, json) {
    switch (field.scalar) {

case ScalarType.DOUBLE:
      case ScalarType.FLOAT:
        if (json === "NaN")
          return NaN;
        if (json === "Infinity")
          return Number.POSITIVE_INFINITY;
        if (json === "-Infinity")
          return Number.NEGATIVE_INFINITY;
        if (typeof json == "number") {
          if (Number.isNaN(json)) {
            throw new FieldError(field, "unexpected NaN number");
          }
          if (!Number.isFinite(json)) {
            throw new FieldError(field, "unexpected infinite number");
          }
          break;
        }
        if (typeof json == "string") {
          if (json === "") {
            break;
          }
          if (json.trim().length !== json.length) {
            break;
          }
          const float = Number(json);
          if (!Number.isFinite(float)) {
            break;
          }
          return float;
        }
        break;
case ScalarType.INT32:
      case ScalarType.FIXED32:
      case ScalarType.SFIXED32:
      case ScalarType.SINT32:
      case ScalarType.UINT32:
        return int32FromJson(json);

case ScalarType.BYTES:
        if (typeof json == "string") {
          if (json === "") {
            return new Uint8Array(0);
          }
          try {
            return base64Decode(json);
          } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            throw new FieldError(field, message);
          }
        }
        break;
    }
    return json;
  }
  function mapKeyFromJson(type, jsonString) {
    switch (type) {
      case ScalarType.BOOL:
        switch (jsonString) {
          case "true":
            return true;
          case "false":
            return false;
        }
        return jsonString;
      case ScalarType.INT32:
      case ScalarType.FIXED32:
      case ScalarType.UINT32:
      case ScalarType.SFIXED32:
      case ScalarType.SINT32:
        return int32FromJson(jsonString);
      case ScalarType.INT64:
      case ScalarType.SINT64:
      case ScalarType.SFIXED64:
      case ScalarType.UINT64:
      case ScalarType.FIXED64:
        return /^-?0+$/.test(jsonString) ? "0" : jsonString.replace(/^(-?)0+(?=\d)/, "$1");
      default:
        return jsonString;
    }
  }
  function int32FromJson(json) {
    if (typeof json == "string") {
      if (json === "") {
        return json;
      }
      if (json.trim().length !== json.length) {
        return json;
      }
      const num = Number(json);
      if (Number.isNaN(num)) {
        return json;
      }
      return num;
    }
    return json;
  }
  function parseJsonString(jsonString, typeName) {
    let json;
    try {
      json = JSON.parse(jsonString);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      throw new Error(
        `cannot decode message ${typeName} from JSON: ${message}`,
{ cause: e }
      );
    }
    checkDuplicateKeys(jsonString, typeName);
    return json;
  }
  function checkDuplicateKeys(jsonString, typeName) {
    const stack = [];
    let expectKey = false;
    let i = 0;
    while (i < jsonString.length) {
      switch (jsonString[i]) {
        case "{":
          stack.push( new Set());
          expectKey = true;
          i++;
          break;
        case "[":
          stack.push(null);
          expectKey = false;
          i++;
          break;
        case "}":
        case "]":
          stack.pop();
          expectKey = false;
          i++;
          break;
        case ",":
          expectKey = stack[stack.length - 1] != null;
          i++;
          break;
        case ":":
          expectKey = false;
          i++;
          break;
        case '"': {
          const open = i++;
          let escaped = false;
          while (i < jsonString.length) {
            if (jsonString[i] == "\\") {
              escaped = true;
              i += 2;
              continue;
            }
            if (jsonString[i] == '"') {
              break;
            }
            i++;
          }
          const close = i++;
          const seen2 = stack[stack.length - 1];
          if (expectKey && seen2) {
            const name = escaped ? JSON.parse(jsonString.substring(open, close + 1)) : jsonString.substring(open + 1, close);
            if (seen2.has(name)) {
              throw new Error(`cannot decode message ${typeName} from JSON: duplicate object key "${name}"`);
            }
            seen2.add(name);
          }
          expectKey = false;
          break;
        }
        default:
          i++;
          break;
      }
    }
  }
  function tryWktFromJson(msg, jsonValue, ctx) {
    if (!msg.desc.typeName.startsWith("google.protobuf.")) {
      return false;
    }
    switch (msg.desc.typeName) {
      case "google.protobuf.Any":
        anyFromJson(msg.message, jsonValue, ctx);
        return true;
      case "google.protobuf.Timestamp":
        timestampFromJson(msg.message, jsonValue);
        return true;
      case "google.protobuf.Duration":
        durationFromJson(msg.message, jsonValue);
        return true;
      case "google.protobuf.FieldMask":
        fieldMaskFromJson(msg.message, jsonValue);
        return true;
      case "google.protobuf.Struct":
        structFromJson(msg.message, jsonValue, ctx);
        return true;
      case "google.protobuf.Value":
        valueFromJson(msg.message, jsonValue, ctx);
        return true;
      case "google.protobuf.ListValue":
        listValueFromJson(msg.message, jsonValue, ctx);
        return true;
      default:
        if (isWrapperDesc(msg.desc)) {
          const valueField = msg.desc.fields[0];
          if (jsonValue === null) {
            msg.clear(valueField);
          } else {
            msg.set(valueField, scalarFromJson(valueField, jsonValue));
          }
          return true;
        }
        return false;
    }
  }
  function anyFromJson(any, json, ctx) {
    var _a;
    if (json === null || Array.isArray(json) || typeof json != "object") {
      throw new Error(`cannot decode message ${any.$typeName} from JSON: expected object but got ${formatVal(json)}`);
    }
    if (Object.keys(json).length == 0) {
      return;
    }
    const typeUrl = json["@type"];
    if (typeof typeUrl != "string" || typeUrl == "") {
      throw new Error(`cannot decode message ${any.$typeName} from JSON: "@type" is empty`);
    }
    const typeName = typeUrl.includes("/") ? typeUrl.substring(typeUrl.lastIndexOf("/") + 1) : typeUrl;
    if (!typeName.length) {
      throw new Error(`cannot decode message ${any.$typeName} from JSON: "@type" is invalid`);
    }
    const desc = (_a = ctx.registry) === null || _a === void 0 ? void 0 : _a.getMessage(typeName);
    if (!desc) {
      throw new Error(`cannot decode message ${any.$typeName} from JSON: ${typeUrl} is not in the type registry`);
    }
    const msg = reflect(desc);
    if (hasCustomJsonRepresentation(desc) && Object.prototype.hasOwnProperty.call(json, "value")) {
      const value = json.value;
      readMessage(msg, value, ctx);
    } else {
      const copy = Object.assign({}, json);
      delete copy["@type"];
      readMessage(msg, copy, ctx);
    }
    anyPack(msg.desc, msg.message, any);
  }
  function timestampFromJson(timestamp, json) {
    if (typeof json !== "string") {
      throw new Error(`cannot decode message ${timestamp.$typeName} from JSON: ${formatVal(json)}`);
    }
    const matches = json.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\.([0-9]{1,9}))?(?:Z|([+-][0-9][0-9]:[0-9][0-9]))$/);
    if (!matches) {
      throw new Error(`cannot decode message ${timestamp.$typeName} from JSON: invalid RFC 3339 string`);
    }
    const ms = Date.parse(
matches[1] + "-" + matches[2] + "-" + matches[3] + "T" + matches[4] + ":" + matches[5] + ":" + matches[6] + (matches[8] ? matches[8] : "Z")
    );
    if (Number.isNaN(ms)) {
      throw new Error(`cannot decode message ${timestamp.$typeName} from JSON: invalid RFC 3339 string`);
    }
    if (ms < Date.parse("0001-01-01T00:00:00Z") || ms > Date.parse("9999-12-31T23:59:59Z")) {
      throw new Error(`cannot decode message ${timestamp.$typeName} from JSON: must be from 0001-01-01T00:00:00Z to 9999-12-31T23:59:59Z inclusive`);
    }
    timestamp.seconds = protoInt64.parse(ms / 1e3);
    timestamp.nanos = 0;
    if (matches[7]) {
      timestamp.nanos = parseInt("1" + matches[7] + "0".repeat(9 - matches[7].length)) - 1e9;
    }
  }
  function durationFromJson(duration, json) {
    if (typeof json !== "string") {
      throw new Error(`cannot decode message ${duration.$typeName} from JSON: ${formatVal(json)}`);
    }
    const match = json.match(/^(-?[0-9]+)(?:\.([0-9]+))?s/);
    if (match === null) {
      throw new Error(`cannot decode message ${duration.$typeName} from JSON: ${formatVal(json)}`);
    }
    const longSeconds = Number(match[1]);
    if (longSeconds > 315576e6 || longSeconds < -315576e6) {
      throw new Error(`cannot decode message ${duration.$typeName} from JSON: ${formatVal(json)}`);
    }
    duration.seconds = protoInt64.parse(longSeconds);
    if (typeof match[2] !== "string") {
      return;
    }
    const nanosStr = match[2] + "0".repeat(9 - match[2].length);
    duration.nanos = parseInt(nanosStr);
    if (longSeconds < 0 || Object.is(longSeconds, -0)) {
      duration.nanos = -duration.nanos;
    }
  }
  function fieldMaskFromJson(fieldMask, json) {
    if (typeof json !== "string") {
      throw new Error(`cannot decode message ${fieldMask.$typeName} from JSON: ${formatVal(json)}`);
    }
    if (json === "") {
      return;
    }
    fieldMask.paths = json.split(",").map((path) => {
      if (path.includes("_")) {
        throw new Error(`cannot decode message ${fieldMask.$typeName} from JSON: path names must be lowerCamelCase`);
      }
      return protoSnakeCase(path);
    });
  }
  function structFromJson(struct, json, ctx) {
    if (typeof json != "object" || json == null || Array.isArray(json)) {
      throw new Error(`cannot decode message ${struct.$typeName} from JSON ${formatVal(json)}`);
    }
    for (const [k, v] of Object.entries(json)) {
      const parsedV = create(ValueSchema);
      valueFromJson(parsedV, v, ctx);
      struct.fields[k] = parsedV;
    }
  }
  function valueFromJson(value, json, ctx) {
    if (++ctx.depth > ctx.recursionLimit) {
      throw new Error(`cannot decode ${value.$typeName} from JSON: maximum recursion depth of ${ctx.recursionLimit} reached`);
    }
    switch (typeof json) {
      case "number":
        value.kind = { case: "numberValue", value: json };
        break;
      case "string":
        value.kind = { case: "stringValue", value: json };
        break;
      case "boolean":
        value.kind = { case: "boolValue", value: json };
        break;
      case "object":
        if (json === null) {
          value.kind = { case: "nullValue", value: NullValue.NULL_VALUE };
        } else if (Array.isArray(json)) {
          const listValue = create(ListValueSchema);
          listValueFromJson(listValue, json, ctx);
          value.kind = { case: "listValue", value: listValue };
        } else {
          const struct = create(StructSchema);
          structFromJson(struct, json, ctx);
          value.kind = { case: "structValue", value: struct };
        }
        break;
      default:
        throw new Error(`cannot decode message ${value.$typeName} from JSON ${formatVal(json)}`);
    }
    ctx.depth--;
    return value;
  }
  function listValueFromJson(listValue, json, ctx) {
    if (!Array.isArray(json)) {
      throw new Error(`cannot decode message ${listValue.$typeName} from JSON ${formatVal(json)}`);
    }
    for (const e of json) {
      const value = create(ValueSchema);
      valueFromJson(value, e, ctx);
      listValue.values.push(value);
    }
  }
  var Code;
  (function(Code2) {
    Code2[Code2["Canceled"] = 1] = "Canceled";
    Code2[Code2["Unknown"] = 2] = "Unknown";
    Code2[Code2["InvalidArgument"] = 3] = "InvalidArgument";
    Code2[Code2["DeadlineExceeded"] = 4] = "DeadlineExceeded";
    Code2[Code2["NotFound"] = 5] = "NotFound";
    Code2[Code2["AlreadyExists"] = 6] = "AlreadyExists";
    Code2[Code2["PermissionDenied"] = 7] = "PermissionDenied";
    Code2[Code2["ResourceExhausted"] = 8] = "ResourceExhausted";
    Code2[Code2["FailedPrecondition"] = 9] = "FailedPrecondition";
    Code2[Code2["Aborted"] = 10] = "Aborted";
    Code2[Code2["OutOfRange"] = 11] = "OutOfRange";
    Code2[Code2["Unimplemented"] = 12] = "Unimplemented";
    Code2[Code2["Internal"] = 13] = "Internal";
    Code2[Code2["Unavailable"] = 14] = "Unavailable";
    Code2[Code2["DataLoss"] = 15] = "DataLoss";
    Code2[Code2["Unauthenticated"] = 16] = "Unauthenticated";
  })(Code || (Code = {}));
  function codeToString(value) {
    const name = Code[value];
    if (typeof name != "string") {
      return value.toString();
    }
    return name[0].toLowerCase() + name.substring(1).replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
  }
  class ConnectError extends Error {
constructor(message, code = Code.Unknown, metadata, outgoingDetails, cause) {
      super(createMessage(message, code));
      this.name = "ConnectError";
      Object.setPrototypeOf(this, new.target.prototype);
      this.rawMessage = message;
      this.code = code;
      this.metadata = new Headers(metadata !== null && metadata !== void 0 ? metadata : {});
      this.details = outgoingDetails !== null && outgoingDetails !== void 0 ? outgoingDetails : [];
      this.cause = cause;
    }
static from(reason, code = Code.Unknown) {
      if (reason instanceof ConnectError) {
        return reason;
      }
      if (reason instanceof Error) {
        if (reason.name == "AbortError" || reason.name == "TimeoutError") {
          return new ConnectError(reason.message, Code.Canceled);
        }
        return new ConnectError(reason.message, code, void 0, void 0, reason);
      }
      return new ConnectError(String(reason), code, void 0, void 0, reason);
    }
    static [Symbol.hasInstance](v) {
      if (!(v instanceof Error)) {
        return false;
      }
      if (Object.getPrototypeOf(v) === ConnectError.prototype) {
        return true;
      }
      return v.name === "ConnectError" && "code" in v && typeof v.code === "number" && "metadata" in v && "details" in v && Array.isArray(v.details) && "rawMessage" in v && typeof v.rawMessage == "string" && "cause" in v;
    }
    findDetails(typeOrRegistry) {
      const registry = typeOrRegistry.kind === "message" ? {
        getMessage: (typeName) => typeName === typeOrRegistry.typeName ? typeOrRegistry : void 0
      } : typeOrRegistry;
      const details = [];
      for (const data of this.details) {
        if ("desc" in data) {
          if (registry.getMessage(data.desc.typeName)) {
            details.push(create(data.desc, data.value));
          }
          continue;
        }
        const desc = registry.getMessage(data.type);
        if (desc) {
          try {
            details.push(fromBinary(desc, data.value));
          } catch (_) {
          }
        }
      }
      return details;
    }
  }
  function createMessage(message, code) {
    return message.length ? `[${codeToString(code)}] ${message}` : `[${codeToString(code)}]`;
  }
  function decodeBinaryHeader(value, desc, options) {
    try {
      const bytes = base64Decode(value);
      if (desc) {
        return fromBinary(desc, bytes, options);
      }
      return bytes;
    } catch (e) {
      throw ConnectError.from(e, Code.DataLoss);
    }
  }
  function makeAnyClient(service, createMethod) {
    const client = {};
    for (const desc of service.methods) {
      const method = createMethod(desc);
      if (method != null) {
        client[desc.localName] = method;
      }
    }
    return client;
  }
  const compressedFlag = 1;
  function assertReadMaxBytes(readMaxBytes, bytesRead, totalSizeKnown = false) {
    if (bytesRead > readMaxBytes) {
      let message = `message size is larger than configured readMaxBytes ${readMaxBytes}`;
      if (totalSizeKnown) {
        message = `message size ${bytesRead} is larger than configured readMaxBytes ${readMaxBytes}`;
      }
      throw new ConnectError(message, Code.ResourceExhausted);
    }
  }
  function createEnvelopeDecoder(readMaxBytes) {
    return new EnvelopeDecoderImpl(readMaxBytes);
  }
  class EnvelopeDecoderImpl {
    constructor(readMaxBytes) {
      this.readMaxBytes = readMaxBytes;
      this.header = new Uint8Array(5);
      this.headerView = new DataView(this.header.buffer);
      this.buf = [];
    }
    get byteLength() {
      return this.buf.reduce((a, b) => a + b.byteLength, 0);
    }
    decode(chunk) {
      this.buf.push(chunk);
      const envs = [];
      for (; ; ) {
        let env = this.pop();
        if (!env) {
          break;
        }
        envs.push(env);
      }
      return envs;
    }
pop() {
      if (!this.env) {
        this.env = this.head();
        if (!this.env) {
          return void 0;
        }
      }
      if (this.cons(this.env.data)) {
        const env = this.env;
        this.env = void 0;
        return env;
      }
      return void 0;
    }
head() {
      if (!this.cons(this.header)) {
        return void 0;
      }
      const flags = this.headerView.getUint8(0);
      const length = this.headerView.getUint32(1);
      assertReadMaxBytes(this.readMaxBytes, length, true);
      return {
        flags,
        data: new Uint8Array(length)
      };
    }
cons(target) {
      const wantLength = target.byteLength;
      if (this.byteLength < wantLength) {
        return false;
      }
      let offset = 0;
      while (offset < wantLength) {
        const chunk = this.buf.shift();
        if (chunk.byteLength > wantLength - offset) {
          target.set(chunk.subarray(0, wantLength - offset), offset);
          this.buf.unshift(chunk.subarray(wantLength - offset));
          offset += wantLength - offset;
        } else {
          target.set(chunk, offset);
          offset += chunk.byteLength;
        }
      }
      return true;
    }
  }
  function createEnvelopeReadableStream(stream) {
    let reader;
    const buffer = createEnvelopeDecoder(4294967295);
    return new ReadableStream({
      start() {
        reader = stream.getReader();
      },
      async pull(controller) {
        let enqueuedOnce = false;
        while (!enqueuedOnce) {
          const result = await reader.read();
          if (result.done) {
            if (buffer.byteLength > 0) {
              controller.error(new ConnectError("protocol error: incomplete envelope", Code.InvalidArgument));
            }
            controller.close();
          } else {
            for (const env of buffer.decode(result.value)) {
              controller.enqueue(env);
              enqueuedOnce = true;
            }
          }
        }
      }
    });
  }
  function encodeEnvelope(flags, data) {
    const bytes = new Uint8Array(data.length + 5);
    bytes.set(data, 5);
    const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    v.setUint8(0, flags);
    v.setUint32(1, data.length);
    return bytes;
  }
  var __asyncValues$1 = function(o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
      return this;
    }, i);
    function verb(n) {
      i[n] = o[n] && function(v) {
        return new Promise(function(resolve, reject) {
          v = o[n](v), settle(resolve, reject, v.done, v.value);
        });
      };
    }
    function settle(resolve, reject, d, v) {
      Promise.resolve(v).then(function(v2) {
        resolve({ value: v2, done: d });
      }, reject);
    }
  };
  var __await$2 = function(v) {
    return this instanceof __await$2 ? (this.v = v, this) : new __await$2(v);
  };
  var __asyncGenerator$2 = function(thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function() {
      return this;
    }, i;
    function awaitReturn(f) {
      return function(v) {
        return Promise.resolve(v).then(f, reject);
      };
    }
    function verb(n, f) {
      if (g[n]) {
        i[n] = function(v) {
          return new Promise(function(a, b) {
            q.push([n, v, a, b]) > 1 || resume(n, v);
          });
        };
        if (f) i[n] = f(i[n]);
      }
    }
    function resume(n, v) {
      try {
        step(g[n](v));
      } catch (e) {
        settle(q[0][3], e);
      }
    }
    function step(r) {
      r.value instanceof __await$2 ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
    }
    function fulfill(value) {
      resume("next", value);
    }
    function reject(value) {
      resume("throw", value);
    }
    function settle(f, v) {
      if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]);
    }
  };
  var __asyncDelegator$1 = function(o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function(e) {
      throw e;
    }), verb("return"), i[Symbol.iterator] = function() {
      return this;
    }, i;
    function verb(n, f) {
      i[n] = o[n] ? function(v) {
        return (p = !p) ? { value: __await$2(o[n](v)), done: false } : f ? f(v) : v;
      } : f;
    }
  };
  function createAsyncIterable(items) {
    return __asyncGenerator$2(this, arguments, function* createAsyncIterable_1() {
      yield __await$2(yield* __asyncDelegator$1(__asyncValues$1(items)));
    });
  }
  var __asyncValues = function(o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
      return this;
    }, i);
    function verb(n) {
      i[n] = o[n] && function(v) {
        return new Promise(function(resolve, reject) {
          v = o[n](v), settle(resolve, reject, v.done, v.value);
        });
      };
    }
    function settle(resolve, reject, d, v) {
      Promise.resolve(v).then(function(v2) {
        resolve({ value: v2, done: d });
      }, reject);
    }
  };
  var __await$1 = function(v) {
    return this instanceof __await$1 ? (this.v = v, this) : new __await$1(v);
  };
  var __asyncDelegator = function(o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function(e) {
      throw e;
    }), verb("return"), i[Symbol.iterator] = function() {
      return this;
    }, i;
    function verb(n, f) {
      i[n] = o[n] ? function(v) {
        return (p = !p) ? { value: __await$1(o[n](v)), done: false } : f ? f(v) : v;
      } : f;
    }
  };
  var __asyncGenerator$1 = function(thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function() {
      return this;
    }, i;
    function awaitReturn(f) {
      return function(v) {
        return Promise.resolve(v).then(f, reject);
      };
    }
    function verb(n, f) {
      if (g[n]) {
        i[n] = function(v) {
          return new Promise(function(a, b) {
            q.push([n, v, a, b]) > 1 || resume(n, v);
          });
        };
        if (f) i[n] = f(i[n]);
      }
    }
    function resume(n, v) {
      try {
        step(g[n](v));
      } catch (e) {
        settle(q[0][3], e);
      }
    }
    function step(r) {
      r.value instanceof __await$1 ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
    }
    function fulfill(value) {
      resume("next", value);
    }
    function reject(value) {
      resume("throw", value);
    }
    function settle(f, v) {
      if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]);
    }
  };
  function createClient(service, transport) {
    return makeAnyClient(service, (method) => {
      switch (method.methodKind) {
        case "unary":
          return createUnaryFn(transport, method);
        case "server_streaming":
          return createServerStreamingFn(transport, method);
        case "client_streaming":
          return createClientStreamingFn(transport, method);
        case "bidi_streaming":
          return createBiDiStreamingFn(transport, method);
        default:
          return null;
      }
    });
  }
  function createUnaryFn(transport, method) {
    return async (input, options) => {
      var _a, _b;
      const response = await transport.unary(method, options === null || options === void 0 ? void 0 : options.signal, options === null || options === void 0 ? void 0 : options.timeoutMs, options === null || options === void 0 ? void 0 : options.headers, input, options === null || options === void 0 ? void 0 : options.contextValues);
      (_a = options === null || options === void 0 ? void 0 : options.onHeader) === null || _a === void 0 ? void 0 : _a.call(options, response.header);
      (_b = options === null || options === void 0 ? void 0 : options.onTrailer) === null || _b === void 0 ? void 0 : _b.call(options, response.trailer);
      return response.message;
    };
  }
  function createServerStreamingFn(transport, method) {
    return (input, options) => handleStreamResponse(transport.stream(method, options === null || options === void 0 ? void 0 : options.signal, options === null || options === void 0 ? void 0 : options.timeoutMs, options === null || options === void 0 ? void 0 : options.headers, createAsyncIterable([input]), options === null || options === void 0 ? void 0 : options.contextValues), options);
  }
  function createClientStreamingFn(transport, method) {
    return async (request, options) => {
      var _a, e_1, _b, _c;
      var _d, _e;
      const response = await transport.stream(method, options === null || options === void 0 ? void 0 : options.signal, options === null || options === void 0 ? void 0 : options.timeoutMs, options === null || options === void 0 ? void 0 : options.headers, request, options === null || options === void 0 ? void 0 : options.contextValues);
      (_d = options === null || options === void 0 ? void 0 : options.onHeader) === null || _d === void 0 ? void 0 : _d.call(options, response.header);
      let singleMessage;
      let count = 0;
      try {
        for (var _f = true, _g = __asyncValues(response.message), _h; _h = await _g.next(), _a = _h.done, !_a; _f = true) {
          _c = _h.value;
          _f = false;
          const message = _c;
          singleMessage = message;
          count++;
        }
      } catch (e_1_1) {
        e_1 = { error: e_1_1 };
      } finally {
        try {
          if (!_f && !_a && (_b = _g.return)) await _b.call(_g);
        } finally {
          if (e_1) throw e_1.error;
        }
      }
      if (!singleMessage) {
        throw new ConnectError("protocol error: missing response message", Code.Unimplemented);
      }
      if (count > 1) {
        throw new ConnectError("protocol error: received extra messages for client streaming method", Code.Unimplemented);
      }
      (_e = options === null || options === void 0 ? void 0 : options.onTrailer) === null || _e === void 0 ? void 0 : _e.call(options, response.trailer);
      return singleMessage;
    };
  }
  function createBiDiStreamingFn(transport, method) {
    return (request, options) => handleStreamResponse(transport.stream(method, options === null || options === void 0 ? void 0 : options.signal, options === null || options === void 0 ? void 0 : options.timeoutMs, options === null || options === void 0 ? void 0 : options.headers, request, options === null || options === void 0 ? void 0 : options.contextValues), options);
  }
  function handleStreamResponse(stream, options) {
    const it = (function() {
      return __asyncGenerator$1(this, arguments, function* () {
        var _a, _b;
        const response = yield __await$1(stream);
        (_a = options === null || options === void 0 ? void 0 : options.onHeader) === null || _a === void 0 ? void 0 : _a.call(options, response.header);
        yield __await$1(yield* __asyncDelegator(__asyncValues(response.message)));
        (_b = options === null || options === void 0 ? void 0 : options.onTrailer) === null || _b === void 0 ? void 0 : _b.call(options, response.trailer);
      });
    })()[Symbol.asyncIterator]();
    return {
      [Symbol.asyncIterator]: () => ({
        next: () => it.next()
      })
    };
  }
  function createLinkedAbortController(...signals) {
    const controller = new AbortController();
    const sa = signals.filter((s) => s !== void 0).concat(controller.signal);
    for (const signal of sa) {
      if (signal.aborted) {
        onAbort.apply(signal);
        break;
      }
      signal.addEventListener("abort", onAbort);
    }
    function onAbort() {
      if (!controller.signal.aborted) {
        controller.abort(getAbortSignalReason(this));
      }
      for (const signal of sa) {
        signal.removeEventListener("abort", onAbort);
      }
    }
    return controller;
  }
  function createDeadlineSignal(timeoutMs) {
    const controller = new AbortController();
    const listener = () => {
      controller.abort(new ConnectError("the operation timed out", Code.DeadlineExceeded));
    };
    let timeoutId;
    if (timeoutMs !== void 0) {
      if (timeoutMs <= 0)
        listener();
      else
        timeoutId = setTimeout(listener, timeoutMs);
    }
    return {
      signal: controller.signal,
      cleanup: () => clearTimeout(timeoutId)
    };
  }
  function getAbortSignalReason(signal) {
    if (!signal.aborted) {
      return void 0;
    }
    if (signal.reason !== void 0) {
      return signal.reason;
    }
    const e = new Error("This operation was aborted");
    e.name = "AbortError";
    return e;
  }
  function createContextValues() {
    return {
      get(key) {
        return key.id in this ? this[key.id] : key.defaultValue;
      },
      set(key, value) {
        this[key.id] = value;
        return this;
      },
      delete(key) {
        delete this[key.id];
        return this;
      }
    };
  }
  const trailerFlag = 128;
  function trailerParse(data) {
    const headers = new Headers();
    const lines = new TextDecoder().decode(data).split("\r\n");
    for (const line of lines) {
      if (line === "") {
        continue;
      }
      const i = line.indexOf(":");
      if (i > 0) {
        const name = line.substring(0, i).trim();
        const value = line.substring(i + 1).trim();
        headers.append(name, value);
      }
    }
    return headers;
  }
  const headerContentType = "Content-Type";
  const headerTimeout = "Grpc-Timeout";
  const headerGrpcStatus = "Grpc-Status";
  const headerGrpcMessage = "Grpc-Message";
  const headerStatusDetailsBin = "Grpc-Status-Details-Bin";
  const headerUserAgent = "User-Agent";
  const headerXUserAgent = "X-User-Agent";
  const headerXGrpcWeb = "X-Grpc-Web";
  const contentTypeProto = "application/grpc-web+proto";
  const contentTypeJson = "application/grpc-web+json";
  function serviceDesc(file, path, ...paths) {
    if (paths.length > 0) {
      throw new Error();
    }
    return file.services[path];
  }
  const file_status = fileDesc("CgxzdGF0dXMucHJvdG8SCmdvb2dsZS5ycGMiTgoGU3RhdHVzEgwKBGNvZGUYASABKAUSDwoHbWVzc2FnZRgCIAEoCRIlCgdkZXRhaWxzGAMgAygLMhQuZ29vZ2xlLnByb3RvYnVmLkFueUJeCg5jb20uZ29vZ2xlLnJwY0ILU3RhdHVzUHJvdG9QAVo3Z29vZ2xlLmdvbGFuZy5vcmcvZ2VucHJvdG8vZ29vZ2xlYXBpcy9ycGMvc3RhdHVzO3N0YXR1c6ICA1JQQ2IGcHJvdG8z", [file_google_protobuf_any]);
  const StatusSchema = messageDesc(file_status, 0);
  const grpcStatusOk = "0";
  function findTrailerError(headerOrTrailer) {
    var _a;
    const statusBytes = headerOrTrailer.get(headerStatusDetailsBin);
    if (statusBytes != null) {
      const status = decodeBinaryHeader(statusBytes, StatusSchema);
      if (status.code == 0) {
        return void 0;
      }
      const error = new ConnectError(status.message, status.code, headerOrTrailer);
      error.details = status.details.map((any) => ({
        type: any.typeUrl.substring(any.typeUrl.lastIndexOf("/") + 1),
        value: any.value
      }));
      return error;
    }
    const grpcStatus = headerOrTrailer.get(headerGrpcStatus);
    if (grpcStatus != null) {
      if (grpcStatus === grpcStatusOk) {
        return void 0;
      }
      const code = parseInt(grpcStatus, 10);
      if (code in Code) {
        return new ConnectError(decodeURIComponent((_a = headerOrTrailer.get(headerGrpcMessage)) !== null && _a !== void 0 ? _a : ""), code, headerOrTrailer);
      }
      return new ConnectError(`invalid grpc-status: ${grpcStatus}`, Code.Internal, headerOrTrailer);
    }
    return void 0;
  }
  function createMethodUrl(baseUrl, method) {
    return baseUrl.toString().replace(/\/?$/, `/${method.parent.typeName}/${method.name}`);
  }
  function normalize(desc, message) {
    return create(desc, message);
  }
  function normalizeIterable(desc, input) {
    function transform(result) {
      if (result.done === true) {
        return result;
      }
      return {
        done: result.done,
        value: normalize(desc, result.value)
      };
    }
    return {
      [Symbol.asyncIterator]() {
        const it = input[Symbol.asyncIterator]();
        const res = {
          next: () => it.next().then(transform)
        };
        if (it.throw !== void 0) {
          res.throw = (e) => it.throw(e).then(transform);
        }
        if (it.return !== void 0) {
          res.return = (v) => it.return(v).then(transform);
        }
        return res;
      }
    };
  }
  function applyInterceptors(next, interceptors) {
    if (!interceptors) {
      return next;
    }
    for (const i of interceptors.concat().reverse()) {
      next = i(next);
    }
    return next;
  }
  function getJsonOptions(options) {
    var _a;
    const o = Object.assign({}, options);
    (_a = o.ignoreUnknownFields) !== null && _a !== void 0 ? _a : o.ignoreUnknownFields = true;
    return o;
  }
  function createClientMethodSerializers(method, useBinaryFormat, jsonOptions, binaryOptions) {
    const input = useBinaryFormat ? createBinarySerialization(method.input, binaryOptions) : createJsonSerialization(method.input, jsonOptions);
    const output = useBinaryFormat ? createBinarySerialization(method.output, binaryOptions) : createJsonSerialization(method.output, jsonOptions);
    return { parse: output.parse, serialize: input.serialize };
  }
  function createBinarySerialization(desc, options) {
    return {
      parse(data) {
        try {
          return fromBinary(desc, data, options);
        } catch (e) {
          const m = e instanceof Error ? e.message : String(e);
          throw new ConnectError(`parse binary: ${m}`, Code.Internal);
        }
      },
      serialize(data) {
        try {
          return toBinary(desc, data, options);
        } catch (e) {
          const m = e instanceof Error ? e.message : String(e);
          throw new ConnectError(`serialize binary: ${m}`, Code.Internal);
        }
      }
    };
  }
  function createJsonSerialization(desc, options) {
    var _a, _b;
    const textEncoder = (_a = options === null || options === void 0 ? void 0 : options.textEncoder) !== null && _a !== void 0 ? _a : new TextEncoder();
    const textDecoder = (_b = options === null || options === void 0 ? void 0 : options.textDecoder) !== null && _b !== void 0 ? _b : new TextDecoder();
    const o = getJsonOptions(options);
    return {
      parse(data) {
        try {
          const json = textDecoder.decode(data);
          return fromJsonString(desc, json, o);
        } catch (e) {
          throw ConnectError.from(e, Code.InvalidArgument);
        }
      },
      serialize(data) {
        try {
          const json = toJsonString(desc, data, o);
          return textEncoder.encode(json);
        } catch (e) {
          throw ConnectError.from(e, Code.Internal);
        }
      }
    };
  }
  function runUnaryCall(opt) {
    const next = applyInterceptors(opt.next, opt.interceptors);
    const [signal, abort, done] = setupSignal(opt);
    const req = Object.assign(Object.assign({}, opt.req), { message: normalize(opt.req.method.input, opt.req.message), signal });
    return next(req).then((res) => {
      done();
      return res;
    }, abort);
  }
  function runStreamingCall(opt) {
    const next = applyInterceptors(opt.next, opt.interceptors);
    const [signal, abort, done] = setupSignal(opt);
    const req = Object.assign(Object.assign({}, opt.req), { message: normalizeIterable(opt.req.method.input, opt.req.message), signal });
    let doneCalled = false;
    signal.addEventListener("abort", function() {
      var _a, _b;
      const it = opt.req.message[Symbol.asyncIterator]();
      if (!doneCalled) {
        (_a = it.throw) === null || _a === void 0 ? void 0 : _a.call(it, this.reason).catch(() => {
        });
      }
      (_b = it.return) === null || _b === void 0 ? void 0 : _b.call(it).catch(() => {
      });
    });
    return next(req).then((res) => {
      return Object.assign(Object.assign({}, res), { message: {
        [Symbol.asyncIterator]() {
          const it = res.message[Symbol.asyncIterator]();
          return {
            next() {
              return it.next().then((r) => {
                if (r.done == true) {
                  doneCalled = true;
                  done();
                }
                return r;
              }, abort);
            }
};
        }
      } });
    }, abort);
  }
  function setupSignal(opt) {
    const { signal, cleanup } = createDeadlineSignal(opt.timeoutMs);
    const controller = createLinkedAbortController(opt.signal, signal);
    return [
      controller.signal,
      function abort(reason) {
        const e = controller.signal.aborted ? ConnectError.from(getAbortSignalReason(controller.signal), Code.Canceled) : ConnectError.from(reason);
        controller.abort(e);
        cleanup();
        return Promise.reject(e);
      },
      function done() {
        cleanup();
        controller.abort();
      }
    ];
  }
  function assertFetchApi() {
    try {
      new Headers();
    } catch (_) {
      throw new Error("connect-web requires the fetch API. Are you running on an old version of Node.js? Node.js is not supported in Connect for Web - please stay tuned for Connect for Node.");
    }
  }
  function validateTrailer(trailer, header) {
    const err = findTrailerError(trailer);
    if (err) {
      header.forEach((value, key) => {
        err.metadata.append(key, value);
      });
      throw err;
    }
    if (!header.has(headerGrpcStatus) && !trailer.has(headerGrpcStatus)) {
      throw new ConnectError("protocol error: missing status", Code.Internal);
    }
  }
  function requestHeader(useBinaryFormat, timeoutMs, userProvidedHeaders, setUserAgent) {
    var _a, _b;
    const result = new Headers(userProvidedHeaders !== null && userProvidedHeaders !== void 0 ? userProvidedHeaders : {});
    result.set(headerContentType, useBinaryFormat ? contentTypeProto : contentTypeJson);
    result.set(headerXGrpcWeb, "1");
    const userAgent = (_b = (_a = result.get(headerUserAgent)) !== null && _a !== void 0 ? _a : result.get(headerXUserAgent)) !== null && _b !== void 0 ? _b : "connect-es/2.1.2";
    result.set(headerXUserAgent, userAgent);
    if (timeoutMs !== void 0) {
      result.set(headerTimeout, `${timeoutMs}m`);
    }
    return result;
  }
  function codeFromHttpStatus(httpStatus) {
    switch (httpStatus) {
      case 400:
        return Code.Internal;
      case 401:
        return Code.Unauthenticated;
      case 403:
        return Code.PermissionDenied;
      case 404:
        return Code.Unimplemented;
      case 429:
        return Code.Unavailable;
      case 502:
        return Code.Unavailable;
      case 503:
        return Code.Unavailable;
      case 504:
        return Code.Unavailable;
      default:
        return Code.Unknown;
    }
  }
  function validateResponse(status, headers) {
    var _a;
    if (status >= 200 && status < 300) {
      return {
        foundStatus: headers.has(headerGrpcStatus),
        headerError: findTrailerError(headers)
      };
    }
    throw new ConnectError(decodeURIComponent((_a = headers.get(headerGrpcMessage)) !== null && _a !== void 0 ? _a : `HTTP ${status}`), codeFromHttpStatus(status), headers);
  }
  var __await = function(v) {
    return this instanceof __await ? (this.v = v, this) : new __await(v);
  };
  var __asyncGenerator = function(thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function() {
      return this;
    }, i;
    function awaitReturn(f) {
      return function(v) {
        return Promise.resolve(v).then(f, reject);
      };
    }
    function verb(n, f) {
      if (g[n]) {
        i[n] = function(v) {
          return new Promise(function(a, b) {
            q.push([n, v, a, b]) > 1 || resume(n, v);
          });
        };
        if (f) i[n] = f(i[n]);
      }
    }
    function resume(n, v) {
      try {
        step(g[n](v));
      } catch (e) {
        settle(q[0][3], e);
      }
    }
    function step(r) {
      r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
    }
    function fulfill(value) {
      resume("next", value);
    }
    function reject(value) {
      resume("throw", value);
    }
    function settle(f, v) {
      if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]);
    }
  };
  const fetchOptions = {
    redirect: "error"
  };
  function createGrpcWebTransport(options) {
    var _a;
    assertFetchApi();
    const useBinaryFormat = (_a = options.useBinaryFormat) !== null && _a !== void 0 ? _a : true;
    return {
      async unary(method, signal, timeoutMs, header, message, contextValues) {
        const { serialize, parse } = createClientMethodSerializers(method, useBinaryFormat, options.jsonOptions, options.binaryOptions);
        timeoutMs = timeoutMs === void 0 ? options.defaultTimeoutMs : timeoutMs <= 0 ? void 0 : timeoutMs;
        return await runUnaryCall({
          interceptors: options.interceptors,
          signal,
          timeoutMs,
          req: {
            stream: false,
            service: method.parent,
            method,
            requestMethod: "POST",
            url: createMethodUrl(options.baseUrl, method),
            header: requestHeader(useBinaryFormat, timeoutMs, header),
            contextValues: contextValues !== null && contextValues !== void 0 ? contextValues : createContextValues(),
            message
          },
          next: async (req) => {
            var _a2;
            const fetch2 = (_a2 = options.fetch) !== null && _a2 !== void 0 ? _a2 : globalThis.fetch;
            const response = await fetch2(req.url, Object.assign(Object.assign({}, fetchOptions), { method: req.requestMethod, headers: req.header, signal: req.signal, body: encodeEnvelope(0, serialize(req.message)) }));
            const { headerError } = validateResponse(response.status, response.headers);
            if (!response.body) {
              if (headerError !== void 0)
                throw headerError;
              throw "missing response body";
            }
            const reader = createEnvelopeReadableStream(response.body).getReader();
            let trailer;
            let message2;
            for (; ; ) {
              const r = await reader.read();
              if (r.done) {
                break;
              }
              const { flags, data } = r.value;
              if ((flags & compressedFlag) === compressedFlag) {
                throw new ConnectError(`protocol error: received unsupported compressed output`, Code.Internal);
              }
              if (flags === trailerFlag) {
                if (trailer !== void 0) {
                  throw "extra trailer";
                }
                trailer = trailerParse(data);
                continue;
              }
              if (message2 !== void 0) {
                throw new ConnectError("extra message", Code.Unimplemented);
              }
              message2 = parse(data);
            }
            if (trailer === void 0) {
              if (headerError !== void 0)
                throw headerError;
              throw new ConnectError("missing trailer", response.headers.has(headerGrpcStatus) ? Code.Unimplemented : Code.Unknown);
            }
            validateTrailer(trailer, response.headers);
            if (message2 === void 0) {
              throw new ConnectError("missing message", trailer.has(headerGrpcStatus) ? Code.Unimplemented : Code.Unknown);
            }
            return {
              stream: false,
              service: method.parent,
              method,
              header: response.headers,
              message: message2,
              trailer
            };
          }
        });
      },
      async stream(method, signal, timeoutMs, header, input, contextValues) {
        const { serialize, parse } = createClientMethodSerializers(method, useBinaryFormat, options.jsonOptions, options.binaryOptions);
        function parseResponseBody(body, foundStatus, trailerTarget, header2, signal2) {
          return __asyncGenerator(this, arguments, function* parseResponseBody_1() {
            const reader = createEnvelopeReadableStream(body).getReader();
            if (foundStatus) {
              if (!(yield __await(reader.read())).done) {
                throw "extra data for trailers-only";
              }
              return yield __await(void 0);
            }
            let trailerReceived = false;
            for (; ; ) {
              const result = yield __await(reader.read());
              if (result.done) {
                break;
              }
              const { flags, data } = result.value;
              if ((flags & trailerFlag) === trailerFlag) {
                if (trailerReceived) {
                  throw "extra trailer";
                }
                trailerReceived = true;
                const trailer = trailerParse(data);
                validateTrailer(trailer, header2);
                trailer.forEach((value, key) => trailerTarget.set(key, value));
                continue;
              }
              if (trailerReceived) {
                throw "extra message";
              }
              yield yield __await(parse(data));
            }
            if ("throwIfAborted" in signal2) {
              signal2.throwIfAborted();
            }
            if (!trailerReceived) {
              throw "missing trailer";
            }
          });
        }
        async function createRequestBody(input2) {
          if (method.methodKind != "server_streaming") {
            throw "The fetch API does not support streaming request bodies";
          }
          const r = await input2[Symbol.asyncIterator]().next();
          if (r.done == true) {
            throw "missing request message";
          }
          return encodeEnvelope(0, serialize(r.value));
        }
        timeoutMs = timeoutMs === void 0 ? options.defaultTimeoutMs : timeoutMs <= 0 ? void 0 : timeoutMs;
        return runStreamingCall({
          interceptors: options.interceptors,
          signal,
          timeoutMs,
          req: {
            stream: true,
            service: method.parent,
            method,
            requestMethod: "POST",
            url: createMethodUrl(options.baseUrl, method),
            header: requestHeader(useBinaryFormat, timeoutMs, header),
            contextValues: contextValues !== null && contextValues !== void 0 ? contextValues : createContextValues(),
            message: input
          },
          next: async (req) => {
            var _a2;
            const fetch2 = (_a2 = options.fetch) !== null && _a2 !== void 0 ? _a2 : globalThis.fetch;
            const fRes = await fetch2(req.url, Object.assign(Object.assign({}, fetchOptions), { method: req.requestMethod, headers: req.header, signal: req.signal, body: await createRequestBody(req.message) }));
            const { foundStatus, headerError } = validateResponse(fRes.status, fRes.headers);
            if (headerError != void 0) {
              throw headerError;
            }
            if (!fRes.body) {
              throw "missing response body";
            }
            const trailer = new Headers();
            const res = Object.assign(Object.assign({}, req), { header: fRes.headers, trailer, message: parseResponseBody(fRes.body, foundStatus, trailer, fRes.headers, req.signal) });
            return res;
          }
        });
      }
    };
  }
  const file_src_proto_clouddrive = fileDesc("ChpzcmMvcHJvdG8vY2xvdWRkcml2ZS5wcm90bxIKY2xvdWRkcml2ZSJZCg9HZXRUb2tlblJlcXVlc3QSEAoIdXNlck5hbWUYASABKAkSEAoIcGFzc3dvcmQYAiABKAkSFQoIdG90cENvZGUYAyABKAlIAIgBAUILCglfdG90cENvZGUicAoISldUVG9rZW4SDwoHc3VjY2VzcxgBIAEoCBIUCgxlcnJvck1lc3NhZ2UYAiABKAkSDQoFdG9rZW4YAyABKAkSLgoKZXhwaXJhdGlvbhgEIAEoCzIaLmdvb2dsZS5wcm90b2J1Zi5UaW1lc3RhbXAiRwoLRmlsZVJlcXVlc3QSDAoEcGF0aBgBIAEoCRIZCgxmb3JjZVJlZnJlc2gYAiABKAhIAIgBAUIPCg1fZm9yY2VSZWZyZXNoIiAKEE11bHRpRmlsZVJlcXVlc3QSDAoEcGF0aBgBIAMoCSJVChNGaWxlT3BlcmF0aW9uUmVzdWx0Eg8KB3N1Y2Nlc3MYASABKAgSFAoMZXJyb3JNZXNzYWdlGAIgASgJEhcKD3Jlc3VsdEZpbGVQYXRocxgDIAMoCSIeCgxTdHJpbmdSZXN1bHQSDgoGcmVzdWx0GAEgASgJImUKGUdldERvd25sb2FkVXJsUGF0aFJlcXVlc3QSDAoEcGF0aBgBIAEoCRIPCgdwcmV2aWV3GAIgASgIEhEKCWxhenlfcmVhZBgDIAEoCBIWCg5nZXRfZGlyZWN0X3VybBgEIAEoCCKtAgoTRG93bmxvYWRVcmxQYXRoSW5mbxIXCg9kb3dubG9hZFVybFBhdGgYASABKAkSFgoJZXhwaXJlc0luGAIgASgESACIAQESFgoJZGlyZWN0VXJsGAMgASgJSAGIAQESFgoJdXNlckFnZW50GAQgASgJSAKIAQESUQoRYWRkaXRpb25hbEhlYWRlcnMYBSADKAsyNi5jbG91ZGRyaXZlLkRvd25sb2FkVXJsUGF0aEluZm8uQWRkaXRpb25hbEhlYWRlcnNFbnRyeRo4ChZBZGRpdGlvbmFsSGVhZGVyc0VudHJ5EgsKA2tleRgBIAEoCRINCgV2YWx1ZRgCIAEoCToCOAFCDAoKX2V4cGlyZXNJbkIMCgpfZGlyZWN0VXJsQgwKCl91c2VyQWdlbnQiHAoKQm9vbFJlc3VsdBIOCgZyZXN1bHQYASABKAgiJgoUVW5tb3VudEFyY2hpdmVSZXN1bHQSDgoGcmVzdWx0GAEgASgJImQKEkxpc3RTdWJGaWxlUmVxdWVzdBIMCgRwYXRoGAEgASgJEhQKDGZvcmNlUmVmcmVzaBgCIAEoCBIZCgxjaGVja0V4cGlyZXMYAyABKAhIAIgBAUIPCg1fY2hlY2tFeHBpcmVzIqoBCg1TZWFyY2hSZXF1ZXN0EgwKBHBhdGgYASABKAkSEQoJc2VhcmNoRm9yGAIgASgJEhQKDGZvcmNlUmVmcmVzaBgDIAEoCBISCgpmdXp6eU1hdGNoGAQgASgIEisKHmFkZFJlc3VsdFRvTW91bnRlZFNlYXJjaEZvbGRlchgFIAEoCEgAiAEBQiEKH19hZGRSZXN1bHRUb01vdW50ZWRTZWFyY2hGb2xkZXIicwoVQWRkT2ZmbGluZUZpbGVSZXF1ZXN0EgwKBHVybHMYASABKAkSEAoIdG9Gb2xkZXIYAiABKAkSIQoUY2hlY2tGb2xkZXJBZnRlclNlY3MYAyABKARIAIgBAUIXChVfY2hlY2tGb2xkZXJBZnRlclNlY3MiiwEKGVJlbW92ZU9mZmxpbmVGaWxlc1JlcXVlc3QSEQoJY2xvdWROYW1lGAEgASgJEhYKDmNsb3VkQWNjb3VudElkGAIgASgJEhMKC2RlbGV0ZUZpbGVzGAMgASgIEhIKCmluZm9IYXNoZXMYBCADKAkSEQoEcGF0aBgFIAEoCUgAiAEBQgcKBV9wYXRoIm8KFEFkZFNoYXJlZExpbmtSZXF1ZXN0EhUKDXNoYXJlZExpbmtVcmwYASABKAkSGwoOc2hhcmVkUGFzc3dvcmQYAiABKAlIAIgBARIQCgh0b0ZvbGRlchgDIAEoCUIRCg9fc2hhcmVkUGFzc3dvcmQiPQoNU3ViRmlsZXNSZXBseRIsCghzdWJGaWxlcxgBIAMoCzIaLmNsb3VkZHJpdmUuQ2xvdWREcml2ZUZpbGUiOQoVRmluZEZpbGVCeVBhdGhSZXF1ZXN0EhIKCnBhcmVudFBhdGgYASABKAkSDAoEcGF0aBgCIAEoCSI9ChNDcmVhdGVGb2xkZXJSZXF1ZXN0EhIKCnBhcmVudFBhdGgYASABKAkSEgoKZm9sZGVyTmFtZRgCIAEoCSJuChxDcmVhdGVFbmNyeXB0ZWRGb2xkZXJSZXF1ZXN0EhIKCnBhcmVudFBhdGgYASABKAkSEgoKZm9sZGVyTmFtZRgCIAEoCRIQCghwYXNzd29yZBgDIAEoCRIUCgxzYXZlUGFzc3dvcmQYBCABKAgiVQoaVW5sb2NrRW5jcnlwdGVkRmlsZVJlcXVlc3QSDAoEcGF0aBgBIAEoCRIQCghwYXNzd29yZBgCIAEoCRIXCg9wZXJtYW5lbnRVbmxvY2sYAyABKAgieAoSQ3JlYXRlRm9sZGVyUmVzdWx0EjEKDWZvbGRlckNyZWF0ZWQYASABKAsyGi5jbG91ZGRyaXZlLkNsb3VkRHJpdmVGaWxlEi8KBnJlc3VsdBgCIAEoCzIfLmNsb3VkZHJpdmUuRmlsZU9wZXJhdGlvblJlc3VsdCI5ChFDcmVhdGVGaWxlUmVxdWVzdBISCgpwYXJlbnRQYXRoGAEgASgJEhAKCGZpbGVOYW1lGAIgASgJIiYKEENyZWF0ZUZpbGVSZXN1bHQSEgoKZmlsZUhhbmRsZRgBIAEoBCImChBDbG9zZUZpbGVSZXF1ZXN0EhIKCmZpbGVIYW5kbGUYASABKAQixgIKD01vdmVGaWxlUmVxdWVzdBIUCgx0aGVGaWxlUGF0aHMYASADKAkSEAoIZGVzdFBhdGgYAiABKAkSRwoOY29uZmxpY3RQb2xpY3kYAyABKA4yKi5jbG91ZGRyaXZlLk1vdmVGaWxlUmVxdWVzdC5Db25mbGljdFBvbGljeUgAiAEBEh0KEG1vdmVBY3Jvc3NDbG91ZHMYBCABKAhIAYgBARImChloYW5kbGVDb25mbGljdFJlY3Vyc2l2ZWx5GAUgASgISAKIAQEiNQoOQ29uZmxpY3RQb2xpY3kSDQoJT3ZlcndyaXRlEAASCgoGUmVuYW1lEAESCAoEU2tpcBACQhEKD19jb25mbGljdFBvbGljeUITChFfbW92ZUFjcm9zc0Nsb3Vkc0IcChpfaGFuZGxlQ29uZmxpY3RSZWN1cnNpdmVseSKSAgoPQ29weUZpbGVSZXF1ZXN0EhQKDHRoZUZpbGVQYXRocxgBIAMoCRIQCghkZXN0UGF0aBgCIAEoCRJHCg5jb25mbGljdFBvbGljeRgDIAEoDjIqLmNsb3VkZHJpdmUuQ29weUZpbGVSZXF1ZXN0LkNvbmZsaWN0UG9saWN5SACIAQESJgoZaGFuZGxlQ29uZmxpY3RSZWN1cnNpdmVseRgFIAEoCEgBiAEBIjUKDkNvbmZsaWN0UG9saWN5Eg0KCU92ZXJ3cml0ZRAAEgoKBlJlbmFtZRABEggKBFNraXAQAkIRCg9fY29uZmxpY3RQb2xpY3lCHAoaX2hhbmRsZUNvbmZsaWN0UmVjdXJzaXZlbHkiawoQV3JpdGVGaWxlUmVxdWVzdBISCgpmaWxlSGFuZGxlGAEgASgEEhAKCHN0YXJ0UG9zGAIgASgEEg4KBmxlbmd0aBgDIAEoBBIOCgZidWZmZXIYBCABKAwSEQoJY2xvc2VGaWxlGAUgASgIIicKD1dyaXRlRmlsZVJlc3VsdBIUCgxieXRlc1dyaXR0ZW4YASABKAQiOQoRUmVuYW1lRmlsZVJlcXVlc3QSEwoLdGhlRmlsZVBhdGgYASABKAkSDwoHbmV3TmFtZRgCIAEoCSJIChJSZW5hbWVGaWxlc1JlcXVlc3QSMgoLcmVuYW1lRmlsZXMYASADKAsyHS5jbG91ZGRyaXZlLlJlbmFtZUZpbGVSZXF1ZXN0IqkLCg5DbG91ZERyaXZlRmlsZRIKCgJpZBgBIAEoCRIMCgRuYW1lGAIgASgJEhQKDGZ1bGxQYXRoTmFtZRgDIAEoCRIMCgRzaXplGAQgASgDEjUKCGZpbGVUeXBlGAUgASgOMiMuY2xvdWRkcml2ZS5DbG91ZERyaXZlRmlsZS5GaWxlVHlwZRIuCgpjcmVhdGVUaW1lGAYgASgLMhouZ29vZ2xlLnByb3RvYnVmLlRpbWVzdGFtcBItCgl3cml0ZVRpbWUYByABKAsyGi5nb29nbGUucHJvdG9idWYuVGltZXN0YW1wEi4KCmFjY2Vzc1RpbWUYCCABKAsyGi5nb29nbGUucHJvdG9idWYuVGltZXN0YW1wEiYKCENsb3VkQVBJGAkgASgLMhQuY2xvdWRkcml2ZS5DbG91ZEFQSRIUCgx0aHVtYm5haWxVcmwYCiABKAkSEgoKcHJldmlld1VybBgLIAEoCRIUCgxvcmlnaW5hbFBhdGgYDiABKAkSEwoLaXNEaXJlY3RvcnkYHiABKAgSDgoGaXNSb290GB8gASgIEhMKC2lzQ2xvdWRSb290GCAgASgIEhgKEGlzQ2xvdWREaXJlY3RvcnkYISABKAgSEwoLaXNDbG91ZEZpbGUYIiABKAgSFgoOaXNTZWFyY2hSZXN1bHQYIyABKAgSEwoLaXNGb3JiaWRkZW4YJCABKAgSDwoHaXNMb2NhbBglIAEoCBIQCghjYW5Nb3VudBg8IAEoCBISCgpjYW5Vbm1vdW50GD0gASgIEiMKG2NhbkRpcmVjdEFjY2Vzc1RodW1ibmFpbFVSTBg+IAEoCBIRCgljYW5TZWFyY2gYPyABKAgSGwoTaGFzRGV0YWlsUHJvcGVydGllcxhAIAEoCBI6ChBkZXRhaWxQcm9wZXJ0aWVzGEEgASgLMiAuY2xvdWRkcml2ZS5GaWxlRGV0YWlsUHJvcGVydGllcxIaChJjYW5PZmZsaW5lRG93bmxvYWQYQiABKAgSFwoPY2FuQWRkU2hhcmVMaW5rGEMgASgIEiMKFmRpckNhY2hlVGltZVRvTGl2ZVNlY3MYRCABKARIAIgBARIcChRjYW5EZWxldGVQZXJtYW5lbnRseRhFIAEoCBI+CgpmaWxlSGFzaGVzGEYgAygLMiouY2xvdWRkcml2ZS5DbG91ZERyaXZlRmlsZS5GaWxlSGFzaGVzRW50cnkSSQoSZmlsZUVuY3J5cHRpb25UeXBlGEcgASgOMi0uY2xvdWRkcml2ZS5DbG91ZERyaXZlRmlsZS5GaWxlRW5jcnlwdGlvblR5cGUSIAoYQ2FuQ3JlYXRlRW5jcnlwdGVkRm9sZGVyGEggASgIEg8KB0NhbkxvY2sYSSABKAgSIwobQ2FuU3luY0ZpbGVDaGFuZ2VzRnJvbUNsb3VkGEogASgIEigKIHN1cHBvcnRPZmZsaW5lRG93bmxvYWRNYW5hZ2VtZW50GEsgASgIEj0KD2Rvd25sb2FkVXJsUGF0aBhMIAEoCzIfLmNsb3VkZHJpdmUuRG93bmxvYWRVcmxQYXRoSW5mb0gBiAEBGjEKD0ZpbGVIYXNoZXNFbnRyeRILCgNrZXkYASABKA0SDQoFdmFsdWUYAiABKAk6AjgBIi4KCEZpbGVUeXBlEg0KCURpcmVjdG9yeRAAEggKBEZpbGUQARIJCgVPdGhlchACIjoKCEhhc2hUeXBlEgsKB1Vua25vd24QABIHCgNNZDUQARIICgRTaGExEAISDgoKUGlrUGFrU2hhMRADIjsKEkZpbGVFbmNyeXB0aW9uVHlwZRIICgROb25lEAASDQoJRW5jcnlwdGVkEAESDAoIVW5sb2NrZWQQAkIZChdfZGlyQ2FjaGVUaW1lVG9MaXZlU2Vjc0ISChBfZG93bmxvYWRVcmxQYXRoIkUKCVNwYWNlSW5mbxISCgp0b3RhbFNwYWNlGAEgASgDEhEKCXVzZWRTcGFjZRgCIAEoAxIRCglmcmVlU3BhY2UYAyABKAMisQIKCENsb3VkQVBJEgwKBG5hbWUYASABKAkSEAoIdXNlck5hbWUYAiABKAkSEAoIbmlja05hbWUYAyABKAkSEAoIaXNMb2NrZWQYBCABKAgSIwobc3VwcG9ydE11bHRpVGhyZWFkVXBsb2FkaW5nGAUgASgIEhcKD3N1cHBvcnRRcHNMaW1pdBgGIAEoCBIjChtpc0Nsb3VkRXZlbnRMaXN0ZW5lclJ1bm5pbmcYByABKAgSFQoNaGFzUHJvbW90aW9ucxgIIAEoCBIbCg5wcm9tb3Rpb25UaXRsZRgJIAEoCUgAiAEBEhEKBHBhdGgYCiABKAlIAYgBARIbChNzdXBwb3J0SHR0cERvd25sb2FkGAsgASgIQhEKD19wcm9tb3Rpb25UaXRsZUIHCgVfcGF0aCKFAQoPQ2xvdWRNZW1iZXJzaGlwEhAKCGlkZW50aXR5GAEgASgJEjMKCmV4cGlyZVRpbWUYAiABKAsyGi5nb29nbGUucHJvdG9idWYuVGltZXN0YW1wSACIAQESEgoFbGV2ZWwYAyABKAlIAYgBAUINCgtfZXhwaXJlVGltZUIICgZfbGV2ZWwiRAoQQ2xvdWRNZW1iZXJzaGlwcxIwCgttZW1iZXJzaGlwcxgBIAMoCzIbLmNsb3VkZHJpdmUuQ2xvdWRNZW1iZXJzaGlwIpQBChRGaWxlRGV0YWlsUHJvcGVydGllcxIWCg50b3RhbEZpbGVDb3VudBgBIAEoAxIYChB0b3RhbEZvbGRlckNvdW50GAIgASgDEhEKCXRvdGFsU2l6ZRgDIAEoAxIPCgdpc0ZhdmVkGAQgASgIEhAKCGlzU2hhcmVkGAUgASgIEhQKDG9yaWdpbmFsUGF0aBgGIAEoCSJ5CgxGaWxlTWV0YURhdGESOAoIbWV0YWRhdGEYASADKAsyJi5jbG91ZGRyaXZlLkZpbGVNZXRhRGF0YS5NZXRhZGF0YUVudHJ5Gi8KDU1ldGFkYXRhRW50cnkSCwoDa2V5GAEgASgJEg0KBXZhbHVlGAIgASgJOgI4ASKgAQoUQ2xvdWREcml2ZVN5c3RlbUluZm8SDwoHSXNMb2dpbhgBIAEoCBIQCghVc2VyTmFtZRgCIAEoCRITCgtTeXN0ZW1SZWFkeRgDIAEoCBIaCg1TeXN0ZW1NZXNzYWdlGAQgASgJSACIAQESFQoIaGFzRXJyb3IYBSABKAhIAYgBAUIQCg5fU3lzdGVtTWVzc2FnZUILCglfaGFzRXJyb3IiTgoQVXNlckxvZ2luUmVxdWVzdBIQCgh1c2VyTmFtZRgBIAEoCRIQCghwYXNzd29yZBgCIAEoCRIWCg5zeW5EYXRhVG9DbG91ZBgDIAEoCCI5ChNVc2VyUmVnaXN0ZXJSZXF1ZXN0EhAKCHVzZXJOYW1lGAEgASgJEhAKCHBhc3N3b3JkGAIgASgJIi4KEVVzZXJMb2dvdXRSZXF1ZXN0EhkKEWxvZ291dEZyb21DbG91ZEZTGAEgASgIImUKFUNoYW5nZVBhc3N3b3JkUmVxdWVzdBITCgtvbGRQYXNzd29yZBgBIAEoCRITCgtuZXdQYXNzd29yZBgCIAEoCRIVCgh0b3RwQ29kZRgDIAEoCUgAiAEBQgsKCV90b3RwQ29kZSKVAwoTQWNjb3VudFN0YXR1c1Jlc3VsdBIQCgh1c2VyTmFtZRgBIAEoCRIWCg5lbWFpbENvbmZpcm1lZBgCIAEoCRIWCg5hY2NvdW50QmFsYW5jZRgDIAEoARIsCgthY2NvdW50UGxhbhgEIAEoCzIXLmNsb3VkZHJpdmUuQWNjb3VudFBsYW4SLQoMYWNjb3VudFJvbGVzGAUgAygLMhcuY2xvdWRkcml2ZS5BY2NvdW50Um9sZRIwCgpzZWNvbmRQbGFuGAYgASgLMhcuY2xvdWRkcml2ZS5BY2NvdW50UGxhbkgAiAEBEiAKE3BhcnRuZXJSZWZlcnJhbENvZGUYByABKAlIAYgBARIaCg10cnVzdGVkRGV2aWNlGAggASgISAKIAQESHwoSdXNlck5hbWVJc0RldmljZUlkGAkgASgISAOIAQFCDQoLX3NlY29uZFBsYW5CFgoUX3BhcnRuZXJSZWZlcnJhbENvZGVCEAoOX3RydXN0ZWREZXZpY2VCFQoTX3VzZXJOYW1lSXNEZXZpY2VJZCKXAQoLQWNjb3VudFBsYW4SEAoIcGxhbk5hbWUYASABKAkSEwoLZGVzY3JpcHRpb24YAiABKAkSFwoPZm9udEF3ZXNvbWVJY29uGAMgASgJEhsKE2R1cmF0aW9uRGVzY3JpcHRpb24YBCABKAkSKwoHZW5kVGltZRgFIAEoCzIaLmdvb2dsZS5wcm90b2J1Zi5UaW1lc3RhbXAiUgoLQWNjb3VudFJvbGUSEAoIcm9sZU5hbWUYASABKAkSEwoLZGVzY3JpcHRpb24YAiABKAkSEgoFdmFsdWUYAyABKAVIAIgBAUIICgZfdmFsdWUiYwoLUnVudGltZUluZm8SEwoLcHJvZHVjdE5hbWUYASABKAkSFgoOcHJvZHVjdFZlcnNpb24YAiABKAkSFwoPQ2xvdWRBUElWZXJzaW9uGAMgASgJEg4KBm9zSW5mbxgEIAEoCSLxAQoHUnVuSW5mbxIQCghjcHVVc2FnZRgBIAEoARISCgptZW1Vc2FnZUtCGAIgASgEEg4KBnVwdGltZRgDIAEoARIUCgxmaFRhYmxlQ291bnQYBCABKAQSFQoNZGlyQ2FjaGVDb3VudBgFIAEoBBIVCg10ZW1wRmlsZUNvdW50GAYgASgEEhcKD2RiRGlyQ2FjaGVDb3VudBgHIAEoBBIeChZkb3dubG9hZEJ5dGVzUGVyU2Vjb25kGAggASgBEhwKFHVwbG9hZEJ5dGVzUGVyU2Vjb25kGAkgASgBEhUKDXRvdGFsTWVtb3J5S0IYCiABKAQi0QEKDk9wZW5GaWxlSGFuZGxlEhIKCmZpbGVIYW5kbGUYASABKAQSEQoJcHJvY2Vzc0lkGAIgASgEEhMKC3Byb2Nlc3NQYXRoGAMgASgJEhAKCGZpbGVQYXRoGAQgASgJEhMKC2lzRGlyZWN0b3J5GAUgASgIEiwKCG9wZW5UaW1lGAYgASgLMhouZ29vZ2xlLnByb3RvYnVmLlRpbWVzdGFtcBIbCg5zcGVjaWFsQ29tbWFuZBgHIAEoCUgAiAEBQhEKD19zcGVjaWFsQ29tbWFuZCJJChJPcGVuRmlsZUhhbmRsZUxpc3QSMwoPb3BlbkZpbGVIYW5kbGVzGAEgAygLMhouY2xvdWRkcml2ZS5PcGVuRmlsZUhhbmRsZSKqAQoLTW91bnRPcHRpb24SEgoKbW91bnRQb2ludBgBIAEoCRIRCglzb3VyY2VEaXIYAiABKAkSEgoKbG9jYWxNb3VudBgDIAEoCBIQCghyZWFkT25seRgEIAEoCBIRCglhdXRvTW91bnQYBSABKAgSCwoDdWlkGAYgASgNEgsKA2dpZBgHIAEoDRITCgtwZXJtaXNzaW9ucxgIIAEoCRIMCgRuYW1lGAkgASgJIsIBCgpNb3VudFBvaW50EhIKCm1vdW50UG9pbnQYASABKAkSEQoJc291cmNlRGlyGAIgASgJEhIKCmxvY2FsTW91bnQYAyABKAgSEAoIcmVhZE9ubHkYBCABKAgSEQoJYXV0b01vdW50GAUgASgIEgsKA3VpZBgGIAEoDRILCgNnaWQYByABKA0SEwoLcGVybWlzc2lvbnMYCCABKAkSEQoJaXNNb3VudGVkGAkgASgIEhIKCmZhaWxSZWFzb24YCiABKAkiJwoRTW91bnRQb2ludFJlcXVlc3QSEgoKTW91bnRQb2ludBgBIAEoCSJDChRHZXRNb3VudFBvaW50c1Jlc3VsdBIrCgttb3VudFBvaW50cxgBIAMoCzIWLmNsb3VkZHJpdmUuTW91bnRQb2ludCI3ChBNb3VudFBvaW50UmVzdWx0Eg8KB3N1Y2Nlc3MYASABKAgSEgoKZmFpbFJlYXNvbhgCIAEoCSJeChdVcGRhdGVNb3VudFBvaW50UmVxdWVzdBISCgptb3VudFBvaW50GAEgASgJEi8KDm5ld01vdW50T3B0aW9uGAIgASgLMhcuY2xvdWRkcml2ZS5Nb3VudE9wdGlvbiI8Ch9HZXRBdmFpbGFibGVEcml2ZUxldHRlcnNSZXF1ZXN0EhkKEWluY2x1ZGVDbG91ZERyaXZlGAEgASgIIjYKHkdldEF2YWlsYWJsZURyaXZlTGV0dGVyc1Jlc3VsdBIUCgxkcml2ZUxldHRlcnMYASADKAkiMAoVSGFzRHJpdmVMZXR0ZXJzUmVzdWx0EhcKD2hhc0RyaXZlTGV0dGVycxgBIAEoCCJ9ChdMb2NhbEdldFN1YkZpbGVzUmVxdWVzdBIUCgxwYXJlbnRGb2xkZXIYASABKAkSEgoKZm9sZGVyT25seRgCIAEoCBIZChFpbmNsdWRlQ2xvdWREcml2ZRgDIAEoCBIdChVpbmNsdWRlQXZhaWxhYmxlRHJpdmUYBCABKAgiKgoWTG9jYWxHZXRTdWJGaWxlc1Jlc3VsdBIQCghzdWJGaWxlcxgBIAMoCSIoCgtQdXNoTWVzc2FnZRIZChFjbG91ZGRyaXZlVmVyc2lvbhgBIAEoCSLZAQoWR2V0QWxsVGFza3NDb3VudFJlc3VsdBIVCg1kb3dubG9hZENvdW50GAEgASgNEhMKC3VwbG9hZENvdW50GAIgASgNEhUKDWNvcHlUYXNrQ291bnQYBiABKA0SLAoLcHVzaE1lc3NhZ2UYAyABKAsyFy5jbG91ZGRyaXZlLlB1c2hNZXNzYWdlEhEKCWhhc1VwZGF0ZRgEIAEoCBI7Chd1cGxvYWRGaWxlU3RhdHVzQ2hhbmdlcxgFIAMoCzIaLmNsb3VkZHJpdmUuVXBsb2FkRmlsZUluZm8ihAIKEEZpbGVTeXN0ZW1DaGFuZ2USOwoKY2hhbmdlVHlwZRgBIAEoDjInLmNsb3VkZHJpdmUuRmlsZVN5c3RlbUNoYW5nZS5DaGFuZ2VUeXBlEhMKC2lzRGlyZWN0b3J5GAIgASgIEgwKBHBhdGgYAyABKAkSFAoHbmV3UGF0aBgEIAEoCUgAiAEBEjAKB3RoZUZpbGUYBSABKAsyGi5jbG91ZGRyaXZlLkNsb3VkRHJpdmVGaWxlSAGIAQEiMAoKQ2hhbmdlVHlwZRIKCgZDUkVBVEUQABIKCgZERUxFVEUQARIKCgZSRU5BTUUQAkIKCghfbmV3UGF0aEIKCghfdGhlRmlsZSKBAwoMVXBkYXRlU3RhdHVzEjkKC3VwZGF0ZVBoYXNlGAEgASgOMiQuY2xvdWRkcml2ZS5VcGRhdGVTdGF0dXMuVXBkYXRlUGhhc2USFwoKbmV3VmVyc2lvbhgCIAEoCUgAiAEBEhQKB21lc3NhZ2UYAyABKAlIAYgBARIZChFjbG91ZGRyaXZlVmVyc2lvbhgEIAEoCRIcCg9kb3dubG9hZGVkQnl0ZXMYBSABKARIAogBARIXCgp0b3RhbEJ5dGVzGAYgASgESAOIAQEidwoLVXBkYXRlUGhhc2USDQoJTk9fVVBEQVRFEAASDwoLRE9XTkxPQURJTkcQARITCg9SRUFEWV9UT19VUERBVEUQAhIMCghVUERBVElORxADEhIKDlVQREFURV9TVUNDRVNTEAQSEQoNVVBEQVRFX0ZBSUxFRBAFQg0KC19uZXdWZXJzaW9uQgoKCF9tZXNzYWdlQhIKEF9kb3dubG9hZGVkQnl0ZXNCDQoLX3RvdGFsQnl0ZXMiwgEKElRyYW5zZmVyVGFza1N0YXR1cxIVCg1kb3dubG9hZENvdW50GAEgASgNEhMKC3VwbG9hZENvdW50GAIgASgNEhkKEWNsb3VkZHJpdmVWZXJzaW9uGAMgASgJEjsKF3VwbG9hZEZpbGVTdGF0dXNDaGFuZ2VzGAQgAygLMhouY2xvdWRkcml2ZS5VcGxvYWRGaWxlSW5mbxIRCgloYXNVcGRhdGUYBSABKAgSFQoNY29weVRhc2tDb3VudBgGIAEoDSLWAQoNRXhpdGVkTWVzc2FnZRI4CgpleGl0UmVhc29uGAEgASgOMiQuY2xvdWRkcml2ZS5FeGl0ZWRNZXNzYWdlLkV4aXRSZWFzb24SDwoHbWVzc2FnZRgCIAEoCSJ6CgpFeGl0UmVhc29uEgsKB1VOS05PV04QABIVChFLSUNLRURPVVRfQllfVVNFUhABEhcKE0tJQ0tFRE9VVF9CWV9TRVJWRVIQAhIUChBQQVNTV09SRF9DSEFOR0VEEAMSCwoHUkVTVEFSVBAEEgwKCFNIVVRET1dOEAUiTwoURmlsZVN5c3RlbUNoYW5nZUxpc3QSNwoRZmlsZVN5c3RlbUNoYW5nZXMYASADKAsyHC5jbG91ZGRyaXZlLkZpbGVTeXN0ZW1DaGFuZ2UirgEKEE1vdW50UG9pbnRDaGFuZ2USOwoKYWN0aW9uVHlwZRgBIAEoDjInLmNsb3VkZHJpdmUuTW91bnRQb2ludENoYW5nZS5BY3Rpb25UeXBlEhIKCm1vdW50UG9pbnQYAiABKAkSDwoHc3VjY2VzcxgDIAEoCBISCgpmYWlsUmVhc29uGAQgASgJIiQKCkFjdGlvblR5cGUSCQoFTU9VTlQQABILCgdVTk1PVU5UEAEisAIKCkxvZ01lc3NhZ2USLgoFbGV2ZWwYASABKA4yHy5jbG91ZGRyaXZlLkxvZ01lc3NhZ2UuTG9nTGV2ZWwSDwoHbWVzc2FnZRgCIAEoCRIOCgZ0YXJnZXQYAyABKAkSLQoJdGltZXN0YW1wGAQgASgLMhouZ29vZ2xlLnByb3RvYnVmLlRpbWVzdGFtcBIyCgZmaWVsZHMYBiADKAsyIi5jbG91ZGRyaXZlLkxvZ01lc3NhZ2UuRmllbGRzRW50cnkaLQoLRmllbGRzRW50cnkSCwoDa2V5GAEgASgJEg0KBXZhbHVlGAIgASgJOgI4ASI/CghMb2dMZXZlbBIJCgVUUkFDRRAAEgkKBURFQlVHEAESCAoESU5GTxACEggKBFdBUk4QAxIJCgVFUlJPUhAEIqUFChVDbG91ZERyaXZlUHVzaE1lc3NhZ2USQgoLbWVzc2FnZVR5cGUYASABKA4yLS5jbG91ZGRyaXZlLkNsb3VkRHJpdmVQdXNoTWVzc2FnZS5NZXNzYWdlVHlwZRI8ChJ0cmFuc2ZlclRhc2tTdGF0dXMYAiABKAsyHi5jbG91ZGRyaXZlLlRyYW5zZmVyVGFza1N0YXR1c0gAEjAKDHVwZGF0ZVN0YXR1cxgDIAEoCzIYLmNsb3VkZHJpdmUuVXBkYXRlU3RhdHVzSAASMgoNZXhpdGVkTWVzc2FnZRgEIAEoCzIZLmNsb3VkZHJpdmUuRXhpdGVkTWVzc2FnZUgAEjgKEGZpbGVTeXN0ZW1DaGFuZ2UYBSABKAsyHC5jbG91ZGRyaXZlLkZpbGVTeXN0ZW1DaGFuZ2VIABI4ChBtb3VudFBvaW50Q2hhbmdlGAYgASgLMhwuY2xvdWRkcml2ZS5Nb3VudFBvaW50Q2hhbmdlSAASLAoKbG9nTWVzc2FnZRgHIAEoCzIWLmNsb3VkZHJpdmUuTG9nTWVzc2FnZUgAEjYKD21lcmdlVGFza1VwZGF0ZRgIIAEoCzIbLmNsb3VkZHJpdmUuTWVyZ2VUYXNrVXBkYXRlSAAiwQEKC01lc3NhZ2VUeXBlEhQKEERPV05MT0FERVJfQ09VTlQQABISCg5VUExPQURFUl9DT1VOVBABEhEKDVVQREFURV9TVEFUVVMQAhIOCgpGT1JDRV9FWElUEAMSFgoSRklMRV9TWVNURU1fQ0hBTkdFEAQSFgoSTU9VTlRfUE9JTlRfQ0hBTkdFEAUSEwoPQ09QWV9UQVNLX0NPVU5UEAYSDwoLTE9HX01FU1NBR0UQBxIPCgtNRVJHRV9UQVNLUxAIQgYKBGRhdGEiogEKD01lcmdlVGFza1VwZGF0ZRIpCgptZXJnZVRhc2tzGAEgAygLMhUuY2xvdWRkcml2ZS5NZXJnZVRhc2sSGwoObGFzdE1lcmdlZFBhdGgYAiABKAlIAIgBARIeChFsYXN0TWVyZ2VkTmV3UGF0aBgDIAEoCUgBiAEBQhEKD19sYXN0TWVyZ2VkUGF0aEIUChJfbGFzdE1lcmdlZE5ld1BhdGgiLwoaR2V0RG93bmxvYWRGaWxlQ291bnRSZXN1bHQSEQoJZmlsZUNvdW50GAEgASgNIukBChBEb3dubG9hZEZpbGVJbmZvEhAKCGZpbGVQYXRoGAEgASgJEhIKCmZpbGVMZW5ndGgYAiABKAQSFwoPdG90YWxCdWZmZXJVc2VkGAMgASgEEhsKE2Rvd25sb2FkVGhyZWFkQ291bnQYBCABKA0SDwoHcHJvY2VzcxgFIAMoCRIaChJkZXRhaWxEb3dubG9hZEluZm8YBiABKAkSHgoRbGFzdERvd25sb2FkRXJyb3IYByABKAlIAIgBARIWCg5ieXRlc1BlclNlY29uZBgIIAEoAUIUChJfbGFzdERvd25sb2FkRXJyb3IibgoZR2V0RG93bmxvYWRGaWxlTGlzdFJlc3VsdBIcChRnbG9iYWxCeXRlc1BlclNlY29uZBgBIAEoARIzCg1kb3dubG9hZEZpbGVzGAQgAygLMhwuY2xvdWRkcml2ZS5Eb3dubG9hZEZpbGVJbmZvIi0KGEdldFVwbG9hZEZpbGVDb3VudFJlc3VsdBIRCglmaWxlQ291bnQYASABKA0i5wMKDlVwbG9hZEZpbGVJbmZvEgsKA2tleRgBIAEoCRIQCghkZXN0UGF0aBgCIAEoCRIMCgRzaXplGAMgASgEEhcKD3RyYW5zZmVyZWRCeXRlcxgEIAEoBBIOCgZzdGF0dXMYBSABKAkSFAoMZXJyb3JNZXNzYWdlGAYgASgJEj0KDG9wZXJhdG9yVHlwZRgHIAEoDjInLmNsb3VkZHJpdmUuVXBsb2FkRmlsZUluZm8uT3BlcmF0b3JUeXBlEjUKCnN0YXR1c0VudW0YCCABKA4yIS5jbG91ZGRyaXZlLlVwbG9hZEZpbGVJbmZvLlN0YXR1cyKrAQoGU3RhdHVzEhgKFFdhaXRmb3JQcmVwcm9jZXNzaW5nEAASEQoNUHJlcHJvY2Vzc2luZxABEg0KCUNhbmNlbGxlZBACEgwKCFRyYW5zZmVyEAMSCQoFUGF1c2UQBBIKCgZGaW5pc2gQBRILCgdTa2lwcGVkEAYSCwoHSW5xdWV1ZRAHEgsKB0lnbm9yZWQQCBIJCgVFcnJvchAJEg4KCkZhdGFsRXJyb3IQCiJFCgxPcGVyYXRvclR5cGUSCQoFTW91bnQQABIICgRDb3B5EAESDgoKQmFja3VwRmlsZRACEhAKDFJlbW90ZVVwbG9hZBADIpQCChhHZXRVcGxvYWRGaWxlTGlzdFJlcXVlc3QSDgoGZ2V0QWxsGAEgASgIEhQKDGl0ZW1zUGVyUGFnZRgCIAEoDRISCgpwYWdlTnVtYmVyGAMgASgNEg4KBmZpbHRlchgEIAEoCRI8CgxzdGF0dXNGaWx0ZXIYBSABKA4yIS5jbG91ZGRyaXZlLlVwbG9hZEZpbGVJbmZvLlN0YXR1c0gAiAEBEkgKEm9wZXJhdG9yVHlwZUZpbHRlchgGIAEoDjInLmNsb3VkZHJpdmUuVXBsb2FkRmlsZUluZm8uT3BlcmF0b3JUeXBlSAGIAQFCDwoNX3N0YXR1c0ZpbHRlckIVChNfb3BlcmF0b3JUeXBlRmlsdGVyIsMBChdHZXRVcGxvYWRGaWxlTGlzdFJlc3VsdBISCgp0b3RhbENvdW50GAEgASgNEi8KC3VwbG9hZEZpbGVzGAIgAygLMhouY2xvdWRkcml2ZS5VcGxvYWRGaWxlSW5mbxIcChRnbG9iYWxCeXRlc1BlclNlY29uZBgDIAEoARISCgp0b3RhbEJ5dGVzGAQgASgEEhUKDWZpbmlzaGVkQnl0ZXMYBSABKAQSGgoSdG90YWxDb3VudEZpbHRlcmVkGAYgASgNIkYKCVRhc2tFcnJvchIoCgR0aW1lGAEgASgLMhouZ29vZ2xlLnByb3RvYnVmLlRpbWVzdGFtcBIPCgdtZXNzYWdlGAIgASgJIjcKD0NvcHlUYXNrUmVxdWVzdBISCgpzb3VyY2VQYXRoGAEgASgJEhAKCGRlc3RQYXRoGAIgASgJIksKFFBhdXNlQ29weVRhc2tSZXF1ZXN0EhIKCnNvdXJjZVBhdGgYASABKAkSEAoIZGVzdFBhdGgYAiABKAkSDQoFcGF1c2UYAyABKAgiKAoUQ29weVRhc2tCYXRjaFJlcXVlc3QSEAoIdGFza0tleXMYASADKAkiKQoYUGF1c2VBbGxDb3B5VGFza3NSZXF1ZXN0Eg0KBXBhdXNlGAEgASgIIjgKFVBhdXNlQ29weVRhc2tzUmVxdWVzdBIQCgh0YXNrS2V5cxgBIAMoCRINCgVwYXVzZRgCIAEoCCJUChRCYXRjaE9wZXJhdGlvblJlc3VsdBIPCgdzdWNjZXNzGAEgASgIEhUKDWFmZmVjdGVkQ291bnQYAiABKA0SFAoMZXJyb3JNZXNzYWdlGAMgASgJIp8ECglNZXJnZVRhc2sSEgoKc291cmNlUGF0aBgBIAEoCRIQCghkZXN0UGF0aBgCIAEoCRIwCgZzdGF0dXMYAyABKA4yIC5jbG91ZGRyaXZlLk1lcmdlVGFzay5UYXNrU3RhdHVzEhMKC21lcmdlZEZpbGVzGAQgASgEEhUKDW1lcmdlZEZvbGRlcnMYBSABKAQSLQoJc3RhcnRUaW1lGAYgASgLMhouZ29vZ2xlLnByb3RvYnVmLlRpbWVzdGFtcBIwCgdlbmRUaW1lGAcgASgLMhouZ29vZ2xlLnByb3RvYnVmLlRpbWVzdGFtcEgAiAEBEhkKDGVycm9yTWVzc2FnZRgIIAEoCUgBiAEBEkIKDmNvbmZsaWN0UG9saWN5GAkgASgOMiouY2xvdWRkcml2ZS5Nb3ZlRmlsZVJlcXVlc3QuQ29uZmxpY3RQb2xpY3kSOgoNb3BlcmF0aW9uVHlwZRgKIAEoDjIjLmNsb3VkZHJpdmUuTWVyZ2VUYXNrLk9wZXJhdGlvblR5cGUiUAoKVGFza1N0YXR1cxILCgdQZW5kaW5nEAASCwoHUnVubmluZxABEg0KCUNvbXBsZXRlZBACEgoKBkZhaWxlZBADEg0KCUNhbmNlbGxlZBAEIiMKDU9wZXJhdGlvblR5cGUSCAoETW92ZRAAEggKBENvcHkQAUIKCghfZW5kVGltZUIPCg1fZXJyb3JNZXNzYWdlIkAKE0dldE1lcmdlVGFza3NSZXN1bHQSKQoKbWVyZ2VUYXNrcxgBIAMoCzIVLmNsb3VkZHJpdmUuTWVyZ2VUYXNrIj4KFkNhbmNlbE1lcmdlVGFza1JlcXVlc3QSEgoKc291cmNlUGF0aBgBIAEoCRIQCghkZXN0UGF0aBgCIAEoCSLtBAoIQ29weVRhc2sSLwoIdGFza01vZGUYAiABKA4yHS5jbG91ZGRyaXZlLkNvcHlUYXNrLlRhc2tNb2RlEhIKCnNvdXJjZVBhdGgYAyABKAkSEAoIZGVzdFBhdGgYBCABKAkSLwoGc3RhdHVzGAUgASgOMh8uY2xvdWRkcml2ZS5Db3B5VGFzay5UYXNrU3RhdHVzEhQKDHRvdGFsRm9sZGVycxgGIAEoBBISCgp0b3RhbEZpbGVzGAcgASgEEhUKDWZhaWxlZEZvbGRlcnMYCCABKAQSEwoLZmFpbGVkRmlsZXMYCSABKAQSFQoNdXBsb2FkZWRGaWxlcxgKIAEoBBIWCg5jYW5jZWxsZWRGaWxlcxgLIAEoBBIUCgxza2lwcGVkRmlsZXMYECABKAQSEgoKdG90YWxCeXRlcxgMIAEoBBIVCg11cGxvYWRlZEJ5dGVzGA0gASgEEg4KBnBhdXNlZBgOIAEoCBIlCgZlcnJvcnMYDyADKAsyFS5jbG91ZGRyaXZlLlRhc2tFcnJvchItCglzdGFydFRpbWUYESABKAsyGi5nb29nbGUucHJvdG9idWYuVGltZXN0YW1wEjAKB2VuZFRpbWUYEiABKAsyGi5nb29nbGUucHJvdG9idWYuVGltZXN0YW1wSACIAQEiHgoIVGFza01vZGUSCAoEQ29weRAAEggKBE1vdmUQASJPCgpUYXNrU3RhdHVzEgsKB1BlbmRpbmcQABIMCghTY2FubmluZxABEgsKB1NjYW5uZWQQAhINCglDb21wbGV0ZWQQAxIKCgZGYWlsZWQQBEIKCghfZW5kVGltZSI8ChFHZXRDb3B5VGFza1Jlc3VsdBInCgljb3B5VGFza3MYASADKAsyFC5jbG91ZGRyaXZlLkNvcHlUYXNrIisKG011bHRwbGVVcGxvYWRGaWxlS2V5UmVxdWVzdBIMCgRrZXlzGAEgAygJIj0KHUxvZ2luMTE1RWRpdHRoaXNjb29raWVSZXF1ZXN0EhwKFGVkaXRUaGlzY29va2llU3RyaW5nGAEgASgJIkcKFUxvZ2luMTE1UXJDb2RlUmVxdWVzdBIbCg5wbGF0Zm9ybVN0cmluZxgBIAEoCUgAiAEBQhEKD19wbGF0Zm9ybVN0cmluZyJfChxMb2dpbkFsaXl1bmRyaXZlT0F1dGhSZXF1ZXN0EhUKDXJlZnJlc2hfdG9rZW4YASABKAkSFAoMYWNjZXNzX3Rva2VuGAIgASgJEhIKCmV4cGlyZXNfaW4YAyABKAQiTwojTG9naW5BbGl5dW5kcml2ZVJlZnJlc2h0b2tlblJlcXVlc3QSFAoMcmVmcmVzaFRva2VuGAEgASgJEhIKCnVzZU9wZW5BUEkYAiABKAgiMwodTG9naW5BbGl5dW5kcml2ZVFSQ29kZVJlcXVlc3QSEgoKdXNlT3BlbkFQSRgBIAEoCCJcChlMb2dpbkJhaWR1UGFuT0F1dGhSZXF1ZXN0EhUKDXJlZnJlc2hfdG9rZW4YASABKAkSFAoMYWNjZXNzX3Rva2VuGAIgASgJEhIKCmV4cGlyZXNfaW4YAyABKAQiXAoZTG9naW5PbmVEcml2ZU9BdXRoUmVxdWVzdBIVCg1yZWZyZXNoX3Rva2VuGAEgASgJEhQKDGFjY2Vzc190b2tlbhgCIAEoCRISCgpleHBpcmVzX2luGAMgASgEIl8KHExvZ2luR29vZ2xlRHJpdmVPQXV0aFJlcXVlc3QSFQoNcmVmcmVzaF90b2tlbhgBIAEoCRIUCgxhY2Nlc3NfdG9rZW4YAiABKAkSEgoKZXhwaXJlc19pbhgDIAEoBCJmCiNMb2dpbkdvb2dsZURyaXZlUmVmcmVzaFRva2VuUmVxdWVzdBIRCgljbGllbnRfaWQYASABKAkSFQoNY2xpZW50X3NlY3JldBgCIAEoCRIVCg1yZWZyZXNoX3Rva2VuGAMgASgJIloKF0xvZ2luWHVubGVpT0F1dGhSZXF1ZXN0EhUKDXJlZnJlc2hfdG9rZW4YASABKAkSFAoMYWNjZXNzX3Rva2VuGAIgASgJEhIKCmV4cGlyZXNfaW4YAyABKAQiXgobTG9naW5YdW5sZWlPcGVuT0F1dGhSZXF1ZXN0EhUKDXJlZnJlc2hfdG9rZW4YASABKAkSFAoMYWNjZXNzX3Rva2VuGAIgASgJEhIKCmV4cGlyZXNfaW4YAyABKAQiWgoXTG9naW4xMjNwYW5PQXV0aFJlcXVlc3QSFQoNcmVmcmVzaF90b2tlbhgBIAEoCRIUCgxhY2Nlc3NfdG9rZW4YAiABKAkSEgoKZXhwaXJlc19pbhgDIAEoBCJbChhMb2dpbjExNU9wZW5PQXV0aFJlcXVlc3QSFQoNcmVmcmVzaF90b2tlbhgBIAEoCRIUCgxhY2Nlc3NfdG9rZW4YAiABKAkSEgoKZXhwaXJlc19pbhgDIAEoBCJlChJMb2dpbldlYkRhdlJlcXVlc3QSEQoJc2VydmVyVXJsGAEgASgJEhAKCHVzZXJOYW1lGAIgASgJEhAKCHBhc3N3b3JkGAMgASgJEhgKEGRvTm90U3luY1RvQ2xvdWQYBCABKAgiNwoOQVBJTG9naW5SZXN1bHQSDwoHc3VjY2VzcxgBIAEoCBIUCgxlcnJvck1lc3NhZ2UYAiABKAkiMAoVQWRkTG9jYWxGb2xkZXJSZXF1ZXN0EhcKD2xvY2FsRm9sZGVyUGF0aBgBIAEoCSJnChZMb2dpbkNsb3VkRHJpdmVSZXF1ZXN0Eg8KB2dycGNVcmwYASABKAkSDQoFdG9rZW4YAiABKAkSEwoLaW5zZWN1cmVUbHMYAyABKAgSGAoQZG9Ob3RTeW5jVG9DbG91ZBgEIAEoCCJVChVSZW1vdmVDbG91ZEFQSVJlcXVlc3QSEQoJY2xvdWROYW1lGAEgASgJEhAKCHVzZXJOYW1lGAIgASgJEhcKD3Blcm1hbmVudFJlbW92ZRgDIAEoCCJICg9DbG91ZEFQSVJlcXVlc3QSEQoJY2xvdWROYW1lGAEgASgJEhUKCHVzZXJOYW1lGAIgASgJSACIAQFCCwoJX3VzZXJOYW1lIpkBCglQcm94eUluZm8SKAoJcHJveHlUeXBlGAEgASgOMhUuY2xvdWRkcml2ZS5Qcm94eVR5cGUSDAoEaG9zdBgCIAEoCRIMCgRwb3J0GAMgASgNEhUKCHVzZXJuYW1lGAQgASgJSACIAQESFQoIcGFzc3dvcmQYBSABKAlIAYgBAUILCglfdXNlcm5hbWVCCwoJX3Bhc3N3b3JkIj8KGEdldENsb3VkQVBJQ29uZmlnUmVxdWVzdBIRCgljbG91ZE5hbWUYASABKAkSEAoIdXNlck5hbWUYAiABKAkiMgoMQ2xvdWRBUElMaXN0EiIKBGFwaXMYASADKAsyFC5jbG91ZGRyaXZlLkNsb3VkQVBJIvwECg5DbG91ZEFQSUNvbmZpZxIaChJtYXhEb3dubG9hZFRocmVhZHMYASABKA0SFwoPbWluUmVhZExlbmd0aEtCGAIgASgEEhcKD21heFJlYWRMZW5ndGhLQhgDIAEoBBIbChNkZWZhdWx0UmVhZExlbmd0aEtCGAQgASgEEhsKE21heEJ1ZmZlclBvb2xTaXplTUIYBSABKAQSGwoTbWF4UXVlcmllc1BlclNlY29uZBgGIAEoARIRCglmb3JjZUlwdjQYByABKAgSLAoIYXBpUHJveHkYCCABKAsyFS5jbG91ZGRyaXZlLlByb3h5SW5mb0gAiAEBEi0KCWRhdGFQcm94eRgJIAEoCzIVLmNsb3VkZHJpdmUuUHJveHlJbmZvSAGIAQESHAoPY3VzdG9tVXNlckFnZW50GAogASgJSAKIAQESHQoQbWF4VXBsb2FkVGhyZWFkcxgLIAEoDUgDiAEBEhgKC2luc2VjdXJlVGxzGAwgASgISASIAQESHAoPdXNlSHR0cERvd25sb2FkGA0gASgISAWIAQESHgoRc3VwcG9ydERpcmVjdExpbmsYDiABKAhIBogBARIlChhzdXBwb3J0RGlyZWN0RG93bmxvYWRVcmwYDyABKAhIB4gBAUILCglfYXBpUHJveHlCDAoKX2RhdGFQcm94eUISChBfY3VzdG9tVXNlckFnZW50QhMKEV9tYXhVcGxvYWRUaHJlYWRzQg4KDF9pbnNlY3VyZVRsc0ISChBfdXNlSHR0cERvd25sb2FkQhQKEl9zdXBwb3J0RGlyZWN0TGlua0IbChlfc3VwcG9ydERpcmVjdERvd25sb2FkVXJsImsKGFNldENsb3VkQVBJQ29uZmlnUmVxdWVzdBIRCgljbG91ZE5hbWUYASABKAkSEAoIdXNlck5hbWUYAiABKAkSKgoGY29uZmlnGAMgASgLMhouY2xvdWRkcml2ZS5DbG91ZEFQSUNvbmZpZyIhCg5Db21tYW5kUmVxdWVzdBIPCgdjb21tYW5kGAEgASgJIh8KDUNvbW1hbmRSZXN1bHQSDgoGcmVzdWx0GAEgASgJIhwKC1N0cmluZ1ZhbHVlEg0KBXZhbHVlGAEgASgJIlwKEVFSQ29kZVNjYW5NZXNzYWdlEjYKC21lc3NhZ2VUeXBlGAEgASgOMiEuY2xvdWRkcml2ZS5RUkNvZGVTY2FuTWVzc2FnZVR5cGUSDwoHbWVzc2FnZRgCIAEoCSIcCgpTdHJpbmdMaXN0Eg4KBnZhbHVlcxgBIAMoCSLkCwoOU3lzdGVtU2V0dGluZ3MSIwoWZGlyQ2FjaGVUaW1lVG9MaXZlU2VjcxgBIAEoBEgAiAEBEh8KEm1heFByZVByb2Nlc3NUYXNrcxgCIAEoBEgBiAEBEhwKD21heFByb2Nlc3NUYXNrcxgDIAEoBEgCiAEBEh0KEHRlbXBGaWxlTG9jYXRpb24YBCABKAlIA4gBARIaCg1zeW5jV2l0aENsb3VkGAUgASgISASIAQESJgoZcmVhZERvd25sb2FkZXJUaW1lb3V0U2VjcxgGIAEoBEgFiAEBEhwKD3VwbG9hZERlbGF5U2VjcxgHIAEoBEgGiAEBEjUKEHByb2Nlc3NCbGFja0xpc3QYCCABKAsyFi5jbG91ZGRyaXZlLlN0cmluZ0xpc3RIB4gBARI8Chd1cGxvYWRJZ25vcmVkRXh0ZW5zaW9ucxgJIAEoCzIWLmNsb3VkZHJpdmUuU3RyaW5nTGlzdEgIiAEBEjUKDXVwZGF0ZUNoYW5uZWwYCiABKA4yGS5jbG91ZGRyaXZlLlVwZGF0ZUNoYW5uZWxICYgBARIsCh9tYXhEb3dubG9hZFNwZWVkS0J5dGVzUGVyU2Vjb25kGAsgASgBSAqIAQESKgodbWF4VXBsb2FkU3BlZWRLQnl0ZXNQZXJTZWNvbmQYDCABKAFIC4gBARIXCgpkZXZpY2VOYW1lGA0gASgJSAyIAQESIAoTZGlyQ2FjaGVQZXJzaXN0ZW5jZRgOIAEoCEgNiAEBEh8KEmRpckNhY2hlRGJMb2NhdGlvbhgPIAEoCUgOiAEBEi8KDGZpbGVMb2dMZXZlbBgQIAEoDjIULmNsb3VkZHJpdmUuTG9nTGV2ZWxID4gBARIzChB0ZXJtaW5hbExvZ0xldmVsGBEgASgOMhQuY2xvdWRkcml2ZS5Mb2dMZXZlbEgQiAEBEjEKDmJhY2t1cExvZ0xldmVsGBIgASgOMhQuY2xvdWRkcml2ZS5Mb2dMZXZlbEgRiAEBEiUKGEVuYWJsZUF1dG9SZWdpc3RlckRldmljZRgTIAEoCEgSiAEBEjMKEHJlYWx0aW1lTG9nTGV2ZWwYFCABKA4yFC5jbG91ZGRyaXZlLkxvZ0xldmVsSBOIAQESOgoVb3BlcmF0b3JQcmlvcml0eU9yZGVyGBUgASgLMhYuY2xvdWRkcml2ZS5TdHJpbmdMaXN0SBSIAQESLwoLdXBkYXRlUHJveHkYFiABKAsyFS5jbG91ZGRyaXZlLlByb3h5SW5mb0gViAEBEhsKDnN0YXJ0RGVsYXlTZWNzGBcgASgESBaIAQFCGQoXX2RpckNhY2hlVGltZVRvTGl2ZVNlY3NCFQoTX21heFByZVByb2Nlc3NUYXNrc0ISChBfbWF4UHJvY2Vzc1Rhc2tzQhMKEV90ZW1wRmlsZUxvY2F0aW9uQhAKDl9zeW5jV2l0aENsb3VkQhwKGl9yZWFkRG93bmxvYWRlclRpbWVvdXRTZWNzQhIKEF91cGxvYWREZWxheVNlY3NCEwoRX3Byb2Nlc3NCbGFja0xpc3RCGgoYX3VwbG9hZElnbm9yZWRFeHRlbnNpb25zQhAKDl91cGRhdGVDaGFubmVsQiIKIF9tYXhEb3dubG9hZFNwZWVkS0J5dGVzUGVyU2Vjb25kQiAKHl9tYXhVcGxvYWRTcGVlZEtCeXRlc1BlclNlY29uZEINCgtfZGV2aWNlTmFtZUIWChRfZGlyQ2FjaGVQZXJzaXN0ZW5jZUIVChNfZGlyQ2FjaGVEYkxvY2F0aW9uQg8KDV9maWxlTG9nTGV2ZWxCEwoRX3Rlcm1pbmFsTG9nTGV2ZWxCEQoPX2JhY2t1cExvZ0xldmVsQhsKGV9FbmFibGVBdXRvUmVnaXN0ZXJEZXZpY2VCEwoRX3JlYWx0aW1lTG9nTGV2ZWxCGAoWX29wZXJhdG9yUHJpb3JpdHlPcmRlckIOCgxfdXBkYXRlUHJveHlCEQoPX3N0YXJ0RGVsYXlTZWNzImQKFlNldERpckNhY2hlVGltZVJlcXVlc3QSDAoEcGF0aBgBIAEoCRIiChVkaXJDYWNoVGltZVRvTGl2ZVNlY3MYAiABKARIAIgBAUIYChZfZGlyQ2FjaFRpbWVUb0xpdmVTZWNzIi8KH0dldEVmZmVjdGl2ZURpckNhY2hlVGltZVJlcXVlc3QSDAoEcGF0aBgBIAEoCSItChdHZXRPcGVuRmlsZVRhYmxlUmVxdWVzdBISCgppbmNsdWRlRGlyGAEgASgIIjoKHkdldEVmZmVjdGl2ZURpckNhY2hlVGltZVJlc3VsdBIYChBkaXJDYWNoZVRpbWVTZWNzGAEgASgEIkYKF0dldERpckNhY2hlRGJTaXplUmVzdWx0EhYKDnRvdGFsU2l6ZUJ5dGVzGAEgASgEEhMKC2lzVmFjdXVtaW5nGAIgASgIIpMCChRWYWN1dW1Qcm9ncmVzc1Jlc3VsdBIoCgZzdGF0dXMYASABKA4yGC5jbG91ZGRyaXZlLlZhY3V1bVN0YXR1cxIyCglzdGFydFRpbWUYAiABKAsyGi5nb29nbGUucHJvdG9idWYuVGltZXN0YW1wSACIAQESMAoHZW5kVGltZRgDIAEoCzIaLmdvb2dsZS5wcm90b2J1Zi5UaW1lc3RhbXBIAYgBARISCgpzaXplQmVmb3JlGAQgASgEEhEKCXNpemVBZnRlchgFIAEoBBIZCgxlcnJvck1lc3NhZ2UYBiABKAlIAogBAUIMCgpfc3RhcnRUaW1lQgoKCF9lbmRUaW1lQg8KDV9lcnJvck1lc3NhZ2UiSgoMVXBkYXRlUmVzdWx0EhEKCWhhc1VwZGF0ZRgBIAEoCBISCgpuZXdWZXJzaW9uGAIgASgJEhMKC2Rlc2NyaXB0aW9uGAMgASgJIqYBCg1PcGVuRmlsZVRhYmxlEkMKDW9wZW5GaWxlVGFibGUYASADKAsyLC5jbG91ZGRyaXZlLk9wZW5GaWxlVGFibGUuT3BlbkZpbGVUYWJsZUVudHJ5EhoKEmxvY2FsT3BlbkZpbGVDb3VudBgCIAEoBBo0ChJPcGVuRmlsZVRhYmxlRW50cnkSCwoDa2V5GAEgASgEEg0KBXZhbHVlGAIgASgJOgI4ASJ0CgxEaXJDYWNoZUl0ZW0SLgoKaW5zZXJ0VGltZRgBIAEoCzIaLmdvb2dsZS5wcm90b2J1Zi5UaW1lc3RhbXASFgoOdGltZVRvTGl2ZVNlY3MYAiABKAQSHAoUcmVmZXJlbmNlZFN1YmZpbGVMZW4YAyABKAQipAEKDURpckNhY2hlVGFibGUSQwoNZGlyQ2FjaGVUYWJsZRgBIAMoCzIsLmNsb3VkZHJpdmUuRGlyQ2FjaGVUYWJsZS5EaXJDYWNoZVRhYmxlRW50cnkaTgoSRGlyQ2FjaGVUYWJsZUVudHJ5EgsKA2tleRgBIAEoCRInCgV2YWx1ZRgCIAEoCzIYLmNsb3VkZHJpdmUuRGlyQ2FjaGVJdGVtOgI4ASIxCg1UZW1wRmlsZVRhYmxlEg0KBWNvdW50GAEgASgEEhEKCXRlbXBGaWxlcxgCIAMoCSIqChNDb25maXJtRW1haWxSZXF1ZXN0EhMKC2NvbmZpcm1Db2RlGAEgASgJIi0KHFNlbmRSZXNldEFjY291bnRFbWFpbFJlcXVlc3QSDQoFZW1haWwYASABKAkiPQoTUmVzZXRBY2NvdW50UmVxdWVzdBIRCglyZXNldENvZGUYASABKAkSEwoLbmV3UGFzc3dvcmQYAiABKAkirQIKDkNsb3VkRHJpdmVQbGFuEgoKAmlkGAEgASgJEgwKBG5hbWUYAiABKAkSEwoLZGVzY3JpcHRpb24YAyABKAkSDQoFcHJpY2UYBCABKAESFQoIZHVyYXRpb24YBSABKANIAIgBARIbChNkdXJhdGlvbkRlc2NyaXB0aW9uGAYgASgJEhAKCGlzQWN0aXZlGAcgASgIEhwKD2ZvbnRBd2Vzb21lSWNvbhgIIAEoCUgBiAEBEhoKDW9yaWdpbmFsUHJpY2UYCSABKAFIAogBARIqCglwbGFuUm9sZXMYCiADKAsyFy5jbG91ZGRyaXZlLkFjY291bnRSb2xlQgsKCV9kdXJhdGlvbkISChBfZm9udEF3ZXNvbWVJY29uQhAKDl9vcmlnaW5hbFByaWNlIkUKGEdldENsb3VkRHJpdmVQbGFuc1Jlc3VsdBIpCgVwbGFucxgBIAMoCzIaLmNsb3VkZHJpdmUuQ2xvdWREcml2ZVBsYW4iSQoPSm9pblBsYW5SZXF1ZXN0Eg4KBnBsYW5JZBgBIAEoCRIXCgpjb3Vwb25Db2RlGAIgASgJSACIAQFCDQoLX2NvdXBvbkNvZGUipQIKC1BheW1lbnRJbmZvEg8KB3VzZXJfaWQYASABKAkSDwoHcGxhbl9pZBgCIAEoCRJDCg5wYXltZW50TWV0aG9kcxgDIAMoCzIrLmNsb3VkZHJpdmUuUGF5bWVudEluZm8uUGF5bWVudE1ldGhvZHNFbnRyeRIYCgtjb3Vwb25fY29kZRgEIAEoCUgAiAEBEhcKCm1hY2hpbmVfaWQYBSABKAlIAYgBARIXCgpjaGVja19jb2RlGAYgASgJSAKIAQEaNQoTUGF5bWVudE1ldGhvZHNFbnRyeRILCgNrZXkYASABKAkSDQoFdmFsdWUYAiABKAk6AjgBQg4KDF9jb3Vwb25fY29kZUINCgtfbWFjaGluZV9pZEINCgtfY2hlY2tfY29kZSLkAQoOSm9pblBsYW5SZXN1bHQSDwoHc3VjY2VzcxgBIAEoCBIPCgdiYWxhbmNlGAIgASgBEhAKCHBsYW5OYW1lGAMgASgJEhcKD3BsYW5EZXNjcmlwdGlvbhgEIAEoCRIzCgpleHBpcmVUaW1lGAUgASgLMhouZ29vZ2xlLnByb3RvYnVmLlRpbWVzdGFtcEgAiAEBEjEKC3BheW1lbnRJbmZvGAYgASgLMhcuY2xvdWRkcml2ZS5QYXltZW50SW5mb0gBiAEBQg0KC19leHBpcmVUaW1lQg4KDF9wYXltZW50SW5mbyKZAQoJUHJvbW90aW9uEgoKAmlkGAEgASgJEhEKCWNsb3VkTmFtZRgCIAEoCRINCgV0aXRsZRgDIAEoCRIVCghzdWJUaXRsZRgEIAEoCUgAiAEBEg0KBXJ1bGVzGAUgASgJEhMKBm5vdGljZRgGIAEoCUgBiAEBEgsKA3VybBgHIAEoCUILCglfc3ViVGl0bGVCCQoHX25vdGljZSJAChNHZXRQcm9tb3Rpb25zUmVzdWx0EikKCnByb21vdGlvbnMYASADKAsyFS5jbG91ZGRyaXZlLlByb21vdGlvbiKSAQojVXBkYXRlUHJvbW90aW9uUmVzdWx0QnlDbG91ZFJlcXVlc3QSEQoJY2xvdWROYW1lGAEgASgJEhsKDmNsb3VkQWNjb3VudElkGAIgASgJSACIAQESGAoLcHJvbW90aW9uSWQYAyABKAlIAYgBAUIRCg9fY2xvdWRBY2NvdW50SWRCDgoMX3Byb21vdGlvbklkIokBChpTZW5kUHJvbW90aW9uQWN0aW9uUmVxdWVzdBIRCgljbG91ZE5hbWUYASABKAkSGwoOY2xvdWRBY2NvdW50SWQYAiABKAlIAIgBARIYCgtwcm9tb3Rpb25JZBgDIAEoCUgBiAEBQhEKD19jbG91ZEFjY291bnRJZEIOCgxfcHJvbW90aW9uSWQiLQoNT2ZmbGluZVN0YXR1cxINCgVxdW90YRgBIAEoDRINCgV0b3RhbBgCIAEoDSLPAQoLT2ZmbGluZUZpbGUSDAoEbmFtZRgBIAEoCRIMCgRzaXplGAIgASgEEgsKA3VybBgDIAEoCRItCgZzdGF0dXMYBCABKA4yHS5jbG91ZGRyaXZlLk9mZmxpbmVGaWxlU3RhdHVzEhAKCGluZm9IYXNoGAUgASgJEg4KBmZpbGVJZBgGIAEoCRIQCghhZGRfdGltZRgHIAEoBBIQCghwYXJlbnRJZBgIIAEoCRITCgtwZXJjZW5kRG9uZRgJIAEoARINCgVwZWVycxgKIAEoBCJwChlPZmZsaW5lRmlsZUxpc3RBbGxSZXF1ZXN0EhEKCWNsb3VkTmFtZRgBIAEoCRIWCg5jbG91ZEFjY291bnRJZBgCIAEoCRIMCgRwYWdlGAMgASgNEhEKBHBhdGgYBCABKAlIAIgBAUIHCgVfcGF0aCLBAQoYT2ZmbGluZUZpbGVMaXN0QWxsUmVzdWx0Eg4KBnBhZ2VObxgBIAEoDRIUCgxwYWdlUm93Q291bnQYAiABKA0SEQoJcGFnZUNvdW50GAMgASgNEhIKCnRvdGFsQ291bnQYBCABKA0SKQoGc3RhdHVzGAUgASgLMhkuY2xvdWRkcml2ZS5PZmZsaW5lU3RhdHVzEi0KDG9mZmxpbmVGaWxlcxgGIAMoCzIXLmNsb3VkZHJpdmUuT2ZmbGluZUZpbGUicQoVT2ZmbGluZUZpbGVMaXN0UmVzdWx0Ei0KDG9mZmxpbmVGaWxlcxgBIAMoCzIXLmNsb3VkZHJpdmUuT2ZmbGluZUZpbGUSKQoGc3RhdHVzGAIgASgLMhkuY2xvdWRkcml2ZS5PZmZsaW5lU3RhdHVzIlwKE09mZmxpbmVRdW90YVJlcXVlc3QSEQoJY2xvdWROYW1lGAEgASgJEhYKDmNsb3VkQWNjb3VudElkGAIgASgJEhEKBHBhdGgYAyABKAlIAIgBAUIHCgVfcGF0aCI9ChBPZmZsaW5lUXVvdGFJbmZvEg0KBXRvdGFsGAEgASgFEgwKBHVzZWQYAiABKAUSDAoEbGVmdBgDIAEoBSLuAQoXQ2xlYXJPZmZsaW5lRmlsZVJlcXVlc3QSEQoJY2xvdWROYW1lGAEgASgJEhYKDmNsb3VkQWNjb3VudElkGAIgASgJEjoKBmZpbHRlchgDIAEoDjIqLmNsb3VkZHJpdmUuQ2xlYXJPZmZsaW5lRmlsZVJlcXVlc3QuRmlsdGVyEhMKC2RlbGV0ZUZpbGVzGAQgASgIEhEKBHBhdGgYBSABKAlIAIgBASI7CgZGaWx0ZXISBwoDQWxsEAASDAoIRmluaXNoZWQQARIJCgVFcnJvchACEg8KC0Rvd25sb2FkaW5nEANCBwoFX3BhdGgikwEKGVJlc3RhcnRPZmZsaW5lRmlsZVJlcXVlc3QSEQoJY2xvdWROYW1lGAEgASgJEhYKDmNsb3VkQWNjb3VudElkGAIgASgJEhAKCGluZm9IYXNoGAMgASgJEgsKA3VybBgEIAEoCRIQCghwYXJlbnRJZBgFIAEoCRIRCgRwYXRoGAYgASgJSACIAQFCBwoFX3BhdGgiRAoXQmluZENsb3VkQWNjb3VudFJlcXVlc3QSEQoJY2xvdWROYW1lGAEgASgJEhYKDmNsb3VkQWNjb3VudElkGAIgASgJIk4KFlRyYW5zZmVyQmFsYW5jZVJlcXVlc3QSEgoKdG9Vc2VyTmFtZRgBIAEoCRIOCgZhbW91bnQYAiABKAESEAoIcGFzc3dvcmQYAyABKAkiQAoaU2VuZENoYW5nZUVtYWlsQ29kZVJlcXVlc3QSEAoIbmV3RW1haWwYASABKAkSEAoIcGFzc3dvcmQYAiABKAkihAEKEkNoYW5nZUVtYWlsUmVxdWVzdBIQCghuZXdFbWFpbBgBIAEoCRIQCghwYXNzd29yZBgCIAEoCRIXCgpjaGFuZ2VDb2RlGAMgASgJSACIAQESFQoIdG90cENvZGUYBCABKAlIAYgBAUINCgtfY2hhbmdlQ29kZUILCglfdG90cENvZGUiZQodQ2hhbmdlRW1haWxBbmRQYXNzd29yZFJlcXVlc3QSEAoIbmV3RW1haWwYASABKAkSEwoLbmV3UGFzc3dvcmQYAiABKAkSHQoVc3luY1VzZXJEYXRhV2l0aENsb3VkGAMgASgIIrsCCgpCYWxhbmNlTG9nEhYKDmJhbGFuY2VfYmVmb3JlGAEgASgBEhUKDWJhbGFuY2VfYWZ0ZXIYAiABKAESFgoOYmFsYW5jZV9jaGFuZ2UYAyABKAESQQoJb3BlcmF0aW9uGAQgASgOMi4uY2xvdWRkcml2ZS5CYWxhbmNlTG9nLkJhbGFuY2NlQ2hhbmdlT3BlcmF0aW9uEhgKEG9wZXJhdGlvbl9zb3VyY2UYBSABKAkSFAoMb3BlcmF0aW9uX2lkGAYgASgJEjIKDm9wZXJhdGlvbl90aW1lGAcgASgLMhouZ29vZ2xlLnByb3RvYnVmLlRpbWVzdGFtcCI/ChdCYWxhbmNjZUNoYW5nZU9wZXJhdGlvbhILCgdVbmtub3duEAASCwoHRGVwb3NpdBABEgoKBlJlZnVuZBACIjgKEEJhbGFuY2VMb2dSZXN1bHQSJAoEbG9ncxgBIAMoCzIWLmNsb3VkZHJpdmUuQmFsYW5jZUxvZyI8ChZDaGVja0ZpbmFsUHJpY2VSZXF1ZXN0Eg4KBnBsYW5JZBgBIAEoCRISCgpjb3Vwb25Db2RlGAIgASgJIqsBChVDaGVja0ZpbmFsUHJpY2VSZXN1bHQSDgoGcGxhbklkGAEgASgJEhEKCXBsYW5QcmljZRgCIAEoARITCgt1c2VyQmFsYW5jZRgDIAEoARIcChRjb3Vwb25EaXNjb3VudEFtb3VudBgEIAEoARIYCgtjb3Vwb25FcnJvchgFIAEoCUgAiAEBEhIKCmZpbmFsUHJpY2UYBiABKAFCDgoMX2NvdXBvbkVycm9yIlYKGUNoZWNrQWN0aXZhdGlvbkNvZGVSZXN1bHQSDgoGcGxhbklkGAEgASgJEhAKCHBsYW5OYW1lGAIgASgJEhcKD3BsYW5EZXNjcmlwdGlvbhgDIAEoCSI8ChZDaGVja0NvdXBvbkNvZGVSZXF1ZXN0Eg4KBnBsYW5JZBgBIAEoCRISCgpjb3Vwb25Db2RlGAIgASgJInUKEENvdXBvbkNvZGVSZXN1bHQSEgoKY291cG9uQ29kZRgBIAEoCRIZChFjb3Vwb25EZXNjcmlwdGlvbhgCIAEoCRIUCgxpc1BlcmNlbnRhZ2UYAyABKAgSHAoUY291cG9uRGlzY291bnRBbW91bnQYBCABKAEi0AEKDkZpbGVCYWNrdXBSdWxlEhQKCmV4dGVuc2lvbnMYASABKAlIABITCglmaWxlTmFtZXMYAiABKAlIABIPCgVyZWdleBgDIAEoCUgAEhEKB21pblNpemUYBCABKARIABIRCglpc0VuYWJsZWQYZCABKAgSEwoLaXNCbGFja0xpc3QYZSABKAgSFQoNYXBwbHlUb0ZvbGRlchhmIAEoCBIYCgthcHBseVRvRmlsZRhnIAEoCEgBiAEBQgYKBHJ1bGVCDgoMX2FwcGx5VG9GaWxlIosBChFCYWNrdXBEZXN0aW5hdGlvbhIXCg9kZXN0aW5hdGlvblBhdGgYASABKAkSEQoJaXNFbmFibGVkGAIgASgIEjcKDmxhc3RGaW5pc2hUaW1lGAMgASgLMhouZ29vZ2xlLnByb3RvYnVmLlRpbWVzdGFtcEgAiAEBQhEKD19sYXN0RmluaXNoVGltZSIgCgpEYXlzT2ZXZWVrEhIKCmRheXNPZldlZWsYASADKA0ijwEKDFRpbWVTY2hlZHVsZRIRCglpc0VuYWJsZWQYASABKAgSDAoEaG91chgCIAEoDRIOCgZtaW51dGUYAyABKA0SDgoGc2Vjb25kGAQgASgNEi8KCmRheXNPZldlZWsYBSABKAsyFi5jbG91ZGRyaXZlLkRheXNPZldlZWtIAIgBAUINCgtfZGF5c09mV2VlayKUBAoGQmFja3VwEhIKCnNvdXJjZVBhdGgYASABKAkSMwoMZGVzdGluYXRpb25zGAIgAygLMh0uY2xvdWRkcml2ZS5CYWNrdXBEZXN0aW5hdGlvbhIzCg9maWxlQmFja3VwUnVsZXMYAyADKAsyGi5jbG91ZGRyaXZlLkZpbGVCYWNrdXBSdWxlEjQKD2ZpbGVSZXBsYWNlUnVsZRgEIAEoDjIbLmNsb3VkZHJpdmUuRmlsZVJlcGxhY2VSdWxlEjIKDmZpbGVEZWxldGVSdWxlGAUgASgOMhouY2xvdWRkcml2ZS5GaWxlRGVsZXRlUnVsZRI6ChJmaWxlQ29tcGxldGlvblJ1bGUYDSABKA4yHi5jbG91ZGRyaXZlLkZpbGVDb21wbGV0aW9uUnVsZRIRCglpc0VuYWJsZWQYBiABKAgSHgoWZmlsZVN5c3RlbVdhdGNoRW5hYmxlZBgHIAEoCBIiChp3YWxraW5nVGhyb3VnaEludGVydmFsU2VjcxgIIAEoAxIiChpmb3JjZVdhbGtpbmdUaHJvdWdoT25TdGFydBgJIAEoCBIvCg10aW1lU2NoZWR1bGVzGAogAygLMhguY2xvdWRkcml2ZS5UaW1lU2NoZWR1bGUSHgoWaXNUaW1lU2NoZWR1bGVzRW5hYmxlZBgLIAEoCBIaChJzeW5jRGVsZXRlRnJvbURlc3QYDiABKAgitQMKDEJhY2t1cFN0YXR1cxIiCgZiYWNrdXAYASABKAsyEi5jbG91ZGRyaXZlLkJhY2t1cBIvCgZzdGF0dXMYAiABKA4yHy5jbG91ZGRyaXZlLkJhY2t1cFN0YXR1cy5TdGF0dXMSFQoNc3RhdHVzTWVzc2FnZRgDIAEoCRI/Cg13YXRjaGVyU3RhdHVzGAQgASgOMiguY2xvdWRkcml2ZS5CYWNrdXBTdGF0dXMuRmlsZVdhdGNoU3RhdHVzEhwKFHdhdGNoZXJTdGF0dXNNZXNzYWdlGAUgASgJEiUKBmVycm9ycxgHIAMoCzIVLmNsb3VkZHJpdmUuVGFza0Vycm9yIloKBlN0YXR1cxIICgRJZGxlEAASEgoOV2Fsa2luZ1Rocm91Z2gQARIJCgVFcnJvchACEgwKCERpc2FibGVkEAMSCwoHU2Nhbm5lZBAEEgwKCEZpbmlzaGVkEAUiVwoPRmlsZVdhdGNoU3RhdHVzEg8KC1dhdGNoZXJJZGxlEAASDAoIV2F0Y2hpbmcQARIQCgxXYXRjaGVyRXJyb3IQAhITCg9XYXRjaGVyRGlzYWJsZWQQAyI3CgpCYWNrdXBMaXN0EikKB2JhY2t1cHMYASADKAsyGC5jbG91ZGRyaXZlLkJhY2t1cFN0YXR1cyK2AwoTQmFja3VwTW9kaWZ5UmVxdWVzdBISCgpzb3VyY2VQYXRoGAEgASgJEjMKDGRlc3RpbmF0aW9ucxgCIAMoCzIdLmNsb3VkZHJpdmUuQmFja3VwRGVzdGluYXRpb24SMwoPZmlsZUJhY2t1cFJ1bGVzGAMgAygLMhouY2xvdWRkcml2ZS5GaWxlQmFja3VwUnVsZRI5Cg9maWxlUmVwbGFjZVJ1bGUYBCABKA4yGy5jbG91ZGRyaXZlLkZpbGVSZXBsYWNlUnVsZUgAiAEBEjcKDmZpbGVEZWxldGVSdWxlGAUgASgOMhouY2xvdWRkcml2ZS5GaWxlRGVsZXRlUnVsZUgBiAEBEiMKFmZpbGVTeXN0ZW1XYXRjaEVuYWJsZWQYBiABKAhIAogBARInChp3YWxraW5nVGhyb3VnaEludGVydmFsU2VjcxgHIAEoA0gDiAEBQhIKEF9maWxlUmVwbGFjZVJ1bGVCEQoPX2ZpbGVEZWxldGVSdWxlQhkKF19maWxlU3lzdGVtV2F0Y2hFbmFibGVkQh0KG193YWxraW5nVGhyb3VnaEludGVydmFsU2VjcyJAChdCYWNrdXBTZXRFbmFibGVkUmVxdWVzdBISCgpzb3VyY2VQYXRoGAEgASgJEhEKCWlzRW5hYmxlZBgCIAEoCCKWAQoGRGV2aWNlEhAKCGRldmljZUlkGAEgASgJEhIKCmRldmljZU5hbWUYAiABKAkSDgoGb3NUeXBlGAMgASgJEg8KB3ZlcnNpb24YBCABKAkSEQoJaXBBZGRyZXNzGAUgASgJEjIKDmxhc3RVcGRhdGVUaW1lGAYgASgLMhouZ29vZ2xlLnByb3RvYnVmLlRpbWVzdGFtcCI0Cg1PbmxpbmVEZXZpY2VzEiMKB2RldmljZXMYASADKAsyEi5jbG91ZGRyaXZlLkRldmljZSIhCg1EZXZpY2VSZXF1ZXN0EhAKCGRldmljZUlkGAEgASgJInwKDUxvZ0ZpbGVSZWNvcmQSEAoIZmlsZU5hbWUYASABKAkSNAoQbGFzdE1vZGlmaWVkVGltZRgCIAEoCzIaLmdvb2dsZS5wcm90b2J1Zi5UaW1lc3RhbXASEAoIZmlsZVNpemUYAyABKAQSEQoJc2lnbmF0dXJlGAQgASgJIkAKEUxpc3RMb2dGaWxlUmVzdWx0EisKCGxvZ0ZpbGVzGAEgAygLMhkuY2xvdWRkcml2ZS5Mb2dGaWxlUmVjb3JkIlsKGkZpbGVTeXN0ZW1DaGFuZ2VTdGF0aXN0aWNzEhMKC2NyZWF0ZUNvdW50GAEgASgEEhMKC2RlbGV0ZUNvdW50GAIgASgEEhMKC3JlbmFtZUNvdW50GAMgASgEIl4KF1dhbGtUaHJvdWdoRm9sZGVyUmVzdWx0EhgKEHRvdGFsRm9sZGVyQ291bnQYASABKAQSFgoOdG90YWxGaWxlQ291bnQYAiABKAQSEQoJdG90YWxTaXplGAMgASgEIjMKDldlYmhvb2tSZXF1ZXN0EhAKCGZpbGVOYW1lGAEgASgJEg8KB2NvbnRlbnQYAiABKAkiQQoLV2ViaG9va0luZm8SEAoIZmlsZU5hbWUYASABKAkSDwoHY29udGVudBgCIAEoCRIPCgdpc1ZhbGlkGAMgASgIIjgKC1dlYmhvb2tMaXN0EikKCHdlYmhvb2tzGAEgAygLMhcuY2xvdWRkcml2ZS5XZWJob29rSW5mbyK/AQoRQWRkRGF2VXNlclJlcXVlc3QSEAoIdXNlck5hbWUYASABKAkSEAoIcGFzc3dvcmQYAiABKAkSFQoIcm9vdFBhdGgYAyABKAlIAIgBARIVCghyZWFkT25seRgEIAEoCEgBiAEBEhQKB2VuYWJsZWQYBSABKAhIAogBARISCgVndWVzdBgGIAEoCEgDiAEBQgsKCV9yb290UGF0aEILCglfcmVhZE9ubHlCCgoIX2VuYWJsZWRCCAoGX2d1ZXN0ItQBChRNb2RpZnlEYXZVc2VyUmVxdWVzdBIQCgh1c2VyTmFtZRgBIAEoCRIVCghwYXNzd29yZBgCIAEoCUgAiAEBEhUKCHJvb3RQYXRoGAMgASgJSAGIAQESFQoIcmVhZE9ubHkYBCABKAhIAogBARIUCgdlbmFibGVkGAUgASgISAOIAQESEgoFZ3Vlc3QYBiABKAhIBIgBAUILCglfcGFzc3dvcmRCCwoJX3Jvb3RQYXRoQgsKCV9yZWFkT25seUIKCghfZW5hYmxlZEIICgZfZ3Vlc3QicQoHRGF2VXNlchIQCgh1c2VyTmFtZRgBIAEoCRIQCghwYXNzd29yZBgCIAEoCRIQCghyb290UGF0aBgDIAEoCRIQCghyZWFkT25seRgEIAEoCBIPCgdlbmFibGVkGAUgASgIEg0KBWd1ZXN0GAYgASgIIrsCCg9EYXZTZXJ2ZXJDb25maWcSGAoQZGF2U2VydmVyRW5hYmxlZBgBIAEoCBIVCg1kYXZTZXJ2ZXJQYXRoGAIgASgJEh8KF2VuYWJsZUNsb3VkZHJpdmVBY2NvdW50GAMgASgIEiEKGWNsb3VkZHJpdmVBY2NvdW50Um9vdFBhdGgYBCABKAkSIQoZY2xvdWRkcml2ZUFjY291bnRSZWFkT25seRgFIAEoCBIdChVlbmFibGVBbm9ueW1vdXNBY2Nlc3MYBiABKAgSGQoRYW5vbnltb3VzUm9vdFBhdGgYByABKAkSGQoRYW5vbnltb3VzUmVhZE9ubHkYCCABKAgSIgoFdXNlcnMYCSADKAsyEy5jbG91ZGRyaXZlLkRhdlVzZXISFwoPZW5hYmxlQWNjZXNzTG9nGAogASgIIvoDChxNb2RpZnlEYXZTZXJ2ZXJDb25maWdSZXF1ZXN0EhwKD2VuYWJsZURhdlNlcnZlchgBIAEoCEgAiAEBEiQKF2VuYWJsZUNsb3VkZHJpdmVBY2NvdW50GAIgASgISAGIAQESJgoZY2xvdWRkcml2ZUFjY291bnRSb290UGF0aBgDIAEoCUgCiAEBEiYKGWNsb3VkZHJpdmVBY2NvdW50UmVhZE9ubHkYBCABKAhIA4gBARIiChVlbmFibGVBbm9ueW1vdXNBY2Nlc3MYBSABKAhIBIgBARIeChFhbm9ueW1vdXNSb290UGF0aBgGIAEoCUgFiAEBEh4KEWFub255bW91c1JlYWRPbmx5GAcgASgISAaIAQESHAoPZW5hYmxlQWNjZXNzTG9nGAggASgISAeIAQFCEgoQX2VuYWJsZURhdlNlcnZlckIaChhfZW5hYmxlQ2xvdWRkcml2ZUFjY291bnRCHAoaX2Nsb3VkZHJpdmVBY2NvdW50Um9vdFBhdGhCHAoaX2Nsb3VkZHJpdmVBY2NvdW50UmVhZE9ubHlCGAoWX2VuYWJsZUFub255bW91c0FjY2Vzc0IUChJfYW5vbnltb3VzUm9vdFBhdGhCFAoSX2Fub255bW91c1JlYWRPbmx5QhIKEF9lbmFibGVBY2Nlc3NMb2ciLwoaUmVtb3RlVXBsb2FkQ2hhbm5lbFJlcXVlc3QSEQoJZGV2aWNlX2lkGAEgASgJIukBChhSZW1vdGVVcGxvYWRDaGFubmVsUmVwbHkSEQoJdXBsb2FkX2lkGAEgASgJEjYKCXJlYWRfZGF0YRgCIAEoCzIhLmNsb3VkZHJpdmUuUmVtb3RlUmVhZERhdGFSZXF1ZXN0SAASNgoJaGFzaF9kYXRhGAMgASgLMiEuY2xvdWRkcml2ZS5SZW1vdGVIYXNoRGF0YVJlcXVlc3RIABI/Cg5zdGF0dXNfY2hhbmdlZBgEIAEoCzIlLmNsb3VkZHJpdmUuUmVtb3RlVXBsb2FkU3RhdHVzQ2hhbmdlZEgAQgkKB3JlcXVlc3QizgEKGlJlbW90ZVVwbG9hZENvbnRyb2xSZXF1ZXN0EhEKCXVwbG9hZF9pZBgBIAEoCRIwCgZjYW5jZWwYAiABKAsyHi5jbG91ZGRyaXZlLkNhbmNlbFJlbW90ZVVwbG9hZEgAEi4KBXBhdXNlGAMgASgLMh0uY2xvdWRkcml2ZS5QYXVzZVJlbW90ZVVwbG9hZEgAEjAKBnJlc3VtZRgEIAEoCzIeLmNsb3VkZHJpdmUuUmVzdW1lUmVtb3RlVXBsb2FkSABCCQoHY29udHJvbCLmAQoYU3RhcnRSZW1vdGVVcGxvYWRSZXF1ZXN0EhEKCWZpbGVfcGF0aBgBIAEoCRIRCglmaWxlX3NpemUYAiABKAQSSwoMa25vd25faGFzaGVzGAMgAygLMjUuY2xvdWRkcml2ZS5TdGFydFJlbW90ZVVwbG9hZFJlcXVlc3QuS25vd25IYXNoZXNFbnRyeRIjChtjbGllbnRfY2FuX2NhbGN1bGF0ZV9oYXNoZXMYBCABKAgaMgoQS25vd25IYXNoZXNFbnRyeRILCgNrZXkYASABKA0SDQoFdmFsdWUYAiABKAk6AjgBIhQKEkNhbmNlbFJlbW90ZVVwbG9hZCIoChNSZW1vdGVVcGxvYWRTdGFydGVkEhEKCXVwbG9hZF9pZBgBIAEoCSJDChRSZW1vdGVVcGxvYWRQcm9ncmVzcxIWCg5ieXRlc191cGxvYWRlZBgBIAEoBBITCgt0b3RhbF9ieXRlcxgCIAEoBCIcChpSZW1vdGVSYXBpZFVwbG9hZENvbXBsZXRlZCIXChVSZW1vdGVVcGxvYWRDb21wbGV0ZWQiKwoSUmVtb3RlVXBsb2FkRmFpbGVkEhUKDWVycm9yX21lc3NhZ2UYASABKAkiSgoVUmVtb3RlUmVhZERhdGFSZXF1ZXN0Eg4KBm9mZnNldBgBIAEoBBIOCgZsZW5ndGgYAiABKAQSEQoJbGF6eV9yZWFkGAMgASgIIoEBChRSZW1vdGVSZWFkRGF0YVVwbG9hZBIRCgl1cGxvYWRfaWQYASABKAkSDgoGb2Zmc2V0GAMgASgEEg4KBmxlbmd0aBgEIAEoBBIRCglsYXp5X3JlYWQYBSABKAgSDAoEZGF0YRgGIAEoDBIVCg1pc19sYXN0X2NodW5rGAcgASgIImwKE1JlbW90ZVJlYWREYXRhUmVwbHkSDwoHc3VjY2VzcxgBIAEoCBIVCg1lcnJvcl9tZXNzYWdlGAIgASgJEhYKDmJ5dGVzX3JlY2VpdmVkGAMgASgEEhUKDWlzX2xhc3RfY2h1bmsYBCABKAgiUgoVUmVtb3RlSGFzaERhdGFSZXF1ZXN0EhEKCWhhc2hfdHlwZRgCIAEoDRIXCgpibG9ja19zaXplGAMgASgNSACIAQFCDQoLX2Jsb2NrX3NpemUiZQoZUmVtb3RlVXBsb2FkU3RhdHVzQ2hhbmdlZBIxCgZzdGF0dXMYASABKA4yIS5jbG91ZGRyaXZlLlVwbG9hZEZpbGVJbmZvLlN0YXR1cxIVCg1lcnJvcl9tZXNzYWdlGAIgASgJIhMKEVBhdXNlUmVtb3RlVXBsb2FkIhQKElJlc3VtZVJlbW90ZVVwbG9hZCLOAQoYUmVtb3RlSGFzaFByb2dyZXNzVXBsb2FkEhEKCXVwbG9hZF9pZBgBIAEoCRIUCgxieXRlc19oYXNoZWQYAiABKAQSEwoLdG90YWxfYnl0ZXMYAyABKAQSNgoJaGFzaF90eXBlGAQgASgOMiMuY2xvdWRkcml2ZS5DbG91ZERyaXZlRmlsZS5IYXNoVHlwZRIXCgpoYXNoX3ZhbHVlGAUgASgJSACIAQESFAoMYmxvY2tfaGFzaGVzGAYgAygJQg0KC19oYXNoX3ZhbHVlIhkKF1JlbW90ZUhhc2hQcm9ncmVzc1JlcGx5Is0JChBUb2tlblBlcm1pc3Npb25zEhIKCmFsbG93X2xpc3QYASABKAgSFAoMYWxsb3dfc2VhcmNoGAIgASgIEhgKEGFsbG93X2xpc3RfbG9jYWwYAyABKAgSGwoTYWxsb3dfY3JlYXRlX2ZvbGRlchgEIAEoCBIZChFhbGxvd19jcmVhdGVfZmlsZRgFIAEoCBITCgthbGxvd193cml0ZRgGIAEoCBISCgphbGxvd19yZWFkGAcgASgIEhQKDGFsbG93X3JlbmFtZRgIIAEoCBISCgphbGxvd19tb3ZlGAkgASgIEhIKCmFsbG93X2NvcHkYCiABKAgSFAoMYWxsb3dfZGVsZXRlGAsgASgIEiAKGGFsbG93X2RlbGV0ZV9wZXJtYW5lbnRseRgMIAEoCBIcChRhbGxvd19jcmVhdGVfZW5jcnlwdBgNIAEoCBIeChZhbGxvd191bmxvY2tfZW5jcnlwdGVkGA4gASgIEhwKFGFsbG93X2xvY2tfZW5jcnlwdGVkGA8gASgIEiIKGmFsbG93X2FkZF9vZmZsaW5lX2Rvd25sb2FkGBAgASgIEiQKHGFsbG93X2xpc3Rfb2ZmbGluZV9kb3dubG9hZHMYESABKAgSJgoeYWxsb3dfbW9kaWZ5X29mZmxpbmVfZG93bmxvYWRzGBIgASgIEhoKEmFsbG93X3NoYXJlZF9saW5rcxgTIAEoCBIdChVhbGxvd192aWV3X3Byb3BlcnRpZXMYFCABKAgSHAoUYWxsb3dfZ2V0X3NwYWNlX2luZm8YFSABKAgSHwoXYWxsb3dfdmlld19ydW50aW1lX2luZm8YFiABKAgSGgoSYWxsb3dfcHVzaF9tZXNzYWdlGCkgASgIEh0KFWFsbG93X2dldF9tZW1iZXJzaGlwcxgXIAEoCBIgChhhbGxvd19tb2RpZnlfbWVtYmVyc2hpcHMYGCABKAgSGAoQYWxsb3dfZ2V0X21vdW50cxgZIAEoCBIbChNhbGxvd19tb2RpZnlfbW91bnRzGBogASgIEiAKGGFsbG93X2dldF90cmFuc2Zlcl90YXNrcxgbIAEoCBIjChthbGxvd19tb2RpZnlfdHJhbnNmZXJfdGFza3MYHCABKAgSHAoUYWxsb3dfZ2V0X2Nsb3VkX2FwaXMYHSABKAgSHwoXYWxsb3dfbW9kaWZ5X2Nsb3VkX2FwaXMYHiABKAgSIQoZYWxsb3dfZ2V0X3N5c3RlbV9zZXR0aW5ncxgfIAEoCBIkChxhbGxvd19tb2RpZnlfc3lzdGVtX3NldHRpbmdzGCAgASgIEhkKEWFsbG93X2dldF9iYWNrdXBzGCEgASgIEhwKFGFsbG93X21vZGlmeV9iYWNrdXBzGCIgASgIEhwKFGFsbG93X2dldF9kYXZfY29uZmlnGCMgASgIEh8KF2FsbG93X21vZGlmeV9kYXZfY29uZmlnGCQgASgIEh4KFmFsbG93X3Rva2VuX21hbmFnZW1lbnQYJSABKAgSHgoWYWxsb3dfZ2V0X2FjY291bnRfaW5mbxgmIAEoCBIcChRhbGxvd19tb2RpZnlfYWNjb3VudBgnIAEoCBIdChVhbGxvd19zZXJ2aWNlX2NvbnRyb2wYKCABKAgi0QEKCVRva2VuSW5mbxINCgV0b2tlbhgBIAEoCRIPCgdyb290RGlyGAIgASgJEjEKC3Blcm1pc3Npb25zGAMgASgLMhwuY2xvdWRkcml2ZS5Ub2tlblBlcm1pc3Npb25zEhcKCmV4cGlyZXNfaW4YBCABKARIAIgBARIVCg1mcmllbmRseV9uYW1lGAUgASgJEhUKDWVuYWJsZUdycGNMb2cYBiABKAgSGwoTZW5hYmxlU3RyZWFtRmlsZUxvZxgHIAEoCEINCgtfZXhwaXJlc19pbiL/AQoSQ3JlYXRlVG9rZW5SZXF1ZXN0Eg8KB3Jvb3REaXIYASABKAkSMQoLcGVybWlzc2lvbnMYAiABKAsyHC5jbG91ZGRyaXZlLlRva2VuUGVybWlzc2lvbnMSFQoNZnJpZW5kbHlfbmFtZRgDIAEoCRIXCgpleHBpcmVzX2luGAQgASgESACIAQESGgoNZW5hYmxlR3JwY0xvZxgFIAEoCEgBiAEBEiAKE2VuYWJsZVN0cmVhbUZpbGVMb2cYBiABKAhIAogBAUINCgtfZXhwaXJlc19pbkIQCg5fZW5hYmxlR3JwY0xvZ0IWChRfZW5hYmxlU3RyZWFtRmlsZUxvZyLLAgoSTW9kaWZ5VG9rZW5SZXF1ZXN0Eg0KBXRva2VuGAEgASgJEhQKB3Jvb3REaXIYAiABKAlIAIgBARI2CgtwZXJtaXNzaW9ucxgDIAEoCzIcLmNsb3VkZHJpdmUuVG9rZW5QZXJtaXNzaW9uc0gBiAEBEhoKDWZyaWVuZGx5X25hbWUYBCABKAlIAogBARIXCgpleHBpcmVzX2luGAUgASgESAOIAQESGgoNZW5hYmxlR3JwY0xvZxgGIAEoCEgEiAEBEiAKE2VuYWJsZVN0cmVhbUZpbGVMb2cYByABKAhIBYgBAUIKCghfcm9vdERpckIOCgxfcGVybWlzc2lvbnNCEAoOX2ZyaWVuZGx5X25hbWVCDQoLX2V4cGlyZXNfaW5CEAoOX2VuYWJsZUdycGNMb2dCFgoUX2VuYWJsZVN0cmVhbUZpbGVMb2ciOQoQTGlzdFRva2Vuc1Jlc3VsdBIlCgZ0b2tlbnMYASADKAsyFS5jbG91ZGRyaXZlLlRva2VuSW5mbyKYAQoPV2ViU2VydmVyQ29uZmlnEhEKCWh0dHBfcG9ydBgBIAEoDRISCgpodHRwc19wb3J0GAIgASgNEhYKCWNlcnRfZmlsZRgDIAEoCUgAiAEBEhUKCGtleV9maWxlGAQgASgJSAGIAQESFAoMZW5hYmxlX2h0dHBzGAUgASgIQgwKCl9jZXJ0X2ZpbGVCCwoJX2tleV9maWxlIrUCChlTZXRXZWJTZXJ2ZXJDb25maWdSZXF1ZXN0EhYKCWh0dHBfcG9ydBgBIAEoDUgAiAEBEhcKCmh0dHBzX3BvcnQYAiABKA1IAYgBARIWCgljZXJ0X2ZpbGUYAyABKAlIAogBARIVCghrZXlfZmlsZRgEIAEoCUgDiAEBEhkKDGVuYWJsZV9odHRwcxgFIAEoCEgEiAEBEhkKDGNlcnRfY29udGVudBgGIAEoCUgFiAEBEhgKC2tleV9jb250ZW50GAcgASgJSAaIAQFCDAoKX2h0dHBfcG9ydEINCgtfaHR0cHNfcG9ydEIMCgpfY2VydF9maWxlQgsKCV9rZXlfZmlsZUIPCg1fZW5hYmxlX2h0dHBzQg8KDV9jZXJ0X2NvbnRlbnRCDgoMX2tleV9jb250ZW50IjgKHUdlbmVyYXRlU2VsZlNpZ25lZENlcnRSZXF1ZXN0EhcKD3Jlc3RhcnRfc2VydmVycxgBIAEoCCI3ChlUd29GYWN0b3JBdXRoU3RhdHVzUmVzdWx0EhoKEnR3b19mYWN0b3JfZW5hYmxlZBgBIAEoCCIjCg9TZXR1cDJGQVJlcXVlc3QSEAoIcGFzc3dvcmQYASABKAkiVQoYVHdvRmFjdG9yQXV0aFNldHVwUmVzdWx0Eg4KBnNlY3JldBgBIAEoCRIPCgdxcl9jb2RlGAIgASgJEhgKEG1hbnVhbF9lbnRyeV9rZXkYAyABKAkiLQoYVHdvRmFjdG9yQXV0aENvZGVSZXF1ZXN0EhEKCXRvdHBfY29kZRgBIAEoCSJEChlUd29GYWN0b3JBdXRoRW5hYmxlUmVzdWx0EhYKDnJlY292ZXJ5X2NvZGVzGAEgAygJEg8KB21lc3NhZ2UYAiABKAkiLQoaVHdvRmFjdG9yQXV0aE1lc3NhZ2VSZXN1bHQSDwoHbWVzc2FnZRgBIAEoCSJaCiBUd29GYWN0b3JBdXRoUmVjb3ZlcnlDb2Rlc1Jlc3VsdBIWCg5yZWNvdmVyeV9jb2RlcxgBIAMoCRINCgV0b3RhbBgCIAEoDRIPCgdtZXNzYWdlGAMgASgJImQKE0xvZ2luV2l0aDJGQVJlcXVlc3QSEAoIdXNlck5hbWUYASABKAkSEAoIcGFzc3dvcmQYAiABKAkSEQoJdG90cF9jb2RlGAMgASgJEhYKDnN5bkRhdGFUb0Nsb3VkGAQgASgIIqwBCgdTZXNzaW9uEgoKAmlkGAEgASgJEhEKCWRldmljZV9pZBgCIAEoCRITCgtkZXZpY2VfbmFtZRgDIAEoCRIWCg5kZXZpY2Vfb3NfdHlwZRgEIAEoCRISCgpjcmVhdGVkX2F0GAUgASgJEhQKDGxhc3RfdXNlZF9hdBgGIAEoCRISCgpleHBpcmVzX2F0GAcgASgJEhcKD2xhc3RfaXBfYWRkcmVzcxgIIAEoCSI8ChNHZXRTZXNzaW9uc1Jlc3BvbnNlEiUKCHNlc3Npb25zGAEgAygLMhMuY2xvdWRkcml2ZS5TZXNzaW9uIioKFFJldm9rZVNlc3Npb25SZXF1ZXN0EhIKCnNlc3Npb25faWQYASABKAkqOgoJUHJveHlUeXBlEgoKBlNZU1RFTRAAEgsKB05PUFJPWFkQARIICgRIVFRQEAISCgoGU09DS1M1EAMqaAoVUVJDb2RlU2Nhbk1lc3NhZ2VUeXBlEg4KClNIT1dfSU1BR0UQABIWChJTSE9XX0lNQUdFX0NPTlRFTlQQARIRCg1DSEFOR0VfU1RBVFVTEAISCQoFQ0xPU0UQAxIJCgVFUlJPUhAEKiYKDVVwZGF0ZUNoYW5uZWwSCwoHUmVsZWFzZRAAEggKBEJldGEQASo/CghMb2dMZXZlbBIJCgVUcmFjZRAAEgkKBURlYnVnEAESCAoESW5mbxACEggKBFdhcm4QAxIJCgVFcnJvchAEKlwKDFZhY3V1bVN0YXR1cxIPCgtWQUNVVU1fSURMRRAAEhIKDlZBQ1VVTV9SVU5OSU5HEAESFAoQVkFDVVVNX0NPTVBMRVRFRBACEhEKDVZBQ1VVTV9GQUlMRUQQAyp8ChFPZmZsaW5lRmlsZVN0YXR1cxIQCgxPRkZMSU5FX0lOSVQQABIXChNPRkZMSU5FX0RPV05MT0FESU5HEAESFAoQT0ZGTElORV9GSU5JU0hFRBACEhEKDU9GRkxJTkVfRVJST1IQAxITCg9PRkZMSU5FX1VOS05PV04QBCpCCg9GaWxlUmVwbGFjZVJ1bGUSCAoEU2tpcBAAEg0KCU92ZXJ3cml0ZRABEhYKEktlZXBIaXN0b3J5VmVyc2lvbhACKk0KDkZpbGVEZWxldGVSdWxlEgoKBkRlbGV0ZRAAEgsKB1JlY3ljbGUQARIICgRLZWVwEAISGAoUTW92ZVRvVmVyc2lvbkhpc3RvcnkQAypQChJGaWxlQ29tcGxldGlvblJ1bGUSCAoETm9uZRAAEhAKDERlbGV0ZVNvdXJjZRABEh4KGkRlbGV0ZVNvdXJjZUFuZEVtcHR5Rm9sZGVyEAIy7H4KEUNsb3VkRHJpdmVGaWxlU3J2EksKDUdldFN5c3RlbUluZm8SFi5nb29nbGUucHJvdG9idWYuRW1wdHkaIC5jbG91ZGRyaXZlLkNsb3VkRHJpdmVTeXN0ZW1JbmZvIgASPwoIR2V0VG9rZW4SGy5jbG91ZGRyaXZlLkdldFRva2VuUmVxdWVzdBoULmNsb3VkZHJpdmUuSldUVG9rZW4iABJICgVMb2dpbhIcLmNsb3VkZHJpdmUuVXNlckxvZ2luUmVxdWVzdBofLmNsb3VkZHJpdmUuRmlsZU9wZXJhdGlvblJlc3VsdCIAEk4KCFJlZ2lzdGVyEh8uY2xvdWRkcml2ZS5Vc2VyUmVnaXN0ZXJSZXF1ZXN0Gh8uY2xvdWRkcml2ZS5GaWxlT3BlcmF0aW9uUmVzdWx0IgASWwoVU2VuZFJlc2V0QWNjb3VudEVtYWlsEiguY2xvdWRkcml2ZS5TZW5kUmVzZXRBY2NvdW50RW1haWxSZXF1ZXN0GhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5IgASSQoMUmVzZXRBY2NvdW50Eh8uY2xvdWRkcml2ZS5SZXNldEFjY291bnRSZXF1ZXN0GhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5IgASQwoPR2V0QXBpVG9rZW5JbmZvEhcuY2xvdWRkcml2ZS5TdHJpbmdWYWx1ZRoVLmNsb3VkZHJpdmUuVG9rZW5JbmZvIgASRwoMTG9naW5XaXRoMkZBEh8uY2xvdWRkcml2ZS5Mb2dpbldpdGgyRkFSZXF1ZXN0GhQuY2xvdWRkcml2ZS5KV1RUb2tlbiIAEkQKEFNlbmRDb25maXJtRW1haWwSFi5nb29nbGUucHJvdG9idWYuRW1wdHkaFi5nb29nbGUucHJvdG9idWYuRW1wdHkiABJJCgxDb25maXJtRW1haWwSHy5jbG91ZGRyaXZlLkNvbmZpcm1FbWFpbFJlcXVlc3QaFi5nb29nbGUucHJvdG9idWYuRW1wdHkiABJNChBHZXRBY2NvdW50U3RhdHVzEhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5Gh8uY2xvdWRkcml2ZS5BY2NvdW50U3RhdHVzUmVzdWx0IgASUQoOQ2hlY2syRkFTdGF0dXMSFi5nb29nbGUucHJvdG9idWYuRW1wdHkaJS5jbG91ZGRyaXZlLlR3b0ZhY3RvckF1dGhTdGF0dXNSZXN1bHQiABJPCghTZXR1cDJGQRIbLmNsb3VkZHJpdmUuU2V0dXAyRkFSZXF1ZXN0GiQuY2xvdWRkcml2ZS5Ud29GYWN0b3JBdXRoU2V0dXBSZXN1bHQiABJaCglFbmFibGUyRkESJC5jbG91ZGRyaXZlLlR3b0ZhY3RvckF1dGhDb2RlUmVxdWVzdBolLmNsb3VkZHJpdmUuVHdvRmFjdG9yQXV0aEVuYWJsZVJlc3VsdCIAElwKCkRpc2FibGUyRkESJC5jbG91ZGRyaXZlLlR3b0ZhY3RvckF1dGhDb2RlUmVxdWVzdBomLmNsb3VkZHJpdmUuVHdvRmFjdG9yQXV0aE1lc3NhZ2VSZXN1bHQiABJoChBHZXRSZWNvdmVyeUNvZGVzEiQuY2xvdWRkcml2ZS5Ud29GYWN0b3JBdXRoQ29kZVJlcXVlc3QaLC5jbG91ZGRyaXZlLlR3b0ZhY3RvckF1dGhSZWNvdmVyeUNvZGVzUmVzdWx0IgASbwoXUmVnZW5lcmF0ZVJlY292ZXJ5Q29kZXMSJC5jbG91ZGRyaXZlLlR3b0ZhY3RvckF1dGhDb2RlUmVxdWVzdBosLmNsb3VkZHJpdmUuVHdvRmFjdG9yQXV0aFJlY292ZXJ5Q29kZXNSZXN1bHQiABJICgtHZXRTZXNzaW9ucxIWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eRofLmNsb3VkZHJpdmUuR2V0U2Vzc2lvbnNSZXNwb25zZSIAEksKDVJldm9rZVNlc3Npb24SIC5jbG91ZGRyaXZlLlJldm9rZVNlc3Npb25SZXF1ZXN0GhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5IgASRwoTUmV2b2tlT3RoZXJTZXNzaW9ucxIWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eRoWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eSIAEkwKC0dldFN1YkZpbGVzEh4uY2xvdWRkcml2ZS5MaXN0U3ViRmlsZVJlcXVlc3QaGS5jbG91ZGRyaXZlLlN1YkZpbGVzUmVwbHkiADABEkwKEEdldFNlYXJjaFJlc3VsdHMSGS5jbG91ZGRyaXZlLlNlYXJjaFJlcXVlc3QaGS5jbG91ZGRyaXZlLlN1YkZpbGVzUmVwbHkiADABElEKDkZpbmRGaWxlQnlQYXRoEiEuY2xvdWRkcml2ZS5GaW5kRmlsZUJ5UGF0aFJlcXVlc3QaGi5jbG91ZGRyaXZlLkNsb3VkRHJpdmVGaWxlIgASUQoMQ3JlYXRlRm9sZGVyEh8uY2xvdWRkcml2ZS5DcmVhdGVGb2xkZXJSZXF1ZXN0Gh4uY2xvdWRkcml2ZS5DcmVhdGVGb2xkZXJSZXN1bHQiABJjChVDcmVhdGVFbmNyeXB0ZWRGb2xkZXISKC5jbG91ZGRyaXZlLkNyZWF0ZUVuY3J5cHRlZEZvbGRlclJlcXVlc3QaHi5jbG91ZGRyaXZlLkNyZWF0ZUZvbGRlclJlc3VsdCIAEmAKE1VubG9ja0VuY3J5cHRlZEZpbGUSJi5jbG91ZGRyaXZlLlVubG9ja0VuY3J5cHRlZEZpbGVSZXF1ZXN0Gh8uY2xvdWRkcml2ZS5GaWxlT3BlcmF0aW9uUmVzdWx0IgASTwoRTG9ja0VuY3J5cHRlZEZpbGUSFy5jbG91ZGRyaXZlLkZpbGVSZXF1ZXN0Gh8uY2xvdWRkcml2ZS5GaWxlT3BlcmF0aW9uUmVzdWx0IgASTgoKUmVuYW1lRmlsZRIdLmNsb3VkZHJpdmUuUmVuYW1lRmlsZVJlcXVlc3QaHy5jbG91ZGRyaXZlLkZpbGVPcGVyYXRpb25SZXN1bHQiABJQCgtSZW5hbWVGaWxlcxIeLmNsb3VkZHJpdmUuUmVuYW1lRmlsZXNSZXF1ZXN0Gh8uY2xvdWRkcml2ZS5GaWxlT3BlcmF0aW9uUmVzdWx0IgASSgoITW92ZUZpbGUSGy5jbG91ZGRyaXZlLk1vdmVGaWxlUmVxdWVzdBofLmNsb3VkZHJpdmUuRmlsZU9wZXJhdGlvblJlc3VsdCIAEkoKCENvcHlGaWxlEhsuY2xvdWRkcml2ZS5Db3B5RmlsZVJlcXVlc3QaHy5jbG91ZGRyaXZlLkZpbGVPcGVyYXRpb25SZXN1bHQiABJICgpEZWxldGVGaWxlEhcuY2xvdWRkcml2ZS5GaWxlUmVxdWVzdBofLmNsb3VkZHJpdmUuRmlsZU9wZXJhdGlvblJlc3VsdCIAElMKFURlbGV0ZUZpbGVQZXJtYW5lbnRseRIXLmNsb3VkZHJpdmUuRmlsZVJlcXVlc3QaHy5jbG91ZGRyaXZlLkZpbGVPcGVyYXRpb25SZXN1bHQiABJOCgtEZWxldGVGaWxlcxIcLmNsb3VkZHJpdmUuTXVsdGlGaWxlUmVxdWVzdBofLmNsb3VkZHJpdmUuRmlsZU9wZXJhdGlvblJlc3VsdCIAElkKFkRlbGV0ZUZpbGVzUGVybWFuZW50bHkSHC5jbG91ZGRyaXZlLk11bHRpRmlsZVJlcXVlc3QaHy5jbG91ZGRyaXZlLkZpbGVPcGVyYXRpb25SZXN1bHQiABJXCg9BZGRPZmZsaW5lRmlsZXMSIS5jbG91ZGRyaXZlLkFkZE9mZmxpbmVGaWxlUmVxdWVzdBofLmNsb3VkZHJpdmUuRmlsZU9wZXJhdGlvblJlc3VsdCIAEl4KElJlbW92ZU9mZmxpbmVGaWxlcxIlLmNsb3VkZHJpdmUuUmVtb3ZlT2ZmbGluZUZpbGVzUmVxdWVzdBofLmNsb3VkZHJpdmUuRmlsZU9wZXJhdGlvblJlc3VsdCIAElYKFkxpc3RPZmZsaW5lRmlsZXNCeVBhdGgSFy5jbG91ZGRyaXZlLkZpbGVSZXF1ZXN0GiEuY2xvdWRkcml2ZS5PZmZsaW5lRmlsZUxpc3RSZXN1bHQiABJkChNMaXN0QWxsT2ZmbGluZUZpbGVzEiUuY2xvdWRkcml2ZS5PZmZsaW5lRmlsZUxpc3RBbGxSZXF1ZXN0GiQuY2xvdWRkcml2ZS5PZmZsaW5lRmlsZUxpc3RBbGxSZXN1bHQiABJWChNHZXRPZmZsaW5lUXVvdGFJbmZvEh8uY2xvdWRkcml2ZS5PZmZsaW5lUXVvdGFSZXF1ZXN0GhwuY2xvdWRkcml2ZS5PZmZsaW5lUXVvdGFJbmZvIgASUgoRQ2xlYXJPZmZsaW5lRmlsZXMSIy5jbG91ZGRyaXZlLkNsZWFyT2ZmbGluZUZpbGVSZXF1ZXN0GhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5IgASVQoSUmVzdGFydE9mZmxpbmVUYXNrEiUuY2xvdWRkcml2ZS5SZXN0YXJ0T2ZmbGluZUZpbGVSZXF1ZXN0GhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5IgASSwoNQWRkU2hhcmVkTGluaxIgLmNsb3VkZHJpdmUuQWRkU2hhcmVkTGlua1JlcXVlc3QaFi5nb29nbGUucHJvdG9idWYuRW1wdHkiABJWChdHZXRGaWxlRGV0YWlsUHJvcGVydGllcxIXLmNsb3VkZHJpdmUuRmlsZVJlcXVlc3QaIC5jbG91ZGRyaXZlLkZpbGVEZXRhaWxQcm9wZXJ0aWVzIgASQAoMR2V0U3BhY2VJbmZvEhcuY2xvdWRkcml2ZS5GaWxlUmVxdWVzdBoVLmNsb3VkZHJpdmUuU3BhY2VJbmZvIgASTgoTR2V0Q2xvdWRNZW1iZXJzaGlwcxIXLmNsb3VkZHJpdmUuRmlsZVJlcXVlc3QaHC5jbG91ZGRyaXZlLkNsb3VkTWVtYmVyc2hpcHMiABJDCg5HZXRSdW50aW1lSW5mbxIWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eRoXLmNsb3VkZHJpdmUuUnVudGltZUluZm8iABI/Cg5HZXRSdW5uaW5nSW5mbxIWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eRoTLmNsb3VkZHJpdmUuUnVuSW5mbyIAEk4KEkdldE9wZW5GaWxlSGFuZGxlcxIWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eRoeLmNsb3VkZHJpdmUuT3BlbkZpbGVIYW5kbGVMaXN0IgASSgoGTG9nb3V0Eh0uY2xvdWRkcml2ZS5Vc2VyTG9nb3V0UmVxdWVzdBofLmNsb3VkZHJpdmUuRmlsZU9wZXJhdGlvblJlc3VsdCIAElIKFUNhbkFkZE1vcmVNb3VudFBvaW50cxIWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eRofLmNsb3VkZHJpdmUuRmlsZU9wZXJhdGlvblJlc3VsdCIAEkwKDkdldE1vdW50UG9pbnRzEhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5GiAuY2xvdWRkcml2ZS5HZXRNb3VudFBvaW50c1Jlc3VsdCIAEkgKDUFkZE1vdW50UG9pbnQSFy5jbG91ZGRyaXZlLk1vdW50T3B0aW9uGhwuY2xvdWRkcml2ZS5Nb3VudFBvaW50UmVzdWx0IgASUQoQUmVtb3ZlTW91bnRQb2ludBIdLmNsb3VkZHJpdmUuTW91bnRQb2ludFJlcXVlc3QaHC5jbG91ZGRyaXZlLk1vdW50UG9pbnRSZXN1bHQiABJGCgVNb3VudBIdLmNsb3VkZHJpdmUuTW91bnRQb2ludFJlcXVlc3QaHC5jbG91ZGRyaXZlLk1vdW50UG9pbnRSZXN1bHQiABJICgdVbm1vdW50Eh0uY2xvdWRkcml2ZS5Nb3VudFBvaW50UmVxdWVzdBocLmNsb3VkZHJpdmUuTW91bnRQb2ludFJlc3VsdCIAElcKEFVwZGF0ZU1vdW50UG9pbnQSIy5jbG91ZGRyaXZlLlVwZGF0ZU1vdW50UG9pbnRSZXF1ZXN0GhwuY2xvdWRkcml2ZS5Nb3VudFBvaW50UmVzdWx0IgASYAoYR2V0QXZhaWxhYmxlRHJpdmVMZXR0ZXJzEhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5GiouY2xvdWRkcml2ZS5HZXRBdmFpbGFibGVEcml2ZUxldHRlcnNSZXN1bHQiABJOCg9IYXNEcml2ZUxldHRlcnMSFi5nb29nbGUucHJvdG9idWYuRW1wdHkaIS5jbG91ZGRyaXZlLkhhc0RyaXZlTGV0dGVyc1Jlc3VsdCIAEk0KGUNhbk1vdW50Qm90aExvY2FsQW5kQ2xvdWQSFi5nb29nbGUucHJvdG9idWYuRW1wdHkaFi5jbG91ZGRyaXZlLkJvb2xSZXN1bHQiABJfChBMb2NhbEdldFN1YkZpbGVzEiMuY2xvdWRkcml2ZS5Mb2NhbEdldFN1YkZpbGVzUmVxdWVzdBoiLmNsb3VkZHJpdmUuTG9jYWxHZXRTdWJGaWxlc1Jlc3VsdCIAMAESUAoQR2V0QWxsVGFza3NDb3VudBIWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eRoiLmNsb3VkZHJpdmUuR2V0QWxsVGFza3NDb3VudFJlc3VsdCIAElgKFEdldERvd25sb2FkRmlsZUNvdW50EhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5GiYuY2xvdWRkcml2ZS5HZXREb3dubG9hZEZpbGVDb3VudFJlc3VsdCIAElYKE0dldERvd25sb2FkRmlsZUxpc3QSFi5nb29nbGUucHJvdG9idWYuRW1wdHkaJS5jbG91ZGRyaXZlLkdldERvd25sb2FkRmlsZUxpc3RSZXN1bHQiABJUChJHZXRVcGxvYWRGaWxlQ291bnQSFi5nb29nbGUucHJvdG9idWYuRW1wdHkaJC5jbG91ZGRyaXZlLkdldFVwbG9hZEZpbGVDb3VudFJlc3VsdCIAEmAKEUdldFVwbG9hZEZpbGVMaXN0EiQuY2xvdWRkcml2ZS5HZXRVcGxvYWRGaWxlTGlzdFJlcXVlc3QaIy5jbG91ZGRyaXZlLkdldFVwbG9hZEZpbGVMaXN0UmVzdWx0IgASSAoUQ2FuY2VsQWxsVXBsb2FkRmlsZXMSFi5nb29nbGUucHJvdG9idWYuRW1wdHkaFi5nb29nbGUucHJvdG9idWYuRW1wdHkiABJWChFDYW5jZWxVcGxvYWRGaWxlcxInLmNsb3VkZHJpdmUuTXVsdHBsZVVwbG9hZEZpbGVLZXlSZXF1ZXN0GhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5IgASRwoTUGF1c2VBbGxVcGxvYWRGaWxlcxIWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eRoWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eSIAElUKEFBhdXNlVXBsb2FkRmlsZXMSJy5jbG91ZGRyaXZlLk11bHRwbGVVcGxvYWRGaWxlS2V5UmVxdWVzdBoWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eSIAEkgKFFJlc3VtZUFsbFVwbG9hZEZpbGVzEhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5GhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5IgASVgoRUmVzdW1lVXBsb2FkRmlsZXMSJy5jbG91ZGRyaXZlLk11bHRwbGVVcGxvYWRGaWxlS2V5UmVxdWVzdBoWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eSIAEkcKDEdldENvcHlUYXNrcxIWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eRodLmNsb3VkZHJpdmUuR2V0Q29weVRhc2tSZXN1bHQiABJKCg1HZXRNZXJnZVRhc2tzEhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5Gh8uY2xvdWRkcml2ZS5HZXRNZXJnZVRhc2tzUmVzdWx0IgASTwoPQ2FuY2VsTWVyZ2VUYXNrEiIuY2xvdWRkcml2ZS5DYW5jZWxNZXJnZVRhc2tSZXF1ZXN0GhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5IgASRwoOQ2FuY2VsQ29weVRhc2sSGy5jbG91ZGRyaXZlLkNvcHlUYXNrUmVxdWVzdBoWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eSIAEksKDVBhdXNlQ29weVRhc2sSIC5jbG91ZGRyaXZlLlBhdXNlQ29weVRhc2tSZXF1ZXN0GhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5IgASSAoPUmVzdGFydENvcHlUYXNrEhsuY2xvdWRkcml2ZS5Db3B5VGFza1JlcXVlc3QaFi5nb29nbGUucHJvdG9idWYuRW1wdHkiABJMChhSZW1vdmVDb21wbGV0ZWRDb3B5VGFza3MSFi5nb29nbGUucHJvdG9idWYuRW1wdHkaFi5nb29nbGUucHJvdG9idWYuRW1wdHkiABJQChJSZW1vdmVBbGxDb3B5VGFza3MSFi5nb29nbGUucHJvdG9idWYuRW1wdHkaIC5jbG91ZGRyaXZlLkJhdGNoT3BlcmF0aW9uUmVzdWx0IgASVwoPUmVtb3ZlQ29weVRhc2tzEiAuY2xvdWRkcml2ZS5Db3B5VGFza0JhdGNoUmVxdWVzdBogLmNsb3VkZHJpdmUuQmF0Y2hPcGVyYXRpb25SZXN1bHQiABJdChFQYXVzZUFsbENvcHlUYXNrcxIkLmNsb3VkZHJpdmUuUGF1c2VBbGxDb3B5VGFza3NSZXF1ZXN0GiAuY2xvdWRkcml2ZS5CYXRjaE9wZXJhdGlvblJlc3VsdCIAElcKDlBhdXNlQ29weVRhc2tzEiEuY2xvdWRkcml2ZS5QYXVzZUNvcHlUYXNrc1JlcXVlc3QaIC5jbG91ZGRyaXZlLkJhdGNoT3BlcmF0aW9uUmVzdWx0IgASUAoSUmVzdW1lQWxsQ29weVRhc2tzEhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5GiAuY2xvdWRkcml2ZS5CYXRjaE9wZXJhdGlvblJlc3VsdCIAElcKD1Jlc3VtZUNvcHlUYXNrcxIgLmNsb3VkZHJpdmUuQ29weVRhc2tCYXRjaFJlcXVlc3QaIC5jbG91ZGRyaXZlLkJhdGNoT3BlcmF0aW9uUmVzdWx0IgASUAoTQ2FuQWRkTW9yZUNsb3VkQXBpcxIWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eRofLmNsb3VkZHJpdmUuRmlsZU9wZXJhdGlvblJlc3VsdCIAEmQKGUFQSUxvZ2luMTE1RWRpdHRoaXNjb29raWUSKS5jbG91ZGRyaXZlLkxvZ2luMTE1RWRpdHRoaXNjb29raWVSZXF1ZXN0GhouY2xvdWRkcml2ZS5BUElMb2dpblJlc3VsdCIAElkKEUFQSUxvZ2luMTE1UVJDb2RlEiEuY2xvdWRkcml2ZS5Mb2dpbjExNVFyQ29kZVJlcXVlc3QaHS5jbG91ZGRyaXZlLlFSQ29kZVNjYW5NZXNzYWdlIgAwARJaChRBUElMb2dpbjExNU9wZW5PQXV0aBIkLmNsb3VkZHJpdmUuTG9naW4xMTVPcGVuT0F1dGhSZXF1ZXN0GhouY2xvdWRkcml2ZS5BUElMb2dpblJlc3VsdCIAElIKFUFQSUxvZ2luMTE1T3BlblFSQ29kZRIWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eRodLmNsb3VkZHJpdmUuUVJDb2RlU2Nhbk1lc3NhZ2UiADABEmIKGEFQSUxvZ2luQWxpeXVuZHJpdmVPQXV0aBIoLmNsb3VkZHJpdmUuTG9naW5BbGl5dW5kcml2ZU9BdXRoUmVxdWVzdBoaLmNsb3VkZHJpdmUuQVBJTG9naW5SZXN1bHQiABJwCh9BUElMb2dpbkFsaXl1bmRyaXZlUmVmcmVzaHRva2VuEi8uY2xvdWRkcml2ZS5Mb2dpbkFsaXl1bmRyaXZlUmVmcmVzaHRva2VuUmVxdWVzdBoaLmNsb3VkZHJpdmUuQVBJTG9naW5SZXN1bHQiABJpChlBUElMb2dpbkFsaXl1bkRyaXZlUVJDb2RlEikuY2xvdWRkcml2ZS5Mb2dpbkFsaXl1bmRyaXZlUVJDb2RlUmVxdWVzdBodLmNsb3VkZHJpdmUuUVJDb2RlU2Nhbk1lc3NhZ2UiADABElwKFUFQSUxvZ2luQmFpZHVQYW5PQXV0aBIlLmNsb3VkZHJpdmUuTG9naW5CYWlkdVBhbk9BdXRoUmVxdWVzdBoaLmNsb3VkZHJpdmUuQVBJTG9naW5SZXN1bHQiABJcChVBUElMb2dpbk9uZURyaXZlT0F1dGgSJS5jbG91ZGRyaXZlLkxvZ2luT25lRHJpdmVPQXV0aFJlcXVlc3QaGi5jbG91ZGRyaXZlLkFQSUxvZ2luUmVzdWx0IgASYgoYQXBpTG9naW5Hb29nbGVEcml2ZU9BdXRoEiguY2xvdWRkcml2ZS5Mb2dpbkdvb2dsZURyaXZlT0F1dGhSZXF1ZXN0GhouY2xvdWRkcml2ZS5BUElMb2dpblJlc3VsdCIAEnAKH0FwaUxvZ2luR29vZ2xlRHJpdmVSZWZyZXNoVG9rZW4SLy5jbG91ZGRyaXZlLkxvZ2luR29vZ2xlRHJpdmVSZWZyZXNoVG9rZW5SZXF1ZXN0GhouY2xvdWRkcml2ZS5BUElMb2dpblJlc3VsdCIAElgKE0FwaUxvZ2luWHVubGVpT0F1dGgSIy5jbG91ZGRyaXZlLkxvZ2luWHVubGVpT0F1dGhSZXF1ZXN0GhouY2xvdWRkcml2ZS5BUElMb2dpblJlc3VsdCIAEmAKF0FwaUxvZ2luWHVubGVpT3Blbk9BdXRoEicuY2xvdWRkcml2ZS5Mb2dpblh1bmxlaU9wZW5PQXV0aFJlcXVlc3QaGi5jbG91ZGRyaXZlLkFQSUxvZ2luUmVzdWx0IgASWAoTQXBpTG9naW4xMjNwYW5PQXV0aBIjLmNsb3VkZHJpdmUuTG9naW4xMjNwYW5PQXV0aFJlcXVlc3QaGi5jbG91ZGRyaXZlLkFQSUxvZ2luUmVzdWx0IgASTgoRQVBJTG9naW4xODlRUkNvZGUSFi5nb29nbGUucHJvdG9idWYuRW1wdHkaHS5jbG91ZGRyaXZlLlFSQ29kZVNjYW5NZXNzYWdlIgAwARJOCg5BUElMb2dpbldlYkRhdhIeLmNsb3VkZHJpdmUuTG9naW5XZWJEYXZSZXF1ZXN0GhouY2xvdWRkcml2ZS5BUElMb2dpblJlc3VsdCIAElQKEUFQSUFkZExvY2FsRm9sZGVyEiEuY2xvdWRkcml2ZS5BZGRMb2NhbEZvbGRlclJlcXVlc3QaGi5jbG91ZGRyaXZlLkFQSUxvZ2luUmVzdWx0IgASVgoSQVBJTG9naW5DbG91ZERyaXZlEiIuY2xvdWRkcml2ZS5Mb2dpbkNsb3VkRHJpdmVSZXF1ZXN0GhouY2xvdWRkcml2ZS5BUElMb2dpblJlc3VsdCIAElYKDlJlbW92ZUNsb3VkQVBJEiEuY2xvdWRkcml2ZS5SZW1vdmVDbG91ZEFQSVJlcXVlc3QaHy5jbG91ZGRyaXZlLkZpbGVPcGVyYXRpb25SZXN1bHQiABJFCg9HZXRBbGxDbG91ZEFwaXMSFi5nb29nbGUucHJvdG9idWYuRW1wdHkaGC5jbG91ZGRyaXZlLkNsb3VkQVBJTGlzdCIAElcKEUdldENsb3VkQVBJQ29uZmlnEiQuY2xvdWRkcml2ZS5HZXRDbG91ZEFQSUNvbmZpZ1JlcXVlc3QaGi5jbG91ZGRyaXZlLkNsb3VkQVBJQ29uZmlnIgASUwoRU2V0Q2xvdWRBUElDb25maWcSJC5jbG91ZGRyaXZlLlNldENsb3VkQVBJQ29uZmlnUmVxdWVzdBoWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eSIAEkkKEUdldFN5c3RlbVNldHRpbmdzEhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5GhouY2xvdWRkcml2ZS5TeXN0ZW1TZXR0aW5ncyIAEkkKEVNldFN5c3RlbVNldHRpbmdzEhouY2xvdWRkcml2ZS5TeXN0ZW1TZXR0aW5ncxoWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eSIAElMKE1NldERpckNhY2hlVGltZVNlY3MSIi5jbG91ZGRyaXZlLlNldERpckNhY2hlVGltZVJlcXVlc3QaFi5nb29nbGUucHJvdG9idWYuRW1wdHkiABJ5ChxHZXRFZmZlY3RpdmVEaXJDYWNoZVRpbWVTZWNzEisuY2xvdWRkcml2ZS5HZXRFZmZlY3RpdmVEaXJDYWNoZVRpbWVSZXF1ZXN0GiouY2xvdWRkcml2ZS5HZXRFZmZlY3RpdmVEaXJDYWNoZVRpbWVSZXN1bHQiABJIChNGb3JjZUV4cGlyZURpckNhY2hlEhcuY2xvdWRkcml2ZS5GaWxlUmVxdWVzdBoWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eSIAEkIKDlZhY3V1bURpckNhY2hlEhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5GhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5IgASTwoRR2V0VmFjdXVtUHJvZ3Jlc3MSFi5nb29nbGUucHJvdG9idWYuRW1wdHkaIC5jbG91ZGRyaXZlLlZhY3V1bVByb2dyZXNzUmVzdWx0IgASUgoRR2V0RGlyQ2FjaGVEYlNpemUSFi5nb29nbGUucHJvdG9idWYuRW1wdHkaIy5jbG91ZGRyaXZlLkdldERpckNhY2hlRGJTaXplUmVzdWx0IgASVAoQR2V0T3BlbkZpbGVUYWJsZRIjLmNsb3VkZHJpdmUuR2V0T3BlbkZpbGVUYWJsZVJlcXVlc3QaGS5jbG91ZGRyaXZlLk9wZW5GaWxlVGFibGUiABJHChBHZXREaXJDYWNoZVRhYmxlEhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5GhkuY2xvdWRkcml2ZS5EaXJDYWNoZVRhYmxlIgASTAoXR2V0UmVmZXJlbmNlZEVudHJ5UGF0aHMSFy5jbG91ZGRyaXZlLkZpbGVSZXF1ZXN0GhYuY2xvdWRkcml2ZS5TdHJpbmdMaXN0IgASRwoQR2V0VGVtcEZpbGVUYWJsZRIWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eRoZLmNsb3VkZHJpdmUuVGVtcEZpbGVUYWJsZSIAElAKDlB1c2hUYXNrQ2hhbmdlEhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5GiIuY2xvdWRkcml2ZS5HZXRBbGxUYXNrc0NvdW50UmVzdWx0IgAwARJMCgtQdXNoTWVzc2FnZRIWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eRohLmNsb3VkZHJpdmUuQ2xvdWREcml2ZVB1c2hNZXNzYWdlIgAwARJMChZHZXRDbG91ZERyaXZlMVVzZXJEYXRhEhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5GhguY2xvdWRkcml2ZS5TdHJpbmdSZXN1bHQiABJCCg5SZXN0YXJ0U2VydmljZRIWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eRoWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eSIAEkMKD1NodXRkb3duU2VydmljZRIWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eRoWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eSIAEj8KCUhhc1VwZGF0ZRIWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eRoYLmNsb3VkZHJpdmUuVXBkYXRlUmVzdWx0IgASQQoLQ2hlY2tVcGRhdGUSFi5nb29nbGUucHJvdG9idWYuRW1wdHkaGC5jbG91ZGRyaXZlLlVwZGF0ZVJlc3VsdCIAEkIKDkRvd25sb2FkVXBkYXRlEhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5GhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5IgASQAoMVXBkYXRlU3lzdGVtEhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5GhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5IgASPwoKVGVzdFVwZGF0ZRIXLmNsb3VkZHJpdmUuRmlsZVJlcXVlc3QaFi5nb29nbGUucHJvdG9idWYuRW1wdHkiABJCCgtHZXRNZXRhRGF0YRIXLmNsb3VkZHJpdmUuRmlsZVJlcXVlc3QaGC5jbG91ZGRyaXZlLkZpbGVNZXRhRGF0YSIAEkYKD0dldE9yaWdpbmFsUGF0aBIXLmNsb3VkZHJpdmUuRmlsZVJlcXVlc3QaGC5jbG91ZGRyaXZlLlN0cmluZ1Jlc3VsdCIAElYKDkNoYW5nZVBhc3N3b3JkEiEuY2xvdWRkcml2ZS5DaGFuZ2VQYXNzd29yZFJlcXVlc3QaHy5jbG91ZGRyaXZlLkZpbGVPcGVyYXRpb25SZXN1bHQiABJLCgpDcmVhdGVGaWxlEh0uY2xvdWRkcml2ZS5DcmVhdGVGaWxlUmVxdWVzdBocLmNsb3VkZHJpdmUuQ3JlYXRlRmlsZVJlc3VsdCIAEkwKCUNsb3NlRmlsZRIcLmNsb3VkZHJpdmUuQ2xvc2VGaWxlUmVxdWVzdBofLmNsb3VkZHJpdmUuRmlsZU9wZXJhdGlvblJlc3VsdCIAElIKEVdyaXRlVG9GaWxlU3RyZWFtEhwuY2xvdWRkcml2ZS5Xcml0ZUZpbGVSZXF1ZXN0GhsuY2xvdWRkcml2ZS5Xcml0ZUZpbGVSZXN1bHQiACgBEkoKC1dyaXRlVG9GaWxlEhwuY2xvdWRkcml2ZS5Xcml0ZUZpbGVSZXF1ZXN0GhsuY2xvdWRkcml2ZS5Xcml0ZUZpbGVSZXN1bHQiABJKCg1HZXRQcm9tb3Rpb25zEhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5Gh8uY2xvdWRkcml2ZS5HZXRQcm9tb3Rpb25zUmVzdWx0IgASVgoUR2V0UHJvbW90aW9uc0J5Q2xvdWQSGy5jbG91ZGRyaXZlLkNsb3VkQVBJUmVxdWVzdBofLmNsb3VkZHJpdmUuR2V0UHJvbW90aW9uc1Jlc3VsdCIAEkkKFVVwZGF0ZVByb21vdGlvblJlc3VsdBIWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eRoWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eSIAEmkKHFVwZGF0ZVByb21vdGlvblJlc3VsdEJ5Q2xvdWQSLy5jbG91ZGRyaXZlLlVwZGF0ZVByb21vdGlvblJlc3VsdEJ5Q2xvdWRSZXF1ZXN0GhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5IgASVwoTU2VuZFByb21vdGlvbkFjdGlvbhImLmNsb3VkZHJpdmUuU2VuZFByb21vdGlvbkFjdGlvblJlcXVlc3QaFi5nb29nbGUucHJvdG9idWYuRW1wdHkiABJUChJHZXRDbG91ZERyaXZlUGxhbnMSFi5nb29nbGUucHJvdG9idWYuRW1wdHkaJC5jbG91ZGRyaXZlLkdldENsb3VkRHJpdmVQbGFuc1Jlc3VsdCIAEkUKCEpvaW5QbGFuEhsuY2xvdWRkcml2ZS5Kb2luUGxhblJlcXVlc3QaGi5jbG91ZGRyaXZlLkpvaW5QbGFuUmVzdWx0IgASUQoQQmluZENsb3VkQWNjb3VudBIjLmNsb3VkZHJpdmUuQmluZENsb3VkQWNjb3VudFJlcXVlc3QaFi5nb29nbGUucHJvdG9idWYuRW1wdHkiABJPCg9UcmFuc2ZlckJhbGFuY2USIi5jbG91ZGRyaXZlLlRyYW5zZmVyQmFsYW5jZVJlcXVlc3QaFi5nb29nbGUucHJvdG9idWYuRW1wdHkiABJXChNTZW5kQ2hhbmdlRW1haWxDb2RlEiYuY2xvdWRkcml2ZS5TZW5kQ2hhbmdlRW1haWxDb2RlUmVxdWVzdBoWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eSIAEkcKC0NoYW5nZUVtYWlsEh4uY2xvdWRkcml2ZS5DaGFuZ2VFbWFpbFJlcXVlc3QaFi5nb29nbGUucHJvdG9idWYuRW1wdHkiABJdChZDaGFuZ2VFbWFpbEFuZFBhc3N3b3JkEikuY2xvdWRkcml2ZS5DaGFuZ2VFbWFpbEFuZFBhc3N3b3JkUmVxdWVzdBoWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eSIAEkcKDUdldEJhbGFuY2VMb2cSFi5nb29nbGUucHJvdG9idWYuRW1wdHkaHC5jbG91ZGRyaXZlLkJhbGFuY2VMb2dSZXN1bHQiABJXChNDaGVja0FjdGl2YXRpb25Db2RlEhcuY2xvdWRkcml2ZS5TdHJpbmdWYWx1ZRolLmNsb3VkZHJpdmUuQ2hlY2tBY3RpdmF0aW9uQ29kZVJlc3VsdCIAEkUKDEFjdGl2YXRlUGxhbhIXLmNsb3VkZHJpdmUuU3RyaW5nVmFsdWUaGi5jbG91ZGRyaXZlLkpvaW5QbGFuUmVzdWx0IgASVQoPQ2hlY2tDb3Vwb25Db2RlEiIuY2xvdWRkcml2ZS5DaGVja0NvdXBvbkNvZGVSZXF1ZXN0GhwuY2xvdWRkcml2ZS5Db3Vwb25Db2RlUmVzdWx0IgASRAoPR2V0UmVmZXJyYWxDb2RlEhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5GhcuY2xvdWRkcml2ZS5TdHJpbmdWYWx1ZSIAEkAKDEJhY2t1cEdldEFsbBIWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eRoWLmNsb3VkZHJpdmUuQmFja3VwTGlzdCIAEkYKD0JhY2t1cEdldFN0YXR1cxIXLmNsb3VkZHJpdmUuU3RyaW5nVmFsdWUaGC5jbG91ZGRyaXZlLkJhY2t1cFN0YXR1cyIAEjkKCUJhY2t1cEFkZBISLmNsb3VkZHJpdmUuQmFja3VwGhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5IgASQQoMQmFja3VwUmVtb3ZlEhcuY2xvdWRkcml2ZS5TdHJpbmdWYWx1ZRoWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eSIAEjwKDEJhY2t1cFVwZGF0ZRISLmNsb3VkZHJpdmUuQmFja3VwGhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5IgASUQoUQmFja3VwQWRkRGVzdGluYXRpb24SHy5jbG91ZGRyaXZlLkJhY2t1cE1vZGlmeVJlcXVlc3QaFi5nb29nbGUucHJvdG9idWYuRW1wdHkiABJUChdCYWNrdXBSZW1vdmVEZXN0aW5hdGlvbhIfLmNsb3VkZHJpdmUuQmFja3VwTW9kaWZ5UmVxdWVzdBoWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eSIAElEKEEJhY2t1cFNldEVuYWJsZWQSIy5jbG91ZGRyaXZlLkJhY2t1cFNldEVuYWJsZWRSZXF1ZXN0GhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5IgASXAofQmFja3VwU2V0RmlsZVN5c3RlbVdhdGNoRW5hYmxlZBIfLmNsb3VkZHJpdmUuQmFja3VwTW9kaWZ5UmVxdWVzdBoWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eSIAElMKFkJhY2t1cFVwZGF0ZVN0cmF0ZWdpZXMSHy5jbG91ZGRyaXZlLkJhY2t1cE1vZGlmeVJlcXVlc3QaFi5nb29nbGUucHJvdG9idWYuRW1wdHkiABJQChtCYWNrdXBSZXN0YXJ0V2Fsa2luZ1Rocm91Z2gSFy5jbG91ZGRyaXZlLlN0cmluZ1ZhbHVlGhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5IgASTgoRQ2FuQWRkTW9yZUJhY2t1cHMSFi5nb29nbGUucHJvdG9idWYuRW1wdHkaHy5jbG91ZGRyaXZlLkZpbGVPcGVyYXRpb25SZXN1bHQiABJCCgxHZXRNYWNoaW5lSWQSFi5nb29nbGUucHJvdG9idWYuRW1wdHkaGC5jbG91ZGRyaXZlLlN0cmluZ1Jlc3VsdCIAEkcKEEdldE9ubGluZURldmljZXMSFi5nb29nbGUucHJvdG9idWYuRW1wdHkaGS5jbG91ZGRyaXZlLk9ubGluZURldmljZXMiABJECg1LaWNrb3V0RGV2aWNlEhkuY2xvdWRkcml2ZS5EZXZpY2VSZXF1ZXN0GhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5IgASRwoMTGlzdExvZ0ZpbGVzEhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5Gh0uY2xvdWRkcml2ZS5MaXN0TG9nRmlsZVJlc3VsdCIAEl0KGFN5bmNGaWxlQ2hhbmdlc0Zyb21DbG91ZBIXLmNsb3VkZHJpdmUuRmlsZVJlcXVlc3QaJi5jbG91ZGRyaXZlLkZpbGVTeXN0ZW1DaGFuZ2VTdGF0aXN0aWNzIgASTAoXU3RhcnRDbG91ZEV2ZW50TGlzdGVuZXISFy5jbG91ZGRyaXZlLkZpbGVSZXF1ZXN0GhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5IgASSwoWU3RvcENsb3VkRXZlbnRMaXN0ZW5lchIXLmNsb3VkZHJpdmUuRmlsZVJlcXVlc3QaFi5nb29nbGUucHJvdG9idWYuRW1wdHkiABJXChVXYWxrVGhyb3VnaEZvbGRlclRlc3QSFy5jbG91ZGRyaXZlLkZpbGVSZXF1ZXN0GiMuY2xvdWRkcml2ZS5XYWxrVGhyb3VnaEZvbGRlclJlc3VsdCIAEk4KGEdldFdlYmhvb2tDb25maWdUZW1wbGF0ZRIWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eRoYLmNsb3VkZHJpdmUuU3RyaW5nUmVzdWx0IgASRgoRR2V0V2ViaG9va0NvbmZpZ3MSFi5nb29nbGUucHJvdG9idWYuRW1wdHkaFy5jbG91ZGRyaXZlLldlYmhvb2tMaXN0IgASSAoQQWRkV2ViaG9va0NvbmZpZxIaLmNsb3VkZHJpdmUuV2ViaG9va1JlcXVlc3QaFi5nb29nbGUucHJvdG9idWYuRW1wdHkiABJIChNSZW1vdmVXZWJob29rQ29uZmlnEhcuY2xvdWRkcml2ZS5TdHJpbmdWYWx1ZRoWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eSIAEksKE0NoYW5nZVdlYmhvb2tDb25maWcSGi5jbG91ZGRyaXZlLldlYmhvb2tSZXF1ZXN0GhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5IgASRQoKQWRkRGF2VXNlchIdLmNsb3VkZHJpdmUuQWRkRGF2VXNlclJlcXVlc3QaFi5nb29nbGUucHJvdG9idWYuRW1wdHkiABJCCg1SZW1vdmVEYXZVc2VyEhcuY2xvdWRkcml2ZS5TdHJpbmdWYWx1ZRoWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eSIAEksKDU1vZGlmeURhdlVzZXISIC5jbG91ZGRyaXZlLk1vZGlmeURhdlVzZXJSZXF1ZXN0GhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5IgASPAoKR2V0RGF2VXNlchIXLmNsb3VkZHJpdmUuU3RyaW5nVmFsdWUaEy5jbG91ZGRyaXZlLkRhdlVzZXIiABJLChJHZXREYXZTZXJ2ZXJDb25maWcSFi5nb29nbGUucHJvdG9idWYuRW1wdHkaGy5jbG91ZGRyaXZlLkRhdlNlcnZlckNvbmZpZyIAElgKElNldERhdlNlcnZlckNvbmZpZxIoLmNsb3VkZHJpdmUuTW9kaWZ5RGF2U2VydmVyQ29uZmlnUmVxdWVzdBoWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eSIAEkYKC0NyZWF0ZVRva2VuEh4uY2xvdWRkcml2ZS5DcmVhdGVUb2tlblJlcXVlc3QaFS5jbG91ZGRyaXZlLlRva2VuSW5mbyIAEkYKC01vZGlmeVRva2VuEh4uY2xvdWRkcml2ZS5Nb2RpZnlUb2tlblJlcXVlc3QaFS5jbG91ZGRyaXZlLlRva2VuSW5mbyIAEkAKC1JlbW92ZVRva2VuEhcuY2xvdWRkcml2ZS5TdHJpbmdWYWx1ZRoWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eSIAEkQKCkxpc3RUb2tlbnMSFi5nb29nbGUucHJvdG9idWYuRW1wdHkaHC5jbG91ZGRyaXZlLkxpc3RUb2tlbnNSZXN1bHQiABJeChJHZXREb3dubG9hZFVybFBhdGgSJS5jbG91ZGRyaXZlLkdldERvd25sb2FkVXJsUGF0aFJlcXVlc3QaHy5jbG91ZGRyaXZlLkRvd25sb2FkVXJsUGF0aEluZm8iABJcChFTdGFydFJlbW90ZVVwbG9hZBIkLmNsb3VkZHJpdmUuU3RhcnRSZW1vdGVVcGxvYWRSZXF1ZXN0Gh8uY2xvdWRkcml2ZS5SZW1vdGVVcGxvYWRTdGFydGVkIgASVwoTUmVtb3RlVXBsb2FkQ29udHJvbBImLmNsb3VkZHJpdmUuUmVtb3RlVXBsb2FkQ29udHJvbFJlcXVlc3QaFi5nb29nbGUucHJvdG9idWYuRW1wdHkiABJnChNSZW1vdGVVcGxvYWRDaGFubmVsEiYuY2xvdWRkcml2ZS5SZW1vdGVVcGxvYWRDaGFubmVsUmVxdWVzdBokLmNsb3VkZHJpdmUuUmVtb3RlVXBsb2FkQ2hhbm5lbFJlcGx5IgAwARJVCg5SZW1vdGVSZWFkRGF0YRIgLmNsb3VkZHJpdmUuUmVtb3RlUmVhZERhdGFVcGxvYWQaHy5jbG91ZGRyaXZlLlJlbW90ZVJlYWREYXRhUmVwbHkiABJhChJSZW1vdGVIYXNoUHJvZ3Jlc3MSJC5jbG91ZGRyaXZlLlJlbW90ZUhhc2hQcm9ncmVzc1VwbG9hZBojLmNsb3VkZHJpdmUuUmVtb3RlSGFzaFByb2dyZXNzUmVwbHkiABJLChJHZXRXZWJTZXJ2ZXJDb25maWcSFi5nb29nbGUucHJvdG9idWYuRW1wdHkaGy5jbG91ZGRyaXZlLldlYlNlcnZlckNvbmZpZyIAElUKElNldFdlYlNlcnZlckNvbmZpZxIlLmNsb3VkZHJpdmUuU2V0V2ViU2VydmVyQ29uZmlnUmVxdWVzdBoWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eSIAEl0KFkdlbmVyYXRlU2VsZlNpZ25lZENlcnQSKS5jbG91ZGRyaXZlLkdlbmVyYXRlU2VsZlNpZ25lZENlcnRSZXF1ZXN0GhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5IgA6OAoHdmVyc2lvbhIcLmdvb2dsZS5wcm90b2J1Zi5GaWxlT3B0aW9ucxjRhgMgASgJUgd2ZXJzaW9uQiGqAhRDbG91ZERyaXZlU3J2LlByb3Rvc4q1GAYwLjkuMTZiBnByb3RvMw", [file_google_protobuf_timestamp, file_google_protobuf_empty, file_google_protobuf_descriptor]);
  const AddOfflineFileRequestSchema = messageDesc(file_src_proto_clouddrive, 12);
  const FindFileByPathRequestSchema = messageDesc(file_src_proto_clouddrive, 16);
  const OfflineFileListAllRequestSchema = messageDesc(file_src_proto_clouddrive, 146);
  var OfflineFileStatus = ((OfflineFileStatus2) => {
    OfflineFileStatus2[OfflineFileStatus2["OFFLINE_INIT"] = 0] = "OFFLINE_INIT";
    OfflineFileStatus2[OfflineFileStatus2["OFFLINE_DOWNLOADING"] = 1] = "OFFLINE_DOWNLOADING";
    OfflineFileStatus2[OfflineFileStatus2["OFFLINE_FINISHED"] = 2] = "OFFLINE_FINISHED";
    OfflineFileStatus2[OfflineFileStatus2["OFFLINE_ERROR"] = 3] = "OFFLINE_ERROR";
    OfflineFileStatus2[OfflineFileStatus2["OFFLINE_UNKNOWN"] = 4] = "OFFLINE_UNKNOWN";
    return OfflineFileStatus2;
  })(OfflineFileStatus || {});
  const CloudDriveFileSrv = serviceDesc(file_src_proto_clouddrive, 0);
  function getClient() {
    const cfg = getConfig();
    const authInterceptor = (next) => async (req) => {
      const token = cfg.apiToken;
      if (token) {
        req.header.set("Authorization", token.startsWith("Bearer ") ? token : `Bearer ${token}`);
      }
      return await next(req);
    };
    const transport = createGrpcWebTransport({
      baseUrl: cfg.grpcBaseUrl,
      interceptors: [authInterceptor],
      fetch: (input, init) => gmFetchLazy(input, init)
    });
    return createClient(CloudDriveFileSrv, transport);
  }
  async function gmFetchLazy(input, init) {
    const { gmFetch: gmFetch2 } = await __vitePreload(async () => {
      const { gmFetch: gmFetch3 } = await Promise.resolve().then(() => gmFetch$1);
      return { gmFetch: gmFetch3 };
    }, void 0 );
    return gmFetch2(input, init);
  }
  async function getSystemInfo() {
    return await getClient().getSystemInfo(create(EmptySchema, {}));
  }
  async function addOfflineFiles(urls, toFolder) {
    const cfg = getConfig();
    const req = create(AddOfflineFileRequestSchema, {
      urls,
      toFolder: cfg.offlineDestPath,
      checkFolderAfterSecs: BigInt(cfg.checkFolderAfterSecs)
    });
    return await getClient().addOfflineFiles(req);
  }
  async function findFileByPath(parentPath) {
    return await getClient().findFileByPath(create(FindFileByPathRequestSchema, { parentPath, path: "." }));
  }
  async function listAllOfflineFiles(page = 1, pathOverride) {
    const cfg = getConfig();
    const folderPath = cfg.offlineDestPath;
    const file = await findFileByPath(folderPath);
    const api = file.CloudAPI;
    if (!api) {
      throw new Error(`无法获取 ${folderPath} 所属云盘信息，请检查“离线下载路径”配置`);
    }
    const req = create(OfflineFileListAllRequestSchema, {
      cloudName: api.name,
      cloudAccountId: api.userName,
      page,
      path: folderPath
    });
    return await getClient().listAllOfflineFiles(req);
  }
  async function gmFetch(input, init = {}) {
    const GMX = typeof _GM_xmlhttpRequest === "function" ? _GM_xmlhttpRequest : void 0;
    if (!GMX) {
      return fetch(input, init);
    }
    const url = typeof input === "string" || input instanceof URL ? String(input) : input.url;
    const method = init.method ?? (typeof input === "object" && "method" in input ? input.method : "GET");
    const headersRecord = {};
    const pushHeader = (k, v) => {
      headersRecord[k] = v;
    };
    if (init.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((v, k) => {
          pushHeader(k, v);
        });
      } else if (Array.isArray(init.headers)) {
        for (const [k, v] of init.headers) pushHeader(k, v);
      } else {
        for (const [k, v] of Object.entries(init.headers)) pushHeader(k, v);
      }
    } else if (typeof input === "object" && input instanceof Request) {
      input.headers.forEach((v, k) => {
        pushHeader(k, v);
      });
    }
    let data;
    const body = init.body ?? (typeof input === "object" && input instanceof Request ? input.body : void 0);
    if (body instanceof ReadableStream) {
      const reader = body.getReader();
      const chunks = [];
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const total = chunks.reduce((n, c) => n + c.byteLength, 0);
      const merged = new Uint8Array(total);
      let offset = 0;
      for (const c of chunks) {
        merged.set(c, offset);
        offset += c.byteLength;
      }
      data = merged.buffer;
    } else if (body instanceof ArrayBuffer) {
      data = body;
    } else if (body instanceof Uint8Array) {
      const ab = new ArrayBuffer(body.byteLength);
      new Uint8Array(ab).set(body);
      data = ab;
    } else if (body instanceof Blob) {
      data = await body.arrayBuffer();
    } else if (typeof body === "string") {
      data = body;
    } else if (body == null) {
      data = void 0;
    } else {
      data = String(body);
    }
    return await new Promise((resolve, reject) => {
      try {
        const mUpper = (method || "GET").toUpperCase();
        GMX({
          url,
          method: mUpper,
          headers: headersRecord,
responseType: "arraybuffer",
          data,
          onload: (ev) => {
            const status = ev.status ?? 0;
            const statusText = ev.statusText ?? "";
            const headers = new Headers();
            if (ev.responseHeaders) {
              const lines = ev.responseHeaders.split(/\r?\n/);
              for (const line of lines) {
                const idx = line.indexOf(":");
                if (idx > 0) {
                  const k = line.slice(0, idx).trim();
                  const v = line.slice(idx + 1).trim();
                  if (k) headers.append(k, v);
                }
              }
            }
            const ab = ev.response ?? new ArrayBuffer(0);
            resolve(new Response(ab, { status, statusText, headers }));
          },
          onerror: () => reject(new TypeError("Network request failed (GM)")),
          ontimeout: () => reject(new TypeError("Network request timeout (GM)"))
        });
      } catch (e) {
        reject(e);
      }
    });
  }
  const gmFetch$1 = Object.freeze( Object.defineProperty({
    __proto__: null,
    default: gmFetch,
    gmFetch
  }, Symbol.toStringTag, { value: "Module" }));
  async function fetchMagnet(nyaaViewUrl) {
    const res = await gmFetch(nyaaViewUrl, { method: "GET" });
    if (!res.ok) throw new Error(`nyaa.si 请求失败: HTTP ${res.status}`);
    const html = await res.text();
    const m = html.match(/href="(magnet:\?[^"]+)"/);
    if (!m) throw new Error("nyaa.si 页面中未找到磁力链接");
    const magnet = m[1].replace(/&amp;/g, "&");
    const h = magnet.match(/xt=urn:btih:([0-9a-fA-F]{40}|[A-Z2-7]{32})/);
    if (!h) throw new Error("磁力链接中未找到 infohash");
    return { magnet, infoHash: h[1].toLowerCase() };
  }
  const COLORS = {
    info: "#616161",
    progress: "#1565c0",
    success: "#2e7d32",
    error: "#c62828"
  };
  const AUTO_DISMISS_MS = 8e3;
  let container = null;
  const banners = new Map();
  let nextId = 1;
  function getContainer() {
    if (container?.isConnected) return container;
    container = document.createElement("div");
    container.style.cssText = "position:fixed;top:16px;right:16px;z-index:2147483647;display:flex;flex-direction:column;gap:8px;align-items:flex-end;pointer-events:none;";
    document.body.appendChild(container);
    return container;
  }
  function dismiss(id) {
    const entry = banners.get(id);
    if (!entry) return;
    entry.el.remove();
    if (entry.timer !== null) window.clearTimeout(entry.timer);
    banners.delete(id);
  }
  function applyKind(entry, id, kind) {
    entry.el.style.background = COLORS[kind];
    if (entry.timer !== null) {
      window.clearTimeout(entry.timer);
      entry.timer = null;
    }
    if (kind === "success" || kind === "error") {
      entry.timer = window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    }
  }
  function createBanner(text, kind) {
    const id = nextId++;
    const el = document.createElement("div");
    el.style.cssText = "pointer-events:auto;display:flex;align-items:center;gap:10px;max-width:420px;padding:10px 14px;border-radius:6px;color:#fff;font-size:14px;line-height:1.4;font-family:system-ui,sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.3);word-break:break-all;";
    const textEl = document.createElement("span");
    textEl.textContent = text;
    const closeEl = document.createElement("span");
    closeEl.textContent = "×";
    closeEl.style.cssText = "cursor:pointer;font-size:18px;flex-shrink:0;opacity:.8;";
    closeEl.addEventListener("click", () => dismiss(id));
    el.append(textEl, closeEl);
    getContainer().appendChild(el);
    const entry = { el, textEl, timer: null };
    banners.set(id, entry);
    applyKind(entry, id, kind);
    return id;
  }
  function updateBanner(id, text, kind) {
    const entry = banners.get(id);
    if (!entry || !entry.el.isConnected) {
      banners.delete(id);
      createBanner(text, kind);
      return;
    }
    entry.textEl.textContent = text;
    applyKind(entry, id, kind);
  }
  const MAX_PAGES = 3;
  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
  async function findTask(infoHash) {
    const want = infoHash.toLowerCase();
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await listAllOfflineFiles(page);
      const hit = res.offlineFiles.find((f) => f.infoHash.toLowerCase() === want);
      if (hit) return hit;
      if (page >= res.pageCount) break;
    }
    return null;
  }
  async function trackTask(infoHash, bannerId, label) {
    const cfg = getConfig();
    const total = cfg.pollMaxChecks;
    let lastPercent = 0;
    for (let n = 1; n <= total; n++) {
      await sleep(cfg.pollIntervalSecs * 1e3);
      let task;
      try {
        task = await findTask(infoHash);
      } catch (e) {
        updateBanner(bannerId, `${label} 跟踪出错(${n}/${total}): ${e instanceof Error ? e.message : String(e)}`, "progress");
        continue;
      }
      if (!task) {
        updateBanner(bannerId, `${label} 跟踪下载(${n}/${total}) 任务列表中暂未找到`, "progress");
        continue;
      }
      lastPercent = Math.round(task.percendDone);
      switch (task.status) {
        case OfflineFileStatus.OFFLINE_FINISHED:
          updateBanner(bannerId, `${label} 下载成功`, "success");
          return;
        case OfflineFileStatus.OFFLINE_ERROR:
          updateBanner(bannerId, `${label} 下载失败`, "error");
          return;
        default:
          updateBanner(bannerId, `${label} 跟踪下载(${n}/${total}) ${lastPercent}%`, "progress");
      }
    }
    updateBanner(bannerId, `${label} 跟踪结束，任务仍在进行 ${lastPercent}%`, "info");
  }
  function registerSettingsMenu() {
    _GM_registerMenuCommand("CloudDrive2 设置", openSettings);
  }
  const OVERLAY_ID = "cd2-vcbs-settings-overlay";
  const FIELDS = [
    { key: "grpcBaseUrl", label: "CD2 地址", type: "text", placeholder: "http://localhost:19798" },
    { key: "apiToken", label: "API Token", type: "password", placeholder: "CD2 管理界面生成的 API Token" },
    { key: "offlineDestPath", label: "离线目标目录", type: "text", placeholder: "/115/离线" },
    { key: "checkFolderAfterSecs", label: "N 秒后检查目录 (0=不检查)", type: "number" },
    { key: "pollIntervalSecs", label: "跟踪轮询间隔 (秒)", type: "number" },
    { key: "pollMaxChecks", label: "跟踪轮询次数上限", type: "number" }
  ];
  function openSettings() {
    if (document.getElementById(OVERLAY_ID)) return;
    const cfg = getConfig();
    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.style.cssText = "position:fixed;inset:0;z-index:2147483646;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;";
    const panel = document.createElement("div");
    panel.style.cssText = "background:#fff;color:#333;border-radius:8px;padding:20px 24px;width:420px;max-width:92vw;font-size:14px;font-family:system-ui,sans-serif;box-shadow:0 4px 24px rgba(0,0,0,.4);";
    const title = document.createElement("div");
    title.textContent = "CloudDrive2 设置";
    title.style.cssText = "font-size:16px;font-weight:600;margin-bottom:14px;";
    panel.appendChild(title);
    const inputs = new Map();
    for (const f of FIELDS) {
      const row = document.createElement("label");
      row.style.cssText = "display:block;margin-bottom:10px;";
      const span = document.createElement("span");
      span.textContent = f.label;
      span.style.cssText = "display:block;margin-bottom:3px;color:#666;font-size:13px;";
      const input = document.createElement("input");
      input.type = f.type;
      input.value = String(cfg[f.key] ?? "");
      input.placeholder = f.placeholder ?? "";
      input.style.cssText = "width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #ccc;border-radius:4px;font-size:14px;background:#fff;color:#333;";
      row.append(span, input);
      panel.appendChild(row);
      inputs.set(f.key, input);
    }
    const status = document.createElement("div");
    status.style.cssText = "min-height:20px;margin:6px 0 12px;font-size:13px;color:#666;";
    panel.appendChild(status);
    const collect = () => {
      const read = (k) => inputs.get(k)?.value.trim() ?? "";
      return {
        grpcBaseUrl: read("grpcBaseUrl").replace(/\/+$/, ""),
        apiToken: read("apiToken"),
        offlineDestPath: read("offlineDestPath"),
        checkFolderAfterSecs: Math.max(0, Number(read("checkFolderAfterSecs")) || 0),
        pollIntervalSecs: Math.max(3, Number(read("pollIntervalSecs")) || 10),
        pollMaxChecks: Math.max(1, Number(read("pollMaxChecks")) || 5)
      };
    };
    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:10px;justify-content:flex-end;";
    const mkBtn = (text, primary) => {
      const b = document.createElement("button");
      b.textContent = text;
      b.style.cssText = "padding:6px 14px;border-radius:4px;font-size:14px;cursor:pointer;border:1px solid " + (primary ? "#1565c0;background:#1565c0;color:#fff;" : "#ccc;background:#f5f5f5;color:#333;");
      return b;
    };
    const testBtn = mkBtn("测试连接", false);
    testBtn.addEventListener("click", async () => {
      setConfig(collect());
      status.textContent = "连接中…";
      status.style.color = "#666";
      try {
        const info = await getSystemInfo();
        status.textContent = `连接成功：${info.IsLogin ? `已登录 ${info.UserName}` : "CD2 未登录账号"}${info.SystemReady ? "" : "（系统未就绪）"}`;
        status.style.color = "#2e7d32";
      } catch (e) {
        status.textContent = `连接失败: ${e instanceof Error ? e.message : String(e)}`;
        status.style.color = "#c62828";
      }
    });
    const saveBtn = mkBtn("保存", true);
    saveBtn.addEventListener("click", () => {
      setConfig(collect());
      overlay.remove();
    });
    const closeBtn = mkBtn("关闭", false);
    closeBtn.addEventListener("click", () => overlay.remove());
    btnRow.append(testBtn, closeBtn, saveBtn);
    panel.appendChild(btnRow);
    overlay.appendChild(panel);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
  }
  async function addToCloud(nyaaUrl, label) {
    const cfg = getConfig();
    if (!cfg.grpcBaseUrl || !cfg.apiToken || !cfg.offlineDestPath) {
      createBanner("请先完成 CloudDrive2 配置（地址 / API Token / 离线目标目录）", "error");
      openSettings();
      return;
    }
    const id = createBanner(`${label} 解析磁力中…`, "progress");
    try {
      const { magnet, infoHash } = await fetchMagnet(nyaaUrl);
      updateBanner(id, `${label} 提交离线任务中…`, "progress");
      const res = await addOfflineFiles(magnet);
      if (!res.success) {
        updateBanner(id, `${label} 添加失败: ${res.errorMessage || "未知错误"}`, "error");
        return;
      }
      updateBanner(id, `${label} 添加成功，开始跟踪…`, "progress");
      await trackTask(infoHash, id, label);
    } catch (e) {
      updateBanner(id, `${label} 添加失败: ${e instanceof Error ? e.message : String(e)}`, "error");
    }
  }
  const ACGNX_HASH_RE = /acgnx\.se\/show-([0-9a-fA-F]{40})\.html/;
  const SITE_PATTERNS = [
    ["bangumi.moe", /bangumi\.moe\/torrent\//],
    ["acgnx", /acgnx\.se\/show-/],
    ["acg.rip", /acg\.rip\/t\//],
    ["dmhy", /share\.dmhy\.org\/topics\/view\//],
    ["nyaa", /nyaa\.si\/view\//]
  ];
  function siteOf(url) {
    for (const [name, re] of SITE_PATTERNS) {
      if (re.test(url)) return name;
    }
    return null;
  }
  function extractDwBoxes(root = document) {
    const boxes = Array.from(root.querySelectorAll(".dw-box.dw-box-download"));
    return boxes.map((el) => {
      const title = Array.from(el.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent?.trim() ?? "").find((t) => t.length > 0) ?? "";
      const links = [];
      let infoHash = null;
      for (const a of Array.from(el.querySelectorAll("a[href]"))) {
        const site = siteOf(a.href);
        if (!site) continue;
        links.push({ site, url: a.href });
        const m = a.href.match(ACGNX_HASH_RE);
        if (m && !infoHash) infoHash = m[1].toLowerCase();
      }
      return { title, infoHash, links, el };
    });
  }
  function nyaaLinkOf(box) {
    return box.links.find((l) => l.site === "nyaa")?.url ?? null;
  }
  function pickBestBox(boxes) {
    if (boxes.length === 0) return null;
    const score = (t) => {
      const res = t.match(/(\d{3,4})p/i);
      let s = (res ? Number.parseInt(res[1], 10) : 0) * 10;
      if (/hevc|x265|h\.?265/i.test(t)) s += 5;
      if (/ma10p|10-?bit/i.test(t)) s += 2;
      return s;
    };
    return boxes.reduce((a, b) => score(b.title) > score(a.title) ? b : a);
  }
  function extractHomeCards(root = document) {
    const cards = Array.from(root.querySelectorAll("div.article.well.clearfix"));
    const out = [];
    for (const el of cards) {
      const titleA = el.querySelector('.title-article a[href*="/archives/"]');
      if (!titleA) continue;
      const title = titleA.textContent?.trim() ?? "";
      if (!/BDRip/i.test(title)) continue;
      out.push({
        title,
        archiveUrl: titleA.href,
        readMoreEl: el.querySelector("a.read-more"),
        mobileSection: el.querySelector("section.visible-xs"),
        el
      });
    }
    return out;
  }
  function shortTitle(title) {
    const first = title.split("/")[0].trim();
    return first.length > 0 ? first : title.trim();
  }
  const INJECTED_ATTR = "data-cd2-vcbs";
  function makeButton(text) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = text;
    btn.style.cssText = "display:inline-block;padding:5px 12px;border:none;border-radius:4px;cursor:pointer;background:#1565c0;color:#fff;font-size:13px;font-family:system-ui,sans-serif;line-height:1.4;";
    return btn;
  }
  function runOnce(btn, fn) {
    btn.addEventListener("click", () => {
      if (btn.disabled) return;
      btn.disabled = true;
      btn.style.opacity = "0.6";
      void fn().finally(() => {
        btn.disabled = false;
        btn.style.opacity = "1";
      });
    });
  }
  function initArchivePage() {
    const boxes = extractDwBoxes();
    for (const box of boxes) {
      if (box.el.hasAttribute(INJECTED_ATTR)) continue;
      box.el.setAttribute(INJECTED_ATTR, "1");
      const nyaa = nyaaLinkOf(box);
      const label = box.title || shortTitle(document.title);
      const btn = makeButton(`添加到 CD2 离线${box.title ? `（${box.title}）` : ""}`);
      if (!nyaa) {
        btn.disabled = true;
        btn.style.opacity = "0.5";
        btn.textContent = "未找到 nyaa.si 链接";
      } else {
        runOnce(btn, () => addToCloud(nyaa, label));
      }
      const p = document.createElement("p");
      p.style.marginTop = "8px";
      p.appendChild(btn);
      box.el.appendChild(p);
    }
  }
  async function addFromCard(archiveUrl, label) {
    let boxes;
    try {
      const res = await fetch(archiveUrl, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const doc = new DOMParser().parseFromString(await res.text(), "text/html");
      boxes = extractDwBoxes(doc);
    } catch (e) {
      createBanner(`${label} 添加失败: 拉取详情页出错 (${e instanceof Error ? e.message : String(e)})`, "error");
      return;
    }
    const best = pickBestBox(boxes);
    const nyaa = best ? nyaaLinkOf(best) : null;
    if (!best || !nyaa) {
      createBanner(`${label} 添加失败: 详情页中未找到 nyaa.si 下载链接`, "error");
      return;
    }
    await addToCloud(nyaa, label);
  }
  function initListPage() {
    const cards = extractHomeCards();
    for (const card of cards) {
      if (card.el.hasAttribute(INJECTED_ATTR)) continue;
      card.el.setAttribute(INJECTED_ATTR, "1");
      const label = shortTitle(card.title);
      if (card.readMoreEl) {
        const btn = makeButton("CD2 离线");
        btn.className = "pull-right";
        btn.style.marginRight = "8px";
        runOnce(btn, () => addFromCard(card.archiveUrl, label));
        card.readMoreEl.insertAdjacentElement("afterend", btn);
      }
      if (card.mobileSection) {
        const btn = makeButton("添加到 CD2 离线");
        btn.style.marginTop = "6px";
        runOnce(btn, () => addFromCard(card.archiveUrl, label));
        card.mobileSection.appendChild(btn);
      }
    }
  }
  function main() {
    registerSettingsMenu();
    if (/^\/archives\/\d+/.test(location.pathname)) {
      initArchivePage();
    } else {
      initListPage();
    }
  }
  main();

})();