import { useState, type CSSProperties } from "react";

type Point = { x: number; y: number };
export type AdminFaceVisualPanel = "eye" | "nose" | "mouth" | "circle" | "quality" | "lighting";

export type AdminFaceVisualGuideValues = {
  eyeCenterXTolerance: number;
  eyeCenterYTolerance: number;
  minEyeDistance: number;
  maxEyeDistance: number;
  guideTolerance: number;
  noseXRatio: number;
  noseMinRatio: number;
  noseMaxRatio: number;
  mouthXRatio: number;
  mouthMinRatio: number;
  mouthMaxRatio: number;
  minFaceHeight: number;
  maxFaceHeight: number;
  eyeTiltMax: number;
  noseQualityXRatio: number;
};

export const FACE_GUIDE_OUTLINE =
  "M355 56 C245 54 160 105 112 202 C94 239 88 302 96 367 C63 365 42 392 42 436 C42 487 68 521 112 520 C124 622 169 720 246 781 C285 812 321 826 355 827 C389 826 425 812 464 781 C541 720 586 622 598 520 C642 521 668 487 668 436 C668 392 647 365 614 367 C622 302 616 239 598 202 C550 105 465 54 355 56 Z";

export const BOX_GUIDE_OUTLINE =
  "M78 76 H48 Q34 76 34 90 V126 M162 76 H192 Q206 76 206 90 V126 M206 194 V230 Q206 244 192 244 H162 M78 244 H48 Q34 244 34 230 V194";


const SUBMITTED_FACE_GUIDE_VERTICES: Record<string, Point> = {
  v1: { x: 355, y: 56 }, v2: { x: 261, y: 72 }, v3: { x: 311, y: 167 },
  v4: { x: 399, y: 167 }, v5: { x: 465, y: 75 }, v6: { x: 169, y: 126 },
  v7: { x: 224, y: 283 }, v8: { x: 286, y: 292 }, v9: { x: 541, y: 126 },
  v10: { x: 490, y: 281 }, v11: { x: 419, y: 294 }, v12: { x: 103, y: 228 },
  v13: { x: 149, y: 329 }, v14: { x: 604, y: 226 }, v15: { x: 561, y: 329 },
  v16: { x: 316, y: 330 }, v17: { x: 395, y: 324 }, v18: { x: 222, y: 307 },
  v20: { x: 146, y: 374 }, v21: { x: 208, y: 336 }, v22: { x: 281, y: 351 },
  v23: { x: 303, y: 379 }, v24: { x: 200, y: 410 }, v25: { x: 273, y: 402 },
  v26: { x: 182, y: 502 }, v27: { x: 333, y: 392 }, v28: { x: 495, y: 307 },
  v30: { x: 576, y: 372 }, v31: { x: 517, y: 335 }, v32: { x: 445, y: 344 },
  v33: { x: 450, y: 406 }, v34: { x: 514, y: 410 }, v36: { x: 547, y: 501 },
  v37: { x: 372, y: 393 }, v38: { x: 322, y: 466 }, v39: { x: 299, y: 527 },
  v40: { x: 389, y: 468 }, v41: { x: 414, y: 523 }, v42: { x: 328, y: 574 },
  v43: { x: 391, y: 572 }, v44: { x: 333, y: 611 }, v45: { x: 385, y: 610 },
  v46: { x: 119, y: 561 }, v47: { x: 196, y: 621 }, v48: { x: 265, y: 648 },
  v49: { x: 610, y: 492 }, v50: { x: 531, y: 597 }, v51: { x: 451, y: 649 },
  v52: { x: 279, y: 694 }, v53: { x: 319, y: 731 }, v54: { x: 434, y: 694 },
  v55: { x: 396, y: 730 }, v57: { x: 145, y: 645 }, v58: { x: 190, y: 723 },
  v59: { x: 249, y: 781 }, v60: { x: 569, y: 632 }, v61: { x: 515, y: 729 },
  v62: { x: 468, y: 777 }, v63: { x: 307, y: 814 }, v65: { x: 411, y: 813 },
  "custom-v1": { x: 265, y: 511 }, v64: { x: 355, y: 829 },
  "custom-v2": { x: 398, y: 373 }, "custom-v4": { x: 617, y: 374 },
  "custom-v5": { x: 437, y: 507 }, "custom-v6": { x: 96, y: 370 },
  "custom-v7": { x: 102, y: 480 },
};

const FACE_GUIDE_LINES: Array<[string, string]> = [
  ["v1", "v2"], ["v2", "v3"], ["v3", "v4"], ["v4", "v5"], ["v5", "v1"],
  ["v2", "v6"], ["v6", "v7"], ["v7", "v8"], ["v8", "v3"], ["v5", "v9"],
  ["v9", "v10"], ["v10", "v11"], ["v11", "v4"], ["v6", "v12"], ["v12", "v13"],
  ["v13", "v7"], ["v9", "v14"], ["v14", "v15"], ["v15", "v10"], ["v8", "v16"],
  ["v11", "v17"], ["v13", "v18"], ["v13", "v20"], ["v20", "v21"], ["v21", "v18"],
  ["v22", "v21"], ["v22", "v23"], ["v20", "v24"], ["v24", "v25"], ["v25", "v23"],
  ["v24", "v26"], ["v25", "v27"], ["v15", "v28"], ["v15", "v30"], ["v30", "v31"],
  ["v31", "v28"], ["v32", "v31"], ["v30", "v34"], ["v34", "v36"], ["v27", "v38"],
  ["v38", "v39"], ["v37", "v40"], ["v40", "v41"], ["v27", "v37"], ["v39", "v42"],
  ["v41", "v43"], ["v42", "v43"], ["v42", "v44"], ["v43", "v45"], ["v44", "v45"],
  ["v20", "v26"], ["v26", "v46"], ["v46", "v47"], ["v47", "v39"], ["v47", "v48"],
  ["v48", "v42"], ["v26", "v47"], ["v30", "v36"], ["v36", "v49"], ["v49", "v50"],
  ["v50", "v41"], ["v50", "v51"], ["v51", "v43"], ["v36", "v50"], ["v33", "v36"],
  ["v48", "v52"], ["v52", "v53"], ["v51", "v54"], ["v54", "v55"], ["v48", "v44"],
  ["v45", "v51"], ["v53", "v55"], ["v46", "v57"], ["v57", "v58"], ["v47", "v58"],
  ["v58", "v52"], ["v58", "v59"], ["v49", "v60"], ["v60", "v61"], ["v50", "v61"],
  ["v61", "v54"], ["v61", "v62"], ["v59", "v53"], ["v62", "v55"], ["v59", "v63"],
  ["v62", "v65"], ["v63", "v53"], ["v65", "v55"], ["v63", "v64"], ["v65", "v64"],
  ["custom-v1", "v39"], ["custom-v1", "v27"], ["v26", "custom-v1"], ["v26", "v25"],
  ["v16", "v18"], ["v16", "v22"], ["v27", "v16"], ["v34", "v33"],
  ["custom-v2", "v32"], ["custom-v2", "v33"], ["v37", "v33"], ["v28", "v17"],
  ["v37", "v17"], ["v32", "v17"], ["custom-v5", "v37"], ["custom-v5", "v41"],
  ["custom-v5", "v36"], ["custom-v4", "v14"], ["custom-v4", "v49"], ["custom-v4", "v30"],
  ["custom-v6", "v12"], ["custom-v6", "custom-v7"], ["custom-v7", "v46"],
  ["custom-v7", "v26"], ["custom-v6", "v20"],
];

function makeGuideWireframePath() {
  return FACE_GUIDE_LINES.flatMap(([fromId, toId]) => {
    const from = SUBMITTED_FACE_GUIDE_VERTICES[fromId];
    const to = SUBMITTED_FACE_GUIDE_VERTICES[toId];
    return from && to ? [`M${from.x} ${from.y} L${to.x} ${to.y}`] : [];
  }).join(" ");
}

export const FACE_GUIDE_WIREFRAME_PATH = makeGuideWireframePath();

const FACE_FEATURE_ALIGNMENT_PATH =
  "M74 138 L94 138 " +
  "M147 138 L166 138 " +
  "M120 175 L120 184 " +
  "M120 213 L120 222";
const FACE_GUIDE_TRANSFORM = "translate(18.8 30.2) scale(0.285)";
const GUIDE_CENTER = { x: 120, y: 155.5 };
const GUIDE_RADIUS = { x: 88.3, y: 109.8 };
const GUIDE_TARGETS = {
  leftEye: { x: 83.3, y: 128 },
  rightEye: { x: 156.7, y: 128 },
  nose: { x: 120, y: 179.8 },
  mouth: { x: 120, y: 217.6 },
};
const SIDE_FACE_PROFILE_PATH =
  "m6860 13140c-454-20-836-109-1400-325-604-232-1052-473-1407-758-104-83-302-275-373-362-122-149-215-312-273-475-27-77-30-100-35-239-5-173 5-240 48-343 75-176 229-351 373-422l75-37-59-94c-62-99-200-368-268-523-60-136-157-409-261-737-96-300-161-492-250-730-75-202-100-307-100-424 0-183 43-290 243-605 73-115 74-138 11-287-59-139-491-1009-617-1240-52-97-139-248-193-335-223-364-234-389-215-496 29-166 165-323 335-387 28-10 113-33 189-50 170-38 208-56 235-113 47-98 88-336 76-437-3-31-15-96-25-144-11-49-16-100-13-115 26-106 159-262 282-331 12-7 6-19-29-62-102-125-135-299-80-424 22-50 91-112 151-135 82-31 118-125 106-274-5-78-22-131-122-406-36-99-39-113-42-240-4-151 6-210 58-326 101-223 301-382 567-450 307-78 929-47 1973 97 265 37 309 41 430 36 148-6 211-20 307-67 118-58 281-234 436-470 75-114 168-286 200-367 16-42 18-43 62-43h45l-20 53c-90 233-298 559-471 738-152 156-279 219-483 240-139 14-233 8-533-36-131-19-251-35-268-35-21 0 16 21 126 69 617 270 1290 716 1757 1164 267 257 415 423 533 599l60 88-3 82-3 83-70-113c-38-63-110-166-160-230-112-146-496-534-696-703-532-452-1082-811-1546-1010-109-47-115-48-310-68-389-41-552-52-803-58-378-9-545 14-714 97-191 93-325 256-376 456-38 149-23 267 62 482 71 181 88 255 88 381 0 86-5 119-24 173l-24 67 47 17c157 57 311 137 391 205 28 23 14 18-70-25-121-62-259-109-376-127-74-11-84-10-119 7-21 10-53 36-69 57-30 37-31 43-31 131 0 83 3 98 32 156 18 36 51 84 75 106l43 42 385-9c333-7 635-25 748-44 24-4 34-2 38 10 10 26-5 64-32 82-25 16-27 16-39 0-15-21-59-22-270-1-88 8-295 19-460 24s-319 14-343 20c-100 24-202 98-277 201-19 26-35 49-35 51 0 3 41 8 92 12l91 6 108-49c141-65 400-154 570-196 240-59 251-51 34 23-253 87-386 139-550 216l-130 61h-110-110l3 40c1 22 5 117 8 211 6 182-4 267-47 392-46 133-94 166-319 217-192 44-278 83-348 160-68 74-105 153-110 230-5 75-9 67 158 335 185 297 281 476 558 1030 352 704 387 793 349 892-9 24-56 104-103 178-141 221-182 319-191 455-7 102 15 194 98 421 34 93 148 430 254 749 229 692 262 777 421 1095 119 235 127 249 219 353 114 127 215 215 388 337 366 256 848 502 1262 646 127 44 149 48 230 49 81 0 97-3 158-32 37-18 102-56 145-85 91-62 366-328 459-443 161-200 252-410 317-730 55-272 59-335 60-970 1-577 2-592 24-695 13-58 38-150 56-205 33-97 110-275 119-275 3 0-10 42-28 93-52 147-52 161-1 79 53-86 96-142 246-322 127-153 152-196 181-312 27-108 36-331 19-463-6-54-12-149-12-211-1-108 1-117 31-178 43-88 126-146 258-180 82-22 83-21 83 22 0 38-1 39-57 56-127 40-198 94-223 172-14 41-10 185 10 359 7 57 9 152 6 220l-6 120 26-48c14-27 43-101 64-165 40-119 52-120 25-2-38 163-116 351-197 476-24 38-88 122-142 187-215 262-275 353-332 507-69 181-69 183-69 820 0 501-2 590-18 690-23 148-51 290-82 410-13 52-22 96-21 98 12 12 190-335 263-512 25-61 72-190 105-286 66-197 67-179 1 50-104 363-252 694-428 960-106 158-304 409-400 505-102 102-263 227-390 302-100 59-103 56 80 74 172 17 480 7 624-20 231-44 478-143 661-265 47-31 72-45 55-31-16 14-70 53-120 86-284 192-627 289-1022 289-146 0-226-7-438-41-186-29-254-46-390-96-572-212-1208-582-1517-882-49-46-88-79-88-72 0 22 62 175 120 296 246 510 687 979 1225 1302 107 64 323 175 417 213 32 13 56 25 54 27-8 8-198-73-346-148-449-226-833-539-1108-901-164-216-311-481-388-700-21-60-41-108-46-108-10 0-34 83-65 234-25 121-27 149-27 366 0 206 3 248 23 340 78 364 271 699 526 913 182 152 704 408 1227 601 619 228 1062 308 1624 293 264-7 594-39 757-73 26-5 27-4 27 39v44l-122 17c-345 46-680 61-1018 46zm-2682-1111c-174-214-265-372-337-590-52-157-71-275-78-474-7-232 17-421 82-630 13-44 23-80 21-82-7-7-107 66-164 120-119 114-206 263-238 404-12 55-15 106-12 196 4 104 9 136 37 217 99 292 306 551 676 847 22 18 42 32 43 32 2 1-11-17-30-40zm177-4095c-204-30-566-115-780-185-172-55-391-143-417-166-13-12-18-31-18-68 0-43 6-62 33-101 43-65 112-111 180-119 80-10 157 8 467 110 334 110 620 198 705 215 42 9 108 11 220 6 213-8 354-28 467-66 95-32 287-120 400-184l63-36-50 46c-136 124-404 308-589 403-131 68-162 77-95 30 73-52 68-52-51 4-225 106-240 110-380 113-69 1-138 0-155-2zm343-68c171-55 380-139 457-183 87-50 295-183 295-188 0-2-46 18-102 45-167 78-270 103-552 131-244 24-315 9-971-208-423-139-484-145-575-53-57 56-75 112-44 134 29 22 340 142 464 179 142 43 409 110 590 148 175 37 310 35 438-5zm-781-793c-3-5 18-17 48-27 30-9 55-21 55-25 0-5-7-28-16-52-8-24-16-75-17-113l-2-68-70 5c-39 3-101 17-139 31-84 32-85 32-55 0 60-65 155-111 284-138l60-12 7-69c12-125 46-219 108-301l39-51-39-22c-43-24-135-109-127-117 3-3 22 5 44 18 50 31 94 50 101 43 3-2 17-28 31-57 16-31 44-66 68-84l43-32-28-10c-26-10-25-10 14-11 89-2 274 62 405 139 70 41 213 150 206 156-2 2-41-18-87-46-110-66-262-139-384-185l-99-36-35 33c-42 40-92 115-92 139 0 12 27 27 98 54 239 92 366 151 476 222l68 44 92-11c130-17 160-8 51 14-117 23-397 104-712 205-139 45-256 81-259 81-9 0 5 107 22 168 8 28 20 52 28 52 20 0 252-66 346-98 129-44 295-114 419-176 61-31 111-54 111-52s-44 32-97 67c-213 138-501 262-703 303-100 20-255 31-263 19zm243-499c4-54 13-94 29-127 27-56 37-56 22 0-13 44-14 162-3 180 6 10 30 7 107-13 55-14 103-28 107-30 13-8 9-97-7-150-17-58-71-126-115-144-41-17-57-2-103 98-57 122-89 281-54 270 7-3 14-33 17-84zm510-39c170-32 172-33 139-50-32-17-157-67-275-110l-91-33 19 50c10 28 22 80 25 115 6 59 8 64 27 59 12-2 82-16 156-31zm-1160-1364c-55-17-153-66-115-57 11 3 47 12 80 21 81 21 180 19 230-4 141-63 229-342 164-516-55-147-279-283-332-201-22 33-138 108-240 156-150 71-304 75-419 13-56-30-82-72-37-59 192 52 361 22 538-95 80-52 96-69 66-69-31 0-13-19 32-34 163-56 368 46 453 225 95 201-5 539-183 620-54 24-162 24-237 0z";

const styles = {
  stack: {
    display: "grid",
    gap: 12,
  },
  canvas: {
    width: "100%",
    maxWidth: 520,
    border: "1px solid #d8e0e8",
    borderRadius: 8,
    background: "radial-gradient(circle at 50% 32%, #ffffff 0, #f7fafc 62%, #eef3f8 100%)",
    overflow: "hidden",
  },
  sideCanvas: {
    width: "100%",
    maxWidth: 520,
    border: "1px solid #d8e0e8",
    borderRadius: 8,
    background: "linear-gradient(180deg, #ffffff 0%, #f7fafc 100%)",
    overflow: "hidden",
  },
  modeSwitch: {
    display: "flex",
    justifyContent: "center",
    gap: 10,
  },
} satisfies Record<string, CSSProperties>;

type AdminFaceVisualGuideProps = {
  activePanel: AdminFaceVisualPanel;
  enabledPanels: {
    eye: boolean;
    nose: boolean;
    mouth: boolean;
  };
  showDebugMarkers: boolean;
  values: AdminFaceVisualGuideValues;
  onPanelChange: (panel: AdminFaceVisualPanel) => void;
};

export function AdminFaceVisualGuide({
  activePanel,
  enabledPanels,
  showDebugMarkers,
  values,
  onPanelChange,
}: AdminFaceVisualGuideProps) {
  const [visualMode, setVisualMode] = useState<"2d" | "3d">("2d");
  const eyeCenter = {
    x: (GUIDE_TARGETS.leftEye.x + GUIDE_TARGETS.rightEye.x) / 2,
    y: (GUIDE_TARGETS.leftEye.y + GUIDE_TARGETS.rightEye.y) / 2,
  };
  const eyeDistance = (values.minEyeDistance + values.maxEyeDistance) / 2;
  const qualityEyeTiltOffset = Math.min(26, Math.max(2, eyeDistance * values.eyeTiltMax));
  const qualityNoseXOffset = eyeDistance * values.noseQualityXRatio;
  const noseZone = {
    x: eyeCenter.x - eyeDistance * values.noseXRatio,
    y: eyeCenter.y + eyeDistance * values.noseMinRatio,
    width: eyeDistance * values.noseXRatio * 2,
    height: eyeDistance * Math.max(0, values.noseMaxRatio - values.noseMinRatio),
  };
  const mouthZone = {
    x: GUIDE_TARGETS.nose.x - eyeDistance * values.mouthXRatio,
    y: GUIDE_TARGETS.nose.y + eyeDistance * values.mouthMinRatio,
    width: eyeDistance * values.mouthXRatio * 2,
    height: eyeDistance * Math.max(0, values.mouthMaxRatio - values.mouthMinRatio),
  };
  const sideScaleY = 0.78;
  const sideOffsetY = 44;
  const sideY = (value: number) => sideOffsetY + value * sideScaleY;
  const sideEyeZone = {
    y: sideY(eyeCenter.y - values.eyeCenterYTolerance),
    height: Math.max(10, values.eyeCenterYTolerance * 2 * sideScaleY),
  };
  const sideNoseZone = {
    y: sideY(noseZone.y),
    height: Math.max(12, noseZone.height * sideScaleY),
  };
  const sideMouthZone = {
    y: sideY(mouthZone.y),
    height: Math.max(12, mouthZone.height * sideScaleY),
  };
  const sideEyeArrowY = sideEyeZone.y + sideEyeZone.height / 2;
  const sideNoseArrowY = sideNoseZone.y + sideNoseZone.height / 2;
  const sideMouthArrowY = sideMouthZone.y + sideMouthZone.height / 2;
  const sideCircleZone = {
    y: sideY(GUIDE_CENTER.y - (values.maxFaceHeight / 2)),
    height: Math.max(20, values.maxFaceHeight * sideScaleY),
  };
  const sideMinFaceZone = {
    y: sideY(GUIDE_CENTER.y - values.minFaceHeight / 2),
    height: values.minFaceHeight * sideScaleY,
  };
  const sideMaxFaceZone = {
    y: sideY(GUIDE_CENTER.y - values.maxFaceHeight / 2),
    height: values.maxFaceHeight * sideScaleY,
  };
  const sideFaceTopArrowY = sideY(GUIDE_CENTER.y - values.maxFaceHeight / 2);
  const sideFaceBottomArrowY = sideY(GUIDE_CENTER.y + values.maxFaceHeight / 2);
  const sideFaceLimitX = 28;
  const sideBoundaryZone = {
    y: sideY(GUIDE_CENTER.y - GUIDE_RADIUS.y * values.guideTolerance),
    height: GUIDE_RADIUS.y * values.guideTolerance * 2 * sideScaleY,
  };
  const sideScreenTop = sideCircleZone.y;
  const sideScreenBottom = sideCircleZone.y + sideCircleZone.height;

  const active = (panel: AdminFaceVisualPanel) =>
    activePanel === panel ? " drop-shadow(0 1px 2px rgba(16, 24, 40, .12))" : "";
  const activeStroke = (panel: AdminFaceVisualPanel, baseWidth: number) =>
    activePanel === panel ? baseWidth + 0.8 : baseWidth;
  const boundaryColor = "rgba(36, 91, 131, .62)";
  const eyeColor = "rgba(0, 100, 180, .62)";
  const noseColor = "rgba(154, 36, 190, .62)";
  const mouthColor = "rgba(8, 116, 67, .62)";
  const minFaceColor = "rgba(245, 158, 11, .76)";
  const maxFaceColor = "rgba(239, 68, 68, .76)";
  const depthLineOpacity = (panel: AdminFaceVisualPanel) =>
    activePanel === panel ? 1 : 0.58;
  const depthLabelOpacity = (panel: AdminFaceVisualPanel) =>
    activePanel === panel ? 1 : 0;
  const depthPulse = (panel: AdminFaceVisualPanel) =>
    activePanel === panel ? (
      <animate attributeName="opacity" values="1;.62;1" dur="1.4s" repeatCount="indefinite" />
    ) : null;
  const showEyeVisual = enabledPanels.eye;
  const showNoseVisual = enabledPanels.nose;
  const showMouthVisual = enabledPanels.mouth;

  const frontVisual = (
    <div style={styles.canvas} aria-label="Front face visual guide">
        <svg viewBox="0 0 240 320" role="img" focusable="false" style={{ display: "block", width: "100%", aspectRatio: "3 / 4" }}>
          <ellipse
            cx={GUIDE_CENTER.x}
            cy={GUIDE_CENTER.y}
            rx={GUIDE_RADIUS.x * values.guideTolerance}
            ry={GUIDE_RADIUS.y * values.guideTolerance}
            fill={activePanel === "circle" ? "rgba(36, 91, 131, .08)" : "rgba(36, 91, 131, .04)"}
            stroke={activePanel === "circle" ? "rgba(36, 91, 131, .42)" : "rgba(36, 91, 131, .22)"}
            strokeWidth={activeStroke("circle", 1.1)}
            strokeDasharray="4 4"
            style={{ cursor: "pointer", filter: active("circle") }}
            onClick={() => onPanelChange("circle")}
          />
          <path
            d={FACE_GUIDE_OUTLINE}
            transform={FACE_GUIDE_TRANSFORM}
            fill="rgba(255, 255, 255, .42)"
            stroke="#245b83"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={FACE_GUIDE_WIREFRAME_PATH}
            transform={FACE_GUIDE_TRANSFORM}
            fill="none"
            stroke="rgba(36, 91, 131, .32)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
          {activePanel === "quality" ? (
            <>
              <line x1={GUIDE_TARGETS.leftEye.x} y1={GUIDE_TARGETS.leftEye.y - qualityEyeTiltOffset} x2={GUIDE_TARGETS.rightEye.x} y2={GUIDE_TARGETS.rightEye.y + qualityEyeTiltOffset} stroke="rgba(180, 83, 9, .42)" strokeWidth=".9" strokeDasharray="4 3" strokeLinecap="round" />
              <line x1={GUIDE_TARGETS.leftEye.x} y1={GUIDE_TARGETS.leftEye.y + qualityEyeTiltOffset} x2={GUIDE_TARGETS.rightEye.x} y2={GUIDE_TARGETS.rightEye.y - qualityEyeTiltOffset} stroke="rgba(180, 83, 9, .42)" strokeWidth=".9" strokeDasharray="4 3" strokeLinecap="round" />
              <line x1={GUIDE_CENTER.x} y1="130" x2={GUIDE_CENTER.x} y2="225" stroke="rgba(180, 83, 9, .55)" strokeWidth="1" strokeLinecap="round" />
              <line x1={GUIDE_CENTER.x - qualityNoseXOffset} y1="156" x2={GUIDE_CENTER.x - qualityNoseXOffset} y2="205" stroke="rgba(245, 158, 11, .48)" strokeWidth=".8" strokeDasharray="3 3" strokeLinecap="round" />
              <line x1={GUIDE_CENTER.x + qualityNoseXOffset} y1="156" x2={GUIDE_CENTER.x + qualityNoseXOffset} y2="205" stroke="rgba(245, 158, 11, .48)" strokeWidth=".8" strokeDasharray="3 3" strokeLinecap="round" />
            </>
          ) : null}
          {showEyeVisual ? (
            <>
              <rect
                x={eyeCenter.x - values.eyeCenterXTolerance}
                y={eyeCenter.y - values.eyeCenterYTolerance}
                width={values.eyeCenterXTolerance * 2}
                height={values.eyeCenterYTolerance * 2}
                fill="rgba(0, 149, 255, .08)"
                stroke="rgba(0, 100, 180, .38)"
                strokeWidth={activeStroke("eye", .8)}
                style={{ cursor: "pointer", filter: active("eye") }}
                onClick={() => onPanelChange("eye")}
              />
              <line x1={eyeCenter.x - values.minEyeDistance / 2} y1="128" x2={eyeCenter.x + values.minEyeDistance / 2} y2="128" stroke="rgba(245, 158, 11, .68)" strokeWidth="1.4" strokeLinecap="round" />
              <line x1={eyeCenter.x - values.maxEyeDistance / 2} y1="147" x2={eyeCenter.x + values.maxEyeDistance / 2} y2="147" stroke="rgba(239, 68, 68, .68)" strokeWidth="1.4" strokeLinecap="round" />
            </>
          ) : null}
          {showNoseVisual ? (
            <rect
              {...noseZone}
              fill="rgba(216, 76, 255, .08)"
              stroke="rgba(154, 36, 190, .36)"
              strokeWidth={activeStroke("nose", .8)}
              style={{ cursor: "pointer", filter: active("nose") }}
              onClick={() => onPanelChange("nose")}
            />
          ) : null}
          {showMouthVisual ? (
            <rect
              {...mouthZone}
              fill="rgba(20, 184, 106, .09)"
              stroke="rgba(8, 116, 67, .36)"
              strokeWidth={activeStroke("mouth", .8)}
              style={{ cursor: "pointer", filter: active("mouth") }}
              onClick={() => onPanelChange("mouth")}
            />
          ) : null}
          <line x1="218" y1={GUIDE_CENTER.y - values.minFaceHeight / 2} x2="218" y2={GUIDE_CENTER.y + values.minFaceHeight / 2} stroke="rgba(245, 158, 11, .68)" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="225" y1={GUIDE_CENTER.y - values.maxFaceHeight / 2} x2="225" y2={GUIDE_CENTER.y + values.maxFaceHeight / 2} stroke="rgba(239, 68, 68, .68)" strokeWidth="1.4" strokeLinecap="round" />
          <path d={FACE_FEATURE_ALIGNMENT_PATH} fill="none" stroke="rgba(102, 112, 133, .68)" strokeWidth=".9" strokeLinecap="round" strokeDasharray="3 3" />
          {showDebugMarkers ? (
            <>
              <circle cx={GUIDE_TARGETS.leftEye.x} cy={GUIDE_TARGETS.leftEye.y} r="1.8" fill="#00a2ff" stroke="#102033" strokeWidth=".45" />
              <circle cx={GUIDE_TARGETS.rightEye.x} cy={GUIDE_TARGETS.rightEye.y} r="1.8" fill="#00a2ff" stroke="#102033" strokeWidth=".45" />
              <circle cx={GUIDE_TARGETS.nose.x} cy={GUIDE_TARGETS.nose.y} r="1.8" fill="#d946ef" stroke="#102033" strokeWidth=".45" />
              <circle cx={GUIDE_TARGETS.mouth.x} cy={GUIDE_TARGETS.mouth.y} r="1.8" fill="#14b86a" stroke="#102033" strokeWidth=".45" />
            </>
          ) : null}
        </svg>
      </div>
  );

  const sideVisual = (
    <div style={styles.sideCanvas} aria-label="Side face depth guide">
      <svg viewBox="0 0 240 320" role="img" focusable="false" style={{ display: "block", width: "100%", aspectRatio: "3 / 4" }}>
        <line x1="28" y1={sideScreenTop} x2="28" y2={sideScreenBottom} stroke="rgba(71, 84, 103, .78)" strokeWidth="1.2" />
        <path
          d={`M16 ${sideBoundaryZone.y} L16 ${sideBoundaryZone.y + sideBoundaryZone.height} L40 ${sideBoundaryZone.y + sideBoundaryZone.height} L40 ${sideBoundaryZone.y}`}
          fill={activePanel === "circle" ? "rgba(36, 91, 131, .055)" : "none"}
          stroke={activePanel === "circle" ? "rgba(36, 91, 131, .42)" : "rgba(36, 91, 131, .24)"}
          strokeWidth={activePanel === "circle" ? "1.2" : ".8"}
          strokeDasharray="4 4"
        />
        <g opacity={activePanel === "circle" ? 1 : 0.62}>
          <line x1={sideFaceLimitX} y1={sideMaxFaceZone.y} x2={sideFaceLimitX} y2={sideMaxFaceZone.y + sideMaxFaceZone.height} stroke={maxFaceColor} strokeWidth="1.4" strokeLinecap="round" />
          <line x1={sideFaceLimitX - 7} y1={sideMaxFaceZone.y} x2={sideFaceLimitX + 7} y2={sideMaxFaceZone.y} stroke={maxFaceColor} strokeWidth="1.4" strokeLinecap="round" />
          <line x1={sideFaceLimitX - 7} y1={sideMaxFaceZone.y + sideMaxFaceZone.height} x2={sideFaceLimitX + 7} y2={sideMaxFaceZone.y + sideMaxFaceZone.height} stroke={maxFaceColor} strokeWidth="1.4" strokeLinecap="round" />
          <line x1={sideFaceLimitX} y1={sideMinFaceZone.y} x2={sideFaceLimitX} y2={sideMinFaceZone.y + sideMinFaceZone.height} stroke={minFaceColor} strokeWidth="1.4" strokeLinecap="round" />
          <line x1={sideFaceLimitX - 5} y1={sideMinFaceZone.y} x2={sideFaceLimitX + 5} y2={sideMinFaceZone.y} stroke={minFaceColor} strokeWidth="1.4" strokeLinecap="round" />
          <line x1={sideFaceLimitX - 5} y1={sideMinFaceZone.y + sideMinFaceZone.height} x2={sideFaceLimitX + 5} y2={sideMinFaceZone.y + sideMinFaceZone.height} stroke={minFaceColor} strokeWidth="1.4" strokeLinecap="round" />
        </g>
        {showEyeVisual ? (
          <rect x="21" y={sideEyeZone.y} width="14" height={sideEyeZone.height} fill="rgba(0, 149, 255, .08)" stroke="rgba(0, 100, 180, .42)" />
        ) : null}
        {showNoseVisual ? (
          <rect x="21" y={sideNoseZone.y} width="14" height={sideNoseZone.height} fill="rgba(216, 76, 255, .08)" stroke="rgba(154, 36, 190, .38)" />
        ) : null}
        {showMouthVisual ? (
          <rect x="21" y={sideMouthZone.y} width="14" height={sideMouthZone.height} fill="rgba(20, 184, 106, .09)" stroke="rgba(8, 116, 67, .38)" />
        ) : null}
        <g opacity={depthLineOpacity("circle")}>
          {depthPulse("circle")}
          <line x1="46" y1={sideFaceTopArrowY} x2="176" y2={sideFaceTopArrowY} stroke={boundaryColor} strokeWidth=".9" markerStart="url(#depth-arrow-boundary-start)" markerEnd="url(#depth-arrow-boundary-end)" />
          <line x1="46" y1={sideFaceBottomArrowY} x2="176" y2={sideFaceBottomArrowY} stroke={boundaryColor} strokeWidth=".9" markerStart="url(#depth-arrow-boundary-start)" markerEnd="url(#depth-arrow-boundary-end)" />
        </g>
        {showEyeVisual ? (
        <g opacity={depthLineOpacity("eye")}>
          {depthPulse("eye")}
          <line x1="46" y1={sideEyeArrowY} x2="174" y2={sideEyeArrowY} stroke={eyeColor} strokeWidth="1" markerStart="url(#depth-arrow-eye-start)" markerEnd="url(#depth-arrow-eye-end)" />
        </g>
        ) : null}
        {showNoseVisual ? (
        <g opacity={depthLineOpacity("nose")}>
          {depthPulse("nose")}
          <line x1="46" y1={sideNoseArrowY} x2="172" y2={sideNoseArrowY} stroke={noseColor} strokeWidth="1" markerStart="url(#depth-arrow-nose-start)" markerEnd="url(#depth-arrow-nose-end)" />
        </g>
        ) : null}
        {showMouthVisual ? (
        <g opacity={depthLineOpacity("mouth")}>
          {depthPulse("mouth")}
          <line x1="46" y1={sideMouthArrowY} x2="182" y2={sideMouthArrowY} stroke={mouthColor} strokeWidth="1" markerStart="url(#depth-arrow-mouth-start)" markerEnd="url(#depth-arrow-mouth-end)" />
        </g>
        ) : null}
        <g fill="#344054" fontSize="7.5" fontWeight="800" textAnchor="middle" pointerEvents="none">
          <text x="111" y={sideFaceTopArrowY - 5} opacity={depthLabelOpacity("circle")}>Far limit</text>
          <text x="111" y={sideFaceBottomArrowY + 9} opacity={depthLabelOpacity("circle")}>Near limit</text>
          {showEyeVisual ? <text x="110" y={sideEyeArrowY - 5} opacity={depthLabelOpacity("eye")}>Eye depth</text> : null}
          {showNoseVisual ? <text x="109" y={sideNoseArrowY - 5} opacity={depthLabelOpacity("nose")}>Nose depth</text> : null}
          {showMouthVisual ? <text x="114" y={sideMouthArrowY + 9} opacity={depthLabelOpacity("mouth")}>Mouth depth</text> : null}
        </g>
        <svg x="145" y="30" width="118" height="252" viewBox="0 0 800 1333" preserveAspectRatio="xMidYMid meet">
          <g transform="translate(0 1333) scale(.1 -.1)" fill="#245b83">
            <path d={SIDE_FACE_PROFILE_PATH} />
          </g>
        </svg>
        <text x="13" y={Math.max(12, sideScreenTop - 18)} fill="#344054" fontSize="12" fontWeight="800">screen</text>
        <defs>
          <marker id="depth-arrow-boundary-start" markerWidth="5" markerHeight="5" refX="1.2" refY="2.5" orient="auto">
            <path d="M5 0 L0 2.5 L5 5" fill="none" stroke={boundaryColor} strokeWidth=".8" />
          </marker>
          <marker id="depth-arrow-boundary-end" markerWidth="5" markerHeight="5" refX="3.8" refY="2.5" orient="auto">
            <path d="M0 0 L5 2.5 L0 5" fill="none" stroke={boundaryColor} strokeWidth=".8" />
          </marker>
          <marker id="depth-arrow-eye-start" markerWidth="5" markerHeight="5" refX="1.2" refY="2.5" orient="auto">
            <path d="M5 0 L0 2.5 L5 5" fill="none" stroke={eyeColor} strokeWidth=".8" />
          </marker>
          <marker id="depth-arrow-eye-end" markerWidth="5" markerHeight="5" refX="3.8" refY="2.5" orient="auto">
            <path d="M0 0 L5 2.5 L0 5" fill="none" stroke={eyeColor} strokeWidth=".8" />
          </marker>
          <marker id="depth-arrow-nose-start" markerWidth="5" markerHeight="5" refX="1.2" refY="2.5" orient="auto">
            <path d="M5 0 L0 2.5 L5 5" fill="none" stroke={noseColor} strokeWidth=".8" />
          </marker>
          <marker id="depth-arrow-nose-end" markerWidth="5" markerHeight="5" refX="3.8" refY="2.5" orient="auto">
            <path d="M0 0 L5 2.5 L0 5" fill="none" stroke={noseColor} strokeWidth=".8" />
          </marker>
          <marker id="depth-arrow-mouth-start" markerWidth="5" markerHeight="5" refX="1.2" refY="2.5" orient="auto">
            <path d="M5 0 L0 2.5 L5 5" fill="none" stroke={mouthColor} strokeWidth=".8" />
          </marker>
          <marker id="depth-arrow-mouth-end" markerWidth="5" markerHeight="5" refX="3.8" refY="2.5" orient="auto">
            <path d="M0 0 L5 2.5 L0 5" fill="none" stroke={mouthColor} strokeWidth=".8" />
          </marker>
        </defs>
      </svg>
    </div>
  );

  const buttonStyle = (mode: "2d" | "3d"): CSSProperties => ({
    minWidth: 58,
    minHeight: 36,
    border: `1px solid ${visualMode === mode ? "#245b83" : "#cbd5e1"}`,
    borderRadius: 7,
    background: visualMode === mode ? "#edf7ff" : "#fff",
    color: visualMode === mode ? "#153e5c" : "#344054",
    font: "inherit",
    fontSize: 14,
    fontWeight: 900,
    cursor: "pointer",
  });

  return (
    <div style={styles.stack}>
      {visualMode === "2d" ? frontVisual : sideVisual}
      <div style={styles.modeSwitch} aria-label="Face visual angle">
        <button type="button" style={buttonStyle("2d")} onClick={() => setVisualMode("2d")}>Front</button>
        <button type="button" style={buttonStyle("3d")} onClick={() => setVisualMode("3d")}>Side</button>
      </div>
    </div>
  );
}
