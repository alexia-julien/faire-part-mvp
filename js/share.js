// Partage du faire-part (US-10, US-11) : partage natif du téléphone, WhatsApp, SMS, email, et QR code en PNG haute définition.
// FP.shareKit(conteneur, { url, cfg, slug }) — utilisé sur l'écran de fin de création et sur « Mon faire-part ».
(function(){
  'use strict';
  var FP = window.FP = window.FP || {};

  // Texte prêt à envoyer : prénoms et date dans le message lui-même (l'aperçu du lien est générique, voir invitation.html).
  FP.shareText = function(cfg, url){
    var names = (cfg.partner1 || '') + ' & ' + (cfg.partner2 || ''), date = FP.formatDate ? FP.formatDate(cfg, false) : '';
    return names + (date ? ' se marient le ' + date + ' !' : ' se marient !') +
      ' Découvrez notre faire-part et dites-nous si vous serez là : ' + url;
  };
  FP.shareSubject = function(cfg){ return 'Notre faire-part de mariage — ' + (cfg.partner1 || '') + ' & ' + (cfg.partner2 || ''); };

  function el(tag, cls, text){ var e = document.createElement(tag); if(cls) e.className = cls; if(text) e.textContent = text; return e; }
  function fileName(cfg){ return 'qr-faire-part-' + (FP.slugify ? FP.slugify(cfg.partner1 + '-' + cfg.partner2) || 'mariage' : 'mariage') + '.png'; }

  FP.shareKit = function(box, opts){
    var url = opts.url, cfg = opts.cfg || {}, slug = opts.slug || '', text = FP.shareText(cfg, url);
    var track = function(ev, meta){ if(FP.track) FP.track(ev, meta, slug); };
    box.textContent = '';
    box.classList.add('share-kit');

    var row = el('div', 'share-row');
    // Partage natif (téléphone surtout) : ouvre la feuille de partage du système, avec toutes les applis installées.
    if(navigator.share){
      var nat = el('button', 'btn-main share-native', 'Partager…'); nat.type = 'button';
      nat.addEventListener('click', function(){
        navigator.share({ title: FP.shareSubject(cfg), text: text.replace(' : ' + url, '.'), url: url })
          .then(function(){ track('share', { channel: 'natif' }); }, function(){});
      });
      row.appendChild(nat);
    }
    [
      ['whatsapp', 'WhatsApp', 'https://wa.me/?text=' + encodeURIComponent(text)],
      ['sms', 'SMS', 'sms:?&body=' + encodeURIComponent(text)],
      ['email', 'Email', 'mailto:?subject=' + encodeURIComponent(FP.shareSubject(cfg)) + '&body=' + encodeURIComponent(text + '\n\n')]
    ].forEach(function(x){
      var a = el('a', 'btn-ghost share-' + x[0], x[1]);
      a.href = x[2];
      if(x[0] === 'whatsapp'){ a.target = '_blank'; a.rel = 'noopener'; }
      a.addEventListener('click', function(){ track('share', { channel: x[0] }); });
      row.appendChild(a);
    });
    box.appendChild(row);

    // QR code : aperçu à l'écran et téléchargement en PNG (1024 px minimum, marge réglementaire).
    var qrWrap = el('div', 'qr-wrap');
    var img = el('img', 'qr-img'); img.alt = 'QR code du faire-part'; img.width = 132; img.height = 132;
    var side = el('div', 'qr-side');
    side.appendChild(el('p', 'qr-title', 'QR code du faire-part'));
    side.appendChild(el('p', 'hint qr-hint', 'À scanner avec l’appareil photo d’un téléphone. Pratique sur un message, une affiche ou une table d’accueil.'));
    var dl = el('button', 'btn-ghost small qr-download', 'Télécharger le QR code (PNG)'); dl.type = 'button';
    side.appendChild(dl);
    qrWrap.appendChild(img); qrWrap.appendChild(side);
    box.appendChild(qrWrap);
    try{
      img.src = FP.qrCanvas(url, 264).toDataURL('image/png');
    }catch(e){ qrWrap.hidden = true; }
    dl.addEventListener('click', function(){
      var cv;
      try{ cv = FP.qrCanvas(url, 1024); }catch(e){ return; }
      var save = function(href, revoke){
        var a = document.createElement('a'); a.href = href; a.download = fileName(cfg);
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        if(revoke) setTimeout(function(){ URL.revokeObjectURL(href); }, 1500);
      };
      if(cv.toBlob) cv.toBlob(function(b){ if(b) save(URL.createObjectURL(b), true); else save(cv.toDataURL('image/png')); }, 'image/png');
      else save(cv.toDataURL('image/png'));
      track('qr_download');
    });
    return box;
  };
})();
