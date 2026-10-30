'use strict';
/* TOWER PALS — matnlar (10 til). Kalitlar hamma tillarda bir xil bo'lishi shart. {n} — son. */
const STR = {
  en: {
    sub: 'Stack the pals up to the flag!', play: 'PLAY', level: 'Level', pals: 'Pals', map: 'Map', hint: 'Tap to drop!',
    perfect: ['Perfect!', 'Purrfect!', 'Amazing!'], next: 'NEXT', collapse: 'Timber!', oops: 'Oops!', paused: 'Paused', resume: 'Resume',
    retry: 'Try again', nextLevel: 'Next level', complete: 'Level complete!', fail: 'Oh no!', failFell: 'The tower fell!', failHearts: 'Out of hearts!',
    goal: 'Reach the flag!', newPal: 'New pal!', unlockAt: 'Level {n}', wind: 'Windy!', moving: 'Moving crane!', lowGrav: 'Low gravity!', heart: '+1 heart',
    chapters: ['Backyard', 'Sunny Beach', 'Snow Village', 'Big City', 'Moon Base'],
  },
  es: {
    sub: '¡Apila a los amigos hasta la bandera!', play: 'JUGAR', level: 'Nivel', pals: 'Amigos', map: 'Mapa', hint: '¡Toca para soltar!',
    perfect: ['¡Perfecto!', '¡Genial!', '¡Increíble!'], next: 'SIGUE', collapse: '¡Se cae!', oops: '¡Uy!', paused: 'Pausa', resume: 'Continuar',
    retry: 'Reintentar', nextLevel: 'Siguiente nivel', complete: '¡Nivel superado!', fail: '¡Oh, no!', failFell: '¡La torre se cayó!', failHearts: '¡Sin corazones!',
    goal: '¡Llega a la bandera!', newPal: '¡Nuevo amigo!', unlockAt: 'Nivel {n}', wind: '¡Viento!', moving: '¡Grúa móvil!', lowGrav: '¡Gravedad baja!', heart: '+1 corazón',
    chapters: ['Patio', 'Playa Soleada', 'Pueblo Nevado', 'Gran Ciudad', 'Base Lunar'],
  },
  pt: {
    sub: 'Empilhe os amigos até a bandeira!', play: 'JOGAR', level: 'Nível', pals: 'Amigos', map: 'Mapa', hint: 'Toque para soltar!',
    perfect: ['Perfeito!', 'Incrível!', 'Demais!'], next: 'PRÓXIMO', collapse: 'Desabou!', oops: 'Ops!', paused: 'Pausado', resume: 'Continuar',
    retry: 'Tentar de novo', nextLevel: 'Próximo nível', complete: 'Nível completo!', fail: 'Ah, não!', failFell: 'A torre caiu!', failHearts: 'Sem corações!',
    goal: 'Chegue à bandeira!', newPal: 'Novo amigo!', unlockAt: 'Nível {n}', wind: 'Vento!', moving: 'Guindaste móvel!', lowGrav: 'Gravidade baixa!', heart: '+1 coração',
    chapters: ['Quintal', 'Praia Ensolarada', 'Vila da Neve', 'Cidade Grande', 'Base Lunar'],
  },
  ru: {
    sub: 'Строй башню из зверят до флага!', play: 'ИГРАТЬ', level: 'Уровень', pals: 'Зверята', map: 'Карта', hint: 'Нажми, чтобы бросить!',
    perfect: ['Идеально!', 'Супер!', 'Класс!'], next: 'ДАЛЕЕ', collapse: 'Падает!', oops: 'Ой!', paused: 'Пауза', resume: 'Продолжить',
    retry: 'Ещё раз', nextLevel: 'Следующий уровень', complete: 'Уровень пройден!', fail: 'Ой-ой!', failFell: 'Башня упала!', failHearts: 'Сердца закончились!',
    goal: 'Дострой до флага!', newPal: 'Новый друг!', unlockAt: 'Уровень {n}', wind: 'Ветер!', moving: 'Кран едет!', lowGrav: 'Низкая гравитация!', heart: '+1 сердце',
    chapters: ['Двор', 'Солнечный пляж', 'Снежная деревня', 'Большой город', 'Лунная база'],
  },
  uz: {
    sub: 'Hayvonchalarni bayroqqacha tera!', play: "O'YNASH", level: 'Daraja', pals: "Do'stlar", map: 'Xarita', hint: 'Tashlash uchun bosing!',
    perfect: ['Mukammal!', "Zo'r!", 'Ajoyib!'], next: 'KEYINGI', collapse: 'Qulayapti!', oops: 'Voy!', paused: 'Pauza', resume: 'Davom etish',
    retry: 'Qayta urinish', nextLevel: 'Keyingi daraja', complete: 'Daraja bajarildi!', fail: 'Afsus!', failFell: 'Minora qulab tushdi!', failHearts: 'Yuraklar tugadi!',
    goal: 'Bayroqqacha yeting!', newPal: "Yangi do'st!", unlockAt: '{n}-daraja', wind: 'Shamol!', moving: 'Kran yuryapti!', lowGrav: 'Tortishish kuchsiz!', heart: '+1 yurak',
    chapters: ['Hovli', 'Quyoshli sohil', 'Qorli qishloq', 'Katta shahar', 'Oy bazasi'],
  },
  tr: {
    sub: 'Dostları bayrağa kadar diz!', play: 'OYNA', level: 'Seviye', pals: 'Dostlar', map: 'Harita', hint: 'Bırakmak için dokun!',
    perfect: ['Mükemmel!', 'Harika!', 'Süper!'], next: 'SIRADAKİ', collapse: 'Yıkılıyor!', oops: 'Hay aksi!', paused: 'Duraklatıldı', resume: 'Devam',
    retry: 'Tekrar dene', nextLevel: 'Sonraki seviye', complete: 'Seviye tamam!', fail: 'Eyvah!', failFell: 'Kule yıkıldı!', failHearts: 'Kalp kalmadı!',
    goal: 'Bayrağa ulaş!', newPal: 'Yeni dost!', unlockAt: 'Seviye {n}', wind: 'Rüzgâr!', moving: 'Hareketli vinç!', lowGrav: 'Düşük yerçekimi!', heart: '+1 kalp',
    chapters: ['Arka Bahçe', 'Güneşli Plaj', 'Karlı Köy', 'Büyük Şehir', 'Ay Üssü'],
  },
  id: {
    sub: 'Tumpuk teman sampai ke bendera!', play: 'MAIN', level: 'Level', pals: 'Teman', map: 'Peta', hint: 'Ketuk untuk menjatuhkan!',
    perfect: ['Sempurna!', 'Hebat!', 'Keren!'], next: 'BERIKUT', collapse: 'Roboh!', oops: 'Ups!', paused: 'Jeda', resume: 'Lanjut',
    retry: 'Coba lagi', nextLevel: 'Level berikutnya', complete: 'Level selesai!', fail: 'Oh tidak!', failFell: 'Menaranya roboh!', failHearts: 'Hati habis!',
    goal: 'Capai benderanya!', newPal: 'Teman baru!', unlockAt: 'Level {n}', wind: 'Berangin!', moving: 'Derek bergerak!', lowGrav: 'Gravitasi rendah!', heart: '+1 hati',
    chapters: ['Halaman', 'Pantai Cerah', 'Desa Salju', 'Kota Besar', 'Pangkalan Bulan'],
  },
  fr: {
    sub: 'Empile les copains jusqu’au drapeau !', play: 'JOUER', level: 'Niveau', pals: 'Copains', map: 'Carte', hint: 'Touche pour lâcher !',
    perfect: ['Parfait !', 'Génial !', 'Incroyable !'], next: 'SUIVANT', collapse: 'Ça tombe !', oops: 'Oups !', paused: 'Pause', resume: 'Reprendre',
    retry: 'Réessayer', nextLevel: 'Niveau suivant', complete: 'Niveau réussi !', fail: 'Oh non !', failFell: 'La tour est tombée !', failHearts: 'Plus de cœurs !',
    goal: 'Atteins le drapeau !', newPal: 'Nouveau copain !', unlockAt: 'Niveau {n}', wind: 'Du vent !', moving: 'Grue mobile !', lowGrav: 'Gravité faible !', heart: '+1 cœur',
    chapters: ['Jardin', 'Plage Ensoleillée', 'Village Enneigé', 'Grande Ville', 'Base Lunaire'],
  },
  de: {
    sub: 'Staple die Freunde bis zur Flagge!', play: 'SPIELEN', level: 'Level', pals: 'Freunde', map: 'Karte', hint: 'Tippen zum Fallenlassen!',
    perfect: ['Perfekt!', 'Super!', 'Klasse!'], next: 'NÄCHSTES', collapse: 'Er kippt!', oops: 'Hoppla!', paused: 'Pause', resume: 'Weiter',
    retry: 'Nochmal', nextLevel: 'Nächstes Level', complete: 'Level geschafft!', fail: 'Oh nein!', failFell: 'Der Turm ist umgefallen!', failHearts: 'Keine Herzen mehr!',
    goal: 'Erreiche die Flagge!', newPal: 'Neuer Freund!', unlockAt: 'Level {n}', wind: 'Windig!', moving: 'Fahrender Kran!', lowGrav: 'Wenig Schwerkraft!', heart: '+1 Herz',
    chapters: ['Garten', 'Sonnenstrand', 'Schneedorf', 'Großstadt', 'Mondbasis'],
  },
  hi: {
    sub: 'दोस्तों को झंडे तक जमाओ!', play: 'खेलें', level: 'लेवल', pals: 'दोस्त', map: 'नक्शा', hint: 'गिराने के लिए टैप करें!',
    perfect: ['परफ़ेक्ट!', 'शानदार!', 'कमाल!'], next: 'अगला', collapse: 'गिर रहा है!', oops: 'उफ़!', paused: 'रुका हुआ', resume: 'जारी रखें',
    retry: 'फिर कोशिश करें', nextLevel: 'अगला लेवल', complete: 'लेवल पूरा!', fail: 'अरे नहीं!', failFell: 'मीनार गिर गई!', failHearts: 'दिल खत्म!',
    goal: 'झंडे तक पहुँचो!', newPal: 'नया दोस्त!', unlockAt: 'लेवल {n}', wind: 'तेज़ हवा!', moving: 'चलती क्रेन!', lowGrav: 'कम गुरुत्व!', heart: '+1 दिल',
    chapters: ['आँगन', 'धूप वाला समुद्र तट', 'बर्फ़ीला गाँव', 'बड़ा शहर', 'चाँद का अड्डा'],
  },
};
