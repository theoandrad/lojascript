const rsvpForm = document.getElementById('rsvp-form');
const rsvpFeedback = document.getElementById('rsvp-feedback');
const tableForm = document.getElementById('table-form');
const tableResult = document.getElementById('table-result');
const giftList = document.getElementById('gift-list');
const photoForm = document.getElementById('photo-form');
const photoGrid = document.getElementById('photo-grid');
const qrPreview = document.getElementById('qr-preview');
const qrDownload = document.getElementById('qr-download');

const QR_STORAGE_KEY = 'rsvp-qr-entry';

const mockTables = new Map([
  ['isabela barcelos', 1],
  ['thiago barcelos', 1],
  ['carolina dias', 4],
  ['joão victor', 4],
  ['sara campos', 7],
  ['rodrigo campos', 7],
  ['lucas amaral', 10],
  ['helena pereira', 5]
]);

const gifts = [
  { name: 'Experiência gastronômica em Paraty', price: 'R$ 380' },
  { name: 'Noite romântica no hotel', price: 'R$ 520' },
  { name: 'Quadro personalizado da cerimônia', price: 'R$ 250' },
  { name: 'Cotas para lua de mel na Toscana', price: 'A partir de R$ 200' },
  { name: 'Kit café da manhã dos noivos', price: 'R$ 180' },
  { name: 'Adoção simbólica de árvore', price: 'R$ 150' }
];

const defaultPhotos = [
  {
    src: 'https://images.unsplash.com/photo-1520854223470-84105f9420da?auto=format&fit=crop&w=900&q=80',
    caption: 'Pré-wedding em Paraty'
  },
  {
    src: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
    caption: 'Save the date'
  },
  {
    src: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80',
    caption: 'Brunch com madrinhas'
  }
];

function loadReservations() {
  try {
    return JSON.parse(localStorage.getItem('gift-reservations')) ?? {};
  } catch (error) {
    return {};
  }
}

function saveReservations(data) {
  localStorage.setItem('gift-reservations', JSON.stringify(data));
}

function renderGifts() {
  const reservations = loadReservations();
  giftList.innerHTML = '';

  gifts.forEach(gift => {
    const li = document.createElement('li');
    const reserved = Boolean(reservations[gift.name]);
    li.dataset.reserved = reserved;
    li.innerHTML = `
      <strong>${gift.name}</strong>
      <span>${gift.price}</span>
      <button class="button" type="button">${reserved ? 'Reservado' : 'Reservar'}</button>
    `;
    const button = li.querySelector('button');
    button.disabled = reserved;
    button.addEventListener('click', () => {
      reservations[gift.name] = true;
      saveReservations(reservations);
      renderGifts();
    });
    giftList.appendChild(li);
  });
}

function renderPhotos() {
  const saved = JSON.parse(localStorage.getItem('wedding-photos') ?? '[]');
  const photos = [...defaultPhotos, ...saved];
  photoGrid.innerHTML = '';

  photos.forEach((photo, index) => {
    const figure = document.createElement('figure');
    figure.innerHTML = `
      <img src="${photo.src}" alt="Foto ${index + 1}" loading="lazy" />
      <figcaption>${photo.caption ?? 'Convidado'}</figcaption>
    `;
    photoGrid.appendChild(figure);
  });
}

rsvpForm?.addEventListener('submit', event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(rsvpForm));
  const stored = JSON.parse(localStorage.getItem('rsvp-list') ?? '[]');
  const qrEntry = generateQrEntry(data);
  stored.push({ ...qrEntry, submittedAt: new Date().toISOString() });
  localStorage.setItem('rsvp-list', JSON.stringify(stored));
  saveQrEntry(qrEntry);
  renderQrPreview(qrEntry);
  rsvpForm.reset();
  rsvpFeedback.textContent = 'Obrigado! Seu QR Code de confirmação foi gerado e está disponível ao lado.';
});

rsvpForm?.addEventListener('input', () => {
  rsvpFeedback.textContent = '';
});

tableForm?.addEventListener('submit', event => {
  event.preventDefault();
  const guest = new FormData(tableForm).get('guest')?.toString().trim().toLowerCase();

  if (!guest) {
    tableResult.textContent = 'Informe um nome válido para consulta.';
    return;
  }

  const table = mockTables.get(guest);
  tableResult.textContent = table
    ? `${guest.toUpperCase()} — Mesa ${table}`
    : 'Não encontramos seu nome. Entre em contato com o cerimonial.';
});

photoForm?.addEventListener('submit', event => {
  event.preventDefault();
  const url = new FormData(photoForm).get('photo');
  if (!url) return;
  const saved = JSON.parse(localStorage.getItem('wedding-photos') ?? '[]');
  saved.push({ src: url, caption: 'Convidado' });
  localStorage.setItem('wedding-photos', JSON.stringify(saved));
  photoForm.reset();
  renderPhotos();
});

function saveQrEntry(entry) {
  localStorage.setItem(QR_STORAGE_KEY, JSON.stringify(entry));
}

function getSavedQrEntry() {
  try {
    return JSON.parse(localStorage.getItem(QR_STORAGE_KEY) ?? 'null');
  } catch (error) {
    return null;
  }
}

function buildQrPayload(entry) {
  if (!entry) return null;
  return [
    'Casamento Isabela & Thiago',
    `Convidado: ${entry.name}`,
    `E-mail: ${entry.email}`,
    `Convidados: ${entry.guests}`,
    `Código: ${entry.code}`
  ].join(' | ');
}

function renderQrPreview(entry) {
  if (!qrPreview) return;

  if (!entry) {
    qrPreview.innerHTML = '<p>Envie o formulário para gerar seu QR Code exclusivo.</p>';
    qrDownload?.setAttribute('hidden', '');
    return;
  }

  const payload = buildQrPayload(entry);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(payload)}`;
  qrPreview.innerHTML = `
    <div>
      <img src="${qrUrl}" alt="QR Code da confirmação de presença" />
      <p><strong>${entry.name}</strong><br />Código: ${entry.code.slice(-6).toUpperCase()}</p>
    </div>
  `;
  if (qrDownload) {
    qrDownload.href = qrUrl;
    qrDownload.hidden = false;
    qrDownload.setAttribute('aria-label', `Baixar QR Code de ${entry.name}`);
  }
}

function generateQrEntry(data) {
  const codeBase = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)).replace(/-/g, '');
  return {
    name: data.name,
    email: data.email,
    guests: Number(data.guests ?? 1),
    notes: data.notes,
    code: codeBase.slice(-10)
  };
}

renderGifts();
renderPhotos();
renderQrPreview(getSavedQrEntry());
