# Face models

`mediapipe_face_detector_short/` is the local TFJS MediaPipe face detector
model used for fast frontend face box detection and stability checks.

The old `face_landmarker.task` model was moved out of the frontend runtime to
`/Users/user/Desktop/Inno_items/AImodels/face_landmarker/`.

`2.7_80x80_MiniFASNetV2.onnx` provides passive print/screen anti-spoofing.
It uses an expanded BGR face crop and returns `paper`, `real`, and `screen`
logits. See `MINIFASNET_LICENSE.txt` for its Apache-2.0 license.

`tiny_compliance_v3_single.onnx` is the default face-compliance model. It uses
a `96x96` RGB float32 NCHW input and returns four logits in this order:
`eyewear`, `eyes_occluded`, `nose_occluded`, `mouth_occluded`. The frontend
applies sigmoid and temporary `0.5` thresholds until calibrated thresholds are
available.

`face_attrib_net.tflite` is Qualcomm FaceAttribNet W8A8. It detects left/right
eye openness, eyeglasses, face masks, and sunglasses. Source and model card:

- https://huggingface.co/qualcomm/Facial-Attribute-Detection
- https://github.com/qualcomm/ai-hub-models/tree/main/src/qai_hub_models/models/face_attrib_net

FaceAttribNet is distributed under the BSD 3-Clause License.

To temporarily switch the frontend back to FaceAttribNet, start or build it
with `VITE_FACE_COMPLIANCE_MODEL=legacy-tflite`.
