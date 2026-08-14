#!/usr/bin/env node
/**
 * generate_test_pdfs.js — Generate both System A (jsPDF) and System B (HTML)
 * with identical Thai content for side-by-side comparison.
 *
 * Usage:
 *   cd fronend_02 && node tools/generate_test_pdfs.js
 *   → creates tools/export_pdfnew.pdf  (System A — jsPDF)
 *   → creates tools/pdfrender.html    (System B — open in Chrome, Print→Save PDF)
 *   → creates tools/page_analysis.json (machine-readable page breakdown)
 */

const { jsPDF } = require("jspdf");
const autoTable = require("jspdf-autotable").default;
const fs = require("fs");
const path = require("path");

const SECTOR_NAME = "กรุงเทพมหานคร 1 | กทม.";

// ══════════════════════════════════════════════════════════════
// SAMPLE DATA
// ══════════════════════════════════════════════════════════════

const SAMPLE = {
  id: 1001,
  dept_guard_post_count: 12, dept_current_personnel_count: 86,
  dept_missing_regular_count: 3, dept_missing_personnel_count: 7,
  dept_supplement_count: 2, dept_recruitment_count: 4,
  dept_reserve_units_count: 2, dept_reserve_personnel_count: 8,
  leave_personal_count: 3, leave_sick_count: 2, leave_absent_count: 1,
  leave_deserted_count: 0, leave_resigned_count: 0, leave_terminated_count: 0,
  shift_18_count: 24, shift_24_count: 36, shift_36_count: 18,
  training_shift_change_count: 6, training_planned_count: 3, training_duty_control_count: 12,
  disciplines: [
    { label: "เล่นโทรศัพท์มือถือ", value: 3 },
    { label: "ไม่มีเข็มขัด", value: 1 },
    { label: "ไม่แขวนบัตร", value: 2 },
    { label: "ชุดชำรุดเก่า", value: 1 },
  ],
  projects: [
    { project_name: "เข้าพบผู้ว่าจ้าง บริษัท ไทย安保 จำกัด — ประชุมทบทวนแผนรักษาความปลอดภัยประจำเดือนกรกฎาคม 2569", detail: "ประชุมหารือเรื่องแผนการปรับปรุงระบบกล้อง CCTV รอบโรงงาน และการจัดกำลังพลเสริมในช่วงวันหยุดยาว", status: "normal", note: "รอการอนุมัติงบประมาณจากฝ่ายบริหาร" },
    { project_name: "เข้าพบผู้ว่าจ้าง โรงงานอุตสาหกรรม เอ็นโด", detail: "ตรวจสอบจุดอับสายตาบริเวณรั้วด้านทิศตะวันออก", status: "warning", note: "เสนอให้ติดไฟส่องสว่างเพิ่ม" },
    { project_name: "ลูกค้ารายใหม่ — ห้างสรรพสินค้า เซ็นทรัล เฟสติวัล", detail: "", status: "normal", note: "" },
  ],
  guard_post_movements: [
    { name: "จุดที่ 1 — ประตูหน้า", detail: "เปลี่ยนเวรจากชุดเช้าเป็นชุดบ่ายก่อนกำหนด 1 ชั่วโมง เนื่องจากมีเหตุฉุกเฉิน", status: "ปกติ", note: "" },
    { name: "จุดที่ 3 — โกดังสินค้า", detail: "เพิ่มกำลังพล 1 นาย หลังจากตรวจพบความผิดปกติของระบบสัญญาณกันขโมย", status: "ผิดปกติ", note: "แจ้งหัวหน้าทีมแล้ว" },
    { name: "จุดที่ 5 — ลานจอดรถ", detail: "", status: "ปกติ", note: "" },
    { name: "จุดที่ 7 — อาคารสำนักงาน", detail: "ย้ายจุดเฝ้าจากชั้น 2 มาชั้น 1 เนื่องจากงานก่อสร้าง", status: "ปกติ", note: "" },
    { name: "จุดที่ 8 — คลังเก็บวัตถุอันตราย", detail: "แจ้งเตือนเหตุไฟดับ 30 นาที — ตรวจสอบแล้วเป็นปัญหาสายไฟเก่า", status: "ฉุกเฉิน", note: "ส่งรายงานแล้ว" },
  ],
};

// ══════════════════════════════════════════════════════════════
// SYSTEM A: jsPDF PDF
// ══════════════════════════════════════════════════════════════

function generatePdf(outputPath) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true });

  const M = 10, HEADER_H = 33, GAP = 2, ROW_H = 6.8;
  const FS = 7;
  const pageW = 297, pageH = 210, availW = pageW - M * 2;
  const CL = [217,217,217], CT = [0,0,0], CG = [208,208,208];
  const LW = 18; // label cell width

  let y = HEADER_H;
  const hdr = (pg) => { doc.setPage(pg); doc.setFont("helvetica","bold"); doc.setFontSize(13); doc.text("รายงานประจำวันฝ่ายปฏิบัติการ (รายละเอียดภาค)", pageW/2, 25, {align:"center"}); doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.text(SECTOR_NAME, pageW/2, 30, {align:"center"}); doc.setFontSize(7); doc.text("13/07/2569", pageW-M, 30, {align:"right"}); };
  const ftr = (pg, tot) => { doc.setPage(pg); doc.setFont("helvetica","normal"); doc.setFontSize(7); doc.text(`${pg} / ${tot}`, pageW-M, pageH-5, {align:"right"}); };
  hdr(1);

  const groups = [
    {i:1,t:"หน่วยงานที่รับผิดชอบ",r:[["จุดรักษาการณ์","12","หน่วยงาน"],["กำลังพลปัจจุบัน","86","คน"],["ขาดตัวประจำ","3","หน่วยงาน"],["ขาดกำลังพล","7","คน"],["จัดกำลังพลเสริมพิเศษ","2","คน"],["สรรหาผู้สมัครงานใหม่","4","คน"],["หน่วยงานสำรองเวร","2","หน่วย"],["กำลังพลสำรองเวร","8","นาย"]]},
    {i:2,t:"การลา",r:[["ลากิจ","3","คน"],["ลาป่วย","2","คน"],["ขาดงาน","1","คน"],["หนีหาย","0","คน"],["ลาออก","0","คน"],["ไล่ออก","0","คน"]]},
    {i:3,t:"การบริหารการครองเวร",r:[["18 ชั่วโมง","24","คน"],["24 ชั่วโมง","36","คน"],["36 ชั่วโมง","18","คน"]]},
    {i:4,t:"อบรมและควบคุมหน้าที่งาน",r:[["อบรมเปลี่ยนผลัด","6","หน่วยงาน"],["อบรมตามแผนงานที่กำหนด","3","หน่วยงาน"],["ควบคุมหน้าที่งาน","12","หน่วยงาน"]]},
    {i:5,t:"วินัยและการลงโทษ",r:[["เล่นโทรศัพท์มือถือ","3","คน"],["ไม่มีเข็มขัด","1","คน"],["ไม่แขวนบัตร","2","คน"],["ชุดชำรุดเก่า","1","คน"]]},
    {i:6,t:"เข้าพบผู้ว่าจ้าง",r:[["ไทย安保 จำกัด","ปกติ",""],["โรงงาน เอ็นโด","ผิดปกติ",""],["ห้างเซ็นทรัล","ปกติ",""]]},
    {i:7,t:"การเปลี่ยนแปลงจุดรักษาการณ์",r:[["จุดที่ 1","ปกติ","1 หน่วย"],["จุดที่ 3","ผิดปกติ","1 หน่วย"],["จุดที่ 5","ปกติ","1 หน่วย"],["จุดที่ 7","ปกติ","1 หน่วย"],["จุดที่ 8","ฉุกเฉิน","1 หน่วย"]]},
  ];

  const tW = (availW - 2*GAP)/3;
  const analysis = { systemA: { pages: [] }, systemB: { pages: [] } };
  let pageRows = [];

  for (let rs = 0; rs < groups.length; rs += 3) {
    const row = groups.slice(rs, rs+3);
    const rH = Math.max(...row.map(g=>(g.r.length+1)*ROW_H))+GAP;
    if (y+rH > pageH-M && y>HEADER_H+5) {
      analysis.systemA.pages.push({ pageNum: analysis.systemA.pages.length+1, type: "table_grid", tables: pageRows.slice() });
      pageRows = [];
      doc.addPage(); hdr(doc.getNumberOfPages()); y=HEADER_H;
    }
    for (let c=0;c<row.length;c++) {
      const g=row[c], ml=M+c*(tW+GAP);
      const body = g.r.map((r,i)=>[
        {content:`${g.i}.${i+1}`,styles:{fontSize:FS,halign:"center"}},
        {content:r[0],styles:{halign:"left",fontSize:FS}},
        {content:r[1],styles:{halign:"center",fontSize:FS,textColor:g.i===6?(r[1]==="ผิดปกติ"?[255,152,0]:CT):CT}},
      ]);
      autoTable(doc,{startY:y,margin:{left:ml,right:pageW-ml-tW,top:HEADER_H},tableWidth:tW,theme:"grid",
        head:[[{content:String(g.i),styles:{cellWidth:8,halign:"center",fontStyle:"bold",fillColor:CL,textColor:CT,fontSize:FS}},{content:g.t,colSpan:2,styles:{halign:"left",fontStyle:"bold",fillColor:CL,textColor:CT,fontSize:FS}}]],
        body,styles:{font:"helvetica",fontSize:FS,cellPadding:1.5,textColor:CT,lineColor:CG,lineWidth:0.1,fillColor:[255,255,255]},
        bodyStyles:{fillColor:[255,255,255]},alternateRowStyles:{fillColor:[255,255,255]}});
      pageRows.push({ groupIdx: g.i, title: g.t, rows: g.r.length });
    }
    y+=rH;
  }
  analysis.systemA.pages.push({ pageNum: analysis.systemA.pages.length+1, type: "table_grid", tables: pageRows.slice() });
  pageRows = [];

  // ── Detail pages ──
  doc.addPage(); hdr(doc.getNumberOfPages()); y=HEADER_H+2;

  // Section 6 head
  autoTable(doc,{startY:y,margin:{left:M,right:M,top:5},tableWidth:availW,theme:"grid",
    head:[[{content:"6",styles:{cellWidth:LW,halign:"center",fontStyle:"bold",fillColor:CL,textColor:CT,fontSize:FS}},{content:"เข้าพบผู้ว่าจ้าง (รายละเอียด)",colSpan:5,styles:{halign:"left",fontStyle:"bold",fillColor:CL,textColor:CT,fontSize:FS}}]],
    body:[],styles:{font:"helvetica",fontSize:FS,cellPadding:1.5,textColor:CT,lineColor:CG,lineWidth:0.1,fillColor:[255,255,255]}});
  y=doc.lastAutoTable.finalY;

  let detailItems = [];
  SAMPLE.projects.forEach((p,i)=>{
    const st=p.status==="warning"?"ผิดปกติ":p.status==="danger"?"ฉุกเฉิน":"ปกติ";
    const sc=p.status==="warning"?[255,152,0]:p.status==="danger"?[183,28,28]:CT;
    autoTable(doc,{startY:y,margin:{left:M,right:M,top:0},tableWidth:availW,theme:"grid",
      body:[
        [{content:`6.${i+1}`,styles:{cellWidth:LW,halign:"center",fontSize:FS}},{content:p.project_name,colSpan:5,styles:{halign:"left",fontSize:FS}}],
        [{content:"รายละเอียด",styles:{cellWidth:LW,halign:"center",fontSize:FS}},{content:p.detail||"-",colSpan:5,styles:{halign:"left",fontSize:FS}}],
        [{content:"สถานะ",styles:{cellWidth:LW,halign:"center",fontSize:FS}},{content:st,colSpan:5,styles:{halign:"left",fontSize:FS,textColor:sc}}],
        [{content:"หมายเหตุ",styles:{cellWidth:LW,halign:"center",fontSize:FS}},{content:p.note||"-",colSpan:5,styles:{halign:"left",fontSize:FS}}],
      ],
      styles:{font:"helvetica",fontSize:FS,cellPadding:1.5,textColor:CT,lineColor:CG,lineWidth:0.1,fillColor:[255,255,255]},
      bodyStyles:{fillColor:[255,255,255]},alternateRowStyles:{fillColor:[255,255,255]},
      columnStyles:{0:{cellWidth:LW,halign:"center"}}});
    y=doc.lastAutoTable.finalY+GAP;
    detailItems.push({section:6, num:`6.${i+1}`, label:p.project_name.substring(0,40)});
  });
  analysis.systemA.pages.push({pageNum:analysis.systemA.pages.length+1,type:"detail",section:6,items:detailItems.slice()});
  detailItems = [];

  // Section 7
  if(y+40>pageH-M){doc.addPage();hdr(doc.getNumberOfPages());y=HEADER_H+2;}
  autoTable(doc,{startY:y,margin:{left:M,right:M,top:5},tableWidth:availW,theme:"grid",
    head:[[{content:"7",styles:{cellWidth:LW,halign:"center",fontStyle:"bold",fillColor:CL,textColor:CT,fontSize:FS}},{content:"การเปลี่ยนแปลงจุดรักษาการณ์ (รายละเอียด)",colSpan:5,styles:{halign:"left",fontStyle:"bold",fillColor:CL,textColor:CT,fontSize:FS}}]],
    body:[],styles:{font:"helvetica",fontSize:FS,cellPadding:1.5,textColor:CT,lineColor:CG,lineWidth:0.1,fillColor:[255,255,255]}});
  y=doc.lastAutoTable.finalY;

  SAMPLE.guard_post_movements.forEach((m,i)=>{
    autoTable(doc,{startY:y,margin:{left:M,right:M,top:0},tableWidth:availW,theme:"grid",
      body:[
        [{content:`7.${i+1}`,styles:{cellWidth:LW,halign:"center",fontSize:FS}},{content:m.name,colSpan:5,styles:{halign:"left",fontSize:FS}}],
        [{content:"รายละเอียด",styles:{cellWidth:LW,halign:"center",fontSize:FS}},{content:m.detail||"-",colSpan:5,styles:{halign:"left",fontSize:FS}}],
        [{content:"สถานะ",styles:{cellWidth:LW,halign:"center",fontSize:FS}},{content:m.status||"-",colSpan:5,styles:{halign:"left",fontSize:FS}}],
        [{content:"หมายเหตุ",styles:{cellWidth:LW,halign:"center",fontSize:FS}},{content:m.note||"-",colSpan:5,styles:{halign:"left",fontSize:FS}}],
      ],
      styles:{font:"helvetica",fontSize:FS,cellPadding:1.5,textColor:CT,lineColor:CG,lineWidth:0.1,fillColor:[255,255,255]},
      bodyStyles:{fillColor:[255,255,255]},alternateRowStyles:{fillColor:[255,255,255]},
      columnStyles:{0:{cellWidth:LW,halign:"center"}}});
    y=doc.lastAutoTable.finalY+GAP;
    detailItems.push({section:7,num:`7.${i+1}`,label:m.name.substring(0,40)});
  });
  analysis.systemA.pages.push({pageNum:analysis.systemA.pages.length+1,type:"detail",section:7,items:detailItems.slice()});

  const tot=doc.getNumberOfPages();
  for(let p=1;p<=tot;p++) ftr(p,tot);
  doc.save(outputPath);
  analysis.systemA.totalPages = tot;
  return analysis;
}

// ══════════════════════════════════════════════════════════════
// SYSTEM B: HTML (PdfRender mirror — open in Chrome, Print→PDF)
// ══════════════════════════════════════════════════════════════

function generateHtml(outputPath) {
  const S = SAMPLE;
  const st = (s) => s==="warning"?"status-warning":s==="danger"?"status-danger":"status-normal";
  const sl = (s) => ({normal:"ปกติ",warning:"ผิดปกติ",danger:"ฉุกเฉิน"})[s]||"ปกติ";

  // Build table grid HTML for page 1
  const tableHTML = (idx, title, rows, renderFn) => `
    <div class="table-cell"><table>
      <thead><tr><th class="head-idx">${idx}</th><th class="head-title" colspan="3">${title}</th></tr></thead>
      <tbody>${rows.map((r,i)=>renderFn(idx,r,i)).join("\n")}</tbody>
    </table></div>`;

  const regularRow = (idx,r,i) => `<tr><td class="num">${idx}.${i+1}</td><td class="label">${r[0]}</td><td class="val">${r[1]}</td><td class="unit">${r[2]}</td></tr>`;
  const statusRow = (idx,r,i) => `<tr><td class="num">${idx}.${i+1}</td><td class="label">${r[0]}</td><td class="${st(r[1])}">${sl(r[1])}</td><td class="unit">${r[2]}</td></tr>`;

  // Detail block HTML
  const detailBlock = (idx, num, item, isProject) => `
    <table>
      <tr><td class="num" style="width:5%">${num}</td><td colspan="5" class="label">${item.project_name||item.name}</td></tr>
      <tr><td class="num" style="width:5%">รายละเอียด</td><td colspan="5">${item.detail||"-"}</td></tr>
      <tr><td class="num" style="width:5%">สถานะ</td><td colspan="5" class="${isProject?st(item.status):""}">${isProject?sl(item.status):(item.status||"-")}</td></tr>
      <tr><td class="num" style="width:5%">หมายเหตุ</td><td colspan="5">${item.note||"-"}</td></tr>
    </table>`;

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<title>PdfRender — System B (Print this page to PDF)</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Sarabun','Noto Sans Thai',Tahoma,sans-serif; font-size: 7px; background: #eee; }
  .pdf-page {
    width: 842px; height: 596px; padding: 15px 0 20px 0;
    background: white; margin: 10px auto; overflow: hidden;
    page-break-after: always; position: relative;
  }
  .pdf-page:last-child { page-break-after: auto; }
  .pdf-title-bar { text-align: center; font-size: 13px; font-weight: 700; padding: 4px 0 2px; }
  .pdf-meta-row { display: flex; justify-content: space-between; padding: 0 10px 8px; font-size: 9px; }
  .pdf-footer { position: absolute; bottom: 8px; right: 10px; font-size: 7px; }
  .grid-tables { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; padding: 0 10px; }
  .grid-tables .table-cell { grid-column: span 2; }
  table { width: 100%; border-collapse: collapse; border-top: 0.005px solid #d0d0d0; }
  th, td { font-size: 7px; padding: 3px 4px; }
  th { background: #d9d9d9; font-weight: 700; }
  .head-idx { width: 1%; text-align: left; }
  td.num { text-align: center; width: 22px; min-width: 22px; font-size: 6px; padding: 3px 2px; }
  td.val { text-align: center; width: 24px; }
  td.unit { text-align: center; width: 22px; word-break: break-word; }
  td.label { text-align: left; }
  .status-normal { color: #4caf50; text-align: center; }
  .status-warning { color: #ff9800; text-align: center; }
  .status-danger { color: #b71c1c; text-align: center; }
  .detail-section { padding: 0 10px; }
  .detail-section table { margin-bottom: 4px; border-top: 0.005px solid #d0d0d0; }
</style>
</head>
<body>

<!-- ═══ PAGE 1: TABLE GRIDS (all 7 groups, 3 per row) ═══ -->
<div class="pdf-page">
  <div class="pdf-title-bar">รายงานประจำวันฝ่ายปฏิบัติการ (รายละเอียดภาค)</div>
  <div class="pdf-meta-row"><span></span><span>${SECTOR_NAME}</span><span>13/07/2569</span></div>
  <div class="grid-tables">
    ${tableHTML(1,"หน่วยงานที่รับผิดชอบ", [["จุดรักษาการณ์","12","หน่วยงาน"],["กำลังพลปัจจุบัน","86","คน"],["ขาดตัวประจำ","3","หน่วยงาน"],["ขาดกำลังพล","7","คน"],["จัดกำลังพลเสริมพิเศษ","2","คน"],["สรรหาผู้สมัครงานใหม่","4","คน"],["หน่วยงานสำรองเวร","2","หน่วย"],["กำลังพลสำรองเวร","8","นาย"]], regularRow)}
    ${tableHTML(2,"การลา", [["ลากิจ","3","คน"],["ลาป่วย","2","คน"],["ขาดงาน","1","คน"],["หนีหาย","0","คน"],["ลาออก","0","คน"],["ไล่ออก","0","คน"]], regularRow)}
    ${tableHTML(3,"การบริหารการครองเวร", [["18 ชั่วโมง","24","คน"],["24 ชั่วโมง","36","คน"],["36 ชั่วโมง","18","คน"]], regularRow)}
    ${tableHTML(4,"อบรมและควบคุมหน้าที่งาน", [["อบรมเปลี่ยนผลัด","6","หน่วยงาน"],["อบรมตามแผนงานที่กำหนด","3","หน่วยงาน"],["ควบคุมหน้าที่งาน","12","หน่วยงาน"]], regularRow)}
    ${tableHTML(5,"วินัยและการลงโทษ", [["เล่นโทรศัพท์มือถือ","3","คน"],["ไม่มีเข็มขัด","1","คน"],["ไม่แขวนบัตร","2","คน"],["ชุดชำรุดเก่า","1","คน"]], regularRow)}
    ${tableHTML(6,"เข้าพบผู้ว่าจ้าง", [["ไทย安保 จำกัด","ปกติ",""],["โรงงาน เอ็นโด","ผิดปกติ",""],["ห้างเซ็นทรัล","ปกติ",""]], statusRow)}
    ${tableHTML(7,"การเปลี่ยนแปลงจุดรักษาการณ์", [["จุดที่ 1","ปกติ","1 หน่วย"],["จุดที่ 3","ผิดปกติ","1 หน่วย"],["จุดที่ 5","ปกติ","1 หน่วย"],["จุดที่ 7","ปกติ","1 หน่วย"],["จุดที่ 8","ฉุกเฉิน","1 หน่วย"]], statusRow)}
  </div>
  <div class="pdf-footer">1 / 2</div>
</div>

<!-- ═══ PAGE 2: DETAIL — Projects (6) + Guard Movements (7) ═══ -->
<div class="pdf-page">
  <div class="pdf-title-bar">รายงานประจำวันฝ่ายปฏิบัติการ (รายละเอียดภาค)</div>
  <div class="pdf-meta-row"><span></span><span>${SECTOR_NAME}</span><span>13/07/2569</span></div>
  <div class="detail-section">
    <table style="margin-bottom:2px"><thead><tr>
      <th style="width:5%;text-align:center">6</th>
      <th colspan="5" style="text-align:left">เข้าพบผู้ว่าจ้าง (รายละเอียด)</th>
    </tr></thead></table>
    ${S.projects.map((p,i)=>detailBlock(6,`6.${i+1}`,p,true)).join("\n    ")}
    <table style="margin-top:8px;margin-bottom:2px"><thead><tr>
      <th style="width:5%;text-align:center">7</th>
      <th colspan="5" style="text-align:left">การเปลี่ยนแปลงจุดรักษาการณ์ (รายละเอียด)</th>
    </tr></thead></table>
    ${S.guard_post_movements.map((m,i)=>detailBlock(7,`7.${i+1}`,m,false)).join("\n    ")}
  </div>
  <div class="pdf-footer">2 / 2</div>
</div>

</body>
</html>`;

  fs.writeFileSync(outputPath, html, "utf-8");
}

// ══════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════

const toolsDir = __dirname;
const pdfPath = path.join(toolsDir, "export_pdfnew.pdf");
const htmlPath = path.join(toolsDir, "pdfrender.html");

console.log("═══════════════════════════════════════════");
console.log("  Generating test PDFs for comparison");
console.log("═══════════════════════════════════════════\n");

const analysis = generatePdf(pdfPath);
generateHtml(htmlPath);

// Build System B analysis (static: 1 page tables + 1 page detail)
analysis.systemB.totalPages = 2;
analysis.systemB.pages = [
  { pageNum: 1, type: "table_grid", tables: [
    { groupIdx: 1, title: "หน่วยงานที่รับผิดชอบ", rows: 8 },
    { groupIdx: 2, title: "การลา", rows: 6 },
    { groupIdx: 3, title: "การบริหารการครองเวร", rows: 3 },
    { groupIdx: 4, title: "อบรมและควบคุมหน้าที่งาน", rows: 3 },
    { groupIdx: 5, title: "วินัยและการลงโทษ", rows: 4 },
    { groupIdx: 6, title: "เข้าพบผู้ว่าจ้าง", rows: 3 },
    { groupIdx: 7, title: "การเปลี่ยนแปลงจุดรักษาการณ์", rows: 5 },
  ]},
  { pageNum: 2, type: "detail", sections: [
    { section: 6, title: "เข้าพบผู้ว่าจ้าง", items: SAMPLE.projects.map((p,i)=>({num:`6.${i+1}`,label:p.project_name.substring(0,40)})) },
    { section: 7, title: "การเปลี่ยนแปลงจุดรักษาการณ์", items: SAMPLE.guard_post_movements.map((m,i)=>({num:`7.${i+1}`,label:m.name.substring(0,40)})) },
  ]},
];

fs.writeFileSync(path.join(toolsDir, "page_analysis.json"), JSON.stringify(analysis, null, 2), "utf-8");

console.log("\n═══════════════════════════════════════════");
console.log("  PAGE-BY-PAGE COMPARISON");
console.log("═══════════════════════════════════════════\n");

console.log(`System A (jsPDF):       ${analysis.systemA.totalPages} pages`);
console.log(`System B (PdfRender):   ${analysis.systemB.totalPages} pages`);
console.log("");

analysis.systemA.pages.forEach(p => {
  console.log(`  A Page ${p.pageNum}: ${p.type === "table_grid" ? `TABLE GRID — ${p.tables.length} tables` : `DETAIL — section ${p.section}, ${p.items.length} items`}`);
  if (p.tables) p.tables.forEach(t => console.log(`    └─ Group ${t.groupIdx}: ${t.title} (${t.rows} rows)`));
  if (p.items) p.items.forEach(i => console.log(`    └─ ${i.num}: ${i.label}`));
});

console.log("");
analysis.systemB.pages.forEach(p => {
  console.log(`  B Page ${p.pageNum}: ${p.type === "table_grid" ? `TABLE GRID — ${p.tables.length} tables` : `DETAIL — ${p.sections.length} sections`}`);
  if (p.tables) p.tables.forEach(t => console.log(`    └─ Group ${t.groupIdx}: ${t.title} (${t.rows} rows)`));
  if (p.sections) p.sections.forEach(s => console.log(`    └─ Section ${s.section}: ${s.title} (${s.items.length} items)`));
});

console.log("\n═══════════════════════════════════════════");
console.log("  FILES GENERATED");
console.log("═══════════════════════════════════════════");
console.log(`  1. ${pdfPath}`);
console.log(`  2. ${htmlPath}  ← Open in Chrome, Ctrl+P → Save as PDF`);
console.log(`  3. ${path.join(toolsDir, "page_analysis.json")}`);
console.log("");
console.log("  To compare with actual PDFs:");
console.log("  python3 tools/compare_pdf_systems.py tools/export_pdfnew.pdf <chrome_saved.pdf>");
