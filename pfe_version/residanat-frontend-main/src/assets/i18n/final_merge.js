const fs = require('fs');

function parseAndMerge(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let json = JSON.parse(content);
    
    const isAr = filePath.includes('ar.json');

    // 1. NAVBAR & SIDEBAR (Already mostly OK, but refine)
    if (!json.NAVBAR) json.NAVBAR = {};
    json.NAVBAR.HOME = isAr ? "الرئيسية" : "Accueil";

    if (!json.SIDEBAR) json.SIDEBAR = {};
    Object.assign(json.SIDEBAR, {
        "DASHBOARD": isAr ? "لوحة القيادة" : "Tableau de bord",
        "ADMIN_CONCOURS": isAr ? "إدارة المناظرات" : "Gestion des Concours",
        "ADMIN_CANDIDATS": isAr ? "إدارة المترشحين" : "Gestion des Candidats",
        "ADMIN_IMPORT_MINISTERE": isAr ? "استيراد الوزارة" : "Import Ministère",
        "ADMIN_IMPORT_RESULTATS": isAr ? "استيراد النتائج" : "Import Résultats",
        "RECLAMATION": isAr ? "الشكاوى" : "Réclamations",
        "SETTINGS": isAr ? "الإعدادات" : "Paramètres"
    });

    // 2. ADMIN_CANDIDATS - THE MISSING PART
    if (!json.ADMIN_CANDIDATS) json.ADMIN_CANDIDATS = {};
    
    // TABLE
    if (!json.ADMIN_CANDIDATS.TABLE) json.ADMIN_CANDIDATS.TABLE = {};
    Object.assign(json.ADMIN_CANDIDATS.TABLE, {
        "CANDIDAT": isAr ? "المترشح" : "Candidat",
        "ID": isAr ? "المعرف" : "ID",
        "CONCOURS": isAr ? "المناظرة" : "Concours",
        "FACULTY": isAr ? "الكلية" : "Faculté",
        "STATUS": isAr ? "الحالة" : "Statut",
        "ACTIONS": isAr ? "الإجراءات" : "Actions",
        "FOOTER_SHOW": isAr ? "عرض" : "Affichage de",
        "FOOTER_ON": isAr ? "من أصل" : "sur"
    });

    // EXCEL HEADERS (Used in some tables apparently)
    if (!json.ADMIN_CANDIDATS.EXCEL) json.ADMIN_CANDIDATS.EXCEL = {};
    if (!json.ADMIN_CANDIDATS.EXCEL.HEADERS) json.ADMIN_CANDIDATS.EXCEL.HEADERS = {};
    Object.assign(json.ADMIN_CANDIDATS.EXCEL.HEADERS, {
        "NOM": isAr ? "اللقب" : "Nom",
        "PRENOM": isAr ? "الاسم" : "Prénom",
        "EMAIL": isAr ? "البريد الإلكتروني" : "Email",
        "CIN": isAr ? "بطاقة التعريف" : "CIN",
        "PHONE": isAr ? "الهاتف" : "Téléphone",
        "NATIONALITY": isAr ? "الجنسية" : "Nationalité",
        "FACULTY": isAr ? "الكلية" : "Faculté",
        "STATUS": isAr ? "الحالة" : "Statut"
    });

    // 3. ADMIN_DASHBOARD (Preserve the huge work done)
    if (!json.ADMIN_DASHBOARD) json.ADMIN_DASHBOARD = {};
    const db = json.ADMIN_DASHBOARD;
    if (!db.KPIS) db.KPIS = {};
    if (!db.CHARTS) db.CHARTS = {};
    if (!db.DOSSIER_CHART) db.DOSSIER_CHART = {};
    
    Object.assign(db.KPIS, {
        "TOTAL_CANDIDATES": isAr ? "إجمالي المترشحين" : "Total Candidats",
        "VALIDATED_DOSSIERS": isAr ? "الملفات المصادق عليها" : "Dossiers Validés",
        "GENERATED_CONVOCATIONS": isAr ? "الاستدعاءات" : "Convocations",
        "ACTIVE_CLAIMS": isAr ? "المطالبات النشطة" : "Réclamations Actives"
    });

    // 4. RECLAMATIONS
    if (!json.RECLAMATIONS) json.RECLAMATIONS = {};
    if (!json.RECLAMATIONS.CATEGORIES) json.RECLAMATIONS.CATEGORIES = {};
    json.RECLAMATIONS.CATEGORIES.PROBLEME_RESULTAT = isAr ? "مشكلة في النتيجة" : "Problème Résultat";

    fs.writeFileSync(filePath, JSON.stringify(json, null, 2), 'utf8');
    console.log('Fixed ' + filePath);
}

parseAndMerge(process.argv[2]);
