#!/usr/bin/env python3
"""Valida o layout do output de um modelo YOLO exportado para TFLite.

Uso:
    python frontend/scripts/validate_tflite_output.py --model frontend/assets/models/yolo.tflite --image <caminho_da_imagem>

Objetivo:
- verificar se a saída do modelo bate com a forma assumida pelo decoder do app
- confirmar class_names, normalizedCoords e layout do tensor de saída
"""

from __future__ import annotations

import argparse
import os
from typing import List, Tuple

import numpy as np
import cv2

try:
    import tensorflow as tf
except Exception as exc:  # pragma: no cover
    raise SystemExit(f"tensorflow não está instalado. Instale com: pip install tensorflow") from exc


CLASS_NAMES = [
    "Black-Fold-Table",
    "Brown-Fold-Table",
    "Gradil",
    "table_joint",
]


def load_image(image_path: str, input_size: int = 640) -> np.ndarray:
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Imagem não encontrada: {image_path}")

    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Não foi possível ler a imagem: {image_path}")

    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    resized = cv2.resize(rgb, (input_size, input_size), interpolation=cv2.INTER_LINEAR)
    arr = resized.astype(np.float32) / 255.0
    arr = np.transpose(arr, (2, 0, 1))
    arr = np.expand_dims(arr, axis=0)
    return arr


def inspect_model_output(model_path: str, image_path: str, input_size: int = 640):
    interpreter = tf.lite.Interpreter(model_path=model_path)
    interpreter.allocate_tensors()

    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    print("=== Input details ===")
    for d in input_details:
        print(d)

    print("\n=== Output details ===")
    for d in output_details:
        print(d)

    input_tensor = interpreter.get_input_details()[0]
    input_data = load_image(image_path, input_size)
    interpreter.set_tensor(input_tensor["index"], input_data)
    interpreter.invoke()

    raw_outputs = [interpreter.get_tensor(o["index"]) for o in output_details]
    print("\n=== Output tensor summary ===")
    for idx, out in enumerate(raw_outputs):
        arr = np.asarray(out)
        print(f"output[{idx}] shape={arr.shape}, dtype={arr.dtype}, min={arr.min():.6f}, max={arr.max():.6f}")
        if arr.size > 0:
            flat = arr.reshape(-1)
            print("first_values=", flat[:20].tolist())

    print("\n=== Class mapping ===")
    for i, name in enumerate(CLASS_NAMES):
        print(f"class[{i}] = {name}")

    print("\n=== Decoder check ===")
    if len(raw_outputs) == 0:
        print("Nenhuma saída detectada no modelo.")
        return

    out = np.asarray(raw_outputs[0])
    nc = len(CLASS_NAMES)
    elements_per_anchor = 4 + nc
    if out.size == 0:
        print("Output vazio.")
        return

    print(f"Expected class axis: 4 + {nc} = {elements_per_anchor}")
    print(f"Saída total de elementos = {out.size}")
    print(f"Elemento 0..19 = {out.reshape(-1)[:20].tolist()}")

    output_shape = out.shape
    if len(output_shape) < 2 or elements_per_anchor not in output_shape[-2:]:
        print(f"ALERTA: shape {output_shape} não tem eixo de classes/tamanho {elements_per_anchor}.")
    else:
        anchors = output_shape[-1] if output_shape[-2] == elements_per_anchor else output_shape[-2]
        if out.size != elements_per_anchor * anchors:
            print(f"ALERTA: shape {output_shape} não corresponde a {elements_per_anchor} x {anchors}.")
        else:
            print(f"Shape {output_shape} compatível com {nc} classes e {anchors} anchors.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Valida o output TFLite do modelo YOLO.")
    parser.add_argument("--model", required=True, help="Caminho para o arquivo .tflite")
    parser.add_argument("--image", required=True, help="Caminho para uma imagem de teste")
    parser.add_argument("--input-size", type=int, default=640, help="Tamanho de entrada esperado pelo modelo")
    args = parser.parse_args()

    inspect_model_output(args.model, args.image, args.input_size)
