const XLSX = require('xlsx');
const path = require('path');

// Colonnes attendues par le backend (ResultatService.java):
// A=Convocation (YYYY-RES-XXXX), B=CIN, C=Nom & Prénom, D=Note 1, E=Note 2, F=Moyenne, G=Rang, H=Statut

const data = [
  ["Convocation", "CIN", "Nom & Prénom", "Note 1", "Note 2", "Moyenne", "Rang", "Statut"], // En-têtes
  ["2026-RES-0142", "14373619", "Sirine Haboubi", 88.5, 172.0, 130.25, 1, "ADMIS"]
];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet(data);

XLSX.utils.book_append_sheet(wb, ws, "Résultats");

const fileName = 'result-concours.xlsx';
const filePath = path.join(__dirname, fileName);
XLSX.writeFile(wb, filePath);

console.log('Fichier Excel généré avec succès dans le format officiel : ' + filePath);
