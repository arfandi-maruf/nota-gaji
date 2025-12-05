// Firebase Global
const fb = window.firebaseRT;

// Data cache untuk render
let data = [];

function formatRupiah(angka) {
  return "Rp " + Number(angka).toLocaleString("id-ID");
}

function showPage(page) {
  document.getElementById("gajiPage").style.display = "none";
  document.getElementById("pengeluaranPage").style.display = "none";
  document.getElementById(page).style.display = "block";
}

/* ================= LISTENER ================= */
const notaRef = fb.ref(fb.db, "nota");

fb.onValue(notaRef, (snapshot) => {
  const obj = snapshot.val() || {};
  data = Object.entries(obj).map(([k, v]) => ({ _id: k, ...v }));
  data.sort((a,b) => (a.createdAt || 0) - (b.createdAt || 0));
  tampilkan();
});

/* ================= TAMBAH ================= */
function tambahGaji() {
  const tgl = gajiTanggal.value;
  const jml = Number(gajiJumlah.value);

  if (!tgl || !jml) return alert("Isi semua!");

  fb.push(notaRef, {
    jenis: "gaji",
    tanggal: tgl,
    jumlah: jml,
    total: jml,
    createdAt: Date.now()
  });

  gajiTanggal.value = "";
  gajiJumlah.value = "";
}

function tambahPengeluaran() {
  const tgl = pengTanggal.value;
  const nama = pengNama.value.trim();
  const qty = Number(pengQty.value);
  const harga = Number(pengHarga.value);

  if (!tgl || !nama || !qty || !harga) return alert("Isi semua!");

  fb.push(notaRef, {
    jenis: "pengeluaran",
    tanggal: tgl,
    nama,
    qty,
    harga,
    total: qty * harga,
    createdAt: Date.now()
  });

  pengTanggal.value = "";
  pengNama.value = "";
  pengQty.value = "";
  pengHarga.value = "";
}

/* ================= HAPUS ================= */
function hapusItemById(id) {
  if (!confirm("Hapus item ini?")) return;
  fb.remove(fb.ref(fb.db, "nota/" + id));
}

async function hapusSemua(jenis) {
  if (!confirm("Hapus semua " + jenis + "?")) return;

  const snap = await fb.get(notaRef);
  const val = snap.val() || {};

  const del = [];
  Object.entries(val).forEach(([k, v]) => {
    if (v.jenis === jenis) del.push(k);
  });

  del.forEach(k => fb.remove(fb.ref(fb.db, "nota/" + k)));
}

/* ================= EXPORT / IMPORT ================= */
function exportData() {
  const exp = data.map(({ _id, ...rest }) => rest);
  const blob = new Blob([JSON.stringify(exp, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "backup-nota.json";
  a.click();
}

function openImportDialog() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const text = await file.text();
    const arr = JSON.parse(text);

    if (!confirm("Import akan MENGHAPUS seluruh data lama. Lanjutkan?"))
      return;

    // hapus semua
    const snap = await fb.get(notaRef);
    const cur = snap.val() || {};
    await Promise.all(Object.keys(cur).map(k => fb.remove(fb.ref(fb.db, "nota/" + k))));

    // push baru
    arr.forEach(item =>
      fb.push(notaRef, { ...item, createdAt: item.createdAt || Date.now() })
    );
  };

  input.click();
}

/* ================= PDF ================= */
function downloadPDF(jenis) {
  let area = document.createElement("div");

  // clone tabel saja (tanpa tombol)
  if (jenis === "gaji")
    area.innerHTML = document.getElementById("tabelGajiWrapper").innerHTML;
  else
    area.innerHTML = document.getElementById("tabelPengWrapper").innerHTML;

  html2pdf(area, {
    margin: 10,
    filename: jenis + "_nota.pdf",
    html2canvas: { scale: 2 },
    jsPDF: { unit: "mm", format: "a4" }
  });
}

/* ================= RENDER ================= */
function tampilkan() {
  tampilkanGaji();
  tampilkanPengeluaran();
}

function tampilkanGaji() {
  const wrap = tabelGajiWrapper;
  wrap.innerHTML = "";

  const list = data.filter(x => x.jenis === "gaji");
  if (list.length === 0) {
    wrap.innerHTML = "<i>Tidak ada data</i>";
    grandTotalGaji.innerHTML = "";
    return;
  }

  const group = {};
  list.forEach(i => {
    if (!group[i.tanggal]) group[i.tanggal] = [];
    group[i.tanggal].push(i);
  });

  let grand = 0;

  Object.keys(group).sort().forEach(tgl => {
    let sub = 0;

    let html = `<h3>${tgl}</h3>
    <table>
      <thead><tr><th>No</th><th>Jumlah</th><th>Aksi</th></tr></thead>
      <tbody>`;

    group[tgl].forEach((r, i) => {
      sub += r.total;
      html += `
        <tr>
          <td>${i+1}</td>
          <td>${formatRupiah(r.total)}</td>
          <td><button onclick="hapusItemById('${r._id}')" class="danger">X</button></td>
        </tr>`;
    });

    html += `</tbody></table>
      <div class="subtotal">Subtotal: ${formatRupiah(sub)}</div>
      <hr>`;

    wrap.insertAdjacentHTML("beforeend", html);
    grand += sub;
  });

  grandTotalGaji.innerHTML = "Grand Total: " + formatRupiah(grand);
}

function tampilkanPengeluaran() {
  const wrap = tabelPengWrapper;
  wrap.innerHTML = "";

  const list = data.filter(x => x.jenis === "pengeluaran");
  if (!list.length) {
    wrap.innerHTML = "<i>Tidak ada data</i>";
    grandTotalPengeluaran.innerHTML = "";
    return;
  }

  const group = {};
  list.forEach(i => {
    if (!group[i.tanggal]) group[i.tanggal] = [];
    group[i.tanggal].push(i);
  });

  let grand = 0;

  Object.keys(group).sort().forEach(tgl => {
    let sub = 0;

    let html = `
    <h3>${tgl}</h3>
    <table>
      <thead><tr><th>No</th><th>Nama</th><th>Qty</th><th>Harga</th><th>Total</th><th>Aksi</th></tr></thead>
      <tbody>`;

    group[tgl].forEach((r, i) => {
      sub += r.total;

      html += `
        <tr>
          <td>${i+1}</td>
          <td>${r.nama}</td>
          <td>${r.qty}</td>
          <td>${formatRupiah(r.harga)}</td>
          <td>${formatRupiah(r.total)}</td>
          <td><button onclick="hapusItemById('${r._id}')" class="danger">X</button></td>
        </tr>`;
    });

    html += `</tbody></table>
      <div class="subtotal">Subtotal: ${formatRupiah(sub)}</div>
      <hr>`;

    wrap.insertAdjacentHTML("beforeend", html);
    grand += sub;
  });

  grandTotalPengeluaran.innerHTML = "Grand Total: " + formatRupiah(grand);
}
