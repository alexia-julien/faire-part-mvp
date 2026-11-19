// Encodeur de QR code (norme ISO/IEC 18004), autonome : aucune bibliothèque ni appel réseau.
// Mode octets (UTF-8), correction d'erreur niveau M (~15 %), versions 1 à 40, masque choisi par pénalité.
// FP.qr(texte) → { size, dark(x, y) }. FP.qrCanvas(texte, px) → <canvas> avec la marge réglementaire de 4 modules.
(function(){
  'use strict';
  var FP = window.FP = window.FP || {};

  // Niveau M : codes correcteurs par bloc et nombre de blocs, par version (index 0 inutilisé).
  var ECC_PER_BLOCK = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28];
  var NUM_BLOCKS = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49];
  var ECL_FORMAT_BITS = 0; // M

  function bit(x, i){ return ((x >>> i) & 1) !== 0; }
  function rawModules(ver){
    var r = (16 * ver + 128) * ver + 64;
    if(ver >= 2){ var n = Math.floor(ver / 7) + 2; r -= (25 * n - 10) * n - 55; if(ver >= 7) r -= 36; }
    return r;
  }
  function dataCodewords(ver){ return Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[ver] * NUM_BLOCKS[ver]; }

  // Corps de Galois GF(256), polynôme 0x11D.
  function mul(x, y){
    var z = 0;
    for(var i = 7; i >= 0; i--){ z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; }
    return z & 0xFF;
  }
  function rsDivisor(deg){
    var r = []; for(var i = 0; i < deg - 1; i++) r.push(0); r.push(1);
    var root = 1;
    for(var k = 0; k < deg; k++){
      for(var j = 0; j < r.length; j++){ r[j] = mul(r[j], root); if(j + 1 < r.length) r[j] ^= r[j + 1]; }
      root = mul(root, 0x02);
    }
    return r;
  }
  function rsRemainder(data, div){
    var r = div.map(function(){ return 0; });
    data.forEach(function(b){
      var f = b ^ r.shift(); r.push(0);
      for(var i = 0; i < div.length; i++) r[i] ^= mul(div[i], f);
    });
    return r;
  }

  function utf8(s){
    var out = [], e = unescape(encodeURIComponent(String(s)));
    for(var i = 0; i < e.length; i++) out.push(e.charCodeAt(i));
    return out;
  }

  FP.qr = function(text){
    var bytes = utf8(text), ver, cap;
    for(ver = 1; ver <= 40; ver++){
      cap = dataCodewords(ver) * 8;
      if(4 + (ver < 10 ? 8 : 16) + bytes.length * 8 <= cap) break;
    }
    if(ver > 40) throw new Error('Texte trop long pour un QR code');

    // Flux de bits : mode octets (0100), longueur, données, terminateur, octets de bourrage.
    var bits = [];
    function put(v, n){ for(var i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); }
    put(4, 4); put(bytes.length, ver < 10 ? 8 : 16); bytes.forEach(function(b){ put(b, 8); });
    put(0, Math.min(4, cap - bits.length));
    put(0, (8 - bits.length % 8) % 8);
    for(var pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) put(pad, 8);
    var data = [];
    for(var i = 0; i < bits.length; i += 8){ var v = 0; for(var j = 0; j < 8; j++) v = (v << 1) | bits[i + j]; data.push(v); }

    // Découpage en blocs, codes correcteurs, entrelacement.
    var nb = NUM_BLOCKS[ver], eccLen = ECC_PER_BLOCK[ver], raw = Math.floor(rawModules(ver) / 8);
    var nShort = nb - raw % nb, shortLen = Math.floor(raw / nb), div = rsDivisor(eccLen), blocks = [], k = 0;
    for(var b = 0; b < nb; b++){
      var dat = data.slice(k, k + shortLen - eccLen + (b < nShort ? 0 : 1)); k += dat.length;
      var ecc = rsRemainder(dat, div);
      if(b < nShort) dat.push(0);
      blocks.push(dat.concat(ecc));
    }
    var cw = [];
    for(var x = 0; x < blocks[0].length; x++){
      for(var y = 0; y < blocks.length; y++){ if(x !== shortLen - eccLen || y >= nShort) cw.push(blocks[y][x]); }
    }

    // Grille et motifs fixes.
    var size = ver * 4 + 17, mod = [], fn = [];
    for(var r = 0; r < size; r++){ mod.push(new Array(size).fill(false)); fn.push(new Array(size).fill(false)); }
    function setF(x, y, d){ mod[y][x] = d; fn[y][x] = true; }
    for(var t = 0; t < size; t++){ setF(6, t, t % 2 === 0); setF(t, 6, t % 2 === 0); }
    function finder(cx, cy){
      for(var dy = -4; dy <= 4; dy++) for(var dx = -4; dx <= 4; dx++){
        var d = Math.max(Math.abs(dx), Math.abs(dy)), xx = cx + dx, yy = cy + dy;
        if(xx >= 0 && xx < size && yy >= 0 && yy < size) setF(xx, yy, d !== 2 && d !== 4);
      }
    }
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    var al = [];
    if(ver > 1){
      var na = Math.floor(ver / 7) + 2, step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (na * 2 - 2)) * 2;
      al = [6]; for(var p = size - 7; al.length < na; p -= step) al.splice(1, 0, p);
    }
    al.forEach(function(ax, ia){
      al.forEach(function(ay, ib){
        if((ia === 0 && ib === 0) || (ia === 0 && ib === al.length - 1) || (ia === al.length - 1 && ib === 0)) return;
        for(var dy = -2; dy <= 2; dy++) for(var dx = -2; dx <= 2; dx++) setF(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      });
    });
    function formatBits(mask){
      var d = (ECL_FORMAT_BITS << 3) | mask, rem = d;
      for(var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      var v = ((d << 10) | rem) ^ 0x5412, q;
      for(q = 0; q <= 5; q++) setF(8, q, bit(v, q));
      setF(8, 7, bit(v, 6)); setF(8, 8, bit(v, 7)); setF(7, 8, bit(v, 8));
      for(q = 9; q < 15; q++) setF(14 - q, 8, bit(v, q));
      for(q = 0; q < 8; q++) setF(size - 1 - q, 8, bit(v, q));
      for(q = 8; q < 15; q++) setF(8, size - 15 + q, bit(v, q));
      setF(8, size - 8, true);
    }
    formatBits(0); // réserve les emplacements
    if(ver >= 7){
      var rem = ver;
      for(var q = 0; q < 12; q++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
      var vb = (ver << 12) | rem;
      for(var s = 0; s < 18; s++){ var bb = bit(vb, s), a = size - 11 + s % 3, c = Math.floor(s / 3); setF(a, c, bb); setF(c, a, bb); }
    }

    // Placement des données en zigzag.
    var n = 0;
    for(var right = size - 1; right >= 1; right -= 2){
      if(right === 6) right = 5;
      for(var vert = 0; vert < size; vert++){
        for(var z = 0; z < 2; z++){
          var xx = right - z, up = ((right + 1) & 2) === 0, yy = up ? size - 1 - vert : vert;
          if(!fn[yy][xx] && n < cw.length * 8){ mod[yy][xx] = bit(cw[n >>> 3], 7 - (n & 7)); n++; }
        }
      }
    }

    var MASKS = [
      function(x, y){ return (x + y) % 2 === 0; }, function(x, y){ return y % 2 === 0; },
      function(x){ return x % 3 === 0; }, function(x, y){ return (x + y) % 3 === 0; },
      function(x, y){ return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; },
      function(x, y){ return x * y % 2 + x * y % 3 === 0; },
      function(x, y){ return (x * y % 2 + x * y % 3) % 2 === 0; },
      function(x, y){ return ((x + y) % 2 + x * y % 3) % 2 === 0; }
    ];
    function applyMask(m){
      for(var y = 0; y < size; y++) for(var x = 0; x < size; x++) if(!fn[y][x] && MASKS[m](x, y)) mod[y][x] = !mod[y][x];
    }
    // Pénalités de la norme (N1 séries, N2 carrés 2×2, N3 motifs de type repère, N4 équilibre clair/foncé).
    function penalty(){
      var score = 0, dark = 0, x, y;
      function lines(get){
        for(var a = 0; a < size; a++){
          var run = 1, seq = '';
          for(var b = 0; b < size; b++){
            var v = get(a, b); seq += v ? '1' : '0';
            if(b > 0){ if(v === get(a, b - 1)){ run++; if(run === 5) score += 3; else if(run > 5) score++; } else run = 1; }
          }
          var pat = /(?=(10111010000|00001011101))/g;
          while(pat.exec(seq)){ score += 40; pat.lastIndex++; }
        }
      }
      lines(function(a, b){ return mod[a][b]; });
      lines(function(a, b){ return mod[b][a]; });
      for(y = 0; y < size - 1; y++) for(x = 0; x < size - 1; x++){
        var c = mod[y][x];
        if(c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) score += 3;
      }
      for(y = 0; y < size; y++) for(x = 0; x < size; x++) if(mod[y][x]) dark++;
      var total = size * size;
      score += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
      return score;
    }
    var best = 0, bestScore = Infinity;
    for(var m = 0; m < 8; m++){
      applyMask(m); formatBits(m);
      var sc = penalty();
      if(sc < bestScore){ bestScore = sc; best = m; }
      applyMask(m); // annule (XOR)
    }
    applyMask(best); formatBits(best);
    return { size: size, version: ver, mask: best, dark: function(x, y){ return x >= 0 && y >= 0 && x < size && y < size && mod[y][x]; } };
  };

  // Canvas carré de px pixels (au moins), modules entiers pour des bords nets, marge de 4 modules.
  FP.qrCanvas = function(text, px){
    var q = FP.qr(text), quiet = 4, total = q.size + quiet * 2, scale = Math.max(1, Math.ceil((px || 1024) / total));
    var cv = document.createElement('canvas'); cv.width = cv.height = total * scale;
    var g = cv.getContext('2d');
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, cv.width, cv.height);
    g.fillStyle = '#1F1B16';
    for(var y = 0; y < q.size; y++) for(var x = 0; x < q.size; x++) if(q.dark(x, y)) g.fillRect((x + quiet) * scale, (y + quiet) * scale, scale, scale);
    return cv;
  };
})();
