// -------------------- Firebase Setup --------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAFrTl69PSRMptdzpenzJufCJ2E70D0L54",
    authDomain: "notapengeluaranapp.firebaseapp.com",
    projectId: "notapengeluaranapp",
    storageBucket: "notapengeluaranapp.firebasestorage.app",
    messagingSenderId: "667913212428",
    appId: "1:667913212428:web:1cf5b4c1d7f82ec52d5429",
    measurementId: "G-NP9R7815PK",
    databaseURL: "https://notapengeluaranapp-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);


// -------------------- Helper Format Rupiah --------------------
function formatRupiah(num) {
    return "Rp " + Number(num).toLocaleString("id-ID");
}


// -------------------- NAV --------------------
window.showPage = function(pg) {
    document.getElementById("gaji").style.display = "none";
    document.getElementById("pengeluaran").style.display = "none";
    document.getElementById(pg).style.display = "block";
};


// -------------------- GAJI --------------------
window.tambahGaji = function() {
    let nama = gajiNama.value;
    let jumlah = gajiJumlah.value;
    if (!nama || !jumlah) return;

    push(ref(db, "gaji"), { nama, jumlah: Number(jumlah) });

    gajiNama.value = "";
    gajiJumlah.value = "";
};

// Load Gaji
onValue(ref(db, "gaji"), snap => {
    let tbody = document.getElementById("gajiTable");
    tbody.innerHTML = "";
    if (!snap.val()) return;

    Object.entries(snap.val()).forEach(([id, item]) => {
        tbody.innerHTML += `
            <tr>
                <td>${item.nama}</td>
                <td>${formatRupiah(item.jumlah)}</td>
                <td>
                    <button onclick="hapusGaji('${id}')">Hapus</button>
                </td>
            </tr>
        `;
    });
});

window.hapusGaji = function(id) {
    remove(ref(db, "gaji/" + id));
};


// -------------------- PENGELUARAN --------------------
window.tambahPengeluaran = function() {
    let tgl = pengTanggal.value;
    let nama = pengNama.value;
    let qty = pengQty.value;
    let harga = pengHarga.value;

    if (!tgl || !nama || !qty || !harga) return;

    // ambil angka pertama dari "qty" (misal: "10 kg" → 10)
    let qtyNum = parseFloat(qty);

    push(ref(db, "pengeluaran"), {
        tgl,
        nama,
        qty,        // simpan teks utuh
        harga: Number(harga),
        total: qtyNum * Number(harga)
    });

    pengNama.value = "";
    pengQty.value = "";
    pengHarga.value = "";
};


// Load & Group Pengeluaran
onValue(ref(db, "pengeluaran"), snap => {
    let data = snap.val();
    let wrapper = document.getElementById("pengeluaranWrapper");
    wrapper.innerHTML = "";

    if (!data) return;

    let group = {};
    Object.entries(data).forEach(([id, item]) => {
        if (!group[item.tgl]) group[item.tgl] = [];
        group[item.tgl].push({ id, ...item });
    });

    let grand = 0;

    Object.keys(group).sort().forEach(tgl => {
        let subtotal = 0;

        let card = document.createElement("div");
        card.className = "card";

        card.innerHTML = `
            <h3>📅 ${tgl}</h3>
            <table>
                <thead>
                    <tr>
                        <th>Nama Barang</th>
                        <th>Banyaknya</th>
                        <th>Harga</th>
                        <th>Total</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody id="body-${tgl}"></tbody>
            </table>
            <h4>Subtotal: <span id="sub-${tgl}">0</span></h4>
            <button onclick="exportPerTanggalPDF('${tgl}')">Download PDF Tanggal Ini</button>
        `;

        wrapper.appendChild(card);

        let tbody = document.getElementById("body-" + tgl);

        group[tgl].forEach(item => {
            subtotal += item.total;

            tbody.innerHTML += `
                <tr>
                    <td>${item.nama}</td>
                    <td>${item.qty}</td>
                    <td>${formatRupiah(item.harga)}</td>
                    <td>${formatRupiah(item.total)}</td>
                    <td>
                        <button onclick="hapusPeng('${item.id}')">Hapus</button>
                    </td>
                </tr>
            `;
        });

        document.getElementById("sub-" + tgl).innerText = formatRupiah(subtotal);
        grand += subtotal;
    });

    document.getElementById("grandTotalRp").innerText = formatRupiah(grand);
});


// Hapus pengeluaran
window.hapusPeng = function(id) {
    remove(ref(db, "pengeluaran/" + id));
};


// -------------------- EXPORT PDF --------------------
window.exportSemuaPDF = function() {
    window.print();
}

window.exportPerTanggalPDF = function(tgl) {
    alert("Untuk sekarang masih memakai print seleksi. Jika mau aku buatkan generator PDF khusus yang rapi.");
}
